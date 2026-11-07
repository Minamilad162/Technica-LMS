-- Technica LMS P22: lesson step completion and protected Knowledge Checks.
-- ADDITIVE SOURCE ONLY. Do not apply to Production without owner-approved
-- Staging ledger review, backup, RLS negative tests and browser verification.
-- Requires P1/P2/P11/P15/P21; does not alter entitlements or existing grades.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_lesson_progress') IS NULL
    OR to_regclass('public.lms_lesson_events') IS NULL
    OR to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
    OR to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN RAISE EXCEPTION 'P22 requires the existing verified P1/P2 learning foundation'; END IF;
 IF to_regclass('public.lms_p22_lesson_quiz_questions') IS NOT NULL
    OR to_regprocedure('public.lms_p22_complete_lesson_step(uuid,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'P22 already exists; never replay a migration'; END IF;
END $$;

ALTER TABLE public.lms_lesson_progress
 ADD COLUMN quiz_completed boolean NOT NULL DEFAULT false;

CREATE TABLE public.lms_p22_lesson_quiz_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position>=0),
 prompt text NOT NULL CHECK(length(btrim(prompt)) BETWEEN 8 AND 1000),
 options jsonb NOT NULL CHECK(jsonb_typeof(options)='array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6),
 correct_index integer NOT NULL CHECK(correct_index BETWEEN 0 AND 5),
 is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lesson_id,position),
 CHECK(correct_index < jsonb_array_length(options))
);
CREATE INDEX lms_p22_lesson_quiz_published_idx
 ON public.lms_p22_lesson_quiz_questions(lesson_id,is_published,position);
ALTER TABLE public.lms_p22_lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p22_lesson_quiz_questions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_p22_lesson_quiz_questions TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lms_p22_lesson_quiz_questions TO authenticated;
CREATE POLICY lms_p22_admin_quiz_read ON public.lms_p22_lesson_quiz_questions
 FOR SELECT TO authenticated USING(public.lms_p1_actor_is_admin());
CREATE POLICY lms_p22_admin_quiz_write ON public.lms_p22_lesson_quiz_questions
 FOR ALL TO authenticated USING(public.lms_p1_actor_is_admin())
 WITH CHECK(public.lms_p1_actor_is_admin());

-- Only progress that has actually been persisted by server-side RPCs counts.
-- The new quiz_completed flag is intentionally distinct from quiz_passed.
CREATE FUNCTION public.lms_p22_refresh_completion(p_user uuid,p_lesson uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_required_read boolean;v_required_video boolean;v_required_quiz boolean;
DECLARE v_read boolean;v_video boolean;v_quiz boolean;v_already timestamptz;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.lms_lesson_blocks
         WHERE lesson_id=p_lesson AND block_type IN ('text','heading')),
        EXISTS(SELECT 1 FROM public.lms_lesson_blocks
         WHERE lesson_id=p_lesson AND block_type='video'),
        EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
         WHERE lesson_id=p_lesson AND is_published IS TRUE)
 INTO v_required_read,v_required_video,v_required_quiz;
 SELECT reading_completed,video_completed,quiz_completed,lesson_completed_at
 INTO v_read,v_video,v_quiz,v_already
 FROM public.lms_lesson_progress WHERE user_id=p_user AND lesson_id=p_lesson FOR UPDATE;
 IF (v_required_read OR v_required_video OR v_required_quiz)
    AND (NOT v_required_read OR v_read)
    AND (NOT v_required_video OR v_video)
    AND (NOT v_required_quiz OR v_quiz)
    AND v_already IS NULL THEN
   UPDATE public.lms_lesson_progress
     SET lesson_completed_at=now(),last_activity_at=now(),updated_at=now()
   WHERE user_id=p_user AND lesson_id=p_lesson;
   INSERT INTO public.lms_lesson_events(idempotency_key,user_id,lesson_id,event_type,event_data)
     VALUES(gen_random_uuid(),p_user,p_lesson,'lesson_completed','{"source":"p22"}'::jsonb);
 END IF;
END $$;

