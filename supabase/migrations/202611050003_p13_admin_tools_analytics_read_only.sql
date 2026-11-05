-- P13 Technica Admin Tools — additive Admin-only read-only analytics.
-- SOURCE ONLY: do NOT run on Supabase Production without owner authorization.
-- Requires P1/P2/P4/P10; never reads question text, answer keys or raw media.
-- Paid entitlement is NOT a verified payment transaction. No ledger exists yet.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_profiles') IS NULL
 OR to_regclass('public.lms_entitlements') IS NULL
 OR to_regclass('public.lms_lesson_progress') IS NULL
 OR to_regclass('public.lms_questions') IS NULL
 OR to_regclass('public.lms_practice_attempts') IS NULL
 OR to_regclass('public.lms_p10_mock_attempts') IS NULL
 OR to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN RAISE EXCEPTION 'P13 requires P1, P2, P4, P10 on authorized staging'; END IF;
 IF to_regprocedure('public.lms_p13_admin_overview()') IS NOT NULL
 OR to_regprocedure('public.lms_p13_admin_users(text,integer,integer)') IS NOT NULL
 OR to_regprocedure('public.lms_p13_admin_user_detail(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P13 already installed; no overwrite'; END IF;
END $$;

CREATE FUNCTION public.lms_p13_admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_out jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active real LMS Admin role required'; END IF;
 WITH months AS (
  SELECT generate_series(date_trunc('month',clock_timestamp())-interval '5 months',
   date_trunc('month',clock_timestamp()),interval '1 month')::date AS month_start
 ), month_data AS (
  SELECT to_char(m.month_start,'YYYY-MM') AS month,
   (SELECT count(*) FROM public.lms_profiles p
    WHERE p.created_at>=m.month_start
      AND p.created_at<m.month_start+interval '1 month')::integer AS registrations,
   (SELECT count(*) FROM public.lms_practice_attempts a
    WHERE a.state IN ('submitted','expired') AND a.submitted_at>=m.month_start
      AND a.submitted_at<m.month_start+interval '1 month')::integer AS practice,
   (SELECT count(*) FROM public.lms_p10_mock_attempts a
    WHERE a.state IN ('submitted','expired') AND a.submitted_at>=m.month_start
      AND a.submitted_at<m.month_start+interval '1 month')::integer AS mock
  FROM months m
 )
 SELECT jsonb_build_object(
  'version','p13-v1','generatedAt',clock_timestamp(),
  'kpis',jsonb_build_object(
   'users',(SELECT count(*)::integer FROM public.lms_profiles),
   'activeAccounts',(SELECT count(*)::integer FROM public.lms_profiles WHERE account_status='active'),
   'engaged30Days',(SELECT count(*)::integer FROM public.lms_profiles p WHERE
     EXISTS(SELECT 1 FROM public.lms_lesson_progress l
       WHERE l.user_id=p.id AND l.last_activity_at>=clock_timestamp()-interval '30 days')
     OR EXISTS(SELECT 1 FROM public.lms_practice_attempts a
       WHERE a.user_id=p.id AND a.started_at>=clock_timestamp()-interval '30 days')
     OR EXISTS(SELECT 1 FROM public.lms_p10_mock_attempts a
       WHERE a.user_id=p.id AND a.started_at>=clock_timestamp()-interval '30 days')),
   'courses',(SELECT count(*)::integer FROM public.lms_courses),
   'publishedCourses',(SELECT count(*)::integer FROM public.lms_courses WHERE publication_state='published'),
   'activeEnrollments',(SELECT count(*)::integer FROM public.lms_entitlements e
     WHERE e.status='active' AND e.starts_at<=clock_timestamp()
       AND (e.ends_at IS NULL OR e.ends_at>clock_timestamp())),
   'practiceCompleted',(SELECT count(*)::integer FROM public.lms_practice_attempts
      WHERE state IN ('submitted','expired')),
   'mockCompleted',(SELECT count(*)::integer FROM public.lms_p10_mock_attempts
      WHERE state IN ('submitted','expired')),
   'completedLessons',(SELECT count(*)::integer FROM public.lms_lesson_progress
      WHERE lesson_completed_at IS NOT NULL),
   'questions',(SELECT count(*)::integer FROM public.lms_questions),
   'practiceApproved',(SELECT count(*)::integer FROM public.lms_questions
      WHERE approval_state='approved' AND NOT mock_exclusive),
   'mockReserved',(SELECT count(*)::integer FROM public.lms_questions
      WHERE mock_exclusive),
   'verifiedRevenue',NULL,'currency',NULL,'revenueTracked',false),
  'trend',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'month',m.month,'registrations',m.registrations,
    'practice',m.practice,'mock',m.mock)
    ORDER BY m.month),'[]'::jsonb) FROM month_data m),
  'courses',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'title',c.title,'status',c.publication_state,
    'enrollments',(SELECT count(*)::integer FROM public.lms_entitlements e
      WHERE e.course_id=c.id AND e.status='active'
      AND e.starts_at<=clock_timestamp()
      AND (e.ends_at IS NULL OR e.ends_at>clock_timestamp())),
    'questions',(SELECT count(*)::integer FROM public.lms_questions q WHERE q.course_id=c.id))
    ORDER BY c.created_at DESC),'[]'::jsonb) FROM public.lms_courses c)
 ) INTO v_out;
 RETURN v_out;
