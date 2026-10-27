## v1.10.0 Admin Courses Update

**New:** distinct Courses admin page, draft/scheduled/published course management, clickable learner profiles, and per-course PDF/video demo uploads. See `ADMIN_COURSE_MANAGEMENT_v1.10.md`. All edits/files remain **local-browser demo data**; publication schedules do not run on a hosted background server.


### v1.9.3 — Assessment review by course
The learner Review page now opens completed assessment courses inline, with all their past attempts, answer explanations, Practice again and Retake assessment actions. Practice submissions keep their separate immediate results route and do not enter assessment history. Demo results are stored locally per account; the production database is not connected. See `ASSESSMENT_REVIEW_BY_COURSE_v1.9.3.md`.

# Latest: v1.9.0 — Course-first ASP Practice & Assessment

- **ASP Course** contains Domain 1–5 and all 1,625 imported questions; **PSEE** is shown without any questions.
- **Practice** is customizable (domain selection, 1–50 questions, timer, feedback, pool).
- **Assessment** lets learners choose a course only; all other parameters are set in the **Admin workspace → Course Builder → Assessment**.
- The source of truth for this demo remains browser-local. Before production, server-side auth and exam-rule enforcement are required.
- Implementation & test instructions: [ASP_COURSE_ASSESSMENT_GUIDE.md](./ASP_COURSE_ASSESSMENT_GUIDE.md).

---

> **v1.6.1 demo login fix:** On the Login screen choose **Login with Demo Account** to log in directly as `TC1001`. Typing `TC1001` / `Demo@1234` still works. If a hosted version still shows the old error, redeploy this version and hard-refresh the browser.

# Update v1.6.0 — Auth UI

See [AUTH_DEMO_GUIDE.md](AUTH_DEMO_GUIDE.md) for Login / Sign Up, routes, credentials, tests and security limitations.

> **v1.5.0:** All 11 site photos replaced with new clear, topic-specific scenes. See `HD_IMAGE_REPLACEMENT_v1.5.md`.

**v1.4.0:** 7 new real HD replacement WebP photographs; original `public/images` paths retained, responsive smaller variants corrected. Details: [HD_IMAGE_REPLACEMENT_GUIDE.md](HD_IMAGE_REPLACEMENT_GUIDE.md).

**v1.3.0 HD imagery update:** All 11 LMS photographs have higher-resolution local WebP assets and responsive mobile versions, preserving the existing layout and subjects. See [IMAGE_QUALITY_UPGRADE.md](IMAGE_QUALITY_UPGRADE.md).

# TECHNICA CONSULT — LMS Interactive Client Demo

Version **v1.4.0 — ASP 5 Domains / 50 Random Questions Per Domain**. A responsive **React 19 + Vite** learning management system prototype created from the seven supplied TECHNICA CONSULT UI/UX reference images. It uses sample data, local persistence, and local images so that the client can explore a realistic end-to-end learner + administrator workflow **without creating a database**.

## Run locally

**Requirements:** Node.js 20.19+ or 22.12+ and internet access when installing dependencies for the first time.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). For a deployable static build:

```bash
npm run build
npm run preview
```

> This archive includes editable **source code** and design references, not a built `dist/` folder or `node_modules/`. The source was statically checked for JSX syntax; package installation / production build could **not** be run in the authoring environment because the npm registry was unreachable. Please run `npm install && npm run build` in your development or CI environment before publication.

## What's included

