-- P62: content-aware Lesson media de-duplication, without deleting any existing
-- user media, historical blocks, P14 assets, Storage objects or upload-intent audit records.
-- Duplicate rows from earlier uploads remain intact but are hidden at read time.
BEGIN;
DO $pre$ BEGIN
 IF to_regprocedure('public.lms_p62_duplicate_media_ids(uuid)') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
   AND table_name='lms_p14_media_upload_intents' AND column_name='duplicate_block_id')
 THEN RAISE EXCEPTION 'P62 already installed; do not replay'; END IF;
 IF to_regprocedure('public.lms_p14_finalize_media(uuid)') IS NULL
  OR to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
  OR to_regprocedure('public.lms_p15_can_preview_lesson(uuid)') IS NULL
 THEN RAISE EXCEPTION 'P62 requires P14 and P15'; END IF;
END $pre$;

ALTER TABLE public.lms_p14_media_upload_intents
 ADD COLUMN duplicate_block_id uuid REFERENCES public.lms_lesson_blocks(id) ON DELETE RESTRICT;
ALTER TABLE public.lms_p14_media_upload_intents DROP CONSTRAINT lms_p14_media_upload_intents_status_check;
ALTER TABLE public.lms_p14_media_upload_intents
 ADD CONSTRAINT lms_p14_media_upload_intents_status_check
 CHECK(status IN('pending','finalized','duplicate'));
ALTER TABLE public.lms_p14_media_upload_intents DROP CONSTRAINT lms_p14_media_upload_intents_check;
ALTER TABLE public.lms_p14_media_upload_intents
 ADD CONSTRAINT lms_p14_media_upload_intents_check CHECK(
 (status='pending' AND finalized_at IS NULL AND asset_id IS NULL AND duplicate_block_id IS NULL)
 OR (status='finalized' AND finalized_at IS NOT NULL AND asset_id IS NOT NULL AND duplicate_block_id IS NULL)
 OR (status='duplicate' AND finalized_at IS NOT NULL AND asset_id IS NULL AND duplicate_block_id IS NOT NULL)
 );

-- Return ONLY duplicate block UUIDs from an ACL-checked lesson. The browser
-- never receives content hashes, object paths, keys or signed download URLs.
CREATE FUNCTION public.lms_p62_duplicate_media_ids(p_lesson_id uuid)
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $p62$
DECLARE v_ids uuid[];
BEGIN
 IF p_lesson_id IS NULL OR (SELECT auth.uid()) IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.lms_profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.account_status='active')
 OR NOT (public.lms_p1_can_view_lesson(p_lesson_id)
         OR public.lms_p15_can_preview_lesson(p_lesson_id))
 THEN RAISE EXCEPTION 'Protected Lesson access required'; END IF;

 WITH source AS(
  SELECT b.id,b.position,b.block_type,
    lower(btrim(o.metadata->>'eTag','"')) AS etag,
    o.metadata->>'size' AS file_size,
    lower(coalesce(o.metadata->>'mimetype','')) AS media_type
  FROM public.lms_lesson_blocks b
  JOIN public.lms_media_assets a ON a.id::text=b.payload->>'assetId'
  JOIN storage.objects o ON o.bucket_id='technica-private-lessons' AND o.name=a.private_object_path
  WHERE b.lesson_id=p_lesson_id AND b.block_type IN('pdf','video')
   AND lower(btrim(coalesce(o.metadata->>'eTag',''),'"')) ~ '^[0-9a-f]{32}$'
   AND o.metadata->>'size' ~ '^[0-9]+$'
 ), ranked AS(
  SELECT id,position,row_number() OVER(
   PARTITION BY block_type,etag,file_size,media_type
   ORDER BY position,id) AS rank_in_lesson FROM source
 )
 SELECT coalesce(array_agg(id ORDER BY position,id),'{}'::uuid[]) INTO v_ids
 FROM ranked WHERE rank_in_lesson>1;
 RETURN v_ids;
