# v1.12.0 — Admin-only Course Question Bank (Demo)

## What changed

- Question Bank is removed from the normal Learner sidebar and mobile More navigation.
- `/#/question-bank` is protected by the demo admin-session and current workspace-role gate. An ordinary learner is redirected to Home.
- Removed the ordinary user's ability to promote their account to the Admin workspace via the account switcher.
- Added a separate local-only **admin demo login** (`TC9001` / `AdminDemo@1234`), while preserving existing learner demo credentials (`TC1001` / `Demo@1234`). Login and sign-up accounts still live in this browser.
- Question Bank is organized by **All courses / ASP Course / PSEE** rather than domain tabs. Newly created courses automatically show up.
- ASP still contains exactly **1,625 imported questions across 5 internal domains**; the workbook and distribution have not changed.
- PSEE has **12 fictitious, visibly tagged demo sample questions** with answer/explanation examples. PSEE remains **Draft**, with the assessment disabled; these questions are for client UI demonstration, **not validated educational exam content**.
- Course Builder's Question tab now links to the selected course's question bank, including PSEE.
- Saved Questions stays a separate learner-accessible screen.

## How to demo

1. Sign in as `TC9001` / `AdminDemo@1234` or click **Login as Admin**.
2. Open **Question Bank** from the Admin sidebar. Select ASP, PSEE or All courses.
3. Expand a question to inspect answer/explanation; PSEE questions carry **Demo sample** and an explanation of sample provenance.
4. Open **Course Builder**, choose a course, add/import questions, then return to its Question Bank.
5. Sign out and sign in as `TC1001` / `Demo@1234`. The Question Bank item is absent and its direct URL redirects to `/home`.

## Important security boundary

This is an **offline/browser-local demonstration**. React route guards, local `sessionStorage` identities and UI restrictions **are not server security**. Question data is bundled with frontend code. Before live deployment, use Supabase Auth with verified admin roles and RLS-backed API access, and serve protected question data from authorized backend routes rather than publicly bundled files.

## Verification

- Source and Node tests: original ASP count 1,625 and domain distribution unchanged, PSEE sample bank count 12, custom course isolation, user/admin route/menu, login, quiz logic and learner progress, course authoring.
- Syntax parse: 47 JS / JSX / MJS files via TypeScript parser.
- A browser-rendered production build was not available in this execution environment because the React/Vite npm dependencies were not installed.
