-- P34A: Admin Save All is the final explicit lesson-quiz publication action.
-- Additive forward-only migration; requires P1/P22/P28.2/P29/P30.
-- No existing data is published by installing this file. ASP Practice review
-- and the immutable 200-question official Mock remain unchanged.
BEGIN;
DO $p34a_preflight$
BEGIN
 IF to_regprocedure('public.lms_p30_save_question_bank(uuid,jsonb)') IS NULL
 OR to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NULL
 OR to_regprocedure('public.lms_p29_set_question_flags(uuid,boolean,boolean)') IS NULL
 OR to_regclass('public.lms_p22_lesson_quiz_questions') IS NULL
 OR to_regclass('public.lms_p9b_mock_items') IS NULL
 THEN RAISE EXCEPTION 'P34A requires verified P22/P28.2/P29/P30 and P9B; do not replay old migrations'; END IF;
 IF to_regclass('public.lms_p34_lesson_releases') IS NOT NULL
 OR to_regprocedure('public.lms_p34_save_question_bank(uuid,jsonb,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P34A installed or conflicts; do not replay'; END IF;
END $p34a_preflight$;

-- This is a COURSE/LESSON-SCOPED authorization receipt for an Admin's
-- explicit Save/Publish. A Draft's receipt permits ONLY the Lesson Quiz, not
-- Practice, Level Up, Mock or another Lesson. No answer keys/IDs to learners.
CREATE TABLE public.lms_p34_lesson_releases(
 quiz_question_id uuid PRIMARY KEY REFERENCES public.lms_p22_lesson_quiz_questions(id)
   ON DELETE CASCADE,
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 bank_question_id uuid NOT NULL REFERENCES public.lms_questions(id) ON DELETE RESTRICT,
 published_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 release_scope text NOT NULL DEFAULT 'lesson_only' CHECK(release_scope='lesson_only')
);
CREATE INDEX lms_p34_releases_by_lesson ON public.lms_p34_lesson_releases(lesson_id,bank_question_id);
ALTER TABLE public.lms_p34_lesson_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_p34_lesson_releases FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.lms_p34_lesson_releases TO service_role;

-- Keep P29 canonical link guards unchanged except one tightly scoped
-- publication permission based on a private P34 receipt for that exact link.
CREATE OR REPLACE FUNCTION public.lms_p28_guard_quiz_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $p34a_quiz_guard$
DECLARE v_q public.lms_questions%ROWTYPE; v_course uuid; v_release boolean:=false;
BEGIN
 IF NEW.bank_question_id IS NULL THEN
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
 THEN RAISE EXCEPTION 'Cannot silently replace linked Bank question'; END IF;
 SELECT * INTO v_q FROM public.lms_questions WHERE id=NEW.bank_question_id FOR SHARE;
 SELECT d.course_id INTO v_course
 FROM public.lms_lessons l
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 WHERE l.id=NEW.lesson_id;
 IF v_q.id IS NULL OR v_course IS NULL OR v_q.course_id<>v_course
 THEN RAISE EXCEPTION 'Lesson question must belong to the same Course'; END IF;
 IF v_q.mock_exclusive OR v_q.mock_candidate
  OR (NOT v_q.is_active AND (TG_OP='INSERT' OR NEW.is_published))
  OR v_q.approval_state='archived'
 THEN RAISE EXCEPTION 'Disabled, Mock-only or archived Bank question cannot enter a published Lesson Quiz'; END IF;
 IF NEW.is_published AND v_q.approval_state<>'approved' THEN
  SELECT EXISTS(SELECT 1 FROM public.lms_p34_lesson_releases r
   WHERE r.quiz_question_id=NEW.id AND r.lesson_id=NEW.lesson_id
    AND r.bank_question_id=NEW.bank_question_id AND r.release_scope='lesson_only')
  INTO v_release;
  IF NOT v_release
   THEN RAISE EXCEPTION 'This Draft needs explicit Admin Save or Publish authorization for this Lesson'; END IF;
 END IF;
 IF length(btrim(v_q.prompt))>1000
 THEN RAISE EXCEPTION 'Question exceeds Lesson Quiz 1000-character limit'; END IF;
 NEW.prompt:=v_q.prompt; NEW.options:=v_q.options; NEW.correct_index:=v_q.correct_index;
 RETURN NEW;
END $p34a_quiz_guard$;

-- Preserve P29 Mock/Practice separation and immutable question content. A
-- Draft published *only* by an explicit P34 lesson receipt remains Draft for
-- Practice/Level Up and can be disabled without a stale approval exception.
CREATE OR REPLACE FUNCTION public.lms_p28_guard_bank_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $p34a_bank_guard$
BEGIN
 IF NEW.mock_candidate AND NEW.approval_state='approved'
 THEN RAISE EXCEPTION 'Mock candidate is exclusive; uncheck Mock before Practice approval'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions z
   WHERE z.bank_question_id=OLD.id)
 AND (
   NEW.mock_exclusive IS TRUE OR NEW.approval_state='archived'
   OR NEW.prompt IS DISTINCT FROM OLD.prompt
   OR NEW.options IS DISTINCT FROM OLD.options
   OR NEW.correct_index IS DISTINCT FROM OLD.correct_index
   OR (NEW.approval_state<>'approved' AND EXISTS(
    SELECT 1 FROM public.lms_p22_lesson_quiz_questions z
    WHERE z.bank_question_id=OLD.id AND z.is_published
      AND NOT EXISTS(
       SELECT 1 FROM public.lms_p34_lesson_releases r
       WHERE r.quiz_question_id=z.id AND r.lesson_id=z.lesson_id
        AND r.bank_question_id=OLD.id)
   ))
 ) THEN RAISE EXCEPTION 'Question linked to Lesson Quiz: unlink before Mock, archive or content edits'; END IF;
 RETURN NEW;
