-- Technica P10 Mock exam engine (SOURCE ONLY, staging first).
-- Deliberately does NOT import or publish ASP questions or reserve Mock IDs.
-- Prerequisite: P4 (paid/manual entitlement) and P9B (one immutable 200 form).
-- Does not alter the P8e adaptive Practice policy or any existing question row.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_p9b_mock_forms') IS NULL OR
    to_regclass('public.lms_p9b_mock_items') IS NULL OR
    to_regprocedure('public.lms_p4_can_practice(uuid)') IS NULL OR
    to_regclass('public.lms_questions') IS NULL
 THEN RAISE EXCEPTION 'P10 requires P4 + P9B installed on authorized staging'; END IF;
 IF to_regclass('public.lms_p10_mock_attempts') IS NOT NULL OR
    to_regprocedure('public.lms_p10_start_mock(uuid,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P10 already installed/conflicts; never overwrite'; END IF;
END $$;

CREATE TABLE public.lms_p10_mock_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 form_id uuid NOT NULL REFERENCES public.lms_p9b_mock_forms(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'in_progress'
  CHECK(state IN ('in_progress','submitted','expired','abandoned')),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 deadline_at timestamptz NOT NULL,
 submitted_at timestamptz,
 question_count integer NOT NULL DEFAULT 200 CHECK(question_count=200),
 correct_count integer CHECK(correct_count BETWEEN 0 AND 200),
 score_percent numeric(5,2) CHECK(score_percent BETWEEN 0 AND 100),
 UNIQUE(user_id,request_id),
 CHECK(deadline_at=started_at+interval '300 minutes')
);
CREATE INDEX lms_p10_mock_attempt_owner_idx
 ON public.lms_p10_mock_attempts(user_id,started_at DESC);
CREATE TABLE public.lms_p10_mock_answers (
 attempt_id uuid NOT NULL REFERENCES public.lms_p10_mock_attempts(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 200),
 question_id uuid NOT NULL REFERENCES public.lms_questions(id) ON DELETE RESTRICT,
 prompt_snapshot text NOT NULL,
 options_snapshot jsonb NOT NULL,
 correct_index_snapshot smallint NOT NULL,
 selected_index smallint,
 flagged boolean NOT NULL DEFAULT false,
 saved_at timestamptz,
 PRIMARY KEY(attempt_id,position),
 UNIQUE(attempt_id,question_id),
 CHECK(correct_index_snapshot>=0 AND correct_index_snapshot<jsonb_array_length(options_snapshot)),
 CHECK(selected_index IS NULL OR
  (selected_index>=0 AND selected_index<jsonb_array_length(options_snapshot)))
);
DO $$
DECLARE n text;
BEGIN
 FOREACH n IN ARRAY ARRAY['lms_p10_mock_attempts','lms_p10_mock_answers'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',n);
 END LOOP;
END $$;

-- Private helper: only internal owner code may call it. Does not expose keys.
CREATE FUNCTION public.lms_p10_finalize(p_id uuid,p_expired boolean)
 RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_p10_mock_attempts%ROWTYPE; v_correct integer;
BEGIN
 SELECT * INTO a FROM public.lms_p10_mock_attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mock attempt unavailable'; END IF;
 IF a.state<>'in_progress' THEN RETURN; END IF;
 SELECT count(*) INTO v_correct FROM public.lms_p10_mock_answers
 WHERE attempt_id=p_id AND selected_index=correct_index_snapshot;
 UPDATE public.lms_p10_mock_attempts
 SET state=CASE WHEN p_expired OR clock_timestamp()>=deadline_at THEN 'expired'
   ELSE 'submitted' END,
  submitted_at=clock_timestamp(),
  correct_count=v_correct,
  score_percent=round(v_correct*100.0/200,2)
 WHERE id=p_id AND state='in_progress';
END; $$;

-- Always server-time checked. After submission never returns questions,
-- answer keys or internal grading snapshots, only the final aggregate.
CREATE FUNCTION public.lms_p10_mock_payload(p_attempt_id uuid)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_p10_mock_attempts%ROWTYPE; v_questions jsonb;
DECLARE v_answered integer; v_flagged integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated learner required'; END IF;
 SELECT * INTO a FROM public.lms_p10_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid());
 IF NOT FOUND OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Mock attempt unavailable or course access inactive'; END IF;
 IF a.state='in_progress' AND clock_timestamp()>=a.deadline_at THEN
  PERFORM public.lms_p10_finalize(a.id,true);
  SELECT * INTO a FROM public.lms_p10_mock_attempts WHERE id=p_attempt_id;
 END IF;
 SELECT count(*) FILTER(WHERE selected_index IS NOT NULL),
   count(*) FILTER(WHERE flagged)
 INTO v_answered,v_flagged FROM public.lms_p10_mock_answers
 WHERE attempt_id=a.id;
 IF a.state='in_progress' THEN
  SELECT coalesce(jsonb_agg(
   jsonb_build_object('id',i.question_id,'position',i.position,
    'prompt',i.prompt_snapshot,'options',i.options_snapshot,
    'selectedIndex',i.selected_index,'flagged',i.flagged)
    ORDER BY i.position),'[]'::jsonb)
  INTO v_questions FROM public.lms_p10_mock_answers i WHERE i.attempt_id=a.id;
 ELSE
  v_questions:='[]'::jsonb;
 END IF;
 RETURN jsonb_build_object('attemptId',a.id,'courseId',a.course_id,
  'mode','asp_mock_200','state',a.state,
  'serverNow',clock_timestamp(),'startedAt',a.started_at,
  'deadlineAt',a.deadline_at,'submittedAt',a.submitted_at,
  'durationSeconds',18000,'questionCount',200,
  'answeredCount',v_answered,'flaggedCount',v_flagged,
  'correctCount',a.correct_count,'scorePercent',a.score_percent,
  'questions',v_questions);
END; $$;

-- Learner-only readiness; aggregate counts and no private source IDs/keys.
-- A valid reserved form is necessary but does not mean the engine is live
-- until this separate P10 migration has been expressly installed in staging.
CREATE FUNCTION public.lms_p10_mock_readiness(p_course_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_form uuid; v_count integer:=0; v_total integer:=0;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p4_can_practice(p_course_id)
 THEN RAISE EXCEPTION 'Course access inactive'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses
 WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'ASP course required'; END IF;
 SELECT id INTO v_form FROM public.lms_p9b_mock_forms
 WHERE course_id=p_course_id AND form_version=1 AND state='reserved';
 IF v_form IS NOT NULL THEN
  SELECT count(*) INTO v_count
  FROM public.lms_p9b_mock_items i
  JOIN public.lms_questions q ON q.id=i.question_id
  WHERE i.form_id=v_form AND q.course_id=p_course_id
    AND q.mock_exclusive AND q.approval_state='draft'
    AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items ai
      WHERE ai.question_id=q.id);
 END IF;
 SELECT count(*) INTO v_total FROM public.lms_questions
 WHERE course_id=p_course_id AND mock_exclusive;
 RETURN jsonb_build_object('ready',v_form IS NOT NULL AND
   v_count=200 AND v_total=200,
   'verifiedReserved',v_count,'totalExclusiveFlags',v_total,
   'required',200,'durationSeconds',18000,'engineVersion','p10-mock-v1');
END; $$;

-- Idempotent start: lock learner profile across tabs.
-- Form must be genuinely reserved, immutable, exactly 200 unique DRAFT
-- Mock-exclusive IDs; no LIVE/Practice question pool can silently substitute.
CREATE FUNCTION public.lms_p10_start_mock(p_course_id uuid,p_request_id uuid)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=(SELECT auth.uid()); v_form uuid; v_count integer; v_id uuid;
DECLARE v_started timestamptz;
BEGIN
 IF v_user IS NULL OR p_request_id IS NULL OR p_course_id IS NULL
 THEN RAISE EXCEPTION 'Authenticated course and idempotency ID required'; END IF;
 IF NOT public.lms_p4_can_practice(p_course_id)
 THEN RAISE EXCEPTION 'Verified paid/manual course access or Admin role required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses
 WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'Formal Mock currently supports ASP only'; END IF;
 PERFORM 1 FROM public.lms_profiles WHERE id=v_user FOR UPDATE;
 SELECT id INTO v_id FROM public.lms_p10_mock_attempts
 WHERE user_id=v_user AND request_id=p_request_id;
 IF v_id IS NOT NULL THEN RETURN public.lms_p10_mock_payload(v_id); END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p10_mock_attempts
  WHERE user_id=v_user AND course_id=p_course_id
    AND state='in_progress' AND deadline_at>clock_timestamp())
 THEN RAISE EXCEPTION 'Another ASP Mock attempt is active'; END IF;
 SELECT id INTO v_form FROM public.lms_p9b_mock_forms
 WHERE course_id=p_course_id AND form_version=1 AND state='reserved';
 IF v_form IS NULL THEN RAISE EXCEPTION 'ASP Mock 200-question form not reserved'; END IF;
 SELECT count(*) INTO v_count
 FROM public.lms_p9b_mock_items i
 JOIN public.lms_questions q ON q.id=i.question_id
 WHERE i.form_id=v_form AND q.course_id=p_course_id
   AND q.mock_exclusive AND q.approval_state='draft'
   AND i.position BETWEEN 1 AND 200
   AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items ai
     WHERE ai.question_id=q.id);
 IF v_count<>200 OR
  (SELECT count(*) FROM public.lms_questions
   WHERE course_id=p_course_id AND mock_exclusive)<>200
 THEN RAISE EXCEPTION 'Mock form not fully reserved or exclusive'; END IF;
 v_started:=clock_timestamp();
 INSERT INTO public.lms_p10_mock_attempts
  (user_id,course_id,form_id,request_id,started_at,deadline_at)
 VALUES(v_user,p_course_id,v_form,p_request_id,v_started,
   v_started+interval '300 minutes') RETURNING id INTO v_id;
 INSERT INTO public.lms_p10_mock_answers
  (attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot)
 SELECT v_id,i.position,q.id,q.prompt,q.options,q.correct_index
 FROM public.lms_p9b_mock_items i JOIN public.lms_questions q ON q.id=i.question_id
 WHERE i.form_id=v_form ORDER BY i.position;
 IF (SELECT count(*) FROM public.lms_p10_mock_answers WHERE attempt_id=v_id)<>200
 THEN RAISE EXCEPTION 'Atomic Mock 200-question snapshot failed'; END IF;
 RETURN public.lms_p10_mock_payload(v_id);
