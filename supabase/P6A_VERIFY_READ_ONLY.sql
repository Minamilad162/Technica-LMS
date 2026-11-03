-- Technica LMS | P6A review connection FOOTPRINT (READ-ONLY / ZERO WRITES)
-- Designed for the dedicated Technica Supabase project, not CHEIRON.
-- Run in SQL Editor only after checking the correct project URL/ref.
-- Returns table/RLS/RPC metadata; no passwords, keys, emails, questions or answer text.
-- A PASS here cannot replace a real signed-in user/JWT check.
WITH required_tables(phase,name,private_review) AS (
 VALUES ('P1','lms_profiles',false),('P1','lms_role_assignments',false),
        ('P1','lms_courses',false),('P4','lms_questions',true),
        ('P6A','lms_p6_question_reviews',true)
),
tables AS (
 SELECT t.phase,t.name,t.private_review,c.oid,c.relrowsecurity
 FROM required_tables t
 LEFT JOIN pg_catalog.pg_class c
   ON c.oid=pg_catalog.to_regclass(pg_catalog.format('public.%I',t.name))
),
required_functions(name) AS (
 VALUES ('lms_p6_seed_asp11_domains(uuid)'),
        ('lms_p6_bank_summary(uuid)'),
        ('lms_p6_list_questions(uuid,text,integer,integer)'),
        ('lms_p6_review_question(uuid,uuid,text,boolean,boolean,text)')
),
funcs AS (
 SELECT name,pg_catalog.to_regprocedure('public.'||name) AS oid
 FROM required_functions
),
checks AS (
 SELECT phase,'table:'||name AS item,
  CASE WHEN oid IS NULL THEN 'MISSING'
   WHEN NOT relrowsecurity THEN 'FAIL'
   WHEN private_review AND (
      pg_catalog.has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
      OR pg_catalog.has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE')
   ) THEN 'FAIL'
   ELSE 'PASS' END AS status,
  CASE WHEN oid IS NULL THEN 'Required table is not installed'
   WHEN NOT relrowsecurity THEN 'Table RLS is off'
   WHEN private_review AND (
      pg_catalog.has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
      OR pg_catalog.has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE')
   ) THEN 'Private question or review table has browser direct privileges'
   ELSE 'Table installed with RLS; private tables have no direct browser grants' END AS detail
 FROM tables
 UNION ALL
 SELECT 'P6A','rpc:'||name,
  CASE WHEN oid IS NULL THEN 'MISSING'
   WHEN pg_catalog.has_function_privilege('anon',oid,'EXECUTE') THEN 'FAIL'
   WHEN NOT pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE') THEN 'FAIL'
   WHEN NOT (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=funcs.oid) THEN 'FAIL'
   ELSE 'PASS' END,
  CASE WHEN oid IS NULL THEN 'P6A migration missing or RPC not installed'
   WHEN pg_catalog.has_function_privilege('anon',oid,'EXECUTE') THEN 'RPC callable by anonymous visitors'
   WHEN NOT pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE') THEN 'Authenticated users lack RPC execute grant'
   WHEN NOT (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=funcs.oid) THEN 'Expected SECURITY DEFINER not enabled'
   ELSE 'RPC exists with expected grants; server validates active Admin JWT' END
 FROM funcs
)
SELECT phase,item,status,detail FROM checks ORDER BY phase,item;
