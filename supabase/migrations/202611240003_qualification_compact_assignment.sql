BEGIN;
-- Same-account administrative assignment is allowed; existing review RPC still rejects self-verification.
ALTER TABLE public.lms_qualification_enrolments DROP CONSTRAINT lms_qualification_enrolments_check2;
ALTER TABLE public.lms_qualification_enrolments ADD COLUMN admin_note text CHECK(char_length(admin_note)<=1500);
CREATE OR REPLACE FUNCTION public.lms_qf_admin_directory(p_search text DEFAULT '',p_role text DEFAULT 'learner',p_selected uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE payload jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501'; END IF;
 IF p_role IS NULL OR p_role NOT IN ('learner','assessor','verifier') THEN RAISE EXCEPTION 'Invalid directory role.'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'name',q.full_name,'email',q.email,'isAdmin',q.is_admin,'eligible',q.eligible,'active',q.active) ORDER BY (q.id=p_selected) DESC NULLS LAST,q.full_name,q.id),'[]'::jsonb)
 INTO payload FROM (
 SELECT p.id,p.full_name,u.email,p.account_status='active' AS active,
  EXISTS(SELECT 1 FROM public.lms_role_assignments r WHERE r.user_id=p.id AND r.role='admin' AND r.revoked_at IS NULL) AS is_admin,
  (p.account_status='active' AND (p_role='learner' OR EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s WHERE s.user_id=p.id AND s.role=p_role AND s.revoked_at IS NULL))) AS eligible
 FROM public.lms_profiles p JOIN auth.users u ON u.id=p.id
 WHERE (p.id=p_selected OR (p.account_status='active'
  AND (p_role='learner' OR EXISTS(SELECT 1 FROM public.lms_role_assignments r WHERE r.user_id=p.id AND r.role='admin' AND r.revoked_at IS NULL)
   OR EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s WHERE s.user_id=p.id AND s.role=p_role AND s.revoked_at IS NULL))
  AND (coalesce(btrim(p_search),'')='' OR p.full_name ILIKE '%'||left(btrim(p_search),80)||'%' OR u.email ILIKE '%'||left(btrim(p_search),80)||'%')))
 ORDER BY (p.id=p_selected) DESC NULLS LAST,p.full_name,p.id LIMIT 50
 ) q;
 RETURN payload;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_admin_directory(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_directory(text,text,uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.lms_qf_admin_workspace()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE payload jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
   RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',v.id,'catalogKey',v.catalog_key,'title',v.title,'version',v.version,
  'publishedAt',v.published_at,'approvalReference',v.approval_reference,
  'allowCertificateRecording',v.allow_certificate_recording,
  'units',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.code,'title',u.title,
     'outcomes',(SELECT count(*) FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id),
     'criteria',(SELECT count(*) FROM public.lms_qualification_criteria c
       JOIN public.lms_qualification_outcomes o ON o.id=c.outcome_id WHERE o.unit_id=u.id),
     'brief',jsonb_build_object('status',coalesce(b.status,'missing'),
       'instructions',b.assessment_instructions,'methods',b.assessment_methods,
       'approvedAt',b.approved_at),
     'documents',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,
       'kind',d.kind,'status',d.status,'filename',d.filename,'createdAt',d.created_at,
       'approvedAt',d.approved_at) ORDER BY d.created_at DESC)
      FROM public.lms_qf_centre_documents d WHERE d.unit_id=u.id),'[]'::jsonb))
      ORDER BY u.position)
   FROM public.lms_qualification_units u
   LEFT JOIN public.lms_qf_centre_briefs b ON b.unit_id=u.id
   WHERE u.version_id=v.id),'[]'::jsonb),
  'enrolments',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',e.id,'learnerId',e.learner_id,'assessorId',e.assessor_id,'verifierId',e.verifier_id,'learner',l.full_name,'learnerEmail',lu.email,'assessorEmail',au.email,'verifierEmail',qu.email,'note',e.admin_note,
      'assessor',a.full_name,'verifier',q.full_name,'startOn',e.starts_on,
      'targetOn',e.target_on,'completedAt',e.completed_at)
      ORDER BY e.starts_on DESC,l.full_name)
   FROM public.lms_qualification_enrolments e
   JOIN public.lms_profiles l ON l.id=e.learner_id
   LEFT JOIN auth.users lu ON lu.id=e.learner_id
   LEFT JOIN auth.users au ON au.id=e.assessor_id
   LEFT JOIN auth.users qu ON qu.id=e.verifier_id
   LEFT JOIN public.lms_profiles a ON a.id=e.assessor_id
   LEFT JOIN public.lms_profiles q ON q.id=e.verifier_id WHERE e.version_id=v.id),'[]'::jsonb)
 ) ORDER BY v.title,v.version DESC),'[]'::jsonb)
 INTO payload FROM public.lms_qualification_versions v
 WHERE v.catalog_key LIKE 'technica-source-%';
 RETURN payload;
END
$fn$;


