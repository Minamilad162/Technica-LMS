# Technica LMS — Tests and Regression Plan

Use the actual source and scripts in package.json. Run checks in a non-production environment. Never report PASS without a command output or verified browser result.

## Existing tests (v1.15)
npm run check
npm run verify:bank
npm run test:selection
npm run verify:images
npm run test:auth
npm run test:motion
npm run test:courses
npm run test:quiz-navigation
npm run test:review
npm run test:admin
npm run test:course-dialog
npm run test:authoring
npm run test:admin-bank
npm run test:lesson-media
npm run test:learner-ui
npm run test:learning
npm run build

## Infrastructure CI gates
node scripts/check-infrastructure.mjs
npm ci (REQUIRED on main after P0 PR #6; lockfile committed and previously verified)
npm run typecheck (BLOCKED until a genuine compiler configuration is adopted; never fake PASS)
npm audit --audit-level=high

## New production unit/integration tests required
- Course/domain/topic/lesson parent and permissions, archived/revised lesson handling.
- Excel/CSV ingestion source/provenance, old ASP 1,625 bank integrity and nine-domain crosswalk.
- Mock pool: every non-mock mode excludes all 200 reserved questions, across every source filter and after a previous mock attempt.
- Mock exactly 200 distinct items and exactly 300 minutes under server deadline, refresh, offline reconnect, duplicate submit, expired session and admin form edit.
- Adaptive <=69% stays current tier; >=70% promotes at valid checkpoint; cumulative, variable session count, insufficient bank and zero duplicates.
- User progress viewed/completed/passed, watched video intervals, PDF coverage, lesson quiz requirements and multi-device sync.
- Payment webhook signature/idempotency/refund and trial/plan/access expiry.
- Security: learner/admin access direct API, RLS/grants, correct answers withheld, unauthenticated storage denial.
- Scientific calculator correctness, mobile/keyboard accessibility and time calculations.

## Browser smoke cases
Desktop at 1280+; mobile at 375/390/430 widths; browser reload and back button; modal focus/scroll; exam navigator/flags; reading layout, no horizontal overflow; reduced-motion settings; video fallback; trial gates. Existing v1.14 Saved UI removal and Course Builder dialogs must not regress.

## Test evidence template
Command / environment / commit / timestamp / duration / PASS-FAIL-SKIPPED / observed output / screenshots or link / owner. Record blocked checks instead of fabricating results.


## P1 disposable PostgreSQL test gate (implementation branch only)

- \`npm run test:p1:schema\` runs Node-only contract assertions, NOT SQL execution.
- \`bash scripts/test-p1-postgres-smoke.sh\` runs in a GitHub Actions \`postgres:16\` temporary service. It requires PostgreSQL client \`psql\` and test role/bootstrap stubs; do not point it at user databases.
- CI job \`p1-postgres-smoke\` applies \`supabase/migrations/202610300001_p1_foundation.sql\` to a disposable test DB and validates anonymous/paid/trial/admin access, cross-course isolation, revoked/expired entitlements, suspension and self-privilege escalation denial.
- The passing CI job does **not** replace a real Supabase staging test with signed JWTs, Auth user lifecycle, Data API, Storage and Edge Functions. Keep those as release blockers.



## Scientific calculator integration — 2026-10-31

- \`npm run test:calculator\` executes \`scripts/test-scientific-calculator.mjs\` using Node 22. No browser or GPU required.
- Assert arithmetic and operator precedence, bracket/negative exponent, root/log and trig in three angle modes, hyperbolics, fractions/mixed forms, 1-/2-variable statistics, factorial/combinatorics/permutations, memory variables, random range and error handling.
- Verify the same component imports on \`src/pages/QuizPage.jsx\` for Practice and Assessment, and \`src/pages/LearningPage.jsx\` for Lesson Quiz; CSS imported globally and mouse drag/keyboard listener logic present. These are static component wiring checks, not browser interactions.
- **Manual QA required:** desktop 1280×720 and 1440×900 plus mobile 375/390/430 widths: question and choices readable while calculator open; drag and minimized state; calculator keypad with pointer; text input with physical keyboard; avoid shortcut interception while answering; scroll and safe area on phone; no quiz timer pause or answer state change; review modal stacking; keyboard accessibility/Escape.
- Compare sampled outputs against an independently verified scientific calculator reference and record any differences. Do not label fully TI-model compatible without full qualification.
- CI passing does not assert Cloudflare deployment or Supabase production exam security.

## Calculator extended modes and model regression — 2026-10-31

- Run `npm run test:calculator` **and** `npm run test:calculator:extended` (Node), in addition to all existing bank/quiz/learning/DB tests and `npm run build`.
- Cover signed roots, source input angle modifiers, DMS/rectangular-polar conversion, exact rational/root/π forms, fractional weighted and ordinary 1Var/2Var stats, list formula self-reference prevention, 7 register symbols, K repeated operations and auto/Ask-x table.
- Verify no input field outside the expression editor is hijacked by global calculator shortcuts; in particular check the 3-list editor, statistics, Ask-x table inputs, dropdowns and answer choices while the calculator is open.
- Test 375/390/430px touch layout, desktop 1280×720 floating window, keyboard and pointer, free movement of the calculator, question+answer visibility, minimize/close/reopen, persistent state within quiz navigation.
- Benchmark TI-model calculation parity separately, distinguishing direct numerical formulas from full exact MathPrint/template editing, menus and precision settings. Passing CI is not permission to claim official TI hardware equivalence.
