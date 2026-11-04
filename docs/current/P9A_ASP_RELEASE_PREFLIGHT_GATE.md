# P9A — ASP question-bank release preflight (READ ONLY)

Date: 2026-11-04 | Status: source staged, no production or staging database mutation by this PR.

## Purpose and boundary

P4 handles securely selected server-graded practice, P6A stores audited human reviews separately from draft question records, and P8 Level Up requires three approved difficulty pools. **None** of these authorizes automatic publication. Before a commercial ASP bank can be released, the nine official ASP11 domains, verified answer/use-right reviews, the separate **exactly 200 question exclusive Mock reservation**, and a separately approved release procedure must all be complete.

P9A is a **visibility and safety gate only**. It deliberately does not provide an Approve/Publish/Reserve button. It cannot turn reviewed questions into approved questions, migrate the 1,625 demo rows, or implement the 200-question 300-minute Mock.

## Implemented source
- `supabase/migrations/202611040002_p9a_release_preflight.sql`: additive, admin-only, `STABLE SECURITY DEFINER` RPC `lms_p9a_release_preflight(uuid)`. It returns only aggregate counts, actual reviewed draft candidate tiers, ASP11 domain candidate counts, excluded/Mock counts, and exact blockers. Database checks `auth.uid()`, active real Admin role, and the genuine ASP course. Anonymous/non-Admin calls are denied. No secrets, answer keys, prompt text or any questions returned.
- `src/production/aspReleasePreflightApi.js`: treats the response as untrusted: validates the selected course, `mode='read_only'`, mandatory `releaseAllowed=false`, expected numerical sums, nine-domain format, mandatory blockers and excludes unrecognized sensitive fields. Missing RPC shows an actionable safe error.
- `AspReleasePreflight.jsx` + CSS: inside the **existing secure Admin → Question Bank → ASP → Review & classify** card, with an explicit Run read-only preflight button. No global menu, no duplicate course navigation, no real publication controls. Preserves P8c readiness and all historic Demo Practice/Calculator routes.
- `scripts/test-p9a-release-preflight.mjs` checks fail-closed response validation and source-only policy; `scripts/test-p9a-postgres-smoke.sh` executes only AFTER P1/P2/P4/P5/P6A/P8 on disposable GitHub Actions PostgreSQL, rejects learner/anonymous, validates nine domains and blockers, and compares question data fingerprints before and after.

## Owner-approved staging verification (NOT executed in this PR)
1. Confirm the **dedicated Technica STAGING Supabase project** and approved backup. Do not use CHEIRON, production by default, or any shared multi-project credentials.
2. Run the existing **read-only** `supabase/P6A_VERIFY_READ_ONLY.sql` and `supabase/P8_VERIFY_READ_ONLY.sql` in the confirmed project; compare actual bank statuses. Neither creates, approves nor reserves questions.
3. **Only after an explicit migration authorization**, install `202611040002_p9a_release_preflight.sql` once on staging. This is function creation only, not row publication, but still a schema change requiring controlled approval.
4. Deploy a Cloudflare **preview** built from the approved commit with genuine public `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time. Sign in as an active verified real Admin, open ASP → Review & classify → Bank release preflight, click Run. Compare totals to SQL Editor. Verify learner/anonymous direct RPC calls are denied, and the result contains **no prompt, answer, rights notes, emails, JWT, or service_role**.
5. Record `total`, `needsHumanReview`, `eligibleCandidates`, `approvedWithClassificationGaps`, `mockReserved`, `officialDomainCount`, domain candidate counts. All are real stored-state values and can be zero. They must NOT be assumed from demo 1,625-question JSON.
6. Confirm no row updates occurred. A green CI or a preview of 200 `mock_exclusive=true` flags does **NOT** certify an immutable, audited, versioned Mock form. The release response intentionally reports `releaseAllowed=false` until a separate, owner-authorized release implementation.

## Blockers for next phase P9B
- Confirm ASP source rights, crosswalk from five historical worksheets to nine current domains, and individual verified answers.
- Stage a reviewed **exact 200-question versioned Mock reservation** workflow that never leaks items into Practice, Level Up, diagnostics or trial.
- Build a separate audited, explicit Admin approval workflow (ideally dual-control) and negative tests; never bulk approve merely to satisfy P8 readiness.
- Real JWT browser and mobile testing, Cloudflare build/deploy verification, and reconciliation to the source bank and entitlement rules.

## Rollback and release
No existing tables, user records, questions, stored review decisions, approval states or Mock flags are mutated by P9A. Revert UI/CI via source commit. If the RPC has later been deliberately installed on staging, handle its removal through a reviewed migration and do not drop unrelated P6/P8 state. Paid-production status remains **NO-GO**.
