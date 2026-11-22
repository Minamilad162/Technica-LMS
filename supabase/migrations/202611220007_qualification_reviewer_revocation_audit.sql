BEGIN;

ALTER TABLE public.lms_qf_staff_authorisations
 ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.lms_profiles(id),
 ADD COLUMN IF NOT EXISTS revoke_reason text;
CREATE TABLE public.lms_qf_staff_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 role text NOT NULL CHECK(role IN ('assessor','verifier')),
 action text NOT NULL CHECK(action IN ('authorized','revoked')),
 actor_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 reason text NOT NULL CHECK(char_length(btrim(reason))>=12),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lms_qf_reassignment_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id),
 previous_assessor uuid REFERENCES public.lms_profiles(id),
 previous_verifier uuid REFERENCES public.lms_profiles(id),
 next_assessor uuid NOT NULL REFERENCES public.lms_profiles(id),
 next_verifier uuid NOT NULL REFERENCES public.lms_profiles(id),
 reason text NOT NULL CHECK(char_length(btrim(reason))>=15),
 authorized_by uuid NOT NULL REFERENCES public.lms_profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_qf_staff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_qf_reassignment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_staff_events,public.lms_qf_reassignment_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_authorize_staff(
 p_user uuid,p_role text,p_reference text,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF NOT public.lms_qf_admin_access() OR p_attest IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Centre staff-authorisation permission denied.' USING ERRCODE='42501';
 END IF;
 IF p_role NOT IN ('assessor','verifier') OR
  char_length(btrim(coalesce(p_reference,''))) NOT BETWEEN 12 AND 220
  OR lower(p_reference) ~ '(placeholder|sandbox|demo|test|pending)'
  OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=p_user AND account_status='active')
 THEN RAISE EXCEPTION 'Choose a real active staff member and documented assessor/verifier competency reference.'; END IF;
 INSERT INTO public.lms_qf_staff_authorisations(user_id,role,competence_reference,authorized_by,authorized_at,revoked_at)
 VALUES(p_user,p_role,btrim(p_reference),(SELECT auth.uid()),now(),null)
 ON CONFLICT(user_id,role) DO UPDATE SET
  competence_reference=excluded.competence_reference,
  authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at,
  revoked_at=null,revoked_by=null,revoke_reason=null;

 INSERT INTO public.lms_qf_staff_events(user_id,role,action,actor_id,reason)
 VALUES(p_user,p_role,'authorized',(SELECT auth.uid()),btrim(p_reference));
END $fn$;



CREATE OR REPLACE FUNCTION public.lms_qf_admin_revoke_staff(
 p_user uuid,p_role text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Centre administrator permission required.' USING ERRCODE='42501';
 END IF;
 IF p_role NOT IN ('assessor','verifier') OR char_length(btrim(coalesce(p_reason,'')))<15
 THEN RAISE EXCEPTION 'Provide a clear revocation reason and valid staff role.'; END IF;
 UPDATE public.lms_qf_staff_authorisations
 SET revoked_at=now(),revoked_by=(SELECT auth.uid()),revoke_reason=btrim(p_reason)
 WHERE user_id=p_user AND role=p_role AND revoked_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'This staff authorisation is not currently active.'; END IF;
 INSERT INTO public.lms_qf_staff_events(user_id,role,action,actor_id,reason)
 VALUES(p_user,p_role,'revoked',(SELECT auth.uid()),btrim(p_reason));
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_reassign(
 p_enrolment uuid,p_assessor uuid,p_verifier uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE e public.lms_qualification_enrolments;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Centre administrator permission required.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR e.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Only incomplete real portfolios can be reassigned.'; END IF;
 IF char_length(btrim(coalesce(p_reason,'')))<15 OR p_assessor IS NULL OR p_verifier IS NULL
  OR p_assessor=p_verifier OR p_assessor=e.learner_id OR p_verifier=e.learner_id
  OR (p_assessor=e.assessor_id AND p_verifier=e.verifier_id)
 THEN RAISE EXCEPTION 'Provide a documented reassignment reason and distinct reviewers.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a
     JOIN public.lms_profiles p ON p.id=a.user_id AND p.account_status='active'
     WHERE a.user_id=p_assessor AND a.role='assessor' AND a.revoked_at IS NULL)
  OR NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a
     JOIN public.lms_profiles p ON p.id=a.user_id AND p.account_status='active'
     WHERE a.user_id=p_verifier AND a.role='verifier' AND a.revoked_at IS NULL)
 THEN RAISE EXCEPTION 'Both replacement reviewers require valid, active centre professional authorisation.'; END IF;
 INSERT INTO public.lms_qf_reassignment_events(enrolment_id,previous_assessor,previous_verifier,
   next_assessor,next_verifier,reason,authorized_by)
 VALUES(e.id,e.assessor_id,e.verifier_id,p_assessor,p_verifier,btrim(p_reason),(SELECT auth.uid()));
 UPDATE public.lms_qualification_enrolments
 SET assessor_id=p_assessor,verifier_id=p_verifier WHERE id=e.id;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_review(p_enrolment uuid,p_outcome uuid,p_version integer,p_stage text,
 p_decision text,p_feedback text,p_criteria jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; c public.lms_qualification_claims;
 actor uuid := public.lms_qf_actor(); next_state text; snapshot_criteria jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF actor IS NULL OR NOT FOUND OR e.completed_at IS NOT NULL OR
  (CASE p_stage WHEN 'assessor' THEN e.assessor_id WHEN 'verifier' THEN e.verifier_id END) IS DISTINCT FROM actor
  THEN RAISE EXCEPTION 'Qualification review access denied.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qf_staff_authorisations a
   WHERE a.user_id=actor AND a.role=p_stage AND a.revoked_at IS NULL)
 THEN RAISE EXCEPTION 'Active centre professional authorization is required to review this portfolio.' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.lms_qualification_claims WHERE enrolment_id=e.id AND outcome_id=p_outcome;
 IF NOT FOUND OR c.version IS DISTINCT FROM p_version OR
  (p_stage='assessor' AND c.state NOT IN ('submitted','verification_returned')) OR
  (p_stage='verifier' AND c.state<>'awaiting_verification') THEN
  RAISE EXCEPTION 'This review is no longer available. Refresh the portfolio.';
 END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('accept','return') OR char_length(coalesce(p_feedback,''))>4000
  OR (p_decision='return' AND nullif(btrim(p_feedback),'') IS NULL) THEN
  RAISE EXCEPTION 'Provide a valid decision and feedback for any return.';
 END IF;
 IF p_stage='assessor' THEN
  SELECT snapshot->'criteria' INTO snapshot_criteria FROM public.lms_qualification_submissions
  WHERE enrolment_id=e.id AND outcome_id=c.outcome_id AND revision=c.revision;
  IF jsonb_typeof(p_criteria) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid criterion decisions.'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_criteria) d WHERE d.value IS NULL OR d.value NOT IN ('met','partial','not_met')
   OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot_criteria) sc WHERE sc->>'id'=d.key))
   THEN RAISE EXCEPTION 'Invalid criterion decisions.'; END IF;
  IF p_decision='accept' AND (coalesce(jsonb_array_length(snapshot_criteria),0)=0 OR EXISTS (
   SELECT 1 FROM jsonb_array_elements(snapshot_criteria) sc WHERE (p_criteria->>(sc->>'id')) IS DISTINCT FROM 'met'
  )) THEN RAISE EXCEPTION 'Mark every criterion Met before accepting.'; END IF;
  next_state := CASE p_decision WHEN 'accept' THEN 'awaiting_verification' ELSE 'changes_requested' END;
 ELSE
  next_state := CASE p_decision WHEN 'accept' THEN 'verified' ELSE 'verification_returned' END;
  p_criteria := '{}'::jsonb;
 END IF;
 INSERT INTO public.lms_qualification_reviews(enrolment_id,outcome_id,revision,reviewer_id,stage,decision,feedback,criteria)
 VALUES (e.id,c.outcome_id,c.revision,actor,p_stage,p_decision,btrim(coalesce(p_feedback,'')),p_criteria);
 UPDATE public.lms_qualification_claims SET state=next_state,version=version+1 WHERE enrolment_id=e.id AND outcome_id=c.outcome_id;
