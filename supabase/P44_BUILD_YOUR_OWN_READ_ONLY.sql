-- P44 READ-ONLY preflight, exact Technica Supabase project only.
-- Inspect remote migration ledger and backup separately. No table writes.
SELECT
 to_regprocedure('public.lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)') IS NOT NULL AS p4_installed,
 to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NOT NULL AS p5_installed,
 to_regprocedure('public.lms_p29_mock_candidate_ids(uuid)') IS NOT NULL AS p29_installed,
 to_regprocedure('public.lms_p44_start_custom(uuid,integer,uuid,integer,integer,text,text,boolean,uuid)') IS NOT NULL AS p44_installed,
 to_regclass('public.lms_p44_custom_config') IS NOT NULL AS p44_table_installed;
SELECT c.id,c.title,c.slug,c.publication_state,
 COUNT(q.id) FILTER(WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate) AS eligible_mixed,
 COUNT(q.id) FILTER(WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate AND q.difficulty='low') AS eligible_easy,
 COUNT(q.id) FILTER(WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate AND q.difficulty='medium') AS eligible_medium,
 COUNT(q.id) FILTER(WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate AND q.difficulty='high') AS eligible_hard
FROM public.lms_courses c LEFT JOIN public.lms_questions q ON q.course_id=c.id
GROUP BY c.id,c.title,c.slug,c.publication_state ORDER BY c.title;
-- Adaptive N requires at least N in each of Easy/Medium/Hard. Mixed N requires N
-- in the mixed pool. No Draft or Mock candidate can ever be used.

-- P47 additional READ-ONLY diagnostics (no caller impersonation or table changes).
-- PGRST202 can mean an absent signature or a stale PostgREST schema cache.
SELECT p.oid::regprocedure::text AS function_signature,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute_granted
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('lms_p44_start_custom','lms_p44_answer','lms_p44_next')
ORDER BY function_signature;
-- Counts reveal why N=10/100 cannot begin; Mock-candidate and exclusive rows are never eligible.
SELECT c.id AS course_id,c.title,c.slug,c.publication_state,
 count(q.id) AS all_questions,
 count(q.id) FILTER(WHERE q.approval_state='draft') AS draft_questions,
 count(q.id) FILTER(WHERE q.mock_candidate IS TRUE) AS saved_mock_candidates,
 count(q.id) FILTER(WHERE q.mock_exclusive IS TRUE) AS reserved_mock_questions,
 count(q.id) FILTER(WHERE q.approval_state='approved' AND q.is_active IS TRUE
 AND q.mock_exclusive IS FALSE AND q.mock_candidate IS FALSE) AS approved_practice_questions
FROM public.lms_courses c LEFT JOIN public.lms_questions q ON q.course_id=c.id
GROUP BY c.id,c.title,c.slug,c.publication_state
ORDER BY approved_practice_questions DESC,c.title;
-- If P44 function exists and authenticated EXECUTE is granted but REST returns PGRST202,
-- ask an authorized DBA to refresh PostgREST schema cache; do NOT replay P44 migrations.
