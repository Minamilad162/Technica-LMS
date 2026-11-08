-- P34B: Exam selected by per-question Mock Exam switches in Question Bank.
-- Separate CONFIGURABLE Mock: never alters the immutable P9B/P10 official ASP
-- 200-question / 300-minute form, attempts or correctness snapshots.
-- Install AFTER P34A and P29 on an explicitly authorized Technica environment.
-- SOURCE ONLY. Installer performs no question/attempt data mutations.
BEGIN;
DO $p34b_preflight$
BEGIN
 IF to_regprocedure('public.lms_p34_bank_capabilities()') IS NULL
  OR to_regprocedure('public.lms_p29_mock_candidate_ids(uuid)') IS NULL
  OR to_regprocedure('public.lms_p4_can_practice(uuid)') IS NULL
  OR to_regclass('public.lms_p9b_mock_items') IS NULL
  OR to_regclass('public.lms_p10_mock_attempts') IS NULL
 THEN RAISE EXCEPTION 'P34B requires verified P4/P9B/P10/P29/P34A on dedicated Technica Staging'; END IF;
 IF to_regclass('public.lms_p34_selected_mock_attempts') IS NOT NULL
 OR to_regprocedure('public.lms_p34_start_selected_mock(uuid,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P34B installed/conflict; do not replay'; END IF;
END $p34b_preflight$;

CREATE TABLE public.lms_p34_selected_mock_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'in_progress'
  CHECK(state IN ('in_progress','submitted','expired','abandoned')),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 deadline_at timestamptz NOT NULL,
 submitted_at timestamptz,
 question_count integer NOT NULL CHECK(question_count BETWEEN 1 AND 200),
 correct_count integer CHECK(correct_count BETWEEN 0 AND question_count),
 score_percent numeric(5,2) CHECK(score_percent BETWEEN 0 AND 100),
 UNIQUE(user_id,request_id),
 CHECK(deadline_at=started_at+interval '300 minutes')
);
CREATE INDEX lms_p34_selected_owner ON public.lms_p34_selected_mock_attempts(user_id,course_id,started_at DESC);
CREATE TABLE public.lms_p34_selected_mock_answers(
 attempt_id uuid NOT NULL REFERENCES public.lms_p34_selected_mock_attempts(id) ON DELETE RESTRICT,
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
 CHECK(selected_index IS NULL OR (selected_index>=0
  AND selected_index<jsonb_array_length(options_snapshot)))
);
ALTER TABLE public.lms_p34_selected_mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_p34_selected_mock_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p34_selected_mock_attempts,
 public.lms_p34_selected_mock_answers FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_p34_selected_mock_attempts,
 public.lms_p34_selected_mock_answers TO service_role;

-- Readiness is a count-only, no question text/answer key/IDs API.
CREATE FUNCTION public.lms_p34_selected_mock_readiness(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $p34b_ready$
DECLARE v_count integer:=0;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR p_course_id IS NULL
  OR NOT public.lms_p4_can_practice(p_course_id)
 THEN RAISE EXCEPTION 'Verified learner/course access required'; END IF;
 SELECT count(*) INTO v_count
 FROM public.lms_questions q
 WHERE q.course_id=p_course_id AND q.mock_candidate AND q.is_active
  AND q.approval_state='draft' AND NOT q.mock_exclusive
  AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items m WHERE m.question_id=q.id)
  AND NOT EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions z WHERE z.bank_question_id=q.id)
  AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items p WHERE p.question_id=q.id);
 RETURN jsonb_build_object('ready',v_count>0,'selectedCount',v_count,
  'deliveredCount',least(v_count,200),'maxPerAttempt',200,
  'durationSeconds',18000,'engineVersion','p34b-selected-mock-v1',
  'officialMockUnchanged',true);
END $p34b_ready$;

CREATE FUNCTION public.lms_p34_selected_mock_finalize(p_attempt_id uuid,p_expired boolean)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_final$
DECLARE a public.lms_p34_selected_mock_attempts%ROWTYPE; v_correct integer;
BEGIN
 SELECT * INTO a FROM public.lms_p34_selected_mock_attempts
 WHERE id=p_attempt_id FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Selected Mock attempt not found'; END IF;
 IF a.state<>'in_progress' THEN RETURN; END IF;
 SELECT count(*) INTO v_correct FROM public.lms_p34_selected_mock_answers
 WHERE attempt_id=a.id AND selected_index=correct_index_snapshot;
 UPDATE public.lms_p34_selected_mock_attempts
 SET state=CASE WHEN p_expired OR clock_timestamp()>=deadline_at
   THEN 'expired' ELSE 'submitted' END,
  submitted_at=clock_timestamp(),correct_count=v_correct,
  score_percent=round(v_correct*100.0/a.question_count,2)
 WHERE id=a.id AND state='in_progress';