-- Learners cannot update progress directly. This endpoint verifies the signed
-- identity and published lesson entitlement at the moment of each event.
CREATE FUNCTION public.lms_p22_complete_lesson_step(p_lesson_id uuid,p_step text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());v_row public.lms_lesson_progress%ROWTYPE;
BEGIN
 IF v_user IS NULL OR p_lesson_id IS NULL OR p_step NOT IN ('reading','video')
   OR NOT public.lms_p1_can_view_lesson(p_lesson_id)
   OR NOT EXISTS(SELECT 1 FROM public.lms_profiles
     WHERE id=v_user AND account_status='active')
 THEN RAISE EXCEPTION 'Lesson completion not authorized'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_lesson_blocks
     WHERE lesson_id=p_lesson_id AND block_type=CASE WHEN p_step='video'
       THEN 'video' ELSE 'text' END)
   AND NOT(p_step='reading' AND EXISTS(SELECT 1 FROM public.lms_lesson_blocks
       WHERE lesson_id=p_lesson_id AND block_type='heading'))
 THEN RAISE EXCEPTION 'Lesson step has no published content'; END IF;
 INSERT INTO public.lms_lesson_progress(user_id,lesson_id,reading_completed,video_completed)
  VALUES(v_user,p_lesson_id,p_step='reading',p_step='video')
 ON CONFLICT(user_id,lesson_id) DO UPDATE SET
  reading_completed=public.lms_lesson_progress.reading_completed OR EXCLUDED.reading_completed,
  video_completed=public.lms_lesson_progress.video_completed OR EXCLUDED.video_completed,
  last_activity_at=now(),updated_at=now();
 INSERT INTO public.lms_lesson_events(idempotency_key,user_id,lesson_id,event_type,event_data)
  VALUES(gen_random_uuid(),v_user,p_lesson_id,
    CASE WHEN p_step='reading' THEN 'section_viewed' ELSE 'video_checkpoint' END,
    jsonb_build_object('step',p_step,'source','P22 protected learner player'));
 PERFORM public.lms_p22_refresh_completion(v_user,p_lesson_id);
 SELECT * INTO v_row FROM public.lms_lesson_progress
  WHERE user_id=v_user AND lesson_id=p_lesson_id;
 RETURN jsonb_build_object('lesson_id',v_row.lesson_id,
   'reading_completed',v_row.reading_completed,
   'video_completed',v_row.video_completed,
   'quiz_passed',v_row.quiz_passed,
   'lesson_completed_at',v_row.lesson_completed_at);
END $$;

-- Caller receives no answer keys. Existing protected lesson ACL protects Free
-- Intro and paid access. The question table itself remains Admin-only.
CREATE FUNCTION public.lms_p22_get_lesson_quiz(p_lesson_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());v_questions jsonb;
BEGIN
 IF v_user IS NULL OR p_lesson_id IS NULL
   OR NOT public.lms_p1_can_view_lesson(p_lesson_id)
   OR NOT EXISTS(SELECT 1 FROM public.lms_profiles
      WHERE id=v_user AND account_status='active')
 THEN RAISE EXCEPTION 'Quiz unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'prompt',prompt,'options',options)
   ORDER BY position),'[]'::jsonb) INTO v_questions
 FROM public.lms_p22_lesson_quiz_questions
 WHERE lesson_id=p_lesson_id AND is_published IS TRUE;
 RETURN v_questions;
END $$;

