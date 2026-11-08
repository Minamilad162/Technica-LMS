-- P29: Active/Mock candidate controls and Course Bank -> Lesson Quiz assignment.
-- ADDITIVE, one-time migration for verified Technica staging only. Existing
-- P1/P4/P6A/P8e/P9B/P10/P22/P28.2 required. No question rows auto-approved,
-- no legacy P22 rows rewritten, no Mock reservations changed.
BEGIN;
DO $p29_gate$
DECLARE missing text[]:=ARRAY[]::text[];
BEGIN
 IF to_regclass('public.lms_questions') IS NULL OR
    to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN missing:=array_append(missing,'P1 / P4'); END IF;
 IF to_regprocedure('public.lms_p8_levelup_readiness(uuid,integer,uuid)') IS NULL OR
    to_regprocedure('public.lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)') IS NULL OR
    to_regprocedure('public.lms_p8_answer_levelup(uuid,uuid,integer)') IS NULL OR
    NOT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='lms_practice_adaptive_state'
        AND column_name='promotion_policy')
 THEN missing:=array_append(missing,'P8e fixed-correct adaptive policy'); END IF;
 IF to_regclass('public.lms_p9b_mock_items') IS NULL OR
    to_regprocedure('public.lms_p9b_reserve_mock(uuid,uuid[],text)') IS NULL
 THEN missing:=array_append(missing,'P9B protected ASP Mock reservation'); END IF;
 IF to_regclass('public.lms_p22_lesson_quiz_questions') IS NULL OR
    to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NULL OR
    to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NULL
 THEN missing:=array_append(missing,'P22/P28.2 course bank, lesson and filters'); END IF;
 IF cardinality(missing)>0 THEN
  RAISE EXCEPTION 'P29 missing verified prerequisite(s): %',array_to_string(missing,', ');
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lms_questions'
      AND column_name IN ('is_active','mock_candidate'))
   OR to_regprocedure('public.lms_p29_set_question_flags(uuid,boolean,boolean)') IS NOT NULL
 THEN RAISE EXCEPTION 'P29 already installed or partial conflict: do not replay'; END IF;
END $p29_gate$;

-- Existing questions are enabled BY DEFAULT. Draft approval remains independent.
ALTER TABLE public.lms_questions
 ADD COLUMN is_active boolean NOT NULL DEFAULT true,
 ADD COLUMN mock_candidate boolean NOT NULL DEFAULT false;
CREATE INDEX lms_p29_active_bank_pool_idx ON public.lms_questions(course_id,domain_id,difficulty)
 WHERE is_active AND NOT mock_candidate AND approval_state='approved' AND NOT mock_exclusive;

