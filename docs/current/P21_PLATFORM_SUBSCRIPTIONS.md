# P21 — Platform-wide duration subscriptions (3, 6, 9 months)

**Date:** 2026-11-07
**Scope:** Replace NEW per-Course Checkout/Enrollment with one plan covering the published LMS. Keep existing paid/manual Course entitlements as temporary historical access until owner approves how to migrate/revoke them. Do not silently alter production data or migrate existing customers.
**SQL:** `supabase/migrations/202611070002_p21_platform_subscriptions.sql` — OWNER-APPLIED ON APPROVED TECHNICA STAGING **ONLY ONCE**, after verifying ledger, P1/P4/P15 and backing up. Never run SQL from source directly against live production without permission. P21 new tables/privileges require real Supabase Data API verification after applying.

## User-facing journey
1. Public/learner page **Subscription Plans** shows active, Admin-configurable plans: default 3, 6, 9 months. All default price/currency values are NULL: the owner must set actual commercial amounts and currency before plans may be requested. No invented prices or Egypt-only currency assumption.
2. The learner clicks **Request this plan**. An authenticated P21 RPC verifies an active profile, published priced plan and no current active subscription. Creates a PENDING request, with rate-limited one pending request per learner. This is **not payment**, gives **no access** and collects no card data or fake financial records.
3. Admin Tools → **Subscriptions** can create/edit a plan's name, 1–36-month term, amount, ISO currency, description and visibility; it can review requests and manually approve/reject, and revoke active membership. Manual approval explicitly requires a separate business verification (offline payment or complimentary authorization); server inserts a `source='admin_manual'` subscription and audit record. It must never pretend a processor charge succeeded. No user-controlled amount or duration can grant entitlement.
4. Membership starts at the **server timestamp** of Admin approval, expires at `starts_at + make_interval(months=>plan.duration_months)`; this uses calendar months rather than 90/180/270 fixed-day assumptions. All published Courses, all their protected Lessons/PDF/Video, Practice, Level Up and official Mock Exams become available during that period. Backend checks current timestamp, active account and active status **on every access**.
5. My Learning includes every published Course as a member and shows membership name+expiry. Renewals and recurring billing can be implemented later: no automatic renewal, no implicit rebilling, no per-Course checkout for new plans.
6. Expired, revoked, refunded or suspended accounts immediately lose access to *new signed requests/server RPCs*. Existing already-issued P14 signed media URLs may remain usable until their short TTL ends; native video buffering and cached pixels cannot be retroactively withdrawn. Progress and grades already recorded remain historical.

## Security and backend
- `lms_subscription_plans`: Admin-only write via `lms_p21_save_plan` RPC; public read of published name/price/duration; hidden plans readable by Admin.
- `lms_subscription_requests`: row-level scope to its user or Admin; only RPC `lms_p21_request_plan` inserts. Approval/rejection through `lms_p21_admin_decide_request` under Admin JWT; row lock + per-learner advisory lock prevents concurrent grants, audit captured. No `authenticated` INSERT/UPDATE grants.
- `lms_platform_subscriptions`: row-level SELECT for owner/Admin, no direct browser writes. Only authenticated/Admin RPC creates `admin_manual` grants; future signed payment webhooks would use `payment_verified` after financial verification. Plan name/duration/price/currency are **snapshotted twice, at user request and on activation**, so editing a plan never changes the already-requested terms or an active membership. Pending requests can still be rejected if the plan is later hidden. Active = profile active AND source-backed `status='active'` AND `starts_at <= now() < ends_at`.
- Replace P1 `lms_p1_course_entitled` & `lms_p1_can_view_lesson` and P4 `lms_p4_can_practice` with additive global-subscription OR historic legacy entitlements. P8 Level Up & P10 Mock call P4 and inherit the global gate. P11 Learner Progress uses P1. P14 Media Edge uses `lms_p1_can_view_lesson`; P15 Free Intro remains a separate Admin-controlled preview.
- P21 does NOT alter P1 tables, content, exam questions, evidence, old grants, storage, or question-selection logic. It does not add a direct browser INSERT to subscriptions, bypass RLS, or add a service role key to browser code.

## UI wiring
- Router: `/#/subscription-plans`; legacy `/#/checkout/:courseId` redirects to platform plans.
- `LiveLearnerWorkspace` & standalone `SupabaseApp`: full access for verified active global subscription or old grants, with secure media still authorized by P14. Learner sidebar and mobile navigation include Subscription.
- `LearnerCourseCard` links to View Plans rather than per-Course billing. `PremiumMyLearning` displays membership status and expiry and all included published Courses.
- `LivePracticePortal`, `LiveMockPortal`, `LiveLearning` and `liveLearningApi` recognize platform access while preserving existing server-side P1/P4/P10 authorization.
- `AdminSubscriptionsPanel` has configurable plan cards, admin request-review and subscription revocation, with no false revenue reporting.
- P16 per-Course simulated Checkout source remains as a **legacy isolated QA artifact only**; it is no longer wired into active learner navigation. Existing demo-only flags never grant protected content. Future payment provider must be configured separately.

## Migration rollout and verification
1. Read-only inspect migration history, existing P1/P4/P15 functions, profile and entitlement counts and P21 table-name conflicts in TARGET project. Confirm project ID is Technica staging, not Cheiron/PTW/Production.
2. Check backup/recovery and approved SQL; owner applies `202611070002_p21_platform_subscriptions.sql` ONCE. No earlier migration replays.
3. Verify Data API SELECT grants/policies, Admin RPC Execute grants, exact 3 seed plan names, NULL prices, and absence of learner write rights.
4. Admin sets real name/term/price/currency and publishes. Test learner sees published plans, cannot self-grant, can request only a priced plan, Admin manually approves, membership covers 2+ unrelated published Courses, Practice, Level Up, Mock and P14 media. Test anonymous, other learner, suspended, expired, revoked, repeated webhook/replay (future) and P15 Intro.
5. Run GitHub `npm run test:p21:subscriptions` and disposable `bash scripts/test-p21-postgres-smoke.sh` after P17, all P1–P20 frontend and database regression. No release success claim without Cloudflare live build and real Supabase authenticated browser QA.
6. Pricing, tax, receipt, hosted gateway, refund/chargeback reconciliation and auto-renewal remain **future P22**. Do not automatically activate on browser redirection, demo numeric input, copied request ID, or unsanctioned payment.

**Known transitional limitation:** Existing purchased/manual Course entitlements are honored temporarily rather than revoked. When a user has one of these but no platform membership, only that historical Course is accessible. This is intentional data preservation pending business migration signoff.
