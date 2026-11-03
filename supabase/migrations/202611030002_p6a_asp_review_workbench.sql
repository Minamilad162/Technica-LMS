-- Technica LMS P6A: ASP question governance/review queue, NOT bank publication.
-- STAGING FIRST. Manual owner execution only after P1/P2/P4/P5 verification.
-- This migration creates private metadata + admin-only RPCs, never auto-imports,
-- maps, approves or releases any question. No Mock form is activated here.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_questions') IS NULL OR
    to_regclass('public.lms_audit_events') IS NULL OR
    to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NULL THEN
   RAISE EXCEPTION 'P6A requires P1/P2/P4/P5 verified: stop';
 END IF;
 IF to_regclass('public.lms_p6_question_reviews') IS NOT NULL OR
    to_regprocedure('public.lms_p6_review_question(uuid,uuid,text,boolean,boolean,text)') IS NOT NULL THEN
   RAISE EXCEPTION 'P6A already exists or conflicts: review first, never force';
 END IF;
END $$;

CREATE TABLE public.lms_p6_question_reviews (
 question_id uuid PRIMARY KEY REFERENCES public.lms_questions(id) ON DELETE RESTRICT,
 reviewed_domain_id uuid REFERENCES public.lms_domains(id) ON DELETE RESTRICT,
 difficulty text NOT NULL DEFAULT 'unclassified'
   CHECK(difficulty IN ('unclassified','low','medium','high')),
 answer_checked boolean NOT NULL DEFAULT false,
 rights_checked boolean NOT NULL DEFAULT false,
 review_state text NOT NULL DEFAULT 'needs_revision'
   CHECK(review_state IN ('needs_revision','ready')),
 review_notes text NOT NULL DEFAULT '' CHECK(length(review_notes)<=2000),
 reviewed_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX lms_p6_review_state_idx ON public.lms_p6_question_reviews(review_state,reviewed_at DESC);
ALTER TABLE public.lms_p6_question_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_p6_question_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.lms_p6_question_reviews TO service_role;

-- Admin explicitly chooses to add official ASP11 domain names; no mapping of
-- the old 5 worksheet labels to the new 9 domains is attempted.
CREATE FUNCTION public.lms_p6_seed_asp11_domains(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; v_slug text;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin review role required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses c WHERE c.id=p_course_id AND c.slug='asp')
 THEN RAISE EXCEPTION 'ASP course required'; END IF;
 FOR r IN SELECT * FROM (VALUES
    ('asp11-01','Mathematical Calculations',0),
    ('asp11-02','Safety Programs and Concepts',1),
    ('asp11-03','Ergonomics',2),
    ('asp11-04','Fire Prevention and Protection',3),
    ('asp11-05','Emergency Preparedness and Response',4),
    ('asp11-06','Industrial Hygiene and Occupational Health',5),
    ('asp11-07','Environmental Management',6),
    ('asp11-08','Training, Education, and Communication',7),
    ('asp11-09','Legal',8)
 ) AS domain_data(slug,title,position) LOOP
   IF EXISTS (SELECT 1 FROM public.lms_domains d
      WHERE d.course_id=p_course_id AND d.slug=r.slug AND d.title<>r.title)
     THEN RAISE EXCEPTION 'Existing ASP11 domain % has unexpected title',r.slug;
   END IF;
   INSERT INTO public.lms_domains(course_id,slug,title,position)
   VALUES(p_course_id,r.slug,r.title,r.position)
   ON CONFLICT (course_id,slug) DO NOTHING;
 END LOOP;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'asp11_domains_confirmed','course',p_course_id,
        '{"schema":"ASP11","domains":9}'::jsonb);
 RETURN jsonb_build_object('courseId',p_course_id,'asp11Domains',
   (SELECT count(*) FROM public.lms_domains WHERE course_id=p_course_id
     AND slug ~ '^asp11-0[1-9]$'));
END; $$;