-- Verified Admin toggles are audited and server-side enforced.
-- ASP Mock selection is a *candidate*, never an irreversible P9B reservation;
-- use existing 200-reviewed-IDs preflight before final Exam form reservation.
CREATE FUNCTION public.lms_p29_set_question_flags(
 p_question_id uuid,p_is_active boolean,p_mock_candidate boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.lms_questions%ROWTYPE; v_unpublished integer:=0;
DECLARE v_reserved boolean;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin role required'; END IF;
 IF p_is_active IS NULL OR p_mock_candidate IS NULL
 THEN RAISE EXCEPTION 'Explicit Active and Mock selection required'; END IF;
 SELECT * INTO q FROM public.lms_questions WHERE id=p_question_id FOR UPDATE;
 IF q.id IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items WHERE question_id=q.id)
 INTO v_reserved;
 IF v_reserved OR q.mock_exclusive THEN
  IF p_is_active IS DISTINCT FROM q.is_active OR p_mock_candidate IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Official reserved Mock question is immutable; selections cannot be changed'; END IF;
  RETURN jsonb_build_object('id',q.id,'isActive',q.is_active,'mockCandidate',true,'mockExclusive',true);
 END IF;
 IF p_mock_candidate AND NOT p_is_active THEN
  RAISE EXCEPTION 'Enable question before selecting it for Mock Exam'; END IF;
 IF p_mock_candidate AND NOT q.mock_candidate THEN
  IF q.approval_state <> 'draft'
     OR EXISTS(SELECT 1 FROM public.lms_practice_attempt_items WHERE question_id=q.id)
     OR EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id=q.id)
  THEN RAISE EXCEPTION 'Mock candidate requires unused unlinked Draft; review and reserve via 200-item ASP Mock gate'; END IF;
 END IF;
 IF p_is_active IS DISTINCT FROM q.is_active OR p_mock_candidate IS DISTINCT FROM q.mock_candidate THEN
  UPDATE public.lms_questions SET is_active=p_is_active,
     mock_candidate=p_mock_candidate,updated_at=clock_timestamp() WHERE id=q.id;
  IF NOT p_is_active THEN
   -- Future learner quiz retrieval must not expose a disabled question.
   -- Already graded attempts and historical P22 rows are left intact.
   UPDATE public.lms_p22_lesson_quiz_questions
     SET is_published=false WHERE bank_question_id=q.id AND is_published;
   GET DIAGNOSTICS v_unpublished = ROW_COUNT;
  END IF;
  INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
  VALUES((SELECT auth.uid()),'p29_bank_question_controls','question',q.id,
    jsonb_build_object('courseId',q.course_id,'oldActive',q.is_active,
     'newActive',p_is_active,'oldMockCandidate',q.mock_candidate,
     'newMockCandidate',p_mock_candidate,'unpublishedLessonQuizItems',v_unpublished));
 END IF;
 RETURN jsonb_build_object('id',q.id,'isActive',p_is_active,
   'mockCandidate',p_mock_candidate,'mockExclusive',false,
   'unpublishedLessonQuizItems',v_unpublished);
END $$;

-- Used by Exams & Mock to pick up exactly the Admin's ticked candidates.
-- Returns IDs ONLY, not answer keys. Existing P9B independent human review
-- and atomic final reserve remain required. No automatic reservation.
CREATE FUNCTION public.lms_p29_mock_candidate_ids(p_course_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_list jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin role required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Select actual Course'; END IF;
 SELECT coalesce(jsonb_agg(q.id ORDER BY q.created_at,q.id),'[]'::jsonb)
 INTO v_list FROM public.lms_questions q
 WHERE q.course_id=p_course_id AND q.mock_candidate AND q.is_active
   AND q.approval_state='draft' AND NOT q.mock_exclusive;
 RETURN jsonb_build_object('ids',v_list,'count',jsonb_array_length(v_list));
END $$;

-- Prevent every existing/legacy approval path from leaking a marked Mock
-- candidate to learner Practice; preserve the previous P28 guard behavior.
CREATE OR REPLACE FUNCTION public.lms_p28_guard_bank_assignment() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $
BEGIN
 -- Mock candidate rows cannot be independently released to Practice, even
 -- if an older P9B approval RPC is called directly by an Admin.
 IF NEW.mock_candidate AND NEW.approval_state='approved'
 THEN RAISE EXCEPTION 'Mock Exam candidate is excluded from Practice approval; uncheck Mock selection first'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
   WHERE bank_question_id=OLD.id)
 AND (
   NEW.mock_exclusive IS TRUE OR NEW.approval_state='archived'
   OR NEW.prompt IS DISTINCT FROM OLD.prompt
   OR NEW.options IS DISTINCT FROM OLD.options
   OR NEW.correct_index IS DISTINCT FROM OLD.correct_index
   OR (NEW.approval_state<>'approved'
      AND EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
       WHERE bank_question_id=OLD.id AND is_published))
 ) THEN RAISE EXCEPTION 'Question linked to lesson quiz: unlink before Mock, archive or changing served content'; END IF;
 RETURN NEW;
END $;

