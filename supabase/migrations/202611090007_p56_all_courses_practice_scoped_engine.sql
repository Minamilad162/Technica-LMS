BEGIN;
DO $pre$ BEGIN
 IF to_regclass('public.lms_p56_attempt_courses') IS NOT NULL THEN RAISE EXCEPTION 'P56 already installed'; END IF;
 IF to_regprocedure('public.lms_p8_checkpoint(integer)') IS NULL OR to_regclass('public.lms_p44_custom_config') IS NULL THEN RAISE EXCEPTION 'P56 missing P8/P44'; END IF;
END $pre$;
CREATE TABLE public.lms_p56_attempt_courses(
 attempt_id uuid NOT NULL REFERENCES public.lms_practice_attempts(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id),
 PRIMARY KEY(attempt_id,course_id));
ALTER TABLE public.lms_p56_attempt_courses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p56_attempt_courses FROM PUBLIC,anon,authenticated;
CREATE INDEX lms_p56_scope_course_idx ON public.lms_p56_attempt_courses(course_id);
CREATE FUNCTION public.lms_p56_eligible_courses()
 RETURNS TABLE(course_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $fn$ SELECT c.id FROM public.lms_courses c
 WHERE public.lms_p4_can_practice(c.id)
 AND EXISTS(SELECT 1 FROM public.lms_questions q WHERE q.course_id=c.id
 AND q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate)
 ORDER BY c.id $fn$;
REVOKE ALL ON FUNCTION public.lms_p56_eligible_courses() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p56_attempt_accessible(p_attempt uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $fn$ SELECT EXISTS(SELECT 1 FROM public.lms_practice_attempts a
 WHERE a.id=p_attempt AND a.user_id=(SELECT auth.uid())
 AND public.lms_p4_can_practice(a.course_id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p56_attempt_courses sc
 WHERE sc.attempt_id=a.id AND NOT public.lms_p4_can_practice(sc.course_id))) $fn$;
REVOKE ALL ON FUNCTION public.lms_p56_attempt_accessible(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p56_all_readiness(p_count integer)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
 AS $fn$
DECLARE v_low integer;v_med integer;v_high integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=(SELECT auth.uid()) AND account_status='active') THEN RAISE EXCEPTION 'Active account required'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid question count'; END IF;
 SELECT count(*) FILTER(WHERE difficulty='low'),count(*) FILTER(WHERE difficulty='medium'),count(*) FILTER(WHERE difficulty='high')
 INTO v_low,v_med,v_high FROM public.lms_questions q JOIN public.lms_p56_eligible_courses() c ON c.course_id=q.course_id
 WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate;
 RETURN jsonb_build_object('ready',least(v_low,v_med,v_high)>=p_count,
 'low',v_low,'medium',v_med,'high',v_high,'requiredPerTier',p_count,
 'checkpoint',public.lms_p8_checkpoint(p_count),'mediumCheckpoint',public.lms_p8_medium_checkpoint(p_count),
 'lowRequiredCorrect',ceil(public.lms_p8_checkpoint(p_count)*0.7)::integer,
 'mediumRequiredCorrect',ceil(public.lms_p8_medium_checkpoint(p_count)*0.7)::integer,
 'policyVersion','thirds-fixed-correct-v2','thresholdPercent',70);
END $fn$;

CREATE FUNCTION public.lms_p56_start_all(p_mode text,p_count integer,p_request_id uuid,p_duration_seconds integer DEFAULT 0,
 p_per_question_seconds integer DEFAULT 0,p_difficulty text DEFAULT 'mixed',p_feedback text DEFAULT 'end',p_camera boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
 AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid());v_anchor uuid;v_id uuid;v_existing public.lms_practice_attempts%ROWTYPE;
DECLARE v_count integer;v_low integer;v_medium integer;v_high integer;v_start timestamptz;v_question public.lms_questions%ROWTYPE;
DECLARE v_config public.lms_p44_custom_config%ROWTYPE;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=v_user AND account_status='active') THEN RAISE EXCEPTION 'Active LMS account required'; END IF;
 IF p_request_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('quick10','timed25','levelup','custom') THEN RAISE EXCEPTION 'Unsupported All Courses mode'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND (CASE WHEN p_mode='custom' THEN 100 ELSE 50 END) THEN RAISE EXCEPTION 'Invalid question count'; END IF;
 IF (p_mode='quick10' AND p_count<>10) OR (p_mode='timed25' AND p_count<>25) THEN RAISE EXCEPTION 'Preset question count mismatch'; END IF;
 IF p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 0 AND (CASE WHEN p_mode='custom' THEN 18000 ELSE 10800 END)
 OR (p_mode='quick10' AND p_duration_seconds<>0) OR (p_mode='timed25' AND p_duration_seconds<>1200) THEN RAISE EXCEPTION 'Invalid timer'; END IF;
 IF p_per_question_seconds IS NULL OR (p_per_question_seconds<>0 AND p_per_question_seconds NOT BETWEEN 10 AND 600)
 OR (p_mode<>'custom' AND p_per_question_seconds<>0) OR p_difficulty IS NULL OR p_difficulty NOT IN ('mixed','low','medium','high','adaptive')
 OR (p_mode<>'custom' AND p_difficulty<>'mixed') OR p_feedback IS NULL OR p_feedback NOT IN ('each','end') OR p_camera IS NULL
 THEN RAISE EXCEPTION 'Invalid Practice configuration'; END IF;
 PERFORM 1 FROM public.lms_profiles WHERE id=v_user FOR UPDATE;
 SELECT * INTO v_existing FROM public.lms_practice_attempts WHERE user_id=v_user AND client_request_id=p_request_id;
 IF FOUND THEN
  IF v_existing.mode<>p_mode OR v_existing.question_count<>p_count
  OR NOT EXISTS(SELECT 1 FROM public.lms_p56_attempt_courses WHERE attempt_id=v_existing.id)
  THEN RAISE EXCEPTION 'Request ID is already used by a different Practice'; END IF;
  IF p_mode='custom' THEN
   SELECT * INTO v_config FROM public.lms_p44_custom_config WHERE attempt_id=v_existing.id;
   IF NOT FOUND OR v_config.difficulty_policy<>p_difficulty OR v_config.feedback_timing<>p_feedback
    OR v_config.per_question_seconds<>p_per_question_seconds OR v_config.camera_enabled<>p_camera
   THEN RAISE EXCEPTION 'Request ID conflicts with configured settings'; END IF;
   RETURN public.lms_p44_payload(v_existing.id);
  END IF;
  RETURN public.lms_p4_attempt_payload(v_existing.id);
 END IF;
 SELECT c.course_id INTO v_anchor FROM public.lms_p56_eligible_courses() c LIMIT 1;
 IF v_anchor IS NULL THEN RAISE EXCEPTION 'No accessible course with approved Practice questions'; END IF;
 SELECT count(*)::integer,count(*) FILTER(WHERE difficulty='low')::integer,
 count(*) FILTER(WHERE difficulty='medium')::integer,count(*) FILTER(WHERE difficulty='high')::integer
 INTO v_count,v_low,v_medium,v_high
 FROM public.lms_questions q JOIN public.lms_p56_eligible_courses() c ON c.course_id=q.course_id
 WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
 AND (p_mode<>'custom' OR p_difficulty IN ('mixed','adaptive') OR q.difficulty=p_difficulty);
 IF p_mode='levelup' OR (p_mode='custom' AND p_difficulty='adaptive') THEN
  IF least(v_low,v_medium,v_high)<p_count THEN RAISE EXCEPTION 'All Courses adaptive requires % approved questions per tier. Low %, Medium %, High %',p_count,v_low,v_medium,v_high; END IF;
 ELSIF v_count<p_count THEN RAISE EXCEPTION 'Not enough approved Practice questions: % available, % requested',v_count,p_count; END IF;
 v_start:=clock_timestamp();
 INSERT INTO public.lms_practice_attempts(user_id,course_id,client_request_id,mode,question_count,deadline_at)
 VALUES(v_user,v_anchor,p_request_id,p_mode,p_count,
 CASE WHEN p_duration_seconds>0 THEN v_start+make_interval(secs=>p_duration_seconds) ELSE NULL END) RETURNING id INTO v_id;
 INSERT INTO public.lms_p56_attempt_courses(attempt_id,course_id)
 SELECT v_id,c.course_id FROM public.lms_p56_eligible_courses() c;
 IF p_mode='levelup' THEN
  INSERT INTO public.lms_practice_adaptive_state(attempt_id,checkpoint_size,medium_checkpoint_size,promotion_policy)
  VALUES(v_id,public.lms_p8_checkpoint(p_count),public.lms_p8_medium_checkpoint(p_count),'thirds-fixed-correct-v2');
 ELSIF p_mode='custom' THEN
  INSERT INTO public.lms_p44_custom_config(attempt_id,feedback_timing,difficulty_policy,per_question_seconds,camera_enabled,
  question_deadline_at,low_checkpoint,medium_checkpoint)
  VALUES(v_id,p_feedback,p_difficulty,p_per_question_seconds,p_camera,
   CASE WHEN p_per_question_seconds>0 THEN v_start+make_interval(secs=>p_per_question_seconds) ELSE NULL END,
   greatest(1,floor(p_count/3.0)::integer),
   greatest(1,floor((p_count-greatest(1,floor(p_count/3.0)::integer))/2.0)::integer));
 END IF;
 IF p_mode='levelup' OR (p_mode='custom' AND p_difficulty='adaptive') THEN
  SELECT q.* INTO v_question FROM public.lms_questions q
  JOIN public.lms_p56_attempt_courses s ON s.attempt_id=v_id AND s.course_id=q.course_id
  WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
  AND q.difficulty='low' ORDER BY random(),q.id LIMIT 1;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'No reviewed Low question'; END IF;
  INSERT INTO public.lms_practice_attempt_items(attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot)
  VALUES(v_id,1,v_question.id,v_question.prompt,v_question.options,v_question.correct_index,v_question.explanation);
 ELSE
  WITH ranked AS (
   SELECT q.id,q.prompt,q.options,q.correct_index,q.explanation,
   row_number() OVER (PARTITION BY q.course_id ORDER BY random(),q.id) as round_no,random() as draw
   FROM public.lms_questions q JOIN public.lms_p56_attempt_courses s ON s.attempt_id=v_id AND s.course_id=q.course_id
   WHERE q.approval_state='approved' AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
   AND (p_mode<>'custom' OR p_difficulty='mixed' OR q.difficulty=p_difficulty)
  ), picked AS (SELECT * FROM ranked ORDER BY round_no,draw,id LIMIT p_count)
  INSERT INTO public.lms_practice_attempt_items(attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot)
  SELECT v_id,row_number() OVER(ORDER BY round_no,draw,id)::integer,id,prompt,options,correct_index,explanation FROM picked;
 END IF;
 IF p_mode='custom' THEN RETURN public.lms_p44_payload(v_id); END IF;
 RETURN public.lms_p4_attempt_payload(v_id);
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_p44_answer(p_attempt_id uuid, p_question_id uuid, p_selected_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE s public.lms_p44_custom_config%ROWTYPE;
DECLARE i public.lms_practice_attempt_items%ROWTYPE;
DECLARE v_result jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
  WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR a.mode<>'custom' THEN RAISE EXCEPTION 'Configured attempt unavailable'; END IF;
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access inactive'; END IF;
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
END $function$;
CREATE OR REPLACE FUNCTION public.lms_p44_next(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access inactive'; END IF;
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
   WHERE (x.course_id=a.course_id OR EXISTS(SELECT 1 FROM public.lms_p56_attempt_courses sc WHERE sc.attempt_id=a.id AND sc.course_id=x.course_id)) AND x.approval_state='approved' AND x.is_active
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
END $function$;
CREATE OR REPLACE FUNCTION public.lms_p4_attempt_payload(p_attempt uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE entries jsonb;
BEGIN
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt AND user_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 -- A user who exits fullscreen is removed from question and answer review;
 -- even guessing the old attempt ID never reveals the reserved snapshots.
 IF a.state='abandoned' THEN
   RETURN jsonb_build_object('attemptId',a.id,'state','abandoned',
      'questions','[]'::jsonb,'serverNow',clock_timestamp());
 END IF;
 SELECT coalesce(jsonb_agg(
   jsonb_build_object('id',i.question_id,'position',i.position,'prompt',i.prompt_snapshot,
     'options',i.options_snapshot,'selectedIndex',i.selected_index)
   || CASE WHEN a.state='in_progress' THEN '{}'::jsonb ELSE
       jsonb_build_object('correctIndex',i.correct_index_snapshot,'explanation',i.explanation_snapshot) END
   ORDER BY i.position),'[]'::jsonb)
 INTO entries FROM public.lms_practice_attempt_items i WHERE i.attempt_id=a.id;
 RETURN jsonb_build_object('attemptId',a.id,'courseId',a.course_id,'mode',a.mode,
   'state',a.state,'startedAt',a.started_at,'deadlineAt',a.deadline_at,
   'serverNow',clock_timestamp(),'questionCount',a.question_count,
   'submittedAt',a.submitted_at,'correctCount',a.correct_count,
   'scorePercent',a.score_percent,'questions',entries);
END; $function$;
CREATE OR REPLACE FUNCTION public.lms_p4_finish_practice(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public.lms_practice_attempts%ROWTYPE; v_correct integer; v_answered integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state='in_progress' THEN
  IF a.mode='levelup' THEN
   SELECT answered_count INTO v_answered FROM public.lms_practice_adaptive_state
    WHERE attempt_id=a.id;
   IF v_answered IS NULL THEN RAISE EXCEPTION 'Adaptive state missing'; END IF;
   IF v_answered<a.question_count AND
      (a.deadline_at IS NULL OR clock_timestamp()<a.deadline_at) THEN
    RAISE EXCEPTION 'Answer all adaptive questions before finishing'; END IF;
  END IF;
  SELECT count(*) INTO v_correct FROM public.lms_practice_attempt_items
   WHERE attempt_id=a.id AND selected_index=correct_index_snapshot;
  UPDATE public.lms_practice_attempts SET
   state=CASE WHEN deadline_at IS NOT NULL AND clock_timestamp()>=deadline_at
      THEN 'expired' ELSE 'submitted' END,
   submitted_at=clock_timestamp(),correct_count=v_correct,
   score_percent=round(v_correct*100.0/question_count,2)
  WHERE id=a.id;
 END IF;
 RETURN public.lms_p4_attempt_payload(a.id);
END; $function$;
CREATE OR REPLACE FUNCTION public.lms_p4_save_answer(p_attempt_id uuid, p_question_id uuid, p_selected_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
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
END $function$;
CREATE OR REPLACE FUNCTION public.lms_p8_answer_levelup(p_attempt_id uuid, p_question_id uuid, p_selected_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE s public.lms_practice_adaptive_state%ROWTYPE;
DECLARE i public.lms_practice_attempt_items%ROWTYPE;
DECLARE q public.lms_questions%ROWTYPE;
DECLARE v_tier text; v_tier_correct integer; v_tier_attempted integer;
DECLARE v_answered integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR a.mode<>'levelup' THEN RAISE EXCEPTION 'Adaptive attempt unavailable'; END IF;
 IF NOT public.lms_p56_attempt_accessible(a.id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state<>'in_progress' OR (a.deadline_at IS NOT NULL AND clock_timestamp()>=a.deadline_at) THEN
  RAISE EXCEPTION 'Adaptive attempt is closed or expired'; END IF;
 SELECT * INTO s FROM public.lms_practice_adaptive_state WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing protected adaptive state'; END IF;
 SELECT * INTO i FROM public.lms_practice_attempt_items
 WHERE attempt_id=a.id AND question_id=p_question_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Question was not assigned to this attempt'; END IF;
 IF p_selected_index IS NULL OR p_selected_index<0 OR
     p_selected_index>=jsonb_array_length(i.options_snapshot) THEN
  RAISE EXCEPTION 'Choose one valid answer'; END IF;
 -- Idempotent network retry for same answer; no stage advancement twice.
 IF i.answered_at IS NOT NULL THEN
  IF i.selected_index IS DISTINCT FROM p_selected_index THEN
    RAISE EXCEPTION 'Adaptive answer is immutable after submission'; END IF;
  RETURN public.lms_p4_attempt_payload(a.id);
 END IF;
 IF i.position <> s.answered_count+1 THEN
  RAISE EXCEPTION 'Answer the current adaptive question in sequence'; END IF;
 UPDATE public.lms_practice_attempt_items
  SET selected_index=p_selected_index,answered_at=clock_timestamp()
  WHERE attempt_id=a.id AND question_id=i.question_id;
 v_answered:=s.answered_count+1;
 v_tier_attempted:=s.tier_attempted+1;
 v_tier_correct:=s.tier_correct+
   CASE WHEN p_selected_index=i.correct_index_snapshot THEN 1 ELSE 0 END;
 v_tier:=s.tier;
 -- Cumulative within this stage; recoveries after early mistakes count.
 IF v_tier<>'high'
    AND v_tier_attempted >= (CASE
      WHEN v_tier='medium' THEN coalesce(s.medium_checkpoint_size,s.checkpoint_size)
      ELSE s.checkpoint_size END)
    AND (
      (s.promotion_policy='thirds-fixed-correct-v2'
        AND v_tier_correct*10 >= (CASE
          WHEN v_tier='medium' THEN coalesce(s.medium_checkpoint_size,s.checkpoint_size)
          ELSE s.checkpoint_size END)*7)
      OR
      (s.promotion_policy IS NULL
        AND v_tier_correct*10>=v_tier_attempted*7)
    ) THEN
  v_tier:=CASE WHEN v_tier='low' THEN 'medium' ELSE 'high' END;
  v_tier_attempted:=0;
  v_tier_correct:=0;
 END IF;
 UPDATE public.lms_practice_adaptive_state SET tier=v_tier,
  tier_attempted=v_tier_attempted,tier_correct=v_tier_correct,answered_count=v_answered
 WHERE attempt_id=a.id;
 IF v_answered<a.question_count THEN
  -- Never select an unclassified/draft/mock-exclusive item. Avoid repeats,
  -- including previously answered tiers; error rolls back entire transaction.
  SELECT * INTO q FROM public.lms_questions x
  WHERE (x.course_id=a.course_id OR EXISTS(SELECT 1 FROM public.lms_p56_attempt_courses sc WHERE sc.attempt_id=a.id AND sc.course_id=x.course_id)) AND x.approval_state='approved' AND NOT x.mock_exclusive AND x.is_active AND NOT x.mock_candidate
   AND x.difficulty=v_tier AND (s.domain_id IS NULL OR x.domain_id=s.domain_id)
   AND NOT EXISTS(
    SELECT 1 FROM public.lms_practice_attempt_items z
    WHERE z.attempt_id=a.id AND z.question_id=x.id
   )
  ORDER BY random(),x.id LIMIT 1;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Insufficient reviewed questions in active difficulty tier'; END IF;
  INSERT INTO public.lms_practice_attempt_items(
   attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot
  ) VALUES(a.id,v_answered+1,q.id,q.prompt,q.options,q.correct_index,q.explanation);
 END IF;
 -- In-progress payload excludes answer keys and hidden tier labels.
 RETURN public.lms_p4_attempt_payload(a.id);
END; $function$;

REVOKE ALL ON FUNCTION public.lms_p56_all_readiness(integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.lms_p56_start_all(text,integer,uuid,integer,integer,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p56_all_readiness(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p56_start_all(text,integer,uuid,integer,integer,text,text,boolean) TO authenticated;
DO $post$ BEGIN
 IF has_function_privilege('anon','public.lms_p56_start_all(text,integer,uuid,integer,integer,text,text,boolean)','EXECUTE')
 OR has_function_privilege('anon','public.lms_p56_all_readiness(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'P56 public RPC leak'; END IF;
END $post$;
COMMIT;