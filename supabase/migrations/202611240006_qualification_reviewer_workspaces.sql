BEGIN;
CREATE FUNCTION public.lms_qf_review_portfolio(p_enrolment uuid,p_role text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; v public.lms_qualification_versions;
 actor uuid := public.lms_qf_actor(); actor_role text;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 actor_role := p_role;
 IF actor IS NULL OR p_role IS NULL OR p_role NOT IN ('assessor','verifier') OR
 (CASE p_role WHEN 'assessor' THEN e.assessor_id WHEN 'verifier' THEN e.verifier_id END) IS DISTINCT FROM actor OR
 NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a WHERE a.user_id=actor AND a.role=p_role AND a.revoked_at IS NULL)
 THEN RAISE EXCEPTION 'Reviewer access denied.' USING ERRCODE='42501'; END IF;
 IF actor_role IS NULL THEN RAISE EXCEPTION 'Qualification access denied.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL AND catalog_key LIKE 'technica-source-%';
 IF NOT FOUND THEN RAISE EXCEPTION 'Qualification is unavailable.'; END IF;
 RETURN jsonb_build_object(
  'id',e.id,'catalogKey',v.catalog_key,'title',v.title,'version',v.version,'role',actor_role,'startsOn',e.starts_on,'targetOn',e.target_on,
  'canEdit',actor_role='learner' AND e.completed_at IS NULL AND e.starts_on<=current_date,
  'assessorAssigned',EXISTS (SELECT 1 FROM public.lms_profiles WHERE id=e.assessor_id AND account_status='active'),
  'verifierAssigned',EXISTS (SELECT 1 FROM public.lms_profiles WHERE id=e.verifier_id AND account_status='active'),
  'declaration',v.declaration,'declarationAt',e.declaration_at,'completedAt',e.completed_at,
  'canRecordCertificate',v.allow_certificate_recording,
  'certificate',e.certificate_reference,'certificateDate',e.certificate_recorded_at,
  'learner',(SELECT full_name FROM public.lms_profiles WHERE id=e.learner_id),
  'assessor',(SELECT full_name FROM public.lms_profiles WHERE id=e.assessor_id),
  'verifier',(SELECT full_name FROM public.lms_profiles WHERE id=e.verifier_id),
  'evidence',CASE WHEN actor_role='learner' THEN coalesce((
   SELECT jsonb_agg(to_jsonb(f)-'enrolment_id' ORDER BY f.created_at DESC)
   FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id AND public.lms_qf_evidence_ready(f)
  ),'[]'::jsonb) ELSE '[]'::jsonb END,
  'units',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.code,'title',u.title,'outcomes',coalesce((
    SELECT jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'guidance',o.guidance,
     'required',o.required,'deadline',d.due_on,
     'independentBlocked',actor_role='verifier' AND EXISTS(SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=e.id AND r.outcome_id=o.id AND r.revision=q.revision AND r.stage='assessor' AND r.decision='accept' AND r.reviewer_id=actor),
     'overdue',e.completed_at IS NULL AND d.due_on<current_date AND coalesce(q.state,'draft') IN ('draft','changes_requested'),
     'criteria',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'title',c.title) ORDER BY c.position)
      FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id),'[]'::jsonb),
     'resources',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'url',r.url) ORDER BY r.title)
      FROM public.lms_qualification_resources r WHERE r.outcome_id=o.id),'[]'::jsonb),
     'claim',CASE WHEN actor_role='learner' OR (actor_role='assessor' AND q.state<>'draft')
      OR (actor_role='verifier' AND q.state IN ('awaiting_verification','verification_returned','verified'))
      THEN jsonb_build_object('state',q.state,'revision',q.revision,'version',q.version,
       'mapping',CASE WHEN actor_role='learner' THEN q.mapping END) END,
     'submissions',coalesce((
      SELECT jsonb_agg(jsonb_build_object('revision',s.revision,'submittedAt',s.submitted_at,'snapshot',s.snapshot,
       'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('stage',r.stage,'decision',r.decision,
        'feedback',r.feedback,'criteria',r.criteria,'createdAt',r.created_at) ORDER BY r.id)
        FROM public.lms_qualification_reviews r WHERE r.enrolment_id=s.enrolment_id
        AND r.outcome_id=s.outcome_id AND r.revision=s.revision
        AND (actor_role<>'learner' OR r.stage='assessor' OR r.decision='accept')),'[]'::jsonb))
       ORDER BY s.revision DESC)
      FROM public.lms_qualification_submissions s WHERE s.enrolment_id=e.id AND s.outcome_id=o.id
      AND (actor_role<>'verifier' OR EXISTS (
       SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=s.enrolment_id
       AND r.outcome_id=s.outcome_id AND r.revision=s.revision AND r.stage='assessor' AND r.decision='accept'
      ))
     ),'[]'::jsonb)) ORDER BY o.position)
    FROM public.lms_qualification_outcomes o
    LEFT JOIN public.lms_qualification_claims q ON q.enrolment_id=e.id AND q.outcome_id=o.id
    LEFT JOIN public.lms_qualification_deadlines d ON d.enrolment_id=e.id AND d.outcome_id=o.id
    WHERE o.unit_id=u.id),'[]'::jsonb)) ORDER BY u.position)
   FROM public.lms_qualification_units u WHERE u.version_id=v.id
  ),'[]'::jsonb));
