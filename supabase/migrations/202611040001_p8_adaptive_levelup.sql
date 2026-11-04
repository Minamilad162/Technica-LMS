-- Technica LMS P8: secure proportional Adaptive / Level Up practice.
-- SOURCE ONLY / STAGING AFTER OWNER APPROVAL, after P1,P2,P4,P5.
-- Never run in CHEIRON, or automatically against production.
-- No question import, no rating/approval update, no Mock modification.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_practice_attempts') IS NULL
   OR to_regclass('public.lms_practice_attempt_items') IS NULL
   OR to_regclass('public.lms_questions') IS NULL
   OR to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NULL
   OR to_regprocedure('public.lms_p4_attempt_payload(uuid)') IS NULL THEN
  RAISE EXCEPTION 'P8 requires full P4/P5 with secure abandon and payload RPCs';
 END IF;
 IF to_regclass('public.lms_practice_adaptive_state') IS NOT NULL
  OR to_regprocedure('public.lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)') IS NOT NULL THEN
  RAISE EXCEPTION 'P8 appears installed; stop to avoid overwriting existing production state';
 END IF;
END $$;

ALTER TABLE public.lms_practice_attempts DROP CONSTRAINT lms_practice_attempts_mode_check;
ALTER TABLE public.lms_practice_attempts ADD CONSTRAINT lms_practice_attempts_mode_check
 CHECK(mode IN ('quick10','timed25','custom','domain','levelup'));

-- Counters are server-owned and serialized through the attempt row FOR UPDATE.
-- Answers stay in P4 private snapshot tables; no anonymous or browser GRANTs.
CREATE TABLE public.lms_practice_adaptive_state (
 attempt_id uuid PRIMARY KEY REFERENCES public.lms_practice_attempts(id) ON DELETE CASCADE,
 domain_id uuid REFERENCES public.lms_domains(id) ON DELETE RESTRICT,
 tier text NOT NULL DEFAULT 'low' CHECK(tier IN ('low','medium','high')),
 checkpoint_size integer NOT NULL CHECK(checkpoint_size BETWEEN 1 AND 50),
 tier_attempted integer NOT NULL DEFAULT 0 CHECK(tier_attempted BETWEEN 0 AND 50),
 tier_correct integer NOT NULL DEFAULT 0 CHECK(tier_correct BETWEEN 0 AND tier_attempted),
 answered_count integer NOT NULL DEFAULT 0 CHECK(answered_count BETWEEN 0 AND 50)
);
ALTER TABLE public.lms_practice_adaptive_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_practice_adaptive_state FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.lms_practice_adaptive_state TO service_role;

-- Fractional checkpoint = ceil(20% of requested question count), minimum 3;
-- short sessions smaller than 3 cannot magically guarantee all 3 tiers.
CREATE FUNCTION public.lms_p8_checkpoint(p_count integer) RETURNS integer
 LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT least(p_count,greatest(3,ceil(p_count/5.0)::integer))
 WHERE p_count BETWEEN 1 AND 50;
$$;
REVOKE ALL ON FUNCTION public.lms_p8_checkpoint(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p8_checkpoint(integer) TO service_role;

-- Read-only readiness: disclose tier COUNTS only to active course-eligible JWTs.
-- Preflight requires p_count approved, non-mock questions in EACH tier.
-- This strict check guarantees uninterrupted completion even when a learner
-- stays at Low or Medium for the entire attempt (no unsafe fallback tiers).
CREATE FUNCTION public.lms_p8_levelup_readiness(
 p_course_id uuid,p_count integer,p_domain_id uuid DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_low integer; v_med integer; v_high integer; v_ready boolean;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p4_can_practice(p_course_id) THEN
  RAISE EXCEPTION 'Active course access required'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'Question count must be 1..50'; END IF;
 IF p_domain_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.lms_domains
  WHERE id=p_domain_id AND course_id=p_course_id
 ) THEN RAISE EXCEPTION 'Domain does not belong to selected course'; END IF;
 SELECT
  count(*) FILTER(WHERE difficulty='low'),
  count(*) FILTER(WHERE difficulty='medium'),
  count(*) FILTER(WHERE difficulty='high')
 INTO v_low,v_med,v_high
 FROM public.lms_questions
 WHERE course_id=p_course_id AND approval_state='approved'
   AND NOT mock_exclusive AND (p_domain_id IS NULL OR domain_id=p_domain_id);
 v_ready:=v_low>=p_count AND v_med>=p_count AND v_high>=p_count;
 RETURN jsonb_build_object('ready',v_ready,'low',v_low,'medium',v_med,'high',v_high,
   'requiredPerTier',p_count,'checkpoint',public.lms_p8_checkpoint(p_count),
   'thresholdPercent',70);
END; $$;

CREATE FUNCTION public.lms_p8_start_levelup(
 p_course_id uuid,p_count integer,p_request_id uuid,p_domain_id uuid DEFAULT NULL,
 p_duration_seconds integer DEFAULT 0
) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid());
DECLARE v_id uuid; v_existing_mode text; v_question public.lms_questions%ROWTYPE;
DECLARE v_ready jsonb; v_deadline timestamptz;
BEGIN
 IF v_user IS NULL OR p_request_id IS NULL OR p_course_id IS NULL THEN
  RAISE EXCEPTION 'Verified account, course and request UUID required'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'Question count must be 1..50'; END IF;
 IF p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 0 AND 10800 THEN
  RAISE EXCEPTION 'Duration must be 0..10800 seconds'; END IF;
 IF NOT public.lms_p4_can_practice(p_course_id) THEN RAISE EXCEPTION 'Active course access required'; END IF;
 -- Same per-user request id serializes concurrently started browser tabs.
 PERFORM 1 FROM public.lms_profiles WHERE id=v_user FOR UPDATE;
 SELECT id,mode INTO v_id,v_existing_mode FROM public.lms_practice_attempts
 WHERE user_id=v_user AND client_request_id=p_request_id;
 IF v_id IS NOT NULL THEN
  IF v_existing_mode<>'levelup' THEN RAISE EXCEPTION 'Request ID already used for another mode'; END IF;
  RETURN public.lms_p4_attempt_payload(v_id);
 END IF;
 v_ready:=public.lms_p8_levelup_readiness(p_course_id,p_count,p_domain_id);
 IF NOT (v_ready->>'ready')::boolean THEN
  RAISE EXCEPTION 'Not enough reviewed Low/Medium/High questions. Each tier needs at least % eligible non-Mock questions.',p_count;
 END IF;
 v_deadline:=CASE WHEN p_duration_seconds>0
  THEN clock_timestamp()+make_interval(secs=>p_duration_seconds) ELSE NULL END;
 INSERT INTO public.lms_practice_attempts(user_id,course_id,client_request_id,mode,question_count,deadline_at)
 VALUES(v_user,p_course_id,p_request_id,'levelup',p_count,v_deadline) RETURNING id INTO v_id;
 INSERT INTO public.lms_practice_adaptive_state(attempt_id,domain_id,checkpoint_size)
 VALUES(v_id,p_domain_id,public.lms_p8_checkpoint(p_count));
 SELECT * INTO v_question FROM public.lms_questions
 WHERE course_id=p_course_id AND approval_state='approved' AND NOT mock_exclusive
  AND difficulty='low' AND (p_domain_id IS NULL OR domain_id=p_domain_id)
 ORDER BY random(),id LIMIT 1;
 IF v_question.id IS NULL THEN RAISE EXCEPTION 'No eligible Low question available'; END IF;
 INSERT INTO public.lms_practice_attempt_items(
  attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot
 ) VALUES(v_id,1,v_question.id,v_question.prompt,v_question.options,
  v_question.correct_index,v_question.explanation);
 RETURN public.lms_p4_attempt_payload(v_id);
