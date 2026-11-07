-- P28: course-scoped Question Bank, guarded lesson links and Mock-only selection.
-- SOURCE ONLY: owner-approved Staging ledger/backup/RLS tests before executing.
-- DOES NOT import rows, reserve ASP Mock forms, publish content or change learner data.
BEGIN;
DO $p28$
DECLARE v_missing text[] := ARRAY[]::text[];
BEGIN
 IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN v_missing := array_append(v_missing, 'P1 Admin role function'); END IF;
 IF to_regclass('public.lms_courses') IS NULL
    OR to_regclass('public.lms_lessons') IS NULL
    OR to_regclass('public.lms_audit_events') IS NULL
 THEN v_missing := array_append(v_missing, 'P1 Course/Lesson/Audit tables'); END IF;
 IF to_regclass('public.lms_questions') IS NULL
    OR to_regclass('public.lms_practice_attempt_items') IS NULL
 THEN v_missing := array_append(v_missing, 'P4 Question Bank/Practice tables'); END IF;
 IF to_regclass('public.lms_p22_lesson_quiz_questions') IS NULL
 THEN v_missing := array_append(v_missing, 'P22 Lesson Quiz table'); END IF;
 IF array_length(v_missing,1)>0
 THEN RAISE EXCEPTION 'P28 missing prerequisites: %',array_to_string(v_missing,', ');
 END IF;
 -- P9B is deliberately NOT a prerequisite for non-ASP Course banks.
 -- Its immutable ASP 200-question reservation rules remain untouched and
 -- are still required before using the separate ASP Mock engine.
 IF to_regprocedure('public.lms_p28_import_bank(uuid,jsonb)') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='lms_p22_lesson_quiz_questions'
     AND column_name='bank_question_id')
 THEN RAISE EXCEPTION 'P28 already installed or conflicts; do not replay'; END IF;
END $p28$;

ALTER TABLE public.lms_p22_lesson_quiz_questions
 ADD COLUMN bank_question_id uuid REFERENCES public.lms_questions(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX lms_p28_lesson_bank_unique
 ON public.lms_p22_lesson_quiz_questions(lesson_id,bank_question_id)
 WHERE bank_question_id IS NOT NULL;

-- Existing authored P22 rows remain unchanged. New links copy the canonical
-- content and answer key on the server; an Admin may not forge a cross-course link.
CREATE FUNCTION public.lms_p28_guard_quiz_link() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_q public.lms_questions%ROWTYPE; v_course uuid;
BEGIN
 IF NEW.bank_question_id IS NULL THEN
  -- Retain edits to historical P22 manually authored rows. Never allow NEW
  -- standalone question rows once P28's canonical Bank feature is installed.
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND OLD.bank_question_id IS NOT NULL)
  THEN RAISE EXCEPTION 'New Lesson Quiz questions must be selected from the Course Question Bank'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=NEW.bank_question_id FOR SHARE;
 SELECT d.course_id INTO v_course
 FROM public.lms_lessons l
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 WHERE l.id=NEW.lesson_id;
 IF v_q.id IS NULL OR v_course IS NULL OR v_q.course_id<>v_course
 THEN RAISE EXCEPTION 'Lesson question must belong to the same course'; END IF;
 IF v_q.mock_exclusive OR v_q.approval_state='archived'
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
CREATE TRIGGER lms_p28_quiz_link_guard
 BEFORE INSERT OR UPDATE ON public.lms_p22_lesson_quiz_questions
 FOR EACH ROW EXECUTE FUNCTION public.lms_p28_guard_quiz_link();

-- A question cannot silently become Mock-only if referenced from a quiz.
-- Admin must explicitly unlink it, preserving a clear audit/UX decision.
CREATE FUNCTION public.lms_p28_guard_bank_assignment() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
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
END $$;
CREATE TRIGGER lms_p28_bank_assignment_guard BEFORE UPDATE ON public.lms_questions
 FOR EACH ROW EXECUTE FUNCTION public.lms_p28_guard_bank_assignment();

