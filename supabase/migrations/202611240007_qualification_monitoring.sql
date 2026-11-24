BEGIN;
-- Monitoring is a read model over official portfolios. No completion or certificate
-- mutation is introduced; the existing independently verified finalisation RPC remains authoritative.
CREATE FUNCTION public.lms_qf_monitoring()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF public.lms_qf_actor() IS NULL OR NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Monitoring access denied.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'enrolments',coalesce((SELECT jsonb_agg(jsonb_build_object(
 'id',e.id,'versionId',v.id,'title',v.title,'edition',v.version,
 'learnerId',e.learner_id,'learner',l.full_name,'assessorId',e.assessor_id,'assessor',a.full_name,'verifierId',e.verifier_id,'verifier',r.full_name,
 'startOn',e.starts_on,'targetOn',e.target_on,'completedAt',e.completed_at,'declarationAt',e.declaration_at,
 'certificateRecordedAt',e.certificate_recorded_at,'required',q.required,'verified',q.verified,
 'assessment',q.assessment,'verification',q.verification,'returned',q.returned,'independenceBlocked',q.blocked,
 'assessorActive',EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s JOIN public.lms_profiles p ON p.id=s.user_id WHERE s.user_id=e.assessor_id AND s.role='assessor' AND s.revoked_at IS NULL AND p.account_status='active'),
 'verifierActive',EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations s JOIN public.lms_profiles p ON p.id=s.user_id WHERE s.user_id=e.verifier_id AND s.role='verifier' AND s.revoked_at IS NULL AND p.account_status='active'))
 ORDER BY v.title,l.full_name,e.id)
 FROM public.lms_qualification_enrolments e JOIN public.lms_qualification_versions v ON v.id=e.version_id
 JOIN public.lms_profiles l ON l.id=e.learner_id LEFT JOIN public.lms_profiles a ON a.id=e.assessor_id LEFT JOIN public.lms_profiles r ON r.id=e.verifier_id
 CROSS JOIN LATERAL (SELECT count(*) FILTER(WHERE o.required) required,count(*) FILTER(WHERE o.required AND c.state='verified') verified,
 count(*) FILTER(WHERE c.state IN('submitted','verification_returned')) assessment,
 count(*) FILTER(WHERE c.state='awaiting_verification') verification,
 count(*) FILTER(WHERE c.state='changes_requested') returned,
 count(*) FILTER(WHERE c.state='awaiting_verification' AND EXISTS(SELECT 1 FROM public.lms_qualification_reviews rev WHERE rev.enrolment_id=e.id AND rev.outcome_id=o.id AND rev.revision=c.revision AND rev.stage='assessor' AND rev.decision='accept' AND rev.reviewer_id=e.verifier_id)) blocked
 FROM public.lms_qualification_units u JOIN public.lms_qualification_outcomes o ON o.unit_id=u.id
 LEFT JOIN public.lms_qualification_claims c ON c.enrolment_id=e.id AND c.outcome_id=o.id WHERE u.version_id=v.id) q
 WHERE v.catalog_key LIKE 'technica-source-%' AND v.published_at IS NOT NULL),'[]'),
 'tasks',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t->>'id','enrolmentId',t->>'enrolmentId','versionId',v.id,'title',t->'spec'->>'title','dueOn',t->>'dueOn','status',t->>'status','overdue',(t->>'overdue')::boolean) ORDER BY t->>'dueOn',t->>'id')
 FROM public.lms_qualification_versions v CROSS JOIN LATERAL jsonb_array_elements(public.lms_qf_task_rows(v.id,NULL)) t
 WHERE v.catalog_key LIKE 'technica-source-%' AND v.published_at IS NOT NULL),'[]'));
END $fn$;