END; $$;

-- Answer and flag can both be edited until server deadline/submission;
-- server never returns the correct key during exam. Null = clear answer.
CREATE FUNCTION public.lms_p10_save_mock(p_attempt_id uuid,p_question_id uuid,
 p_selected_index integer,p_flagged boolean)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_p10_mock_attempts%ROWTYPE; v_options jsonb;
BEGIN
 IF p_flagged IS NULL THEN RAISE EXCEPTION 'Flag state required'; END IF;
 SELECT * INTO a FROM public.lms_p10_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Mock attempt unavailable'; END IF;
 IF a.state<>'in_progress' OR clock_timestamp()>=a.deadline_at
 THEN RAISE EXCEPTION 'Mock closed or deadline reached'; END IF;
 SELECT options_snapshot INTO v_options FROM public.lms_p10_mock_answers
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 IF v_options IS NULL THEN RAISE EXCEPTION 'Question not assigned to this Mock'; END IF;
 IF p_selected_index IS NOT NULL
  AND (p_selected_index<0 OR p_selected_index>=jsonb_array_length(v_options))
 THEN RAISE EXCEPTION 'Invalid selected option'; END IF;
 UPDATE public.lms_p10_mock_answers SET selected_index=p_selected_index,
  flagged=p_flagged,saved_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 RETURN jsonb_build_object('saved',true,'serverNow',clock_timestamp());
