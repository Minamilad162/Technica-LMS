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
