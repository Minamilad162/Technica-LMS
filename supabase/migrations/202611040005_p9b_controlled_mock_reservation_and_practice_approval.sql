-- Technica P9B: EXACT 200 reviewed ASP Mock reservation + independent
-- per-item Practice publication. SOURCE ONLY: OWNER-RUN STAGING FIRST.
-- Not a Mock attempt engine, not a mass publication, not an import.
-- The previously approved P8e fixed 7-of-original-10 remains unchanged.
-- Requires P4/P6A/P8e, but does NOT require P9A (read-only preflight).
-- No existing question, review, entitlement, attempt or source row is changed
-- by INSTALLING this migration. Mutations require explicit Admin RPC calls.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_questions') IS NULL
 OR to_regclass('public.lms_p6_question_reviews') IS NULL
 OR to_regclass('public.lms_audit_events') IS NULL
 OR to_regprocedure('public.lms_p6_review_question(uuid,uuid,text,boolean,boolean,text)') IS NULL
 OR to_regprocedure('public.lms_p8_answer_levelup(uuid,uuid,integer)') IS NULL
 OR to_regprocedure('public.lms_p8_medium_checkpoint(integer)') IS NULL
 OR NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lms_practice_adaptive_state'
      AND column_name='promotion_policy')
 THEN RAISE EXCEPTION 'P9B requires installed P4/P6A/P8e on authorized Technica staging'; END IF;
 IF to_regclass('public.lms_p9b_mock_forms') IS NOT NULL
 OR to_regclass('public.lms_p9b_mock_items') IS NOT NULL
 OR to_regprocedure('public.lms_p9b_reserve_mock(uuid,uuid[],text)') IS NOT NULL
 THEN RAISE EXCEPTION 'P9B already installed/conflicts; do not overwrite'; END IF;
END $$;

-- Form metadata has no learner read grant. Status RESERVED means question
-- IDs are exclusively held, NOT that 200/300 Mock engine is activated.
CREATE TABLE public.lms_p9b_mock_forms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 form_version integer NOT NULL DEFAULT 1 CHECK(form_version=1),
 state text NOT NULL DEFAULT 'reserved' CHECK(state='reserved'),
 question_count integer NOT NULL DEFAULT 200 CHECK(question_count=200),
 reserved_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 reserved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(course_id,form_version)
);
CREATE TABLE public.lms_p9b_mock_items (
 form_id uuid NOT NULL REFERENCES public.lms_p9b_mock_forms(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 200),
 question_id uuid NOT NULL UNIQUE REFERENCES public.lms_questions(id) ON DELETE RESTRICT,
 PRIMARY KEY(form_id,position)
);
ALTER TABLE public.lms_p9b_mock_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_p9b_mock_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_p9b_mock_forms FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.lms_p9b_mock_items FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.lms_p9b_mock_forms TO service_role;
GRANT ALL ON TABLE public.lms_p9b_mock_items TO service_role;

-- Fail closed even for a later service-role maintenance mistake. Any future
-- replacement needs a new owner-approved, audited versioning migration.
CREATE FUNCTION public.lms_p9b_immutable_form() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 RAISE EXCEPTION 'P9B reserved Mock form is immutable; use a reviewed replacement migration';
END; $$;
CREATE TRIGGER lms_p9b_form_immutable BEFORE UPDATE OR DELETE
 ON public.lms_p9b_mock_forms FOR EACH ROW
 EXECUTE FUNCTION public.lms_p9b_immutable_form();
CREATE TRIGGER lms_p9b_item_immutable BEFORE UPDATE OR DELETE
 ON public.lms_p9b_mock_items FOR EACH ROW
 EXECUTE FUNCTION public.lms_p9b_immutable_form();

-- Prevent unreserving or mutating any source item once its stable ID belongs
-- to the 200-item versioned form. No P4/P6A read or server scoring changes.
CREATE FUNCTION public.lms_p9b_guard_reserved_question() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.lms_p9b_mock_items m WHERE m.question_id=OLD.id)
  AND (NEW.mock_exclusive IS DISTINCT FROM true
   OR NEW.approval_state IS DISTINCT FROM OLD.approval_state
   OR NEW.domain_id IS DISTINCT FROM OLD.domain_id
   OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
   OR NEW.prompt IS DISTINCT FROM OLD.prompt
   OR NEW.options IS DISTINCT FROM OLD.options
   OR NEW.correct_index IS DISTINCT FROM OLD.correct_index
   OR NEW.explanation IS DISTINCT FROM OLD.explanation
   OR NEW.reference_text IS DISTINCT FROM OLD.reference_text
   OR NEW.course_id IS DISTINCT FROM OLD.course_id
   OR NEW.source_id IS DISTINCT FROM OLD.source_id)
 THEN RAISE EXCEPTION 'Versioned Mock question cannot be changed or released to Practice'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER lms_p9b_guard_reserved BEFORE UPDATE ON public.lms_questions
 FOR EACH ROW EXECUTE FUNCTION public.lms_p9b_guard_reserved_question();

