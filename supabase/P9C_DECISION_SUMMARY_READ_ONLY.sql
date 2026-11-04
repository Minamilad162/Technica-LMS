-- Technica LMS / P9C.1 — QUICK OWNER REVIEW (SELECT ONLY)
-- Run ONLY after all P9C CORE_REQUIRED tables are PRESENT and P9B form tables
-- are PRESENT in the confirmed Technica LMS project (including Production).
-- Never enters / updates / deletes / approves / reserves questions.
-- SQL returns count metrics only; no source IDs, prompts, keys or learner data.
-- Historical ASP source reference of 1,625 is NOT an import confirmation.
-- P8e Level Up 30 questions: minimum 30 approved non-Mock per difficulty;
-- promotion is 7 correct out of the ORIGINAL 10 Low/Medium stage, fixed.
WITH
 asp AS (
  SELECT id FROM public.lms_courses WHERE slug='asp'
 ),
 official_domains AS (
  SELECT count(*)::integer AS count
  FROM public.lms_domains d
  JOIN asp c ON c.id=d.course_id
  WHERE d.slug ~ '^asp11-0[1-9]$'
 ),
 bank AS (
  SELECT q.approval_state,q.mock_exclusive,q.difficulty,
   r.question_id IS NOT NULL AS has_review,
   COALESCE(
    r.review_state='ready'
    AND r.answer_checked IS TRUE
    AND r.rights_checked IS TRUE
    AND r.difficulty IN ('low','medium','high')
    AND rd.slug ~ '^asp11-0[1-9]$'
    AND rd.course_id=q.course_id
    AND r.reviewed_by IS NOT NULL
    AND r.reviewed_at IS NOT NULL,
    false) AS reviewed_ready,
   COALESCE(
    r.review_state='ready'
    AND r.answer_checked IS TRUE
    AND r.rights_checked IS TRUE
    AND r.difficulty=q.difficulty
    AND r.reviewed_domain_id=q.domain_id
    AND d.slug ~ '^asp11-0[1-9]$'
    AND d.course_id=q.course_id
    AND r.reviewed_by IS NOT NULL
    AND r.reviewed_at IS NOT NULL,
    false) AS governed_approved,
   NOT EXISTS(
    SELECT 1 FROM public.lms_practice_attempt_items ai
    WHERE ai.question_id=q.id
   ) AS never_used
  FROM public.lms_questions q
  JOIN asp c ON c.id=q.course_id
  LEFT JOIN public.lms_p6_question_reviews r ON r.question_id=q.id
  LEFT JOIN public.lms_domains d ON d.id=q.domain_id
  LEFT JOIN public.lms_domains rd ON rd.id=r.reviewed_domain_id
 ),
 counts AS (
  SELECT count(*)::integer AS total,
   count(*) FILTER(WHERE approval_state='draft')::integer AS draft,
   count(*) FILTER(WHERE approval_state='approved')::integer AS approved,
   count(*) FILTER(WHERE approval_state='archived')::integer AS archived,
   count(*) FILTER(WHERE NOT has_review)::integer AS no_review,
   count(*) FILTER(WHERE approval_state='draft' AND reviewed_ready
    AND NOT mock_exclusive AND never_used)::integer AS vetted_draft,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive)::integer AS approved_practice,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
    AND governed_approved)::integer AS governed_practice,
   count(*) FILTER(WHERE approval_state='approved' AND NOT mock_exclusive
    AND NOT governed_approved)::integer AS approved_gap,
   count(*) FILTER(WHERE approval_state='draft' AND reviewed_ready
    AND NOT mock_exclusive AND never_used)::integer AS mock_candidates,
   count(*) FILTER(WHERE mock_exclusive)::integer AS flagged_mock
  FROM bank
 ),
 tiers(name) AS (VALUES ('low'),('medium'),('high')),
 by_tier AS (
  SELECT t.name AS tier,
   count(b.*) FILTER(WHERE b.approval_state='approved'
    AND NOT b.mock_exclusive AND b.difficulty=t.name)::integer AS runtime_count,
   count(b.*) FILTER(WHERE b.approval_state='approved'
    AND NOT b.mock_exclusive AND b.governed_approved
    AND b.difficulty=t.name)::integer AS governed_count
  FROM tiers t LEFT JOIN bank b ON true
  GROUP BY t.name
 ),
 mock_form AS (
  SELECT count(DISTINCT f.id)::integer AS form_count,
   count(i.question_id)::integer AS form_items,
   count(DISTINCT i.question_id)::integer AS distinct_items,
   count(i.question_id) FILTER(WHERE q.mock_exclusive
    AND q.approval_state='draft')::integer AS excluded_draft
  FROM public.lms_p9b_mock_forms f
  JOIN asp c ON c.id=f.course_id
  LEFT JOIN public.lms_p9b_mock_items i ON i.form_id=f.id
  LEFT JOIN public.lms_questions q ON q.id=i.question_id
 ),
 output(area,check_name,actual,required,status,meaning) AS (
  SELECT '01_BANK','Actual ASP questions',total,1625,'REFERENCE_ONLY',
    'Historical source had 1,625; this is NOT proof of actual import completeness.'
    FROM counts
  UNION ALL SELECT '01_BANK','Draft questions',draft,NULL,'INFO',
   'Draft is not playable in learner Practice.' FROM counts
  UNION ALL SELECT '01_BANK','Approved questions',approved,NULL,'INFO',
   'Includes any Mock-exclusive approved anomaly; inspect details before release.' FROM counts
  UNION ALL SELECT '01_BANK','Archived questions',archived,NULL,'INFO',
   'Archived questions are excluded from Practice.' FROM counts
  UNION ALL SELECT '02_QUALITY','Questions missing any review',no_review,0,
   CASE WHEN no_review=0 THEN 'PASS' ELSE 'REVIEW' END,
   'Only human-reviewed items with checked rights and answers qualify for publication.' FROM counts
  UNION ALL SELECT '02_QUALITY','Unused verified Draft candidates',vetted_draft,NULL,'INFO',
   'Reviewed does not equal approved or selected for Mock.' FROM counts
  UNION ALL SELECT '02_QUALITY','Approved Practice with full governance',governed_practice,NULL,'INFO',
   'Official ASP11 domain, matched difficulty, answer AND rights checked.' FROM counts
  UNION ALL SELECT '02_QUALITY','Approved Practice governance gaps',approved_gap,0,
   CASE WHEN approved_gap=0 THEN 'PASS' ELSE 'BLOCKER' END,
   'Technically playable but not fully verified; never silently alter rows.' FROM counts
  UNION ALL SELECT '03_DOMAINS','Official ASP11 domains',count,9,
   CASE WHEN count=9 THEN 'COUNT_OK' ELSE 'SHORTAGE' END,
   'Nine domain slugs only; see detailed P9C query to check exact titles.' FROM official_domains
  UNION ALL SELECT '04_PRACTICE','All approved non-Mock questions',approved_practice,NULL,'INFO',
   'Live P4 source-state eligibility; not proof of content rights.' FROM counts
  UNION ALL SELECT '04_PRACTICE','Approved Low question pool',runtime_count,30,
   CASE WHEN runtime_count>=30 THEN 'POOL_COUNT_OK' ELSE 'SHORTAGE' END,
   'N30 Level Up may require all 30 questions from a single tier.' FROM by_tier WHERE tier='low'
  UNION ALL SELECT '04_PRACTICE','Approved Medium question pool',runtime_count,30,
   CASE WHEN runtime_count>=30 THEN 'POOL_COUNT_OK' ELSE 'SHORTAGE' END,
   'N30 Level Up minimum approved Medium pool.' FROM by_tier WHERE tier='medium'
  UNION ALL SELECT '04_PRACTICE','Approved High question pool',runtime_count,30,
   CASE WHEN runtime_count>=30 THEN 'POOL_COUNT_OK' ELSE 'SHORTAGE' END,
   'N30 Level Up minimum approved High pool.' FROM by_tier WHERE tier='high'
  UNION ALL SELECT '04_PRACTICE','Rights-reviewed Low pool',governed_count,30,
   CASE WHEN governed_count>=30 THEN 'COUNT_ONLY_OK' ELSE 'SHORTAGE' END,
   'Human review declares verified rights; final licensing evidence is separate.' FROM by_tier WHERE tier='low'
  UNION ALL SELECT '04_PRACTICE','Rights-reviewed Medium pool',governed_count,30,
   CASE WHEN governed_count>=30 THEN 'COUNT_ONLY_OK' ELSE 'SHORTAGE' END,
   'Human review declares verified rights; final licensing evidence is separate.' FROM by_tier WHERE tier='medium'
  UNION ALL SELECT '04_PRACTICE','Rights-reviewed High pool',governed_count,30,
   CASE WHEN governed_count>=30 THEN 'COUNT_ONLY_OK' ELSE 'SHORTAGE' END,
   'Human review declares verified rights; final licensing evidence is separate.' FROM by_tier WHERE tier='high'
  UNION ALL SELECT '05_MOCK','Potential reviewed Mock candidates',mock_candidates,200,
   CASE WHEN mock_candidates>=200 THEN 'CANDIDATES_ONLY' ELSE 'SHORTAGE' END,
   'Not automatically selected/reserved; 200 must be distinct stable human-approved source IDs.' FROM counts
  UNION ALL SELECT '05_MOCK','Actual versioned Mock forms',form_count,1,
   CASE WHEN form_count=1 THEN 'FORM_EXISTS' WHEN form_count=0 THEN 'NOT_RESERVED' ELSE 'BLOCKER' END,
   'Form presence does NOT activate the 200-question 300-minute Mock engine.' FROM mock_form
  UNION ALL SELECT '05_MOCK','Items inside Mock form',form_items,200,
   CASE WHEN form_items=200 AND distinct_items=200 AND excluded_draft=200
    THEN 'FORM_ITEMS_ONLY' ELSE 'NOT_READY' END,
   'Exactly 200 unique questions must remain Draft and Mock-exclusive.' FROM mock_form
  UNION ALL SELECT '05_MOCK','Mock-exclusive source flags',flagged_mock,200,
   CASE WHEN flagged_mock=200 THEN 'FLAGS_ONLY'
    WHEN flagged_mock=0 THEN 'NOT_RESERVED' ELSE 'BLOCKER' END,
   '200 flags alone never proves the reserved form or full Mock delivery is ready.' FROM counts
  UNION ALL SELECT '06_RELEASE','Formal Mock exam engine active',0,1,'NOT_IMPLEMENTED',
   'Form reservation alone is not a scored 200-question, 300-minute Mock exam.'
 )
SELECT area,check_name,actual,required,status,meaning
FROM output ORDER BY area,check_name;
