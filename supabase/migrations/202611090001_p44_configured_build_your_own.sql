-- P44: protected 1..100-question Build Your Own; requires P29 and verified P4/P5.
-- SOURCE ONLY. Do not replay old migrations or apply to live DB without ledger review.
-- Existing 1..50 Quick 10, Timed, Domain, Level Up and P10 200/300 are unchanged.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.lms_p4_can_practice(uuid)') IS NULL
 OR to_regprocedure('public.lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)') IS NULL
 OR to_regprocedure('public.lms_p4_save_answer(uuid,uuid,integer)') IS NULL
 OR to_regprocedure('public.lms_p4_attempt_payload(uuid)') IS NULL
 OR to_regprocedure('public.lms_p4_finish_practice(uuid)') IS NULL
 OR to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NULL
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
  AND table_name='lms_questions' AND column_name='mock_candidate')
 THEN RAISE EXCEPTION 'P44 requires installed P4/P5/P29; inspect exact remote ledger'; END IF;
 IF to_regclass('public.lms_p44_custom_config') IS NOT NULL
 OR to_regprocedure('public.lms_p44_start_custom(uuid,integer,uuid,integer,integer,text,text,boolean,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P44_ALREADY_PRESENT_STOP_NO_REPLAY'; END IF;
END $$;

-- Extend storage only for custom mode. Existing modes remain max 50.
ALTER TABLE public.lms_practice_attempts
 DROP CONSTRAINT lms_practice_attempts_question_count_check;
ALTER TABLE public.lms_practice_attempts
 ADD CONSTRAINT lms_practice_attempts_question_count_check
 CHECK(question_count BETWEEN 1 AND CASE WHEN mode='custom' THEN 100 ELSE 50 END);
ALTER TABLE public.lms_practice_attempt_items
 DROP CONSTRAINT lms_practice_attempt_items_position_check;
ALTER TABLE public.lms_practice_attempt_items
 ADD CONSTRAINT lms_practice_attempt_items_position_check
 CHECK(position BETWEEN 1 AND 100);

CREATE TABLE public.lms_p44_custom_config (
 attempt_id uuid PRIMARY KEY REFERENCES public.lms_practice_attempts(id) ON DELETE CASCADE,
 feedback_timing text NOT NULL CHECK(feedback_timing IN ('each','end')),
 difficulty_policy text NOT NULL CHECK(difficulty_policy IN ('mixed','low','medium','high','adaptive')),
 per_question_seconds integer NOT NULL DEFAULT 0 CHECK(per_question_seconds=0 OR per_question_seconds BETWEEN 10 AND 600),
 camera_enabled boolean NOT NULL DEFAULT false,
 domain_id uuid REFERENCES public.lms_domains(id) ON DELETE RESTRICT,
 current_position integer NOT NULL DEFAULT 1 CHECK(current_position BETWEEN 1 AND 100),
 question_deadline_at timestamptz,
 tier text NOT NULL DEFAULT 'low' CHECK(tier IN ('low','medium','high')),
 tier_attempted integer NOT NULL DEFAULT 0 CHECK(tier_attempted BETWEEN 0 AND 100),
 tier_correct integer NOT NULL DEFAULT 0 CHECK(tier_correct BETWEEN 0 AND tier_attempted),
 low_checkpoint integer NOT NULL DEFAULT 1 CHECK(low_checkpoint BETWEEN 1 AND 100),
 medium_checkpoint integer NOT NULL DEFAULT 1 CHECK(medium_checkpoint BETWEEN 1 AND 100)
);
ALTER TABLE public.lms_p44_custom_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p44_custom_config FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_p44_custom_config TO service_role;

CREATE FUNCTION public.lms_p44_payload(p_attempt uuid) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_config public.lms_p44_custom_config%ROWTYPE;
BEGIN
 -- P4 verifies JWT ownership + entitlement and hides keys until submitted.
 SELECT * INTO v_config FROM public.lms_p44_custom_config WHERE attempt_id=p_attempt;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configured practice attempt not found'; END IF;
 RETURN public.lms_p4_attempt_payload(p_attempt)||jsonb_build_object(
  'feedbackTiming',v_config.feedback_timing,'difficultyPolicy',v_config.difficulty_policy,
  'perQuestionSeconds',v_config.per_question_seconds,'cameraEnabled',v_config.camera_enabled,
  'currentPosition',v_config.current_position,'questionDeadlineAt',v_config.question_deadline_at
 );
END $$;

CREATE FUNCTION public.lms_p44_start_custom(
 p_course_id uuid,p_count integer,p_request_id uuid,p_duration_seconds integer DEFAULT 0,
 p_per_question_seconds integer DEFAULT 0,p_difficulty text DEFAULT 'mixed',
 p_feedback text DEFAULT 'end',p_camera boolean DEFAULT false,p_domain_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());
DECLARE v_id uuid; v_mode text; v_course uuid; v_existing_count integer;
DECLARE v_available integer; v_low integer; v_medium integer; v_high integer;
DECLARE v_start timestamptz; v_question public.lms_questions%ROWTYPE;
DECLARE v_low_base integer; v_medium_base integer;
BEGIN
 IF v_user IS NULL OR p_course_id IS NULL OR p_request_id IS NULL
 THEN RAISE EXCEPTION 'Authenticated Course and request UUID required'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'Build Your Own requires 1..100 questions'; END IF;
 IF p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 0 AND 18000
 THEN RAISE EXCEPTION 'Total time must be 0..300 minutes'; END IF;
 IF p_per_question_seconds IS NULL OR (p_per_question_seconds<>0
   AND p_per_question_seconds NOT BETWEEN 10 AND 600)
 THEN RAISE EXCEPTION 'Time per question must be 10..600 seconds, or off'; END IF;
 IF p_difficulty IS NULL OR p_difficulty NOT IN ('mixed','low','medium','high','adaptive')
 OR p_feedback IS NULL OR p_feedback NOT IN ('each','end') OR p_camera IS NULL
 THEN RAISE EXCEPTION 'Invalid Practice configuration'; END IF;
 IF NOT public.lms_p4_can_practice(p_course_id)
 THEN RAISE EXCEPTION 'Published Course access required'; END IF;
 IF p_domain_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.lms_domains d WHERE d.id=p_domain_id AND d.course_id=p_course_id)
 THEN RAISE EXCEPTION 'Invalid Course Domain'; END IF;
 -- Serialize tab concurrency + retry of original UUID.
 PERFORM 1 FROM public.lms_profiles WHERE id=v_user FOR UPDATE;
 SELECT id,mode,course_id,question_count INTO v_id,v_mode,v_course,v_existing_count
 FROM public.lms_practice_attempts WHERE user_id=v_user AND client_request_id=p_request_id;
 IF v_id IS NOT NULL THEN
  IF v_mode<>'custom' OR v_course<>p_course_id OR v_existing_count<>p_count
   OR NOT EXISTS(SELECT 1 FROM public.lms_p44_custom_config s WHERE s.attempt_id=v_id)
  THEN RAISE EXCEPTION 'Request ID belongs to a different Practice configuration'; END IF;
  RETURN public.lms_p44_payload(v_id);
 END IF;
 -- Approved and active, NEVER exclusive Mock or staged mock candidates.
 SELECT count(*),count(*) FILTER(WHERE difficulty='low'),
  count(*) FILTER(WHERE difficulty='medium'),count(*) FILTER(WHERE difficulty='high')
 INTO v_available,v_low,v_medium,v_high
 FROM public.lms_questions q
 WHERE q.course_id=p_course_id AND q.approval_state='approved' AND q.is_active
 AND NOT q.mock_exclusive AND NOT q.mock_candidate
 AND (p_domain_id IS NULL OR q.domain_id=p_domain_id);
 IF p_difficulty='adaptive' THEN
  -- Conservative per-tier supply means no forced wrong-tier substitutions.
  IF least(v_low,v_medium,v_high)<p_count THEN
   RAISE EXCEPTION 'Adaptive Practice needs % approved, non-Mock questions in each difficulty. Available low %, medium %, high %.',p_count,v_low,v_medium,v_high;
  END IF;
 ELSIF p_difficulty='mixed' THEN
  IF v_available<p_count THEN
   RAISE EXCEPTION 'Not enough approved Practice questions: % available, % requested',v_available,p_count;
  END IF;
 ELSE
  SELECT count(*) INTO v_available FROM public.lms_questions q
   WHERE q.course_id=p_course_id AND q.approval_state='approved' AND q.is_active
    AND NOT q.mock_exclusive AND NOT q.mock_candidate AND q.difficulty=p_difficulty
    AND (p_domain_id IS NULL OR q.domain_id=p_domain_id);
  IF v_available<p_count THEN
   RAISE EXCEPTION 'Not enough approved questions at selected difficulty: % available, % requested',v_available,p_count;
  END IF;
 END IF;
 v_start:=clock_timestamp();
 INSERT INTO public.lms_practice_attempts(user_id,course_id,client_request_id,mode,question_count,deadline_at)
 VALUES(v_user,p_course_id,p_request_id,'custom',p_count,
  CASE WHEN p_duration_seconds>0 THEN v_start+make_interval(secs=>p_duration_seconds) ELSE NULL END)
 RETURNING id INTO v_id;
 v_low_base:=greatest(1,floor(p_count/3.0)::integer);
 v_medium_base:=greatest(1,floor((p_count-v_low_base)/2.0)::integer);
 INSERT INTO public.lms_p44_custom_config(
  attempt_id,feedback_timing,difficulty_policy,per_question_seconds,camera_enabled,
  domain_id,question_deadline_at,low_checkpoint,medium_checkpoint)
 VALUES(v_id,p_feedback,p_difficulty,p_per_question_seconds,p_camera,p_domain_id,
  CASE WHEN p_per_question_seconds>0 THEN v_start+make_interval(secs=>p_per_question_seconds) ELSE NULL END,
  v_low_base,v_medium_base);
 IF p_difficulty='adaptive' THEN
  SELECT * INTO v_question FROM public.lms_questions q
   WHERE q.course_id=p_course_id AND q.approval_state='approved' AND q.is_active
   AND NOT q.mock_exclusive AND NOT q.mock_candidate
   AND q.difficulty='low' AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
   ORDER BY random(),id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No approved Low question'; END IF;
  INSERT INTO public.lms_practice_attempt_items(
   attempt_id,position,question_id,prompt_snapshot,options_snapshot,
   correct_index_snapshot,explanation_snapshot)
  VALUES(v_id,1,v_question.id,v_question.prompt,v_question.options,
   v_question.correct_index,v_question.explanation);
 ELSE
  INSERT INTO public.lms_practice_attempt_items(
   attempt_id,position,question_id,prompt_snapshot,options_snapshot,
   correct_index_snapshot,explanation_snapshot)
  SELECT v_id,row_number() OVER(),picked.id,picked.prompt,picked.options,
   picked.correct_index,picked.explanation
  FROM(
   SELECT q.id,q.prompt,q.options,q.correct_index,q.explanation
   FROM public.lms_questions q
   WHERE q.course_id=p_course_id AND q.approval_state='approved' AND q.is_active
    AND NOT q.mock_exclusive AND NOT q.mock_candidate
    AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
    AND (p_difficulty='mixed' OR q.difficulty=p_difficulty)
   ORDER BY random(),q.id LIMIT p_count
  ) AS picked;
 END IF;
 RETURN public.lms_p44_payload(v_id);
