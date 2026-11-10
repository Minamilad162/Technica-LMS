-- P59: OAuth display name and authoritative Admin User Directory platform plan states.
-- Safe ALTER: no existing profiles, auth users or subscriptions are updated.
BEGIN;
DO $pre$ BEGIN
 IF to_regprocedure('public.lms_p13_admin_users(text,integer,integer)') IS NULL
 OR to_regprocedure('public.lms_p13_admin_user_detail(uuid)') IS NULL
 OR to_regprocedure('public.lms_p53_admin_user_controls(uuid)') IS NULL
 OR to_regprocedure('public.lms_p1_on_auth_signup()') IS NULL
 THEN RAISE EXCEPTION 'P59 depends on P1, P13 and P53'; END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE name='p59_google_profile_names_and_admin_plan_status')
 THEN RAISE EXCEPTION 'P59 already installed; do not replay'; END IF;
END $pre$;
CREATE OR REPLACE FUNCTION public.lms_p13_admin_users(p_search text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_total integer;v_rows jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active real LMS Admin role required'; END IF;
 IF p_search IS NULL OR length(p_search)>80 OR p_limit NOT BETWEEN 1 AND 50
 OR p_offset NOT BETWEEN 0 AND 50000 OR p_limit IS NULL OR p_offset IS NULL
 THEN RAISE EXCEPTION 'Invalid Admin directory request'; END IF;
 SELECT count(*)::integer INTO v_total FROM public.lms_profiles p JOIN auth.users u ON u.id=p.id
 WHERE position(lower(btrim(p_search)) in lower(coalesce(nullif(btrim(p.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),nullif(btrim(u.raw_user_meta_data->>'given_name'),''),nullif(split_part(u.email,'@',1),''),'Learner')||' '||coalesce(u.email,'')))>0;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',x.id,'name',x.full_name,'email',x.email,'provider',x.provider,
   'planStatus',x.plan_status,'planName',x.plan_name,'planEndsAt',x.plan_ends_at,
   'status',x.account_status,
   'joinedAt',x.created_at,'activePlans',x.active_plans,
   'lessonsCompleted',x.lessons_completed,
   'practiceAttempts',x.practice_attempts,'mockAttempts',x.mock_attempts)
   ORDER BY x.created_at DESC,x.id),'[]'::jsonb) INTO v_rows
 FROM (
  SELECT p.id,coalesce(nullif(btrim(p.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),nullif(btrim(u.raw_user_meta_data->>'given_name'),''),nullif(split_part(u.email,'@',1),''),'Learner') AS full_name,u.email,
   CASE WHEN EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=p.id AND i.provider='google') THEN 'google' ELSE 'email' END AS provider,
   CASE WHEN EXISTS(SELECT 1 FROM public.lms_platform_subscriptions s
     WHERE s.user_id=p.id AND s.status='active' AND s.starts_at<=clock_timestamp() AND s.ends_at>clock_timestamp())
    THEN 'active' ELSE 'free' END AS plan_status,
   (SELECT s.plan_name_snapshot FROM public.lms_platform_subscriptions s
     WHERE s.user_id=p.id AND s.status='active' AND s.starts_at<=clock_timestamp()
       AND s.ends_at>clock_timestamp() ORDER BY s.ends_at DESC LIMIT 1) AS plan_name,
   (SELECT s.ends_at FROM public.lms_platform_subscriptions s
     WHERE s.user_id=p.id AND s.status='active' AND s.starts_at<=clock_timestamp()
       AND s.ends_at>clock_timestamp() ORDER BY s.ends_at DESC LIMIT 1) AS plan_ends_at,
   p.account_status,p.created_at,
   ((SELECT count(*)::integer FROM public.lms_entitlements e
    WHERE e.user_id=p.id AND e.status='active' AND e.starts_at<=clock_timestamp()
    AND (e.ends_at IS NULL OR e.ends_at>clock_timestamp()))
   +(SELECT count(*)::integer FROM public.lms_platform_subscriptions s
    WHERE s.user_id=p.id AND s.status='active' AND s.starts_at<=clock_timestamp()
      AND s.ends_at>clock_timestamp())) AS active_plans,
   (SELECT count(*)::integer FROM public.lms_lesson_progress l
    WHERE l.user_id=p.id AND l.lesson_completed_at IS NOT NULL) AS lessons_completed,
   (SELECT count(*)::integer FROM public.lms_practice_attempts a
    WHERE a.user_id=p.id AND a.state IN ('submitted','expired')) AS practice_attempts,
   (SELECT count(*)::integer FROM public.lms_p10_mock_attempts a
    WHERE a.user_id=p.id AND a.state IN ('submitted','expired')) AS mock_attempts
  FROM public.lms_profiles p JOIN auth.users u ON u.id=p.id
  WHERE position(lower(btrim(p_search)) in lower(coalesce(nullif(btrim(p.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),nullif(btrim(u.raw_user_meta_data->>'given_name'),''),nullif(split_part(u.email,'@',1),''),'Learner')||' '||coalesce(u.email,'')))>0
  ORDER BY p.created_at DESC,p.id LIMIT p_limit OFFSET p_offset
 ) x;
 RETURN jsonb_build_object('version','p13-v1','total',v_total,
  'limit',p_limit,'offset',p_offset,'users',v_rows);
END; $function$;

CREATE OR REPLACE FUNCTION public.lms_p13_admin_user_detail(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.lms_profiles%ROWTYPE;v_out jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active real LMS Admin role required'; END IF;
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Select a real LMS user'; END IF;
 SELECT * INTO p FROM public.lms_profiles WHERE id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'LMS profile not found'; END IF;
 SELECT jsonb_build_object(
  'version','p13-v1',
  'profile',jsonb_build_object('id',p.id,'name',(SELECT coalesce(nullif(btrim(p.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),nullif(btrim(u.raw_user_meta_data->>'given_name'),''),nullif(split_part(u.email,'@',1),''),'Learner') FROM auth.users u WHERE u.id=p.id),
    'email',(SELECT u.email FROM auth.users u WHERE u.id=p.id),
    'provider',(SELECT CASE WHEN EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=p.id AND i.provider='google') THEN 'google' ELSE 'email' END),
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
END; $function$;

CREATE OR REPLACE FUNCTION public.lms_p53_admin_user_controls(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_profile public.lms_profiles%ROWTYPE; v_email text;v_display text;v_provider text;v_plans jsonb;v_subs jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified LMS Admin required'; END IF;
 SELECT p.* INTO v_profile FROM public.lms_profiles p WHERE p.id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 SELECT u.email,coalesce(nullif(btrim(v_profile.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),nullif(btrim(u.raw_user_meta_data->>'given_name'),''),nullif(split_part(u.email,'@',1),''),'Learner'),
  CASE WHEN EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=v_profile.id AND i.provider='google') THEN 'google' ELSE 'email' END
  INTO v_email,v_display,v_provider FROM auth.users u WHERE u.id=v_profile.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
  'months',p.duration_months)
  ORDER BY p.display_order,p.name),'[]'::jsonb) INTO v_plans
 FROM public.lms_subscription_plans p WHERE p.is_published;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'planName',s.plan_name_snapshot,
  'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status,'source',s.source)
  ORDER BY s.ends_at DESC),'[]'::jsonb) INTO v_subs
 FROM (SELECT id,plan_name_snapshot,starts_at,ends_at,status,source
  FROM public.lms_platform_subscriptions
  WHERE user_id=p_user_id AND status='active' AND starts_at<=now() AND ends_at>now()
  ORDER BY ends_at DESC LIMIT 10) s;
 RETURN jsonb_build_object('userId',v_profile.id,'email',v_email,
  'name',v_display,'provider',v_provider,
  'planStatus',CASE WHEN jsonb_array_length(v_subs)>0 THEN 'active' ELSE 'free' END,
  'status',v_profile.account_status,
  'blockNote',v_profile.block_note,'blockedAt',v_profile.blocked_at,
  'plans',v_plans,'subscriptions',v_subs);
END $function$;

CREATE OR REPLACE FUNCTION public.lms_p1_on_auth_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 INSERT INTO public.lms_profiles(id,full_name,locale)
 VALUES (NEW.id,left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'full_name'),''),
  nullif(btrim(NEW.raw_user_meta_data->>'name'),''),
  nullif(btrim(NEW.raw_user_meta_data->>'given_name'),''),''),160),'en')
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END; $function$;
COMMIT;
