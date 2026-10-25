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