END $$;

-- P4 direct save must never bypass P44 question-deadline, position, or once-only policy.
-- Existing legacy P4 sessions retain their original behavior.
CREATE OR REPLACE FUNCTION public.lms_p4_save_answer(p_attempt_id uuid,p_question_id uuid,p_selected_index integer)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE v_options jsonb; v_correct_index smallint; v_explanation text;
DECLARE v_previous smallint; v_answered_at timestamptz;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p44_custom_config s WHERE s.attempt_id=a.id)
 THEN RAISE EXCEPTION 'Configured Practice requires its protected P44 answer endpoint'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state<>'in_progress' OR (a.deadline_at IS NOT NULL AND clock_timestamp()>=a.deadline_at)
 THEN RAISE EXCEPTION 'This attempt is closed or time has expired'; END IF;
 SELECT options_snapshot,correct_index_snapshot,explanation_snapshot,selected_index,answered_at
 INTO v_options,v_correct_index,v_explanation,v_previous,v_answered_at
 FROM public.lms_practice_attempt_items
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 IF v_options IS NULL THEN RAISE EXCEPTION 'Question is not assigned to this attempt'; END IF;
 IF p_selected_index IS NOT NULL AND (p_selected_index<0 OR p_selected_index>=jsonb_array_length(v_options))
 THEN RAISE EXCEPTION 'Invalid answer option'; END IF;
 IF a.mode='quick10' AND p_selected_index IS NULL
 THEN RAISE EXCEPTION 'Quick 10 requires a selected option'; END IF;
 IF a.mode='quick10' AND v_answered_at IS NOT NULL THEN
  IF v_previous IS DISTINCT FROM p_selected_index
  THEN RAISE EXCEPTION 'Quick 10 answers cannot be changed after feedback'; END IF;
 ELSE
  UPDATE public.lms_practice_attempt_items
   SET selected_index=p_selected_index,answered_at=clock_timestamp()
   WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 END IF;
 RETURN jsonb_build_object('saved',true,'serverNow',clock_timestamp())
  || CASE WHEN a.mode='quick10' THEN jsonb_build_object(
    'correctIndex',v_correct_index,'explanation',v_explanation)
  ELSE '{}'::jsonb END;
