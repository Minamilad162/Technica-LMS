BEGIN;
ALTER TABLE public.lms_qf_assigned_tasks ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
CREATE OR REPLACE FUNCTION public.lms_qf_task_rows(p_version uuid,p_enrolment uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'enrolmentId',e.id,'learner',l.full_name,'assessor',a.full_name,
  'verifier',v.full_name,'templateId',t.template_id,'spec',t.spec,'dueOn',t.due_on,'cancelledAt',t.cancelled_at,'cancelReason',t.cancel_reason,'revision',t.revision,'startOn',e.starts_on,'canManage',e.completed_at IS NULL AND t.cancelled_at IS NULL AND NOT s.all_verified AND (public.lms_qf_admin_access() OR (e.assessor_id=public.lms_qf_actor() AND EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations sa WHERE sa.user_id=e.assessor_id AND sa.role='assessor' AND sa.revoked_at IS NULL))),
  'outcomes',s.outcomes,'status',CASE WHEN t.cancelled_at IS NOT NULL THEN 'Cancelled' WHEN s.all_verified THEN 'Verified'
   WHEN s.returned THEN 'Changes requested' WHEN s.all_submitted THEN 'Awaiting review' ELSE 'In progress' END,
  'overdue',t.cancelled_at IS NULL AND NOT s.all_verified AND NOT s.all_submitted AND t.due_on<current_date)
  ORDER BY t.due_on,t.id),'[]'::jsonb)
 FROM public.lms_qf_assigned_tasks t JOIN public.lms_qualification_enrolments e ON e.id=t.enrolment_id
 JOIN public.lms_profiles l ON l.id=e.learner_id LEFT JOIN public.lms_profiles a ON a.id=e.assessor_id LEFT JOIN public.lms_profiles v ON v.id=e.verifier_id
 CROSS JOIN LATERAL (
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'unit',u.code)
  ORDER BY u.position,o.position),'[]') outcomes,
  coalesce(bool_and(q.state='verified' AND q.state IS NOT NULL),false) all_verified,
  coalesce(bool_or(q.state IN ('changes_requested','verification_returned')),false) returned,
  coalesce(bool_and(q.state IN ('submitted','awaiting_verification','verified') AND q.state IS NOT NULL),false) all_submitted
  FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
  LEFT JOIN public.lms_qualification_claims q ON q.outcome_id=o.id AND q.enrolment_id=e.id
  WHERE EXISTS(SELECT 1 FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id AND (t.spec->'criteria') ? c.id::text)
 ) s
 WHERE e.version_id=p_version AND (p_enrolment IS NULL OR e.id=p_enrolment)
$fn$;


CREATE FUNCTION public.lms_qf_task_manage(p_task uuid,p_revision integer,p_action text,p_due date,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE t public.lms_qf_assigned_tasks; e public.lms_qualification_enrolments;
 actor uuid:=public.lms_qf_actor(); reason text:=btrim(coalesce(p_reason,'')); eid uuid;
BEGIN
 SELECT enrolment_id INTO eid FROM public.lms_qf_assigned_tasks WHERE id=p_task;
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=eid FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR NOT (public.lms_qf_admin_access() OR (e.assessor_id=actor AND EXISTS(
 SELECT 1 FROM public.lms_qf_staff_authorisations WHERE user_id=actor AND role='assessor' AND revoked_at IS NULL))) THEN
 RAISE EXCEPTION 'Task management denied.' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.lms_qf_assigned_tasks WHERE id=p_task AND enrolment_id=e.id FOR UPDATE;
 IF NOT FOUND OR t.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Task changed. Refresh before editing.'; END IF;
 IF t.cancelled_at IS NOT NULL OR e.completed_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL AND catalog_key LIKE 'technica-source-%') THEN
 RAISE EXCEPTION 'Task is no longer editable.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_qualification_criteria c
 LEFT JOIN public.lms_qualification_claims q ON q.outcome_id=c.outcome_id AND q.enrolment_id=e.id
 WHERE (t.spec->'criteria') ? c.id::text AND q.state IS DISTINCT FROM 'verified') THEN
 RAISE EXCEPTION 'Verified tasks cannot be changed.'; END IF;
 IF char_length(reason)>1000 OR p_action IS NULL OR p_action NOT IN ('reschedule','cancel') THEN RAISE EXCEPTION 'Invalid task action or note.'; END IF;
 IF p_action='reschedule' THEN
  IF p_due IS NULL OR p_due<e.starts_on OR p_due=t.due_on THEN RAISE EXCEPTION 'Choose a different valid deadline.'; END IF;
  UPDATE public.lms_qf_assigned_tasks SET due_on=p_due,revision=revision+1 WHERE id=t.id;
  INSERT INTO public.lms_qf_task_events(actor_id,task_id,action,detail) VALUES(actor,t.id,'rescheduled',jsonb_build_object('oldDue',t.due_on,'newDue',p_due,'note',reason));
 ELSE
  IF char_length(reason)<3 THEN RAISE EXCEPTION 'Enter a cancellation reason.'; END IF;
  UPDATE public.lms_qf_assigned_tasks SET cancelled_at=now(),cancelled_by=actor,cancel_reason=reason,revision=revision+1 WHERE id=t.id;
  INSERT INTO public.lms_qf_task_events(actor_id,task_id,action,detail) VALUES(actor,t.id,'cancelled',jsonb_build_object('reason',reason));
 END IF;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_task_manage(uuid,integer,text,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_task_manage(uuid,integer,text,date,text) TO authenticated;
COMMIT;
