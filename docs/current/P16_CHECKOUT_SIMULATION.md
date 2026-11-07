# P16 — Course Checkout Navigation and Test-Payment Simulation

**Scope: source/UI simulation only; NO real payment, billing, Supabase entitlement update, Supabase migration or customer charge.**

## Learner journey
1. Signed-in learner sees only Admin-published courses under **Courses**. Each unenrolled Course card has separate **View course** and **Enroll Now** actions; enrolled users see **Continue**.
2. Selecting an unenrolled published Course shows its published Course → Domain → Topic → Lesson outline. The explicitly Admin-approved first published Intro lesson remains free. **Clicking any other locked Lesson now sends the learner to Checkout for that same Course.**
3. Checkout displays immutable selected Course name, existing signed-in account email, a summary (no fictional pricing), a clear DEMO label, a fictional 6–12 digit *test reference*, a required acknowledgement and a **Complete demo checkout** button. No card number/expiry/CVV/bank account/payment credentials are requested or saved.
4. On successful simulation the learner sees a clear *no charge/no genuine enrollment* receipt-free success screen, then can select **Go to My Learning** or **Explore course lessons**. The simulated Course appears in My Learning for that browser's current session and Course/learner pair only.
5. The simulated Course's other *published lesson headings* become clickable for a **navigation-only placeholder**. They still do **NOT** fetch real protected PDF/video/text blocks, record completion, unlock server-graded Practice/Mock, or receive P1 `paid`/`manual` rights. Real paid/manual entitlement and P14 private media gateway continue to be checked server-side.

## Routing and state
- Live Vite Supabase mode: the `LiveLearnerWorkspace` renders an internal checkout screen, then My Learning or Course outline without a ReactRouter dependency.
- Existing ReactRouter app: `/#/checkout/:courseId` and `/#/course-catalog/:courseId` are bookmarkable; `LiveLearnerPortal` resolves the URL's Course ID, then verifies real Supabase Auth and fetches the selected published course by ID. Client-provided title/price are never trusted.
- `src/production/checkoutSimulationApi.js` stores only a `completed` marker keyed by current Supabase account UUID + Course UUID in `sessionStorage`. No digits, dates, billing data or actual entitlement recorded. A different user, course, browser or expired tab session will not inherit it. Browser flags are *not an authorization signal* to any backend.
- Demo remains enabled only while the product explicitly has no connected provider; `VITE_DISABLE_CHECKOUT_DEMO=1` disables the demo UI. Turning off demo does not create real billing; backend integration is a separate release gate.
- `src/production/LiveCheckout.jsx` is a responsive standalone UI; course summary is a simulation with **zero charged** and no invented currency or real price.

## Security contract
- P1 `lms_entitlements` remains authoritative for full Course access. P15 Intro RPC/RLS remains authoritative for Free Intro, P14 Edge remains authoritative for private PDF/video. Client demo flags cannot grant any of these.
- No new SQL required for **this simulated checkout phase**. The user already reported P15 SQL `Success`; don't replay.
- No real payment card inputs, no real payment APIs, no webhook or receipt, and no fake paid state written to production Supabase.
- Frontend publishes the no-charge/no-credential warnings, including the success state. Never market the demo as a real purchase.
- A real payment phase will require owner-approved amount/currency catalog, purchase/order/transaction ledger, processor sandbox & live credentials in server secrets, signed webhook with idempotency, verified payment status, server-side creation/revocation of `paid` entitlements, refunds/chargebacks/retries and negative/fraud tests on isolated staging. Never issue paid grants on the basis of client-side return URLs or client-supplied payment confirmation.

## Validation
- `npm run test:p16` tests course+user isolation, reference validation, confirmation gating, no entered digits persisted, checkout/lesson redirects, My Learning state, no private media bypass, both /#/ routes, mobile CSS, and Master Blueprint.
- Re-run existing P1–P15 source and disposable Postgres CI. Check Cloudflare build + mobile rendering before claiming release readiness.
- Production real payments and actual paid lesson unlocks remain **NOT IMPLEMENTED** in this phase.
