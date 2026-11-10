-- P58: Kill Mistakes. One private learner-owned item per wrong bank/lesson question.
-- Existing Practice/Mock attempts and subscriptions are unchanged on installation.
BEGIN;
DO $pre$ BEGIN
 IF to_regclass('public.lms_p58_mistakes') IS NOT NULL THEN
  RAISE EXCEPTION 'P58 already installed; do not replay'; END IF;
 IF to_regprocedure('public.lms_p22_submit_lesson_quiz(uuid,jsonb)') IS NULL
  OR to_regclass('public.lms_p34_selected_mock_answers') IS NULL
  OR to_regclass('public.lms_practice_attempt_items') IS NULL
 THEN RAISE EXCEPTION 'P58 requires P4/P10/P22/P34'; END IF;
END $pre$;

CREATE TABLE public.lms_p58_mistakes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id),
 source_kind text NOT NULL CHECK(source_kind IN ('bank','lesson')),
 source_question_id uuid NOT NULL,
 lesson_id uuid REFERENCES public.lms_lessons(id) ON DELETE SET NULL,
 prompt_snapshot text NOT NULL,
 options_snapshot jsonb NOT NULL CHECK(jsonb_typeof(options_snapshot)='array'),
 correct_index_snapshot smallint NOT NULL CHECK(correct_index_snapshot BETWEEN 0 AND 20),
 explanation_snapshot text NOT NULL DEFAULT '',
 reference_snapshot text NOT NULL DEFAULT '',
 last_source text NOT NULL,
 wrong_count integer NOT NULL DEFAULT 1 CHECK(wrong_count>=1),
 review_count integer NOT NULL DEFAULT 0 CHECK(review_count>=0),
 first_wrong_at timestamptz NOT NULL DEFAULT now(),
 last_wrong_at timestamptz NOT NULL DEFAULT now(),
 last_reviewed_at timestamptz,
 resolved_at timestamptz,
 CONSTRAINT lms_p58_one_question_per_learner UNIQUE(user_id,source_kind,source_question_id)
);
CREATE INDEX lms_p58_owned_open ON public.lms_p58_mistakes(user_id,last_wrong_at DESC,id)
 WHERE resolved_at IS NULL;
CREATE INDEX lms_p58_course_open ON public.lms_p58_mistakes(user_id,course_id,last_wrong_at DESC)
 WHERE resolved_at IS NULL;
