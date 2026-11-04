-- P9C TECHNICA ASP QUESTION BANK — COMPLETE AGGREGATE AUDIT (SELECT ONLY)
-- Run only AFTER P9C_SCHEMA_PREFLIGHT_READ_ONLY.sql reports all CORE_REQUIRED
-- objects PRESENT. Works even if P9A and P9B migrations are NOT installed.
-- Safe for the confirmed Technica Production SQL Editor: NO changes of any kind.
-- No prompts, answer choices, keys, references, reviewer notes, IDs, emails,
-- source-level record lists, individual user records or secrets in output.
-- Expected 1,625 is HISTORICAL source reference, NOT a verified imported total.
-- No row of this report grants approval, certifies copyright, or activates Mock.
WITH
 asp_course AS (
  SELECT id FROM public.lms_courses WHERE slug='asp'
 ),
 official_names(slug,title) AS (
  VALUES
   ('asp11-01','Mathematical Calculations'),
   ('asp11-02','Safety Programs and Concepts'),
   ('asp11-03','Ergonomics'),
   ('asp11-04','Fire Prevention and Protection'),
   ('asp11-05','Emergency Preparedness and Response'),
   ('asp11-06','Industrial Hygiene and Occupational Health'),
   ('asp11-07','Environmental Management'),
   ('asp11-08','Training, Education, and Communication'),
   ('asp11-09','Legal')
 ),
 official AS (
  SELECT n.slug,n.title AS expected_title,d.id AS domain_id,
    d.title AS stored_title
  FROM official_names n
  LEFT JOIN public.lms_domains d ON d.slug=n.slug
    AND d.course_id IN (SELECT id FROM asp_course)
 ),
 inventory AS (
  SELECT q.id,q.source_id,q.legacy_group,q.approval_state,q.mock_exclusive,
   q.difficulty,q.domain_id,q.prompt,q.options,q.correct_index,
   q.reference_text,q.explanation,
   r.question_id IS NOT NULL AS has_review,r.review_state,
   r.answer_checked,r.rights_checked,r.difficulty AS reviewed_difficulty,
   r.reviewed_domain_id,r.reviewed_by,r.reviewed_at,
   rd.slug AS reviewed_slug,rd.course_id AS reviewed_course_id,
   pd.slug AS published_slug,pd.course_id AS published_course_id,
   EXISTS (SELECT 1 FROM public.lms_practice_attempt_items ai
     WHERE ai.question_id=q.id) AS used_in_practice,
   COALESCE(
    r.review_state='ready'
    AND r.answer_checked IS TRUE AND r.rights_checked IS TRUE
    AND r.difficulty IN ('low','medium','high')
    AND r.reviewed_by IS NOT NULL AND r.reviewed_at IS NOT NULL
    AND rd.slug ~ '^asp11-0[1-9]$' AND rd.course_id=q.course_id,
    false) AS vetted_review,
   COALESCE(
    q.difficulty IN ('low','medium','high')
    AND pd.slug ~ '^asp11-0[1-9]$' AND pd.course_id=q.course_id
    AND q.domain_id=r.reviewed_domain_id
    AND q.difficulty=r.difficulty
    AND r.review_state='ready'
    AND r.answer_checked IS TRUE AND r.rights_checked IS TRUE
    AND r.reviewed_by IS NOT NULL AND r.reviewed_at IS NOT NULL,
    false) AS quality_approved
  FROM public.lms_questions q
  JOIN asp_course c ON c.id=q.course_id
  LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
  LEFT JOIN public.lms_domains rd ON rd.id=r.reviewed_domain_id
  LEFT JOIN public.lms_domains pd ON pd.id=q.domain_id
 ),
 totals AS (
  SELECT
   count(*)::integer AS total,
   count(*) FILTER(WHERE approval_state='draft')::integer AS draft,
   count(*) FILTER(WHERE approval_state='approved')::integer AS approved,
   count(*) FILTER(WHERE approval_state='archived')::integer AS archived,
   count(*) FILTER(WHERE NOT has_review)::integer AS missing_review,
   count(*) FILTER(WHERE approval_state='draft' AND NOT vetted_review)::integer AS draft_not_vetted,
   count(*) FILTER(WHERE approval_state='draft' AND vetted_review)::integer AS reviewed_drafts,
   count(*) FILTER(WHERE approval_state='draft' AND vetted_review
     AND NOT mock_exclusive AND NOT used_in_practice)::integer AS mock_candidate,
   count(*) FILTER(WHERE approval_state='draft' AND NOT mock_exclusive
     AND vetted_review AND NOT used_in_practice)::integer AS practice_candidate,
   count(*) FILTER(WHERE approval_state='draft' AND has_review
     AND answer_checked IS DISTINCT FROM true)::integer AS answer_unchecked,
   count(*) FILTER(WHERE approval_state='draft' AND has_review
     AND rights_checked IS DISTINCT FROM true)::integer AS rights_unchecked,
   count(*) FILTER(WHERE approval_state='draft' AND has_review
     AND (reviewed_difficulty IS NULL OR reviewed_difficulty='unclassified'))::integer AS unclassified_review,
   count(*) FILTER(WHERE approval_state='draft' AND vetted_review
     AND (domain_id IS NULL OR difficulty='unclassified'))::integer AS vetted_not_published,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
     AND NOT quality_approved)::integer AS approved_governance_gaps,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
     AND quality_approved)::integer AS approved_vetted,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
     AND difficulty IN ('low','medium','high'))::integer AS runtime_eligible,
   count(*) FILTER(WHERE mock_exclusive)::integer AS mock_flags,
   count(*) FILTER(WHERE mock_exclusive AND approval_state='draft')::integer AS mock_draft,
   count(*) FILTER(WHERE mock_exclusive AND approval_state='approved')::integer AS mock_approved,
   count(*) FILTER(WHERE mock_exclusive AND used_in_practice)::integer AS mock_used,
   count(*) FILTER(WHERE approval_state='draft' AND used_in_practice)::integer AS draft_used,
   count(*) FILTER(WHERE btrim(coalesce(reference_text,''))='')::integer AS missing_reference,
   count(*) FILTER(WHERE btrim(coalesce(explanation,''))='')::integer AS missing_explanation,
   count(*) FILTER(WHERE btrim(coalesce(legacy_group,''))='')::integer AS missing_legacy_group,
   count(DISTINCT nullif(btrim(legacy_group),''))::integer AS legacy_group_count,
   count(DISTINCT source_id)::integer AS distinct_source_id,
   count(*) FILTER(WHERE jsonb_typeof(options)<>'array'
     OR jsonb_array_length(options) NOT BETWEEN 2 AND 6
     OR correct_index<0 OR correct_index>=jsonb_array_length(options))::integer AS invalid_answers,
   count(*)-count(DISTINCT md5(lower(btrim(prompt)))) AS duplicate_normalized_prompt_rows
  FROM inventory
 ),
 domain_coverage AS (
  SELECT count(domain_id)::integer AS official_present,
   count(*) FILTER(WHERE domain_id IS NOT NULL
    AND stored_title IS DISTINCT FROM expected_title)::integer AS title_mismatch
  FROM official
 ),
 tiers(name) AS (VALUES ('low'),('medium'),('high')),
 tier_counts AS (
  SELECT t.name,
    count(i.id) FILTER(WHERE i.approval_state='approved'
      AND NOT i.mock_exclusive AND i.difficulty=t.name)::integer AS runtime_eligible,
    count(i.id) FILTER(WHERE i.approval_state='approved'
      AND NOT i.mock_exclusive AND i.difficulty=t.name
      AND i.quality_approved)::integer AS reviewed_approved,
    count(i.id) FILTER(WHERE i.approval_state='draft'
      AND NOT i.mock_exclusive AND NOT i.used_in_practice
      AND i.vetted_review AND i.reviewed_difficulty=t.name)::integer AS vetted_draft
  FROM tiers t LEFT JOIN inventory i ON true GROUP BY t.name
 ),
 domain_tier AS (
  SELECT o.slug,o.expected_title,t.name AS tier,
   count(i.id) FILTER(WHERE i.approval_state='draft'
     AND NOT i.mock_exclusive AND NOT i.used_in_practice
     AND i.vetted_review AND i.reviewed_domain_id=o.domain_id
     AND i.reviewed_difficulty=t.name)::integer AS vetted_draft,
   count(i.id) FILTER(WHERE i.approval_state='approved'
     AND NOT i.mock_exclusive AND i.domain_id=o.domain_id
     AND i.difficulty=t.name)::integer AS runtime_approved,
   count(i.id) FILTER(WHERE i.approval_state='approved'
     AND NOT i.mock_exclusive AND i.domain_id=o.domain_id
     AND i.difficulty=t.name AND i.quality_approved)::integer AS governed_approved
  FROM official o CROSS JOIN tiers t LEFT JOIN inventory i ON true
  GROUP BY o.slug,o.expected_title,t.name
 ),
 report(section,metric,scope,actual_count,target_count,status,note) AS (
  SELECT '00_CONTEXT','ASP course records','ASP',
   (SELECT count(*)::integer FROM asp_course),1,
   CASE WHEN (SELECT count(*) FROM asp_course)=1 THEN 'PASS' ELSE 'BLOCKER' END,
   'Only real public.lms_courses.slug=asp is in scope.'
  UNION ALL SELECT '01_SOURCE','Imported ASP question rows','ASP',total,1625,
   'REFERENCE_ONLY','1,625 is the historical five-worksheet source count; do not treat mismatch as an automatic import or failure.'
   FROM totals
  UNION ALL SELECT '01_SOURCE','Unique source IDs','ASP',distinct_source_id,total,
   CASE WHEN distinct_source_id=total THEN 'PASS' ELSE 'BLOCKER' END,
   'Stable per-course source IDs. No source IDs are returned.' FROM totals
  UNION ALL SELECT '01_SOURCE','Legacy source groups','ASP',legacy_group_count,5,
   'REFERENCE_ONLY','Five old worksheet groups are NOT a mapping to nine ASP11 domains.' FROM totals
  UNION ALL SELECT '01_SOURCE','Missing legacy group labels','ASP',missing_legacy_group,NULL,
   CASE WHEN missing_legacy_group=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Review import provenance; labels alone do not certify source validity.' FROM totals
  UNION ALL SELECT '01_SOURCE','Duplicate normalized prompts (extra rows)','ASP',
   duplicate_normalized_prompt_rows::integer,0,
   CASE WHEN duplicate_normalized_prompt_rows=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Potential near-duplicates after lowercase/trim; never auto-delete.' FROM totals
  UNION ALL SELECT '02_STATUS','Draft questions','ASP',draft,NULL,'INFO',
   'Not learner eligible; review READY is still DRAFT.' FROM totals
  UNION ALL SELECT '02_STATUS','Approved questions','ASP',approved,NULL,'INFO',
   'Only approved, non-exclusive questions can enter P4/P8 Practice.' FROM totals
  UNION ALL SELECT '02_STATUS','Archived questions','ASP',archived,NULL,'INFO',
   'Archived sources must not enter Practice.' FROM totals
  UNION ALL SELECT '03_REVIEW','Questions missing any human review','ASP',missing_review,0,
   CASE WHEN missing_review=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Human review evidence absent; no auto-review or auto-approval.' FROM totals
  UNION ALL SELECT '03_REVIEW','Drafts not fully verified','ASP',draft_not_vetted,0,
   CASE WHEN draft_not_vetted=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Includes answer/rights/domain/difficulty/reviewer gaps.' FROM totals
  UNION ALL SELECT '03_REVIEW','Draft answer unchecked','ASP',answer_unchecked,0,
   CASE WHEN answer_unchecked=0 THEN 'PASS' ELSE 'REVIEW' END,
   'P6A answer_checked flags are human declarations, not independent certification.' FROM totals
  UNION ALL SELECT '03_REVIEW','Draft commercial rights unchecked','ASP',rights_unchecked,0,
   CASE WHEN rights_unchecked=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Do not publish before licensed source usage is explicitly verified.' FROM totals
  UNION ALL SELECT '03_REVIEW','Draft review difficulty unclassified','ASP',
   unclassified_review,0,CASE WHEN unclassified_review=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Difficulty must be Low, Medium or High.' FROM totals
  UNION ALL SELECT '03_REVIEW','Human-verified Drafts (not approved)','ASP',reviewed_drafts,NULL,'INFO',
   'READY review metadata alone does not grant learner access.' FROM totals
  UNION ALL SELECT '03_REVIEW','Verified Drafts lacking public classification','ASP',
   vetted_not_published,NULL,'INFO','Expected before explicit second-Admin release.' FROM totals
  UNION ALL SELECT '04_CONTENT','Questions with missing reference text','ASP',missing_reference,0,
   CASE WHEN missing_reference=0 THEN 'PASS' ELSE 'REVIEW' END,
   'A reference field may be blank despite a review flag; inspect source evidence.' FROM totals
  UNION ALL SELECT '04_CONTENT','Questions with missing explanation','ASP',missing_explanation,0,
   CASE WHEN missing_explanation=0 THEN 'PASS' ELSE 'REVIEW' END,
   'No answer content is exposed; count is diagnostic only.' FROM totals
  UNION ALL SELECT '04_CONTENT','Invalid option/answer-index shapes','ASP',invalid_answers,0,
   CASE WHEN invalid_answers=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'P4 constraints should prevent invalid shapes; investigate any violation.' FROM totals
  UNION ALL SELECT '05_ASP11','Official ASP11 domains installed','ASP',official_present,9,
   CASE WHEN official_present=9 AND title_mismatch=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'Nine current ASP11 domains and their canonical titles, not five legacy groups.' FROM domain_coverage
  UNION ALL SELECT '05_ASP11','Official ASP11 title mismatches','ASP',title_mismatch,0,
   CASE WHEN title_mismatch=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Do not rename or remap domains automatically.' FROM domain_coverage
  UNION ALL SELECT '06_PRACTICE','Runtime eligible approved non-Mock','ASP',runtime_eligible,NULL,'INFO',
   'This is the exact P4/P8 question-state filter, not content-governance proof.' FROM totals
  UNION ALL SELECT '06_PRACTICE','Governance-verified approved non-Mock','ASP',approved_vetted,NULL,'INFO',
   'Requires matching official review domain and difficulty plus checked answer/rights.' FROM totals
  UNION ALL SELECT '06_PRACTICE','Approved non-Mock governance gaps','ASP',
   approved_governance_gaps,0,
   CASE WHEN approved_governance_gaps=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'Potential learner-exposed items need review; do not silently change approvals.' FROM totals
  UNION ALL SELECT '06_PRACTICE','Previously used questions currently Draft','ASP',
   draft_used,0,CASE WHEN draft_used=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Do not move a used source into a new Mock form.' FROM totals
  UNION ALL SELECT '07_MOCK','Currently Mock-flagged questions','ASP',mock_flags,200,
   CASE WHEN mock_flags=0 THEN 'NOT_RESERVED'
    WHEN mock_flags=200 THEN 'FLAGS_ONLY' ELSE 'BLOCKER' END,
   'A count of 200 flags alone NEVER proves a versioned Mock form.' FROM totals
  UNION ALL SELECT '07_MOCK','Mock-flagged approved questions','ASP',mock_approved,0,
   CASE WHEN mock_approved=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'Formal Mock reserved items must remain DRAFT in P9B policy.' FROM totals
  UNION ALL SELECT '07_MOCK','Mock-flagged items used by Practice','ASP',mock_used,0,
   CASE WHEN mock_used=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'Historical Practice usage disqualifies immutable Mock reservation.' FROM totals
  UNION ALL SELECT '07_MOCK','Eligible reviewed unused Draft Mock candidates','ASP',
   mock_candidate,200,CASE WHEN mock_candidate>=200 THEN 'CANDIDATES_ONLY' ELSE 'SHORTAGE' END,
   'Candidates not selected/reserved; legal rights flags still require human evidence.' FROM totals
  UNION ALL SELECT '07_MOCK','P9B form schema installed','ASP',
   CASE WHEN to_regclass('public.lms_p9b_mock_forms') IS NOT NULL
     AND to_regclass('public.lms_p9b_mock_items') IS NOT NULL THEN 1 ELSE 0 END,1,
   CASE WHEN to_regclass('public.lms_p9b_mock_forms') IS NOT NULL
     AND to_regclass('public.lms_p9b_mock_items') IS NOT NULL THEN 'SCHEMA_PRESENT' ELSE 'NOT_INSTALLED' END,
   'Only schema presence checked here. Run P9B_VERIFY_READ_ONLY.sql when installed.'
  UNION ALL SELECT '06_PRACTICE','Practice candidates still awaiting approval','ASP',
   practice_candidate,NULL,'INFO',
   'A second independent Admin can approve only after a valid versioned Mock reservation.' FROM totals
  UNION ALL SELECT '08_TIER','Runtime approved non-Mock',name,runtime_eligible,30,
   CASE WHEN runtime_eligible>=30 THEN 'POOL_COUNT_OK' ELSE 'SHORTAGE' END,
   'N=30 Level Up requires at least 30 approved non-Mock per tier; not 10 per tier.' FROM tier_counts
  UNION ALL SELECT '08_TIER','Governed approved non-Mock',name,reviewed_approved,30,
   CASE WHEN reviewed_approved>=30 THEN 'COUNT_ONLY_OK' ELSE 'SHORTAGE' END,
   'More strict: approval must agree with human checked rights, answer, ASP11 domain and difficulty.' FROM tier_counts
  UNION ALL SELECT '08_TIER','Reviewed unused Draft candidates',name,vetted_draft,NULL,
   'INFO','Not playable until separate P9B independent Admin approval.' FROM tier_counts
  UNION ALL SELECT '09_DOMAIN','Governed approved per official Domain/Tier',
   slug||'/'||tier,governed_approved,30,
   CASE WHEN governed_approved>=30 THEN 'COUNT_ONLY_OK' ELSE 'SHORTAGE' END,
   'Per-domain N=30 Level Up needs 30 approved, non-Mock per tier; not a quality certificate.'
   FROM domain_tier
  UNION ALL SELECT '09_DOMAIN','Reviewed unused Drafts per Domain/Tier',
   slug||'/'||tier,vetted_draft,NULL,'INFO',
   'P6A reviewed candidates for manual approval; not learner eligible.'
   FROM domain_tier
  UNION ALL SELECT '09_DOMAIN','Runtime approved per Domain/Tier',
   slug||'/'||tier,runtime_approved,NULL,'INFO',
   'Includes any non-Mock approved item even if its prior human review is incomplete.'
   FROM domain_tier
 )
SELECT section,metric,scope,actual_count,target_count,status,note
FROM report
ORDER BY section,metric,scope;