END $p34b_final$;

CREATE FUNCTION public.lms_p34_selected_mock_payload(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_payload$
DECLARE a public.lms_p34_selected_mock_attempts%ROWTYPE;
 v_questions jsonb:='[]'::jsonb; v_answered integer:=0;v_flagged integer:=0;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
 SELECT * INTO a FROM public.lms_p34_selected_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid());
 IF a.id IS NULL OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Selected Mock not accessible'; END IF;
 IF a.state='in_progress' AND clock_timestamp()>=a.deadline_at THEN
  PERFORM public.lms_p34_selected_mock_finalize(a.id,true);
  SELECT * INTO a FROM public.lms_p34_selected_mock_attempts WHERE id=a.id;
 END IF;
 SELECT count(*) FILTER(WHERE selected_index IS NOT NULL),
  count(*) FILTER(WHERE flagged)
 INTO v_answered,v_flagged FROM public.lms_p34_selected_mock_answers
 WHERE attempt_id=a.id;
 IF a.state='in_progress' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',i.question_id,'position',i.position,
   'prompt',i.prompt_snapshot,'options',i.options_snapshot,
   'selectedIndex',i.selected_index,'flagged',i.flagged)
   ORDER BY i.position),'[]'::jsonb)
  INTO v_questions FROM public.lms_p34_selected_mock_answers i
  WHERE i.attempt_id=a.id;
 END IF;
 RETURN jsonb_build_object('attemptId',a.id,'courseId',a.course_id,
  'mode','selected_mock','state',a.state,
  'serverNow',clock_timestamp(),'startedAt',a.started_at,
  'deadlineAt',a.deadline_at,'submittedAt',a.submitted_at,
  'durationSeconds',18000,'questionCount',a.question_count,
  'answeredCount',v_answered,'flaggedCount',v_flagged,
  'correctCount',a.correct_count,'scorePercent',a.score_percent,
  'questions',v_questions);
END $p34b_payload$;

-- Per attempt snapshot freezes the then-selected Mock candidate questions;
-- later Admin changes do not rewrite any ongoing or graded exam.
CREATE FUNCTION public.lms_p34_start_selected_mock(p_course_id uuid,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_start$
DECLARE v_actor uuid:=(SELECT auth.uid());v_count integer;v_id uuid;
 v_started timestamptz;v_prev uuid;
BEGIN
 IF v_actor IS NULL OR p_course_id IS NULL OR p_request_id IS NULL
 OR NOT public.lms_p4_can_practice(p_course_id)
 THEN RAISE EXCEPTION 'Verified Course subscription and request required'; END IF;
 PERFORM 1 FROM public.lms_profiles WHERE id=v_actor FOR UPDATE;
 SELECT id INTO v_prev FROM public.lms_p34_selected_mock_attempts
 WHERE user_id=v_actor AND request_id=p_request_id;
 IF v_prev IS NOT NULL THEN RETURN public.lms_p34_selected_mock_payload(v_prev); END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p34_selected_mock_attempts
  WHERE user_id=v_actor AND course_id=p_course_id AND state='in_progress'
    AND deadline_at>clock_timestamp())
 THEN RAISE EXCEPTION 'Another selected Mock attempt is active'; END IF;
 SELECT count(*) INTO v_count FROM public.lms_questions q
 WHERE q.course_id=p_course_id AND q.mock_candidate AND q.is_active
  AND q.approval_state='draft' AND NOT q.mock_exclusive
  AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items m WHERE m.question_id=q.id)
  AND NOT EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions z WHERE z.bank_question_id=q.id)
  AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items p WHERE p.question_id=q.id);
 v_count:=least(v_count,200);
 IF v_count<1 THEN RAISE EXCEPTION 'Admin has not selected active Mock questions in this Course'; END IF;
 v_started:=clock_timestamp();
 INSERT INTO public.lms_p34_selected_mock_attempts
  (user_id,course_id,request_id,question_count,started_at,deadline_at)
 VALUES(v_actor,p_course_id,p_request_id,v_count,v_started,
  v_started+interval '300 minutes') RETURNING id INTO v_id;
 INSERT INTO public.lms_p34_selected_mock_answers
  (attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot)
 SELECT v_id,row_number() OVER(ORDER BY source.rank_key,source.id)::integer,
  source.id,source.prompt,source.options,source.correct_index
 FROM (
  SELECT q.id,q.prompt,q.options,q.correct_index,
   md5(q.id::text||p_request_id::text) AS rank_key
  FROM public.lms_questions q
  WHERE q.course_id=p_course_id AND q.mock_candidate AND q.is_active
   AND q.approval_state='draft' AND NOT q.mock_exclusive
   AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items m WHERE m.question_id=q.id)
   AND NOT EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions z WHERE z.bank_question_id=q.id)
   AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items p WHERE p.question_id=q.id)
  ORDER BY rank_key,q.id LIMIT 200
 ) source;
 IF (SELECT count(*) FROM public.lms_p34_selected_mock_answers WHERE attempt_id=v_id)<>v_count
 THEN RAISE EXCEPTION 'Selected Mock snapshot changed while starting; entire attempt rolled back'; END IF;
 RETURN public.lms_p34_selected_mock_payload(v_id);
