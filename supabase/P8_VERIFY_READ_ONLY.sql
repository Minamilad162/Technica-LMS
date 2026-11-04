-- Technica LMS P8 post-migration verification — STRICTLY READ-ONLY
-- Run in the confirmed dedicated Technica Supabase project's SQL Editor.
-- No CREATE/ALTER/UPDATE/INSERT/DELETE, no passwords, emails, answer keys,
-- question text or sample users. Does not assign roles or publish questions.
-- Result sets: RPC contract, private RLS table, course bank readiness, domain
-- readiness and review backlog. SQL Editor execution is privileged: keep the
-- report inside the owner/admin workflow. A PASS here is NOT a real JWT test.

-- 1. The expected P8 API surface must exist with SECURITY DEFINER and strict
-- anonymous denial; checkpoint helper must remain private to service_role.
WITH required(function_signature,exposure) AS (
 VALUES
  ('lms_p8_checkpoint(integer)','internal'),
  ('lms_p8_levelup_readiness(uuid,integer,uuid)','authenticated'),
  ('lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)','authenticated'),
  ('lms_p8_answer_levelup(uuid,uuid,integer)','authenticated'),
  ('lms_p4_save_answer(uuid,uuid,integer)','authenticated'),
  ('lms_p4_finish_practice(uuid)','authenticated'),
  ('lms_p5_abandon_practice(uuid)','authenticated')
), looked AS (
 SELECT r.*,to_regprocedure('public.'||r.function_signature) AS oid
 FROM required r
)
SELECT 'P8_RPC' AS section,function_signature AS item,
 CASE
  WHEN oid IS NULL THEN 'MISSING'
  WHEN pg_catalog.has_function_privilege('anon',oid,'EXECUTE') THEN 'FAIL_ANON_EXECUTE'
  WHEN exposure='internal' AND pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE') THEN 'FAIL_INTERNAL_EXPOSED'
  WHEN exposure='authenticated' AND NOT pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE') THEN 'FAIL_AUTH_GRANT'
  WHEN exposure='authenticated' AND NOT (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=looked.oid) THEN 'FAIL_NOT_SECURITY_DEFINER'
  ELSE 'PASS'
 END AS status
FROM looked
ORDER BY function_signature;

-- 2. Adaptive state must not be directly exposed to a browser JWT.
WITH state_table AS (
 SELECT to_regclass('public.lms_practice_adaptive_state') AS oid
)
SELECT 'P8_PRIVATE_TABLE' AS section,
 'lms_practice_adaptive_state' AS item,
 CASE
  WHEN oid IS NULL THEN 'MISSING'
  WHEN NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid=state_table.oid) THEN 'FAIL_RLS_OFF'
  WHEN pg_catalog.has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
    OR pg_catalog.has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE')
    THEN 'FAIL_BROWSER_GRANT'
  ELSE 'PASS'
 END AS status
FROM state_table;

-- 3. Real course-level eligible pool. The current P8 readiness gate requires
-- N *approved*, non-mock-exclusive questions in EACH difficulty tier.
WITH pool AS (
 SELECT c.id AS course_id,c.slug AS course_slug,c.title AS course_name,
  c.publication_state,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='low')::integer AS low,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='medium')::integer AS medium,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='high')::integer AS high,
  count(q.id) FILTER(WHERE q.approval_state='draft')::integer AS draft_count,
  count(q.id) FILTER(WHERE q.difficulty='unclassified')::integer AS unclassified_count,
  count(q.id) FILTER(WHERE q.mock_exclusive)::integer AS mock_reserved_count
 FROM public.lms_courses c
 LEFT JOIN public.lms_questions q ON q.course_id=c.id
 GROUP BY c.id,c.slug,c.title,c.publication_state
)
SELECT 'P8_COURSE_READINESS' AS section,course_slug,course_name,publication_state,
 low,medium,high,
 least(50,low,medium,high) AS safe_max_question_count,
 (low>=10 AND medium>=10 AND high>=10) AS ready_10,
 (low>=25 AND medium>=25 AND high>=25) AS ready_25,
 (low>=50 AND medium>=50 AND high>=50) AS ready_50,
 draft_count,unclassified_count,mock_reserved_count
FROM pool
ORDER BY course_slug;

-- 4. Same counts per domain. An optional domain filter needs a FULL tier pool
-- in that domain; total course readiness does not guarantee domain readiness.
WITH pool AS (
 SELECT c.slug AS course_slug,d.slug AS domain_slug,d.title AS domain_title,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='low')::integer AS low,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='medium')::integer AS medium,
  count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive AND q.difficulty='high')::integer AS high
 FROM public.lms_domains d
 JOIN public.lms_courses c ON c.id=d.course_id
 LEFT JOIN public.lms_questions q ON q.domain_id=d.id AND q.course_id=c.id
 GROUP BY c.slug,d.id,d.slug,d.title
)
SELECT 'P8_DOMAIN_READINESS' AS section,course_slug,domain_slug,domain_title,
 low,medium,high,least(50,low,medium,high) AS safe_max_question_count,
 (low>=10 AND medium>=10 AND high>=10) AS ready_10,
 (low>=25 AND medium>=25 AND high>=25) AS ready_25,
 (low>=50 AND medium>=50 AND high>=50) AS ready_50
FROM pool ORDER BY course_slug,domain_slug;
