-- P71: Self-managed 200-question / 5-hour Course Mock from saved Question Bank flags.
-- SOURCE ONLY: apply exclusively after inspecting the Technica live migration
-- ledger and obtaining explicit approval for production changes.
-- No question, answer, attempt, enrollment or P9B/P10 reservation data mutated.
-- Existing P34B attempts retain their original snapshots and history.
-- Use CREATE OR REPLACE to retain function OID/ownership/grants.
DO $p71_preflight$
BEGIN
 IF to_regprocedure('public.lms_p34_selected_mock_readiness(uuid)') IS NULL
  OR to_regprocedure('public.lms_p34_start_selected_mock(uuid,uuid)') IS NULL
  OR to_regclass('public.lms_p34_selected_mock_answers') IS NULL
  OR to_regclass('public.lms_p9b_mock_items') IS NULL
 THEN RAISE EXCEPTION 'P71 requires installed P34B and immutable P9B form; do not bootstrap'; END IF;
END $p71_preflight$;

-- Count only. No question text, answer key or UUID escapes readiness.
CREATE OR REPLACE FUNCTION public.lms_p34_selected_mock_readiness(p_course_id uuid)
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
 RETURN jsonb_build_object('ready',v_count=200,'selectedCount',v_count,
  'deliveredCount',least(v_count,200),'maxPerAttempt',200,
  'durationSeconds',18000,'engineVersion','p71-fixed-bank-mock-v1',
  'officialMockUnchanged',true,'requiredCount',200,
  'source','question_bank_mock_flags');
END $p34b_ready$;

-- Snapshot exactly the 200 current eligible Mock-marked questions.
-- Transaction rollback on concurrent edits or incomplete snapshots.
CREATE OR REPLACE FUNCTION public.lms_p34_start_selected_mock(p_course_id uuid,p_request_id uuid)
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
 IF v_count<>200 THEN
  RAISE EXCEPTION 'Course Mock requires exactly 200 eligible saved Mock questions, found %',v_count;
 END IF;
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

-- Preserve minimal authenticated RPC rights, never grant to anon.
REVOKE ALL ON FUNCTION public.lms_p34_selected_mock_readiness(uuid),
 public.lms_p34_start_selected_mock(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p34_selected_mock_readiness(uuid),
 public.lms_p34_start_selected_mock(uuid,uuid) TO authenticated,service_role;