| Ref | Screen | Main routes | Interactive behavior |
| --- | --- | --- | --- |
| 01 | Your learning workspace | `#/home`, `#/my-learning` | Course/domain filters, continue lesson, review mistakes, learning progress cards, mobile search |
| 02 | Build your practice | `#/practice`, `#/practice/session` | ASP domains 1–5 selection, number of questions, timer mode, feedback, question bank selection, live practice |
| 03 | Learning analytics | `#/analytics`, `#/learners` | Date/course filters on sample chart/statistics, learner search, status filter, pagination, CSV export |
| 04 | Course builder | `#/builder`, `#/question-bank` | Add/rename/delete modules, add/edit/delete/reorder lessons, add questions, course detail editing, publication toggle |
| 05 | Assessment overview | `#/assessments` | Instructions, syllabus, agreement checkbox, begin assessment |
| 06 | Assessment in progress | `#/assessments/take` | Answer options, question navigation, flags, saved questions, timer, autosave in local storage, submit confirmation |
| 07 | Results and answer review | `#/results` | Score, pass/fail, filter by wrong/unanswered/flagged, explanations, references, retry incorrect answers |

### Explore the full workflow

1. Start at **Home**. Use the domain tabs, course cards, or **Continue lesson**.
2. Open **Practice**, select at least one topic and use **Start practice**. Move through questions, flag/bookmark items, then **Review and submit**.
3. Open **Assessments**, accept the instructions and start a timed assessment. Submit to inspect the detailed results.
4. In **Results**, choose incorrect answers and use **Practise mistakes**.
5. In the top-right **profile menu**, switch from **Learner workspace** to **Admin workspace**.
6. Visit **Overview** and **Course Builder**. Make a lesson or add a question. Refresh the page and see changes persist.
7. From the profile menu, choose **Reset demo data** to restore the original demonstration state.

Demo user: **Alex Morgan**. No sign-in, email, password, test account or Supabase credentials are required.

## Mobile and desktop

Desktop uses a left navigation rail, top search/header and multi-column data surfaces. Mobile switches to an app-style compact header, four primary navigation shortcuts plus **More**, swipeable course cards, stacked analytics, responsive course builder and a full-screen assessment experience. A mobile question navigation drawer is available during assessments. Layout breakpoints include 1200px, 900px and 700px.

Reference screenshots are preserved under `design-reference/`. The local illustrative photos under `public/images/` were prepared from the images supplied for this demo. Source typography uses Inter/DM Sans when accessible, with system font fallback.

## Demo data and limitations

- Users, courses, learner activity charts and initial example results are illustrative. **All 1,625 imported ASP questions are directly sourced from the uploaded Excel workbook.**
- The demo assessment defaults to **50 random unique questions exclusively from the chosen domain**. The optional All Domains setting distributes 50 questions evenly (10 per domain). Real attempts are scored against the exact answer indices from Excel; no question is repeated within a session. This remains a demo, not a professionally verified/certified examination.
- The initial Results screen contains a prefilled sample result using authentic imported questions so the client can explore it even without completing an assessment.
- Changes to modules, lessons, course details, added questions, bookmarks, role choice, practice settings, answers and results use `localStorage` in this browser (`technica-lms-demo-v1-asp5`). They do **not** sync across devices.
- The original XLSX is preserved in `source-excel/`, while its first five worksheets are already integrated as JSON. Manual upload controls are **selection previews only**. They do not upload PDF/Excel files or parse Excel rows.
- The publisher toggle and administrator mode are simulated; there is no real authentication or server-side permission control in the demo.
- Export CSV downloads illustrative learner data from the browser.
- There are no real emails, subscriptions, payments, certificates, video lessons, analytics events or background jobs.
- The demo does not contact Supabase, and changing an environment variable alone will not activate the production database adapter. Domain categories are labelled Domain 1–5 because the workbook sheet names contain only those labels; domain names were not inferred from question content.

## Source structure

```text
technica-lms-demo/
├─ design-reference/           # Seven original UI/UX screenshots
├─ public/images/             # Local optimized visual assets
├─ src/
│  ├─ components/              # Navigation shell, buttons, modal, toast, progress
│  ├─ data/mock.js             # All demo courses, topics, learners and questions
│  ├─ lib/store.jsx            # React state and persistent demo interactions
│  ├─ lib/supabase.js          # Reserved future client initialization
│  ├─ pages/                  # Seven screens + supporting learner/question pages
│  ├─ App.jsx                 # React Router paths
│  └─ styles.css              # Desktop/mobile responsive design system
├─ supabase/                  # PROPOSED future schema and integration plan
├─ .env.example
├─ package.json
└─ vite.config.js
```

