-- TECHNICA LMS: P1/P2 prerequisite + P4/P5 deployment footprint (READ ONLY).
-- Run in the intended dedicated Technica SUPABASE STAGING SQL Editor.
-- This file contains ONE SELECT, no writes, no migration, no question/answer text.
-- Run even when P4/P5 have not been installed: absent objects return MISSING.
-- A PASS here verifies catalog metadata, NOT actual JWT/API behavior or deployment.
-- Visually verify the Supabase project URL/ref BEFORE running this query.
WITH
required_tables(phase,object_name,private_p4) AS (
 VALUES
  ('P1','lms_profiles',false),
  ('P1','lms_courses',false),
  ('P1','lms_domains',false),
  ('P1','lms_entitlements',false),
  ('P1','lms_role_assignments',false),
  ('P2','lms_lesson_progress',false),
  ('P4','lms_questions',true),
  ('P4','lms_practice_attempts',true),
  ('P4','lms_practice_attempt_items',true)
),
table_inventory AS (
 SELECT t.phase,t.object_name,t.private_p4,c.oid,c.relrowsecurity,
   CASE WHEN c.oid IS NULL THEN NULL ELSE
    pg_catalog.has_table_privilege('anon',c.oid,
       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   END AS anon_has_direct_privilege,
   CASE WHEN c.oid IS NULL THEN NULL ELSE
    pg_catalog.has_table_privilege('authenticated',c.oid,
       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   END AS authenticated_has_direct_privilege
 FROM required_tables t
 LEFT JOIN pg_catalog.pg_class c
   ON c.oid=pg_catalog.to_regclass(pg_catalog.format('public.%I',t.object_name))
),
required_rpcs(phase,signature,auth_expected,definer_expected) AS (
 VALUES
  ('P4','lms_p4_can_practice(uuid)',true,true),
  ('P4','lms_p4_attempt_payload(uuid)',true,true),
  ('P4','lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)',true,true),
  ('P4','lms_p4_save_answer(uuid,uuid,integer)',true,true),
  ('P4','lms_p4_finish_practice(uuid)',true,true),
  ('P4','lms_p4_validate_question_scope()',false,false),
  ('P5','lms_p5_abandon_practice(uuid)',true,true)
),
rpc_inventory AS (
 SELECT r.phase,r.signature,r.auth_expected,r.definer_expected,
   p.oid,p.prosecdef,p.proconfig,
   CASE WHEN p.oid IS NULL THEN NULL ELSE
      pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
   END AS anon_execute,
   CASE WHEN p.oid IS NULL THEN NULL ELSE
      pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
   END AS auth_execute
 FROM required_rpcs r
 LEFT JOIN pg_catalog.pg_proc p
   ON p.oid=pg_catalog.to_regprocedure('public.'||r.signature)
),
required_indexes(phase,object_name) AS (
 VALUES
  ('P4','lms_p4_bank_eligible_idx'),
  ('P4','lms_p4_attempt_user_idx'),
  ('P4','lms_p4_attempt_items_q_idx')
),
p5_constraint AS (
 SELECT c.oid,pg_catalog.pg_get_constraintdef(c.oid) AS definition
 FROM pg_catalog.pg_constraint c
 WHERE c.conrelid=pg_catalog.to_regclass('public.lms_practice_attempts')
   AND c.conname='lms_practice_attempts_state_check'
),
p5_payload AS (
 SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.lms_p4_attempt_payload(uuid)')
 ) AS definition
),
checks AS (
 SELECT 'ENV'::text AS phase,'database_identity_manual_check'::text AS object_name,
  'REVIEW'::text AS status,
  'Database='||current_database()||
  '; verify this is the intended Technica STAGING project in the dashboard URL' AS details
 UNION ALL
 SELECT t.phase,'table:'||t.object_name,
  CASE WHEN t.oid IS NULL THEN 'MISSING'
    WHEN NOT t.relrowsecurity THEN 'FAIL'
    WHEN t.private_p4 AND
      (t.anon_has_direct_privilege OR t.authenticated_has_direct_privilege)
      THEN 'FAIL'
    ELSE 'PASS' END,
  CASE WHEN t.oid IS NULL THEN 'Table absent'
    WHEN NOT t.relrowsecurity THEN 'RLS disabled'
    WHEN t.private_p4 AND
      (t.anon_has_direct_privilege OR t.authenticated_has_direct_privilege)
      THEN 'P4 private table grants direct browser privileges'
    ELSE 'RLS enabled; P4 private tables are not directly accessible by anon/authenticated'
  END
 FROM table_inventory t
 UNION ALL
 SELECT r.phase,'rpc:'||r.signature,
  CASE WHEN r.oid IS NULL THEN 'MISSING'
    WHEN r.prosecdef IS DISTINCT FROM r.definer_expected THEN 'FAIL'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_catalog.unnest(COALESCE(r.proconfig,ARRAY[]::text[])) cfg(setting)
      WHERE cfg.setting LIKE 'search_path=%'
        AND pg_catalog.btrim(pg_catalog.split_part(cfg.setting,'=',2),'"')=''
    ) THEN 'FAIL'
    WHEN COALESCE(r.anon_execute,true) THEN 'FAIL'
    WHEN r.auth_execute IS DISTINCT FROM r.auth_expected THEN 'FAIL'
    ELSE 'PASS' END,
  CASE WHEN r.oid IS NULL THEN 'RPC absent'
    WHEN r.prosecdef IS DISTINCT FROM r.definer_expected THEN 'Unexpected SECURITY DEFINER setting'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_catalog.unnest(COALESCE(r.proconfig,ARRAY[]::text[])) cfg(setting)
      WHERE cfg.setting LIKE 'search_path=%'
        AND pg_catalog.btrim(pg_catalog.split_part(cfg.setting,'=',2),'"')=''
    )
      THEN 'Function must fix its search_path to empty'
    WHEN COALESCE(r.anon_execute,true) THEN 'Anonymous or PUBLIC EXECUTE privilege detected'
    WHEN r.auth_execute IS DISTINCT FROM r.auth_expected THEN 'Wrong authenticated EXECUTE grant'
    ELSE 'Expected function permissions, definer mode and search_path are present'
  END
 FROM rpc_inventory r
 UNION ALL
 SELECT i.phase,'index:'||i.object_name,
   CASE WHEN pg_catalog.to_regclass('public.'||i.object_name) IS NULL
     THEN 'MISSING' ELSE 'PASS' END,
   CASE WHEN pg_catalog.to_regclass('public.'||i.object_name) IS NULL
     THEN 'Expected P4 index absent' ELSE 'Expected P4 index exists' END
 FROM required_indexes i
 UNION ALL
 SELECT 'P4','trigger:lms_p4_question_scope',
   CASE WHEN t.oid IS NULL THEN 'MISSING'
     WHEN t.tgenabled NOT IN ('O','A') THEN 'FAIL'
     ELSE 'PASS' END,
   CASE WHEN t.oid IS NULL THEN 'Question-scope guard trigger absent'
     WHEN t.tgenabled NOT IN ('O','A') THEN 'Question-scope guard trigger disabled'
     ELSE 'Question-scope guard trigger enabled' END
 FROM (SELECT tr.oid,tr.tgenabled FROM pg_catalog.pg_trigger tr
       WHERE tr.tgrelid=pg_catalog.to_regclass('public.lms_questions')
         AND tr.tgname='lms_p4_question_scope' AND NOT tr.tgisinternal) t
 RIGHT JOIN (SELECT 1 AS one) one_row ON true
 UNION ALL
 SELECT 'P5','constraint:lms_practice_attempts_state_check',
  CASE WHEN c.oid IS NULL THEN 'MISSING'
   WHEN c.definition NOT LIKE '%abandoned%' THEN 'FAIL'
   ELSE 'PASS' END,
  CASE WHEN c.oid IS NULL THEN 'Attempt state constraint absent'
   WHEN c.definition NOT LIKE '%abandoned%' THEN 'P5 abandoned state missing'
   ELSE 'Constraint includes abandoned state' END
 FROM (SELECT 1) one_row LEFT JOIN p5_constraint c ON true
 UNION ALL
 SELECT 'P5','payload:abandoned_snapshot_redaction',
  CASE WHEN p.definition IS NULL THEN 'MISSING'
   WHEN pg_catalog.strpos(p.definition,'IF a.state=''abandoned'' THEN')=0 THEN 'FAIL'
   ELSE 'PASS' END,
  CASE WHEN p.definition IS NULL THEN 'Attempt payload RPC absent'
   WHEN pg_catalog.strpos(p.definition,'IF a.state=''abandoned'' THEN')=0
     THEN 'P5 redaction guard not found in function definition'
   ELSE 'P5 source guard is installed; functional JWT tests are STILL required' END
 FROM p5_payload p
)
SELECT phase,object_name,status,details FROM checks ORDER BY
 CASE phase WHEN 'ENV' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P4' THEN 3 ELSE 4 END,
 object_name;
