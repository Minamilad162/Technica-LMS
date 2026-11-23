-- Disposable fixture. Apply P1, Storage fixtures and the qualification migration first.
BEGIN;

CREATE FUNCTION pg_temp.qid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f0000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
CREATE FUNCTION pg_temp.expect(ok boolean, description text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', description; END IF;
END $$;
CREATE FUNCTION pg_temp.denied(statement text, reason text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean := false;
BEGIN
 BEGIN
  EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF position(reason IN SQLERRM)=0 THEN RAISE; END IF;
  failed := true;
 END;
 PERFORM pg_temp.expect(failed,statement || ' should fail');
END $$;

INSERT INTO auth.users(id,raw_user_meta_data)
SELECT pg_temp.qid(n), jsonb_build_object('full_name','Portfolio fixture ' || n) FROM generate_series(1,5) n;
UPDATE public.lms_profiles SET account_status='suspended' WHERE id=pg_temp.qid(5);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon, authenticated;
CREATE POLICY qf_test_broad_policy ON storage.objects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.lms_qualification_versions(id,catalog_key,title,version,approval_reference,declaration,allow_certificate_recording)
VALUES (pg_temp.qid(10),'fixture','Fixture programme','1','TEST','I confirm this is my own work.',true);
SELECT pg_temp.denied('UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10)', 'complete rubric');

INSERT INTO public.lms_qualification_units(id,version_id,code,title,position)
VALUES (pg_temp.qid(20),pg_temp.qid(10),'UNIT01','Fixture unit',1);
INSERT INTO public.lms_qualification_outcomes(id,unit_id,code,title,position)
VALUES (pg_temp.qid(30),pg_temp.qid(20),'LO1','Outcome one',1),
       (pg_temp.qid(31),pg_temp.qid(20),'LO2','Outcome two',2);
INSERT INTO public.lms_qualification_criteria(id,outcome_id,code,title,position)
VALUES (pg_temp.qid(40),pg_temp.qid(30),'1.1','First criterion',1),
       (pg_temp.qid(41),pg_temp.qid(31),'2.1','Second criterion',1);
UPDATE public.lms_qualification_versions SET published_at=now() WHERE id=pg_temp.qid(10);
SELECT pg_temp.denied('UPDATE public.lms_qualification_criteria SET title = ''Changed'' WHERE id=pg_temp.qid(40)', 'immutable');

INSERT INTO public.lms_qualification_enrolments(id,version_id,learner_id,assessor_id,verifier_id,starts_on,target_on)
VALUES (pg_temp.qid(50),pg_temp.qid(10),pg_temp.qid(1),pg_temp.qid(2),pg_temp.qid(3),current_date-5,current_date+5),
       (pg_temp.qid(51),pg_temp.qid(10),pg_temp.qid(4),pg_temp.qid(2),pg_temp.qid(3),current_date-5,current_date+5);
INSERT INTO public.lms_qualification_deadlines VALUES (pg_temp.qid(50),pg_temp.qid(30),current_date-1);
INSERT INTO public.lms_qualification_evidence(id,enrolment_id,title,description,kind,body)
VALUES (pg_temp.qid(60),pg_temp.qid(51),'Different learner','', 'Other','Private draft');

-- Programme news is version-scoped. Review appointments are enrolment-scoped.
INSERT INTO public.lms_role_assignments(user_id,role) VALUES (pg_temp.qid(3),'admin');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
SELECT public.lms_qf_admin_create_programme_update(pg_temp.qid(70),pg_temp.qid(10),NULL,'news','Centre bulletin','Published announcement',NULL);
SELECT public.lms_qf_admin_create_programme_update(pg_temp.qid(70),pg_temp.qid(10),NULL,'news','Centre bulletin','Published announcement',NULL);
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_create_programme_update(pg_temp.qid(70),pg_temp.qid(10),NULL,'news','Other title','',NULL)$sql$,'conflicts');
SELECT public.lms_qf_admin_create_programme_update(pg_temp.qid(71),pg_temp.qid(10),pg_temp.qid(50),'review','Review appointment','Private discussion',now()+interval '1 day');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_admin_programme_updates(pg_temp.qid(10)))=2,'retry does not duplicate centre updates');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_resolve_programme_update(pg_temp.qid(10),pg_temp.qid(71),'completed')$sql$,'cannot be resolved');
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_programme_updates(pg_temp.qid(50)))=2,'learner sees own review and programme bulletin');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_programme_updates(pg_temp.qid(10))$sql$,'access denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_create_programme_update(pg_temp.qid(72),pg_temp.qid(10),NULL,'news','Unauthorized','',NULL)$sql$,'access denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_admin_resolve_programme_update(pg_temp.qid(10),pg_temp.qid(71),'cancelled')$sql$,'access denied');
SELECT pg_temp.denied('SELECT * FROM public.lms_qf_programme_updates', 'permission denied');
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_programme_updates(pg_temp.qid(51)))=1,'other learner sees bulletin only');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_programme_updates(pg_temp.qid(50))$sql$,'access denied');
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
SELECT public.lms_qf_admin_resolve_programme_update(pg_temp.qid(10),pg_temp.qid(71),'cancelled');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_programme_updates(pg_temp.qid(50)))=1,'withdrawn review disappears');
RESET ROLE;
DELETE FROM public.lms_role_assignments WHERE user_id=pg_temp.qid(3) AND role='admin';

