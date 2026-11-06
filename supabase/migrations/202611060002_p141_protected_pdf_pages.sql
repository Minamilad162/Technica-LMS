-- P14.1: optional rasterized PDF delivery. ADDITIVE; DO NOT replay P14.
-- SOURCE ONLY until an explicitly approved Staging installation and remote ledger check.
-- Existing PDF/video blocks, grades, entitlements and uploads remain unchanged.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.lms_lesson_blocks') IS NULL
 OR to_regclass('public.lms_p14_media_upload_intents') IS NULL
 OR to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
 THEN RAISE EXCEPTION 'P14.1 requires installed P1 and P14'; END IF;
 IF to_regclass('public.lms_p141_pdf_packages') IS NOT NULL
 THEN RAISE EXCEPTION 'P14.1 already installed: do not replay'; END IF;
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='technica-private-lesson-pages'
   AND (public IS TRUE OR file_size_limit IS DISTINCT FROM 2097152::bigint
   OR allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg']::text[]))
 THEN RAISE EXCEPTION 'Unexpected P14.1 bucket config: manual review required'; END IF;
 INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('technica-private-lesson-pages','technica-private-lesson-pages',false,
   2097152,ARRAY['image/jpeg']::text[])
 ON CONFLICT(id) DO NOTHING;
END $guard$;

CREATE TABLE public.lms_p141_pdf_packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
 page_count integer NOT NULL CHECK(page_count BETWEEN 1 AND 80),
 expected_page_sizes jsonb NOT NULL CHECK(jsonb_typeof(expected_page_sizes)='array'
   AND jsonb_array_length(expected_page_sizes) BETWEEN 1 AND 80),
 object_prefix text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','finalized')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours',
 finalized_at timestamptz,
 block_id uuid UNIQUE REFERENCES public.lms_lesson_blocks(id) ON DELETE RESTRICT,
 CHECK ((status='pending' AND finalized_at IS NULL AND block_id IS NULL)
    OR (status='finalized' AND finalized_at IS NOT NULL AND block_id IS NOT NULL))
);
CREATE INDEX lms_p141_pdf_pending_idx
 ON public.lms_p141_pdf_packages(created_by,status,expires_at);
CREATE INDEX lms_p141_pdf_lesson_idx
 ON public.lms_p141_pdf_packages(lesson_id,block_id);
ALTER TABLE public.lms_p141_pdf_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p141_pdf_packages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.lms_p141_pdf_packages TO service_role;
-- No authenticated/anon storage.objects policies on the private page bucket.
-- Signed page upload/download URLs are authorized by the P14 Edge gateway.
CREATE FUNCTION public.lms_p141_finalize_pdf_pages(p_package_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $pdf$
DECLARE p public.lms_p141_pdf_packages%ROWTYPE;
 v_index integer;v_size text;v_mime text;v_metadata jsonb;v_block uuid;v_position integer;
 v_path text;v_expected bigint;v_count bigint;
BEGIN
 SELECT * INTO p FROM public.lms_p141_pdf_packages
  WHERE id=p_package_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' OR p.expires_at<=now()
 THEN RAISE EXCEPTION 'P14.1 package invalid, expired or already finalized'; END IF;
 IF jsonb_array_length(p.expected_page_sizes)<>p.page_count
 THEN RAISE EXCEPTION 'P14.1 page count mismatch'; END IF;
 SELECT count(*) INTO v_count FROM storage.objects
  WHERE bucket_id='technica-private-lesson-pages'
    AND name LIKE p.object_prefix || '/%';
 IF v_count<>p.page_count THEN RAISE EXCEPTION 'P14.1 missing or extra page objects'; END IF;
 FOR v_index IN 1..p.page_count LOOP
  v_expected=(p.expected_page_sizes->>(v_index-1))::bigint;
  IF v_expected<1 OR v_expected>2097152
  THEN RAISE EXCEPTION 'P14.1 invalid expected page size'; END IF;
  v_path=p.object_prefix||'/'||lpad(v_index::text,4,'0')||'.jpg';
  SELECT o.metadata INTO v_metadata FROM storage.objects o
   WHERE o.bucket_id='technica-private-lesson-pages' AND o.name=v_path;
  IF v_metadata IS NULL THEN RAISE EXCEPTION 'P14.1 missing page %',v_index; END IF;
  v_size=v_metadata->>'size';
  v_mime=lower(coalesce(v_metadata->>'mimetype',v_metadata->>'contentType',''));
  IF v_size IS NULL OR v_size !~ '^[0-9]{1,9}$'
    OR v_size::bigint<>v_expected OR v_mime<>'image/jpeg'
  THEN RAISE EXCEPTION 'P14.1 page metadata mismatch %',v_index; END IF;
 END LOOP;
 SELECT coalesce(max(position)+1,0) INTO v_position
  FROM public.lms_lesson_blocks WHERE lesson_id=p.lesson_id;
 INSERT INTO public.lms_lesson_blocks(lesson_id,block_type,payload,position)
 VALUES(p.lesson_id,'pdf',jsonb_build_object('title',p.title,
   'protectedPages',true,'pageCount',p.page_count),v_position)
 RETURNING id INTO v_block;
 UPDATE public.lms_p141_pdf_packages SET status='finalized',
  finalized_at=now(),block_id=v_block WHERE id=p.id;
 RETURN jsonb_build_object('blockId',v_block,'kind','pdf',
   'title',p.title,'pageCount',p.page_count);
END; $pdf$;
REVOKE ALL ON FUNCTION public.lms_p141_finalize_pdf_pages(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p141_finalize_pdf_pages(uuid) TO service_role;
COMMIT;
