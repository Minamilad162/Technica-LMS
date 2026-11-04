-- Technica P8d — SELECT-ONLY live migration/Bank verification.
-- Run in the CONFIRMED TECHNICA project SQL Editor ONLY after the owner
-- separately authorizes/installs 202611040003_p8d_adaptive_thirds.sql.
-- Never reveals questions, answers, users, tokens, private attempt records.
-- This file has NO DDL, DML, GRANT or permission-changing statements.

-- 1. Correct balanced third thresholds for requested number of questions.
-- A passing 30-question result MUST show 10 LOW / 10 MEDIUM / 10 HIGH.
WITH expected(n,low_gate,medium_gate,ideal_high) AS (
 VALUES (3,1,1,1),(10,3,3,4),(25,8,8,9),(30,10,10,10),(50,16,17,17)
),actual AS (
 SELECT n,low_gate,medium_gate,ideal_high,
    public.lms_p8_checkpoint(n) AS low_actual,
    public.lms_p8_medium_checkpoint(n) AS medium_actual
 FROM expected
)
SELECT 'P8D_POLICY' AS section,n AS requested_questions,
 low_actual AS low_minimum,medium_actual AS medium_minimum,
 n-low_actual-medium_actual AS ideal_high_questions,
 CASE WHEN low_actual=low_gate AND medium_actual=medium_gate
   AND n-low_actual-medium_actual=ideal_high
 THEN 'PASS' ELSE 'FAIL' END AS status
FROM actual ORDER BY n;

-- 2. New column NULL preserves the existing P8 in-flight stage checkpoint.
SELECT 'P8D_STATE_COLUMN' AS section,
 'lms_practice_adaptive_state.medium_checkpoint_size' AS item,
 CASE WHEN EXISTS (
 SELECT 1 FROM pg_catalog.pg_attribute a
 JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='lms_practice_adaptive_state'
 AND a.attname='medium_checkpoint_size'
 AND NOT a.attisdropped AND NOT a.attnotnull
 ) THEN 'PASS' ELSE 'FAIL' END AS status;

-- 3. The new checkpoint helper is not executable directly from the browser.
SELECT 'P8D_HELPER_PERMISSIONS' AS section,
 'lms_p8_medium_checkpoint(integer)' AS item,
 CASE
 WHEN to_regprocedure('public.lms_p8_medium_checkpoint(integer)') IS NULL THEN 'MISSING'
 WHEN pg_catalog.has_function_privilege('anon',
    to_regprocedure('public.lms_p8_medium_checkpoint(integer)'),'EXECUTE')
   OR pg_catalog.has_function_privilege('authenticated',
    to_regprocedure('public.lms_p8_medium_checkpoint(integer)'),'EXECUTE')
 THEN 'FAIL_BROWSER_GRANT'
 ELSE 'PASS' END AS status;

-- 4. Source of truth: real approved non-Mock pools for 30-question Practice.
-- Having only 10 of each tier is NOT enough for a failing learner who may
-- need >10 LOW questions; starting N30 conservatively requires >=30 PER tier.
SELECT 'P8D_BANK_30' AS section,c.slug AS course_slug,
 count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
   AND q.difficulty='low')::integer AS eligible_low,
 count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
   AND q.difficulty='medium')::integer AS eligible_medium,
 count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
   AND q.difficulty='high')::integer AS eligible_high,
 CASE WHEN count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
     AND q.difficulty='low')>=30
   AND count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
     AND q.difficulty='medium')>=30
   AND count(q.id) FILTER(WHERE q.approval_state='approved' AND NOT q.mock_exclusive
     AND q.difficulty='high')>=30
 THEN 'READY_30' ELSE 'NOT_READY_30' END AS status
FROM public.lms_courses c LEFT JOIN public.lms_questions q ON q.course_id=c.id
WHERE c.slug='asp' GROUP BY c.slug;