-- Event projection: immutable recorded facts with stable keys. Scope is applied by
-- public entry points; never expose the raw helper or evidence/mapping/feedback payloads.
CREATE FUNCTION public.lms_qf_monitor_events()
RETURNS TABLE(event_key text,version_id uuid,enrolment_id uuid,actor_id uuid,kind text,occurred_at timestamptz,audience text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT 'admin:'||a.id,a.version_id,a.enrolment_id,a.actor_id,a.action,a.created_at,
 CASE WHEN a.action='enrolment_assigned' THEN 'team' ELSE 'admin' END
 FROM public.lms_qf_admin_activity a
 UNION ALL
 SELECT 'reassign:'||a.id,e.version_id,e.id,a.authorized_by,'reviewers_reassigned',a.created_at,'team'
 FROM public.lms_qf_reassignment_events a JOIN public.lms_qualification_enrolments e ON e.id=a.enrolment_id
 UNION ALL
 SELECT 'task:'||a.id,coalesce(e.version_id,tp.version_id),e.id,a.actor_id,'task_'||a.action,a.created_at,CASE WHEN e.id IS NULL THEN 'admin' ELSE 'team' END
 FROM public.lms_qf_task_events a LEFT JOIN public.lms_qf_assigned_tasks t ON t.id=a.task_id
 LEFT JOIN public.lms_qualification_enrolments e ON e.id=t.enrolment_id LEFT JOIN public.lms_qf_task_templates tp ON tp.id=a.template_id
 UNION ALL
 SELECT 'submission:'||s.enrolment_id||':'||s.outcome_id||':'||s.revision,e.version_id,e.id,e.learner_id,'outcome_submitted',s.submitted_at,'assessor'
 FROM public.lms_qualification_submissions s JOIN public.lms_qualification_enrolments e ON e.id=s.enrolment_id
 UNION ALL
 SELECT 'review:'||r.id,e.version_id,e.id,r.reviewer_id,r.stage||'_'||r.decision,r.created_at,
 CASE WHEN r.stage='assessor' AND r.decision='accept' THEN 'learner_verifier' WHEN r.stage='verifier' THEN 'learner_assessor' ELSE 'learner' END
 FROM public.lms_qualification_reviews r JOIN public.lms_qualification_enrolments e ON e.id=r.enrolment_id
 UNION ALL
 SELECT 'completed:'||e.id,e.version_id,e.id,e.completed_by,'qualification_completed',e.completed_at,'team'
 FROM public.lms_qualification_enrolments e WHERE e.completed_at IS NOT NULL
 UNION ALL
 SELECT 'certificate:'||e.id,e.version_id,e.id,e.certificate_recorded_by,'certificate_recorded',e.certificate_recorded_at,'team'
 FROM public.lms_qualification_enrolments e WHERE e.certificate_recorded_at IS NOT NULL
$fn$;

CREATE TABLE public.lms_qf_notification_reads(
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 event_key text NOT NULL CHECK(char_length(event_key) BETWEEN 3 AND 180),
 read_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,event_key));
ALTER TABLE public.lms_qf_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_notification_reads FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_qf_visible_notifications()
RETURNS TABLE(event_key text,version_id uuid,enrolment_id uuid,kind text,occurred_at timestamptz,title text,learner text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 WITH actor AS (SELECT public.lms_qf_actor() id,public.lms_qf_admin_access() admin),
 events AS (
 SELECT m.event_key,m.version_id,m.enrolment_id,m.kind,m.occurred_at,m.audience FROM public.lms_qf_monitor_events() m
 WHERE m.audience<>'admin'
 UNION ALL
 SELECT 'deadline:'||t.id||':'||t.due_on,e.version_id,e.id,'task_deadline',t.due_on::timestamp AT TIME ZONE 'Africa/Cairo','team'
 FROM public.lms_qf_assigned_tasks t JOIN public.lms_qualification_enrolments e ON e.id=t.enrolment_id
 WHERE t.cancelled_at IS NULL AND e.completed_at IS NULL AND t.due_on<=(now() AT TIME ZONE 'Africa/Cairo')::date+3
 AND EXISTS(SELECT 1 FROM public.lms_qualification_criteria c LEFT JOIN public.lms_qualification_claims q ON q.enrolment_id=e.id AND q.outcome_id=c.outcome_id
 WHERE (t.spec->'criteria') ? c.id::text AND (q.state IS NULL OR q.state IN('draft','changes_requested','verification_returned')))
 )
 SELECT m.event_key,m.version_id,m.enrolment_id,m.kind,m.occurred_at,v.title,l.full_name
 FROM events m JOIN public.lms_qualification_versions v ON v.id=m.version_id AND v.catalog_key LIKE 'technica-source-%' AND v.published_at IS NOT NULL
 JOIN public.lms_qualification_enrolments e ON e.id=m.enrolment_id JOIN public.lms_profiles l ON l.id=e.learner_id CROSS JOIN actor
 WHERE actor.id IS NOT NULL AND (actor.admin OR
 (e.learner_id=actor.id AND m.audience IN('team','learner','learner_verifier','learner_assessor')) OR
 (e.assessor_id=actor.id AND m.audience IN('team','assessor','learner_assessor') AND EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a WHERE a.user_id=actor.id AND a.role='assessor' AND a.revoked_at IS NULL)) OR
 (e.verifier_id=actor.id AND m.audience IN('team','learner_verifier') AND EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations a WHERE a.user_id=actor.id AND a.role='verifier' AND a.revoked_at IS NULL)))
