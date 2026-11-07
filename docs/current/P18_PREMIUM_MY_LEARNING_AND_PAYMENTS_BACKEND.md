# P18 — Premium My Learning and verified learning dashboard

**Implementation scope:** Premium learner navigation and P11-verified course progress using the current Supabase data. No migration, fake scores, paid entitlement changes, simulated purchase promotion or payment provider integrations.

## Learner experience
- **My Learning** opens a premium Technica hero (real enrolled count), verified lesson-completion metrics, a prominent Course Spotlight and a clear **Continue Learning** shortcut to an active Course.
- A real enrolled Course has a premium image cover, actual title and summary, active enrollment badge, lesson progress bar and count. Progress is queried from **P11 `lms_p11_my_progress(p_course_id)`** with existing P11 validation. In this release the shortcut opens Course Details / syllabus; it does NOT pretend to know the last visited or next unfinished Lesson, because P11 does not return a last-Lesson ID.
- All Courses, Enrolled and Demo Previews filters are interactive, plus title/summary search. No additional database change required for filtering.
- **Active Enrollments** are exactly P1 paid/manual active, unexpired entitlements. **Demo Previews** are the separate P16 UI-only session markers; they never count as active purchases, get a progress bar, access P14 media, Practice, Mock or trusted grading. If a real entitlement is later present, the real state takes precedence.
- Verified P11 reports are loaded with a bounded concurrency of three RPC requests to prevent excessive database load. Absent/denied/error reports show **Progress unavailable** and unknown aggregate totals — not an invented 0%/100% or fake badge. Courses with verified 0 of N show 0%; zero published Lessons are not labeled completed. Aggregates only display when all enrolled Courses have valid verified reports.
- The current app uses both a Supabase-only learner entry and `/#/` ReactRouter; P18 `PremiumMyLearning` is embedded into the same shared `LiveLearnerWorkspace`. Practice and My Practice buttons take the learner to the correct ReactRouter pages when embedded, preserving secure P4/P11 page semantics.
- Responsive behavior uses a large hero, summary chips, a featured Course cover, horizontal learning cards, distinct amber demo cards, and compact stacked UI for mobile including iPhone-sized viewports; real-browser iOS/Android QA remains required.

## No security regression
- The P1 paid/manual entitlement checks, P15 explicitly approved first free Intro, P14 private signed media, and P16 fictional-number checkout demo remain unchanged.
- P11 analytics come from server-side verified progress; no client-calculated completion from merely opening PDF/video, no synthetic scores, and no localStorage data driving real learning percentages.
- No new Storage bucket, table, RLS policy, SQL migration, or environment variable; P17 Course cover upload still separately requires owner-applied P17 SQL if not yet installed. Never rerun P15.

## Next phase: genuine payments — Backend contract (NOT IMPLEMENTED)
A valid processor integration needs an owner-approved **provider and sandbox**, commercial pricing (per Course amount + currency), tax/refund rules, business merchant account, and customer billing/contact requirements.

Proposed flow:
1. Signed-in learner clicks Enroll Now. The trusted backend verifies course is published, learner is active, checks existing P1 entitlement, and quotes a stored server-side price in the correct currency. Browser never determines the amount.
2. Server creates a durable **Checkout Order** and provider session with an idempotency key; only non-sensitive order/customer/provider IDs go to the browser. Provider checkout is hosted; no PAN/CVV stored in Technica frontend, Supabase, GitHub, or logs.
3. After an authenticated provider **signed webhook**, backend validates event signature, merchant account, order reference, amount, currency and actual paid status. Within an idempotent database transaction it marks order paid and grants exactly one time-scoped `lms_entitlements` entry.
4. Learner My Learning shows the real verified enrollment and protected content *after* backend confirmation only; browser redirect/success query string is never proof of payment.
5. Refund/chargeback/expiry and duplicate webhook cases reconcile Orders and safely revoke/expire the entitlement with audit trails. Admin screens must separate money received from paid grants and simulated checkouts.
6. Staging role-negative, replay/idempotency, failure/retry, revocation and mobile QA are mandatory before live charging.

**P18 deliberately DOES NOT implement this gateway, order schema, price editor or settlement**, because no actual provider or price/currency contract was supplied. Adding a client-controlled paid grant or fake financial transaction now would break the existing LMS security model.

## Verification
- `npm run test:p18`: P11 report validation, bounded concurrency, complete vs in-progress vs unavailable states, aggregation honesty, featured-course selection, responsive components, search/tabs, both portal routes, demo separation and no private content bypass.
- `npm run test:p17` regression now checks P18's new separation; existing P1–P17 and disposable PostgreSQL RLS tests still run in CI.
- Live rollout conditions: main CI, Cloudflare build, actual P11 RPC availability, learner mobile/desktop QA, verify P17 Storage independent of this P18 UI.