END $$;

CREATE FUNCTION public.lms_p44_answer(
 p_attempt_id uuid,p_question_id uuid,p_selected_index integer
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE s public.lms_p44_custom_config%ROWTYPE;
DECLARE i public.lms_practice_attempt_items%ROWTYPE;
DECLARE v_result jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
  WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR a.mode<>'custom' THEN RAISE EXCEPTION 'Configured attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access inactive'; END IF;
 SELECT * INTO s FROM public.lms_p44_custom_config WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configured attempt settings missing'; END IF;
 SELECT * INTO i FROM public.lms_practice_attempt_items
  WHERE attempt_id=a.id AND question_id=p_question_id FOR UPDATE;
 IF NOT FOUND OR i.position<>s.current_position THEN RAISE EXCEPTION 'Answer the current question in order'; END IF;
 IF p_selected_index IS NULL OR p_selected_index<0 OR
  p_selected_index>=jsonb_array_length(i.options_snapshot) THEN RAISE EXCEPTION 'Choose a valid option'; END IF;
 IF a.state<>'in_progress' OR (a.deadline_at IS NOT NULL AND clock_timestamp()>=a.deadline_at)
  OR (s.question_deadline_at IS NOT NULL AND clock_timestamp()>=s.question_deadline_at)
 THEN RAISE EXCEPTION 'Question or session time expired'; END IF;
 IF i.answered_at IS NOT NULL THEN
  IF i.selected_index IS DISTINCT FROM p_selected_index
  THEN RAISE EXCEPTION 'Submitted answer cannot be changed'; END IF;
 ELSE
  UPDATE public.lms_practice_attempt_items
   SET selected_index=p_selected_index,answered_at=clock_timestamp()
   WHERE attempt_id=a.id AND question_id=i.question_id;
 END IF;
 v_result:=public.lms_p44_payload(a.id);
 IF s.feedback_timing='each' THEN
  v_result:=v_result||jsonb_build_object('feedback',jsonb_build_object(
   'questionId',i.question_id,'correctIndex',i.correct_index_snapshot,
   'explanation',i.explanation_snapshot));
 END IF;
 RETURN v_result;
END $$;

CREATE FUNCTION public.lms_p44_next(p_attempt_id uuid)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE s public.lms_p44_custom_config%ROWTYPE;
DECLARE i public.lms_practice_attempt_items%ROWTYPE;
DECLARE q public.lms_questions%ROWTYPE;
DECLARE v_tier text; v_count integer; v_correct integer; v_needed integer;
DECLARE v_now timestamptz;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
  WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR a.mode<>'custom' THEN RAISE EXCEPTION 'Configured attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access inactive'; END IF;
 IF a.state<>'in_progress' THEN RETURN public.lms_p44_payload(a.id); END IF;
 SELECT * INTO s FROM public.lms_p44_custom_config WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configured session settings missing'; END IF;
 v_now:=clock_timestamp();
 IF a.deadline_at IS NOT NULL AND v_now>=a.deadline_at
 THEN RETURN public.lms_p4_finish_practice(a.id); END IF;
 SELECT * INTO i FROM public.lms_practice_attempt_items
  WHERE attempt_id=a.id AND position=s.current_position FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current question missing'; END IF;
 -- Unanswered questions may be skipped, including on per-question timeout.
 IF i.answered_at IS NULL THEN
  UPDATE public.lms_practice_attempt_items
   SET answered_at=v_now WHERE attempt_id=a.id AND question_id=i.question_id;
 END IF;
 IF s.current_position>=a.question_count THEN
  RETURN public.lms_p4_finish_practice(a.id);
 END IF;
 v_tier:=s.tier;
 IF s.difficulty_policy='adaptive' THEN
  v_count:=s.tier_attempted+1;
  v_correct:=s.tier_correct+
   CASE WHEN i.selected_index=i.correct_index_snapshot THEN 1 ELSE 0 END;
  v_needed:=CASE WHEN s.tier='medium' THEN s.medium_checkpoint ELSE s.low_checkpoint END;
  IF v_tier<>'high' AND v_count>=v_needed AND v_correct*10>=v_needed*7 THEN
   v_tier:=CASE WHEN v_tier='low' THEN 'medium' ELSE 'high' END;
   v_count:=0; v_correct:=0;
  END IF;
  SELECT * INTO q FROM public.lms_questions x
   WHERE x.course_id=a.course_id AND x.approval_state='approved' AND x.is_active
    AND NOT x.mock_exclusive AND NOT x.mock_candidate
    AND x.difficulty=v_tier AND (s.domain_id IS NULL OR x.domain_id=s.domain_id)
    AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items z
      WHERE z.attempt_id=a.id AND z.question_id=x.id)
   ORDER BY random(),x.id LIMIT 1;
  IF q.id IS NULL THEN RAISE EXCEPTION 'No unused approved question in current difficulty tier'; END IF;
  INSERT INTO public.lms_practice_attempt_items(
   attempt_id,position,question_id,prompt_snapshot,options_snapshot,
   correct_index_snapshot,explanation_snapshot)
  VALUES(a.id,s.current_position+1,q.id,q.prompt,q.options,q.correct_index,q.explanation);
 END IF;
 UPDATE public.lms_p44_custom_config
  SET current_position=s.current_position+1,tier=v_tier,
   tier_attempted=CASE WHEN s.difficulty_policy='adaptive' THEN v_count ELSE 0 END,
   tier_correct=CASE WHEN s.difficulty_policy='adaptive' THEN v_correct ELSE 0 END,
   question_deadline_at=CASE WHEN s.per_question_seconds>0
    THEN v_now+make_interval(secs=>s.per_question_seconds) ELSE NULL END
 WHERE attempt_id=a.id;
 RETURN public.lms_p44_payload(a.id);
END $$;

DO $$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
 'lms_p44_payload(uuid)',
 'lms_p44_start_custom(uuid,integer,uuid,integer,integer,text,text,boolean,uuid)',
 'lms_p44_answer(uuid,uuid,integer)',
 'lms_p44_next(uuid)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',sig);
 END LOOP;
END $$;
COMMIT;
