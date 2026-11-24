-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f5000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
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
 SELECT pg_temp.qid(n),'qf-review-'||n||'@example.invalid',jsonb_build_object('full_name','Directory fixture '||n) FROM generate_series(1,7)n;
INSERT INTO public.lms_role_assignments(user_id,role) SELECT pg_temp.qid(n),'admin' FROM generate_series(1,4)n;
UPDATE public.lms_role_assignments SET revoked_at=now() WHERE user_id=pg_temp.qid(4) AND role='admin';
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(7);
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-review-fixture','Directory fixture','1','Fixture centre approval','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position) VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','Unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','Criterion',1);


INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position) VALUES(pg_temp.qid(31),pg_temp.qid(20),'LO2','Private draft outcome',2);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position) VALUES(pg_temp.qid(41),pg_temp.qid(31),'2.1','Criterion 2',1);
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000001';
SELECT set_config('test.review.e1',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(5),pg_temp.qid(2),pg_temp.qid(2),current_date,null,'',true)::text,true);
SELECT set_config('test.review.e2',public.lms_qf_admin_assign_simple(pg_temp.qid(10),pg_temp.qid(6),pg_temp.qid(3),pg_temp.qid(3),current_date,null,'',true)::text,true);
RESET ROLE;
INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES(current_setting('test.review.e1')::uuid,pg_temp.qid(30),'submitted',1,1,'{}'),
 (current_setting('test.review.e1')::uuid,pg_temp.qid(31),'draft',1,1,jsonb_build_object('private-draft','never expose'));
INSERT INTO public.lms_qualification_submissions(enrolment_id,outcome_id,revision,snapshot)
 VALUES(current_setting('test.review.e1')::uuid,pg_temp.qid(30),1,jsonb_build_object('criteria',jsonb_build_array(jsonb_build_object('id',pg_temp.qid(40),'code','1.1','title','Criterion')),'mapping','{}'::jsonb,'evidence','{}'::jsonb));
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_reviewer_queue())=0,'learner has no review queue');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'assessor')$sql$,'Reviewer access denied');
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_reviewer_queue())=0,'unassigned global admin has no review queue');
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_reviewer_queue())=2,'same account receives two explicit role entries');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_reviewer_queue()) r WHERE r->>'role'='assessor' AND r->>'pending'='1' AND r->>'pendingCriteria'='1'),'assessor workload uses real submitted criteria');
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_reviewer_queue()) r WHERE r->>'role'='verifier' AND r->>'pending'='0' AND jsonb_array_length(r->'outcomes')=0),'unaccepted submission absent in verifier queue');
SELECT pg_temp.expect(public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'verifier')->>'role'='verifier','explicit role selected');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'verifier')->'units'->0->'outcomes'->0->'submissions')=0,'verifier cannot see unaccepted revision');
SELECT pg_temp.expect(position('private-draft' in public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'assessor')::text)=0,'private draft mapping excluded');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review_portfolio(current_setting('test.review.e2')::uuid,'assessor')$sql$,'Reviewer access denied');
SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),1,'assessor','accept','Reviewed',jsonb_build_object(pg_temp.qid(40)::text,'met'));
SELECT pg_temp.expect(EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_reviewer_queue()) r CROSS JOIN LATERAL jsonb_array_elements(r->'outcomes') o WHERE r->>'role'='verifier' AND o->>'blocked'='true'),'self-verification identified in queue');
SELECT pg_temp.expect(public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'verifier')->'units'->0->'outcomes'->0->>'independentBlocked'='true','self-verification flag in detail');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),2,'verifier','accept','','{}')$sql$,'Independent verification required');
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000001';
SELECT public.lms_qf_admin_reassign_simple(current_setting('test.review.e1')::uuid,pg_temp.qid(2),pg_temp.qid(3),'',true);
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect(public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'verifier')->'units'->0->'outcomes'->0->>'independentBlocked'='false','independent verifier can review');
SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),2,'verifier','return','Please expand the rationale','{}');
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),2,'assessor','accept','','{}')$sql$,'no longer available');
SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),3,'assessor','accept','Follow-up reviewed',jsonb_build_object(pg_temp.qid(40)::text,'met'));
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000003';
SELECT public.lms_qf_review(current_setting('test.review.e1')::uuid,pg_temp.qid(30),4,'verifier','accept','Verified','{}');
RESET ROLE;
SELECT pg_temp.expect((SELECT state='verified' FROM public.lms_qualification_claims WHERE enrolment_id=current_setting('test.review.e1')::uuid AND outcome_id=pg_temp.qid(30)),'verified through independent review and follow-up');
UPDATE public.lms_qf_staff_authorisations SET revoked_at=now() WHERE user_id=pg_temp.qid(3) AND role='verifier';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f5000000-0000-0000-0000-000000000003';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review_portfolio(current_setting('test.review.e1')::uuid,'verifier')$sql$,'Reviewer access denied');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.lms_qf_reviewer_queue()) r WHERE r->>'role'='verifier'),'revoked reviewer removed from queue');
RESET ROLE;
SELECT pg_temp.expect(NOT has_function_privilege('anon','public.lms_qf_reviewer_queue()','EXECUTE'),'anonymous queue denied');
ROLLBACK;
