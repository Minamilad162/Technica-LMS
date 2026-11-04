# P8d — Owner-confirmed Adaptive Level Up, ONLY in Practice (2026-11-04)

## Locked product behavior (supersedes old 20%-checkpoint P8/P8b/P8c descriptions)

This policy runs ONLY when the signed-in learner intentionally chooses **Level Up** in **Secure Practice**. It must NOT affect ordinary Quick 10, Timed, Custom, Practice by Domain, admin Assessment, or exclusive ASP Mock (fixed 200 questions / 300 minutes).

1. The learner chooses a **fixed total N** (current live supported 1–50). There is NO extension beyond N.
2. Distribute the *ideal error-free* N into as-even-as-possible Low / Medium / High targets:
   - Low = `max(1, floor(N/3))`
   - Medium = `N>Low ? max(1, floor((N-Low)/2)) : 0`
   - High = `N - Low - Medium`
   - Examples: N=10 => 3/3/4; N=25 => 8/8/9; **N=30 => 10/10/10**; N=50 => 16/17/17. N=1/2 naturally cannot visit all three tiers; still stop at N.
3. Every attempt starts **LOW**. Promotion requires BOTH minimum questions answered **in the current tier** (Low target for Low; Medium target for Medium) AND `correct * 10 >= answered * 7` (at least 70% cumulative correct **among that tier's answered items**).
4. If a learner is below 70% after the stage's minimum, the SERVER draws a fresh approved, non-Mock question at exactly the **SAME difficulty**. Every subsequent submission recalculates the cumulative ratio, using all earlier correct/incorrect answers from that tier. Passing promotes exactly one tier for the **next** question. Never skip Medium, demote, reset the denominator in the same tier, or force promotion due to total exam count.
5. On promotion, reset only the NEXT tier's cumulative counters. Old tier attempts remain counted in N. Once High starts, remain High for remaining questions. **Stop at precisely N answered questions regardless of current tier**; finishing early is blocked while the untimed/deadline-valid session is open. Timed expiry can finish earlier by existing P4/P5 policy.
6. The server selects one question at a time based on private grading and stored state (the browser never supplies correct/answered counts). No questions are repeated within an attempt. Never draw DRAFT, archived, unclassified or Mock-exclusive questions. Existing P8 strict pool gate conservatively requires **at least N approved, non-Mock questions PER tier** in the chosen course/domain, because poor performance might spend all N in LOW. 10/10/10 is a *nominal distribution*, NOT a source-bank requirement of only ten of each.
7. The learner must **NOT know that the level just increased**: do not render current tier label, progression prompts, dynamic difficulty bar or answer keys during the attempt. The UI may explain the general Level Up mechanism before Start; during the exam show only question number out of N, timer and regular navigation.
8. The 70% threshold only controls transitions, **not** an official ASP passing score. A fixed Mock remains an independent assessment and does not become adaptive.

## Exactly 30 questions: required acceptance examples

- **All correct:** Q1–Q10 LOW, Q11–Q20 MEDIUM, Q21–Q30 HIGH; the learner sees 1..30 only, never a stage-change banner.
- **6/10 LOW:** after Q10 stays LOW. If next Q11–Q14 all correct, stages read 7/11=63.64%, 8/12=66.67%, 9/13=69.23%, **10/14=71.43%**; then Q15 is MEDIUM. If Medium next achieves 7/10 on Q15–Q24, Q25–Q30 are HIGH. Final split 14/10/6, still exactly 30.
- **0/30 LOW:** never advances; ends at question 30 at LOW. The test is not extended.
- **7/10 LOW:** Q11 MEDIUM. **6/10 MEDIUM:** keeps fetching Medium until cumulative >=70% or N reached.
- A prior P8 20%-gate attempt already in progress keeps its stored 20% checkpoint for BOTH stages; it must not switch rules mid-session. New sessions use the thirds policy.

## Database & source implementation

- New guarded migration: `supabase/migrations/202611040003_p8d_adaptive_thirds.sql` (requires owner-approved dedicated Technica staging after installed P8). **Never rerun original P8 migration**. This delta:
  - Adds `medium_checkpoint_size integer NULL` to private `lms_practice_adaptive_state` with RLS and grants unchanged.
  - Replaces only Level Up checkpoint/readiness/start/answer functions and creates non-browser-executable `lms_p8_medium_checkpoint(integer)`.
  - New start persists Low and Medium minimums; old sessions have `medium_checkpoint_size IS NULL` and use original stored Low checkpoint in both stages.
  - Readiness returns `checkpoint` (Low), `mediumCheckpoint` (Medium), `policyVersion='thirds-v1'`, `thresholdPercent=70` and strict N-per-tier aggregate. Browser and Admin checks reject outdated RPCs/contradictory results; no false-positive Practice Starts.
  - Does **NOT** insert, update, approve, classify, reserve, grant learner access, migrate source questions, modify the Mock or alter ordinary P4 practice modes.
- `src/production/adaptivePolicy.js` is the pure testable policy **not** grading authority. SQL P8d is the authoritative runtime engine.
- Add 30 preset to secure learner Practice and read-only Admin readiness, preserve 1–50 custom input, existing fullscreen guard and three-tier private question delivery.
- New owner-run `supabase/P8D_VERIFY_READ_ONLY.sql` checks actual 10/25/30/50 gate policy, new nullable column, private helper grants and eligible ASP question counts. It is SELECT only and must be run only in the confirmed Technica project if/when the separate migration is installed.

## Verification and release boundaries

GitHub CI must run `npm run test:adaptive:live`, `npm run test:adaptive:admin` and `scripts/test-p8-postgres-smoke.sh` with the **new delta applied to disposable PostgreSQL** after the original P8 smoke fixture. Explicitly test original in-flight 6-item checkpoint stability, N30 perfect 10/10/10, 6/10 failure and 10/14 recovery, 7/10 Medium promotion, N30 all Low and cap=30, role and content isolation. Full P1/P9A/ASP/Calculator/Practice/browser-build regression must still pass. The SQL Editor read-only diagnostic is separately checked in CI against synthetic disposable data.

**NOT DONE:** real Supabase staging migration, signed JWT/mobile-browser acceptance, actual approved ASP Low/Medium/High pool, Cloudflare deployment and paid production launch. A passing GitHub CI alone is not live acceptance. Do not execute migration on production or update actual question/learner data without a distinct owner approval, verified project identity, backup and rollback plan.