END $p34a_bank_guard$;

-- Private worker: only privileged P34 functions call it after verifying the
-- JWT Admin. Does not override existing Mock or cross-course protections.
CREATE FUNCTION public.lms_p34_release_one(p_lesson_id uuid,p_quiz_question_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34a_one$
DECLARE v_item public.lms_p22_lesson_quiz_questions%ROWTYPE;
 v_q public.lms_questions%ROWTYPE;
BEGIN
 SELECT * INTO v_item FROM public.lms_p22_lesson_quiz_questions
 WHERE id=p_quiz_question_id AND lesson_id=p_lesson_id FOR UPDATE;
 IF v_item.id IS NULL OR v_item.bank_question_id IS NULL
 THEN RAISE EXCEPTION 'Selected Lesson Quiz Bank link not found'; END IF;
 SELECT * INTO v_q FROM public.lms_questions
 WHERE id=v_item.bank_question_id FOR SHARE;
 IF v_q.id IS NULL OR NOT v_q.is_active OR v_q.mock_exclusive OR v_q.mock_candidate
 OR v_q.approval_state='archived'
 OR NOT EXISTS(SELECT 1 FROM public.lms_lessons l
    JOIN public.lms_topics t ON t.id=l.topic_id
    JOIN public.lms_domains d ON d.id=t.domain_id
    WHERE l.id=p_lesson_id AND d.course_id=v_q.course_id)
 OR length(btrim(v_q.prompt)) NOT BETWEEN 8 AND 1000
 OR jsonb_array_length(v_q.options) NOT BETWEEN 2 AND 6
 OR v_q.correct_index<0 OR v_q.correct_index>=jsonb_array_length(v_q.options)
 THEN RAISE EXCEPTION 'Lesson Quiz question not eligible for direct Admin publication'; END IF;
 IF v_item.is_published THEN RETURN false; END IF;
 INSERT INTO public.lms_p34_lesson_releases
  (quiz_question_id,lesson_id,bank_question_id,published_by)
 VALUES(v_item.id,p_lesson_id,v_q.id,(SELECT auth.uid()))
 ON CONFLICT (quiz_question_id) DO NOTHING;
 UPDATE public.lms_p22_lesson_quiz_questions
 SET is_published=true WHERE id=v_item.id AND NOT is_published;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'p34_admin_saved_published_lesson_question',
  'lesson',p_lesson_id,jsonb_build_object('quizQuestionId',v_item.id,
  'bankQuestionId',v_q.id,'bankApprovalState',v_q.approval_state,
  'scope','lesson_only','noPracticeRelease',true));
 RETURN true;