## Supabase and production roadmap

The future integration point is documented in [`supabase/README.md`](supabase/README.md). The proposed schema in `supabase/001_lms_schema_PROPOSED.sql` includes courses, modules, lessons, topics, question bank, profiles, enrollments and assessment attempts, plus explicit database GRANT and RLS policies. It is **not deployed**, **not connected**, and requires adaptation/security tests before use.

Do not ship correct answers to learners in real assessments; use authenticated server-side question delivery and marking (e.g. Supabase Edge Functions). Do not embed a Supabase `service_role` key in frontend environment variables.

## Deploy to Cloudflare Pages

1. Create a GitHub repository and commit the **project source** (not the parent archive folder).
2. Connect the repository to Cloudflare Pages.
3. Build command: `npm run build`; build output directory: `dist`; Node runtime: Node 22 recommended.
4. The app uses `HashRouter` (`/#/home`, `/#/practice`, etc.), so deep navigation does not need custom server-side rewrite rules.
5. No environment variables or Supabase keys are needed for the demo build.

## Visual QA checklist

- [ ] Home, Practice, Analytics, Course Builder, Assessment Overview, Assessment In Progress and Results render on desktop.
- [ ] Mobile screens look correct at 375×812, 390×844 and 430×932 without horizontal body scroll.
- [ ] Side navigation and mobile bottom navigation lead to the correct screens.
- [ ] Topic cards and practice options visually respond to selection.
- [ ] Assessment question navigation, answer selection, flags, timer and autosave work.
- [ ] Submit assessment shows a new Results summary, including explanations.
- [ ] Create/edit lesson and question, refresh, and verify demo data persists.
- [ ] Switch workspace to admin and back; try CSV export and reset demo data.

**Status:** Interactive client demo with future backend scaffolding; **not** production LMS software.

## ASP Excel import (v1.1.0 onward)

The uploaded `ASP_Question_Bank_2500_Simplified.xlsx` has nine worksheets. **Only the first five are active in the demo**, per the requested scope:

| Category | Questions | Original worksheet |
|---|---:|---|
| Domain 1 | 250 | Domain 1 |
| Domain 2 | 625 | Domain 2 |
| Domain 3 | 200 | Domain 3 |
| Domain 4 | 300 | Domain 4 |
| Domain 5 | 250 | Domain 5 |
| **Total** | **1,625** | |

Each question retains **source question text, 4 multiple-choice options, correct answer, explanation, worksheet and source row identity**. No duplicate/placeholder questions were added to the imported bank. The following have been updated:

- **Practice:** choose one or multiple domains, 10/25/50/custom questions, random sampling without duplication, unseen pool and retry incorrect questions.
- **Assessment:** 50 randomly sampled non-duplicate questions from ONE selected domain by default; optionally select All 5 Domains for a balanced 10-each mix. Customize 10/25/50/1–50 questions, timing, feedback and question pool.
- **Results:** explanations and correct choices come from the uploaded workbook. Save/retry uses stable IDs like `D2-0142`.
- **Question Bank:** domain chips, question-and-answer search, 20-row pages, expandable answer+explanation and bookmarks.
- **Home / Analytics / Course Builder:** show imported domain totals and question bank access, while retaining the original seven-screen styling.

Quality checks: `npm run verify:bank` validates counts, stable IDs, all four options, correct answer index and nonempty explanations. `npm run check` verifies project/reference files. Browser rendering and `npm run build` still need to be tested in an environment that can install npm dependencies; the authoring environment could not reach npm. **The frontend stores answer keys in JSON locally for the demo only: production assessments must use secure server-side grading.**

## v1.2 — domain-specific randomized test flow