SET LOCAL ROLE anon;
SELECT pg_temp.denied('SELECT public.lms_qf_list()', 'permission denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_programme_updates(pg_temp.qid(50))$sql$,'permission denied');
SELECT pg_temp.expect((SELECT count(*) FROM storage.objects WHERE bucket_id='technica-qualification-evidence')=0,'anonymous Storage read denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_list())=1,'learner sees their own registration');
SELECT pg_temp.expect((public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,overdue}')::boolean,'due outcome is overdue');
SELECT pg_temp.denied('SELECT public.lms_qf_portfolio(pg_temp.qid(51))',' access denied');
SELECT pg_temp.denied('SELECT * FROM public.lms_qualification_submissions','permission denied');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,'{}',true)$sql$, 'Accept the declaration');
SELECT public.lms_qf_declare(pg_temp.qid(50));
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,'{}',true)$sql$, 'every criterion');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,jsonb_build_object(pg_temp.qid(41)::text,'[]'::jsonb),false)$sql$, 'Invalid assessment criterion');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,jsonb_build_object(pg_temp.qid(40)::text,jsonb_build_array(pg_temp.qid(60))),false)$sql$, 'Evidence is unavailable');
SELECT set_config('test.qf_written',(public.lms_qf_add_evidence(pg_temp.qid(50),'Text evidence','','Other','First evidence',NULL,NULL,NULL,pg_temp.qid(61))->>'id'),true);
SELECT pg_temp.expect(public.lms_qf_add_evidence(pg_temp.qid(50),'Text evidence','','Other','First evidence',NULL,NULL,NULL,pg_temp.qid(61))->>'id'=current_setting('test.qf_written'),'retry returns same evidence id');
SELECT set_config('test.qf_file',public.lms_qf_add_evidence(pg_temp.qid(50),'Evidence PDF','','Workplace evidence',NULL,'proof.pdf','application/pdf',20)::text,true);
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_portfolio(pg_temp.qid(50))->'evidence')=1,'pending file is hidden until uploaded');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,jsonb_build_object(pg_temp.qid(40)::text,jsonb_build_array(current_setting('test.qf_file')::jsonb->>'id')),false)$sql$, 'Evidence is unavailable');
SELECT pg_temp.denied($sql$INSERT INTO storage.objects(bucket_id,name) VALUES ('technica-qualification-evidence','not-reserved')$sql$,'row-level security');
INSERT INTO storage.objects(bucket_id,name,metadata)
VALUES ('technica-qualification-evidence', current_setting('test.qf_file')::jsonb->>'path','{"size":20,"mimetype":"application/pdf"}');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_portfolio(pg_temp.qid(50))->'evidence')=2,'confirm upload through actual Storage row');
WITH deleted AS (DELETE FROM storage.objects WHERE bucket_id='technica-qualification-evidence' RETURNING 1)
 SELECT pg_temp.expect(count(*)=0,'authenticated users cannot delete evidence objects') FROM deleted;
WITH changed AS (UPDATE storage.objects SET metadata='{}' WHERE bucket_id='technica-qualification-evidence' RETURNING 1)
 SELECT pg_temp.expect(count(*)=0,'authenticated users cannot overwrite evidence objects') FROM changed;
SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),0,jsonb_build_object(pg_temp.qid(40)::text,jsonb_build_array(current_setting('test.qf_written'))),false);
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,claim,state}'='draft','draft persists');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),1,'assessor','return','fake verdict','{}')$sql$, 'review access denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>'{units,0,outcomes,0,claim}'='null'::jsonb,'assessor cannot see draft');
SELECT pg_temp.expect((SELECT count(*) FROM storage.objects WHERE bucket_id='technica-qualification-evidence')=0,'assessor cannot read unsubmitted upload');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),1,jsonb_build_object(pg_temp.qid(40)::text,jsonb_build_array(current_setting('test.qf_written'),current_setting('test.qf_file')::jsonb->>'id')),true);
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),1,'{}',false)$sql$, 'changed');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),2,'{}',false)$sql$, 'already in review');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_portfolio(pg_temp.qid(50))#>'{units,0,outcomes,0,submissions}')=0,'verifier cannot see an unassessed submission');
SELECT pg_temp.expect((SELECT count(*) FROM storage.objects WHERE bucket_id='technica-qualification-evidence')=0,'verifier cannot read unassessed upload');
SELECT pg_temp.denied('SELECT public.lms_qf_finalize(pg_temp.qid(50))', 'Verify all required outcomes');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_finalize(pg_temp.qid(50),'QF-100')$sql$, 'completed qualification');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect((SELECT count(*) FROM storage.objects WHERE bucket_id='technica-qualification-evidence')=1,'assigned assessor can read submitted upload');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),2,'assessor','accept','','{}')$sql$, 'every criterion');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),2,'assessor','return','','{}')$sql$, 'feedback');
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),2,'assessor','return','Add a stronger example.',jsonb_build_object(pg_temp.qid(40)::text,'partial'));
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,submissions,0,reviews,0,feedback}'='Add a stronger example.','return feedback is visible');
SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),3,jsonb_build_object(pg_temp.qid(40)::text,jsonb_build_array(current_setting('test.qf_written'))),true);
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,submissions,0,revision}'='2','resubmission creates revision 2');
SELECT pg_temp.expect(jsonb_array_length(public.lms_qf_portfolio(pg_temp.qid(50))#>'{units,0,outcomes,0,submissions,1,snapshot,mapping}'->pg_temp.qid(40)::text)=2,'earlier snapshot preserves both original evidence links');
SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(31),0,jsonb_build_object(pg_temp.qid(41)::text,jsonb_build_array(current_setting('test.qf_written'))),true);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),4,'assessor','accept','',jsonb_build_object(pg_temp.qid(40)::text,'met'));
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(31),1,'assessor','accept','',jsonb_build_object(pg_temp.qid(41)::text,'met'));
SELECT pg_temp.denied('SELECT public.lms_qf_finalize(pg_temp.qid(50))','finalization access denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,submissions,0,reviews,0,stage}'='assessor','verifier sees assessor decision on revision 2');
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),5,'verifier','return','Review the evidence rationale.', '{}');
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(31),2,'verifier','accept','', '{}');
SELECT pg_temp.denied('SELECT public.lms_qf_finalize(pg_temp.qid(50))','Verify all required outcomes');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))#>>'{units,0,outcomes,0,submissions,0,reviews,1,feedback}'='Review the evidence rationale.','IQA return reaches assessor');
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),6,'assessor','accept','Reviewed rationale.',jsonb_build_object(pg_temp.qid(40)::text,'met'));
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
SELECT public.lms_qf_review(pg_temp.qid(50),pg_temp.qid(30),7,'verifier','accept','','{}');
SELECT public.lms_qf_finalize(pg_temp.qid(50));
SELECT public.lms_qf_finalize(pg_temp.qid(50),'QF-100');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_finalize(pg_temp.qid(50),'QF-999')$sql$, 'valid issued certificate');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(public.lms_qf_portfolio(pg_temp.qid(50))->>'certificate'='QF-100','learner sees recorded certificate');
SELECT pg_temp.expect(NOT (public.lms_qf_portfolio(pg_temp.qid(50))->>'canEdit')::boolean,'completed portfolio is read-only');
SELECT pg_temp.denied($sql$SELECT public.lms_qf_save_claim(pg_temp.qid(50),pg_temp.qid(30),8,'{}',false)$sql$,'read-only');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect((SELECT count(*) FROM storage.objects WHERE bucket_id='technica-qualification-evidence')=0,'other learner cannot read file even with broad policy');
SELECT pg_temp.denied('SELECT public.lms_qf_portfolio(pg_temp.qid(50))',' access denied');
RESET ROLE;
UPDATE public.lms_qualification_enrolments SET assessor_id=pg_temp.qid(5) WHERE id=pg_temp.qid(51);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(public.lms_qf_list()='[]'::jsonb,'suspended reviewer cannot see the queue');
SELECT pg_temp.denied('SELECT public.lms_qf_portfolio(pg_temp.qid(51))',' access denied');
RESET ROLE;

ROLLBACK;