ALTER TABLE public.lms_p58_mistakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p58_mistakes FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p58_capture_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF OLD.state IS DISTINCT FROM 'in_progress'
  OR NEW.state NOT IN ('submitted','expired') THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='lms_practice_attempts' THEN
  INSERT INTO public.lms_p58_mistakes(
   user_id,course_id,source_kind,source_question_id,
   prompt_snapshot,options_snapshot,correct_index_snapshot,
   explanation_snapshot,reference_snapshot,last_source)
  SELECT NEW.user_id,q.course_id,'bank',i.question_id,
   i.prompt_snapshot,i.options_snapshot,i.correct_index_snapshot,
   coalesce(i.explanation_snapshot,''),coalesce(q.reference_text,''),NEW.mode
  FROM public.lms_practice_attempt_items i
  JOIN public.lms_questions q ON q.id=i.question_id
  WHERE i.attempt_id=NEW.id AND i.selected_index IS DISTINCT FROM i.correct_index_snapshot
  ON CONFLICT(user_id,source_kind,source_question_id)
  DO UPDATE SET wrong_count=public.lms_p58_mistakes.wrong_count+1,
   last_wrong_at=clock_timestamp(),last_source=EXCLUDED.last_source,
   course_id=EXCLUDED.course_id,lesson_id=NULL,
   prompt_snapshot=EXCLUDED.prompt_snapshot,options_snapshot=EXCLUDED.options_snapshot,
   correct_index_snapshot=EXCLUDED.correct_index_snapshot,
   explanation_snapshot=EXCLUDED.explanation_snapshot,reference_snapshot=EXCLUDED.reference_snapshot,
   resolved_at=NULL;
 ELSIF TG_TABLE_NAME='lms_p10_mock_attempts' THEN
  INSERT INTO public.lms_p58_mistakes(
   user_id,course_id,source_kind,source_question_id,
   prompt_snapshot,options_snapshot,correct_index_snapshot,
   explanation_snapshot,reference_snapshot,last_source)
  SELECT NEW.user_id,q.course_id,'bank',i.question_id,
   i.prompt_snapshot,i.options_snapshot,i.correct_index_snapshot,
   coalesce(q.explanation,''),coalesce(q.reference_text,''),'official_mock'
  FROM public.lms_p10_mock_answers i JOIN public.lms_questions q ON q.id=i.question_id
  WHERE i.attempt_id=NEW.id AND i.selected_index IS DISTINCT FROM i.correct_index_snapshot
  ON CONFLICT(user_id,source_kind,source_question_id)
  DO UPDATE SET wrong_count=public.lms_p58_mistakes.wrong_count+1,
   last_wrong_at=clock_timestamp(),last_source=EXCLUDED.last_source,
   course_id=EXCLUDED.course_id,lesson_id=NULL,
   prompt_snapshot=EXCLUDED.prompt_snapshot,options_snapshot=EXCLUDED.options_snapshot,
   correct_index_snapshot=EXCLUDED.correct_index_snapshot,
   explanation_snapshot=EXCLUDED.explanation_snapshot,reference_snapshot=EXCLUDED.reference_snapshot,
   resolved_at=NULL;
 ELSIF TG_TABLE_NAME='lms_p34_selected_mock_attempts' THEN
  INSERT INTO public.lms_p58_mistakes(
   user_id,course_id,source_kind,source_question_id,
   prompt_snapshot,options_snapshot,correct_index_snapshot,
   explanation_snapshot,reference_snapshot,last_source)
  SELECT NEW.user_id,q.course_id,'bank',i.question_id,
   i.prompt_snapshot,i.options_snapshot,i.correct_index_snapshot,
   coalesce(q.explanation,''),coalesce(q.reference_text,''),'selected_mock'
  FROM public.lms_p34_selected_mock_answers i JOIN public.lms_questions q ON q.id=i.question_id
  WHERE i.attempt_id=NEW.id AND i.selected_index IS DISTINCT FROM i.correct_index_snapshot
  ON CONFLICT(user_id,source_kind,source_question_id)
  DO UPDATE SET wrong_count=public.lms_p58_mistakes.wrong_count+1,
   last_wrong_at=clock_timestamp(),last_source=EXCLUDED.last_source,
   course_id=EXCLUDED.course_id,lesson_id=NULL,
   prompt_snapshot=EXCLUDED.prompt_snapshot,options_snapshot=EXCLUDED.options_snapshot,
   correct_index_snapshot=EXCLUDED.correct_index_snapshot,
   explanation_snapshot=EXCLUDED.explanation_snapshot,reference_snapshot=EXCLUDED.reference_snapshot,
   resolved_at=NULL;
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_p58_capture_attempt() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER lms_p58_practice_finished AFTER UPDATE OF state ON public.lms_practice_attempts
 FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION public.lms_p58_capture_attempt();
CREATE TRIGGER lms_p58_official_mock_finished AFTER UPDATE OF state ON public.lms_p10_mock_attempts
 FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION public.lms_p58_capture_attempt();
CREATE TRIGGER lms_p58_selected_mock_finished AFTER UPDATE OF state ON public.lms_p34_selected_mock_attempts
 FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION public.lms_p58_capture_attempt();