1. Open **Assessments** and choose **Domain 1–5** (the initial selection is Domain 1). The default is 50 questions randomly sampled without replacement from that domain's imported Excel bank; question text, answer key and explanation remain unchanged.
2. To recreate the earlier cross-domain assessment, choose **All 5 domains**, which draws 10 from each bank when 50 is selected.
3. Use **10 / 25 / 50 / Custom** to change the assessment length (Custom 1–50) and expand **More options** for Untimed/Whole test/Per question, answer feedback and All/Unseen/Past mistakes pools. The separate Practice screen preserves the same controls, now defaulting to 50.
4. Every new attempt draws a new randomized sample. Duplicate bank IDs cannot occur within an attempt. Random overlap across distinct attempts is permitted.
5. Domain cards on Home lead directly to the relevant Assessment setup. Practice remains in navigation.

Run `npm run test:selection` to verify 50 questions from each domain, no repetitions, varied retakes, All 5 balanced selection, Custom sizes and Unseen/Mistakes pools. All tests are pure Node.js and do not require npm installation.

**Build caveat:** The source files were JSX-parse-checked, and pure JavaScript / question-bank tests passed; a Vite build and browser interaction test remain unverified because npm Registry connectivity was unavailable in the authoring environment.

### Branding update (v1.5.1)
The supplied official logo is stored at `public/images/technica-logo.webp` and displayed by `src/components/Layout.jsx` in navigation and quiz headers. This is a frontend-only change.


## v1.7.0 Motion polish
See `UI_COMPONENT_REFERENCE_GUIDE.md` and `MOTION_IMPLEMENTATION.md`. Motion is implemented through `src/motion.css` and `src/components/MotionSystem.jsx` with reduced-motion support.

## v1.8.0 — Progressive page introductions

The LMS now choreographs entrance animations **per page**: headings, hero panels, cards, charts, course modules, question lists and form fields appear in a deliberate order on navigation and scrolling. A restrained question transition is included while timer controls and answer selection stay immediate. Mobile and reduced-motion alternatives are supported. No database or dependencies were added. See `PAGE_ENTRANCE_ANIMATION_GUIDE.md` for routes, design choices, motion timings, QA and limitations.

Check the motion definitions with `npm run test:motion` in addition to the existing project tests.


### v1.9.2 assessment behavior
The assessment start CTA sits beside the Before you start instructions. Attempts are unlimited (the prior demo cap is no longer enforced or configured by Admin). Unanswered warning markers show only at the final Review and submit action for both Practice and Assessment. See `ASSESSMENT_UX_UPDATE_v1.9.2.md`.

## v1.12.0 — Admin Question Bank by course
Question Bank is available only inside the Admin demo workspace. Select **All courses**, **ASP Course** (1,625 original imported questions) or **PSEE** (12 clearly labeled fictitious demo questions). Saved Questions remains in the learner workspace. Admin demo: `TC9001 / AdminDemo@1234`; learner demo: `TC1001 / Demo@1234`. These are browser-local demo identities only. See `QUESTION_BANK_ADMIN_COURSE_VIEW_v1.12.md`.


## v1.13.0 — Lesson content types
The Course Builder now creates **Video** or **PDF** lessons only. There is no manual lesson duration. Video runtime is read from uploaded video metadata when available; PDF lessons have no runtime. The Practice and Assessment timer configurations are unchanged. See `LESSON_VIDEO_PDF_GUIDE_v1.13.md`.

## Learner Learning Player — v1.15.0

Open **My Learning** or navigate to `/#/learning/process-safety-foundations`. The single featured **Process Safety Essentials** course includes two modules, three lessons (video and illustrated downloadable PDF reading), and an original 10-question self-check. The video is embedded from U.S. Chemical Safety Board / YouTube and provides a YouTube fallback. Progress is persisted locally per signed-in demo account. See `LEARNING_PLAYER_DEMO_v1.15.md` for limitations and sources. Run `npm run test:learning` to verify wiring and grading data.