$fn$;

CREATE FUNCTION public.lms_qf_notifications()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Notification access denied.' USING ERRCODE='42501'; END IF;
 RETURN (WITH rows AS (
 SELECT n.*,r.read_at IS NOT NULL AS read FROM public.lms_qf_visible_notifications() n
 LEFT JOIN public.lms_qf_notification_reads r ON r.user_id=actor AND r.event_key=n.event_key
 ),limited AS (SELECT * FROM rows ORDER BY occurred_at DESC,event_key DESC LIMIT 100)
 SELECT jsonb_build_object('unread',(SELECT count(*) FROM rows WHERE NOT read),'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',event_key,'versionId',version_id,'enrolmentId',enrolment_id,'kind',kind,'createdAt',occurred_at,'title',title,'learner',learner,'read',read) ORDER BY occurred_at DESC,event_key DESC) FROM limited),'[]')));
END $fn$;

CREATE FUNCTION public.lms_qf_notification_read(p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_qf_visible_notifications() n WHERE n.event_key=p_key) THEN RAISE EXCEPTION 'Notification access denied.' USING ERRCODE='42501'; END IF;
 INSERT INTO public.lms_qf_notification_reads(user_id,event_key) VALUES(actor,p_key) ON CONFLICT DO NOTHING;
END $fn$;

CREATE FUNCTION public.lms_qf_monitor_audit(p_version uuid,p_from date,p_to date,p_enrolment uuid,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF public.lms_qf_actor() IS NULL OR NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Audit access denied.' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>366 THEN RAISE EXCEPTION 'Select an audit date range of up to 366 days.'; END IF;
 RETURN (WITH rows AS (SELECT m.event_key,m.kind,m.occurred_at,m.enrolment_id,m.actor_id,v.id version_id,v.title,l.full_name learner,a.full_name actor
 FROM public.lms_qf_monitor_events() m JOIN public.lms_qualification_versions v ON v.id=m.version_id
 LEFT JOIN public.lms_qualification_enrolments e ON e.id=m.enrolment_id LEFT JOIN public.lms_profiles l ON l.id=e.learner_id LEFT JOIN public.lms_profiles a ON a.id=m.actor_id
 WHERE v.catalog_key LIKE 'technica-source-%' AND (p_version IS NULL OR v.id=p_version)
 AND (p_enrolment IS NULL OR e.id=p_enrolment) AND (p_actor IS NULL OR m.actor_id=p_actor)
 AND m.occurred_at>=(p_from::timestamp AT TIME ZONE 'Africa/Cairo') AND m.occurred_at<((p_to+1)::timestamp AT TIME ZONE 'Africa/Cairo')),
 limited AS (SELECT * FROM rows ORDER BY occurred_at DESC,event_key DESC LIMIT 1000)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM rows),'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',event_key,'kind',kind,'createdAt',occurred_at,'versionId',version_id,'title',title,'learner',learner,'actor',actor,'enrolmentId',enrolment_id) ORDER BY occurred_at DESC,event_key DESC) FROM limited),'[]')));
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_monitoring(),public.lms_qf_monitor_events(),public.lms_qf_visible_notifications(),public.lms_qf_notifications(),public.lms_qf_notification_read(text),public.lms_qf_monitor_audit(uuid,date,date,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_monitoring(),public.lms_qf_notifications(),public.lms_qf_notification_read(text),public.lms_qf_monitor_audit(uuid,date,date,uuid,uuid) TO authenticated;
COMMIT;
