# P12.1 — Production Readiness & Integration QA: live Admin read-only gate

**Status:** Source implementation and synthetic CI only. **Production launch remains NO-GO.** No Supabase Production/Staging migration, questions, entitlements, grades, grants, media or user data have been changed.

## Admin UX

- URL: `/release-readiness` under existing **Admin → Release Readiness** sidebar.
- Only a real signed-in Supabase Admin can execute protected database checks. The existing Demo Admin UX is only a navigation shell, NOT a database permission. `verifiedLiveAdmin()` uses `auth.getUser`, active profile and live unrevoked Admin role from P1. Missing/invalid Auth fails closed; no P6/P8/P10/P11 queries run until the real Admin is confirmed.
- Read-only actual-project checks with pass/blocked statuses: HTTPS public build config (not revealing URL/key), Admin JWT and role, ASP course catalog, Course → Domain → Topic → Lesson presence, P2 own-progress query, P4 entitlement RPC, P6A aggregate ASP bank inventory (not answers), P8e verified N30 Level Up pools, P10 200-question versioned Mock reserved form and P11 protected own analytics RPC.
- Running checks is a **manual UI action / page read**, not a scheduled job, and does not import or approve content. All protected answers and question source rows remain private.
- Seven independent **PENDING** gates always remain until separately verified, so the page always presents **NO-GO** in P12.1:
  1. Actual licensed ASP content and qualified human answer/difficulty/reference review;
  2. Real Supabase staging signed JWT, RLS and complete enrollment → learning → Practice/Mock → score/progress workflows;
  3. Server-authorized private video/PDF access, with honest mobile screenshot/recording limitations;
  4. Paid/manual/trial grant, expiry, refund and payment/webhook reconciliation under the chosen commercial launch model;
  5. Desktop/iOS/Android fullscreen/browser, network loss, autosave, hidden-tab abandon, calculator and responsive UX;
  6. Launch scale/performance and connection failure tests;
  7. Explicit approved Production backup, rollback, deployment, monitoring and owner GO authorization.
- Clicking **Copy checklist** copies only whitelisted check statuses and generic aggregate counts, not tokens, keys, emails, questions, correct answers, user IDs or raw DB error messages.
- Manual evidence is NOT editable/approvable from this UI. A future release review can add a separate trusted approval ledger if requested, without making the browser authoritative for production readiness.

## Evidence boundary

GitHub CI can certify synthetic regressions and build security invariants only; it cannot prove real Supabase migrations are installed or real enrollment/media/payment flows behave on target devices. P11 and P10 remain staged code and production launch is unverified. A P6 count `total > 0` does not establish that the historical/new source is the expected 2,500 questions or rights cleared; even 200 Mock-exclusive flags are NOT proof of actual valid P9B reservation (P10 versioned readiness must confirm exact 200). P2 table existence does not prove validated lesson event ingestion.

The current source bank **development is frozen**, per owner's DEC-026: private new 2,500 question source for future onboarding; no repetitive P9B/P9C/P9D analysis loop. Only the final controlled content-release gate is outstanding, and does not block P12 engineering.

## Source files and verification

- `src/production/releaseReadiness.js`: JWT Admin gating, read-only checks, aggregate-only safe status output, seven manual gates, NO-GO summary and safe report text.
- `src/production/LiveReleaseReadiness.jsx` and `releaseReadiness.css`: responsive Admin page, rerun and copy checklist. No button to deploy, reserve, migrate or approve questions.
- `src/App.jsx` and `src/components/Layout.jsx`: Admin-only route and sidebar without changing approved learner flows.
- `npm run test:p12`: mocked real Admin/role, present and missing functions, no unauthorized P6 run on nonadmin, no DB writes, no answer/user/token leaks, permanent NO-GO and route safety. Existing P1/P2/P4/P5/P6/P8/P9B/P10/P11 synthetic/PostgreSQL CI remains required.
- `docs/current/RELEASE_SECURITY_CHECKLIST.md`: consolidated source-vs-live evidence statuses; `TECHNICA_LMS_MASTER_BLUEPRINT.md` §66; Logic Registry LMS-035.

## Next P12 gate (not silently authorized)

After reviewing source CI, an authorized owner can install the existing **required** migrations on a dedicated staging project, create test accounts/entitlements only in staging and run the Admin page there. Perform device/browser E2E and performance tests and collect evidence. This project has no connected Supabase control-plane credentials in this conversation; do not claim a live inspection or launch. Any Production schema/data writes require a separate explicit owner instruction.