-- Admin-only aggregate; never exposes learner/private answers.
CREATE FUNCTION public.lms_p6_bank_summary(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin review role required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'ASP course required'; END IF;
 SELECT jsonb_build_object(
  'total',count(*),
  'draft',count(*) FILTER (WHERE q.approval_state='draft'),
  'approved',count(*) FILTER (WHERE q.approval_state='approved'),
  'mockReserved',count(*) FILTER (WHERE q.mock_exclusive),
  'readyToReview',count(*) FILTER (WHERE r.review_state='ready' AND q.approval_state='draft'),
  'needsReview',count(*) FILTER (WHERE r.question_id IS NULL OR r.review_state<>'ready'),
  'officialDomainMapped',count(*) FILTER (WHERE d.slug ~ '^asp11-0[1-9]$')
 ) INTO v_result
 FROM public.lms_questions q
 LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
 LEFT JOIN public.lms_domains d ON d.id=r.reviewed_domain_id
 WHERE q.course_id=p_course_id;
 RETURN v_result;
END; $$;

CREATE FUNCTION public.lms_p6_list_questions(
 p_course_id uuid,p_filter text DEFAULT 'unreviewed',
 p_limit integer DEFAULT 20,p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_total bigint; v_items jsonb;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin review role required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'ASP course required'; END IF;
 IF p_filter IS NULL OR p_filter NOT IN ('all','unreviewed','ready','approved','reserved') THEN
   RAISE EXCEPTION 'Invalid review filter';
 END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR
    p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN
   RAISE EXCEPTION 'Invalid review pagination';
 END IF;
 SELECT count(*) INTO v_total FROM public.lms_questions q
 LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
 WHERE q.course_id=p_course_id AND
  (p_filter='all' OR
   (p_filter='unreviewed' AND q.approval_state='draft' AND (r.question_id IS NULL OR r.review_state<>'ready')) OR
   (p_filter='ready' AND r.review_state='ready' AND q.approval_state='draft') OR
   (p_filter='approved' AND q.approval_state='approved') OR
   (p_filter='reserved' AND q.mock_exclusive));
 SELECT coalesce(jsonb_agg(to_jsonb(z) ORDER BY z.source_id,z.id),'[]'::jsonb)
 INTO v_items FROM (
   SELECT q.id,q.source_id,q.legacy_group,q.prompt,q.options,q.correct_index,
     q.explanation,q.reference_text,q.approval_state,q.mock_exclusive,
     r.reviewed_domain_id,r.difficulty,r.answer_checked,r.rights_checked,
     r.review_state,r.review_notes,r.reviewed_at
   FROM public.lms_questions q
   LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
   WHERE q.course_id=p_course_id AND
    (p_filter='all' OR
     (p_filter='unreviewed' AND q.approval_state='draft' AND (r.question_id IS NULL OR r.review_state<>'ready')) OR
     (p_filter='ready' AND r.review_state='ready' AND q.approval_state='draft') OR
     (p_filter='approved' AND q.approval_state='approved') OR
     (p_filter='reserved' AND q.mock_exclusive))
   ORDER BY q.source_id,q.id LIMIT p_limit OFFSET p_offset
 ) z;
 RETURN jsonb_build_object('total',v_total,'items',v_items);
END; $$;

-- Admin records a HUMAN review decision. The raw question and P4
-- approval_state/mocking remain untouched even for a READY review.
CREATE FUNCTION public.lms_p6_review_question(
 p_question_id uuid,p_domain_id uuid,p_difficulty text,
 p_answer_checked boolean,p_rights_checked boolean,p_notes text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_question public.lms_questions%ROWTYPE;
DECLARE v_state text;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin review role required'; END IF;
 IF p_answer_checked IS NULL OR p_rights_checked IS NULL OR
    p_difficulty IS NULL OR p_difficulty NOT IN ('unclassified','low','medium','high')
 THEN RAISE EXCEPTION 'Invalid review fields'; END IF;
 IF p_notes IS NULL OR length(p_notes)>2000 THEN RAISE EXCEPTION 'Review note too long or absent'; END IF;
 SELECT * INTO v_question FROM public.lms_questions WHERE id=p_question_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Question not found'; END IF;
 IF v_question.approval_state<>'draft' OR v_question.mock_exclusive OR
    NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=v_question.course_id AND slug='asp')
 THEN RAISE EXCEPTION 'Only draft non-reserved ASP questions may be reviewed'; END IF;
 IF p_domain_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lms_domains d WHERE d.id=p_domain_id
      AND d.course_id=v_question.course_id AND d.slug ~ '^asp11-0[1-9]$'
 ) THEN RAISE EXCEPTION 'Select an official ASP11 domain for this course'; END IF;
 v_state:=CASE WHEN p_domain_id IS NOT NULL AND p_difficulty<>'unclassified'
     AND p_answer_checked AND p_rights_checked THEN 'ready' ELSE 'needs_revision' END;
 INSERT INTO public.lms_p6_question_reviews(
   question_id,reviewed_domain_id,difficulty,answer_checked,rights_checked,
   review_state,review_notes,reviewed_by,reviewed_at
 ) VALUES(p_question_id,p_domain_id,p_difficulty,p_answer_checked,p_rights_checked,
   v_state,trim(p_notes),(SELECT auth.uid()),clock_timestamp())
 ON CONFLICT(question_id) DO UPDATE SET
   reviewed_domain_id=EXCLUDED.reviewed_domain_id,difficulty=EXCLUDED.difficulty,
   answer_checked=EXCLUDED.answer_checked,rights_checked=EXCLUDED.rights_checked,
   review_state=EXCLUDED.review_state,review_notes=EXCLUDED.review_notes,
   reviewed_by=EXCLUDED.reviewed_by,reviewed_at=EXCLUDED.reviewed_at;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'asp_question_review','question',p_question_id,
   jsonb_build_object('reviewState',v_state,'domainId',p_domain_id,
      'difficulty',p_difficulty,'answerChecked',p_answer_checked,
      'rightsChecked',p_rights_checked));
 RETURN jsonb_build_object('questionId',p_question_id,'reviewState',v_state,
   'approvalState','draft','mockExclusive',false);
END; $$;

DO $$
DECLARE sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
 'lms_p6_seed_asp11_domains(uuid)',
 'lms_p6_bank_summary(uuid)',
 'lms_p6_list_questions(uuid,text,integer,integer)',
 'lms_p6_review_question(uuid,uuid,text,boolean,boolean,text)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',sig);
 END LOOP;
END $$;
COMMIT;