-- All questions must be answered once; wrong answers still mark quiz_completed.
-- Correct keys never leave this SECURITY DEFINER function.
CREATE FUNCTION public.lms_p22_submit_lesson_quiz(p_lesson_id uuid,p_answers jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());v_expected int;v_received int;
DECLARE v_correct int;v_percent numeric(5,2);v_completed timestamptz;
BEGIN
 IF v_user IS NULL OR p_lesson_id IS NULL
   OR NOT public.lms_p1_can_view_lesson(p_lesson_id)
   OR NOT EXISTS(SELECT 1 FROM public.lms_profiles
     WHERE id=v_user AND account_status='active')
   OR jsonb_typeof(p_answers) IS DISTINCT FROM 'array'
   OR jsonb_array_length(p_answers)>100
 THEN RAISE EXCEPTION 'Quiz submission not authorized'; END IF;
 SELECT count(*) INTO v_expected FROM public.lms_p22_lesson_quiz_questions
   WHERE lesson_id=p_lesson_id AND is_published IS TRUE;
 IF v_expected=0 OR v_expected>100 OR jsonb_array_length(p_answers)<>v_expected
 THEN RAISE EXCEPTION 'You must answer every published question'; END IF;
 WITH answers AS (
  SELECT id,"selectedIndex" AS selected_index
  FROM jsonb_to_recordset(p_answers) AS a(id uuid,"selectedIndex" integer)
 ), checked AS (
  SELECT a.id,a.selected_index,q.correct_index,jsonb_array_length(q.options) AS choices
  FROM answers a
  LEFT JOIN public.lms_p22_lesson_quiz_questions q ON q.id=a.id
    AND q.lesson_id=p_lesson_id AND q.is_published IS TRUE
 )
 SELECT count(*),count(*) FILTER (WHERE selected_index=correct_index)
 INTO v_received,v_correct FROM checked
 WHERE choices IS NOT NULL AND selected_index BETWEEN 0 AND choices-1;
 IF v_received<>v_expected OR
    (SELECT count(DISTINCT (a->>'id')) FROM jsonb_array_elements(p_answers) a)<>v_expected
 THEN RAISE EXCEPTION 'Invalid or duplicate quiz answer'; END IF;
 v_percent:=round(v_correct::numeric*100/v_expected,2);
 INSERT INTO public.lms_lesson_progress
   (user_id,lesson_id,quiz_completed,quiz_passed,quiz_best_percent)
 VALUES(v_user,p_lesson_id,true,v_percent>=70,v_percent)
 ON CONFLICT(user_id,lesson_id) DO UPDATE SET
   quiz_completed=true,
   quiz_passed=public.lms_lesson_progress.quiz_passed OR EXCLUDED.quiz_passed,
   quiz_best_percent=greatest(coalesce(public.lms_lesson_progress.quiz_best_percent,0),v_percent),
   last_activity_at=now(),updated_at=now();
 INSERT INTO public.lms_lesson_events(idempotency_key,user_id,lesson_id,event_type,event_data)
 VALUES(gen_random_uuid(),v_user,p_lesson_id,'quiz_submitted',
   jsonb_build_object('scorePercent',v_percent,'answered',v_expected));
 PERFORM public.lms_p22_refresh_completion(v_user,p_lesson_id);
 SELECT lesson_completed_at INTO v_completed FROM public.lms_lesson_progress
  WHERE user_id=v_user AND lesson_id=p_lesson_id;
 RETURN jsonb_build_object('scorePercent',v_percent,'questionCount',v_expected,
   'quizCompleted',true,'lessonCompleted',v_completed IS NOT NULL);
END $$;

CREATE FUNCTION public.lms_p22_my_steps(p_course_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());v_result jsonb;
BEGIN
 IF v_user IS NULL OR p_course_id IS NULL OR
  NOT public.lms_p1_can_view_structure(p_course_id)
 THEN RAISE EXCEPTION 'Course progress unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'lesson_id',p.lesson_id,'quiz_completed',p.quiz_completed)
   ORDER BY p.lesson_id),'[]'::jsonb)
 INTO v_result
 FROM public.lms_lesson_progress p
 JOIN public.lms_lessons l ON l.id=p.lesson_id
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 WHERE p.user_id=v_user AND d.course_id=p_course_id
   AND public.lms_p1_can_view_lesson(p.lesson_id);
 RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.lms_p22_refresh_completion(uuid,uuid),
 public.lms_p22_complete_lesson_step(uuid,text),
 public.lms_p22_get_lesson_quiz(uuid),
 public.lms_p22_submit_lesson_quiz(uuid,jsonb),
 public.lms_p22_my_steps(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p22_complete_lesson_step(uuid,text),
 public.lms_p22_get_lesson_quiz(uuid),
 public.lms_p22_submit_lesson_quiz(uuid,jsonb),
 public.lms_p22_my_steps(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p22_refresh_completion(uuid,uuid) TO service_role;

-- Explicit Data API grants; do not permit learner direct progress writes.
GRANT SELECT ON public.lms_lesson_progress TO authenticated;
COMMIT;
