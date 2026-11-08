-- P30: One atomic Save All Changes request for the ASP/course Question Bank.
-- Deploy only after verified P28.2 + P29 on the intended Staging database.
-- SOURCE ONLY: No live data changes. Never replay prior P28/P29 installers.
-- Preserve verified P6A/P9B/P10 Mock reservations and P8e learner grading.
BEGIN;
DO $p30_preflight$
DECLARE missing text[]:=ARRAY[]::text[];
BEGIN
 IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
  OR to_regclass('public.lms_questions') IS NULL
  OR to_regclass('public.lms_audit_events') IS NULL
 THEN missing:=array_append(missing,'P1/P4 Admin Question Bank'); END IF;
 IF to_regprocedure('public.lms_p29_set_question_flags(uuid,boolean,boolean)') IS NULL
  OR NOT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lms_questions' AND column_name='mock_candidate')
 THEN missing:=array_append(missing,'P29 Active/Mock candidate controls'); END IF;
 IF to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NULL
  OR to_regclass('public.lms_p22_lesson_quiz_questions') IS NULL
 THEN missing:=array_append(missing,'P22/P28 protected Lesson Quiz links'); END IF;
 IF to_regclass('public.lms_p9b_mock_items') IS NULL
 THEN missing:=array_append(missing,'P9B immutable Mock reservation'); END IF;
 IF cardinality(missing)>0 THEN
  RAISE EXCEPTION 'P30 missing verified prerequisites: %',array_to_string(missing,', ');
 END IF;
 IF to_regprocedure('public.lms_p30_save_question_bank(uuid,jsonb)') IS NOT NULL
  OR to_regprocedure('public.lms_p30_bank_capabilities()') IS NOT NULL
 THEN RAISE EXCEPTION 'P30 already installed or partial conflict; do not replay'; END IF;
END $p30_preflight$;

