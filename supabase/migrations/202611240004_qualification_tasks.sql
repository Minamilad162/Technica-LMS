BEGIN;
-- A task is an instructional plan over the existing portfolio, not a new grading engine.
CREATE TABLE public.lms_qf_task_templates(
 id uuid PRIMARY KEY, version_id uuid NOT NULL REFERENCES public.lms_qualification_versions(id),
 spec jsonb NOT NULL, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 approved_at timestamptz, approved_by uuid REFERENCES public.lms_profiles(id),
 created_by uuid NOT NULL REFERENCES public.lms_profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((approved_at IS NULL)=(approved_by IS NULL))
);
CREATE TABLE public.lms_qf_assigned_tasks(
 id uuid PRIMARY KEY, enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id),
 template_id uuid REFERENCES public.lms_qf_task_templates(id),
 spec jsonb NOT NULL, due_on date NOT NULL, created_by uuid NOT NULL REFERENCES public.lms_profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz,
 cancelled_by uuid REFERENCES public.lms_profiles(id), cancel_reason text,
 CHECK((cancelled_at IS NULL)=(cancelled_by IS NULL))
);
CREATE INDEX ON public.lms_qf_task_templates(version_id);
CREATE INDEX ON public.lms_qf_assigned_tasks(enrolment_id);
CREATE TABLE public.lms_qf_task_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 template_id uuid REFERENCES public.lms_qf_task_templates(id), task_id uuid REFERENCES public.lms_qf_assigned_tasks(id),
 action text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_qf_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_qf_assigned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_qf_task_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_task_templates,public.lms_qf_assigned_tasks,public.lms_qf_task_events FROM PUBLIC,anon,authenticated;

-- All linked criteria and materials must belong to the exact version; keep only validated fields.
CREATE FUNCTION public.lms_qf_task_spec(p_version uuid,p_spec jsonb,p_complete boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE criteria_ids uuid[]; document_ids uuid[]; title text; instructions text; evidence text; kind text;
BEGIN
 IF jsonb_typeof(p_spec) IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_spec->'criteria') IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_spec->'documents') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid task details.'; END IF;
 title:=btrim(coalesce(p_spec->>'title','')); instructions:=btrim(coalesce(p_spec->>'instructions',''));
 evidence:=btrim(coalesce(p_spec->>'evidence','')); kind:=p_spec->>'kind';
 IF char_length(title) NOT BETWEEN 1 AND 160 OR char_length(instructions)>10000 OR char_length(evidence)>4000
 OR kind IS NULL OR kind NOT IN ('Written assignment','Workplace evidence','Reflective account','Professional discussion','Other')
 OR jsonb_array_length(p_spec->'criteria')>1000 OR jsonb_array_length(p_spec->'documents')>100 THEN
 RAISE EXCEPTION 'Invalid task title, instructions, type or evidence requirements.'; END IF;
 SELECT coalesce(array_agg(DISTINCT x::uuid ORDER BY x::uuid),'{}') INTO criteria_ids FROM jsonb_array_elements_text(p_spec->'criteria') a(x);
 SELECT coalesce(array_agg(DISTINCT x::uuid ORDER BY x::uuid),'{}') INTO document_ids FROM jsonb_array_elements_text(p_spec->'documents') a(x);
 IF EXISTS(SELECT 1 FROM unnest(criteria_ids) x(id) WHERE NOT EXISTS(
  SELECT 1 FROM public.lms_qualification_criteria c JOIN public.lms_qualification_outcomes o ON o.id=c.outcome_id
  JOIN public.lms_qualification_units u ON u.id=o.unit_id WHERE c.id=x.id AND u.version_id=p_version))
 OR EXISTS(SELECT 1 FROM unnest(document_ids) x(id) WHERE NOT EXISTS(
  SELECT 1 FROM public.lms_qf_centre_documents d JOIN public.lms_qualification_units u ON u.id=d.unit_id
  WHERE d.id=x.id AND u.version_id=p_version AND d.status='approved')) THEN
 RAISE EXCEPTION 'Criteria and approved materials must belong to this qualification edition.'; END IF;
 IF p_complete AND (char_length(instructions)<10 OR char_length(evidence)<3 OR cardinality(criteria_ids)=0) THEN
 RAISE EXCEPTION 'Complete instructions, evidence requirements and at least one criterion are required.'; END IF;
 RETURN jsonb_build_object('title',title,'kind',kind,'instructions',instructions,'evidence',evidence,'criteria',to_jsonb(criteria_ids),'documents',to_jsonb(document_ids));
END $fn$;

