-- Technica LMS: minimal learner-owned registration details for an enrolled qualification.
-- This intentionally omits national insurance, birth date, full home address and identity documents
-- until the centre documents necessity, retention rules and dedicated handling for sensitive data.
-- Credentials, assessment decisions and learner declarations remain in their existing tables.

CREATE TABLE IF NOT EXISTS public.lms_qf_candidate_registration(
 enrolment_id uuid PRIMARY KEY REFERENCES public.lms_qualification_enrolments(id) ON DELETE CASCADE,
 data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data)='object'),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_qf_candidate_registration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_candidate_registration FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lms_qf_registration_read(p_enrolment uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments; result jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF actor IS NULL OR NOT FOUND OR
  NOT (actor=e.learner_id OR public.lms_qf_admin_access()) OR
  NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Learner registration access denied.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('details',r.data,'updatedAt',r.updated_at) INTO result
 FROM public.lms_qf_candidate_registration r WHERE r.enrolment_id=e.id;
 RETURN coalesce(result,jsonb_build_object('details','{}'::jsonb,'updatedAt',NULL));
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_registration_save(p_enrolment uuid,p_data jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments; response jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF actor IS NULL OR NOT FOUND OR actor IS DISTINCT FROM e.learner_id
  OR e.completed_at IS NOT NULL OR e.starts_on>current_date
  OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Learner registration editing is unavailable.' USING ERRCODE='42501'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR char_length(p_data::text)>8000
 THEN RAISE EXCEPTION 'Invalid registration form data.'; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_each(p_data) field
  WHERE field.key NOT IN ('phone','alternatePhone','country','jobTitle','employer','department',
   'awardingLearnerNumber','uniqueLearnerNumber','awardingRegistrationNumber',
   'certificateName','learningNeeds','generalNotes','fundingSource','fundingReference')
  OR jsonb_typeof(field.value)<>'string'
  OR char_length(field.value #>> '{}')>1000
 ) THEN RAISE EXCEPTION 'Registration contains unsupported or oversized fields.'; END IF;
 INSERT INTO public.lms_qf_candidate_registration(enrolment_id,data,updated_by,updated_at)
 VALUES (e.id,p_data,actor,now())
 ON CONFLICT(enrolment_id) DO UPDATE SET
  data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 SELECT jsonb_build_object('details',r.data,'updatedAt',r.updated_at) INTO response
 FROM public.lms_qf_candidate_registration r WHERE r.enrolment_id=e.id;
 RETURN response;
END $fn$;

REVOKE ALL ON FUNCTION public.lms_qf_registration_read(uuid),
 public.lms_qf_registration_save(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_registration_read(uuid),
 public.lms_qf_registration_save(uuid,jsonb) TO authenticated;
