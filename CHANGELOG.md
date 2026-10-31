### 2026-10-31 — Practice quick-select modes (v1.1.11)

- Added original Technica light-theme quick mode grid referencing previously supplied Pocket Prep conceptual screenshots: Quick 10, Timed Quiz, Practice by Domain, Weakest Subject, Missed Questions, Build Your Own, Level Up and Mock Exam.
- Working modes: Quick 10 (10 untimed, immediate feedback), Timed Quiz (25, whole-test 20 minutes), Practice by Domain (inline course-domain choice), Weakest Subject (from latest scored attempt), Missed Questions (actual wrong bank IDs from latest attempt), and Build Your Own (original editable setup).
- Level Up intentionally marked Coming later until vetted LOW/MEDIUM/HIGH difficulty metadata exists. The distinct 200-question/5-hour mock remains unavailable until the admin-reserved pool is ready. No false ordinary assessment/mock launches.
- Practice selection functions and labels centralized; session records mode while preserving saved Custom setup, scoring, calculator, watermarks and all fixed admin Assessment rules.
- Added deterministic policy/selection tests and end-to-end Chromium desktop/mobile quick mode tests; no DB migrations or Cloudflare deployment.

### 2026-10-31 — Mobile calculator soft keyboard focus regression (v1.1.10)

