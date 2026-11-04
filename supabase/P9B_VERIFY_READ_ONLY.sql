-- P9B ASP Mock/Practice governance: SELECT-ONLY Supabase verification.
-- Run ONLY after explicitly owner-approved P9B migration in a confirmed
-- Technica STAGING environment. No question text, answers, IDs, learner data.
-- All statements are READ ONLY. Does not reserve or approve any question.

-- Private RLS + browser ACL
SELECT 'P9B_PRIVATE_ACL' AS section, t.relname AS object,
 CASE WHEN t.relrowsecurity
  AND NOT pg_catalog.has_table_privilege('anon',t.oid,'SELECT')
  AND NOT pg_catalog.has_table_privilege('authenticated',t.oid,'SELECT')
  AND NOT pg_catalog.has_table_privilege('authenticated',t.oid,'INSERT')
  AND NOT pg_catalog.has_table_privilege('authenticated',t.oid,'UPDATE')
 THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_catalog.pg_class t
JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public'
 AND t.relname IN ('lms_p9b_mock_forms','lms_p9b_mock_items')
ORDER BY t.relname;

-- Exact callable RPC footprints; anonymous has NO execute permission.
WITH required(name) AS (VALUES
 ('lms_p9b_mock_preflight(uuid,uuid[])'),
 ('lms_p9b_reserve_mock(uuid,uuid[],text)'),
 ('lms_p9b_approve_practice_question(uuid,text)')
)
SELECT 'P9B_ADMIN_RPC' AS section,name AS object,
 CASE WHEN to_regprocedure('public.'||name) IS NULL THEN 'MISSING'
 WHEN pg_catalog.has_function_privilege('anon',
       to_regprocedure('public.'||name),'EXECUTE')
 THEN 'FAIL_ANON_EXECUTE'
 WHEN NOT pg_catalog.has_function_privilege('authenticated',
       to_regprocedure('public.'||name),'EXECUTE')
 THEN 'FAIL_MISSING_AUTH_EXECUTE'
 ELSE 'PASS' END AS status FROM required ORDER BY name;

-- Real Mock reservation count. READY_FORM means ONLY reserved IDs, not a
-- working 200-question / 300-minute Mock exam engine.
SELECT 'P9B_FORM_INVENTORY' AS section,
 c.slug AS course,
 count(DISTINCT f.id)::integer AS form_count,
 count(i.question_id)::integer AS reserved_ids,
 count(i.question_id) FILTER(WHERE q.mock_exclusive
   AND q.approval_state='draft')::integer AS excluded_draft_ids,
 CASE WHEN count(DISTINCT f.id)=0 AND count(i.question_id)=0
 THEN 'NOT_RESERVED'
 WHEN count(DISTINCT f.id)=1 AND count(i.question_id)=200
   AND count(i.question_id) FILTER(WHERE q.mock_exclusive
     AND q.approval_state='draft')=200
 THEN 'READY_FORM_ONLY'
 ELSE 'FAIL_INCOMPLETE' END AS status
FROM public.lms_courses c
LEFT JOIN public.lms_p9b_mock_forms f ON f.course_id=c.id
LEFT JOIN public.lms_p9b_mock_items i ON i.form_id=f.id
LEFT JOIN public.lms_questions q ON q.id=i.question_id
WHERE c.slug='asp' GROUP BY c.slug;

-- Real ASP Practice release footprint, without prompts or question IDs.
SELECT 'P9B_PRACTICE_INVENTORY' AS section,c.slug AS course,
 count(q.id) FILTER(WHERE q.approval_state='approved'
   AND NOT q.mock_exclusive AND q.difficulty='low')::integer AS approved_low,
 count(q.id) FILTER(WHERE q.approval_state='approved'
   AND NOT q.mock_exclusive AND q.difficulty='medium')::integer AS approved_medium,
 count(q.id) FILTER(WHERE q.approval_state='approved'
   AND NOT q.mock_exclusive AND q.difficulty='high')::integer AS approved_high,
 count(q.id) FILTER(WHERE q.mock_exclusive)::integer AS all_mock_flags
FROM public.lms_courses c LEFT JOIN public.lms_questions q ON q.course_id=c.id
WHERE c.slug='asp' GROUP BY c.slug;
