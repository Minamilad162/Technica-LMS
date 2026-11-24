BEGIN;
-- Admin directory, exact assignment identities and independent reassignment.
CREATE OR REPLACE FUNCTION public.lms_qf_admin_directory(p_search text DEFAULT '',p_role text DEFAULT 'learner',p_selected uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE payload jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501'; END IF;
 IF p_role IS NULL OR p_role NOT IN ('learner','assessor','verifier') THEN RAISE EXCEPTION 'Invalid directory role.'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'name',q.full_name,'email',q.email,'isAdmin',q.is_admin,'eligible',q.eligible) ORDER BY (q.id=p_selected) DESC NULLS LAST,q.full_name,q.id),'[]'::jsonb)
 INTO payload FROM (
 SELECT p.id,p.full_name,u.email,
  EXISTS(SELECT 1 FROM public.lms_role_assignments r WHERE r.user_id=p.id AND r.role='admin' AND r.revoked_at IS NULL) AS is_admin,
  (p.account_status='active' AND (p_role='learner' OR EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s WHERE s.user_id=p.id AND s.role=p_role AND s.revoked_at IS NULL))) AS eligible
 FROM public.lms_profiles p JOIN auth.users u ON u.id=p.id
 WHERE (p.id=p_selected OR (p.account_status='active'
  AND (p_role='learner' OR EXISTS(SELECT 1 FROM public.lms_role_assignments r WHERE r.user_id=p.id AND r.role='admin' AND r.revoked_at IS NULL)
   OR EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s WHERE s.user_id=p.id AND s.role=p_role AND s.revoked_at IS NULL))
  AND (coalesce(btrim(p_search),'')='' OR p.full_name ILIKE '%'||left(btrim(p_search),80)||'%' OR u.email ILIKE '%'||left(btrim(p_search),80)||'%'))))
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
   SELECT jsonb_agg(jsonb_build_object('id',e.id,'learnerId',e.learner_id,'assessorId',e.assessor_id,'verifierId',e.verifier_id,'learner',l.full_name,
      'assessor',a.full_name,'verifier',q.full_name,'startOn',e.starts_on,
      'targetOn',e.target_on,'completedAt',e.completed_at)
      ORDER BY e.starts_on DESC,l.full_name)
   FROM public.lms_qualification_enrolments e
   JOIN public.lms_profiles l ON l.id=e.learner_id
   LEFT JOIN public.lms_profiles a ON a.id=e.assessor_id
   LEFT JOIN public.lms_profiles q ON q.id=e.verifier_id WHERE e.version_id=v.id),'[]'::jsonb)
 ) ORDER BY v.title,v.version DESC),'[]'::jsonb)
 INTO payload FROM public.lms_qualification_versions v
 WHERE v.catalog_key LIKE 'technica-source-%';
 RETURN payload;
END
$fn$;

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
 IF FOUND THEN RAISE EXCEPTION 'This learner is already enrolled in this edition. Use Edit reviewers.'; END IF;
 INSERT INTO public.lms_qualification_enrolments(version_id,learner_id,assessor_id,verifier_id,starts_on,target_on)
 VALUES(p_version,p_learner,p_assessor,p_verifier,p_start,p_target)
 RETURNING id INTO eid;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,enrolment_id,
  detail) VALUES(actor,'enrolment_assigned',p_version,eid,
   jsonb_build_object('learner',p_learner,'assessor',p_assessor,'verifier',p_verifier));
 RETURN eid;
END
$fn$;

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
 IF NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id AND v.catalog_key LIKE 'technica-source-%' AND v.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Only live official enrolments can be reassigned.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=e.id AND r.stage='assessor' AND r.decision='accept' AND r.reviewer_id=p_verifier) THEN
  RAISE EXCEPTION 'This verifier previously assessed this portfolio. Choose an independent verifier.';
 END IF;
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
  IF EXISTS(SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=e.id AND r.outcome_id=c.outcome_id AND r.revision=c.revision AND r.stage='assessor' AND r.decision='accept' AND r.reviewer_id=actor) THEN
   RAISE EXCEPTION 'Independent verification required; you assessed this submission.' USING ERRCODE='42501';
  END IF;
  next_state := CASE p_decision WHEN 'accept' THEN 'verified' ELSE 'verification_returned' END;
  p_criteria := '{}'::jsonb;
 END IF;
 INSERT INTO public.lms_qualification_reviews(enrolment_id,outcome_id,revision,reviewer_id,stage,decision,feedback,criteria)
 VALUES (e.id,c.outcome_id,c.revision,actor,p_stage,p_decision,btrim(coalesce(p_feedback,'')),p_criteria);
 UPDATE public.lms_qualification_claims SET state=next_state,version=version+1 WHERE enrolment_id=e.id AND outcome_id=c.outcome_id;
END $$;
COMMIT;
