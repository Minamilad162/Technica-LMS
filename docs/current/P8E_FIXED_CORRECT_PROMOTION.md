# P8e — Fixed-correct-count promotion in Level Up Practice (owner LOCKED)

Date: 2026-11-04 · This policy **supersedes the growing-denominator rule** in
P8d. It applies ONLY to Secure Practice → Level Up, NOT regular Practice modes,
assessments, lessons or the exclusive ASP 200-question/300-minute Mock.

## Exact owner-required interpretation

Choose fixed total `N` questions (currently N=1..50). Balanced thirds supply
the initial stage bases: Low=`max(1,floor(N/3))`, Medium=`max(1,floor((N-Low)/2))`
when N>Low, and High=remaining. For N=30 these are 10 Low, 10 Medium,
10 High **only if promotions happen without extra questions**.

To leave a tier, the learner needs BOTH:
1. At least the original tier base `B` questions answered at that tier; and
2. At least `ceil(B*70/100)` **correct answers in total in that same tier**.

**The number of correct answers required NEVER increases when extra same-tier
questions are drawn.** The number of extra attempts DOES consume the original
N-question global budget. If the learner hasn't reached the required correct
count, deliver another distinct approved non-Mock question at that tier.
After every server-graded answer recheck the same fixed correct target. On
passing, the NEXT question advances one tier (Low→Medium→High), resetting
counters solely for the new tier; never skip/demote. End at exactly N answers
even if still Low/Medium; earlier end only under existing server deadline or
abandon/fullscreen policy.

### Correct 30-question worked examples

- Perfect: 10 Low, 10 Medium, 10 High.
- Low first 10 answers contain **6 correct**. Q11 Low is **correct** →
  now **7 correct from 11 attempts**. That satisfies 7 correct from the
  ORIGINAL 10-question base, so Q12 is Medium. DO NOT calculate 70% of 11.
- Low 6/10; Q11 wrong; Q12 right → now 7 correct from 12 attempts, so Q13
  is Medium. Still require 7, NOT ceil(0.7*12)=9.
- Low stage of 11 questions + Medium stage of 11 questions (6 correct of
  the first 10 Medium, Q22 correct) → Q23 High; 11+11+8=30 questions total.
- All 30 Low incorrect → attempt ends at 30 still Low, no automatic promotion.
- **Medium obeys the same rule**, independently using its original base.
- Never display current Low/Medium/High, a promotion notification, or client
  answer keys during an active test. The general explanatory setup copy can
  mention fixed stage requirements. This is a practice difficulty rule, NOT an
  official ASP pass mark.

For N=10: Low base 3, need 3 correct; Medium base 3, need 3 correct.
For N=25: Low base 8, need 6 correct; Medium base 8, need 6 correct.
For N=50: Low base 16, need 12 correct; Medium base 17, need 12 correct.
For N=1/2, remaining stages can be unreachable before the global N cap.

## Code/DB and in-flight safety

- `adaptivePolicy.js` exposes the **pure test-only** threshold
  `adaptiveRequiredCorrect(checkpoint) = ceil(checkpoint*7/10)` and promotion
  additionally requires `attempted>=checkpoint`.
- SQL remains the source of truth. NEW guarded owner-run migration
  `supabase/migrations/202611040004_p8e_fixed_correct_target.sql` MUST be
  installed after the P8 and P8d migrations, in an owner-approved **Technica
  STAGING** project first. Do **not** re-run either prior migration. It adds
  a nullable, private `promotion_policy` column to P8 state. NEW attempts set
  `promotion_policy='thirds-fixed-correct-v2'` and use fixed base correct
  thresholds; historical P8/P8d attempts have `NULL` and retain their
  original growing-denominator logic until they end. Existing attempts are
  NOT updated, restarted, regraded or deleted.
- Server readiness still requires N approved, non-Mock questions PER tier
  (not just the original ideal third), to allow a failing learner to spend
  the entire selected N in Low. Returns strict version
  `thirds-fixed-correct-v2`, Low/Medium original bases, fixed required correct
  counts, 70% policy value and safe aggregate bank counts. Browser/secure
  Admin panels fail closed on older RPC responses, and do not read bank answers.
- One-at-a-time server question delivery, JWT/entitlement, private answer-key
  grading, RLS, attempt locking/idempotency, no duplicates, no non-approved
  or mock-exclusive questions, fixed question count and no visible tier labels
  remain unchanged.
- No question imports, bulk approvals, reclassifications, enrollment, Mock
  reservations, P9A governance, production data writes or Cloudflare deploy
  are performed by this code PR.

## Verification and release

- Node regression: fixed 7 of original 10, 6/10→7/11 immediate promotion,
  6/10→6/11→7/12 promotion, medium same, 25/50 base thresholds,
  contradictions/old backend readiness denied.
- Disposable PostgreSQL: preserve in-flight P8d attempt after P8e migration,
  Q11 promotion new attempt, Q22 medium promotion, total 30 unique questions,
  second Low recovery case, denied private-state browser read, no Mock leak.
  P8 original, P8d historical and all unrelated tests remain mandatory.
- Read-only `supabase/P8E_VERIFY_READ_ONLY.sql` verifies base/required correct
  counts, private nullable version column, server function footprints and
  RLS. Run this **only after a separately owner-approved staged install**.
- Real Auth/JWT, actual ASP bank volumes, Cloudflare and commercial readiness
  are NOT proven by CI; never describe source merge as production activation.
