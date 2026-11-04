-- Technica LMS P11: learner-owned, read-only Progress & Analytics.
-- SOURCE ONLY / owner-approved staging after P1, P2, P4, P10.
-- No real user/course/question mutation, no cross-user analytics, no fake metrics.
-- Exam accuracy is answer-level; exam score is correct / assigned question count.
-- Topic progress is verified P2 lesson completion ONLY; there is no topic_id
-- column on P4/P10 question snapshots, so do NOT invent topic answer accuracy.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_lesson_progress') IS NULL
 OR to_regclass('public.lms_practice_attempts') IS NULL
 OR to_regclass('public.lms_practice_attempt_items') IS NULL
 OR to_regclass('public.lms_p10_mock_attempts') IS NULL
 OR to_regclass('public.lms_p10_mock_answers') IS NULL
 OR to_regclass('public.lms_p6_question_reviews') IS NULL
 OR to_regprocedure('public.lms_p1_can_view_structure(uuid)') IS NULL
 OR to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN RAISE EXCEPTION 'P11 requires P1/P2/P4/P6A/P10 in authorized Technica staging'; END IF;
 IF to_regprocedure('public.lms_p11_my_progress(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P11 already installed; do not overwrite or rerun'; END IF;
END $$;

-- STABLE read-only RPC: never accepts a caller-provided learner/user ID.
-- Explicitly rechecks the active Auth identity and authorized course scope.
-- SECURITY DEFINER needs strict course/user filters because table RLS is
-- intentionally private; the browser gets only aggregate metadata.
CREATE FUNCTION public.lms_p11_my_progress(p_course_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());
DECLARE v_admin boolean; v_title text; v_report jsonb;
BEGIN
 IF v_user IS NULL OR p_course_id IS NULL THEN
  RAISE EXCEPTION 'Signed-in learner and course required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_profiles p
   WHERE p.id=v_user AND p.account_status='active')
 THEN RAISE EXCEPTION 'Active LMS account required'; END IF;
 v_admin:=public.lms_p1_actor_is_admin();
 IF NOT public.lms_p1_can_view_structure(p_course_id)
 THEN RAISE EXCEPTION 'Course analytics not authorized'; END IF;
 SELECT c.title INTO v_title FROM public.lms_courses c
 WHERE c.id=p_course_id AND (v_admin OR c.publication_state='published');
 IF v_title IS NULL THEN RAISE EXCEPTION 'Course not accessible'; END IF;

 WITH
 visible_domains AS (
  SELECT d.id,d.title,d.position FROM public.lms_domains d
  WHERE d.course_id=p_course_id
 ),
 visible_topics AS (
  SELECT t.id,t.domain_id,t.title,t.position
  FROM public.lms_topics t JOIN visible_domains d ON d.id=t.domain_id
 ),
 visible_lessons AS (
  SELECT l.id,l.topic_id,
    p.lesson_completed_at,p.reading_completed,p.video_completed,
    p.quiz_passed,p.quiz_best_percent
  FROM public.lms_lessons l
  JOIN visible_topics t ON t.id=l.topic_id
  LEFT JOIN public.lms_lesson_progress p
    ON p.lesson_id=l.id AND p.user_id=v_user
  WHERE v_admin OR l.publication_state='published'
 ),
 lesson_totals AS (
  SELECT count(*)::integer AS total_lessons,
    count(lesson_completed_at)::integer AS completed_lessons,
    count(*) FILTER(WHERE reading_completed IS TRUE)::integer AS reading_completed,
    count(*) FILTER(WHERE video_completed IS TRUE)::integer AS video_completed,
    count(*) FILTER(WHERE quiz_passed IS TRUE)::integer AS quiz_passed
  FROM visible_lessons
 ),
 topic_rollup AS (
  SELECT t.id,t.domain_id,t.title,t.position,
   count(l.id)::integer AS total_lessons,
   count(l.lesson_completed_at)::integer AS completed_lessons,
   count(*) FILTER(WHERE l.quiz_passed IS TRUE)::integer AS quizzes_passed
  FROM visible_topics t LEFT JOIN visible_lessons l ON l.topic_id=t.id
  GROUP BY t.id,t.domain_id,t.title,t.position
 ),
 domain_lesson_rollup AS (
  SELECT d.id AS domain_id,
   coalesce(sum(t.total_lessons),0)::integer AS total_lessons,
   coalesce(sum(t.completed_lessons),0)::integer AS completed_lessons,
   count(t.id)::integer AS topic_count
  FROM visible_domains d LEFT JOIN topic_rollup t ON t.domain_id=d.id
  GROUP BY d.id
 ),
 practice_attempts AS (
  SELECT a.id,a.mode,a.question_count,a.correct_count,a.score_percent,
    a.started_at,a.submitted_at,a.state
  FROM public.lms_practice_attempts a
  WHERE a.user_id=v_user AND a.course_id=p_course_id
    AND a.state IN ('submitted','expired')
    AND a.correct_count IS NOT NULL AND a.score_percent IS NOT NULL
 ),
 mock_attempts AS (
  SELECT a.id,a.question_count,a.correct_count,a.score_percent,
    a.started_at,a.submitted_at,a.state
  FROM public.lms_p10_mock_attempts a
  WHERE a.user_id=v_user AND a.course_id=p_course_id
    AND a.state IN ('submitted','expired')
    AND a.correct_count IS NOT NULL AND a.score_percent IS NOT NULL
 ),
 -- Exact source frozen-answer snapshots; only correctness indicator is
 -- accessed INSIDE the RPC. No answer index, prompt or question ID returned.
 practice_answer_stats AS (
  SELECT count(*) FILTER(WHERE i.selected_index IS NOT NULL)::integer AS answered,
    count(*) FILTER(WHERE i.selected_index=i.correct_index_snapshot)::integer AS correct
  FROM public.lms_practice_attempt_items i
  JOIN practice_attempts a ON a.id=i.attempt_id
 ),
 mock_answer_stats AS (
  SELECT count(*) FILTER(WHERE i.selected_index IS NOT NULL)::integer AS answered,
    count(*) FILTER(WHERE i.selected_index=i.correct_index_snapshot)::integer AS correct
  FROM public.lms_p10_mock_answers i
  JOIN mock_attempts a ON a.id=i.attempt_id
 ),
 practice_summary AS (
  SELECT count(*)::integer AS attempts,
   coalesce(sum(question_count),0)::integer AS assigned,
   coalesce(sum(correct_count),0)::integer AS correct,
   count(*) FILTER(WHERE mode='levelup')::integer AS levelup_attempts,
   max(submitted_at) AS last_finished_at
  FROM practice_attempts
 ),
 mock_summary AS (
  SELECT count(*)::integer AS attempts,
   coalesce(sum(question_count),0)::integer AS assigned,
   coalesce(sum(correct_count),0)::integer AS correct,
   max(submitted_at) AS last_finished_at
  FROM mock_attempts
 ),
 domain_answers AS (
  SELECT coalesce(q.domain_id,r.reviewed_domain_id) AS domain_id,
    i.selected_index,i.correct_index_snapshot,'practice'::text AS source_kind
  FROM public.lms_practice_attempt_items i
  JOIN practice_attempts a ON a.id=i.attempt_id
  JOIN public.lms_questions q ON q.id=i.question_id AND q.course_id=p_course_id
  LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
  UNION ALL
  SELECT coalesce(q.domain_id,r.reviewed_domain_id) AS domain_id,
    i.selected_index,i.correct_index_snapshot,'mock'::text AS source_kind
  FROM public.lms_p10_mock_answers i
  JOIN mock_attempts a ON a.id=i.attempt_id
  JOIN public.lms_questions q ON q.id=i.question_id AND q.course_id=p_course_id
  LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
 ),
 domain_answers_rollup AS (
  SELECT d.id AS domain_id,
   count(a.domain_id) FILTER(WHERE a.selected_index IS NOT NULL)::integer AS answered,
   count(a.domain_id) FILTER(WHERE a.selected_index=a.correct_index_snapshot)::integer AS correct,
   count(a.domain_id) FILTER(WHERE a.source_kind='practice'
      AND a.selected_index IS NOT NULL)::integer AS practice_answered,
   count(a.domain_id) FILTER(WHERE a.source_kind='mock'
      AND a.selected_index IS NOT NULL)::integer AS mock_answered
  FROM visible_domains d LEFT JOIN domain_answers a ON a.domain_id=d.id
  GROUP BY d.id
 ),
 recent_completed AS (
  SELECT id,mode,question_count,correct_count,score_percent,state,started_at,submitted_at
  FROM practice_attempts
  UNION ALL
  SELECT id,'asp_mock_200'::text AS mode,question_count,correct_count,
    score_percent,state,started_at,submitted_at
  FROM mock_attempts
 )
 SELECT jsonb_build_object(
  'version','p11-v1',
  'courseId',p_course_id,'courseTitle',v_title,
  'generatedAt',clock_timestamp(),
  'learning',(SELECT jsonb_build_object(
    'totalLessons',total_lessons,'completedLessons',completed_lessons,
    'readingCompleted',reading_completed,'videoCompleted',video_completed,
    'quizzesPassed',quiz_passed,
    'completionPercent',CASE WHEN total_lessons=0 THEN NULL
     ELSE round(completed_lessons*100.0/total_lessons,2) END
   ) FROM lesson_totals),
  'practice',(SELECT jsonb_build_object(
    'attempts',a.attempts,'assignedQuestions',a.assigned,
    'answeredQuestions',b.answered,'correctAnswers',b.correct,
    'levelUpAttempts',a.levelup_attempts,
    'answerAccuracyPercent',CASE WHEN b.answered=0 THEN NULL
      ELSE round(b.correct*100.0/b.answered,2) END,
    'scoredPercent',CASE WHEN a.assigned=0 THEN NULL
      ELSE round(a.correct*100.0/a.assigned,2) END,
    'lastFinishedAt',a.last_finished_at
   ) FROM practice_summary a CROSS JOIN practice_answer_stats b),
  'mock',(SELECT jsonb_build_object(
    'attempts',a.attempts,'assignedQuestions',a.assigned,
    'answeredQuestions',b.answered,'correctAnswers',b.correct,
    'answerAccuracyPercent',CASE WHEN b.answered=0 THEN NULL
      ELSE round(b.correct*100.0/b.answered,2) END,
    'scoredPercent',CASE WHEN a.assigned=0 THEN NULL
      ELSE round(a.correct*100.0/a.assigned,2) END,
    'lastFinishedAt',a.last_finished_at
   ) FROM mock_summary a CROSS JOIN mock_answer_stats b),
  'domains',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'title',d.title,'position',d.position,
    'topicCount',dl.topic_count,
    'totalLessons',dl.total_lessons,'completedLessons',dl.completed_lessons,
    'completionPercent',CASE WHEN dl.total_lessons=0 THEN NULL
      ELSE round(dl.completed_lessons*100.0/dl.total_lessons,2) END,
    'answeredQuestions',da.answered,'correctAnswers',da.correct,
    'practiceAnswered',da.practice_answered,'mockAnswered',da.mock_answered,
    'answerAccuracyPercent',CASE WHEN da.answered=0 THEN NULL
      ELSE round(da.correct*100.0/da.answered,2) END,
    'topics',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',t.id,'title',t.title,'position',t.position,
      'totalLessons',t.total_lessons,'completedLessons',t.completed_lessons,
      'quizzesPassed',t.quizzes_passed,
      'completionPercent',CASE WHEN t.total_lessons=0 THEN NULL
        ELSE round(t.completed_lessons*100.0/t.total_lessons,2) END,
      'questionAccuracyPercent',NULL
     ) ORDER BY t.position,t.title),'[]'::jsonb)
     FROM topic_rollup t WHERE t.domain_id=d.id)
    ) ORDER BY d.position,d.title),'[]'::jsonb)
    FROM visible_domains d
    JOIN domain_lesson_rollup dl ON dl.domain_id=d.id
    JOIN domain_answers_rollup da ON da.domain_id=d.id),
  'recentAttempts',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'mode',x.mode,'state',x.state,'questionCount',x.question_count,
    'correctCount',x.correct_count,'scorePercent',x.score_percent,
    'startedAt',x.started_at,'submittedAt',x.submitted_at
   ) ORDER BY x.started_at DESC),'[]'::jsonb)
   FROM (SELECT mode,state,question_count,correct_count,score_percent,
     started_at,submitted_at FROM recent_completed
     ORDER BY started_at DESC LIMIT 10) x)
 ) INTO v_report;
 RETURN v_report;
END; $$;

REVOKE ALL ON FUNCTION public.lms_p11_my_progress(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p11_my_progress(uuid) TO authenticated,service_role;
COMMIT;
