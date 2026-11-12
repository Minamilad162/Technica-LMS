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



## Math-style template editing and precision release gate (2026-10-31)

- Run new \`npm run test:calculator:mathprint\`; assert four nested fields, slot serialization, deletion, empty-slot error, navigation wiring, Classic right/left power precedence, bounded BigInt rational arithmetic, 10-display-digit FLOAT and FIX, list formula recompute and circular detection.
- Repeat previous scientific tests (\`test:calculator\`, \`test:calculator:extended\`), all bank and practice/assessment/learning suites, Vite production build and PostgreSQL RLS smoke. Protect question/answer state, timer, course taxonomy and 1,625 imported ASP questions.
- Manual desktop: click a/b then type numerator, ArrowDown to denominator, tab out, nest a root within another template, enter calculation, delete template and test Classic↔Textbook conversion.
- Manual mobile widths 375/390/430: touch edit slots and toggle keypad; confirm bottom dock lets learner see and answer original question; test virtual keyboard viewport, rotation, pointer focus and non-modal overlay.
- Model parity: independently benchmark actual TI-30XS MultiView or authorized reference for display/nested behavior, precision rounding, exact radical/π combinations and data menus. Automated code/source checks alone do not certify hardware or actual browser interactivity.


## TI-30XS MultiView calculator audit and actual Chromium UI tests

- \`npm run test:calculator:ti-audit\` must PASS, alongside all previous calculator, Math-template, 1Var/2Var stats, ASP imported bank and P1 SQL tests. Test vectors come from official TI product/reference/guidebook documentation, not TI proprietary firmware.
- New [Calculator Real Browser Audit](../../.github/workflows/calculator-browser-audit.yml) executes real Chromium 1440×900 and touch-emulated 375×812, 390×844 and 430×932, including calculator window state, nested fractions/Enter, answer selection while floating window is open, dragging, question navigation, and browser exceptions. It also checks Assessment and Learning Knowledge Check entry flows.
- A previous 390px Playwright run exposed fixed overlay click interception. Both the answer-click check and next-question check must PASS at all supported mobile widths after the split-pane fix. Source/test-only coverage is insufficient.
- Maintain a feature-level status matrix at [TI30XS_CALCULATOR_AUDIT_20261031.md](TI30XS_CALCULATOR_AUDIT_20261031.md). All remaining partial/not-implemented firmware behavior must be tracked; do not present a high-level green CI result as 100% certified TI compatibility.
- Browser tests on CI are Chromium; actual Safari on iPhone, Android browsers, accessibility and manufacturer hardware-output fidelity remain separate acceptance gates. No connected cloud or production database is exercised by this UI audit.


## v1.1.6 calculator TOOLS / LCD and molded-shell regression

- Run all existing calculator maths, Math template, TI-guide cases and the physical-keypad static test. Ensure removal of the LCD toolbar does NOT remove editor imperative methods or keyboard shortcuts.
- In desktop Chromium and 375/390/430 mobile: assert **zero template buttons in .tc-calc-display**, status/input/result remain, TOOLS shows all seven structured-template actions and Remove slot, click fraction and nested square root via TOOLS and verify evaluation.
- Verify rounded shell border is blue/dark (not white/silver), computed shell gradient does not reintroduce bright strips, 35 main + 6 upper keys remain and the calculator body does not require scrolling. Screenshot each viewport.
- Confirm student can still select answers and use next/previous while the calculator is open. No backend/database changes.


## Practice quick-select presets (2026-10-31)

- Verify eight mode cards on the Practice setup route and confirm disabled Level Up / Mock until actual course-level reviewed difficulty and exclusive reserved form.
- Quick 10: 10 questions, untimed, per-question answer feedback. Timed Quiz: 25 questions, 1200-second total timer, delayed answer feedback. Domain picker: 25 selected-domain questions with no crossover.
- Missed Questions and Weakest Subject only use real latest attempt for same selected course; when there are no wrong answers these cards must be disabled (never fallback to unrelated entire bank). Build Your Own retains learner-selected count/timer/pool/domain inputs; Admin Assessment stays fixed.
- Run \`npm run test:practice-modes\`, real Chromium desktop/mobile test \`scripts/test-practice-modes-browser.mjs\`, P1/Postgres, old ASP bank/test/calculator/learning and bundle build. Treat PSEE and other unclassified demo courses as lacking protected full-feature quiz metadata.


## P70 fullscreen-only Lesson video acceptance (2026-11-12)

- Run `npm run test:p19:media`, `npm run test:p61`, `npm run test:p67`, `npm run test:p69`, `npm run test:p70`, `npm run test:p23:lesson` and production build.
- On actual desktop Chrome/Edge and Android Chrome, click **Play in fullscreen**. Confirm wrapper fullscreen entry BEFORE video playback and no inline native controls, while watermark remains visible.
- Close with ESC/browser control: video pauses, source is removed, player is black, no auto-restart on focus or token refresh. Select Return to lesson, then Play to resume position only while fullscreen.
- Deny fullscreen permission or use a browser without the wrapper Fullscreen API: playback fails closed with accessible user explanation, not inline fallback.
- Confirm PDF iframe, links, Lesson Quiz, watched 90% coverage, Course hierarchy, subscription/Intro gates, React error handling and mobile responsive UI unchanged.
- Explicit physical iPhone Safari/Android Chromium/desktop QA is required; native fullscreen and screenshot prevention cannot be established from Node assertions or CI alone.


## P73 Fullscreen Mock capture-deterrence acceptance (2026-11-12)

1. In an authorized, expendable **nonproduction** attempt, click Start Mock; confirm the server-granted 200/300 attempt opens only after fullscreen succeeds and all question controls remain operable.
2. In fullscreen on desktop Chrome/Edge, dispatch a genuine keyboard PrintScreen or browser-delivered screen capture shortcut. If the browser delivers the event, verify the **whole** exam (including timer, nav, question, flags) becomes a solid black cover immediately, persists past the former 1.25s hold, and can only be manually revealed via Resume exam while still in fullscreen.
3. Confirm clipboard/print blocking and learner/session watermark still apply to the whole active exam. On tab hide, fullscreen loss, route exit, confirm the server abandon workflow remains intact and the full exam stays hidden during cleanup.
4. Check real Windows, Android and iOS screenshot/recording behavior without claiming all native captures are detectable; use external screen recorder as a **negative guarantee** test. No browser-only technique can reliably black independent OS-native screenshots or a separate screen recorder.
5. Confirm P67 Lesson surface, standalone Practice question protection and P72 Mock setup/button remain unchanged. Run `npm run test:p67`, `npm run test:p71`, `npm run build` and the existing CI validation group before promoting.


## P74 owner capture reproduction / acceptance blocker (2026-11-12)

**Acceptance is FAIL for native Windows/phone screenshots and arbitrary OS screen recorders.** Fullscreen does not establish DRM. Automated Chromium fixture tested capture without DOM key events (visible), Ctrl+Shift+6 keyboard event delivered to page (black after event), then capture after a fresh entry without DOM key event (visible). These results do not constitute live LMS authentication/media validation. Under the current ordinary browser and zero-install requirement, no trustworthy end-to-end assertion can guarantee native black captures. Preserve this as an explicitly unresolved requirement.

Limited regression: P67 recognizes owner-reported browser-delivered Ctrl+Shift+6 even when keyboard layout emits `key='^',code='Digit6'`, excludes unmodified `6`, and recognizes that no DOM event cannot be handled; P71 verifies the full exam wrap is present and pre-paint listeners attach on each mount. Existing P73 fullscreen and server abandonment rules must not regress. Hardware/device tests should separately cover initial and re-entered Mock and always report native capture outcome rather than inferred protection success.


## P75 — parity with working Lesson Video browser blackout (2026-11-12)

- With a nonproduction, expendable Mock attempt (200 Question Bank entries), verify Start enters fullscreen and the entire active Mock can be used normally before any capture.
- Trigger actual browser-delivered keyboard capture/save/print shortcut; content wrapper immediately gets `data-media-shielded=true`, all prompt/option/timer/nav React content unmounts and pre-mounted dark curtain persists through focus regain. The screen is legible again only after `Resume exam` while in original fullscreen. This is browser blackout on detected events, **not evidence that an OS screenshot was blocked**.
- Leave fullscreen or hide tab: existing `useQuestionFullscreenGuard` closes server attempt; confirm no stale exam content appears after restoring/reentering.
- Real Windows PrintScreen, Win+Shift+S and independent recording must be tested separately; if the browser receives no event, content can still be captured. Compare video and Mock on same hardware, noting difference between a decoded video surface and HTML text.
- Verify P67 Lesson protection, P71 Course Mock fixed 200/300 and autosave/grading, P72 premium setup, accessibility/mobile and CI/Build. Never create a production Mock attempt to run QA.


## P76 active Mock Exam compact premium workbench (2026-11-12)

- Run existing `npm run test:p71`, P67 protected-content regression, Production Build and disposable PostgreSQL gate. No live learner/mock attempt is created for UI tests.
- In desktop Chrome/Edge fullscreen at >=1280px, confirm question and answers occupy the large left column; 200 numbered question links stay in the sticky right sidebar's internal scroll area, not below the question. All 200 IDs are navigable, right progress/legend reflect actual answer/flag status, and the separate Submit Mock Exam CTA confirms before server submit.
- Test Previous and Next on first and last question, flag/unflag (amber indicator), clear selected answer, pending RPC busy/disabled states, focus/keyboard traversal, long prompt/option text and no horizontal overflow.
- On phones/tablets 390px/430px/<=960px, the picker moves below the question and stays compact/collapsed until Jump to question, closes after selection, and action buttons remain tappable. Verify no timer reset, no accidental submit, and returning from the right-side picker preserves viewport and saved choices.
- Confirm P73-P75 full-exam capture deterrence and forced fullscreen wrapper are unchanged; screenshot-black guarantee is still **not met** in ordinary browser.


## P77 Excel Bank import → Practice tests (2026-11-12)

- Source-only migration, read-only live ledger/function preflight, then disposable PostgreSQL. New valid rows become Active + Approved non-Mock, repeat import is idempotent, and learners/anon cannot call Admin import or activation. Wrong Domain/answer indices fail without partial import.
- Server Practice reads only approved active non-Mock rows. Stage a previously unused Approved row for Mock: it becomes Draft Mock-only; then unmark unused Mock to restore Approved Practice. An already-served Practice question or Lesson-linked item must not enter Mock; already-served Mock must not return to Practice.
- Old file-imported Drafts: count-only preview, explicit Admin confirmation and expected count, no auto business-row changes on install or page load. Verify counted activation and Audit, excluding 200 Mock questions and historic snapshots. Confirm P71 fixed 200/300 and Level Up tier gate.
- Regression suite groups P77 static with existing P28, disposable PG after P44, then production build. Production migration and live 2,300-row activation require separate authorization/verification; never run disposable tests against live Supabase.
