-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f4000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
CREATE FUNCTION pg_temp.expect(ok boolean, description text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',description; END IF; END $$;
CREATE FUNCTION pg_temp.denied(statement text, reason text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF position(reason IN SQLERRM)=0 THEN RAISE; END IF; failed:=true;
 END;
 PERFORM pg_temp.expect(failed,statement||' should fail');
END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data)
 SELECT pg_temp.qid(n),'qf-task-'||n||'@example.invalid',jsonb_build_object('full_name','Directory fixture '||n) FROM generate_series(1,7)n;
INSERT INTO public.lms_role_assignments(user_id,role) SELECT pg_temp.qid(n),'admin' FROM generate_series(1,4)n;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(4) AND role='admin';
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(7);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-task-fixture','Directory fixture','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','Criterion',1);
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(21),pg_temp.qid(10),'U02','Second Unit',2);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(31),pg_temp.qid(21),'LO1','Second Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(41),pg_temp.qid(31),'1.1','Second Criterion',1);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(11),'technica-source-task-other','Other edition','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(22),pg_temp.qid(11),'U01','Other Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(32),pg_temp.qid(22),'LO1','Other Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(42),pg_temp.qid(32),'1.1','Other Criterion',1);
CREATE FUNCTION pg_temp.spec(p_other boolean DEFAULT false) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('title','Fixture task','kind','Written assignment','instructions','Prepare workplace evidence and explain the findings.','evidence','Workplace report','criteria',jsonb_build_array(pg_temp.qid(40),CASE WHEN p_other THEN pg_temp.qid(42) ELSE pg_temp.qid(41) END),'documents','[]'::jsonb)
$$;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000005';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_save_template(pg_temp.qid(50),pg_temp.qid(10),pg_temp.spec(),0,true)$sql$,'Task administration denied');
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_save_template(pg_temp.qid(50),pg_temp.qid(10),pg_temp.spec(true),0,true)$sql$,'Criteria and approved materials');
SELECT pg_temp.expect(public.lms_qf_task_save_template(pg_temp.qid(50),pg_temp.qid(10),pg_temp.spec(),0,false)=pg_temp.qid(50),'draft template before enrolment');
SELECT pg_temp.expect(public.lms_qf_task_save_template(pg_temp.qid(50),pg_temp.qid(10),pg_temp.spec(),1,true)=pg_temp.qid(50),'approve template before publication');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_save_template(pg_temp.qid(50),pg_temp.qid(10),pg_temp.spec()||'{"title":"Changed"}',2,true)$sql$,'Template is approved');
RESET ROLE;
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000001';
SELECT set_config('test.task.e1',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(3),current_date,null,'',true)::text,true);
SELECT set_config('test.task.e2',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(6),pg_temp.qid(3),pg_temp.qid(2),current_date,null,'',true)::text,true);
SELECT pg_temp.expect(public.lms_qf_task_assign(pg_temp.qid(60),current_setting('test.task.e1')::uuid,pg_temp.qid(50),null,current_date+7)=pg_temp.qid(60),'assign template learner 1');
SELECT pg_temp.expect(public.lms_qf_task_assign(pg_temp.qid(61),current_setting('test.task.e2')::uuid,pg_temp.qid(50),null,current_date+14)=pg_temp.qid(61),'reuse template for second learner');
SELECT pg_temp.expect(public.lms_qf_task_assign(pg_temp.qid(60),current_setting('test.task.e1')::uuid,pg_temp.qid(50),null,current_date+7)=pg_temp.qid(60),'idempotent retry');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_assign(pg_temp.qid(60),current_setting('test.task.e1')::uuid,pg_temp.qid(50),null,current_date+8)$sql$,'Task request conflict');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_task_admin_workspace(pg_temp.qid(10))->'tasks')=2,'admin sees both tasks');
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_task_portfolio(current_setting('test.task.e1')::uuid))=1,'learner sees own task');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_portfolio(current_setting('test.task.e2')::uuid)$sql$,'Task portfolio access denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_assign(pg_temp.qid(62),current_setting('test.task.e1')::uuid,null,pg_temp.spec(),current_date+10)$sql$,'Task assignment denied');
RESET ROLE;
-- Isolate assessor privileges: the account was an Admin when authorised, but no longer has that role.
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(2) AND role='admin';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(public.lms_qf_task_assign(pg_temp.qid(62),current_setting('test.task.e1')::uuid,null,pg_temp.spec(),current_date+10)=pg_temp.qid(62),'assigned assessor can create individual task');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_assign(pg_temp.qid(63),current_setting('test.task.e2')::uuid,null,pg_temp.spec(),current_date+10)$sql$,'Task assignment denied');
RESET ROLE;
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES(current_setting('test.task.e1')::uuid,pg_temp.qid(30),'draft',1,1,'{}');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect((public.lms_qf_task_portfolio(current_setting('test.task.e1')::uuid)->0->>'status')='In progress','draft outcome does not complete task');
RESET ROLE;
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_assigned_tasks)=3,'retry did not duplicate tasks');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_task_events WHERE action='assigned')=3,'one audit event per assignment');
SELECT pg_temp.expect(NOT has_table_privilege('authenticated','public.lms_qf_assigned_tasks','SELECT'),'no direct task table read');
-- Lifecycle changes preserve scope, original evidence and decisions.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000005';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(60),1,'reschedule',current_date+20,'')$sql$,'Task management denied');
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(61),1,'cancel',null,'Wrong learner')$sql$,'Task management denied');
SELECT public.lms_qf_task_manage(pg_temp.qid(60),1,'reschedule',current_date+20,'Extension agreed');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(60),1,'reschedule',current_date+21,'')$sql$,'Task changed');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(60),2,'cancel',null,'')$sql$,'Enter a cancellation reason');
SELECT public.lms_qf_task_manage(pg_temp.qid(60),2,'cancel',null,'Replaced by another task');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(60),3,'reschedule',current_date+21,'')$sql$,'Task is no longer editable');
RESET ROLE;
SELECT pg_temp.expect((SELECT due_on=current_date+20 AND cancelled_at IS NOT NULL AND revision=3 FROM public.lms_qf_assigned_tasks WHERE id=pg_temp.qid(60)),'deadline and cancellation persisted');
SELECT pg_temp.expect((SELECT due_on=current_date+14 AND cancelled_at IS NULL FROM public.lms_qf_assigned_tasks WHERE id=pg_temp.qid(61)),'other learner unchanged');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_task_events WHERE task_id=pg_temp.qid(60) AND action IN ('rescheduled','cancelled'))=2,'two audited changes');
SELECT pg_temp.expect((SELECT state='draft' FROM public.lms_qualification_claims WHERE enrolment_id=current_setting('test.task.e1')::uuid AND outcome_id=pg_temp.qid(30)),'claim preserved after cancellation');
UPDATE public.lms_qualification_claims SET state='verified' WHERE enrolment_id=current_setting('test.task.e1')::uuid AND outcome_id=pg_temp.qid(30);
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping) VALUES(current_setting('test.task.e1')::uuid,pg_temp.qid(31),'verified',1,1,'{}');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f4000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_task_manage(pg_temp.qid(62),1,'cancel',null,'Verified task')$sql$,'Verified tasks cannot be changed');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_task_portfolio(current_setting('test.task.e1')::uuid)) t WHERE t->>'id'=pg_temp.qid(62)::text AND t->>'status'='Verified' AND t->>'canManage'='false'),'verified task locked');
RESET ROLE;
SELECT pg_temp.expect(NOT has_function_privilege('anon','public.lms_qf_task_manage(uuid,integer,text,date,text)','EXECUTE'),'anonymous management denied');
ROLLBACK;
