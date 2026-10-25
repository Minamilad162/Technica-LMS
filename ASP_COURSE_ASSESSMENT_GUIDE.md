# Technica LMS v1.9.0 — Course-first Practice and Assessment

## Confirmed course structure from the supplied material

**ASP Course** is the parent course of five domains from the first five worksheets of `ASP_Question_Bank_2500_Simplified.xlsx`. The original Excel sheet labels are exactly `Domain 1`, `Domain 2`, `Domain 3`, `Domain 4`, `Domain 5` — no descriptive domain titles have been supplied. The existing JSON bank holds **1,625 questions**, split **250 / 625 / 200 / 300 / 250**. Answers and explanations are retained and question IDs stay stable.

**PSEE** is a separate, empty **Coming soon** course. No PSEE questions or assessments are invented or copied from ASP. Other course names can be added when supplied.

## Learner: Practice (fully customizable)

1. Choose **ASP Course** (PSEE can be selected but shows its empty state).
2. Select one or several ASP domains. Domains are *inside* ASP, not separate courses.
3. Choose 10, 25, 50 or Custom (1–50) questions, feedback and eligible question pool.
4. Select **No timer**, **Whole test** (custom 1–180 minutes), or **60 seconds per question**.
5. Start. Questions come only from the chosen domains of the chosen course.

## Learner: Assessment (read-only parameters)

1. Choose a **course**; never choose question count, duration, answer feedback or question pool here.
2. See the admin's fixed question count, total duration, pass mark and the configured source domains. Attempts are unlimited.
3. Accept the instructions and start if the course question bank is available. Retakes are unlimited.
4. Assessment questions are randomized from the admin-selected ASP domains. Answer feedback is only shown after submission. Scores use the fixed pass mark set at session start.
5. PSEE is disabled until its bank exists. The learner cannot launch an empty assessment.

## Admin workspace: Configuration

Go to **Profile → Admin workspace → Course Builder → Assessment**.

The admin can configure ASP's **question count, duration in minutes, pass mark, allowed source domains and enabled state**. Values are clamped and normalized (1–50 questions, 1–180 minutes, 1–100% pass mark). Attempts have no limit. PSEE remains a disabled shell. Domain-level question counts reflect the imported ASP bank.

**Important demo boundary:** Accounts, role switching, admin configuration, session control and persistence are currently **browser-local demo behavior** (React state + localStorage). These settings are **not** enforced by Supabase/RLS/API and do **not** constitute production-grade exam security or tamper-proof scoring. A real launch requires server-side auth, admin permissions, protected exam configuration, secure question delivery, and a trustworthy attempt record.

## Migration, impact and checks

- Previous learner-selectable `assessmentDomain`, `assessmentQuestionCount`, `assessmentDurationMinutes`, and related assessment customization settings are intentionally ignored. Old localStorage cannot override the new admin-controlled assessment rule.
- `practiceCourseId`, `assessmentCourseId`, `courseAssessmentSettings`, `assessmentAttempts` extend the existing store without wiping previously saved practice questions or results.
- Existing V1.8 motion system, design tokens, mobile responsive images, and 1,625 source questions are preserved.
- Run: `npm run check`, `npm run verify:bank`, `npm run test:selection`, `npm run test:auth`, `npm run verify:images`, `npm run test:motion`, `npm run test:courses` and, with dependencies available, `npm run build`.


## v1.9.2 visual layout

The separate ASP content/domains section was removed from the learner Assessment overview. On desktop, **Start assessment** is in a dedicated card left of **Before you start**, and on mobile the instructions appear first. No maximum-attempt setting is exposed or enforced. Unanswered Question Navigator markers appear only at Review and submit.