-- Keep existing Lesson Quiz protection and enforce both new switches.
CREATE OR REPLACE FUNCTION public.lms_p28_guard_quiz_link() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_q public.lms_questions%ROWTYPE; v_course uuid;
BEGIN
 IF NEW.bank_question_id IS NULL THEN
  -- Old unlinked P22 rows remain editable, but no new standalone question
  -- or silent removal of a canonical Bank reference may enter learner quizzes.
  IF TG_OP='INSERT' THEN
   RAISE EXCEPTION 'New Lesson Quiz questions must be selected from the Course Question Bank';
  END IF;
  IF OLD.bank_question_id IS NOT NULL THEN
   RAISE EXCEPTION 'Unlink a Course Bank question by deleting its Lesson Quiz row';
  END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.bank_question_id IS NOT NULL
    AND NEW.bank_question_id IS DISTINCT FROM OLD.bank_question_id
 THEN RAISE EXCEPTION 'Cannot silently replace a linked bank question; unlink explicitly'; END IF;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=NEW.bank_question_id FOR SHARE;
 SELECT d.course_id INTO v_course
 FROM public.lms_lessons l
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 WHERE l.id=NEW.lesson_id;
 IF v_q.id IS NULL OR v_course IS NULL OR v_q.course_id<>v_course
 THEN RAISE EXCEPTION 'Lesson question must belong to the same course'; END IF;
 IF v_q.mock_exclusive OR v_q.mock_candidate OR (NOT v_q.is_active AND (TG_OP='INSERT' OR NEW.is_published)) OR v_q.approval_state='archived'
 THEN RAISE EXCEPTION 'Mock-only or archived question cannot be used in a lesson quiz'; END IF;
 IF NEW.is_published AND v_q.approval_state<>'approved'
 THEN RAISE EXCEPTION 'Only approved non-Mock bank questions can be published'; END IF;
 IF length(btrim(v_q.prompt))>1000
 THEN RAISE EXCEPTION 'Question exceeds the P22 lesson-quiz text limit'; END IF;
 NEW.prompt:=v_q.prompt;
 NEW.options:=v_q.options;
 NEW.correct_index:=v_q.correct_index;
 RETURN NEW;
END $$;

-- Preserve original 4-argument Bank listing; upgrade only 7-argument Admin list.
CREATE OR REPLACE FUNCTION public.lms_p28_list_bank(
 p_course_id uuid,p_search text,p_limit integer,p_offset integer,
 p_domain_id uuid,p_difficulty text,p_usage text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_total integer;v_items jsonb;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF p_course_id IS NULL OR p_limit NOT BETWEEN 1 AND 100
  OR p_offset NOT BETWEEN 0 AND 100000
  OR length(coalesce(p_search,''))>160
  OR p_difficulty NOT IN ('','unclassified','low','medium','high')
  OR p_usage NOT IN ('all','practice','mock','draft','lesson','eligible')
  OR (p_domain_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.lms_domains d WHERE d.id=p_domain_id AND d.course_id=p_course_id))
 THEN RAISE EXCEPTION 'Invalid course/filter/page'; END IF;
 SELECT count(*) INTO v_total FROM public.lms_questions q
 WHERE q.course_id=p_course_id
  AND (coalesce(p_search,'')='' OR q.prompt ILIKE '%'||p_search||'%'
     OR q.source_id ILIKE '%'||p_search||'%')
  AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
  AND (p_difficulty='' OR q.difficulty=p_difficulty)
  AND (p_usage='all'
    OR (p_usage='practice' AND q.approval_state='approved' AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate)
    OR (p_usage='mock' AND (q.mock_exclusive OR q.mock_candidate))
    OR (p_usage='draft' AND q.approval_state='draft' AND NOT q.mock_exclusive)
    OR (p_usage='eligible' AND q.approval_state<>'archived' AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate)
    OR (p_usage='lesson' AND EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions l
       WHERE l.bank_question_id=q.id)));
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',x.id,'courseId',x.course_id,'sourceId',x.source_id,
  'prompt',x.prompt,'options',x.options,'correctIndex',x.correct_index,
  'domainId',x.domain_id,'topic',x.legacy_group,
  'explanation',x.explanation,'reference',x.reference_text,
  'approvalState',x.approval_state,'mockExclusive',x.mock_exclusive,
  'isActive',x.is_active,'mockCandidate',x.mock_candidate,
  'linkedLessonIds',(SELECT coalesce(jsonb_agg(l.lesson_id ORDER BY l.position),'[]'::jsonb)
    FROM public.lms_p22_lesson_quiz_questions l WHERE l.bank_question_id=x.id),
  'difficulty',x.difficulty,'linkedCount',
    (SELECT count(*) FROM public.lms_p22_lesson_quiz_questions l
       WHERE l.bank_question_id=x.id)) ORDER BY x.created_at DESC,x.id),'[]'::jsonb)
 INTO v_items FROM (
  SELECT * FROM public.lms_questions q
  WHERE q.course_id=p_course_id
   AND (coalesce(p_search,'')='' OR q.prompt ILIKE '%'||p_search||'%'
      OR q.source_id ILIKE '%'||p_search||'%')
   AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
   AND (p_difficulty='' OR q.difficulty=p_difficulty)
   AND (p_usage='all'
    OR (p_usage='practice' AND q.approval_state='approved' AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate)
    OR (p_usage='mock' AND (q.mock_exclusive OR q.mock_candidate))
    OR (p_usage='draft' AND q.approval_state='draft' AND NOT q.mock_exclusive)
    OR (p_usage='eligible' AND q.approval_state<>'archived' AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate)
    OR (p_usage='lesson' AND EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions l
       WHERE l.bank_question_id=q.id)))
  ORDER BY q.created_at DESC,q.id LIMIT p_limit OFFSET p_offset
 ) x;
 RETURN jsonb_build_object('total',v_total,'items',v_items);
