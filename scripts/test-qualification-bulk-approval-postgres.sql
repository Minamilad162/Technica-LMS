-- Disposable fixture; never run on production.
BEGIN;
CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f1000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
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
INSERT INTO auth.users(id,raw_user_meta_data)
 SELECT pg_temp.qid(n),jsonb_build_object('full_name','Bulk fixture '||n) FROM generate_series(1,2)n;
INSERT INTO public.lms_role_assignments(user_id,role) VALUES(pg_temp.qid(1),'admin');
INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration)
 VALUES(pg_temp.qid(10),'technica-source-bulk-fixture','Bulk fixture','1','Unpublished fixture','Fixture declaration');
INSERT INTO public.lms_qualification_units(id,version_id,code,title,position)
 VALUES(pg_temp.qid(20),pg_temp.qid(10),'U01','First unit',1),(pg_temp.qid(21),pg_temp.qid(10),'U02','Second unit',2);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position)
 VALUES(pg_temp.qid(30),pg_temp.qid(20),'LO1','First outcome',1),(pg_temp.qid(31),pg_temp.qid(21),'LO1','Second outcome',1);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position)
 VALUES(pg_temp.qid(40),pg_temp.qid(30),'1.1','First criterion',1),(pg_temp.qid(41),pg_temp.qid(31),'1.1','Second criterion',1);
INSERT INTO public.lms_qf_centre_briefs(unit_id,assessment_instructions,assessment_methods)
 VALUES(pg_temp.qid(20),btrim(repeat('Reviewed fixture instructions. ',4)),'Written assignment and verified workplace evidence'),
       (pg_temp.qid(21),btrim(repeat('Reviewed fixture instructions. ',4)),'Methods must be selected and justified by the centre assessor');
SELECT set_config('test.bulk.expected',(SELECT jsonb_object_agg(unit_id::text,jsonb_build_object('instructions',assessment_instructions,'methods',assessment_methods))::text FROM public.lms_qf_centre_briefs WHERE unit_id IN(pg_temp.qid(20),pg_temp.qid(21))),true);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f1000000-0000-0000-0000-000000000002';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)$sql$,'Admin permission required');
SET LOCAL request.jwt.claim.sub='f1000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,false)$sql$,'confirmation required');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),'{}',true)$sql$,'Unit list changed');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)$sql$,'Unit U02 needs complete');
RESET ROLE;
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_centre_briefs WHERE unit_id IN(pg_temp.qid(20),pg_temp.qid(21)) AND status='approved')=0,'all changes roll back if any Unit fails');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_admin_activity WHERE version_id=pg_temp.qid(10))=0,'failed batch leaves no audit events');
UPDATE public.lms_qf_centre_briefs SET assessment_methods='Professional discussion with documented workplace evidence' WHERE unit_id=pg_temp.qid(21);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f1000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)$sql$,'Unit U02 changed');
RESET ROLE;
SELECT set_config('test.bulk.expected',(SELECT jsonb_object_agg(unit_id::text,jsonb_build_object('instructions',assessment_instructions,'methods',assessment_methods))::text FROM public.lms_qf_centre_briefs WHERE unit_id IN(pg_temp.qid(20),pg_temp.qid(21))),true);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f1000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)=2,'all eligible briefs approved');
SELECT pg_temp.expect(public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)=0,'retry preserves existing approvals');
RESET ROLE;
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_centre_briefs WHERE unit_id IN(pg_temp.qid(20),pg_temp.qid(21)) AND status='approved' AND approved_by=pg_temp.qid(1))=2,'both approvals attributed to authorised administrator');
SELECT pg_temp.expect((SELECT count(*) FROM public.lms_qf_admin_activity WHERE version_id=pg_temp.qid(10) AND action='brief_approved')=2,'one audit event per newly approved Unit');
SELECT pg_temp.expect((SELECT published_at IS NULL FROM public.lms_qualification_versions WHERE id=pg_temp.qid(10)),'batch approval does not publish');
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='f1000000-0000-0000-0000-000000000001';
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_approve_all_briefs(pg_temp.qid(10),current_setting('test.bulk.expected')::jsonb,true)$sql$,'Only draft source-backed');
RESET ROLE;
ROLLBACK;
