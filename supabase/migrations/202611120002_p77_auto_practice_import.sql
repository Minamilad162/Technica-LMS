-- P77: New Admin-validated Excel imports are Active/Approved for Practice.
-- No existing question rows are mutated on installation; historical Drafts
-- can be activated with a separate explicit Admin action, count-checked.
BEGIN;
DO $p77$ BEGIN
 IF to_regprocedure('public.lms_p28_import_bank(uuid,jsonb)') IS NULL
 OR to_regprocedure('public.lms_p29_set_question_flags(uuid,boolean,boolean)') IS NULL
 OR to_regprocedure('public.lms_p30_save_question_bank(uuid,jsonb)') IS NULL
 OR to_regclass('public.lms_p34_selected_mock_answers') IS NULL
 OR to_regclass('public.lms_p9b_mock_items') IS NULL
 THEN RAISE EXCEPTION 'P77 requires P28/P29/P30/P34B/P71'; END IF;
END $p77$;

-- New RPC leaves the historical P28 Draft importer untouched.
CREATE FUNCTION public.lms_p77_import_bank(p_course_id uuid,p_items jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_item jsonb;v_source text;v_prompt text;v_options jsonb;
DECLARE v_correct integer;v_domain uuid;v_difficulty text;v_id uuid;v_added integer:=0;v_skipped integer:=0;
DECLARE v_actor uuid:=(SELECT auth.uid());
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active LMS Admin required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses
   WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Select an actual course'; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50
 THEN RAISE EXCEPTION 'Upload batches must contain 1 to 50 questions'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  v_source:=btrim(coalesce(v_item->>'sourceId',''));
  v_prompt:=btrim(coalesce(v_item->>'prompt',''));
  v_options:=v_item->'options';
  IF coalesce(v_item->>'correctIndex','') !~ '^[0-5]$'
  THEN RAISE EXCEPTION 'Invalid answer index in import'; END IF;
  v_correct:=(v_item->>'correctIndex')::integer;
  IF length(v_source) NOT BETWEEN 1 AND 160
   OR length(v_prompt) NOT BETWEEN 5 AND 12000
   OR jsonb_typeof(v_options) IS DISTINCT FROM 'array'
   OR jsonb_array_length(v_options) NOT BETWEEN 2 AND 6
   OR v_correct>=jsonb_array_length(v_options)
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_options) x
      WHERE jsonb_typeof(x.value)<>'string' OR length(btrim(x.value#>>'{}'))=0
        OR length(x.value#>>'{}')>400)
   OR length(coalesce(v_item->>'explanation',''))>12000
   OR length(coalesce(v_item->>'reference',''))>2000
  THEN RAISE EXCEPTION 'Invalid question row or options; no partial batch imported'; END IF;
  -- Source difficulty is a draft classification only. P6A/P9B verified
  -- reviewer difficulty still governs live ASP eligibility.
  v_difficulty:=lower(coalesce(nullif(v_item->>'difficulty',''),'unclassified'));
  IF v_difficulty NOT IN ('unclassified','low','medium','high')
  THEN RAISE EXCEPTION 'Invalid draft difficulty; expected low, medium, high or unclassified'; END IF;
  v_domain:=NULL;
  IF nullif(v_item->>'domainId','') IS NOT NULL THEN
   v_domain:=(v_item->>'domainId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.lms_domains
      WHERE id=v_domain AND course_id=p_course_id)
   THEN RAISE EXCEPTION 'Domain is not part of selected course'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.lms_questions
   WHERE course_id=p_course_id
   AND (source_id=v_source OR lower(btrim(prompt))=lower(v_prompt)))
  THEN v_skipped:=v_skipped+1; CONTINUE; END IF;
  INSERT INTO public.lms_questions
   (course_id,source_id,domain_id,legacy_group,prompt,options,correct_index,
     explanation,reference_text,difficulty,approval_state,mock_exclusive)
  VALUES(p_course_id,v_source,v_domain,coalesce(v_item->>'topic',''),
   v_prompt,v_options,v_correct,coalesce(v_item->>'explanation',''),
   coalesce(v_item->>'reference',''),v_difficulty,'approved',false)
  ON CONFLICT(course_id,source_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN v_skipped:=v_skipped+1; ELSE v_added:=v_added+1; END IF;
  v_id:=NULL;
 END LOOP;
 IF v_added>0 THEN
  INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
  VALUES(v_actor,'p28_course_bank_import','course',p_course_id,
   jsonb_build_object('imported',v_added,'skipped',v_skipped,'defaultApproval','approved','defaultActive',true,'practiceEligible',true));
 END IF;
 RETURN jsonb_build_object('courseId',p_course_id,'inserted',v_added,
   'skipped',v_skipped,'state','approved','isActive',true);
END $$;

-- Atomic Practice -> Mock conversion for unused questions, retains OID/grants.
CREATE OR REPLACE FUNCTION public.lms_p29_set_question_flags(
 p_question_id uuid,p_is_active boolean,p_mock_candidate boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.lms_questions%ROWTYPE; v_unpublished integer:=0;
DECLARE v_reserved boolean;v_approval text;
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
 -- Only an unused, unlinked question can move from Practice to Mock.
 IF p_mock_candidate AND NOT q.mock_candidate THEN
  IF q.approval_state NOT IN ('draft','approved')
     OR EXISTS(SELECT 1 FROM public.lms_practice_attempt_items WHERE question_id=q.id)
     OR EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id=q.id)
  THEN RAISE EXCEPTION 'Question used in Practice, linked to Lesson, or archived: import a new unused revision for Mock'; END IF;
 END IF;
 IF q.mock_candidate AND NOT p_mock_candidate AND EXISTS
  (SELECT 1 FROM public.lms_p34_selected_mock_answers WHERE question_id=q.id)
 THEN RAISE EXCEPTION 'Mock question already delivered, cannot move it into Practice'; END IF;
 v_approval:=CASE WHEN p_mock_candidate THEN 'draft'
     WHEN q.mock_candidate AND NOT p_mock_candidate THEN 'approved'
     ELSE q.approval_state END;
 IF p_is_active IS DISTINCT FROM q.is_active OR p_mock_candidate IS DISTINCT FROM q.mock_candidate THEN
  UPDATE public.lms_questions SET is_active=p_is_active,
     mock_candidate=p_mock_candidate,approval_state=v_approval,updated_at=clock_timestamp() WHERE id=q.id;
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
     'newMockCandidate',p_mock_candidate,'oldApprovalState',q.approval_state,'newApprovalState',v_approval,'unpublishedLessonQuizItems',v_unpublished));
 END IF;
 RETURN jsonb_build_object('id',q.id,'isActive',p_is_active,
   'mockCandidate',p_mock_candidate,'approvalState',v_approval,'mockExclusive',false,
   'unpublishedLessonQuizItems',v_unpublished);
END $$;

CREATE FUNCTION public.lms_p77_existing_practice_preview(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $preview$
DECLARE v_n integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Invalid Course'; END IF;
 SELECT count(*) INTO v_n FROM public.lms_questions q WHERE q.course_id=p_course_id AND q.source_id LIKE 'file:%' AND q.approval_state='draft'
 AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
 AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p34_selected_mock_answers a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items a WHERE a.question_id=q.id);
 RETURN jsonb_build_object('version','p77-v1','courseId',p_course_id,
  'count',v_n,'autoApproveNewImports',true);
END $preview$;

-- Explicit one-time Admin action, NOT called during migration/page load.
CREATE FUNCTION public.lms_p77_activate_existing_practice(p_course_id uuid,
 p_expected_count integer,p_confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $activate$
DECLARE v_actor uuid:=(SELECT auth.uid());v_n integer;v_written integer;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required'; END IF;
 IF p_confirmation IS DISTINCT FROM 'ACTIVATE EXISTING PRACTICE IMPORTS'
 OR p_expected_count IS NULL OR p_expected_count NOT BETWEEN 1 AND 10000
 THEN RAISE EXCEPTION 'Explicit Admin confirmation and exact expected count required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Invalid Course'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_course_id::text,77));
 SELECT count(*) INTO v_n FROM public.lms_questions q WHERE q.course_id=p_course_id AND q.source_id LIKE 'file:%' AND q.approval_state='draft'
 AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
 AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p34_selected_mock_answers a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items a WHERE a.question_id=q.id);
 IF v_n<>p_expected_count THEN RAISE EXCEPTION 'Preview count changed, reload before activating'; END IF;
 UPDATE public.lms_questions q SET approval_state='approved',updated_at=clock_timestamp()
 WHERE q.course_id=p_course_id AND q.source_id LIKE 'file:%' AND q.approval_state='draft'
 AND q.is_active AND NOT q.mock_exclusive AND NOT q.mock_candidate
 AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p34_selected_mock_answers a WHERE a.question_id=q.id)
 AND NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items a WHERE a.question_id=q.id);
 GET DIAGNOSTICS v_written=ROW_COUNT;
 IF v_written<>p_expected_count THEN RAISE EXCEPTION 'Concurrent approval, rolled back'; END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'p77_existing_imports_activated','course',p_course_id,
  jsonb_build_object('activated',v_written,'expected',p_expected_count,
   'source','file-import-only','preservedMock',true,'explicitAdminAction',true));
 RETURN jsonb_build_object('courseId',p_course_id,'activated',v_written,'mockUnchanged',true);
END $activate$;

REVOKE ALL ON FUNCTION public.lms_p77_import_bank(uuid,jsonb),
 public.lms_p77_existing_practice_preview(uuid),
 public.lms_p77_activate_existing_practice(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p77_import_bank(uuid,jsonb),
 public.lms_p77_existing_practice_preview(uuid),
 public.lms_p77_activate_existing_practice(uuid,integer,text) TO authenticated,service_role;
COMMIT;
