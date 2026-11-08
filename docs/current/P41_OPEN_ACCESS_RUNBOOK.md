# P41 — Production-facing Open Learning and ASP diagnosis

## What the switch does
- In **Open Access** the backend—not the browser—allows authenticated ACTIVE LMS users to access all **published** Courses and Lessons, signed media, published Lesson Quizzes, approved Practice/Level Up and the finalized 200-question/300-minute official ASP Mock without a platform subscription.
- Unauthenticated, suspended, Draft, unapproved ASP questions, unreleased quiz, unfinished exclusive Mock form and Admin-only writes stay blocked. An empty or unreviewed Question Bank does **not** become magically available.
- The premium Subscription Plans page stays visible with exact admin-configured plan prices. While open, requests and purchases are disabled and the CTA is Coming soon. Existing legitimate paid subscriptions are not deleted or extended. Revenue and payment provider integration is still absent.
- Admin Tools → Subscriptions exposes a verified Admin-only **Enable subscription rules** button, invoking `lms_p41_set_open_access(false)`. Turning Open Access back on requires Admin confirmation and an audit record.

## Deployment gates — do not execute blindly against Production
1. Identify the exact Technica Supabase **project and database**; inspect `supabase_migrations.schema_migrations` remote ledger (read-only), prerequisite P1/P4/P21 actual function definitions, new public-schema Data API grants, backups and current published content.
2. Execute `supabase/P41_ACCESS_AND_ASP_READ_ONLY.sql` **read-only** in that exact DB. Capture canonical `slug='asp'`, any ASP-like titles with a mismatched slug, publication state and P10 installation. If ASP is Draft/wrong slug, return that real finding for a narrow reviewed fix; do not insert another ASP, auto-publish or rewrite bank IDs.
3. With explicit owner authorization for the exact environment, apply **once** `supabase/migrations/202611080007_p41_open_access_showcase.sql` after P21. Never replay historical migrations. The migration creates an **open** policy, replacing only P1/P4 access functions; it does not update existing user/subscription/question/course rows.
4. Deploy current frontend SHA. Confirm `lms_p41_access_mode()` returns `open` on a verified learner JWT; a missing P41 RPC intentionally fails closed and leaves P21 paywall intact.
5. Check real learner without a subscription: published lessons/video/PDF, same-page Lesson Quiz and approved Practice work. Check Draft/suspended/anon denied. Verify real ASP P10 Mock only if canonical published ASP exists with P9B 200 reserved and independent rights review. When 0/199 are reserved, the Mock must remain unavailable; **never replace with demo questions**.
6. In Admin Tools → Subscriptions toggle to subscription rules then back to open, verify P21 subscription/legacy grants and separate audit records. Test on browser/phone and signed media before representing as a released product.

## Re-enable paywall later
Verified Admin in Admin Tools → Subscriptions selects **Enable subscription rules** and confirms. Backend changes one audited flag; P21 original payment/manual subscription checks take effect immediately. Or authorized DBA calls `SELECT public.lms_p41_set_open_access(false)` with real Admin JWT session (not by unprivileged SQL Editor impersonation).

## ASP Course error resolution
`ASP course not found` might mean (1) no row in the exact DB, (2) a title like `ASP Course` with slug other than `asp`, (3) a Draft/unpublished course absent from learner catalog, (4) insufficient RLS read, or (5) no P9B immutable 200-question reserved form even when ASP is found. The dedicated read-only inventory checks (1–3); protected P10 readiness and signed session checks isolate (4–5). Fix only the verified case after owner approval and scoped backup; do not manufacture ASP records or turn on a local browser fake entitlement.

## Rollback and QA
Source-only rollback: revert P41 UI bridge; database change requires explicit reviewed forward remediation. Admin toggle to `false` is the safe business rollback. CI: `npm run test:p41:open-access`, full previous test suites and disposable `scripts/test-p41-postgres-smoke.sh`. CI pass ≠ live migration applied, real runtime verified or genuine paid processing.