CREATE FUNCTION public.lms_qf_approve_assignment_staff(p_user uuid,p_role text,p_version uuid,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.lms_qf_admin_access() OR p_attest IS DISTINCT FROM true OR p_role IS NULL OR p_role NOT IN ('assessor','verifier') THEN
  RAISE EXCEPTION 'Centre approval required.' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_profiles p WHERE p.id=p_user AND p.account_status='active') THEN RAISE EXCEPTION 'Reviewer account is not active.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a WHERE a.user_id=p_user AND a.role=p_role AND a.revoked_at IS NULL) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_role_assignments r WHERE r.user_id=p_user AND r.role='admin' AND r.revoked_at IS NULL) THEN RAISE EXCEPTION 'Choose an active admin or an authorised reviewer.'; END IF;
 -- Record the administrator's explicit competence attestation, not an invented external credential.
 PERFORM public.lms_qf_admin_authorize_staff(p_user,p_role,'Internal centre assignment approval; edition '||p_version::text||'; role '||p_role,true);
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_approve_assignment_staff(uuid,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.lms_qf_admin_assign_simple(
 p_version uuid,p_learner uuid,p_assessor uuid,p_verifier uuid,
 p_start date,p_target date,p_note text,p_attest boolean)
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
   p_learner IN(p_assessor,p_verifier) OR p_start IS NULL OR
   (p_target IS NOT NULL AND p_target<p_start) OR
   (SELECT count(*) FROM public.lms_profiles WHERE id IN(p_learner,p_assessor,p_verifier)
    AND account_status='active')<>(CASE WHEN p_assessor=p_verifier THEN 2 ELSE 3 END) THEN
   RAISE EXCEPTION 'Choose active accounts and valid dates; the learner cannot review their own portfolio.';
 END IF;
 IF p_attest IS DISTINCT FROM true OR char_length(coalesce(p_note,''))>1500 THEN RAISE EXCEPTION 'Reviewer approval and a valid optional note are required.'; END IF;
 SELECT e.id INTO eid FROM public.lms_qualification_enrolments e
 WHERE e.version_id=p_version AND e.learner_id=p_learner FOR UPDATE;
 IF FOUND THEN RAISE EXCEPTION 'This learner is already enrolled in this edition. Use Edit reviewers.'; END IF;
 PERFORM public.lms_qf_approve_assignment_staff(p_assessor,'assessor',p_version,p_attest);
 PERFORM public.lms_qf_approve_assignment_staff(p_verifier,'verifier',p_version,p_attest);
 INSERT INTO public.lms_qualification_enrolments(version_id,learner_id,assessor_id,verifier_id,starts_on,target_on,admin_note)
 VALUES(p_version,p_learner,p_assessor,p_verifier,p_start,p_target,nullif(btrim(coalesce(p_note,'')),''))
 RETURNING id INTO eid;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,enrolment_id,
  detail) VALUES(actor,'enrolment_assigned',p_version,eid,
   jsonb_build_object('learner',p_learner,'assessor',p_assessor,'verifier',p_verifier,'note',nullif(btrim(coalesce(p_note,'')),''),'reviewersConfirmed',true));
 RETURN eid;
END
$fn$;


CREATE OR REPLACE FUNCTION public.lms_qf_admin_reassign_simple(
 p_enrolment uuid,p_assessor uuid,p_verifier uuid,p_note text,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE e public.lms_qualification_enrolments;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Centre administrator permission required.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR e.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Only incomplete real portfolios can be reassigned.'; END IF;
 IF p_attest IS DISTINCT FROM true OR char_length(coalesce(p_note,''))>1500 OR p_assessor IS NULL OR p_verifier IS NULL
  OR p_assessor=e.learner_id OR p_verifier=e.learner_id
  OR (p_assessor=e.assessor_id AND p_verifier=e.verifier_id)
 THEN RAISE EXCEPTION 'Confirm the reviewer change and choose valid accounts distinct from the learner.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.catalog_key LIKE 'technica-source-%' AND v.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Only live official enrolments can be reassigned.';
 END IF;
 PERFORM public.lms_qf_approve_assignment_staff(p_assessor,'assessor',e.version_id,p_attest);
 PERFORM public.lms_qf_approve_assignment_staff(p_verifier,'verifier',e.version_id,p_attest);
 INSERT INTO public.lms_qf_reassignment_events(enrolment_id,previous_assessor,previous_verifier,
   next_assessor,next_verifier,reason,authorized_by)
 VALUES(e.id,e.assessor_id,e.verifier_id,p_assessor,p_verifier,coalesce(nullif(btrim(coalesce(p_note,'')),''),'Reviewer assignment changed by centre administrator.'),(SELECT auth.uid()));
 UPDATE public.lms_qualification_enrolments
 SET assessor_id=p_assessor,verifier_id=p_verifier WHERE id=e.id;
END $fn$;


REVOKE ALL ON FUNCTION public.lms_qf_admin_assign_simple(uuid,uuid,uuid,uuid,date,date,text,boolean),public.lms_qf_admin_reassign_simple(uuid,uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_assign_simple(uuid,uuid,uuid,uuid,date,date,text,boolean),public.lms_qf_admin_reassign_simple(uuid,uuid,uuid,text,boolean) TO authenticated;
COMMIT;
