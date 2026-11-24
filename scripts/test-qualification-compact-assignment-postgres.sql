-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f3000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
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
 SELECT pg_temp.qid(n),'qf-compact-'||n||'@example.invalid',jsonb_build_object('full_name','Directory fixture '||n) FROM generate_series(1,7)n;
INSERT INTO public.lms_role_assignments(user_id,role) SELECT pg_temp.qid(n),'admin' FROM generate_series(1,4)n;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(4) AND role='admin';
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(7);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-compact-fixture','Directory fixture','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','Criterion',1);
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000005';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null,'',true)$sql$,'Admin permission required');
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null,'',false)$sql$,'Reviewer approval');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(4),current_date,null,'',true)$sql$,'active admin or an authorised reviewer');
RESET ROLE;
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM public.lms_qf_staff_authorisations WHERE user_id=pg_temp.qid(2)),'failed assignment rolls back role approval');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000001';
SELECT set_config('test.compact.enrol',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null,'Cohort A',true)::text,true);
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(3),pg_temp.qid(3),current_date,null,'',true)$sql$,'already enrolled');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_admin_workspace()) v CROSS JOIN LATERAL jsonb_array_elements(v->'enrolments') e WHERE e->>'id'=current_setting('test.compact.enrol') AND e->>'note'='Cohort A' AND e->>'learnerEmail'='qf-compact-5@example.invalid'),'note and email returned in admin workspace');
RESET ROLE;
SELECT pg_temp.expect((SELECT assessor_id=verifier_id AND admin_note='Cohort A' FROM public.lms_qualification_enrolments WHERE id=current_setting('test.compact.enrol')::uuid),'same reviewer allocation saved');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_staff_authorisations WHERE user_id=pg_temp.qid(2) AND revoked_at IS NULL)=2,'both explicit role approvals recorded');
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES(current_setting('test.compact.enrol')::uuid,pg_temp.qid(30),'awaiting_verification',1,1,'{}');
INSERT INTO public.lms_qualification_submissions(enrolment_id,outcome_id,revision,snapshot)
 VALUES(current_setting('test.compact.enrol')::uuid,pg_temp.qid(30),1,'{}');
INSERT INTO public.lms_qualification_reviews(enrolment_id,outcome_id,revision,reviewer_id,stage,decision,feedback,criteria)
 VALUES(current_setting('test.compact.enrol')::uuid,pg_temp.qid(30),1,pg_temp.qid(2),'assessor','accept','','{}');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(current_setting('test.compact.enrol')::uuid,pg_temp.qid(30),1,'verifier','accept','','{}')$sql$,'Independent verification required');
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000001';
SELECT public.lms_qf_admin_reassign_simple(current_setting('test.compact.enrol')::uuid,pg_temp.qid(2),pg_temp.qid(3),'',true);
SET LOCAL request.jwt.claim.sub='f3000000-0000-0000-0000-000000000003';
SELECT public.lms_qf_review(current_setting('test.compact.enrol')::uuid,pg_temp.qid(30),1,'verifier','accept','','{}');
RESET ROLE;
SELECT pg_temp.expect((SELECT state='verified' FROM public.lms_qualification_claims WHERE enrolment_id=current_setting('test.compact.enrol')::uuid),'independent verifier completes review after reassignment');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_reassignment_events WHERE enrolment_id=current_setting('test.compact.enrol')::uuid)=1,'optional blank note still creates audit record');
ROLLBACK;
