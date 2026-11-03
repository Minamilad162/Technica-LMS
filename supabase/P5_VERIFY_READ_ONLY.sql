-- P5 read-only verification. Run in dedicated Technica LMS staging AFTER P5.
SELECT to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NOT NULL AS abandon_rpc_exists,
       to_regprocedure('public.lms_p4_attempt_payload(uuid)') IS NOT NULL AS payload_rpc_exists;
SELECT conname,pg_get_constraintdef(oid) AS rule
FROM pg_constraint
WHERE conrelid='public.lms_practice_attempts'::regclass
  AND conname='lms_practice_attempts_state_check';
SELECT
 has_function_privilege('authenticated','public.lms_p5_abandon_practice(uuid)','EXECUTE') AS auth_can_abandon,
 has_function_privilege('anon','public.lms_p5_abandon_practice(uuid)','EXECUTE') AS anon_can_abandon,
 has_function_privilege('authenticated','public.lms_p4_attempt_payload(uuid)','EXECUTE') AS auth_can_read_payload;
SELECT n.nspname AS schema,c.relname AS table_name,c.relrowsecurity AS rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN (
 'lms_questions','lms_practice_attempts','lms_practice_attempt_items'
) ORDER BY c.relname;
-- No question or grade details exposed by these checks.
