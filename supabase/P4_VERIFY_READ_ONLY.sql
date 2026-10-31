-- TECHNICA LMS P4 — READ-ONLY VERIFICATION
-- Run only in the intended dedicated Technica Supabase project AFTER P4 migration.
-- This query never inserts, updates, deletes or reveals answer keys.
SELECT
  n.name AS table_name,
  to_regclass(format('public.%I',n.name)) IS NOT NULL AS exists,
  coalesce(c.relrowsecurity,false) AS rls_enabled
FROM (VALUES
 ('lms_questions'),
 ('lms_practice_attempts'),
 ('lms_practice_attempt_items')
) AS n(name)
LEFT JOIN pg_class c ON c.oid=to_regclass(format('public.%I',n.name))
ORDER BY n.name;

-- Browser identities must have NO direct table permissions on P4.
SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('lms_questions','lms_practice_attempts','lms_practice_attempt_items')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name,grantee,privilege_type;
-- Expected: ZERO rows.

-- RPC registration (API execution still requires real JWT authorization tests).
SELECT p.proname,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'lms_p4_%'
ORDER BY p.proname;

-- Safe aggregate bank readiness; all newly imported ASP questions should be DRAFT.
SELECT approval_state,mock_exclusive,count(*) AS question_count
FROM public.lms_questions
GROUP BY approval_state,mock_exclusive
ORDER BY approval_state,mock_exclusive;