END; $$;

CREATE FUNCTION public.lms_p10_submit_mock(p_attempt_id uuid)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_p10_mock_attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.lms_p10_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Mock attempt unavailable'; END IF;
 IF a.state='in_progress' THEN
  PERFORM public.lms_p10_finalize(a.id,clock_timestamp()>=a.deadline_at);
 END IF;
 RETURN public.lms_p10_mock_payload(p_attempt_id);
END; $$;

-- Explicit exit/hidden tab sealing is stronger than resumability. No OS-level
-- monitoring or screenshot block is claimed. No question payload post-abandon.
CREATE FUNCTION public.lms_p10_abandon_mock(p_attempt_id uuid)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.lms_p10_mock_attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.lms_p10_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mock attempt unavailable'; END IF;
 IF a.state='in_progress' THEN
  UPDATE public.lms_p10_mock_attempts
   SET state='abandoned',submitted_at=clock_timestamp()
  WHERE id=a.id;
 END IF;
 RETURN jsonb_build_object('closed',true,'attemptId',a.id);
END; $$;

DO $$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
  'lms_p10_finalize(uuid,boolean)',
  'lms_p10_mock_readiness(uuid)',
  'lms_p10_mock_payload(uuid)',
  'lms_p10_start_mock(uuid,uuid)',
  'lms_p10_save_mock(uuid,uuid,integer,boolean)',
  'lms_p10_submit_mock(uuid)',
  'lms_p10_abandon_mock(uuid)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role',sig);
 END LOOP;
 FOREACH sig IN ARRAY ARRAY[
  'lms_p10_mock_readiness(uuid)',
  'lms_p10_mock_payload(uuid)',
  'lms_p10_start_mock(uuid,uuid)',
  'lms_p10_save_mock(uuid,uuid,integer,boolean)',
  'lms_p10_submit_mock(uuid)',
  'lms_p10_abandon_mock(uuid)'
 ] LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated',sig);
 END LOOP;
END $$;
COMMIT;