END; $$;

CREATE FUNCTION public.lms_p13_admin_users(
 p_search text DEFAULT '',p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_total integer;v_rows jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active real LMS Admin role required'; END IF;
 IF p_search IS NULL OR length(p_search)>80 OR p_limit NOT BETWEEN 1 AND 50
 OR p_offset NOT BETWEEN 0 AND 50000 OR p_limit IS NULL OR p_offset IS NULL
 THEN RAISE EXCEPTION 'Invalid Admin directory request'; END IF;
 SELECT count(*)::integer INTO v_total FROM public.lms_profiles p
 WHERE p.full_name ILIKE '%'||replace(replace(replace(trim(p_search),'\','\\'),'%','\%'),'_','\_')||'%' ESCAPE '\';
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',x.id,'name',x.full_name,'status',x.account_status,
   'joinedAt',x.created_at,'activePlans',x.active_plans,
   'lessonsCompleted',x.lessons_completed,
   'practiceAttempts',x.practice_attempts,'mockAttempts',x.mock_attempts)
   ORDER BY x.created_at DESC,x.id),'[]'::jsonb) INTO v_rows
 FROM (
  SELECT p.id,p.full_name,p.account_status,p.created_at,
   (SELECT count(*)::integer FROM public.lms_entitlements e
    WHERE e.user_id=p.id AND e.status='active' AND e.starts_at<=clock_timestamp()
    AND (e.ends_at IS NULL OR e.ends_at>clock_timestamp())) AS active_plans,
   (SELECT count(*)::integer FROM public.lms_lesson_progress l
    WHERE l.user_id=p.id AND l.lesson_completed_at IS NOT NULL) AS lessons_completed,
   (SELECT count(*)::integer FROM public.lms_practice_attempts a
    WHERE a.user_id=p.id AND a.state IN ('submitted','expired')) AS practice_attempts,
   (SELECT count(*)::integer FROM public.lms_p10_mock_attempts a
    WHERE a.user_id=p.id AND a.state IN ('submitted','expired')) AS mock_attempts
  FROM public.lms_profiles p
  WHERE p.full_name ILIKE '%'||replace(replace(replace(trim(p_search),'\','\\'),'%','\%'),'_','\_')||'%' ESCAPE '\'
  ORDER BY p.created_at DESC,p.id LIMIT p_limit OFFSET p_offset
 ) x;
 RETURN jsonb_build_object('version','p13-v1','total',v_total,
  'limit',p_limit,'offset',p_offset,'users',v_rows);
END; $$;

CREATE FUNCTION public.lms_p13_admin_user_detail(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.lms_profiles%ROWTYPE;v_out jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active real LMS Admin role required'; END IF;
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Select a real LMS user'; END IF;
 SELECT * INTO p FROM public.lms_profiles WHERE id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'LMS profile not found'; END IF;
 SELECT jsonb_build_object(
  'version','p13-v1',
  'profile',jsonb_build_object('id',p.id,'name',p.full_name,
    'status',p.account_status,'joinedAt',p.created_at),
  'entitlements',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'courseId',e.course_id,'courseTitle',c.title,
    'type',e.entitlement_type,'status',e.status,'startsAt',e.starts_at,
    'endsAt',e.ends_at,
    'amountPaid',NULL,'currency',NULL,'paymentRecorded',false)
    ORDER BY e.starts_at DESC),'[]'::jsonb)
    FROM public.lms_entitlements e
    JOIN public.lms_courses c ON c.id=e.course_id WHERE e.user_id=p.id),
  'courseProgress',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'courseId',c.id,'courseTitle',c.title,
    'lessonsCompleted',(SELECT count(*)::integer FROM public.lms_lesson_progress lp
      JOIN public.lms_lessons l ON l.id=lp.lesson_id
      JOIN public.lms_topics t ON t.id=l.topic_id
      JOIN public.lms_domains d ON d.id=t.domain_id
      WHERE lp.user_id=p.id AND d.course_id=c.id AND lp.lesson_completed_at IS NOT NULL),
    'practiceCompleted',(SELECT count(*)::integer FROM public.lms_practice_attempts a
      WHERE a.user_id=p.id AND a.course_id=c.id AND a.state IN ('submitted','expired')),
    'mockCompleted',(SELECT count(*)::integer FROM public.lms_p10_mock_attempts a
      WHERE a.user_id=p.id AND a.course_id=c.id AND a.state IN ('submitted','expired')))
    ORDER BY c.title),'[]'::jsonb) FROM public.lms_courses c
    WHERE EXISTS(SELECT 1 FROM public.lms_entitlements e
      WHERE e.user_id=p.id AND e.course_id=c.id)),
  'lessonProgressTotal',(SELECT count(*)::integer FROM public.lms_lesson_progress lp
    WHERE lp.user_id=p.id),
  'lessonProgress',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'courseTitle',x.course_title,'domainTitle',x.domain_title,
      'topicTitle',x.topic_title,'lessonTitle',x.lesson_title,
      'readingCompleted',x.reading_completed,'videoCompleted',x.video_completed,
      'quizPassed',x.quiz_passed,'completedAt',x.lesson_completed_at,
      'lastActivityAt',x.last_activity_at)
      ORDER BY x.last_activity_at DESC),'[]'::jsonb)
    FROM (
      SELECT c.title AS course_title,d.title AS domain_title,
        t.title AS topic_title,l.title AS lesson_title,
        lp.reading_completed,lp.video_completed,lp.quiz_passed,
        lp.lesson_completed_at,lp.last_activity_at
      FROM public.lms_lesson_progress lp
      JOIN public.lms_lessons l ON l.id=lp.lesson_id
      JOIN public.lms_topics t ON t.id=l.topic_id
      JOIN public.lms_domains d ON d.id=t.domain_id
      JOIN public.lms_courses c ON c.id=d.course_id
      WHERE lp.user_id=p.id
      ORDER BY lp.last_activity_at DESC LIMIT 100
    ) x),
  'recentAssessments',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'courseTitle',z.course_title,'mode',z.mode,'state',z.state,
     'questionCount',z.question_count,'correctCount',z.correct_count,
     'scorePercent',z.score_percent,'submittedAt',z.submitted_at)
     ORDER BY z.submitted_at DESC),'[]'::jsonb)
    FROM (
     SELECT c.title AS course_title,a.mode,a.state,a.question_count,
       a.correct_count,a.score_percent,a.submitted_at
     FROM public.lms_practice_attempts a
     JOIN public.lms_courses c ON c.id=a.course_id
     WHERE a.user_id=p.id AND a.state IN ('submitted','expired')
     UNION ALL
     SELECT c.title AS course_title,'asp_mock_200'::text,a.state,a.question_count,
       a.correct_count,a.score_percent,a.submitted_at
     FROM public.lms_p10_mock_attempts a
     JOIN public.lms_courses c ON c.id=a.course_id
     WHERE a.user_id=p.id AND a.state IN ('submitted','expired')
     ORDER BY submitted_at DESC NULLS LAST LIMIT 10
    ) z),
  'practice',jsonb_build_object(
    'completed',(SELECT count(*)::integer FROM public.lms_practice_attempts
      WHERE user_id=p.id AND state IN ('submitted','expired')),
    'lastScore',(SELECT a.score_percent FROM public.lms_practice_attempts a
      WHERE a.user_id=p.id AND a.state IN ('submitted','expired')
      ORDER BY a.submitted_at DESC NULLS LAST LIMIT 1),
    'latestAt',(SELECT max(a.submitted_at) FROM public.lms_practice_attempts a
      WHERE a.user_id=p.id AND a.state IN ('submitted','expired'))),
  'mock',jsonb_build_object(
    'completed',(SELECT count(*)::integer FROM public.lms_p10_mock_attempts
      WHERE user_id=p.id AND state IN ('submitted','expired')),
    'lastScore',(SELECT a.score_percent FROM public.lms_p10_mock_attempts a
      WHERE a.user_id=p.id AND a.state IN ('submitted','expired')
      ORDER BY a.submitted_at DESC NULLS LAST LIMIT 1),
    'latestAt',(SELECT max(a.submitted_at) FROM public.lms_p10_mock_attempts a
      WHERE a.user_id=p.id AND a.state IN ('submitted','expired'))),
  'revenueAvailable',false
 ) INTO v_out;
 RETURN v_out;
END; $$;

REVOKE ALL ON FUNCTION public.lms_p13_admin_overview() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lms_p13_admin_users(text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lms_p13_admin_user_detail(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p13_admin_overview() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p13_admin_users(text,integer,integer) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p13_admin_user_detail(uuid) TO authenticated,service_role;
COMMIT;
