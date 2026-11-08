-- P32 READ-ONLY diagnosis. Intended for the exact Supabase project connected
-- to Technica LMS; no schema, records, approvals or visibility are modified.
-- Inspect the real Course -> Domain -> Topic -> Lesson IDs before attempting
-- any new question import, migration replay, or publication change.
SELECT
 c.id AS course_id,c.title AS course_title,c.slug AS course_slug,
 d.title AS domain_title,t.title AS topic_title,
 l.id AS lesson_id,l.title AS lesson_title,l.publication_state AS lesson_state,
 count(qz.id) AS saved_quiz_questions,
 count(qz.id) FILTER (WHERE qz.is_published) AS published_learner_questions,
 count(qz.id) FILTER (WHERE NOT qz.is_published) AS unpublished_quiz_questions,
 count(qz.id) FILTER (WHERE qz.bank_question_id IS NOT NULL) AS linked_bank_questions,
 count(qz.id) FILTER (WHERE qz.bank_question_id IS NOT NULL
   AND src.approval_state='draft') AS source_draft_questions,
 count(qz.id) FILTER (WHERE qz.bank_question_id IS NOT NULL
   AND src.approval_state='approved' AND NOT qz.is_published) AS approved_but_not_published,
 count(qz.id) FILTER (WHERE qz.bank_question_id IS NOT NULL
   AND (src.mock_exclusive OR src.mock_candidate OR NOT src.is_active)) AS inactive_or_mock_source
FROM public.lms_courses c
JOIN public.lms_domains d ON d.course_id=c.id
JOIN public.lms_topics t ON t.domain_id=d.id
JOIN public.lms_lessons l ON l.topic_id=t.id
LEFT JOIN public.lms_p22_lesson_quiz_questions qz ON qz.lesson_id=l.id
LEFT JOIN public.lms_questions src ON src.id=qz.bank_question_id
WHERE c.slug='asp' OR lower(c.title) LIKE '%asp%'
GROUP BY c.id,c.title,c.slug,d.id,d.title,t.id,t.title,l.id,l.title,l.publication_state
ORDER BY c.title,d.title,t.title,l.title,l.id
LIMIT 200;

-- Verify installed RPCs only. true does not prove data is published.
SELECT
 to_regprocedure('public.lms_p22_get_lesson_quiz(uuid)') IS NOT NULL AS p22_learner_quiz_installed,
 to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NOT NULL AS p28_lesson_attach_installed,
 to_regprocedure('public.lms_p29_set_question_flags(uuid,boolean,boolean)') IS NOT NULL AS p29_active_mock_installed,
 to_regprocedure('public.lms_p30_save_question_bank(uuid,jsonb)') IS NOT NULL AS p30_batch_save_installed;
