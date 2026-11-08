-- P41 READ-ONLY: run in the exact Technica Supabase project BEFORE migrations.
-- Does not create, publish, rename, import or reserve any question.
SELECT current_database() AS database_name,
 to_regprocedure('public.lms_p21_has_active_subscription()') IS NOT NULL AS p21_present,
 to_regprocedure('public.lms_p41_access_mode()') IS NOT NULL AS p41_installed,
 to_regprocedure('public.lms_p10_mock_readiness(uuid)') IS NOT NULL AS p10_installed,
 (SELECT count(*) FROM public.lms_courses) AS total_courses,
 (SELECT count(*) FROM public.lms_courses WHERE slug='asp') AS canonical_asp_count,
 (SELECT count(*) FROM public.lms_courses
  WHERE lower(btrim(title)) IN ('asp','asp course','associate safety professional','associated safety professional',
    'associate safety professional course','associated safety professional course')) AS asp_named_count;
SELECT id,slug,title,publication_state,created_at
 FROM public.lms_courses
 WHERE slug='asp' OR lower(btrim(title)) IN
  ('asp','asp course','associate safety professional','associated safety professional','associate safety professional course','associated safety professional course')
 ORDER BY created_at;
-- Distinguish genuinely missing ASP from existing ASP with incorrect slug or Draft status.
-- The official Mock MUST NOT be populated with another course's unrelated questions.
