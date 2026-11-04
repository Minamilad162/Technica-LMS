# P8 — Real learner library + proportional Adaptive Level Up (staged)

Date: 2026-11-04. Scope: user approved continuing Technica LMS backend integration and explicitly required questions to become harder as correct answers accumulate, **proportional to selected Practice/test length**.

## Delivery status and strict boundaries

P8 **source and disposable test SQL only**. No Supabase production migration, course/question insert, publishing, provider change, Cloudflare deployment or real student data changes executed by this pull request.

### Learner access
- Default logged-in **My Learning** now uses real Supabase Auth, P1 published course catalog and active entitlements. Opens `/learning/course/:courseId`, loads accessible Course → Domain → Topic → Lesson hierarchy, and reads only authorized text blocks via P1 RLS. No browser-local ASP bank or localStorage progress is used.
- Previous independent demo course/player is preserved behind an explicit Legacy Demo Preview label; not silently copied or represented as real enrollment.
- P2 `lms_lesson_progress` is READ ONLY, scoped to the current Auth account. Opening a lesson **does not** mark completion. P2 validated write-event ingestor, video watching verification, quiz completion and final learner progress are still separate milestones. A progress query failure shows unavailable, not fictitious percent.

### Adaptive difficulty: math and meaning
- **Server-only adaptive Level Up** mode staged as `supabase/migrations/202611040001_p8_adaptive_levelup.sql` after P1/P2/P4/P5. It is not a static shuffled bank. The server releases ONE question at a time, grades each response on the server, then selects the next eligible question.
- Difficulty starts **Low**; moves Low → Medium → High after **at least 70% cumulative correct at the current tier**, once that tier has received at least its *proportional checkpoint count*. It never downshifts, never promotes solely because of passage of time, and never advances on a client-supplied score. An initially weak learner can recover later within the current tier.
- **Checkpoint rule = min(N, max(3, ceil(N × 20%)))** where N is the learner's chosen session size, 1–50. Examples: N=10 → 3 questions; N=25 → 5; N=50 → 10. At each checkpoint and after every subsequent answer, require `correct×10 >= answered×7` cumulative at that tier before promotion. On promotion, reset stage counters for the NEXT tier, but keep overall session target N unchanged.
- Perfect session examples: N=10 → 3 Low, 3 Medium, 4 High; N=25 → 5 Low, 5 Medium, 15 High; N=50 → 10 Low, 10 Medium, 30 High. If the learner misses the threshold, they remain at the current tier for as many questions as needed until recovery or the session ends. N below ~6 may not visit all tiers, and is not falsely claimed to.
- **Readiness gate**: each of Low/Medium/High MUST have at least N approved, *non-mock-exclusive* questions for selected course/domain. This conservative guarantee prevents exhausted tiers even if the learner spends all N on Low or Medium. Draft, Unclassified, archived and Mock-exclusive sources never enter an adaptive session. A readiness RPC returns only counts/threshold to an eligible JWT; no answer keys.
- Private `lms_practice_adaptive_state` table has RLS, no authenticated browser table grants. Each adaptive answer RPC locks its owned attempt, checks entitlement and deadline, permits only the latest assigned question, disallows edit/reanswer and returns the next sanitized P4 payload with NO correctIndex, explanation or difficulty before final submission. Identical-answer retries are idempotent. Server P4 answer RPC explicitly rejects adaptive attempts; P4 finish RPC blocks premature finalization. P5 fullscreen-abandon redacts snapshot and seals the attempt.
- **UI**: Secure Practice now has Level Up with 1–50 question target, optional timer/domain and live readiness check. Main existing Practice remains unchanged for regression and links to `/practice/live` for secure backend practice. Legacy Quick 10, Timed, Custom and Domain keep existing behavior. Level Up does not auto-run if the P8 SQL is not installed or if the bank is not ready. Answer/difficulty labels stay hidden during the attempt.
- Formal **ASP 200-question/300-minute Mock** is separate, fixed, exclusive and NOT converted to adaptive. The historical general Assessment/demo mode also has no valid difficulty-tagged/private bank and is NOT silently replaced by adaptive. Expanding adaptive to a separate genuine assessed exam requires separate server form/scoring contract and owner acceptance.

### Deployment/permissions
1. First verify the dedicated Technica Supabase project, current P1–P6 migrations and real Auth + JWT/RLS. Never use the CHEIRON project. Back up intended non-production/staging data.
2. Verify reviewed question volumes (at least N low, N medium and N high approved and non-Mock). A P6A human `READY` review alone doesn't approve a question for practice; P4 `approval_state='approved'` with actual difficulty tag is required. No automatic publication is part of P8.
3. Only after **explicit, separate owner authorization**, stage the P8 SQL through the approved migration process and perform signed real JWT tests. SQL alters P4 mode constraint and two functions; re-run P4/P5 negative/security tests.
4. On a staged Cloudflare preview build, open My Learning as Learner, confirm enrollment and RLS; open Secure Practice → Level Up with 10, 25 and 50 questions; verify correct/wrong progression, fullscreen exit/refresh seals attempts and no answers in network responses before submission.
5. Verify no service_role in Vite build, no Admin privileges for Learners, no mock-exclusive leakage, and no unreviewed ASP questions. If readiness is false, the UI must show numbers and refuse to start.
6. Only after separate owner sign-off evaluate production migration/deployment. Do not attempt to 'fix' a not-ready bank by changing approval or inventing difficulty metadata.

### Automated acceptance
- `npm run test:adaptive:live` checks exact 10/25/50 proportional checkpoints, threshold boundaries, recovery, monotone difficulty and live read-only learner permission contracts.
- `bash scripts/test-p8-postgres-smoke.sh` applies P8 only to disposable Postgres after P1/P2/P4/P5/P6, seeds synthetic 3-tier bank, verifies 10 perfect questions spread 3/3/4, 25-question recovery, denied RPC by unauthorized accounts, immutable/duplicate-safe answers, P4 bypass blocked, no mock/draft selections, abandoned redaction and server grading.
- Existing P4/P5/P6/Calculator/Practice/Builder/ASP integrity tests and independent secure live-bundle test must continue to pass.
- Source and disposable PostgreSQL CI PASS **does not** prove real Supabase installation or production functionality.

### Rollback / release
- No production data was altered by this GitHub change. Roll back UI by reverting this PR. If P8 is later applied to staging/production under authorization, rollback is a separately planned database migration/recovery decision; **never drop P8 state/table with active attempts**.
- Still missing: full P2 server-side verified lesson event ingestion, secure media/DRM, protected paid assessment variants and separate ASP Mock, analytics, billing.
- Paid public release remains **NO-GO**: old demo practice still embeds historic ASP answers in the main browser bundle. Auth alone does not protect those frontend assets.
