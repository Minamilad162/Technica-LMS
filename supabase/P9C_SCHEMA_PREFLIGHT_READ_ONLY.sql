-- P9C TECHNICA ASP BANK — SCHEMA PREFLIGHT (SELECT ONLY)
-- Safe to run in the confirmed Technica Supabase SQL Editor, including main.
-- No migrations, updates, roles, tokens, question text or answer keys.
-- Run this FIRST. If any CORE_REQUIRED item is MISSING, STOP and do NOT
-- run the detailed bank audit until the schema has been separately verified.
-- P9A/P9B are OPTIONAL: absence must NOT block the core inventory audit.
WITH requirements(section,component,installed) AS (
 VALUES
 ('CORE_REQUIRED','P1: courses',to_regclass('public.lms_courses') IS NOT NULL),
 ('CORE_REQUIRED','P1: domains',to_regclass('public.lms_domains') IS NOT NULL),
 ('CORE_REQUIRED','P4: private ASP questions',to_regclass('public.lms_questions') IS NOT NULL),
 ('CORE_REQUIRED','P4: practice attempt items',to_regclass('public.lms_practice_attempt_items') IS NOT NULL),
 ('CORE_REQUIRED','P6A: private human reviews',to_regclass('public.lms_p6_question_reviews') IS NOT NULL),
 ('ADAPTIVE_POLICY','P8e: fixed correct target column',
   EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lms_practice_adaptive_state'
    AND column_name='promotion_policy')),
 ('ADAPTIVE_POLICY','P8e: server readiness RPC',
   to_regprocedure('public.lms_p8_levelup_readiness(uuid,integer,uuid)') IS NOT NULL),
 ('OPTIONAL_GOVERNANCE','P9A: read-only Admin release preflight',
   to_regprocedure('public.lms_p9a_release_preflight(uuid)') IS NOT NULL),
 ('OPTIONAL_GOVERNANCE','P9B: private Mock forms',
   to_regclass('public.lms_p9b_mock_forms') IS NOT NULL),
 ('OPTIONAL_GOVERNANCE','P9B: private Mock form items',
   to_regclass('public.lms_p9b_mock_items') IS NOT NULL),
 ('OPTIONAL_GOVERNANCE','P9B: Admin Mock reservation RPC',
   to_regprocedure('public.lms_p9b_reserve_mock(uuid,uuid[],text)') IS NOT NULL),
 ('OPTIONAL_GOVERNANCE','P9B: independent Practice approval RPC',
   to_regprocedure('public.lms_p9b_approve_practice_question(uuid,text)') IS NOT NULL)
)
SELECT section,component,CASE WHEN installed THEN 'PRESENT'
 ELSE 'MISSING' END AS status,
 CASE
  WHEN section='CORE_REQUIRED' AND NOT installed
   THEN 'STOP: prerequisite missing; do not run detailed P9C bank query.'
  WHEN section='ADAPTIVE_POLICY' AND NOT installed
   THEN 'Verify fixed-base 7-of-10 Level Up deployment separately; no data changes.'
  WHEN section='OPTIONAL_GOVERNANCE' AND NOT installed
   THEN 'Optional P9A/P9B not installed. Bank audit still works; no Mock form assumed.'
  ELSE 'Metadata only; this does not prove learner JWT or question content quality.'
 END AS interpretation
FROM requirements ORDER BY
 CASE section WHEN 'CORE_REQUIRED' THEN 1 WHEN 'ADAPTIVE_POLICY' THEN 2 ELSE 3 END,
 component;