-- Import batches of at most 50 validated rows; all new questions are DRAFT.
-- Duplicate source IDs or duplicate normalized prompts are skipped; existing
-- answers/approval/history are never overwritten. No untrusted course ID in rows.
CREATE FUNCTION public.lms_p28_import_bank(p_course_id uuid,p_items jsonb)
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
   coalesce(v_item->>'reference',''),v_difficulty,'draft',false)
  ON CONFLICT(course_id,source_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN v_skipped:=v_skipped+1; ELSE v_added:=v_added+1; END IF;
  v_id:=NULL;
 END LOOP;
 IF v_added>0 THEN
  INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
  VALUES(v_actor,'p28_course_bank_import','course',p_course_id,
   jsonb_build_object('imported',v_added,'skipped',v_skipped,'draftOnly',true));
 END IF;
 RETURN jsonb_build_object('courseId',p_course_id,'inserted',v_added,
   'skipped',v_skipped,'state','draft');
END $$;

-- Admin-only catalogue: paged, scoped, never usable by learner.
CREATE FUNCTION public.lms_p28_list_bank(
 p_course_id uuid,p_search text DEFAULT '',p_limit integer DEFAULT 50,p_offset integer DEFAULT 0,
 p_domain_id uuid DEFAULT NULL,p_difficulty text DEFAULT '',p_usage text DEFAULT 'all'
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
    OR (p_usage='practice' AND q.approval_state='approved' AND NOT q.mock_exclusive)
    OR (p_usage='mock' AND q.mock_exclusive)
    OR (p_usage='draft' AND q.approval_state='draft' AND NOT q.mock_exclusive)
    OR (p_usage='eligible' AND q.approval_state<>'archived' AND NOT q.mock_exclusive)
    OR (p_usage='lesson' AND EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions l
       WHERE l.bank_question_id=q.id)));
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',x.id,'courseId',x.course_id,'sourceId',x.source_id,
  'prompt',x.prompt,'options',x.options,'correctIndex',x.correct_index,
  'domainId',x.domain_id,'topic',x.legacy_group,
  'explanation',x.explanation,'reference',x.reference_text,
  'approvalState',x.approval_state,'mockExclusive',x.mock_exclusive,
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
    OR (p_usage='practice' AND q.approval_state='approved' AND NOT q.mock_exclusive)
    OR (p_usage='mock' AND q.mock_exclusive)
    OR (p_usage='draft' AND q.approval_state='draft' AND NOT q.mock_exclusive)
    OR (p_usage='eligible' AND q.approval_state<>'archived' AND NOT q.mock_exclusive)
    OR (p_usage='lesson' AND EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions l
       WHERE l.bank_question_id=q.id)))
  ORDER BY q.created_at DESC,q.id LIMIT p_limit OFFSET p_offset
 ) x;
 RETURN jsonb_build_object('total',v_total,'items',v_items);
END $$;

-- Only non-ASP questions can use this simple individual release path.
-- ASP remains subject to independent review + 200-form P9B/P10 gating.
CREATE FUNCTION public.lms_p28_approve_nonasp(
 p_question_id uuid,p_confirmation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_q public.lms_questions%ROWTYPE;v_slug text;
BEGIN
 IF NOT public.lms_p1_actor_is_admin()
  OR p_confirmation IS DISTINCT FROM 'APPROVE NON-ASP QUESTION'
 THEN RAISE EXCEPTION 'Admin confirmation and rights review required'; END IF;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=p_question_id FOR UPDATE;
 SELECT slug INTO v_slug FROM public.lms_courses WHERE id=v_q.course_id;
 IF v_q.id IS NULL OR v_slug='asp' OR v_q.mock_exclusive
  OR v_q.approval_state<>'draft'
 THEN RAISE EXCEPTION 'Only non-ASP, non-Mock draft items may be approved'; END IF;
 UPDATE public.lms_questions SET approval_state='approved',updated_at=now()
 WHERE id=p_question_id;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'p28_nonasp_question_approved','question',p_question_id,
   jsonb_build_object('courseId',v_q.course_id,'manualRightsConfirmation',true));
 RETURN jsonb_build_object('questionId',p_question_id,'approvalState','approved');
END $$;