END; $$;

-- One answer at a time, strictly in assigned position; immutable once saved.
-- Next difficulty is computed AFTER grading the current item on the server.
CREATE FUNCTION public.lms_p8_answer_levelup(
 p_attempt_id uuid,p_question_id uuid,p_selected_index integer
) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
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
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
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
    AND v_tier_attempted>=s.checkpoint_size
    AND v_tier_correct*10>=v_tier_attempted*7 THEN
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
  WHERE x.course_id=a.course_id AND x.approval_state='approved' AND NOT x.mock_exclusive
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
END; $$;

-- Preserve all P4 modes and Quick10 feedback, but block direct P4 answer RPC
-- from bypassing adaptive order, immutable answer and progression.
CREATE OR REPLACE FUNCTION public.lms_p4_save_answer(
 p_attempt_id uuid,p_question_id uuid,p_selected_index integer
) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE v_options jsonb;
DECLARE v_correct_index smallint;
DECLARE v_explanation text;
DECLARE v_previous smallint;
DECLARE v_answered_at timestamptz;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF a.mode='levelup' THEN RAISE EXCEPTION 'Adaptive answers require the protected Level Up RPC'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state<>'in_progress' OR (a.deadline_at IS NOT NULL AND clock_timestamp()>=a.deadline_at) THEN
   RAISE EXCEPTION 'This attempt is closed or time has expired'; END IF;
 SELECT options_snapshot,correct_index_snapshot,explanation_snapshot,selected_index,answered_at
 INTO v_options,v_correct_index,v_explanation,v_previous,v_answered_at
 FROM public.lms_practice_attempt_items
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 IF v_options IS NULL THEN RAISE EXCEPTION 'Question is not assigned to this attempt'; END IF;
 IF p_selected_index IS NOT NULL AND (p_selected_index<0 OR p_selected_index>=jsonb_array_length(v_options)) THEN
   RAISE EXCEPTION 'Invalid answer option'; END IF;
 IF a.mode='quick10' AND p_selected_index IS NULL THEN
   RAISE EXCEPTION 'Quick 10 requires a selected option'; END IF;
 IF a.mode='quick10' AND v_answered_at IS NOT NULL THEN
   IF v_previous IS DISTINCT FROM p_selected_index THEN
    RAISE EXCEPTION 'Quick 10 answers cannot be changed after feedback'; END IF;
 ELSE
   UPDATE public.lms_practice_attempt_items
   SET selected_index=p_selected_index,answered_at=clock_timestamp()
   WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 END IF;
 RETURN jsonb_build_object('saved',true,'serverNow',clock_timestamp())
   || CASE WHEN a.mode='quick10' THEN
    jsonb_build_object('correctIndex',v_correct_index,'explanation',v_explanation)
    ELSE '{}'::jsonb END;
END; $$;

-- Existing modes keep their P4 scoring. Adaptive cannot finish early while
-- time remains; this prevents skipping tiers to reveal future answer keys.
CREATE OR REPLACE FUNCTION public.lms_p4_finish_practice(p_attempt_id uuid) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE; v_correct integer; v_answered integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
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
END; $$;

DO $$
DECLARE signature text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'lms_p8_levelup_readiness(uuid,integer,uuid)',
  'lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)',
  'lms_p8_answer_levelup(uuid,uuid,integer)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',signature);
 END LOOP;
 -- Re-assert original P4 RPC privilege, not broader public/anonymous access.
 FOREACH signature IN ARRAY ARRAY[
  'lms_p4_save_answer(uuid,uuid,integer)',
  'lms_p4_finish_practice(uuid)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',signature);
 END LOOP;
END $$;
COMMIT;