END $p62$;
REVOKE ALL ON FUNCTION public.lms_p62_duplicate_media_ids(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p62_duplicate_media_ids(uuid) TO authenticated;

-- P14 finalizer now records duplicate upload intents with a canonical block ID,
-- without registering a second asset or lesson block. Edge cleans extra object.
CREATE OR REPLACE FUNCTION public.lms_p14_finalize_media(p_intent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE i public.lms_p14_media_upload_intents%ROWTYPE;
 v_metadata jsonb;v_size_text text;v_mime text;v_asset_id uuid;v_block_id uuid;v_position integer;
 v_etag text;v_existing_block uuid;
BEGIN
 SELECT * INTO i FROM public.lms_p14_media_upload_intents
 WHERE id=p_intent_id FOR UPDATE;
 IF NOT FOUND OR i.status<>'pending' OR i.expires_at<=now()
 THEN RAISE EXCEPTION 'P14 upload intent missing, expired or already finalized'; END IF;
 SELECT o.metadata INTO v_metadata FROM storage.objects o
 WHERE o.bucket_id='technica-private-lessons' AND o.name=i.object_path;
 IF v_metadata IS NULL THEN RAISE EXCEPTION 'P14 uploaded private object not found'; END IF;
 v_size_text=v_metadata->>'size';
 v_mime=lower(coalesce(v_metadata->>'mimetype',v_metadata->>'contentType',''));
 IF v_size_text IS NULL OR v_size_text !~ '^[0-9]{1,12}$'
 OR v_size_text::bigint<>i.expected_bytes OR v_mime<>i.expected_mime
 THEN RAISE EXCEPTION 'P14 actual storage bytes or MIME mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_media_assets WHERE private_object_path=i.object_path)
 THEN RAISE EXCEPTION 'P14 object path already registered'; END IF;
 -- Serialize finalization within the same Lesson, including concurrent upload intents.
 -- Storage's single-part ETag is a content fingerprint; require exact bytes and MIME too.
 PERFORM pg_advisory_xact_lock(hashtextextended('lms:p62:lesson:'||i.lesson_id::text,0));
 v_etag=lower(btrim(coalesce(v_metadata->>'eTag',''),'"'));
 IF v_etag ~ '^[0-9a-f]{32}
 VALUES(i.course_id,i.kind,i.object_path,i.expected_mime) RETURNING id INTO v_asset_id;
 SELECT coalesce(max(position)+1,0) INTO v_position FROM public.lms_lesson_blocks
 WHERE lesson_id=i.lesson_id;
 INSERT INTO public.lms_lesson_blocks(lesson_id,block_type,payload,position)
 VALUES(i.lesson_id,i.kind,jsonb_build_object('assetId',v_asset_id,'title',i.display_name),v_position)
 RETURNING id INTO v_block_id;
 UPDATE public.lms_p14_media_upload_intents SET status='finalized',
 finalized_at=now(),asset_id=v_asset_id WHERE id=i.id;
 RETURN jsonb_build_object('assetId',v_asset_id,'blockId',v_block_id,
   'kind',i.kind,'title',i.display_name);
END; $function$
 THEN
  SELECT b.id INTO v_existing_block
  FROM public.lms_lesson_blocks b
  JOIN public.lms_media_assets a ON a.id::text=b.payload->>'assetId'
  JOIN storage.objects o ON o.bucket_id='technica-private-lessons' AND o.name=a.private_object_path
  WHERE b.lesson_id=i.lesson_id AND b.block_type=i.kind
    AND a.mime_type=i.expected_mime
    AND lower(btrim(coalesce(o.metadata->>'eTag',''),'"'))=v_etag
    AND o.metadata->>'size'=v_size_text
  ORDER BY b.position,b.id LIMIT 1;
  IF v_existing_block IS NOT NULL THEN
   UPDATE public.lms_p14_media_upload_intents
     SET status='duplicate',finalized_at=clock_timestamp(),duplicate_block_id=v_existing_block
     WHERE id=i.id;
   RETURN jsonb_build_object('blockId',v_existing_block,
     'kind',i.kind,'title',i.display_name,'duplicate',true,'cleanupPath',i.object_path);
  END IF;
 END IF;
 INSERT INTO public.lms_media_assets(course_id,kind,private_object_path,mime_type)
 VALUES(i.course_id,i.kind,i.object_path,i.expected_mime) RETURNING id INTO v_asset_id;
 SELECT coalesce(max(position)+1,0) INTO v_position FROM public.lms_lesson_blocks
 WHERE lesson_id=i.lesson_id;
 INSERT INTO public.lms_lesson_blocks(lesson_id,block_type,payload,position)
 VALUES(i.lesson_id,i.kind,jsonb_build_object('assetId',v_asset_id,'title',i.display_name),v_position)
 RETURNING id INTO v_block_id;
 UPDATE public.lms_p14_media_upload_intents SET status='finalized',
 finalized_at=now(),asset_id=v_asset_id WHERE id=i.id;
 RETURN jsonb_build_object('assetId',v_asset_id,'blockId',v_block_id,
   'kind',i.kind,'title',i.display_name);
END; $function$;

DO $post$ BEGIN
 IF has_function_privilege('anon','public.lms_p62_duplicate_media_ids(uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.lms_p14_finalize_media(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'P62 ACL regression'; END IF;
END $post$;
COMMIT;