END $$;


CREATE OR REPLACE FUNCTION public.lms_qf_finalize(p_enrolment uuid,p_certificate_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE e public.lms_qualification_enrolments; actor uuid:=public.lms_qf_actor();
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR e.verifier_id IS DISTINCT FROM actor OR
   NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a
       WHERE a.user_id=actor AND a.role='verifier' AND a.revoked_at IS NULL) THEN
   RAISE EXCEPTION 'Qualification finalization access denied.' USING ERRCODE='42501';
 END IF;
 IF p_certificate_reference IS NOT NULL THEN
  IF NOT EXISTS(
   SELECT 1 FROM public.lms_qualification_versions v
   WHERE v.id=e.version_id AND v.published_at IS NOT NULL
     AND (v.allow_certificate_recording OR EXISTS(
       SELECT 1 FROM public.lms_qf_certificate_issuer_authorisations a WHERE a.version_id=v.id
     ))
  ) THEN RAISE EXCEPTION 'External awarding-body certificate issuer authorization is required.'; END IF;
  IF e.completed_at IS NULL OR nullif(btrim(p_certificate_reference),'') IS NULL
     OR char_length(p_certificate_reference)>120
     OR (e.certificate_reference IS NOT NULL AND e.certificate_reference IS DISTINCT FROM btrim(p_certificate_reference))
  THEN RAISE EXCEPTION 'Completed qualification and actual issued certificate reference required.'; END IF;
  UPDATE public.lms_qualification_enrolments SET certificate_reference=btrim(p_certificate_reference),
    certificate_recorded_at=coalesce(certificate_recorded_at,now()),
    certificate_recorded_by=coalesce(certificate_recorded_by,actor)
    WHERE id=e.id;
  RETURN;
 END IF;
 IF e.completed_at IS NOT NULL THEN RETURN; END IF;
 IF e.declaration_at IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
   WHERE u.version_id=e.version_id AND o.required
 ) OR EXISTS (
   SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
   LEFT JOIN public.lms_qualification_claims c ON c.enrolment_id=e.id AND c.outcome_id=o.id
   WHERE u.version_id=e.version_id AND ((o.required AND c.state IS DISTINCT FROM 'verified')
    OR c.state IN ('submitted','awaiting_verification','verification_returned'))
 ) THEN RAISE EXCEPTION 'Verify all required outcomes and resolve outstanding reviews before completion.'; END IF;
 UPDATE public.lms_qualification_enrolments SET completed_at=now(),completed_by=actor WHERE id=e.id;
END $fn$;


REVOKE ALL ON FUNCTION public.lms_qf_admin_revoke_staff(uuid,text,text),
 public.lms_qf_admin_reassign(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_revoke_staff(uuid,text,text),
 public.lms_qf_admin_reassign(uuid,uuid,uuid,text) TO authenticated;
COMMIT;
