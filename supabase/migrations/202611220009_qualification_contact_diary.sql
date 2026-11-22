-- Technica LMS: role-scoped, auditable qualification Contact Diary.
-- Centre and learner communication. No email notifications or third-party messages are implied.
-- Underlying rows are RPC-only; no direct Data API or anonymous table grants.

CREATE TABLE IF NOT EXISTS public.lms_qf_contact_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL CHECK (kind IN ('message','meeting_note')),
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_qf_contact_entries_by_enrolment
 ON public.lms_qf_contact_entries(enrolment_id,created_at DESC,id DESC);
ALTER TABLE public.lms_qf_contact_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_contact_entries FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lms_qf_contact_list(p_enrolment uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments; data jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF actor IS NULL OR NOT FOUND OR actor NOT IN (e.learner_id,e.assessor_id,e.verifier_id)
  OR NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions v
    WHERE v.id=e.version_id AND v.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Qualification Contact Diary access denied.' USING ERRCODE='42501';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',c.id,'kind',c.kind,'body',c.body,'createdAt',c.created_at,
  'author',p.full_name,'authorRole',CASE c.author_id
    WHEN e.learner_id THEN 'Learner'
    WHEN e.assessor_id THEN 'Assessor'
    WHEN e.verifier_id THEN 'Internal Verifier'
    ELSE 'Former participant' END
 ) ORDER BY c.created_at DESC,c.id DESC),'[]'::jsonb) INTO data
 FROM public.lms_qf_contact_entries c
 JOIN public.lms_profiles p ON p.id=c.author_id
 WHERE c.enrolment_id=e.id;
 RETURN data;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_contact_add(p_enrolment uuid,p_kind text,p_body text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments; item uuid;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF actor IS NULL OR NOT FOUND OR actor NOT IN (e.learner_id,e.assessor_id,e.verifier_id)
  OR NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions v
    WHERE v.id=e.version_id AND v.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Qualification Contact Diary access denied.' USING ERRCODE='42501';
 END IF;
 IF p_kind NOT IN ('message','meeting_note')
  OR char_length(btrim(coalesce(p_body,''))) NOT BETWEEN 1 AND 4000 THEN
  RAISE EXCEPTION 'Provide a valid Contact Diary entry (maximum 4000 characters).';
 END IF;
 INSERT INTO public.lms_qf_contact_entries(enrolment_id,author_id,kind,body)
 VALUES (e.id,actor,p_kind,btrim(p_body)) RETURNING id INTO item;
 RETURN jsonb_build_object('id',item,'saved',true);
END $fn$;

REVOKE ALL ON FUNCTION public.lms_qf_contact_list(uuid),public.lms_qf_contact_add(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_contact_list(uuid),public.lms_qf_contact_add(uuid,text,text) TO authenticated;
