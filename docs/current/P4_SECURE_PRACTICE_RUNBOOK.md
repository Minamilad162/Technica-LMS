# P4 — Secure Question Bank and Practice (staging runbook)
Date: 2026-10-31. Status: CODE ONLY; not deployed to any Supabase instance by ChatGPT.

## Implementation
P4 adds lms_questions, lms_practice_attempts and lms_practice_attempt_items. All use RLS with no browser direct SELECT/INSERT/UPDATE/DELETE GRANT; only the trusted SECURITY DEFINER functions can select questions, save answers and grade. Browser users require valid Supabase JWT, an active profile, a published paid/manually granted course entitlement, or a verified platform admin role.

- Quick 10: 10 approved non-mock questions, immediate feedback after saved answer, immutable choice afterward.
- Timed Quiz: 25 questions and exactly 20 minutes; deadline calculated on server.
- Custom: 1–50 questions and optional 0–180 minute overall timer.
- Domain: 1–50 questions from one verified mapped course domain, if approved.
- Repeated start request UUID returns same attempt; submitted answers and final scores are computed under row locks.
- Correct answers never appear in a pre-answer or unfinished attempt payload. Finished attempts can review all answers.
- Mock Exam (200 exclusive, 300-minute clock), Level Up adaptive, admin Assessment and difficulty taxonomy remain UNAVAILABLE in real backend.

## Instructions
1. Confirm you opened ONLY the dedicated Technica LMS Supabase project, not CHEIRON. Back up database and verify P1/P2.
2. Execute supabase/migrations/202610310003_p4_secure_practice.sql ONCE in STAGING SQL Editor (as a trusted DB owner). Existing P4 tables cause a deliberate conflict error.
3. Verify the three new lms_ tables have rowsecurity = true; inspect information_schema.role_table_grants for no anon/authenticated direct table access.
4. Test using real Supabase learner and admin JWTs through REST. SQL Editor runs as owner and cannot prove RLS.
5. Deploy the separately built VITE_DATA_MODE=supabase frontend only after authorization and browser QA. Never put a service_role secret in any VITE_ variable.

## Optional safe ASP source import
By default, npm run test:p4:bank performs only a dry run of the source 1625-question bank.
To import records in a **dedicated staging environment** (not production), run node scripts/import-asp-p4.mjs --apply with environment variables SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PROJECT_REF_CONFIRM. Keep the service key in a secure isolated administrator shell only, never GitHub, Cloudflare browser variables or chat.
The importer verifies 250 + 625 + 200 + 300 + 250 source rows, preserves source IDs/options/answers/references, avoids replacing existing rows, and creates DRAFT / UNCLASSIFIED / NOT MOCK RESERVED questions. It does NOT publish or auto-map 5 legacy workbook groups onto 9 ASP domains.

## Mandatory review gate
Question approval and ASP official-domain mapping need independent SME review. Reserve the 200 mock-exclusive questions before approving any questions for general Practice. P4 selects ONLY questions explicitly marked approved and not mock_exclusive, so a new imported bank will initially show insufficient eligible questions. This is intentional; no guessed mapping or answers are made live.

## QA and rollback
Test anonymous denial, no-entitlement denial, trial denial, suspended/revoked denial, cross-course isolation, preset count/time, short bank failure, mock exclusion, idempotent start/finish, immutable Quick10 answers, no grading leak before finish, server deadline and final score from saved answers. CI runs the SQL with disposable Postgres roles, plus static contract, importer dry run, builds and bundle scan.
Live Supabase Auth/Data API and real-device tests remain mandatory before production. Do not DROP P4 data after rollout; restoring UI does not undo schema or exam history.