- Preserve desktop exam focus-loss black shield and existing screenshot-key heuristics.
- Fix mobile false blackouts when opening the software keyboard, dismissing it or minimizing/restoring the calculator: ignore \`window.blur\` alone on touch/mobile; use actual page visibility for background privacy instead.
- Restore any stale shield when the mobile VisualViewport resizes while the page remains visible. No changes to calculator UI, calculations, quiz scores, copy/print, or learner watermarks.
- Add real desktop and 375/390/430 mobile Chromium regression for keyboard focus, blur and resize, calculator minimize/restore, desktop black screenshot when focus lost and mobile hidden-tab masking. Native phone screenshots remain uncontrolled by JavaScript.

### 2026-10-31 — Screenshot focus-loss privacy experiment (v1.1.9, PR #18)

- Pre-mount and synchronously toggle the black privacy overlay on best-effort capture keyboard keydown/keyup, reducing React rerender latency.
- Blackout only active quiz/assessment question screens when browser loses focus or becomes hidden; clear on focus/pageshow/return pointer. Exclude external video players from focus-based blackout to avoid playback interruption.
- Added physical browser screenshot-under-overlay tests and restored-state checks. These validate the CONDITIONAL overlay only, **not** real native screenshot detection or OS screen-record prevention.
- Existing verified clipboard and print behavior unchanged. No Supabase/Cloudflare deployment.

### 2026-10-31 — Actual-use security pilot debugging (v1.1.8, PR #17)

- Fixed a clipboard event-target hole: native Ctrl+C can target document/body even when text selected inside question; now checks Selection ranges in capture phase and preserves unprotected input copy.
- Strengthened browser printing behavior to remove protected React root from printed output instead of only using visibility and pseudo-content; screen stays normal outside Print Preview.
- Added low-opacity Technica learner/session stamp directly over embedded YouTube player without blocking playback controls.
- Upgraded QA from hand-dispatched synthetic copy events to Playwright real Ctrl+C and clipboard readback, plus print media and YouTube overlay checks.
- **Not achieved:** blocking actual OS screenshot/recording, turning YouTube into DRM media, stopping DevTools/media URLs or proprietary print CSS bypasses. Never present those as PASS.

### 2026-10-31 — Web-only learner content protection pilot (v1.1.7)

- Added faint session watermark to practice/assessment questions, learning video/materials, lesson quizzes and post-exam answers.
- Scoped selection/copy/cut/context menu/drag prevention to protected content, leaving calculator inputs and normal site functions usable.
- Added a brief black privacy curtain triggered on best-effort keyboard capture shortcuts (PrintScreen etc.), plus dark print-view CSS. No universal screenshot or screen-recording control is implied.
- Added independent static and Chromium desktop/mobile tests for copy/print, synthetic PrintScreen, watermark and quiz controls.
- Current demo still exposes 1,625 ASP questions and answers in the frontend plus a public YouTube/PDF; this is *not* production content security. Server-based question delivery and future DRM are separate stages.

### 2026-10-31 — Calculator unified 3D blue casing and clean LCD (v1.1.6)

- Removed bright white side strips, replacing them with smooth blue molded edges and darker 3D inset shadows. Retained original physical keypad and rounded 384px body.
- Removed always-on a/b, mixed, root, nth-root, power, eˣ, 10ˣ and X slot shortcut row from the LCD. The LCD now focuses on mode/status, editable expression, recent calculation and result.
- Moved all template actions into TOOLS → Math templates (including Remove slot). The nested editor ref, keyboard shortcuts, existing calculations and Classic input behavior remain available.
- Added source and real Chromium assertions for clean display, TOOLS insertion and calculation, blue casing without white strips, visible main keypad and quiz answer/navigation on mobile.
- No database, scores, timer, question bank, Cloudflare deployment or TI brand/firmware changes.

### 2026-10-31 — Calculator screenshot-based visual polish (v1.1.5)

- Slightly increased physical calculator width on desktop from 354px to 384px, maintained no-scroll keypad and narrow mobile viewport fit.
- Refined silver beveled frame and rounded bottom casing, deeper blue shell and LCD bezel, softer LCD green, tactile key borders and shadows.
- Improved contrast between blue scientific, white numeric, dark arithmetic, yellow-green 2nd and small alternate-function legends. All original 35 main + 6 upper key positions unchanged.
- Extended Chromium layout/contrast assertions with desktop and 375/390/430px phone screenshot artifacts; no changes to quiz logic, timers, scientific calculation, Supabase or learning flow.

### 2026-10-31 — Calculator physical keypad from user reference

- Replaced the old generic 5x9 scientific key grid and permanently visible 8-tab menu with a compact physical-style 5-column/7-row photo-referenced layout (35 main keys + 6 upper controls + circular arrow pad). Upper second labels, white numbers, dark arithmetic and Technica-branded blue shell visually preserve reference groupings without third-party TI assets.
- All existing scientific computation, Math templates, numeric precision, statistics, 1Var/2Var, lists, memory and K remain available through physical keys and contextual menus. Navigation arrows now interact with math template fields.
- Main keypad never scrolls on approved viewports; long Data and Table menus alone may scroll. Added photo-specific layout, real browser no-scroll/visibility checks and retained all quiz/assessment regression gates.
- Original TI logos, firmware and device-level parity claims are not included. No Supabase or Cloudflare deployment.

### 2026-10-31 — TI-30XS MultiView audit, guidebook vectors and real browser QA

- Audited original Technica scientific calculator against official manufacturer function, error, numeric mode, probability and list documentation; created detailed [audit report](docs/current/TI30XS_CALCULATOR_AUDIT_20261031.md) with tested/partial/missing parity for each major feature.
- Fixed incorrect factorial upper bound (70–170 rejected), FRQ >99 domain, TI-style K syntax with 44-character limit, list formula reference/length mismatch and automatic closing parentheses on calculator ENTER.
- Added independently seeded random input and a reproducible generator. Important: it does not mimic the original TI PRNG algorithm.
- New \`scripts/audit-ti30xs-reference.mjs\` is part of the standard CI, alongside earlier calculator/ASP/SQL/build suites.
- Replaced source-only UI assumptions with a separate real Chromium browser pipeline: practice, assessment and learning quiz; desktop 1440px drag & keyboard; mobile 375/390/430px touch, calculator keypad, fraction, quiz answer selection/navigation and browser exceptions.
- Audit found and reproduced a **real mobile answer-click blocker**; repaired the mobile split with in-flow scrollable question pane and bounded calculator, pending newest browser CI proof.
- This is source-level functionality validation, NOT TI hardware/firmware certification, Safari-device acceptance or a published Cloudflare deployment.

### 2026-10-31 — Nested math entry, precision, lists and menus (PR #11)

- Added interactive Math-style expression entry templates (up to 4 levels of fraction, mixed fraction, square/n-th root, power, e-power and 10-power) with keyboard and pointer navigation/edit/remove. Existing Classic text input remains available.
- Added bounded BigInt exact rational calculation to avoid binary floating-point drift for fraction/finite-decimal formulas, 10-significant-digit display, FIX and SCI/ENG presentation.
- Corrected Classic vs Textbook power associativity: 2^3^2 -> 64 vs 512.
- Added dependent L1/L2/L3 formula recalculation and cycle detection, CLEAR/FORMULA menu actions and confirm-before-full-reset. Preserved 42-element limit.
- Added \`npm run test:calculator:mathprint\` and CI gate for nested editor model, rational precision and list behavior. Existing ASP questions, quizzes, timer, learning, routes, authentication demo and Supabase schema unchanged.
- The original Technica UI does not copy TI firmware. This is not officially certified/fully screen-equivalent to MathPrint; specific symbolic combinations and real-device/menu behavior require independent comparative/manual QA.

## 2026-10-31 — Calculator: advanced TI-style functions (source PR #10)

- Added textbook-style exact fraction, simplified integer-root and π-multiple display where mathematically supported, plus approximate toggle, CLASSIC/Textbook, FIX 0–9 and percent display.
- Added seven stored calculator variables, data lists L1/L2/L3 and safe formulas, weighted statistics and quartile/regression outputs.
- Added angle units, DMS, rectangular/polar coordinate conversions, Ask-x table and repeated K operations; repaired signed odd-root handling.
- Added independent math/UI regression script to CI. Existing quiz/assessment/learning scoring, timers, routes, original ASP/PSEE question banks and database have not changed.
- Calculations and UI are original Technica work, not TI proprietary firmware/brand or a pixel-exact licensed emulator. Browser/mobile manual acceptance and device/model output-parity matrix remain outstanding.
- No claims of real Supabase deployment or finished 200-question production Mock.

### 2026-10-31 — Floating scientific calculator in quiz and assessment routes

- New reusable \`ScientificCalculator\` React component with floating desktop window, draggable header, close/minimize, and compact mobile dock. The question and answer controls remain available while it is open.
- Added a dedicated safe scientific engine for standard and advanced operations, angle modes, fraction/decimal conversion, scientific notation, memory, history, 1-/2-variable statistics and a function table.
- Available in Practice, Assessment and the Learning Player 10-question Knowledge Check. No changes to existing bank answers, timer, grading, navigation, user scope, or database.
- Added \`npm run test:calculator\` into CI and a dedicated user guide. Existing imported 1,625 ASP questions and regression suite are preserved.
- TI-30XS MultiView image/model is functional inspiration only; this original Technica tool is not a branded/pixel-exact emulator. Exact model parity for specialized notation and fixed modes, manual browser/touch QA, and future 200-question Mock/Adaptive routes remain follow-up gates.
- Source implementation prepared under PR #9; confirm actual run result and merge status before claiming deployment to main.

### 2026-10-31 — Latest GitHub main source merge verified

- Integrated P0 + P1 through [PR #8](https://github.com/Minamilad162/Technica-LMS/pull/8) (merge `343a913`) after merging P0 [PR #6](https://github.com/Minamilad162/Technica-LMS/pull/6) (`e742d3b`). Prior P1 draft PR #7 closed as superseded.
- Combined PR run #57 and post-merge main run #58 both **PASS**, including npm ci, 1,625 ASP questions integrity, legacy regression suite, Vite build, vulnerability audit, disposable PostgreSQL 16 migration and access/RLS checks.
- **No live Supabase migration or runtime data switch:** browser-demo 1.15.0 remains the application; P1 server schema is source-only and must be applied only after a reviewed staging rollout.

### 2026-10-31 — P0/P1 integrated GitHub source release

- Combined P0 reproducible npm ci and P1 secure PostgreSQL foundation in one source release, preserving existing accepted React UI, imported ASP question bank and demo flows.
- Database migration SQL is NOT executed on any Supabase project. Browser-auth/paid-access/video/exam features are not production enabled. Real Supabase RLS and Auth staging verification remains mandatory.
- Previous GitHub Actions: P0 run #56 (main) SUCCESS, P1 run #55 (branch) SUCCESS. Integrated branch CI and main postmerge CI are separate release gates.

### 2026-10-30 — P1 disposable PostgreSQL security smoke (PR #7)

- Added \`scripts/test-p1-postgres-smoke.sh\` and a \`postgres:16\` ephemeral CI job which executes the real P1 migration and verifies RLS with mock anon/authenticated users and sample entitlements.
- GitHub Actions [run #52](https://github.com/Minamilad162/Technica-LMS/actions/runs/40980524294) verified **both jobs PASS**, including denied anonymous lesson access, course separation, paid/trial gates, expiry/revoke and suspended account. No live Supabase instance was used; final CI head should be checked again.
- This is only the first backend foundation slice. Production Auth, real Supabase JWT/Data API and Storage tests, frontend integration and 200/300 Mock are not implemented. Existing demo left intact.

### 2026-10-30 — P1 backend foundation draft (PR #7; no DB deployment)

- Added a review-only Supabase SQL migration for Course → Domain → Topic → Lesson hierarchy with strict foreign keys and refusal to overwrite legacy tables.
- Proposed trusted profile creation on Auth signup, scoped admin/content-author role assignments, published-content access gated by active trial/paid/manual entitlements, trial lesson allowlist and server-only media metadata/audit records.
- Applied explicit Data API grants and RLS policy declarations to all 11 proposed P1 tables. An old incompatible schema proposal is explicitly marked **do not deploy**.
- Added a static \`test:p1:schema\` and GitHub Actions gate; full pre-existing demo/ASP tests and Vite build were preserved.
- Added P1 staging migration/test/rollback runbook. **Static CI PASS does not establish PostgreSQL syntax correctness or live RLS security.** No database was accessed and no app/UX behavior changed.
- Updated TECHNICA_LMS_MASTER_BLUEPRINT.md; BUG-017/018/019 remain open until staged RLS/auth verification. Reproducible npm-ci lockfile remains separate Draft PR #6.

### 2026-10-30 — P0 build reproducibility (Draft PR #6, not merged)

- Verified existing \`main\` CI run #37 (2026-10-30, head \`274bcad\`): 1,625 original imported ASP questions, existing demo regression scripts, Vite build, dependency audit all PASS; that run used a warned \`npm install\` fallback.
- Generated \`package-lock.json\` using npm on GitHub Actions and committed it to feature branch \`chore/p0-reproducible-install-20261030\`. Changed CI to require \`npm ci --no-fund\`, and removed temporary diagnostic logging.
- CI run #41 (head \`4cbf887\`) passed \`npm ci\`, regression suite, build and audit with 0 known vulnerabilities found at the time of execution. The final PR head must pass too.
- Fixed BUG-013 **in draft PR**, not yet merged; TypeScript typecheck is still pending. No app code, design, imported data, Supabase schema, storage or deployed behavior was changed.
- Updated \`docs/current/P0_BASELINE_AUDIT_2026-10-30.md\` and the canonical \`TECHNICA_LMS_MASTER_BLUEPRINT.md\` with evidence and remaining blockers. P0 partially complete; production remains NO-GO.

### 2026-10-28 — Infrastructure verification and safeguard follow-up

- Verified 20 expected repository paths on main, including all three owner-supplied original document snapshots by expected text lengths.
- .gitignore now blocks all .env.* except .env.example; infrastructure check inspects Git-tracked secrets instead of rejecting ignored local developer secret files.
- No executed npm, browser, security audit, Supabase or Cloudflare deployment result claimed. Production gaps retained in Blueprint.

## 2026-10-28 — Infrastructure integration (documentation + CI, no application feature release)

- Archived the three original owner-provided infrastructure Markdown references under docs/infrastructure/source/; preserved the newer existing root UI_COMPONENT_REFERENCE_GUIDE.md rather than replacing it with an older reference.
- Added docs/infrastructure/README.md, project context, security plan, release checklist, test plan, audit playbook and LMS logic registry.
- Added GitHub Actions initial CI/security gate, weekly Dependabot proposals, and scripts/check-infrastructure.mjs. Updated AGENTS.md and .gitignore to enforce read-first governance and secret safety.
- Added SECURITY.md, DEPLOYMENT.md, DATABASE.md and recorded gaps in the canonical TECHNICA_LMS_MASTER_BLUEPRINT.md.
- **Known gaps:** v1.15 JavaScript demo has no committed package-lock.json nor TypeScript typecheck; CI uses an explicitly warned legacy npm install fallback until fixed. Passing CI does NOT imply production auth/RLS, payment, DRM or protected exam logic.
- **Verification:** files committed and retrieved via GitHub API; runtime npm tests/build/security audit, GitHub Actions run, Cloudflare smoke test and browser QA not performed in this documentation integration. No database migrations, app logic, or production settings changed.

---

## v1.14.0 — Simplified learner home and removed Saved questions

- Removed the redundant ASP five-domain panel from Home / My learning.
- Removed Saved from learner navigation and retired the /saved route.
- Removed bookmark actions from quizzes and review screens; kept Flag for review.
- Preserved admin-only course-based Question Bank and the original ASP bank.


## v1.12.0 — Admin-only course-first Question Bank (demo)
- Removed Question Bank from learner navigation; restricted the direct route and demo role switching to authenticated admin sessions.
- Added a dedicated local demo admin account for client previews.
- Added All courses / ASP Course / PSEE bank selector, preserving ASP's 1,625 imported questions.
- Added 12 explicitly marked fictional PSEE demonstration questions; PSEE remains Draft, unpublished to learners.
- New admin-created courses automatically appear in the question-bank course list.
- Linked Course Builder to its selected course's bank and kept Saved Questions available to learners.
- Added `test:admin-bank` regression suite and updated auth/course-authoring checks.

## v1.11.0 — Full course authoring for newly created courses

- Removed ASP-only module and lesson editor restriction; independent module stacks per course, with legacy ASP migration.
- Added lesson-linked PDF/video attachments in IndexedDB, direct upload and preview, and draft placeholders.
- Added in-builder course Details editing and dummy category dropdown.
- Added manual questions and real XLSX/CSV import with multiple sheets, row validation, duplicate handling and course isolation.
- Added dynamic learner practice and assessment support after publishing courses; fixed per-course admin assessment settings.
- Kept existing 1,625 ASP bank entries and UI styling intact.
- See `COURSE_AUTHORING_GUIDE_v1.11.md`.

## v1.10.1 — Create / Edit Course dialog layout fix (2026-10-26)

- Render course dialog via a React portal to document.body to avoid transformed page containers shifting/clipping fixed overlays.
- Keep course dialog title/close icon and Cancel/Create or Save footer continuously visible while the form has its own scroll area.
- Center and constrain the popup to desktop, mobile, short and zoomed-in viewports (`dvh` fallback included).
- Restore keyboard focus to the Create/Edit trigger after closing; support Escape, backdrop close, Tab focus containment and body scroll locking.
- Retain all existing form validation, draft/scheduled/publish flows, and course data model.
- Add targeted regression/source checks and a stand-alone height/scroll test fixture.

# v1.10.0 — Admin course management & learner profiles (26 Oct 2026)

- Remove ASP question bank coverage section from Overview, keeping the bank itself untouched.
- Add clickable admin Learner profiles with per-person demo progress and training details.
- Separate Courses (`/courses`) from Course Builder (`/builder`) and fix sidebar active states; remove Media library menu.
- Introduce course catalogue with Draft/Published/Scheduled, create/edit and schedule by browser-local time.
- Scope Course Builder's media materials and assessment selections to a chosen course.
- Add local PDF/video uploads via IndexedDB, show clear sample media without attached files.
- Preserve 1,625 ASP questions and the existing assessment/practice/review workflows.
- See ADMIN_COURSE_MANAGEMENT_v1.10.md for feature scope, limits and QA.

## v1.9.3 — Assessment review grouped by course (2026-10-26)
- Course accordion inside Assessment review; attempts and question explanations load inline per selected course and attempt.
- Save each completed assessment in learner-scoped assessment history instead of only keeping `lastResult`.
- Preserve old sample-user last assessment without populating fake historical results.
- Split immediate Practice results into `/practice/results`; Practice is not included in course assessment history.
- Course-specific actions: Practice this course, Retake assessment, Practice mistakes from selected attempt.
- No changes to imported ASP questions, PSEE Coming soon, assessment time/quantity, unlimited retakes or quiz unanswered-answer warnings.
- Responsive, keyboard, and reduced-motion styling in `src/reviewCourses.css`.

## v1.9.2 — Assessment CTA and final-review warning polish

- Removed ASP content/domain card on assessment overview; Start assessment now sits in a dedicated card to the left of Before you start on desktop.
- Removed the three-attempt limit and the max-attempts Admin setting; historical caps in localStorage are ignored.
- Question navigator unanswered warning markers appear only after learner explicitly selects Review and submit, not after each Next.
- All ASP question-bank content and admin-configured exam rules preserved.

# v1.9.0 — ASP Course / Practice versus Assessment

- ASP Course is the parent of 5 imported workbook domains (1,625 verified questions); PSEE is an empty upcoming course.
- Learner practice can choose ASP course domains, question count, timing (including custom total minutes), feedback and question pool.
- Learner assessment chooses a course only. Question count, duration, pass mark, covered domains and attempts are defined in Admin → Course Builder → Assessment.
- Old locally persisted learner assessment overrides no longer determine assessment questions or timer.
- Course names now appear in Home, selection, quiz and results; internal Domain 1–5 labels remain under ASP only.
- Added course-isolation/configuration regression tests. No change to the supplied question bank.
- See ASP_COURSE_ASSESSMENT_GUIDE.md. Browser-only demo, not secure production assessment.

---

## v1.5.1 — Technica Consult logo in navigation

- Added the supplied transparent Technica Consult logo next to **TECHNICA CONSULT LMS**.
- Updated the sidebar, desktop assessment/practice header, mobile top navigation, and mobile slide-out menu.
- Refined responsive sizing for compact laptop sidebars and narrow phone screens.
- Kept course images, 1,625-question ASP bank, test configuration, and all routes unchanged.

## v1.5.0 — Completely replaced image collection

- Replaced all 11 older image assets with distinct new industrial scenes at native 1536–1672 pixel width.
- Added matching smaller mobile WebP images; all 22 assets verified.
- Preserved existing `/images/*.webp` paths and 11 React image mappings.
- Updated `HDImage.jsx` responsive source widths and removed faded blend effects in banners and cards.
- Kept the original 1,625-question demo and all previous LMS pages and interactions.

## v1.4.0 — True HD image replacements (25 Oct 2026)

- Replaced 7 low-detail LMS photos with the newly generated high-resolution industrial photographs, maintaining the exact public image paths.
- Regenerated corresponding `-sm.webp` responsive variants from the new master images.
- Corrected `HDImage.jsx` source set pixel width descriptors to match real file widths.
- Kept the 4 approved image compositions for the dark hero, engineering image, practice with worker and HAZOP with people.
- No database, question-bank, design, workflow, or routing changes.

## v1.3.0 — HD assets and responsive image loading (2026-10-25)

- Improved all 11 photographic LMS assets without changing layouts or subjects.
- New locally hosted responsive image variants for desktop and mobile.
- Added optimized high-priority loading for the hero and lazy loading for secondary imagery.
- Continued to use the same 1,625-question ASP test bank and existing 50-question random selection workflow.

# CHANGELOG

## v1.2.0 — 50 random questions per selected domain (2026-10-24)
- Assessment now defaults to a single selected ASP domain and draws 50 random, unique questions from that domain’s question bank per attempt.
- Retained optional All 5 Domains balanced mode (50 = 10 questions from each).
- Assessment customization: 10, 25, 50, custom 1–50; timing; feedback; All/Unseen/Past Mistakes pools.
- Practice defaults to 50 with all prior customization features preserved.
- Home ASP domain cards open the associated domain assessment setup.
- Added isolated sample engine + automated no-duplicates / randomness / domain isolation tests.
- Correct answers, options and explanations remain unchanged in the Excel-derived JSON; no Supabase connection added.
- Build remains unverified due to npm Registry access; static JSX parse validation and standalone Node tests passed.

# Changelog

## v1.1.0 — ASP 5-Domain question bank integration (2026-10-24)

- Preserved all 7 approved UI/UX screens in React, including mobile responsiveness.
- Extracted first 5 worksheets from the client ASP Excel file: 1,625 verified questions.
- Retained original 4 options, correct answer, explanation, and domain per question.
- Added random unique sampling, question-domain filtering, practice error review, and unseen tracking.
- Assessment draws 10 questions per domain (50 total) and scores against Excel answers.
- Added browsable question-bank page with domain filter, search, answer and explanation expand, and pagination.
- Added domain shortcut cards on Home and imported question counts on Analytics.
- No Supabase database or authentication is required for demo; state is localStorage only.
- Offline bank integrity checks pass; production build/browser QA pending npm dependency installation.

## v1.0.0 — Initial 7-screen LMS UI demo

- React/Vite responsive learner/admin UI and simulated workflows.

## v1.8.0 — Staggered content entrances (2026-10-26)
- Redesigned entrance choreography for learner, practice, assessment, results, library and administration routes.
- Added route-specific ordered motion plans and guarded dynamic content reveals; preserved all existing colors and UI layouts.
- Added nonblocking question-to-question content transitions and gentle score panel emphasis.
- Respected reduced-motion, capped animation delays, improved mobile choreography and avoided extra runtime dependencies.
- Included `PAGE_ENTRANCE_ANIMATION_GUIDE.md` and `npm run test:motion` regression checks.

## v1.9.1 — Unanswered question warning
- Separate visited-and-skipped from not-yet-seen questions in the Question navigator.
- Highlight unanswered question numbers with visible alert markers in both Practice and Assessment.
- When learner requests submission at the final question, show missing-answer count and quick links before allowing explicit blank submission.
- Simplify Assessment overview by removing the redundant read-only configuration card; retain fixed admin settings and summary tiles.
- Add `test:quiz-navigation` regression coverage.


## v1.13.0 — Video/PDF-only lessons
- Restrict course-builder lesson types to Video and PDF; remove manually-entered duration and module total duration.
- Detect video runtime from attached media metadata when supported; PDF has no time.
- Retain existing legacy lesson data and keep assessment timer settings unchanged.

## v1.15.0 — Learner Learning Player
- My Learning now displays a dedicated Process Safety Essentials demo course, instead of a practice-only course landing page.
- Added a responsive learning player with modules, Video/PDF lessons, explanatory text, multiple industrial visuals, local per-account progress, and completion actions.
- Linked a CSB public safety video with an external fallback; produced a two-page original quick-reference PDF.
- Added original 10-question end-of-course self-check (pass >= 70%, explanations, retries). ASP and PSEE question banks are unchanged.
- New `test:learning`, dedicated responsive motion styles, and entrance motion plan. No new runtime dependencies.
