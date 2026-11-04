-- Technica LMS P8d: EXACT user-confirmed 70% adaptive-thirds policy.
-- ONLY Secure Practice / Level Up (1..50 questions), never Assessment or Mock.
-- New attempts N=30: minimum 10 LOW answered at >=70% to advance, then
-- minimum 10 MEDIUM answered at >=70% to advance, then remaining HIGH.
-- Under 70%: continue drawing SAME tier; correct/answered is cumulative there.
-- Answer count always stops at chosen N, even when still LOW/MEDIUM.
-- No level/difficulty or answer key sent during the exam.
--
-- IN-FLIGHT SAFETY: old P8 attempts keep their existing checkpoint_size and
-- NULL medium_checkpoint_size. They remain under their original per-tier gate.
-- Only NEW attempts get the new persisted medium gate. No existing attempt
-- /question/review/entitlement/Mock record is modified by this migration.
-- OWNER-APPROVED STAGING migration, after P8. NEVER auto-run in production.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_practice_adaptive_state') IS NULL
   OR to_regprocedure('public.lms_p8_checkpoint(integer)') IS NULL
   OR to_regprocedure('public.lms_p8_levelup_readiness(uuid,integer,uuid)') IS NULL
   OR to_regprocedure('public.lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)') IS NULL
   OR to_regprocedure('public.lms_p8_answer_levelup(uuid,uuid,integer)') IS NULL
 THEN RAISE EXCEPTION 'P8d requires P8 installed in dedicated Technica staging'; END IF;
 IF to_regprocedure('public.lms_p8_medium_checkpoint(integer)') IS NOT NULL
   OR EXISTS(SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='lms_practice_adaptive_state'
         AND column_name='medium_checkpoint_size')
 THEN RAISE EXCEPTION 'P8d already installed or conflicts: stop; do not overwrite'; END IF;
END $$;

-- Nullable is intentional: old, in-flight attempts keep their original P8
-- checkpoint for BOTH tiers. No UPDATE or table rewrite of their state.
ALTER TABLE public.lms_practice_adaptive_state
 ADD COLUMN medium_checkpoint_size integer
 CHECK(medium_checkpoint_size BETWEEN 1 AND 50);

-- LOW threshold: max(1, floor(N/3)). For N=30 => 10.

CREATE OR REPLACE FUNCTION public.lms_p8_checkpoint(p_count integer) RETURNS integer
 LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT greatest(1,floor(p_count/3.0)::integer)
 WHERE p_count BETWEEN 1 AND 50;
$$;

-- For N not divisible by three, balance the Medium and High remainder.
-- Example N=50: Low 16 / Medium 17 / High 17. For N=30: 10/10/10.
CREATE FUNCTION public.lms_p8_medium_checkpoint(p_count integer) RETURNS integer
 LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT greatest(1,floor((p_count-greatest(1,floor(p_count/3.0)::integer))/2.0)::integer)
 WHERE p_count BETWEEN 1 AND 50;
$$;

-- Readiness remains a strict gate: N approved non-Mock items PER TIER.
CREATE OR REPLACE FUNCTION public.lms_p8_levelup_readiness(
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
   'mediumCheckpoint',public.lms_p8_medium_checkpoint(p_count),
   'policyVersion','thirds-v1','thresholdPercent',70);
END; $$;

-- New attempt stores both thresholds; old attempt state remains unchanged.
CREATE OR REPLACE FUNCTION public.lms_p8_start_levelup(
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
 INSERT INTO public.lms_practice_adaptive_state(attempt_id,domain_id,checkpoint_size,medium_checkpoint_size)
 VALUES(v_id,p_domain_id,public.lms_p8_checkpoint(p_count),public.lms_p8_medium_checkpoint(p_count));
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

-- Server-only ordered marking, per-tier cumulative 70% & exactly N total.
CREATE OR REPLACE FUNCTION public.lms_p8_answer_levelup(
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
    AND v_tier_attempted>=CASE
      WHEN v_tier='medium' THEN coalesce(s.medium_checkpoint_size,s.checkpoint_size)
      ELSE s.checkpoint_size END
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

-- Restore explicit least-privilege function permissions.
REVOKE ALL ON FUNCTION public.lms_p8_medium_checkpoint(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p8_medium_checkpoint(integer) TO service_role;
COMMIT;
