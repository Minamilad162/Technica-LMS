-- P28.2 Forward upgrade: installed original P28 (4-argument catalog) -> P28.1 filtered ASP Bank.
-- NOT a replay of P22 or P28; no ALTER/DROP of source/learner data or immutable Mock reservations.
-- Run ONCE only on verified Technica staging after owner-reviewed ledger/backup/read-only inventory.
-- Strictly requires the installed original P28 objects and an ABSENT 7-argument filtered function.
BEGIN;
DO $p282_preflight$
DECLARE v_missing text[] := ARRAY[]::text[];
BEGIN
 IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN v_missing:=array_append(v_missing,'P1 Admin authorization'); END IF;
 IF to_regclass('public.lms_questions') IS NULL
    OR to_regclass('public.lms_courses') IS NULL
    OR to_regclass('public.lms_domains') IS NULL
    OR to_regclass('public.lms_audit_events') IS NULL
 THEN v_missing:=array_append(v_missing,'P4 canonical Bank/Course/Domain/Audit'); END IF;
 IF to_regclass('public.lms_p22_lesson_quiz_questions') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_attribute
       WHERE attrelid=to_regclass('public.lms_p22_lesson_quiz_questions')
         AND attname='bank_question_id' AND NOT attisdropped)
 THEN v_missing:=array_append(v_missing,'P22/P28 linked Lesson Quiz'); END IF;
 IF to_regprocedure('public.lms_p28_import_bank(uuid,jsonb)') IS NULL
    OR to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NULL
    OR to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NULL
    OR to_regprocedure('public.lms_p28_guard_quiz_link()') IS NULL
 THEN v_missing:=array_append(v_missing,'P28 original protected functions'); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid=to_regclass('public.lms_p22_lesson_quiz_questions')
     AND tgname='lms_p28_quiz_link_guard' AND NOT tgisinternal)
 THEN v_missing:=array_append(v_missing,'P28 Lesson Quiz protection trigger'); END IF;
 IF array_length(v_missing,1)>0
 THEN RAISE EXCEPTION 'P28.2 missing original installation: %',array_to_string(v_missing,', '); END IF;
 IF to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'P28.2 filtered Bank already installed; do not replay'; END IF;
END $p282_preflight$;

-- Strengthen the existing trigger without recreating it or editing stored P22 rows.
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

-- Preserve the exact existing Import RPC signature and permissions. Newly uploaded Draft
-- questions may record a provisional difficulty; ASP human review is still mandatory.
CREATE OR REPLACE FUNCTION public.lms_p28_import_bank(p_course_id uuid,p_items jsonb)
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

-- ADD the 7-required-argument catalog, retaining the old 4-argument function for
-- existing clients. No DEFAULT arguments avoids ambiguous PostgreSQL RPC resolution.
CREATE FUNCTION public.lms_p28_list_bank(
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

-- The new function is Admin-only; revoke default PUBLIC function EXECUTE before COMMIT.
REVOKE ALL ON FUNCTION public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)
 TO authenticated,service_role;

-- Previous EXECUTE permissions on the replaced functions remain unchanged.
-- No source question, answer, role, reservation, grade or learner row is updated.
COMMIT;
