# P13 — Unified Admin Tools

**Status: SOURCE / synthetic CI and disposable PostgreSQL only.** Actual Supabase Production and question/billing data are unchanged. Owner requested consolidating scattered Admin functions in one tab with sub-tabs, premium Technica visuals and subtle motion.

## Information architecture

The consolidated **Admin Tools** workspace has six clearly navigable sub-tabs:

1. **Dashboard** — real Supabase KPIs, six-month dynamic registrations/Practice/Mock SVG trends, course enrollments and question bank counts. Counts are drawn from a protected P13 Admin RPC. No prefilled Demo charts or estimated revenue.
2. **Courses** — actual Course → Domain → Topic → Lesson administration using existing Supabase authoring adapters, adds Draft course, domains, topics, lessons, renames, reading paragraphs without auto-publishing.
3. **Question Bank** — reuses existing P6A `AdminQuestionReview` for human rights/answer/ASP11-domain/difficulty validation and separate independent Practice approval, never bundled browser mock question answers.
4. **Exams & Mock** — browses only human reviewed Ready Draft non-exclusive ASP questions, explicit 200 stable IDs selected across paginated results, read-only P9B preflight and second irreversible exact-string server reservation. P9B revalidates every UUID transactionally and permanently excludes Mock-exclusive 200 from Practice; no bulk auto-picker, no direct writes or automatic reservation. Unreserved Mock stays unready.
5. **Users & Plans** — real Admin-authorized paginated learner names/status/registration, current/enrollment plan type/status/start/end, verified P2 completed lesson count and P4/P10 completed attempts + latest scores. Detail view per user with Plan history and per-course progress. No invented billing amounts or fake renewal dates.
6. **System Tools** — existing P12 Admin read-only checks and private local Staging QA evidence, still NO-GO by default.

**Navigation:** old scattered Admin sidebar items are replaced by one **Admin Tools** entry. Existing deep-linked old routes are retained for compatibility. New protected `/admin-tools?tab=...` in React Demo routing; actual Supabase live build **does not use ReactRouter App.jsx** and now opens the exact same `AdminToolsWorkspace` from `src/production/SupabaseApp.jsx` as its default real Admin workspace. User can switch to existing full course manager without losing its functionality. This explicitly prevents a "Demo only" implementation.

## Database reality

Current P1 `lms_profiles` has `id/full_name/account_status/created_at`, P1 `lms_entitlements` has `course_id/type/status/starts_at/ends_at` but **no price, currency, payment transaction, invoice, gateway reference, refund amount or verified order**. Do not present paid entitlements as financial receipts. Show **Amount paid: Not recorded**; dashboard **Verified revenue: Not tracked**. If the client wants actual fees and payment history, that is a separate approved payments ledger + provider reconciliation and admin payment permissions project. No fake prices or transaction events.

P13 adds the **read-only** migration `supabase/migrations/202611050003_p13_admin_tools_analytics_read_only.sql`: protected `lms_p13_admin_overview()`, `lms_p13_admin_users(text,integer,integer)`, `lms_p13_admin_user_detail(uuid)`. Every function checks real JWT `auth.uid()` and database `lms_p1_actor_is_admin()` before selecting any learner. It intentionally never selects raw question prompt/options/correct index or private video paths, and does not give ordinary learners direct SELECT grants. It returns 6-month time-series aggregate records, actual course enrollments, private P2/P4/P10 aggregated learner statistics, active enrollment and plan history. The financial fields are **null**, not zero or estimated.

## UX, accessibility and motion

Existing Technica teal/dark-ink/white visual language, CSS gradients and type scale; premium unified hero, six tab pills, card hover lift, SVG line/area charts with true data, responsive grids, subtle transitions, animated brand orbits and panel entry transition. Use `prefers-reduced-motion:reduce` to disable movement. User controls update state immediately; server calls show explicit loading/unavailable messages instead of inventing data. No expensive video assets, new CSS/animation dependencies or untrusted chart iframe.

## Security and deployment

- Database P13 is **staged source only**. It has not been installed on Supabase Production; read-only functions still require a separately approved DB migration on a dedicated Staging project.
- Source-specific Mock reservation is already governed by P9B and protected server preflight. Only an explicit Admin click and exact phrase authorize a real irreversible reservation, checked inside P9B SQL; the UI does not bypass P4/P6A/P9B or auto-select questions.
- Secure Admin Tools workspace **re-verifies signed Supabase Auth session and active DB Admin role** through `verifiedLiveAdmin` even if the old Demo shell says Admin.
- The old Demo route may still contain demo-only pages behind historic deep links but the new Admin Tools pages do not draw KPIs/learners from `src/data/mock`.
- P10 Mock remains 200/300 server-authoritative; P8e Level Up original 7-correct-of-initial-10 policy preserved.
- `npm run test:p13` checks data validators, Admin workspace in both entrypoints, Mock 200 preflight/phrase, billing honesty, CSS, navigation regression, CI & governance.
- `scripts/test-p13-postgres-smoke.sh` runs after the P11 synthetic fixture only on GitHub's disposable PostgreSQL. It verifies no mutations on migration/report, anon/paid/trial role denial, legitimate Admin access, trend and user entitlement data, no question/payment leaks and bounded learner queries.
- No actual Supabase staging/Production queries, writes, migration installation or Cloudflare deployment have been performed here. **Go-live is still NO-GO.**

**Next integration gate:** activate/install P13 on owner-approved Staging, inspect Admin Tools with genuine real signed Admin, seed representative learner/plan accounts in **Staging only**, and perform read/write QA on courses, irreversible Mock decisions and subscription controls before any Production change. User requested a visually integrated Admin UX, not blanket permission to mutate current production questions or billing.