END $$;

-- Ensure actual server selectors (not UI-only filters) reject disabled
-- or Mock-candidate questions for all NEW Practice and adaptive questions.
-- Active-in-progress attempt snapshots retain their historic grading.
CREATE OR REPLACE FUNCTION public.lms_p4_start_practice(
 p_course_id uuid,p_mode text,p_count integer,p_request_id uuid,p_domain_id uuid DEFAULT NULL,
 p_duration_seconds integer DEFAULT 0
) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := (SELECT auth.uid());
DECLARE v_id uuid;
DECLARE v_expected integer;
DECLARE v_count integer;
DECLARE v_deadline timestamptz;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 IF p_course_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'Course and request ID required'; END IF;
 IF NOT public.lms_p4_can_practice(p_course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF p_mode NOT IN ('quick10','timed25','custom','domain') THEN RAISE EXCEPTION 'Unsupported practice mode'; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Question count must be 1..50'; END IF;
 IF (p_mode='quick10' AND p_count<>10) OR (p_mode='timed25' AND p_count<>25) THEN
   RAISE EXCEPTION 'Preset question count does not match mode';
 END IF;
 IF p_mode='domain' AND p_domain_id IS NULL THEN RAISE EXCEPTION 'Domain required'; END IF;
 IF p_mode<>'domain' AND p_domain_id IS NOT NULL THEN RAISE EXCEPTION 'Domain filter only allowed in domain practice'; END IF;
 IF p_domain_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.lms_domains d WHERE d.id=p_domain_id AND d.course_id=p_course_id
 ) THEN RAISE EXCEPTION 'Invalid course domain'; END IF;
 IF p_duration_seconds IS NULL OR p_duration_seconds < 0 OR p_duration_seconds > 10800 THEN
   RAISE EXCEPTION 'Duration must be 0..10800 seconds';
 END IF;
 IF (p_mode='timed25' AND p_duration_seconds<>1200) OR
    (p_mode IN ('quick10','domain') AND p_duration_seconds<>0) THEN
   RAISE EXCEPTION 'Invalid preset duration';
 END IF;
 -- Multiple tabs with same request ID are serialized per learner.
 PERFORM 1 FROM public.lms_profiles WHERE id=v_user FOR UPDATE;
 SELECT a.id INTO v_id FROM public.lms_practice_attempts a
  WHERE a.user_id=v_user AND a.client_request_id=p_request_id;
 IF v_id IS NOT NULL THEN RETURN public.lms_p4_attempt_payload(v_id); END IF;
 SELECT count(*) INTO v_count FROM public.lms_questions q WHERE q.course_id=p_course_id
   AND q.approval_state='approved' AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate
   AND (p_domain_id IS NULL OR q.domain_id=p_domain_id);
 IF v_count < p_count THEN RAISE EXCEPTION 'Not enough approved non-mock questions: % eligible, % requested',v_count,p_count; END IF;
 v_deadline:=CASE WHEN p_duration_seconds>0 THEN clock_timestamp()+make_interval(secs=>p_duration_seconds) ELSE NULL END;
 INSERT INTO public.lms_practice_attempts(user_id,course_id,client_request_id,mode,question_count,deadline_at)
 VALUES(v_user,p_course_id,p_request_id,p_mode,p_count,v_deadline) RETURNING id INTO v_id;
 INSERT INTO public.lms_practice_attempt_items(attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot)
 SELECT v_id,row_number() over(),chosen.id,chosen.prompt,chosen.options,chosen.correct_index,chosen.explanation FROM (
   SELECT q.id,q.prompt,q.options,q.correct_index,q.explanation
   FROM public.lms_questions q WHERE q.course_id=p_course_id AND q.approval_state='approved'
     AND NOT q.mock_exclusive AND q.is_active AND NOT q.mock_candidate AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
   ORDER BY random(),q.id LIMIT p_count
 ) chosen;
 RETURN public.lms_p4_attempt_payload(v_id);
