-- Technica LMS P9A: read-only ASP11 question release preflight.
-- STAGING FIRST / owner-controlled. This migration ONLY installs an admin-
-- protected aggregate RPC. It NEVER imports, maps, reserves, approves, or
-- publishes any question and does NOT activate the exclusive Mock engine.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_questions') IS NULL
    OR to_regclass('public.lms_p6_question_reviews') IS NULL
    OR to_regprocedure('public.lms_p8_levelup_readiness(uuid,integer,uuid)') IS NULL
    OR to_regprocedure('public.lms_p6_bank_summary(uuid)') IS NULL
 THEN RAISE EXCEPTION 'P9A requires P4/P6A/P8 installed in dedicated Technica staging'; END IF;
 IF to_regprocedure('public.lms_p9a_release_preflight(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P9A preflight already exists: do not reinstall'; END IF;
END $$;

CREATE FUNCTION public.lms_p9a_release_preflight(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_total bigint; v_draft bigint; v_reviewed_ready bigint; v_needs_review bigint;
 v_candidate bigint; v_candidate_low bigint; v_candidate_medium bigint; v_candidate_high bigint;
 v_reserved bigint; v_verified_reserved bigint; v_approved bigint; v_unsafe_approved bigint;
 v_domain_count bigint; v_domains jsonb; v_reasons jsonb:='[]'::jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified active Admin required for ASP release preflight'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses
    WHERE id=p_course_id AND slug='asp')
 THEN RAISE EXCEPTION 'Choose the real ASP course'; END IF;

 -- Review snapshots live in P6A, not the public P4 question bank. The
 -- readiness predicate is intentionally STRICTER than review_state alone.
 WITH inventory AS (
  SELECT q.id,q.approval_state,q.mock_exclusive,q.difficulty AS public_difficulty,
    q.domain_id,q.course_id,r.review_state,r.answer_checked,r.rights_checked,
    r.difficulty AS reviewed_difficulty,r.reviewed_domain_id,
    d.slug AS reviewed_slug,
    (r.review_state='ready' AND r.answer_checked IS TRUE
      AND r.rights_checked IS TRUE
      AND r.difficulty IN ('low','medium','high')
      AND d.course_id=q.course_id AND d.slug ~ '^asp11-0[1-9]$'
      AND r.reviewed_by IS NOT NULL AND r.reviewed_at IS NOT NULL) AS vetted
  FROM public.lms_questions q
  LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
  LEFT JOIN public.lms_domains d ON d.id=r.reviewed_domain_id
  WHERE q.course_id=p_course_id
 )
 SELECT count(*),count(*) FILTER(WHERE approval_state='draft'),
    count(*) FILTER(WHERE vetted AND approval_state='draft'),
    count(*) FILTER(WHERE approval_state='draft' AND NOT vetted),
    count(*) FILTER(WHERE vetted AND approval_state='draft' AND NOT mock_exclusive),
    count(*) FILTER(WHERE vetted AND approval_state='draft' AND NOT mock_exclusive AND reviewed_difficulty='low'),
    count(*) FILTER(WHERE vetted AND approval_state='draft' AND NOT mock_exclusive AND reviewed_difficulty='medium'),
    count(*) FILTER(WHERE vetted AND approval_state='draft' AND NOT mock_exclusive AND reviewed_difficulty='high'),
    count(*) FILTER(WHERE mock_exclusive),
    count(*) FILTER(WHERE mock_exclusive AND vetted),
    count(*) FILTER(WHERE approval_state='approved'),
    count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
       AND (public_difficulty='unclassified' OR domain_id IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.lms_domains dd
             WHERE dd.id=inventory.domain_id AND dd.course_id=p_course_id
               AND dd.slug ~ '^asp11-0[1-9]$')))
 INTO v_total,v_draft,v_reviewed_ready,v_needs_review,
      v_candidate,v_candidate_low,v_candidate_medium,v_candidate_high,
      v_reserved,v_verified_reserved,v_approved,v_unsafe_approved
 FROM inventory;

 SELECT count(*) INTO v_domain_count FROM public.lms_domains
 WHERE course_id=p_course_id AND slug ~ '^asp11-0[1-9]$';

 -- Domain totals are CANDIDATES only. They are not approved bank inventory.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'slug',x.slug,'title',x.title,'low',x.low,'medium',x.medium,'high',x.high
 ) ORDER BY x.position),'[]'::jsonb) INTO v_domains
 FROM (
  SELECT d.slug,d.title,d.position,
    count(q.id) FILTER (WHERE r.difficulty='low') AS low,
    count(q.id) FILTER (WHERE r.difficulty='medium') AS medium,
    count(q.id) FILTER (WHERE r.difficulty='high') AS high
  FROM public.lms_domains d
  LEFT JOIN public.lms_p6_question_reviews r
    ON r.reviewed_domain_id=d.id AND r.review_state='ready'
       AND r.answer_checked IS TRUE AND r.rights_checked IS TRUE
       AND r.difficulty IN ('low','medium','high')
  LEFT JOIN public.lms_questions q
    ON q.id=r.question_id AND q.course_id=p_course_id
       AND q.approval_state='draft' AND NOT q.mock_exclusive
  WHERE d.course_id=p_course_id AND d.slug ~ '^asp11-0[1-9]$'
  GROUP BY d.id,d.slug,d.title,d.position
 ) x;

 IF v_domain_count<>9 THEN
  v_reasons:=v_reasons||jsonb_build_array('The nine official ASP11 domains are not complete');
 END IF;
 IF v_reserved<>200 OR v_verified_reserved<>200 THEN
  v_reasons:=v_reasons||jsonb_build_array('Exactly 200 individually vetted Mock-exclusive items must be reserved in a versioned Mock form');
 END IF;
 IF v_candidate=0 THEN
  v_reasons:=v_reasons||jsonb_build_array('No fully reviewed non-Mock draft candidates are available for separate approval');
 END IF;
 IF v_unsafe_approved>0 THEN
  v_reasons:=v_reasons||jsonb_build_array('Existing approved non-Mock questions have incomplete official classification');
 END IF;
 -- A count of 200 mock_exclusive flags does NOT prove a legitimate, versioned,
 -- immutable Mock form. A future release procedure must validate such a form
 -- and specific question IDs before ANY approval. This RPC NEVER releases.
 v_reasons:=v_reasons||jsonb_build_array('Mock form/version validation and explicit owner-authorized release workflow are not installed');

 RETURN jsonb_build_object(
   'courseId',p_course_id,'mode','read_only','releaseAllowed',false,
   'total',v_total,'draft',v_draft,'reviewedReadyDraft',v_reviewed_ready,
   'needsHumanReview',v_needs_review,'eligibleCandidates',v_candidate,
   'candidateLow',v_candidate_low,'candidateMedium',v_candidate_medium,
   'candidateHigh',v_candidate_high,'approved',v_approved,
   'approvedWithClassificationGaps',v_unsafe_approved,
   'mockReserved',v_reserved,'mockReservedReviewed',v_verified_reserved,
   'officialDomainCount',v_domain_count,'domainCandidates',v_domains,
   'blockedReasons',v_reasons);
END; $$;
REVOKE ALL ON FUNCTION public.lms_p9a_release_preflight(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p9a_release_preflight(uuid)
 TO authenticated,service_role;
COMMIT;
