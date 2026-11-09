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