END; $$;

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
   AND NOT mock_exclusive AND is_active AND NOT mock_candidate AND (p_domain_id IS NULL OR domain_id=p_domain_id);
 v_ready:=v_low>=p_count AND v_med>=p_count AND v_high>=p_count;
 RETURN jsonb_build_object('ready',v_ready,'low',v_low,'medium',v_med,'high',v_high,
   'requiredPerTier',p_count,'checkpoint',public.lms_p8_checkpoint(p_count),
   'mediumCheckpoint',public.lms_p8_medium_checkpoint(p_count),
   'lowRequiredCorrect',ceil(public.lms_p8_checkpoint(p_count)*7.0/10)::integer,
   'mediumRequiredCorrect',ceil(public.lms_p8_medium_checkpoint(p_count)*7.0/10)::integer,
   'policyVersion','thirds-fixed-correct-v2','thresholdPercent',70);
END; $$;

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
 INSERT INTO public.lms_practice_adaptive_state(
  attempt_id,domain_id,checkpoint_size,medium_checkpoint_size,promotion_policy)
 VALUES(v_id,p_domain_id,public.lms_p8_checkpoint(p_count),
  public.lms_p8_medium_checkpoint(p_count),'thirds-fixed-correct-v2');
 SELECT * INTO v_question FROM public.lms_questions
 WHERE course_id=p_course_id AND approval_state='approved' AND NOT mock_exclusive AND is_active AND NOT mock_candidate
  AND difficulty='low' AND (p_domain_id IS NULL OR domain_id=p_domain_id)
 ORDER BY random(),id LIMIT 1;
 IF v_question.id IS NULL THEN RAISE EXCEPTION 'No eligible Low question available'; END IF;
 INSERT INTO public.lms_practice_attempt_items(
  attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot
 ) VALUES(v_id,1,v_question.id,v_question.prompt,v_question.options,
  v_question.correct_index,v_question.explanation);
 RETURN public.lms_p4_attempt_payload(v_id);
END; $$;

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
  WHERE x.course_id=a.course_id AND x.approval_state='approved' AND NOT x.mock_exclusive AND x.is_active AND NOT x.mock_candidate
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

REVOKE ALL ON FUNCTION public.lms_p29_set_question_flags(uuid,boolean,boolean),
  public.lms_p29_mock_candidate_ids(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p29_set_question_flags(uuid,boolean,boolean),
  public.lms_p29_mock_candidate_ids(uuid)
 TO authenticated,service_role;
COMMIT;
