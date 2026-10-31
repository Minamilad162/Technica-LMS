-- Technica LMS P4: protected question bank and transactional practice engine.
-- STAGING ONLY. Requires P1 + P2; run ONCE in dedicated Technica Supabase.
-- NO legacy ASP auto-import. No MOCK / ADAPTIVE / admin Assessment activation.
BEGIN;
DO $$
DECLARE n text;
BEGIN
 FOREACH n IN ARRAY ARRAY['lms_profiles','lms_courses','lms_domains','lms_entitlements','lms_role_assignments','lms_lesson_progress'] LOOP
   IF to_regclass(format('public.%I',n)) IS NULL THEN RAISE EXCEPTION 'P4 requires P1/P2: missing %',n; END IF;
 END LOOP;
 FOREACH n IN ARRAY ARRAY['lms_questions','lms_practice_attempts','lms_practice_attempt_items'] LOOP
   IF to_regclass(format('public.%I',n)) IS NOT NULL THEN RAISE EXCEPTION 'P4 already present/conflict: %',n; END IF;
 END LOOP;
END $$;

CREATE TABLE public.lms_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 source_id text NOT NULL CHECK (length(source_id) BETWEEN 1 AND 160),
 legacy_group text NOT NULL DEFAULT '',
 domain_id uuid REFERENCES public.lms_domains(id) ON DELETE RESTRICT,
 prompt text NOT NULL CHECK (length(trim(prompt)) BETWEEN 5 AND 12000),
 options jsonb NOT NULL CHECK (jsonb_typeof(options)='array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
 correct_index smallint NOT NULL CHECK (correct_index BETWEEN 0 AND 5 AND correct_index < jsonb_array_length(options)),
 explanation text NOT NULL DEFAULT '',
 reference_text text NOT NULL DEFAULT '',
 difficulty text NOT NULL DEFAULT 'unclassified' CHECK (difficulty IN ('unclassified','low','medium','high')),
 approval_state text NOT NULL DEFAULT 'draft' CHECK (approval_state IN ('draft','approved','archived')),
 mock_exclusive boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(course_id,source_id)
);
-- Never accept a course/domain mismatch, even through a privileged import.
CREATE FUNCTION public.lms_p4_validate_question_scope() RETURNS trigger
 LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.domain_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.lms_domains d WHERE d.id=NEW.domain_id AND d.course_id=NEW.course_id
 ) THEN RAISE EXCEPTION 'Question domain must belong to its course'; END IF;
 IF TG_OP='UPDATE' THEN
   IF EXISTS (
     SELECT 1 FROM public.lms_practice_attempt_items ai WHERE ai.question_id=OLD.id
   ) AND (
     NEW.prompt IS DISTINCT FROM OLD.prompt OR NEW.options IS DISTINCT FROM OLD.options
     OR NEW.correct_index IS DISTINCT FROM OLD.correct_index
   ) THEN RAISE EXCEPTION 'Cannot rewrite a used question; create a new revision'; END IF;
 END IF;
 RETURN NEW;
END; $$;
-- The validation trigger exists before attempt-items table is created. Runtime
-- compilation occurs after whole transaction commits, with the table present.
CREATE TRIGGER lms_p4_question_scope BEFORE INSERT OR UPDATE ON public.lms_questions
 FOR EACH ROW EXECUTE FUNCTION public.lms_p4_validate_question_scope();

CREATE TABLE public.lms_practice_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 client_request_id uuid NOT NULL,
 mode text NOT NULL CHECK(mode IN ('quick10','timed25','custom','domain')),
 state text NOT NULL DEFAULT 'in_progress' CHECK(state IN ('in_progress','submitted','expired')),
 started_at timestamptz NOT NULL DEFAULT now(),
 deadline_at timestamptz,
 submitted_at timestamptz,
 question_count integer NOT NULL CHECK(question_count BETWEEN 1 AND 50),
 correct_count integer CHECK(correct_count BETWEEN 0 AND question_count),
 score_percent numeric(5,2) CHECK(score_percent BETWEEN 0 AND 100),
 UNIQUE(user_id,client_request_id),
 CHECK (deadline_at IS NULL OR deadline_at > started_at)
);
CREATE TABLE public.lms_practice_attempt_items (
 attempt_id uuid NOT NULL REFERENCES public.lms_practice_attempts(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 50),
 question_id uuid NOT NULL REFERENCES public.lms_questions(id) ON DELETE RESTRICT,
 -- Frozen grading snapshot; raw values are NEVER grant-readable by browsers.
 prompt_snapshot text NOT NULL,
 options_snapshot jsonb NOT NULL,
 correct_index_snapshot smallint NOT NULL CHECK(correct_index_snapshot BETWEEN 0 AND 5),
 explanation_snapshot text NOT NULL DEFAULT '',
 selected_index smallint CHECK(selected_index BETWEEN 0 AND 5),
 answered_at timestamptz,
 PRIMARY KEY(attempt_id,question_id),
 UNIQUE(attempt_id,position)
);
CREATE INDEX lms_p4_bank_eligible_idx ON public.lms_questions(course_id,domain_id)
 WHERE approval_state='approved' AND mock_exclusive=false;
CREATE INDEX lms_p4_attempt_user_idx ON public.lms_practice_attempts(user_id,started_at DESC);
CREATE INDEX lms_p4_attempt_items_q_idx ON public.lms_practice_attempt_items(question_id);

