-- P14 Secure Lesson Media. OWNER-APPROVED STAGING ONLY.
-- No existing lesson, questions, grades, entitlements or media is changed.
-- Private bucket / signed upload intents; all privileged operations Edge-only.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_lessons') IS NULL OR
    to_regclass('public.lms_lesson_blocks') IS NULL OR
    to_regclass('public.lms_media_assets') IS NULL OR
    to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
 THEN RAISE EXCEPTION 'P14 requires installed P1 lesson/ACL/media foundation'; END IF;
 IF to_regclass('public.lms_p14_media_upload_intents') IS NOT NULL THEN
  RAISE EXCEPTION 'P14 upload-intents table already exists; do not replay migration'; END IF;
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='technica-private-lessons' AND
   (public IS TRUE OR file_size_limit IS DISTINCT FROM 52428800::bigint OR
    allowed_mime_types IS DISTINCT FROM ARRAY['application/pdf','video/mp4','video/webm']::text[]))
 THEN RAISE EXCEPTION 'P14 bucket exists with unexpected public/size/MIME configuration; manual review required'; END IF;
 INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('technica-private-lessons','technica-private-lessons',false,52428800,
 ARRAY['application/pdf','video/mp4','video/webm']::text[])
 ON CONFLICT (id) DO NOTHING;
END $$;
CREATE TABLE public.lms_p14_media_upload_intents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('pdf','video')),
 expected_mime text NOT NULL CHECK(expected_mime IN ('application/pdf','video/mp4','video/webm')),
 expected_bytes bigint NOT NULL CHECK(expected_bytes BETWEEN 1 AND 52428800),
 object_path text NOT NULL UNIQUE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 160),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','finalized')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '2 hours'),
 finalized_at timestamptz,
 asset_id uuid UNIQUE REFERENCES public.lms_media_assets(id),
 CHECK ((status='pending' AND finalized_at IS NULL AND asset_id IS NULL) OR
        (status='finalized' AND finalized_at IS NOT NULL AND asset_id IS NOT NULL))
);
CREATE INDEX lms_p14_intent_creator_status_idx
 ON public.lms_p14_media_upload_intents(created_by,status,expires_at);
ALTER TABLE public.lms_p14_media_upload_intents ENABLE ROW LEVEL SECURITY;
-- Intents and storage paths are only visible to the trusted Edge service.
REVOKE ALL ON public.lms_p14_media_upload_intents FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.lms_p14_media_upload_intents TO service_role;
-- PRIVATE bucket deliberately gets NO authenticated/anon storage.objects
-- policies: upload only via server-authorized signed UPLOAD token; playback
-- only via server-authorized short-lived signed READ token.
-- All tokens are bearer capabilities: short-lived, non-DRM, not a promise
-- against screen capture, OS recording, camera filming or network extraction.
-- Atomic finalization is callable ONLY by the Edge service role.
-- It rechecks actual storage metadata and locks the intent to prevent
-- duplicate media assets / lesson blocks under concurrent finalize requests.
CREATE FUNCTION public.lms_p14_finalize_media(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $
DECLARE i public.lms_p14_media_upload_intents%ROWTYPE;
 v_metadata jsonb;v_size_text text;v_mime text;v_asset_id uuid;v_block_id uuid;v_position integer;
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
 IF v_size_text IS NULL OR v_size_text !~ '^[0-9]{1,12}
 OR v_size_text::bigint<>i.expected_bytes OR v_mime<>i.expected_mime
 THEN RAISE EXCEPTION 'P14 actual storage bytes or MIME mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_media_assets WHERE private_object_path=i.object_path)
 THEN RAISE EXCEPTION 'P14 object path already registered'; END IF;
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
END; $;
REVOKE ALL ON FUNCTION public.lms_p14_finalize_media(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p14_finalize_media(uuid) TO service_role;
COMMIT;
