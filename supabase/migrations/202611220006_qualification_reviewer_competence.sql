BEGIN;
-- A centre must document a staff member's competence before assigning an assessed
-- learner. Merely having an active LMS account never grants assessor/verifier power.
CREATE TABLE public.lms_qf_staff_authorisations(
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 role text NOT NULL CHECK(role IN ('assessor','verifier')),
 competence_reference text NOT NULL CHECK(char_length(btrim(competence_reference)) BETWEEN 12 AND 220),
 authorized_by uuid NOT NULL REFERENCES public.lms_profiles(id),
 authorized_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 PRIMARY KEY(user_id,role)
);
ALTER TABLE public.lms_qf_staff_authorisations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_staff_authorisations FROM PUBLIC,anon,authenticated;

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
  authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at,revoked_at=null;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_staff()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE result jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('userId',a.user_id,'role',a.role,
  'reference',a.competence_reference,'authorizedAt',a.authorized_at,
  'name',p.full_name) ORDER BY a.role,p.full_name),'[]'::jsonb)
 INTO result
 FROM public.lms_qf_staff_authorisations a
 JOIN public.lms_profiles p ON p.id=a.user_id AND p.account_status='active'
 WHERE a.revoked_at IS NULL;
 RETURN result;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_assign(
 p_version uuid,p_learner uuid,p_assessor uuid,p_verifier uuid,
 p_start date,p_target date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid:=(SELECT auth.uid()); eid uuid;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions WHERE id=p_version AND published_at IS NOT NULL
    AND catalog_key LIKE 'technica-source-%') THEN
   RAISE EXCEPTION 'Only centre-approved published editions can accept enrolments.';
 END IF;
 IF p_learner IS NULL OR p_assessor IS NULL OR p_verifier IS NULL OR
   p_learner IN(p_assessor,p_verifier) OR p_assessor=p_verifier OR p_start IS NULL OR
   (p_target IS NOT NULL AND p_target<p_start) OR
   (SELECT count(*) FROM public.lms_profiles WHERE id IN(p_learner,p_assessor,p_verifier)
    AND account_status='active')<>3 THEN
   RAISE EXCEPTION 'Choose distinct active learner, assessor and verifier with valid dates.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a
    WHERE a.user_id=p_assessor AND a.role='assessor' AND a.revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a
    WHERE a.user_id=p_verifier AND a.role='verifier' AND a.revoked_at IS NULL) THEN
  RAISE EXCEPTION 'Assessor and Verifier require independently documented active centre authorization.';
 END IF;
 SELECT e.id INTO eid FROM public.lms_qualification_enrolments e
 WHERE e.version_id=p_version AND e.learner_id=p_learner FOR UPDATE;
 IF FOUND AND EXISTS (SELECT 1 FROM public.lms_qualification_enrolments e WHERE e.id=eid
  AND (e.completed_at IS NOT NULL OR e.declaration_at IS NOT NULL OR
    EXISTS (SELECT 1 FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id) OR
    EXISTS (SELECT 1 FROM public.lms_qualification_claims c WHERE c.enrolment_id=e.id))) THEN
    RAISE EXCEPTION 'Existing portfolio has learner activity: reassignment is blocked to preserve the audit trail.';
 END IF;
 INSERT INTO public.lms_qualification_enrolments(version_id,learner_id,assessor_id,verifier_id,starts_on,target_on)
 VALUES(p_version,p_learner,p_assessor,p_verifier,p_start,p_target)
 ON CONFLICT(version_id,learner_id) DO UPDATE SET assessor_id=excluded.assessor_id,
   verifier_id=excluded.verifier_id,starts_on=excluded.starts_on,target_on=excluded.target_on
 RETURNING id INTO eid;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,enrolment_id,
  detail) VALUES(actor,'enrolment_assigned',p_version,eid,
   jsonb_build_object('learner',p_learner,'assessor',p_assessor,'verifier',p_verifier));
 RETURN eid;
END
$fn$;


REVOKE ALL ON FUNCTION public.lms_qf_admin_authorize_staff(uuid,text,text,boolean),
 public.lms_qf_admin_staff() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_authorize_staff(uuid,text,text,boolean),
 public.lms_qf_admin_staff() TO authenticated;
COMMIT;
