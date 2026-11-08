# P32 — Lesson Quiz saved, but Learner sees 0 published questions

**Owner evidence, 2026-11-08:** Learner screenshots show **Lesson 1** in a real Course, with one continuous Video → Material → Knowledge Check page, but the Knowledge Check shows **0 published questions**. The UI renders the quiz section properly. This does **not prove** whether the Admin actually saved a Lesson link, linked a Draft, saved to a different Lesson/Course, or failed to publish. No remote Supabase project or row IDs were connected to this task, so no factual claim was made about that database.

## Existing secure server behavior verified in repository

- P30 stores selected Lesson link through `lms_p28_attach_lesson_question` in the exact Course hierarchy and uses `p_publish = (approval_state = 'approved')`. P29 guards reject cross-Course, disabled, Mock candidate/exclusive or archived links; Draft links remain unpublished.
- P22 `lms_p22_get_lesson_quiz` lists **only rows with `is_published=true`** after learner profile/entitlement verification. The learner screen correctly displays 0 if none published. Correct answers remain in server-grading code. P31 refreshes published questions and Quiz top navigation scrolls in-place.
- This means selecting and saving a Lesson on a Question Bank row **does not make a Draft question visible**. ASP's independent human approval remains mandatory; it is unsafe to auto-approve or leak reserved Mock exam questions. Already-approved + Active non-Mock links publish automatically on P30 Save; a previously linked Draft that is approved later still needs an explicit Publish action in Course Builder's Lesson Quiz editor.

## What P32 adds

**No new SQL migration and no database writes.** Read-only Admin UI calls `inspectLessonQuizPublication(db,lessonId)` with the actual selected Lesson UUID. It selects ONLY `id,lesson_id,bank_question_id,is_published` from the Admin-RLS P22 table: no answer key, options, personal data, or learner data. In Question Bank a compact **Check learner quiz for [Course / Domain / Topic / Lesson]** strip shows actual **Published**, **Not published** counts and advice:
- **0 saved:** choose that exact Lesson on the bank question and click **Save All Changes**.
- **Some saved, 0 published:** the learner will see 0. Review Draft questions independently and use **Publish** for approved questions.
- **Published >0:** learner with correct entitlement should see those questions; verify they opened the identical Course and Lesson.
A button **Open Lesson Quiz** deep-links the actual `/builder?courseId=UUID&lessonId=UUID` and auto-expands that Lesson. Its Admin editor now clearly distinguishes saved / published / unpublished, and already has a protected **Publish** action. Neither the Admin inspector nor the learner views or returns correct answer keys.

**Optional accurate DB-only diagnosis**: Run `scripts/sql/P32_READONLY_LESSON_QUIZ_VISIBILITY.sql` using **read-only** access to the exact Supabase project backing the site. It reports Course, Domain, Topic and Lesson **UUIDs**, total saved, published, Draft-source and approved-but-unpublished question counts. No writes, new migration, replay, automatic approval or publication from this query.

## Scope and QA

P32 is a diagnosis and accessibility fix, not a declaration that any particular user question was published. We cannot change an owner's live question data or infer the exact Lesson ID solely from screenshots. Use real Admin and eligible Learner accounts after release to confirm an independently approved Active non-Mock question goes from saved link to P22 published to Learner Knowledge Check; verify wrong Course/Lesson, Draft pending, and mocked/disabled negative cases.

Tests: `npm run test:p32:quiz-visibility`, full P22/P23/P28/P29/P30/P31 frontend tests, React build, isolated Postgres RLS and P22 learner server grading. No Supabase production writes; Cloudflare deployment must be checked separately.
