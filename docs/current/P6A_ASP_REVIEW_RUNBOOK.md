# P6A — Secure ASP Question Review Workbench (code staged)

Date: 2026-11-03. **Phase: ASP source audit and SME classification.** Dedicated Technica LMS only.

## Why this stage exists
The source importer validates 1,625 old-demo ASP records, but their five worksheet labels are **not** the 2025 ASP11 nine-domain map. No imported question is eligible for paid practice until a qualified reviewer confirms the answer, commercial-use rights, official domain and Low/Medium/High difficulty. The separately approved 200-question exclusive Mock pool must be reserved **before** any mass approval, and that reservation/release workflow belongs to a later controlled phase.

## Source changes
- `supabase/migrations/202611030002_p6a_asp_review_workbench.sql`: additive, private reviewer metadata with RLS + no direct anon/authenticated table permissions. Authenticated calls use admin-only SECURITY DEFINER RPCs, all checking the real active admin role through `lms_p1_actor_is_admin()`.
- `lms_p6_seed_asp11_domains(courseId)`: explicit admin action adds the official 9 ASP11 domain names **without altering existing domains or assigning questions**. Idempotent; refuses collision with mismatching names.
- `lms_p6_list_questions(courseId,filter,limit,offset)`: authenticated-admin-only, capped paging (max 50) with original prompt/choices/answer/explanation only to reviewer; no browser direct `lms_questions` SELECT.
- `lms_p6_bank_summary(courseId)`: restricted aggregate totals.
- `lms_p6_review_question(questionId,domainId,difficulty,answerChecked,rightsChecked,notes)`: validates human review, official course-domain ownership, draft/non-reserved status, writes only the private review record and a redacted audit event. A ready review requires both checkboxes, official domain and classified difficulty.
- `src/production/AdminQuestionReview.jsx` + scoped CSS and RPC adapter: live admin ASP workbench with 20-row paginated review queue, filters, original answers for reviewer, note and checkboxes, explicit official-domain action. No new learner UI or demo data.
- No auto-import, no auto-approval, no mock reservation, no answer changing, no domain guessing, no mass permission changes. P4 remains the sole practice engine, and approved-state rules are unchanged.

## Installation and manual acceptance — STAGING ONLY
1. Open the **separate Technica LMS STAGING project**, not PRODUCTION, and verify its project ref in the URL. Back up the database. P1/P2/P4/P5 must be applied and verified; the user's report of completion is not independent evidence of the target environment.
2. Run the new P6A migration **once** as trusted owner in STAGING SQL Editor. It intentionally aborts if prerequisites are missing or P6A already installed. Do not run on production without separately approved migration/change window and rollback.
3. Verify RLS is enabled for `lms_p6_question_reviews`, and neither `anon` nor `authenticated` can directly read/write it. Ensure the four P6 RPCs can only be invoked by real verified active admins; authenticated ordinary learners must receive authorization errors.
4. Run `npm run test:p4:bank` locally to validate 1,625 source records **without writing**. If the ASP course with exact slug `asp` exists and the database has no previously reviewed answers, the existing importer `node scripts/import-asp-p4.mjs --apply` can be run **only in a trusted administrative STAGING terminal** with backend-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_PROJECT_REF_CONFIRM` set securely. **Never paste the secret into chat or GitHub, and never prefix it with `VITE_`.** The importer only inserts missing draft/unclassified questions; it never approves them. This step must not be run automatically.
5. Build `VITE_DATA_MODE=supabase` and verify live admin can open the ASP reviewer, explicitly add the official domain catalog, page through imported drafts, mark a reviewed item ready; check learner cannot invoke review APIs. Verify an imported question still has `approval_state='draft'`, `difficulty='unclassified'`, `domain_id IS NULL`, `mock_exclusive=false` after review: only the private review record changed.
6. Test admin revocation/role forgery, course isolation, invalid domain ID, unverified answer/rights, missing bank, unsaved form, mobile layout and browser back/refresh; do not treat CI's Postgres role fixture as actual signed Supabase JWT testing.
7. Next gate: a separate **200 exclusive Mock reservation and reviewed-release** implementation. Do not set all `approval_state='approved'` in SQL Editor as a shortcut.

## Source testing
`npm run test:p6` checks API/source policy and nine official domain names. `scripts/test-p6-postgres-smoke.sh` runs **only on disposable PostgreSQL** after P1/P2/P4/P5 smoke. Full legacy demo/learning/calculator/Practice and isolated live bundle tests continue in CI. No claim of actual production deployment or real Supabase acceptance.

## Rollback
Frontend rollback by reverting the feature commit/build; do not drop tables if reviewer decisions have already been captured. The migration is additive and stores reviewer data separately from original P4 question records. A staging rollback requires a verified backup and an approved migration plan, never ad-hoc destructive SQL.

**Production release status: NO-GO** until owner-approved P6A migration, real JWT tests, reviewed ASP source rights, 200 exclusive Mock reservations and safe release workflow are complete.