DO $$
DECLARE n text;
BEGIN
 FOREACH n IN ARRAY ARRAY['lms_questions','lms_practice_attempts','lms_practice_attempt_items'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
   EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',n);
   EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.lms_p4_validate_question_scope() FROM PUBLIC,anon,authenticated;

-- All public RPCs use auth.uid() from a verified Supabase JWT, not user-supplied IDs.
-- Lock the actual learner profile for idempotent start.
CREATE FUNCTION public.lms_p4_can_practice(p_course uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.lms_profiles p
   JOIN public.lms_entitlements e ON e.user_id=p.id
   JOIN public.lms_courses c ON c.id=e.course_id
   WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
     AND c.id=p_course AND c.publication_state='published'
     AND e.entitlement_type IN ('paid','manual') AND e.status='active'
     AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at>now())
 ) OR (
   public.lms_p1_actor_is_admin() AND EXISTS(
      SELECT 1 FROM public.lms_courses c WHERE c.id=p_course
   )
 );
$$;

CREATE FUNCTION public.lms_p4_attempt_payload(p_attempt uuid) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE entries jsonb;
BEGIN
 SELECT * INTO a FROM public.lms_practice_attempts WHERE id=p_attempt AND user_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 SELECT coalesce(jsonb_agg(
   jsonb_build_object('id',i.question_id,'position',i.position,'prompt',i.prompt_snapshot,
     'options',i.options_snapshot,'selectedIndex',i.selected_index)
   || CASE WHEN a.state='in_progress' THEN '{}'::jsonb ELSE
       jsonb_build_object('correctIndex',i.correct_index_snapshot,'explanation',i.explanation_snapshot) END
   ORDER BY i.position),'[]'::jsonb)
 INTO entries FROM public.lms_practice_attempt_items i WHERE i.attempt_id=a.id;
 RETURN jsonb_build_object('attemptId',a.id,'courseId',a.course_id,'mode',a.mode,
   'state',a.state,'startedAt',a.started_at,'deadlineAt',a.deadline_at,
   'serverNow',clock_timestamp(),'questionCount',a.question_count,
   'submittedAt',a.submitted_at,'correctCount',a.correct_count,
   'scorePercent',a.score_percent,'questions',entries);
END; $$;

CREATE FUNCTION public.lms_p4_start_practice(
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
   AND q.approval_state='approved' AND NOT q.mock_exclusive
   AND (p_domain_id IS NULL OR q.domain_id=p_domain_id);
 IF v_count < p_count THEN RAISE EXCEPTION 'Not enough approved non-mock questions: % eligible, % requested',v_count,p_count; END IF;
 v_deadline:=CASE WHEN p_duration_seconds>0 THEN clock_timestamp()+make_interval(secs=>p_duration_seconds) ELSE NULL END;
 INSERT INTO public.lms_practice_attempts(user_id,course_id,client_request_id,mode,question_count,deadline_at)
 VALUES(v_user,p_course_id,p_request_id,p_mode,p_count,v_deadline) RETURNING id INTO v_id;
 INSERT INTO public.lms_practice_attempt_items(attempt_id,position,question_id,prompt_snapshot,options_snapshot,correct_index_snapshot,explanation_snapshot)
 SELECT v_id,row_number() over(),chosen.id,chosen.prompt,chosen.options,chosen.correct_index,chosen.explanation FROM (
   SELECT q.id,q.prompt,q.options,q.correct_index,q.explanation
   FROM public.lms_questions q WHERE q.course_id=p_course_id AND q.approval_state='approved'
     AND NOT q.mock_exclusive AND (p_domain_id IS NULL OR q.domain_id=p_domain_id)
   ORDER BY random(),q.id LIMIT p_count
 ) chosen;
 RETURN public.lms_p4_attempt_payload(v_id);
END; $$;

CREATE FUNCTION public.lms_p4_save_answer(p_attempt_id uuid,p_question_id uuid,p_selected_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE v_options jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state<>'in_progress' OR (a.deadline_at IS NOT NULL AND clock_timestamp()>=a.deadline_at) THEN
   RAISE EXCEPTION 'This attempt is closed or time has expired'; END IF;
 SELECT options_snapshot INTO v_options FROM public.lms_practice_attempt_items
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 IF v_options IS NULL THEN RAISE EXCEPTION 'Question is not assigned to this attempt'; END IF;
 IF p_selected_index IS NOT NULL AND (p_selected_index<0 OR p_selected_index>=jsonb_array_length(v_options)) THEN
   RAISE EXCEPTION 'Invalid answer option'; END IF;
 UPDATE public.lms_practice_attempt_items
 SET selected_index=p_selected_index,answered_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND question_id=p_question_id;
 RETURN jsonb_build_object('saved',true,'serverNow',clock_timestamp());
END; $$;

CREATE FUNCTION public.lms_p4_finish_practice(p_attempt_id uuid) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE v_correct integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
  WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 IF a.state='in_progress' THEN
   SELECT count(*) INTO v_correct FROM public.lms_practice_attempt_items
    WHERE attempt_id=p_attempt_id AND selected_index=correct_index_snapshot;
   UPDATE public.lms_practice_attempts
    SET state=CASE WHEN deadline_at IS NOT NULL AND clock_timestamp()>=deadline_at
                    THEN 'expired' ELSE 'submitted' END,
        submitted_at=clock_timestamp(),correct_count=v_correct,
        score_percent=round(v_correct*100.0/question_count,2)
    WHERE id=p_attempt_id;
 END IF;
 RETURN public.lms_p4_attempt_payload(p_attempt_id);
END; $$;

-- No function should be executable by PUBLIC or anon by default. Only the
-- intended authenticated JWT caller can use the five RPCs.
DO $$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
  'lms_p4_can_practice(uuid)',
  'lms_p4_attempt_payload(uuid)',
  'lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)',
  'lms_p4_save_answer(uuid,uuid,integer)',
  'lms_p4_finish_practice(uuid)'
 ] LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
   EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',sig);
 END LOOP;
END $$;
COMMIT;