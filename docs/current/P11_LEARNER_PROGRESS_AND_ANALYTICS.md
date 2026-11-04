# P11 — Learner Progress & Analytics (source-only implementation)

**Status:** implemented in GitHub source and tested against disposable PostgreSQL; **NOT installed on real Supabase Staging/Production**. No real learner data or source questions modified. Migration requires P1, P2, P4, P6A, and P10 on a separately authorized Technica staging environment.

## Scope, pages and canonical hierarchy
- Route **`/my-progress`**, in the existing Learner sidebar/mobile navigation; uses real signed-in Supabase identity and published/authorized course catalog. Does **not** replace legacy Demo/Admin `/analytics`.
- `src/production/LiveLearnerProgress.jsx`: course selector, verified KPI tiles, course lesson completion, Practice/Mock performance, expandable **Course → Domain → Topic → Lesson** progress, and latest 10 completed/expired attempts.
- Responsive styles `learnerProgress.css`. No fake percentages, course averages, streaks, sample learners, or answer keys in the live view. If P11 RPC/schema is missing, show a clear unavailable state, not Demo results.

## Data model — existing protected tables only
- `supabase/migrations/202611050002_p11_learner_progress_analytics.sql` creates **one read-only, owner-scoped** `lms_p11_my_progress(p_course_id uuid)` RPC. Does NOT create learner activity/event/score tables, mutate any existing questions/reviews/attempts/progress, or expand direct browser SELECT on private assessment/answer tables.
- Active JWT principal = `auth.uid()`; caller **cannot supply a user_id**. Revalidates active profile, per-course P1 structure authorization, published course or verified Admin, and per-lesson `lms_p1_can_view_lesson` (so Trial cannot see non-granted lessons). RLS remains in place; SECURITY DEFINER uses exact user/course filters and strict GRANT only to authenticated/service_role.
- Learning metric: count visible, authorized lessons in each Course > Domain > Topic; count **only `lms_lesson_progress.lesson_completed_at`** as completed. `reading_completed`, `video_completed`, and `quiz_passed` remain distinct state counters and are not assumed equivalent to full completion. A simple reading action never increments lesson completion without the trusted P2 backend ingest.
- Practice metric: only `lms_practice_attempts.state IN ('submitted','expired')`, including Level Up; its P4 frozen private answer snapshots are used inside the RPC for answered and correct counts. `abandoned` and `in_progress` do not count as graded attempts.
- Mock metric: only P10 `lms_p10_mock_attempts.state IN ('submitted','expired')`, with 200 questions per exam, and protected `lms_p10_mock_answers` frozen snapshots for actual answered/correct counts. Mock and Practice are shown separately. P10 answer keys are **never** returned by P11.
- **Answer Accuracy** = `correct answers / answered questions × 100`. **Scored Percent** = `total correct / all assigned questions × 100`, so unanswered assigned items are treated as incorrect for exam scoring. No data: show **—**, never invented 0% accuracy. Recent table shows `mode,state,questionCount,correctCount,scorePercent,startedAt,submittedAt` only; limit 10.
- Domain question performance is computed from each P4/P10 item `question_id` → `lms_questions.domain_id`, falling back to P6A `reviewed_domain_id` for reserved Mock DRAFT questions, aggregated by authorized course domains. The API returns only counts and percentages, not question IDs, prompts, correct indices, answer options or per-learner identities.
- Topic performance is **learning completion, not topic question accuracy**. The current P4/P10 schema has NO `question.topic_id` or frozen topic mapping. The response sets `topic.questionAccuracyPercent = null` and the frontend says it is unavailable. Do **NOT** infer Topic exam accuracy from a Domain-level score or publish unsupported grades.

## Client fail-closed contract
- `src/production/learnerProgressApi.js` invokes only the protected `lms_p11_my_progress` RPC, validates exact report version/courseId, counts, denominator consistency, correct Mock 200-per-attempt assignments, domain/topic hierarchy, and refuses invalid sessions.
- Portal uses `fetchLiveLearningCatalog` and `mayReadLiveCourse` from the existing real Learning pages, never bundled question/Demo arrays; all counts remain ultimately server-owned.
- Trial report shows only trial-granted lessons, and never another learner's attempts. Verified Admin may see own statistics for all allowed courses, **not every learner's metrics**; an Admin team dashboard is a separate authorized privacy-reviewed feature.

## Testing, staging and release
- `npm run test:p11` exercises API contract with synthetic data and negative guards; checks route/sidebar, server-only RPC and explicit Topic accuracy limitations.
- `scripts/test-p11-postgres-smoke.sh` runs only in GitHub's **disposable PostgreSQL** AFTER P10/P9B fixture. Checks P11 migration does not mutate P2/P4/P10 questions or attempts; anon/unentitled/cross-course/suspended/revoked denial; Trial one-granted-lesson scope versus paid two-published and Admin all three; one genuine trusted synthetic completion; private Practice+Mock score/accuracy calculations, exclusion of P10 abandoned; zero answer key/source question leaks and no reading data modifications. **Does not touch real Supabase.**
- No P11 migration was installed on real Supabase, no deployment / production authorization given, no live Browser/Android/iOS acceptance or actual event-ingest pipeline QA. A Staging-only migration and signed Auth/JWT verification are required before enabling genuine learner analytics.

**Next planned stage:** P12 system-wide Production readiness/integration QA, including live P2 validated progress ingestion, P10 200-item release gates, mobile browser security limits, entitlement tests and no-Demo data verification. Stop reopening the ASP question-bank research loop.