CREATE FUNCTION public.lms_p58_capture_lesson_quiz(p_user_id uuid,p_lesson_id uuid,p_answers jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM (SELECT auth.uid())
  OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=p_user_id AND account_status='active')
  OR NOT (public.lms_p1_can_view_lesson(p_lesson_id) OR public.lms_p15_can_preview_lesson(p_lesson_id))
 THEN RAISE EXCEPTION 'Lesson quiz ownership/access required'; END IF;
 INSERT INTO public.lms_p58_mistakes(
  user_id,course_id,source_kind,source_question_id,lesson_id,
  prompt_snapshot,options_snapshot,correct_index_snapshot,
  explanation_snapshot,reference_snapshot,last_source)
 SELECT p_user_id,d.course_id,
  CASE WHEN bank.id IS NULL THEN 'lesson' ELSE 'bank' END,
  coalesce(bank.id,q.id),q.lesson_id,
  q.prompt,q.options,q.correct_index::smallint,
  coalesce(bank.explanation,''),coalesce(bank.reference_text,''),'lesson_quiz'
 FROM jsonb_to_recordset(p_answers) AS a(id uuid,"selectedIndex" integer)
 JOIN public.lms_p22_lesson_quiz_questions q ON q.id=a.id AND q.lesson_id=p_lesson_id
  AND q.is_published IS TRUE
 JOIN public.lms_lessons l ON l.id=q.lesson_id
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 LEFT JOIN public.lms_questions bank ON bank.id=q.bank_question_id AND bank.course_id=d.course_id
 WHERE a."selectedIndex" IS DISTINCT FROM q.correct_index
 ON CONFLICT(user_id,source_kind,source_question_id)
 DO UPDATE SET wrong_count=public.lms_p58_mistakes.wrong_count+1,
  last_wrong_at=clock_timestamp(),last_source='lesson_quiz',course_id=EXCLUDED.course_id,
  lesson_id=EXCLUDED.lesson_id,prompt_snapshot=EXCLUDED.prompt_snapshot,
  options_snapshot=EXCLUDED.options_snapshot,correct_index_snapshot=EXCLUDED.correct_index_snapshot,
  explanation_snapshot=EXCLUDED.explanation_snapshot,reference_snapshot=EXCLUDED.reference_snapshot,
  resolved_at=NULL;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_p58_capture_lesson_quiz(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;

-- Versioned P22 submit extension: original validation/progress logic intact.
CREATE OR REPLACE FUNCTION public.lms_p22_submit_lesson_quiz(p_lesson_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_user uuid:=(SELECT auth.uid());v_expected int;v_received int;
DECLARE v_correct int;v_percent numeric(5,2);v_completed timestamptz;
BEGIN
 IF v_user IS NULL OR p_lesson_id IS NULL
   OR NOT (public.lms_p1_can_view_lesson(p_lesson_id)
     OR public.lms_p15_can_preview_lesson(p_lesson_id))
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
 -- Capture missed questions only after the original server-side graded validation.
 PERFORM public.lms_p58_capture_lesson_quiz(v_user,p_lesson_id,p_answers);
 PERFORM public.lms_p22_refresh_completion(v_user,p_lesson_id);
 SELECT lesson_completed_at INTO v_completed FROM public.lms_lesson_progress
  WHERE user_id=v_user AND lesson_id=p_lesson_id;
 RETURN jsonb_build_object('scorePercent',v_percent,'questionCount',v_expected,
   'quizCompleted',true,'lessonCompleted',v_completed IS NOT NULL);
END $function$;

CREATE FUNCTION public.lms_p58_course_accessible(p_course_id uuid,p_lesson_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.lms_profiles p WHERE p.id=(SELECT auth.uid()) AND p.account_status='active')
 AND (public.lms_p4_can_practice(p_course_id) OR
  (p_lesson_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.lms_lessons l JOIN public.lms_topics t ON t.id=l.topic_id
   JOIN public.lms_domains d ON d.id=t.domain_id WHERE l.id=p_lesson_id AND d.course_id=p_course_id)
   AND (public.lms_p1_can_view_lesson(p_lesson_id) OR public.lms_p15_can_preview_lesson(p_lesson_id))));
$fn$;
REVOKE ALL ON FUNCTION public.lms_p58_course_accessible(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p58_list(p_limit integer DEFAULT 40,p_offset integer DEFAULT 0,p_course_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid());v_open integer;v_resolved integer;v_items jsonb;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=v_user AND account_status='active')
 THEN RAISE EXCEPTION 'Active learner account required'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL
  OR p_offset NOT BETWEEN 0 AND 50000
 THEN RAISE EXCEPTION 'Invalid Kill Mistakes pagination'; END IF;
 WITH eligible AS (
  SELECT m.*,c.title AS course_title FROM public.lms_p58_mistakes m
   JOIN public.lms_courses c ON c.id=m.course_id
  WHERE m.user_id=v_user AND (p_course_id IS NULL OR m.course_id=p_course_id)
   AND public.lms_p58_course_accessible(m.course_id,m.lesson_id)
 )
 SELECT
   (SELECT count(*)::integer FROM eligible WHERE resolved_at IS NULL),
   (SELECT count(*)::integer FROM eligible WHERE resolved_at IS NOT NULL),
   (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'courseId',i.course_id,'courseTitle',i.course_title,
    'prompt',i.prompt_snapshot,'options',i.options_snapshot,
    'wrongCount',i.wrong_count,'reviewCount',i.review_count,
    'lastSource',i.last_source,'lastWrongAt',i.last_wrong_at,
    'sourceKind',i.source_kind) ORDER BY i.last_wrong_at DESC,i.id),'[]'::jsonb)
    FROM (SELECT * FROM eligible WHERE resolved_at IS NULL
      ORDER BY last_wrong_at DESC,id LIMIT p_limit OFFSET p_offset) i)
 INTO v_open,v_resolved,v_items;
 RETURN jsonb_build_object('items',v_items,'openCount',v_open,
  'resolvedCount',v_resolved,'limit',p_limit,'offset',p_offset);