CREATE FUNCTION public.lms_qf_task_save_template(p_id uuid,p_version uuid,p_spec jsonb,p_revision integer,p_approve boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE t public.lms_qf_task_templates; validated jsonb; actor uuid:=public.lms_qf_actor();
BEGIN
 IF actor IS NULL OR NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Task administration denied.' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_approve IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions WHERE id=p_version AND catalog_key LIKE 'technica-source-%') THEN RAISE EXCEPTION 'Select an official edition.'; END IF;
 validated:=public.lms_qf_task_spec(p_version,p_spec,p_approve);
 PERFORM 1 FROM public.lms_qualification_versions WHERE id=p_version FOR UPDATE;
 SELECT * INTO t FROM public.lms_qf_task_templates WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF t.version_id<>p_version THEN RAISE EXCEPTION 'Template edition mismatch.'; END IF;
  IF t.spec=validated AND (t.approved_at IS NOT NULL)=p_approve THEN RETURN p_id; END IF;
  IF t.approved_at IS NOT NULL OR t.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Template is approved or changed. Reload or create a new template.'; END IF;
  UPDATE public.lms_qf_task_templates SET spec=validated,revision=revision+1,updated_at=now(),
   approved_at=CASE WHEN p_approve THEN now() END,approved_by=CASE WHEN p_approve THEN actor END WHERE id=p_id;
 ELSE
  IF p_revision IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Template not found.'; END IF;
  INSERT INTO public.lms_qf_task_templates(id,version_id,spec,created_by,approved_at,approved_by)
  VALUES(p_id,p_version,validated,actor,CASE WHEN p_approve THEN now() END,CASE WHEN p_approve THEN actor END);
 END IF;
 INSERT INTO public.lms_qf_task_events(actor_id,template_id,action,detail) VALUES(actor,p_id,CASE WHEN p_approve THEN 'template_approved' ELSE 'template_saved' END,validated);
 RETURN p_id;
END $fn$;

CREATE FUNCTION public.lms_qf_task_assign(p_id uuid,p_enrolment uuid,p_template uuid,p_spec jsonb,p_due date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE e public.lms_qualification_enrolments; t public.lms_qf_task_templates; existing public.lms_qf_assigned_tasks;
 actor uuid:=public.lms_qf_actor(); validated jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR NOT (public.lms_qf_admin_access() OR (e.assessor_id=actor AND EXISTS(
  SELECT 1 FROM public.lms_qf_staff_authorisations WHERE user_id=actor AND role='assessor' AND revoked_at IS NULL)))
 THEN RAISE EXCEPTION 'Task assignment denied.' USING ERRCODE='42501'; END IF;
 IF e.completed_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL AND catalog_key LIKE 'technica-source-%')
 OR p_due IS NULL OR p_due<e.starts_on OR p_id IS NULL THEN RAISE EXCEPTION 'Select an active enrolment and valid deadline.'; END IF;
 IF p_template IS NOT NULL THEN
  SELECT * INTO t FROM public.lms_qf_task_templates WHERE id=p_template AND version_id=e.version_id AND approved_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select an approved template from this edition.'; END IF;
  validated:=public.lms_qf_task_spec(e.version_id,t.spec,true);
 ELSE validated:=public.lms_qf_task_spec(e.version_id,p_spec,true);
 END IF;
 SELECT * INTO existing FROM public.lms_qf_assigned_tasks WHERE id=p_id;
 IF FOUND THEN
  IF existing.enrolment_id=e.id AND existing.template_id IS NOT DISTINCT FROM p_template AND existing.spec=validated AND existing.due_on=p_due THEN RETURN p_id; END IF;
  RAISE EXCEPTION 'Task request conflict.';
 END IF;
 INSERT INTO public.lms_qf_assigned_tasks(id,enrolment_id,template_id,spec,due_on,created_by) VALUES(p_id,e.id,p_template,validated,p_due,actor);
 INSERT INTO public.lms_qf_task_events(actor_id,task_id,action,detail) VALUES(actor,p_id,'assigned',jsonb_build_object('deadline',p_due,'spec',validated));
 RETURN p_id;
END $fn$;

-- No additional pass/fail fields. Progress comes from the current governed outcome claims.
CREATE FUNCTION public.lms_qf_task_rows(p_version uuid,p_enrolment uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'enrolmentId',e.id,'learner',l.full_name,'assessor',a.full_name,
  'verifier',v.full_name,'templateId',t.template_id,'spec',t.spec,'dueOn',t.due_on,'cancelledAt',t.cancelled_at,
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

CREATE FUNCTION public.lms_qf_task_admin_workspace(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Task administration denied.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('units',coalesce((SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.code,'title',u.title,'outcomes',
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'criteria',
   (SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'title',c.title) ORDER BY c.position),'[]') FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id))
   ORDER BY o.position),'[]') FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id)) ORDER BY u.position)
  FROM public.lms_qualification_units u WHERE u.version_id=p_version),'[]'),
 'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'spec',t.spec,'revision',t.revision,'approvedAt',t.approved_at) ORDER BY t.updated_at DESC)
 FROM public.lms_qf_task_templates t WHERE t.version_id=p_version),'[]'),
 'tasks',public.lms_qf_task_rows(p_version,NULL));
END $fn$;
CREATE FUNCTION public.lms_qf_task_portfolio(p_enrolment uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE e public.lms_qualification_enrolments; actor uuid:=public.lms_qf_actor();
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF NOT FOUND OR actor IS NULL OR NOT (actor=e.learner_id OR EXISTS(
 SELECT 1 FROM public.lms_qf_staff_authorisations a WHERE a.user_id=actor AND a.revoked_at IS NULL AND
 ((a.role='assessor' AND e.assessor_id=actor) OR (a.role='verifier' AND e.verifier_id=actor)))) THEN
 RAISE EXCEPTION 'Task portfolio access denied.' USING ERRCODE='42501'; END IF;
 RETURN public.lms_qf_task_rows(e.version_id,e.id);
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_task_spec(uuid,jsonb,boolean),public.lms_qf_task_rows(uuid,uuid),
 public.lms_qf_task_save_template(uuid,uuid,jsonb,integer,boolean),public.lms_qf_task_assign(uuid,uuid,uuid,jsonb,date),
 public.lms_qf_task_admin_workspace(uuid),public.lms_qf_task_portfolio(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_task_save_template(uuid,uuid,jsonb,integer,boolean),public.lms_qf_task_assign(uuid,uuid,uuid,jsonb,date),
 public.lms_qf_task_admin_workspace(uuid),public.lms_qf_task_portfolio(uuid) TO authenticated;
COMMIT;