-- One network request, one PostgreSQL transaction. ANY invalid row aborts all
-- edits/links, with no partial updates. Admin-only and scoped to real Course.
-- Each row includes its original values for optimistic concurrency. Difficulty
-- is an unpublished DRAFT classification; an ASP approved review cannot be
-- silently changed after independent P9B/P6A authorization.
CREATE FUNCTION public.lms_p30_save_question_bank(
 p_course_id uuid,p_changes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $p30_fn$
DECLARE
 v_actor uuid:=(SELECT auth.uid());
 v_count integer;v_updated integer:=0;v_links integer:=0;v_unpublished integer:=0;
 v_item jsonb;v_q public.lms_questions%ROWTYPE;v_id uuid;v_course uuid;
 v_expected_active boolean;v_expected_mock boolean;v_expected_diff text;v_expected_approval text;
 v_active boolean;v_mock boolean;v_diff text;v_lesson uuid;
 v_seen uuid[]:=ARRAY[]::uuid[];v_result jsonb;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required to save Question Bank'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Select an existing Course'; END IF;
 IF p_changes IS NULL OR jsonb_typeof(p_changes)<>'array'
 THEN RAISE EXCEPTION 'Expected an array of Question Bank changes'; END IF;
 v_count:=jsonb_array_length(p_changes);
 IF v_count<1 OR v_count>500 OR length(p_changes::text)>400000
 THEN RAISE EXCEPTION 'Save between 1 and 500 question changes per batch'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_changes) AS x(value) LOOP
  IF jsonb_typeof(v_item)<>'object' OR NOT
    (v_item ?& ARRAY['questionId','expectedActive','expectedMockCandidate',
       'expectedDifficulty','expectedApprovalState','isActive','mockCandidate','difficulty'])
    OR jsonb_typeof(v_item->'isActive')<>'boolean'
    OR jsonb_typeof(v_item->'mockCandidate')<>'boolean'
    OR jsonb_typeof(v_item->'expectedActive')<>'boolean'
    OR jsonb_typeof(v_item->'expectedMockCandidate')<>'boolean'
    OR jsonb_typeof(v_item->'difficulty')<>'string'
    OR jsonb_typeof(v_item->'expectedDifficulty')<>'string'
  THEN RAISE EXCEPTION 'Question change has missing or invalid values'; END IF;
  v_id:=(v_item->>'questionId')::uuid;
  IF v_id=ANY(v_seen) THEN RAISE EXCEPTION 'Repeated question in one save request'; END IF;
  v_seen:=array_append(v_seen,v_id);
  SELECT * INTO v_q FROM public.lms_questions
   WHERE id=v_id AND course_id=p_course_id FOR UPDATE;
  IF v_q.id IS NULL THEN RAISE EXCEPTION 'Question not found in selected Course'; END IF;
  v_expected_active:=(v_item->>'expectedActive')::boolean;
  v_expected_mock:=(v_item->>'expectedMockCandidate')::boolean;
  v_expected_diff:=v_item->>'expectedDifficulty';
  v_expected_approval:=v_item->>'expectedApprovalState';
  IF v_q.is_active IS DISTINCT FROM v_expected_active
    OR v_q.mock_candidate IS DISTINCT FROM v_expected_mock
    OR v_q.difficulty IS DISTINCT FROM v_expected_diff
    OR v_q.approval_state IS DISTINCT FROM v_expected_approval
  THEN RAISE EXCEPTION 'Question changed since loading; reload before saving'; END IF;
  v_active:=(v_item->>'isActive')::boolean;
  v_mock:=(v_item->>'mockCandidate')::boolean;
  v_diff:=v_item->>'difficulty';
  IF v_diff NOT IN ('unclassified','low','medium','high')
   THEN RAISE EXCEPTION 'Invalid Difficulty: choose Low, Medium or High'; END IF;
  v_lesson:=NULL;
  IF v_item ? 'addLessonId' AND jsonb_typeof(v_item->'addLessonId')<>'null'
     AND nullif(v_item->>'addLessonId','') IS NOT NULL
  THEN v_lesson:=(v_item->>'addLessonId')::uuid; END IF;
  IF v_q.mock_exclusive OR EXISTS(SELECT 1 FROM public.lms_p9b_mock_items
      WHERE question_id=v_q.id)
  THEN
   -- Official Mock form and its source are immutable.
   IF v_active IS DISTINCT FROM v_q.is_active OR v_mock IS DISTINCT FROM v_q.mock_candidate
      OR v_diff IS DISTINCT FROM v_q.difficulty OR v_lesson IS NOT NULL
   THEN RAISE EXCEPTION 'Official ASP Mock reservation is immutable'; END IF;
   CONTINUE;
  END IF;
  IF v_diff IS DISTINCT FROM v_q.difficulty THEN
   IF v_q.approval_state<>'draft'
   THEN RAISE EXCEPTION 'Approved Difficulty needs a new independent question review'; END IF;
   UPDATE public.lms_questions
     SET difficulty=v_diff,updated_at=clock_timestamp() WHERE id=v_id;
   INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
   VALUES(v_actor,'p30_question_difficulty_changed','question',v_id,
    jsonb_build_object('courseId',p_course_id,'oldDifficulty',v_q.difficulty,'newDifficulty',v_diff));
  END IF;
  IF v_active IS DISTINCT FROM v_q.is_active OR v_mock IS DISTINCT FROM v_q.mock_candidate THEN
   v_result:=public.lms_p29_set_question_flags(v_id,v_active,v_mock);
   v_unpublished:=v_unpublished+coalesce((v_result->>'unpublishedLessonQuizItems')::integer,0);
  END IF;
  IF v_lesson IS NOT NULL THEN
   IF v_mock OR NOT v_active THEN
    RAISE EXCEPTION 'Only Active non-Mock questions can be assigned to a Lesson Quiz'; END IF;
   -- A Lesson may contain multiple question IDs, and a question may be linked
   -- to multiple Lessons. Existing associations are never silently deleted.
   IF NOT EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
       WHERE lesson_id=v_lesson AND bank_question_id=v_id)
   THEN
    PERFORM public.lms_p28_attach_lesson_question(v_lesson,v_id,v_q.approval_state='approved');
    v_links:=v_links+1;
   END IF;
  END IF;
  v_updated:=v_updated+1;
 END LOOP;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'p30_question_bank_batch_saved','course',p_course_id,
   jsonb_build_object('questionCount',v_count,'savedCount',v_updated,
     'lessonLinksAdded',v_links,'lessonQuizItemsUnpublished',v_unpublished));
 RETURN jsonb_build_object('saved',v_updated,'requested',v_count,
   'linked',v_links,'unpublished',v_unpublished);
END $p30_fn$;

-- Read-only version probe so the UI can disable batch edit controls until this
-- exact migration is present. Never use a write attempt for capability detection.
CREATE FUNCTION public.lms_p30_bank_capabilities()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $p30_caps$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Admin only'; END IF;
 RETURN jsonb_build_object('version','p30-v1','maxBatch',500,'atomic',true);
END $p30_caps$;
REVOKE ALL ON FUNCTION public.lms_p30_save_question_bank(uuid,jsonb),
 public.lms_p30_bank_capabilities()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p30_save_question_bank(uuid,jsonb),
 public.lms_p30_bank_capabilities()
 TO authenticated,service_role;
COMMIT;