END $p34b_start$;

CREATE FUNCTION public.lms_p34_save_selected_mock(p_attempt_id uuid,p_question_id uuid,
 p_selected_index integer,p_flagged boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_save$
DECLARE a public.lms_p34_selected_mock_attempts%ROWTYPE;v_opts jsonb;
BEGIN
 IF p_flagged IS NULL THEN RAISE EXCEPTION 'Flag required'; END IF;
 SELECT * INTO a FROM public.lms_p34_selected_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Selected Mock unavailable'; END IF;
 IF a.state<>'in_progress' OR clock_timestamp()>=a.deadline_at
 THEN RAISE EXCEPTION 'Mock closed/deadline reached'; END IF;
 SELECT options_snapshot INTO v_opts FROM public.lms_p34_selected_mock_answers
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 IF v_opts IS NULL THEN RAISE EXCEPTION 'Question does not belong to selected Mock'; END IF;
 IF p_selected_index IS NOT NULL AND
 (p_selected_index<0 OR p_selected_index>=jsonb_array_length(v_opts))
 THEN RAISE EXCEPTION 'Answer option invalid'; END IF;
 UPDATE public.lms_p34_selected_mock_answers
 SET selected_index=p_selected_index,flagged=p_flagged,saved_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 RETURN jsonb_build_object('saved',true,'serverNow',clock_timestamp());
END $p34b_save$;

CREATE FUNCTION public.lms_p34_submit_selected_mock(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_submit$
DECLARE a public.lms_p34_selected_mock_attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.lms_p34_selected_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR NOT public.lms_p4_can_practice(a.course_id)
 THEN RAISE EXCEPTION 'Selected Mock unavailable'; END IF;
 IF a.state='in_progress' THEN
  PERFORM public.lms_p34_selected_mock_finalize(a.id,clock_timestamp()>=a.deadline_at);
 END IF;
 RETURN public.lms_p34_selected_mock_payload(p_attempt_id);
END $p34b_submit$;

CREATE FUNCTION public.lms_p34_abandon_selected_mock(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34b_abandon$
DECLARE a public.lms_p34_selected_mock_attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.lms_p34_selected_mock_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Selected Mock unavailable'; END IF;
 IF a.state='in_progress' THEN
  UPDATE public.lms_p34_selected_mock_attempts
  SET state='abandoned',submitted_at=clock_timestamp() WHERE id=a.id;
 END IF;
 RETURN jsonb_build_object('closed',true,'attemptId',a.id);
END $p34b_abandon$;

DO $p34b_permissions$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
  'lms_p34_selected_mock_readiness(uuid)',
  'lms_p34_selected_mock_finalize(uuid,boolean)',
  'lms_p34_selected_mock_payload(uuid)',
  'lms_p34_start_selected_mock(uuid,uuid)',
  'lms_p34_save_selected_mock(uuid,uuid,integer,boolean)',
  'lms_p34_submit_selected_mock(uuid)',
  'lms_p34_abandon_selected_mock(uuid)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role',sig);
 END LOOP;
 FOREACH sig IN ARRAY ARRAY[
  'lms_p34_selected_mock_readiness(uuid)',
  'lms_p34_selected_mock_payload(uuid)',
  'lms_p34_start_selected_mock(uuid,uuid)',
  'lms_p34_save_selected_mock(uuid,uuid,integer,boolean)',
  'lms_p34_submit_selected_mock(uuid)',
  'lms_p34_abandon_selected_mock(uuid)'
 ] LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated',sig);
 END LOOP;
END $p34b_permissions$;
COMMIT;
