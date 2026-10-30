# P1 Foundation — Safe Staging Migration & Verification Runbook

**Status:** Implemented as code in Draft PR #7; **NOT deployed to any Supabase project**.
**Source:** \`supabase/migrations/202610300001_p1_foundation.sql\`.
**Owner rules:** [Master Blueprint](../TECHNICA_LMS_MASTER_BLUEPRINT.md), [P1 design](../docs/current/P1_AUTH_DATA_MODEL_DESIGN_2026-10-30.md).
**Protect production:** never run against CHEIRON Supabase or an existing Technica production project. The SQL is new and intentionally fails if any target tables already exist.

## 1. Before applying

- Confirm owner-approved staging Supabase **project reference**, SQL backup, Git commit, database owner and the previous schema; never share secrets/DB passwords in GitHub.
- Use a new empty **Technica development/staging** project with Supabase Auth enabled and dedicated test user identities; check database extensions and executing role.
- Run \`npm run test:p1:schema\` and the existing demo suite. This is **static** verification only.
- Review and approve the target roles, public catalog metadata, trial policy, media signing requirements, trigger and deletion behavior.
- Require explicit sign-off before first real SQL migration. No deployment step is executed automatically by PR.

## 2. Staging application (manual, after approval only)

1. Review the entire migration before using the Supabase SQL Editor or migration runner in **staging**.
2. Apply \`202610300001_p1_foundation.sql\` once, transactionally.
3. Capture schema checks: \`pg_tables\`, \`pg_policies\`, \`information_schema.role_table_grants\`, \`pg_proc\`, \`pg_trigger\` and a deployment fingerprint.
4. Verify 11 new tables exist with RLS enabled. Note PostgreSQL/Supabase migration role (used for SECURITY DEFINER ownership).
5. **Do not use** \`supabase/001_lms_schema_PROPOSED.sql\` alongside this migration. It is an old, incompatible proposal.
6. Provision initial admin **only through trusted service-role/admin SQL**, after an actual Supabase Auth user exists; ordinary sign-up must create a learner profile but never an admin role.
7. Never copy real ASP question keys, private video files or customer records into test fixtures.

## 3. Direct API / RLS negative test matrix

Use genuinely separate JWT identities: Anonymous; Learner A (no access); Learner B (paid course); Learner C (trial course); Suspended learner; Admin; Course Author (scoped). Every **deny** below must be tested with direct REST/Data API calls and not only UI button visibility.

| Case | Expected | Evidence |
|---|---|---|
| Anonymous selects published safe course catalog | Allowed | Published course metadata only |
| Anonymous reads domains/topics/lessons/blocks/entitlements | Denied | 0 rows / permission error as appropriate |
| Anonymous attempts INSERT/UPDATE/DELETE anywhere | Denied | GRANT/RLS enforced |
| Unenrolled logged-in Learner A lists paid lesson blocks | Denied | No lesson data |
| Learner B with current paid entitlement views published lesson | Allowed | Data only for entitled course |
| Learner B accesses unrelated paid course | Denied | No cross-course leakage |
| Learner C with trial entitlement, no lesson grant | Denied | No lesson block content |
| Learner C with mapped \`lms_trial_lesson_grants\` | Allowed for only mapped published lesson | Scope isolation |
| Expired/revoked/refunded entitlement | Denied | Time/status checked on server |
| Suspended user with otherwise active paid entitlement | Denied | Account status enforced |
| Draft/unpublished course or lesson as learner | Denied | Publishing gate |
| Learner attempts to grant role or entitlement | Denied | No direct write permission |
| Learner attempts UPDATE of \`account_status\` | Denied | Column-level GRANT |
| Learner edits own allowed display name | Allowed | Role/status unchanged |
| Content author reads only assigned draft course | Allowed for assigned course only | Scoped role checks |
| Content author attempts course publish or role assignment | Denied | P1 reserves these changes for admins |
| Admin edits course, domain, topic, lesson | Allowed | Audited admin account |
| Admin privileges after role revoke / account suspension | Denied | Invalidation |
| Author requests raw private media path via Data API | Admin/author only by trusted access policy; ordinary learners denied | No direct media grants |
| Learner or anonymous tries reading/writing audit log | Denied | Service writes only |
| Signup with \`raw_user_meta_data.role='admin'\` | Creates normal learner profile, no admin assignment | No self-promotion |

## 4. SQL verification probes (read-only inspection)

\`\`\`sql
-- Run in the appropriate STAGING project after applying the migration.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'lms_%'
ORDER BY tablename;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename LIKE 'lms_%'
ORDER BY tablename, policyname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name LIKE 'lms_%'
ORDER BY table_name, grantee, privilege_type;
\`\`\`

Note: run negative tests under real authenticated identities or accurately impersonated JWTs, *not* under an owner or \`service_role\` with RLS bypass. SQL Editor as owner proves nothing about learner access.

## 5. Migration restrictions / limitations

- Four-level hierarchy and trial restrictions are designed; no content author write API, media signing function, quiz engine, adaptive engine or Mock reservation exists yet.
- SQL is intended for an empty Technica Supabase project; it is **not** an in-place upgrade of \`001_lms_schema_PROPOSED.sql\` and cannot automatically migrate existing real learner progress.
- A frontend HTML sanitizer and validated block payload schema are required before accepting rich-text authoring; database JSONB alone does not prevent XSS.
- Profile trigger is security-sensitive; validate on new sign-up, invalid metadata, repeated/failed provision and restore plan.
- Protect \`cover_path\` for the public catalog: it must reference only intentional public assets, not permanent private storage object paths.
- Entitlement writes remain trusted service operations. Restrict all sensitive API endpoints with verified user identity and server policy.
- Initial role assignment and all trial lesson grants require auditable privileged administration.
- A real Supabase staging test and browser cross-device test are required before declaring P1 complete.

## 6. Rollback & operational decision

- For **never-applied** migration: close/reject PR; main/demo remain unchanged.
- For **new disposable staging** project only: restore prior database snapshot or discard/recreate staging project. Do **not** run mass DROP on any populated environment without written approval and backup.
- For production (future): supply an explicitly reviewed data-preserving down-migration; destructive rollback is forbidden.

**Acceptance gate:** actual staging SQL execution PASS, all role/RLS tests PASS, fresh Auth sign-up PASS, asset protection PASS, React demo regression PASS, and documented owner approval before integrating the production repository adapter.

## 7. Evidence

- 2026-10-30: SQL/source and \`scripts/test-p1-foundation.mjs\` created on feature branch. CI source-contract checks can pass independently of real SQL execution.
- No database or Cloudflare environment modified; no production credentials used.
