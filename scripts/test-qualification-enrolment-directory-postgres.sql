-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f2000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
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
 SELECT pg_temp.qid(n),'qf-directory-'||n||'@example.invalid',jsonb_build_object('full_name','Directory fixture '||n) FROM generate_series(1,7)n;
INSERT INTO public.lms_role_assignments(user_id,role) SELECT pg_temp.qid(n),'admin' FROM generate_series(1,4)n;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(4) AND role='admin';
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(7);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-directory-fixture','Directory fixture','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','Criterion',1);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000005';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_directory('','learner',null)$sql$,'access denied');
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_admin_directory('qf-directory-2','assessor',null)) r WHERE r->>'id'=pg_temp.qid(2)::text AND r->>'isAdmin'='true' AND r->>'eligible'='false'),'admin is discoverable without granting assessment authority');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_admin_directory('qf-directory-4','assessor',null))=0,'revoked admin role not returned as a reviewer candidate');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_admin_directory('qf-directory-7','learner',null))=0,'suspended learner excluded');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_admin_directory('nonmatching','learner',pg_temp.qid(5))) r WHERE r->>'id'=pg_temp.qid(5)::text),'selected learner retained across searches');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(3),current_date,null)$sql$,'published editions');
RESET ROLE;
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(3),current_date,null)$sql$,'documented active centre authorization');
SELECT public.lms_qf_admin_authorize_staff(pg_temp.qid(2),'assessor','Centre competence record A-100',true);
SELECT public.lms_qf_admin_authorize_staff(pg_temp.qid(2),'verifier','Centre competence record V-100',true);
SELECT public.lms_qf_admin_authorize_staff(pg_temp.qid(3),'verifier','Centre competence record V-200',true);
SELECT public.lms_qf_admin_authorize_staff(pg_temp.qid(3),'assessor','Centre competence record A-200',true);
SELECT public.lms_qf_admin_authorize_staff(pg_temp.qid(1),'assessor','Centre competence record A-300',true);
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_admin_directory('qf-directory-2','assessor',null)) r WHERE r->>'eligible'='true'),'authorised admin becomes eligible');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null)$sql$,'distinct active');
SELECT set_config('test.enrol.first',public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(3),current_date,null)::text,true);
SELECT set_config('test.enrol.second',public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(6),pg_temp.qid(3),pg_temp.qid(2),current_date,null)::text,true);
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_assign(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(1),pg_temp.qid(3),current_date,null)$sql$,'already enrolled');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_admin_workspace()) v CROSS JOIN LATERAL jsonb_array_elements(v->'enrolments') e WHERE e->>'id'=current_setting('test.enrol.first') AND e->>'assessorId'=pg_temp.qid(2)::text AND e->>'verifierId'=pg_temp.qid(3)::text),'current reviewers returned with exact IDs');
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_list()) e WHERE e->>'id'=current_setting('test.enrol.first') AND e->>'role'='learner'),'learner sees real assignment');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_portfolio(current_setting('test.enrol.second')::uuid)$sql$,'access denied');
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect((SELECT count(*) FROM jsonb_array_elements(public.lms_qf_list()) e WHERE e->>'role' IN('assessor','verifier'))=2,'same admin sees different legitimate roles on different enrolments');
RESET ROLE;
-- Preserve a prior accepted decision and ensure an assessor cannot later verify it.
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES(current_setting('test.enrol.first')::uuid,pg_temp.qid(30),'awaiting_verification',1,1,'{}');
INSERT INTO public.lms_qualification_submissions(enrolment_id,outcome_id,revision,snapshot)
 VALUES(current_setting('test.enrol.first')::uuid,pg_temp.qid(30),1,'{}');
INSERT INTO public.lms_qualification_reviews(enrolment_id,outcome_id,revision,reviewer_id,stage,decision,feedback,criteria)
 VALUES(current_setting('test.enrol.first')::uuid,pg_temp.qid(30),1,pg_temp.qid(2),'assessor','accept','','{}');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_reassign(current_setting('test.enrol.first')::uuid,pg_temp.qid(1),pg_temp.qid(2),'Independent reassignment request')$sql$,'previously assessed');
SELECT public.lms_qf_admin_reassign(current_setting('test.enrol.first')::uuid,pg_temp.qid(1),pg_temp.qid(3),'Assessor workload reassignment');
RESET ROLE;
SELECT pg_temp.expect((SELECT assessor_id=pg_temp.qid(1) AND verifier_id=pg_temp.qid(3) FROM public.lms_qualification_enrolments WHERE id=current_setting('test.enrol.first')::uuid),'change assessor only');
SELECT pg_temp.expect((SELECT assessor_id=pg_temp.qid(3) AND verifier_id=pg_temp.qid(2) FROM public.lms_qualification_enrolments WHERE id=current_setting('test.enrol.second')::uuid),'other learner on same edition untouched');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_reassignment_events WHERE enrolment_id=current_setting('test.enrol.first')::uuid)=1,'one audited change');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qualification_reviews WHERE enrolment_id=current_setting('test.enrol.first')::uuid)=1,'historical decision preserved');
-- Defense in depth against historical self-verification even if pre-existing inconsistent assignments exist.
UPDATE public.lms_qualification_enrolments SET verifier_id=pg_temp.qid(2) WHERE id=current_setting('test.enrol.first')::uuid;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f2000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(current_setting('test.enrol.first')::uuid,pg_temp.qid(30),1,'verifier','accept','','{}')$sql$,'Independent verification required');
RESET ROLE;
ROLLBACK;
