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
