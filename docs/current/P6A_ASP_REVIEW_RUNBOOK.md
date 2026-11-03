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


## Where to find the P6A screen in the menu (2026-11-03 fix)

**Live build (functional UI only after P6A SQL):** Sign into a Supabase-connected Technica LMS build as a verified active `admin`, and select **Admin Menu → ASP Question Review**. The menu always appears for authenticated admins even if another course was selected; the page selects the `asp` course automatically. If ASP doesn't exist, the page explains the missing course. Imported bank records still require separate draft importer and SME verification.

**Demo build (visibility/discoverability):** Sign into the existing browser-local Demo admin workspace and locate **ASP Review (Live)** in the sidebar (or mobile **More** menu). This opens an admin-only explanation of the **separate Live build**; it never calls protected database APIs. The regular Demo `Question Bank` remains unchanged. The Demo and Live builds cannot be merged into one public frontend because the Demo bundles unprotected historical ASP answer keys.

**Why the user might not see it yet:** Merely pushing to GitHub doesn't guarantee a Cloudflare deployment; verify the target build's commit and `VITE_DATA_MODE`, refresh after it is deployed, and confirm an actual admin role. The Live admin menu requires `VITE_DATA_MODE=supabase` plus public Supabase build variables. P6A SQL must be installed through the owner-approved process before the review RPCs work; do not run migrations just to make a menu appear.

**No schema changes in this navigation fix.** A passing source CI cannot certify deployed access, user role or runtime API authorization.


## Published-site direct ASP review link (2026-11-03 correction)

The owner's uploaded Technica site is actively published but, without an explicit `VITE_DATA_MODE=supabase`, Vite previously emitted the browser-local Demo only. The prior `ASP Review (Live)` item merely explained the separate mode. This is corrected **without replacing or breaking existing Demo features**:

- A normal `npm run build` outputs both `dist/index.html` (current site) and `dist/asp-review.html` (secure independent Supabase live reviewer entry). Site admin menu **ASP Question Review** opens `/asp-review.html` directly. No separate Cloudflare application is needed.
- On `/asp-review.html`, sign in using a **genuine verified Supabase Auth admin**, not the Demo account. The page opens the real P6A queue by default. This route uses a public/publishable Supabase key and P6A SECURITY DEFINER RPCs, with RLS and server-side admin role checks.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages **Production build variables**, even if `VITE_DATA_MODE=demo`. Absence results in a clear configuration screen rather than pretending the database is connected. Never expose the service-role key.
- P6A migration still needs an independently authorized installation and real JWT admin QA. The protected queue doesn't automatically import or approve questions. If it reports the P6A RPC missing, inspect the database/version instead of auto-running migrations.
- **Security limitation:** The original Demo page still includes its historical 1,625-question demo bank in its public bundle. This rollout does not make the whole Demo paid-content secure. Full paid launch must use the separate `VITE_DATA_MODE=supabase` build (only isolated live index). The new reviewer page itself must not import the Demo answer bank.
- Code push is not proof that Cloudflare deployed a commit; verify build output, production environment values and actual domain after release. CI checks both normal build (`test:review:entry`) and isolated full-Live build (`test:p3:bundle`). 