-- Read-only Admin preview: explicit user-selected stable UUIDs, no auto-picker,
-- no questions/answers or rights notes returned. Every review must be READY,
-- correct answer and commercial rights checked and mapped to ASP11.
CREATE FUNCTION public.lms_p9b_mock_preflight(p_course_id uuid,p_question_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_selected integer; v_unique integer; v_eligible integer;
 v_existing integer; v_forms integer; v_domains integer; v_low integer;
 v_medium integer; v_high integer; v_ready boolean;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active verified Admin required'; END IF;
 IF p_course_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_courses
    WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'Only the genuine ASP course may reserve a Mock'; END IF;
 v_selected:=coalesce(cardinality(p_question_ids),0);
 SELECT count(DISTINCT x.id) INTO v_unique FROM unnest(p_question_ids) x(id);
 SELECT count(*) INTO v_domains FROM public.lms_domains
 WHERE course_id=p_course_id AND slug ~ '^asp11-0[1-9]$';
 SELECT count(*) INTO v_existing FROM public.lms_questions
 WHERE course_id=p_course_id AND mock_exclusive;
 SELECT count(*) INTO v_forms FROM public.lms_p9b_mock_forms
 WHERE course_id=p_course_id;
 SELECT count(*),
   count(*) FILTER(WHERE r.difficulty='low'),
   count(*) FILTER(WHERE r.difficulty='medium'),
   count(*) FILTER(WHERE r.difficulty='high')
 INTO v_eligible,v_low,v_medium,v_high
 FROM public.lms_questions q
 JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
 JOIN public.lms_domains d ON d.id=r.reviewed_domain_id
 WHERE q.id=ANY(p_question_ids) AND q.course_id=p_course_id
   AND q.approval_state='draft' AND NOT q.mock_exclusive
   AND r.review_state='ready' AND r.answer_checked IS TRUE
   AND r.rights_checked IS TRUE AND r.difficulty IN ('low','medium','high')
   AND r.reviewed_by IS NOT NULL AND r.reviewed_at IS NOT NULL
   AND d.course_id=p_course_id AND d.slug ~ '^asp11-0[1-9]$'
   AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items ai
      WHERE ai.question_id=q.id);
 v_ready:=(v_selected=200 AND v_unique=200 AND v_eligible=200
   AND v_existing=0 AND v_forms=0 AND v_domains=9);
 RETURN jsonb_build_object('mode','read_only','courseId',p_course_id,
   'ready',v_ready,'selected',v_selected,'distinctSelected',v_unique,
   'verifiedEligible',v_eligible,'existingReserved',v_existing,
   'existingForms',v_forms,'officialDomainCount',v_domains,
   'low',v_low,'medium',v_medium,'high',v_high,
   'required',200,'mockEngineActive',false);
END; $$;

-- Transactional reservation; revalidates AFTER locking the course/200 items
-- so the read-only preview cannot authorize stale/altered rows (TOCTOU).
CREATE FUNCTION public.lms_p9b_reserve_mock(
 p_course_id uuid,p_question_ids uuid[],p_confirmation text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_check jsonb; v_id uuid; v_actor uuid:=(SELECT auth.uid());
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active verified Admin required'; END IF;
 IF p_confirmation IS DISTINCT FROM 'RESERVE 200 ASP MOCK QUESTIONS'
 THEN RAISE EXCEPTION 'Type the full 200-question reservation confirmation'; END IF;
 IF p_course_id IS NULL OR p_question_ids IS NULL
   OR cardinality(p_question_ids)<>200
 THEN RAISE EXCEPTION 'Exactly 200 explicit question IDs required'; END IF;
 PERFORM 1 FROM public.lms_courses
 WHERE id=p_course_id AND slug='asp' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ASP course not found'; END IF;
 -- Consistent lock order with P6A review: question first, review second.
 PERFORM q.id FROM public.lms_questions q
 WHERE q.id=ANY(p_question_ids) ORDER BY q.id FOR UPDATE;
 PERFORM r.question_id FROM public.lms_p6_question_reviews r
 WHERE r.question_id=ANY(p_question_ids) ORDER BY r.question_id FOR UPDATE;
 v_check:=public.lms_p9b_mock_preflight(p_course_id,p_question_ids);
 IF v_check->>'ready'<>'true' THEN
  RAISE EXCEPTION 'ASP Mock reservation blocked. Select 200 unique human-reviewed DRAFT items; check rights, answer, official domains, previous Mock flags and used questions';
 END IF;
 INSERT INTO public.lms_p9b_mock_forms(course_id,reserved_by)
 VALUES(p_course_id,v_actor) RETURNING id INTO v_id;
 INSERT INTO public.lms_p9b_mock_items(form_id,position,question_id)
 SELECT v_id,x.ord::integer,x.id
 FROM unnest(p_question_ids) WITH ORDINALITY x(id,ord);
 UPDATE public.lms_questions q SET mock_exclusive=true,updated_at=clock_timestamp()
 WHERE q.id=ANY(p_question_ids) AND q.course_id=p_course_id
   AND approval_state='draft' AND NOT mock_exclusive;
 IF (SELECT count(*) FROM public.lms_p9b_mock_items
      WHERE form_id=v_id)<>200 OR
    (SELECT count(*) FROM public.lms_questions q
      JOIN public.lms_p9b_mock_items i ON i.question_id=q.id
      WHERE i.form_id=v_id AND q.mock_exclusive)<>200
 THEN RAISE EXCEPTION 'Atomic reservation failed: transaction rolled back'; END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'asp_mock_200_reserved','mock_form',v_id,
   jsonb_build_object('courseId',p_course_id,'version',1,'count',200,
      'mockEngineActive',false));
 RETURN jsonb_build_object('formId',v_id,'courseId',p_course_id,
   'version',1,'reserved',200,'state','reserved','mockEngineActive',false);
