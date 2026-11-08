# P29 — One Question Bank: Active, Mock Exam and Lesson Quiz assignment

**Status:** staged source implementation in PR #70. Not automatically applied to any real Supabase database or deployed on Cloudflare. P29 must be installed **after** the existing P28.2 forward-upgrade, with read-only remote ledger/schema checks and a backup. P1/P4/P6A/P8e/P9B/P10/P22/P28 remain canonical.

## Admin workflow (English-first)

From **Admin Tools → Question Bank**, the Course selector starts with the real ASP course. The Admin can upload a local Excel (.xlsx)/CSV file or add one question manually into `lms_questions` for that exact Course. Upload previews skipped rows, unmapped Domains and provisional Difficulty, then explicitly imports in batches of 50. Duplicate source IDs/prompts do not overwrite existing answers or review history. All imported questions are `draft`.

Each Question Bank row shows:
- **Active** checkbox: **on by default**, separately from approved / draft status. This is an administrative enable/disable switch, not permission to bypass P6A/ASP rights review or independently grant learner access.
- **Mock Exam** checkbox: marks an unused, unlinked **Draft** as a future Mock **candidate** and excludes it from new Practice and Lesson Quizzes. It is **not** the irrevocable P9B `mock_exclusive` reservation. Official ASP P9B still needs exactly **200 unique human-reviewed verified question IDs**, human rights/answer/domain review, independent Admin controls and a separate atomic finalize step. Reserved official Mock questions are locked and cannot be unchecked or disabled.
- **Lesson Quiz** dropdown: lists only Lessons under the currently selected Course in `Domain / Topic / Lesson` hierarchy. The Admin selects a Lesson and clicks **Add to Quiz**. The server's existing P28 `lms_p28_attach_lesson_question` verifies same-Course, no Mock, eligible state and no duplicate link. Approved questions may publish; Drafts remain unpublished. Already-linked Lessons are labeled. No new independent quiz-question bank is created.

From **Course Builder → Lesson → Knowledge Check**, the same Course Question Bank picker with Domain/Difficulty filtering remains available for adding multiple questions.

From **Exams & Mock**, Admin may load the marked candidate IDs from the Question Bank; this does **not** reserve the Mock or bypass the existing protected 200-question preflight.

## Database safety contract

Migration: `supabase/migrations/202611080003_p29_bank_active_mock_and_lesson_controls.sql`.

- Adds `lms_questions.is_active boolean NOT NULL DEFAULT true` and `mock_candidate boolean NOT NULL DEFAULT false` with an additional index, preserving existing data. There is **no backfill UPDATE**, question overwrite or deletion.
- Server Admin-only audited `lms_p29_set_question_flags(question_uuid,active_bool,mock_candidate_bool)` controls flags, denies attempted changes on immutable ASP Mock reservations, denies Mock selection of an approved, answered or quiz-linked question, and unpublishes affected Lesson Quiz entries on disable; prior grades/attempts remain untouched. Re-enabling does not silently re-publish previously unpublished quizzes.
- Server `lms_p29_mock_candidate_ids(course_uuid)` returns only candidate UUIDs (not answers) to verified Admins.
- Strengthens current P28 guard to block publication/approval of Mock candidates and insertion of disabled questions into Lessons.
- Replaces only the bodies (not signatures or grants) of secure P4 Quick/Custom and P8e fixed-correct Level Up select/readiness/answer RPCs to exclude `is_active=false` or `mock_candidate=true` from **new** question draws. Already started attempt snapshots are intentionally immutable and remain gradeable, preserving existing grades.
- Extends the 7-argument P28.2 Admin list output with `isActive`, `mockCandidate` and `linkedLessonIds`. The old 4-argument list is preserved for existing callers. The client has a truthful read-only compatibility fallback when the old list is installed; its switches remain disabled until P29.

**Important distinctions:** “Active” is not “Approved”; a Draft Active question is still unavailable to learners. “Mock Exam” checkbox is a candidate indicator until finalized by P9B exactly-200 transaction. A question already published/used cannot be silently reclassified as Mock-only; archived/deactivated questions do not participate in new Practice selection.

## QA and rollout

- `npm run test:p29:bank` static contracts for visibility, uploads, checked state, Lesson picker and server protections.
- `scripts/test-p29-postgres-smoke.sh` runs on disposable PostgreSQL after the P28 test; validates no existing row-count mutations on installation, Admin/learner permissions, default Active, disable/unpublish/re-enable, Draft Mock candidate and its inability to enter Practice or Lessons, unchanged P4/P8e level-up policy and preserved ASP Mock controls.
- In the verified Technica development/staging Supabase project: first verify the remote migration ledger and confirm P28.2 installed, read the question/quiz/Mock counts, preserve a backup, execute P29 once, rerun read-only checks, then verify with real Admin and non-Admin browsers. Cloudflare build and main deployment are independent operations. Do not replay P22/P28/P28.2.
