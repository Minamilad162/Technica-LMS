-- Technica LMS: immutable learner-reported OJT / off-the-job activity.
-- Hours are administrative activity only; never imply verified competence or awarding-body training credit.
CREATE TABLE IF NOT EXISTS public.lms_qf_training_activities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id),
 training_on date NOT NULL,
 category text NOT NULL CHECK(category IN('on_job','off_job')),
 minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
 description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 5 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_qf_training_activities_by_enrolment
 ON public.lms_qf_training_activities(enrolment_id,training_on DESC,id DESC);
ALTER TABLE public.lms_qf_training_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_training_activities FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lms_qf_training_list(p_enrolment uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();e public.lms_qualification_enrolments;output jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF actor IS NULL OR NOT FOUND OR
  NOT(coalesce(actor=e.learner_id,false) OR coalesce(actor=e.assessor_id,false) OR coalesce(actor=e.verifier_id,false))
  OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Training Metrics access denied.' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'date',a.training_on,
  'category',a.category,'minutes',a.minutes,'description',a.description,'recordedAt',a.created_at)
  ORDER BY a.training_on DESC,a.created_at DESC),'[]'::jsonb) INTO output
 FROM public.lms_qf_training_activities a WHERE a.enrolment_id=e.id;
 RETURN output;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_training_add(p_enrolment uuid,p_date date,
 p_category text,p_minutes integer,p_description text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();e public.lms_qualification_enrolments;item uuid;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF actor IS NULL OR NOT FOUND OR actor IS DISTINCT FROM e.learner_id OR e.completed_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Training hours cannot be recorded for this portfolio.' USING ERRCODE='42501'; END IF;
 IF p_date IS NULL OR p_date<e.starts_on OR p_date>current_date
  OR p_category NOT IN ('on_job','off_job') OR p_minutes NOT BETWEEN 1 AND 1440
  OR char_length(btrim(coalesce(p_description,''))) NOT BETWEEN 5 AND 1000
 THEN RAISE EXCEPTION 'Provide a valid date, training type, duration and description.'; END IF;
 INSERT INTO public.lms_qf_training_activities(enrolment_id,author_id,training_on,category,minutes,description)
 VALUES(e.id,actor,p_date,p_category,p_minutes,btrim(p_description)) RETURNING id INTO item;
 RETURN item;
END $fn$;

REVOKE ALL ON FUNCTION public.lms_qf_training_list(uuid),
 public.lms_qf_training_add(uuid,date,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_training_list(uuid),
 public.lms_qf_training_add(uuid,date,text,integer,text) TO authenticated;
