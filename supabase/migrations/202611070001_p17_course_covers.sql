-- P17: course cover media only. ADDITIVE. Apply once only after checking
-- the actual target migration ledger and storage policies. No data backfill.
-- Existing lms_courses.cover_path field is reused; lesson-media bucket untouched.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_courses') IS NULL OR
    to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL OR
    to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL
 THEN RAISE EXCEPTION 'P17 requires P1 and Supabase Storage'; END IF;
 IF to_regclass('public.lms_p17_cover_audit') IS NOT NULL OR
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lms_p17_cover_path_guard')
 THEN RAISE EXCEPTION 'P17 already installed. Never replay migration'; END IF;
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='technica-course-covers'
   AND (public IS DISTINCT FROM true OR file_size_limit IS DISTINCT FROM 2097152
        OR allowed_mime_types IS DISTINCT FROM ARRAY['image/webp']::text[]))
 THEN RAISE EXCEPTION 'Course cover bucket already exists with conflicting permissions/settings'; END IF;
END $$;

-- This bucket contains intentionally PUBLIC marketing thumbnails only.
-- It is separate from PRIVATE lesson PDF/video storage.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('technica-course-covers','technica-course-covers',true,2097152,ARRAY['image/webp']::text[])
 ON CONFLICT(id) DO NOTHING;

-- Existing P1 course metadata is reused. NOT VALID avoids editing historical
-- rows automatically; new/updated rows must carry a scoped WebP path or NULL.
ALTER TABLE public.lms_courses
 ADD CONSTRAINT lms_p17_cover_path_guard CHECK(
   cover_path IS NULL OR
   (cover_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    AND split_part(cover_path,'/',1)=id::text)
 ) NOT VALID;

-- Protected metadata audit of cover changes; no learner/Data API read grants.
CREATE TABLE public.lms_p17_cover_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 course_id uuid NOT NULL,
 actor_id uuid,
 previous_path text,
 new_path text,
 event_type text NOT NULL CHECK(event_type IN('uploaded','replaced','removed')),
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_p17_cover_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_p17_cover_audit FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.lms_p17_cover_audit TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.lms_p17_cover_audit_id_seq TO service_role;

CREATE FUNCTION public.lms_p17_record_cover_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.cover_path IS DISTINCT FROM NEW.cover_path THEN
  INSERT INTO public.lms_p17_cover_audit(course_id,actor_id,previous_path,new_path,event_type)
  VALUES(NEW.id,auth.uid(),OLD.cover_path,NEW.cover_path,
   CASE WHEN NEW.cover_path IS NULL THEN 'removed'
    WHEN OLD.cover_path IS NULL THEN 'uploaded' ELSE 'replaced' END);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lms_p17_record_cover_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lms_p17_cover_change
 AFTER UPDATE OF cover_path ON public.lms_courses
 FOR EACH ROW EXECUTE FUNCTION public.lms_p17_record_cover_change();

-- Public media URL is readable by anyone, but uploaded images are verified
-- as Admin-only WebP in a path owned by an existing Technica course.
CREATE POLICY lms_p17_cover_storage_insert ON storage.objects
 FOR INSERT TO authenticated WITH CHECK(
  bucket_id='technica-course-covers'
  AND public.lms_p1_actor_is_admin()
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  AND EXISTS(SELECT 1 FROM public.lms_courses c WHERE c.id::text=split_part(name,'/',1))
 );
CREATE POLICY lms_p17_cover_storage_select ON storage.objects
 FOR SELECT TO authenticated USING(
  bucket_id='technica-course-covers' AND public.lms_p1_actor_is_admin()
 );
CREATE POLICY lms_p17_cover_storage_delete ON storage.objects
 FOR DELETE TO authenticated USING(
  bucket_id='technica-course-covers' AND public.lms_p1_actor_is_admin()
 );
COMMIT;