END $$;
CREATE FUNCTION public.lms_qf_reviewer_queue()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'role',sa.role,'title',v.title,'version',v.version,'catalogKey',v.catalog_key,
 'learner',l.full_name,'completedAt',e.completed_at,'targetOn',e.target_on,'pending',counts.pending,
 'returned',counts.returned,'verified',counts.verified,'required',counts.required,'pendingCriteria',counts.criteria,
 'overdueTasks',tasks.overdue,'outcomes',counts.items) ORDER BY v.title,l.full_name,e.id,sa.role),'[]'::jsonb)
 FROM public.lms_qf_staff_authorisations sa
 JOIN public.lms_qualification_enrolments e ON (sa.role='assessor' AND e.assessor_id=sa.user_id) OR (sa.role='verifier' AND e.verifier_id=sa.user_id)
 JOIN public.lms_qualification_versions v ON v.id=e.version_id AND v.published_at IS NOT NULL AND v.catalog_key LIKE 'technica-source-%'
 JOIN public.lms_profiles l ON l.id=e.learner_id
 CROSS JOIN LATERAL (
 SELECT count(*) FILTER(WHERE x.actionable) pending,
 count(*) FILTER(WHERE x.state=CASE sa.role WHEN 'assessor' THEN 'changes_requested' ELSE 'verification_returned' END) returned,
 count(*) FILTER(WHERE x.required AND x.state='verified') verified,
 count(*) FILTER(WHERE x.required) required,
 coalesce(sum(x.criteria) FILTER(WHERE x.actionable),0) criteria,
 coalesce(jsonb_agg(jsonb_build_object('id',x.id,'code',x.code,'title',x.title,'unit',x.unit,'unitTitle',x.unit_title,'state',x.state,'criteria',x.criteria,'revision',x.revision,'submittedAt',x.submitted_at,'actionable',x.actionable,'blocked',x.blocked) ORDER BY x.unit_pos,x.outcome_pos) FILTER(WHERE x.visible),'[]'::jsonb) items
 FROM (
 SELECT o.id,o.code,o.title,u.code unit,u.title unit_title,u.position unit_pos,o.position outcome_pos,o.required,
 q.state,q.revision,s.submitted_at,
 coalesce(jsonb_array_length(s.snapshot->'criteria'),0) criteria,
 (sa.role='assessor' AND q.state IN('submitted','verification_returned') OR sa.role='verifier' AND q.state='awaiting_verification') AND e.completed_at IS NULL AS actionable,
 sa.role='verifier' AND EXISTS(SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=e.id AND r.outcome_id=o.id AND r.revision=q.revision AND r.stage='assessor' AND r.decision='accept' AND r.reviewer_id=sa.user_id) blocked,
 s.revision IS NOT NULL AND (sa.role='assessor' OR (q.state IN('awaiting_verification','verification_returned','verified') AND EXISTS(SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=e.id AND r.outcome_id=o.id AND r.revision=q.revision AND r.stage='assessor' AND r.decision='accept'))) visible
 FROM public.lms_qualification_units u JOIN public.lms_qualification_outcomes o ON o.unit_id=u.id
 LEFT JOIN public.lms_qualification_claims q ON q.enrolment_id=e.id AND q.outcome_id=o.id
 LEFT JOIN public.lms_qualification_submissions s ON s.enrolment_id=e.id AND s.outcome_id=o.id AND s.revision=q.revision
 WHERE u.version_id=e.version_id
 ) x
 ) counts
 CROSS JOIN LATERAL (SELECT count(*) FILTER(WHERE (item->>'overdue')::boolean) overdue FROM jsonb_array_elements(public.lms_qf_task_rows(e.version_id,e.id)) item) tasks
 WHERE sa.user_id=public.lms_qf_actor() AND sa.revoked_at IS NULL AND sa.role IN('assessor','verifier')
$fn$;
REVOKE ALL ON FUNCTION public.lms_qf_review_portfolio(uuid,text),public.lms_qf_reviewer_queue() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_review_portfolio(uuid,text),public.lms_qf_reviewer_queue() TO authenticated;
COMMIT;