-- Mock-only future-course queue. This does NOT activate a non-ASP Mock engine.
CREATE FUNCTION public.lms_p28_mark_nonasp_mock(
 p_question_id uuid,p_confirmation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_q public.lms_questions%ROWTYPE;v_slug text;
BEGIN
 IF NOT public.lms_p1_actor_is_admin()
  OR p_confirmation IS DISTINCT FROM 'RESERVE NON-ASP MOCK ONLY'
 THEN RAISE EXCEPTION 'Admin confirmation required'; END IF;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=p_question_id FOR UPDATE;
 SELECT slug INTO v_slug FROM public.lms_courses WHERE id=v_q.course_id;
 IF v_q.id IS NULL OR v_slug='asp' OR v_q.approval_state<>'draft'
  OR v_q.mock_exclusive OR EXISTS(SELECT 1 FROM public.lms_practice_attempt_items
    WHERE question_id=p_question_id)
  OR EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
    WHERE bank_question_id=p_question_id)
 THEN RAISE EXCEPTION 'Cannot reserve: select unused non-ASP draft question not linked to any lesson'; END IF;
 UPDATE public.lms_questions SET mock_exclusive=true,updated_at=now()
  WHERE id=p_question_id AND NOT mock_exclusive;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'p28_nonasp_mock_only','question',p_question_id,
   jsonb_build_object('courseId',v_q.course_id,'engineActivated',false));
 RETURN jsonb_build_object('questionId',p_question_id,'mockExclusive',true,
  'engineActivated',false);
END $$;

CREATE FUNCTION public.lms_p28_attach_lesson_question(
 p_lesson_id uuid,p_question_id uuid,p_publish boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_course uuid;v_q public.lms_questions%ROWTYPE;v_id uuid;v_position integer;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
 -- Serialize append with other P28 admins for stable P22 position uniqueness.
 PERFORM 1 FROM public.lms_lessons WHERE id=p_lesson_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found'; END IF;
 SELECT d.course_id INTO v_course FROM public.lms_lessons l
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id WHERE l.id=p_lesson_id;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=p_question_id FOR SHARE;
 IF v_course IS NULL OR v_q.id IS NULL OR v_q.course_id<>v_course
  OR v_q.mock_exclusive OR v_q.approval_state='archived'
  OR (coalesce(p_publish,false) AND v_q.approval_state<>'approved')
 THEN RAISE EXCEPTION 'Question not eligible for this course Lesson Quiz'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions
   WHERE lesson_id=p_lesson_id AND bank_question_id=p_question_id)
 THEN RAISE EXCEPTION 'Question already attached to this lesson'; END IF;
 SELECT count(*) INTO v_position FROM public.lms_p22_lesson_quiz_questions WHERE lesson_id=p_lesson_id;
 IF v_position>=100 THEN RAISE EXCEPTION 'Maximum 100 questions per lesson quiz'; END IF;
 SELECT coalesce(max(position),-1)+1 INTO v_position
 FROM public.lms_p22_lesson_quiz_questions WHERE lesson_id=p_lesson_id;
 INSERT INTO public.lms_p22_lesson_quiz_questions
 (lesson_id,position,prompt,options,correct_index,is_published,bank_question_id)
 VALUES(p_lesson_id,v_position,v_q.prompt,v_q.options,v_q.correct_index,
    coalesce(p_publish,false),v_q.id)
 RETURNING id INTO v_id;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'p28_quiz_bank_link','lesson',p_lesson_id,
  jsonb_build_object('bankQuestionId',p_question_id,'published',coalesce(p_publish,false)));
 RETURN jsonb_build_object('quizQuestionId',v_id,'lessonId',p_lesson_id,
  'bankQuestionId',p_question_id,'isPublished',coalesce(p_publish,false));
END $$;

REVOKE ALL ON FUNCTION public.lms_p28_guard_quiz_link(),
 public.lms_p28_guard_bank_assignment(),
 public.lms_p28_import_bank(uuid,jsonb),
 public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text),
 public.lms_p28_approve_nonasp(uuid,text),
 public.lms_p28_mark_nonasp_mock(uuid,text),
 public.lms_p28_attach_lesson_question(uuid,uuid,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p28_import_bank(uuid,jsonb),
 public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text),
 public.lms_p28_approve_nonasp(uuid,text),
 public.lms_p28_mark_nonasp_mock(uuid,text),
 public.lms_p28_attach_lesson_question(uuid,uuid,boolean)
 TO authenticated,service_role;
COMMIT;
