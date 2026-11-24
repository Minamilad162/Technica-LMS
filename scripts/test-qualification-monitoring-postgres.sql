-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f6000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
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
 SELECT pg_temp.qid(n),'qf-monitor-'||n||'@example.invalid',jsonb_build_object('full_name','Directory fixture '||n) FROM generate_series(1,7)n;
INSERT INTO public.lms_role_assignments(user_id,role) SELECT pg_temp.qid(n),'admin' FROM generate_series(1,4)n;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(4) AND role='admin';
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(7);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-monitor-fixture','Directory fixture','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','Criterion',1);


INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(31),pg_temp.qid(20),'LO2','Private draft outcome',2);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(41),pg_temp.qid(31),'2.1','Criterion 2',1);
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f6000000-0000-0000-0000-000000000001';
SELECT set_config('test.monitor.e1',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null,'',true)::text,true);
SELECT set_config('test.monitor.e2',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(6),pg_temp.qid(3),pg_temp.qid(3),current_date,null,'',true)::text,true);
RESET ROLE;
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES(current_setting('test.monitor.e1')::uuid,pg_temp.qid(30),'submitted',1,1,'{}'),
 (current_setting('test.monitor.e1')::uuid,pg_temp.qid(31),'draft',1,1,jsonb_build_object('private-draft','never expose'));
INSERT INTO public.lms_qualification_submissions(enrolment_id,outcome_id,revision,snapshot)
 VALUES(current_setting('test.monitor.e1')::uuid,pg_temp.qid(30),1,jsonb_build_object('criteria',jsonb_build_array(jsonb_build_object('id',pg_temp.qid(40),'code','1.1','title','Criterion')),'mapping','{}'::jsonb,'evidence','{}'::jsonb));

-- Real, role-scoped event projection; first learner has a submitted outcome.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f6000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_monitoring()->'enrolments')>=2,'official monitoring enrolments');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_monitoring()->'enrolments') r WHERE r->>'id'=current_setting('test.monitor.e1') AND r->>'assessment'='1' AND r->>'required'='2' AND r->>'verified'='0'),'real outcome counts, drafts not verified');
SELECT pg_temp.expect((public.lms_qf_monitor_audit(pg_temp.qid(10),current_date-1,current_date+1,NULL,NULL)->>'total')::integer>=3,'audit contains assigned and submitted facts');
SELECT pg_temp.expect(position('private-draft' in public.lms_qf_monitoring()::text)=0,'private draft mapping excluded from monitoring');
SELECT pg_temp.expect(position('private-draft' in public.lms_qf_monitor_audit(pg_temp.qid(10),current_date-1,current_date+1,NULL,NULL)::text)=0,'private draft excluded from audit');
RESET ROLE;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(2) AND role='admin';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f6000000-0000-0000-0000-000000000005';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_monitoring()$sql$,'Monitoring access denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_monitor_audit(NULL,current_date,current_date,NULL,NULL)$sql$,'Audit access denied');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'kind'='enrolment_assigned' AND n->>'enrolmentId'=current_setting('test.monitor.e1')),'learner receives assignment');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'enrolmentId'=current_setting('test.monitor.e2')),'other learner excluded');
SELECT set_config('test.monitor.key',(SELECT n->>'id' FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'kind'='enrolment_assigned' AND n->>'enrolmentId'=current_setting('test.monitor.e1') LIMIT 1),true);
SELECT public.lms_qf_notification_read(current_setting('test.monitor.key'));
SELECT public.lms_qf_notification_read(current_setting('test.monitor.key'));
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'id'=current_setting('test.monitor.key') AND n->>'read'='true'),'read state persisted and idempotent');
SET LOCAL request.jwt.claim.sub='f6000000-0000-0000-0000-000000000006';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_notification_read(current_setting('test.monitor.key'))$sql$,'Notification access denied');
SET LOCAL request.jwt.claim.sub='f6000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'kind'='outcome_submitted' AND n->>'enrolmentId'=current_setting('test.monitor.e1')),'assigned assessor receives submission');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_notifications()->'items') n WHERE n->>'enrolmentId'=current_setting('test.monitor.e2')),'reviewer scope limited');
RESET ROLE;
SELECT pg_temp.expect(NOT has_table_privilege('authenticated','public.lms_qf_notification_reads','SELECT'),'no direct receipt access');
SELECT pg_temp.expect(NOT has_function_privilege('anon','public.lms_qf_monitoring()','EXECUTE') AND NOT has_function_privilege('authenticated','public.lms_qf_monitor_events()','EXECUTE'),'private helper and anonymous access denied');
ROLLBACK;