END; $$;

-- Separate per-item practice approval by an INDEPENDENT second active Admin.
-- Never approves mock-exclusive items; never auto-publishes the source bank.
-- Real ASP Mock must be reserved first so no published item enters Mock.
CREATE FUNCTION public.lms_p9b_approve_practice_question(
 p_question_id uuid,p_confirmation text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.lms_questions%ROWTYPE;
DECLARE r public.lms_p6_question_reviews%ROWTYPE;
DECLARE v_actor uuid:=(SELECT auth.uid()); v_count integer; v_reserved integer;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Active verified Admin approval required'; END IF;
 IF p_confirmation IS DISTINCT FROM 'APPROVE ASP PRACTICE QUESTION'
 THEN RAISE EXCEPTION 'Explicit individual Practice approval confirmation required'; END IF;
 -- Each course update is serialized with reservations and approvals.
 PERFORM 1 FROM public.lms_courses c
 JOIN public.lms_questions x ON x.course_id=c.id
 WHERE x.id=p_question_id AND c.slug='asp' FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Only the ASP course is supported'; END IF;
 SELECT * INTO q FROM public.lms_questions WHERE id=p_question_id FOR UPDATE;
 SELECT * INTO r FROM public.lms_p6_question_reviews WHERE question_id=p_question_id FOR UPDATE;
 IF q.approval_state<>'draft' OR q.mock_exclusive OR
   r.question_id IS NULL OR r.review_state<>'ready'
   OR r.answer_checked IS DISTINCT FROM true OR r.rights_checked IS DISTINCT FROM true
   OR r.difficulty NOT IN ('low','medium','high')
   OR r.reviewed_by=v_actor OR r.reviewed_by IS NULL
   OR r.reviewed_at IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.lms_domains d
    WHERE d.id=r.reviewed_domain_id AND d.course_id=q.course_id
      AND d.slug ~ '^asp11-0[1-9]$')
   OR EXISTS(SELECT 1 FROM public.lms_practice_attempt_items ai
      WHERE ai.question_id=p_question_id)
 THEN RAISE EXCEPTION 'Approval blocked: needs independent reviewed DRAFT ASP question, rights, answer, official domain and unused non-Mock source'; END IF;
 SELECT count(*) INTO v_count FROM public.lms_p9b_mock_items i
 JOIN public.lms_p9b_mock_forms f ON f.id=i.form_id
 WHERE f.course_id=q.course_id AND f.form_version=1 AND f.state='reserved';
 SELECT count(*) INTO v_reserved FROM public.lms_questions
 WHERE course_id=q.course_id AND mock_exclusive;
 IF v_count<>200 OR v_reserved<>200
 THEN RAISE EXCEPTION 'Reserve exactly 200 immutable ASP Mock questions before approving Practice'; END IF;
 UPDATE public.lms_questions
 SET approval_state='approved',domain_id=r.reviewed_domain_id,
   difficulty=r.difficulty,updated_at=clock_timestamp()
 WHERE id=p_question_id AND approval_state='draft' AND NOT mock_exclusive;
 IF NOT FOUND THEN RAISE EXCEPTION 'Question approval conflict'; END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'asp_practice_question_approved','question',p_question_id,
   jsonb_build_object('courseId',q.course_id,'domainId',r.reviewed_domain_id,
   'difficulty',r.difficulty,'reviewerId',r.reviewed_by,'independent',true));
 RETURN jsonb_build_object('questionId',p_question_id,'approvalState','approved',
   'domainId',r.reviewed_domain_id,'difficulty',r.difficulty,'mockExclusive',false);
END; $$;

DO $$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
  'lms_p9b_mock_preflight(uuid,uuid[])',
  'lms_p9b_reserve_mock(uuid,uuid[],text)',
  'lms_p9b_approve_practice_question(uuid,text)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',sig);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.lms_p9b_immutable_form() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lms_p9b_guard_reserved_question() FROM PUBLIC,anon,authenticated;
COMMIT;
