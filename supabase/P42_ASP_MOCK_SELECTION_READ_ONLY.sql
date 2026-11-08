-- P42 ASP MOCK DIAGNOSIS -- READ ONLY (Technica LMS project only).
-- Run after identifying the exact project, DB and verified migration ledger.
-- No update, publication, grant, question reservation, or content exposure.
SELECT c.id AS course_id,c.title,c.slug,c.publication_state,
 count(q.id) FILTER(WHERE q.mock_candidate IS TRUE AND q.is_active IS TRUE
   AND q.approval_state='draft' AND q.mock_exclusive IS FALSE) AS saved_mock_candidates,
 count(q.id) FILTER(WHERE q.mock_exclusive IS TRUE) AS officially_exclusive_questions
FROM public.lms_courses c
LEFT JOIN public.lms_questions q ON q.course_id=c.id
GROUP BY c.id,c.title,c.slug,c.publication_state
ORDER BY saved_mock_candidates DESC,c.title;
SELECT c.id AS course_id,c.title,c.slug,c.publication_state,
 f.id AS reserved_form_id,f.question_count,
 (SELECT count(*) FROM public.lms_p9b_mock_items i WHERE i.form_id=f.id) AS form_item_count
FROM public.lms_courses c
LEFT JOIN public.lms_p9b_mock_forms f ON f.course_id=c.id
WHERE lower(c.title) LIKE '%safety professional%' OR lower(c.title) LIKE 'asp%'
 OR c.slug='asp'
ORDER BY c.created_at;
-- Source of truth: a saved mock_candidate is NOT a P9B immutable reserved question.
-- Exactly 200 verified eligible candidates, ASP course slug 'asp', Admin confirmation,
-- official 9 ASP11 domains and a published Course are prerequisites for learner Mock.