END $p34a_one$;
REVOKE ALL ON FUNCTION public.lms_p34_release_one(uuid,uuid)
 FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p34_publish_lesson_quiz(p_lesson_id uuid,p_quiz_question_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34a_pub$
DECLARE v_done boolean;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required'; END IF;
 v_done:=public.lms_p34_release_one(p_lesson_id,p_quiz_question_id);
 RETURN jsonb_build_object('published',v_done,'lessonId',p_lesson_id,'quizQuestionId',p_quiz_question_id);
END $p34a_pub$;

-- P30 still validates all edits/snapshots, sets flags, and creates links.
-- The same atomic request now publishes newly selected Lesson Quiz questions
-- even when the source remains Draft. Optional explicit release_lesson_id
-- publishes older saved-but-unpublished links, including the user's 2 rows.
CREATE FUNCTION public.lms_p34_save_question_bank(
 p_course_id uuid,p_changes jsonb,p_release_lesson_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $p34a_save$
DECLARE v_actor uuid:=(SELECT auth.uid());
 v_count integer;v_core jsonb:='{"saved":0,"requested":0,"linked":0,"unpublished":0}'::jsonb;
 v_item jsonb;v_lesson uuid;v_question uuid;v_quiz uuid;
 v_published integer:=0;v_new boolean;v_lesson_count integer;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Select a real Course'; END IF;
 IF p_changes IS NULL OR jsonb_typeof(p_changes)<>'array'
 THEN RAISE EXCEPTION 'Expected an array of staged bank changes'; END IF;
 v_count:=jsonb_array_length(p_changes);
 IF v_count>500 OR length(p_changes::text)>400000 OR
   (v_count=0 AND p_release_lesson_id IS NULL)
 THEN RAISE EXCEPTION 'Choose at least one action, maximum 500 changes'; END IF;
 IF p_release_lesson_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.lms_lessons l JOIN public.lms_topics t ON t.id=l.topic_id
  JOIN public.lms_domains d ON d.id=t.domain_id
  WHERE l.id=p_release_lesson_id AND d.course_id=p_course_id)
 THEN RAISE EXCEPTION 'Chosen publish Lesson must be in selected Course'; END IF;
 IF v_count>0 THEN
  v_core:=public.lms_p30_save_question_bank(p_course_id,p_changes);
 END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_changes) z(value) LOOP
  IF nullif(v_item->>'addLessonId','') IS NULL THEN CONTINUE; END IF;
  v_lesson:=(v_item->>'addLessonId')::uuid;
  v_question:=(v_item->>'questionId')::uuid;
  SELECT id INTO v_quiz FROM public.lms_p22_lesson_quiz_questions
   WHERE lesson_id=v_lesson AND bank_question_id=v_question;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'Selected Lesson link was not saved'; END IF;
  v_new:=public.lms_p34_release_one(v_lesson,v_quiz);
  IF v_new THEN v_published:=v_published+1; END IF;
 END LOOP;
 IF p_release_lesson_id IS NOT NULL THEN
  SELECT count(*) INTO v_lesson_count FROM public.lms_p22_lesson_quiz_questions
  WHERE lesson_id=p_release_lesson_id AND bank_question_id IS NOT NULL;
  IF v_lesson_count>100 THEN RAISE EXCEPTION 'Maximum 100 Lesson Quiz questions'; END IF;
  FOR v_quiz IN
   SELECT id FROM public.lms_p22_lesson_quiz_questions
   WHERE lesson_id=p_release_lesson_id AND bank_question_id IS NOT NULL
   ORDER BY position,id
  LOOP
   v_new:=public.lms_p34_release_one(p_release_lesson_id,v_quiz);
   IF v_new THEN v_published:=v_published+1; END IF;
  END LOOP;
 END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'p34_admin_one_save_release','course',p_course_id,
  jsonb_build_object('stagedRows',v_count,'publishedLessonQuestions',v_published,
  'existingLessonRelease',p_release_lesson_id,'scope','lesson_only'));
 RETURN v_core||jsonb_build_object('published',v_published,'oneSave',true,
  'releaseLessonId',p_release_lesson_id);
END $p34a_save$;

CREATE FUNCTION public.lms_p34_bank_capabilities()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $p34a_caps$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Admin only'; END IF;
 RETURN jsonb_build_object('version','p34a-v1','maxBatch',500,
   'atomic',true,'lessonQuizPublishOnSave',true,'draftPracticeSeparate',true);
END $p34a_caps$;
REVOKE ALL ON FUNCTION public.lms_p34_publish_lesson_quiz(uuid,uuid),
 public.lms_p34_save_question_bank(uuid,jsonb,uuid),
 public.lms_p34_bank_capabilities()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p34_publish_lesson_quiz(uuid,uuid),
 public.lms_p34_save_question_bank(uuid,jsonb,uuid),
 public.lms_p34_bank_capabilities()
 TO authenticated,service_role;
COMMIT;