END $fn$;

CREATE FUNCTION public.lms_p58_answer(p_mistake_id uuid,p_selected_index integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid());v public.lms_p58_mistakes%ROWTYPE;
DECLARE v_right boolean;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=v_user AND account_status='active')
 THEN RAISE EXCEPTION 'Active learner account required'; END IF;
 SELECT * INTO v FROM public.lms_p58_mistakes WHERE id=p_mistake_id AND user_id=v_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mistake unavailable'; END IF;
 IF NOT public.lms_p58_course_accessible(v.course_id,v.lesson_id)
 THEN RAISE EXCEPTION 'Course access is no longer active'; END IF;
 IF p_selected_index IS NULL OR p_selected_index<0
  OR p_selected_index>=jsonb_array_length(v.options_snapshot)
 THEN RAISE EXCEPTION 'Select one valid answer'; END IF;
 IF v.resolved_at IS NOT NULL THEN
  RETURN jsonb_build_object('id',v.id,'correct',true,'resolved',true,
   'alreadyResolved',true,'correctIndex',v.correct_index_snapshot,
   'explanation',v.explanation_snapshot,'reference',v.reference_snapshot);
 END IF;
 v_right:=(p_selected_index=v.correct_index_snapshot);
 UPDATE public.lms_p58_mistakes
 SET review_count=review_count+1,last_reviewed_at=clock_timestamp(),
  resolved_at=CASE WHEN v_right THEN clock_timestamp() ELSE NULL END
 WHERE id=v.id AND user_id=v_user;
 RETURN jsonb_build_object('id',v.id,'correct',v_right,'resolved',v_right,
  'alreadyResolved',false)
  ||CASE WHEN v_right THEN jsonb_build_object('correctIndex',v.correct_index_snapshot,
      'explanation',v.explanation_snapshot,'reference',v.reference_snapshot)
  ELSE '{}'::jsonb END;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_p58_list(integer,integer,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.lms_p58_answer(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p58_list(integer,integer,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p58_answer(uuid,integer) TO authenticated;
DO $post$ BEGIN
 IF has_function_privilege('anon','public.lms_p58_list(integer,integer,uuid)','EXECUTE')
 OR has_function_privilege('anon','public.lms_p58_answer(uuid,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'P58 anonymous mistake RPC exposure'; END IF;
END $post$;
COMMIT;