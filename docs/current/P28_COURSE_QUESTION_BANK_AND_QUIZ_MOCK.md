# P28 — Course Question Bank → Lesson Quiz → Mock-only selection

**Date:** 2026-11-08. **Status:** source implementation on a review branch. No Supabase deployment or learner data changes have been performed. P28 is additive to existing P1/P4/P6A/P9B/P10/P22.

## Accepted owner journey

1. Admin Tools → Question Bank → select a real **Course**. Each Course has an isolated set of questions owned by `lms_questions.course_id`. Nothing is copied from other Courses.
2. Upload `.xlsx` or `.csv` with the existing browser parser. Headers: Question, Option A, Option B, Option C, Option D, Correct Answer; optional Explanation, Domain/Topic. All worksheets are processed; the Course's real Domain can be selected beforehand. Import shows a validation preview, highlights bad/skipped rows, then asks for explicit confirmation. Up to 50 validated rows per protected RPC transaction, maximum 12 MB per source file. Duplicate source IDs or normalized prompt are skipped and prior answers/status/history cannot be overwritten. Imported questions are **Draft**, not eligible for learners by default.
3. Admin can add a manual Draft question and review course-scoped questions and correct answers in the protected Admin workspace.
4. Existing ASP imports retain their pinned P9D.1 private 2,500/nine-domain review and independent P6A/P9B approval rules; the generic UI does **not** claim that the private ASP bank was validated or safely released. ASP approved question release is still separate, and legacy 1,625-question Demo data stays untouched. Non-ASP Drafts require an explicit Admin rights/answer confirmation before individual approval. Automatic production rights verification is not claimed.
5. Course Builder → select a Lesson → Knowledge Check → **Choose from Course Bank**. Search/page/select questions from the same Course. Server creates a P22 quiz row linked by `bank_question_id` and copies approved source content and correct key inside the database. Approved bank items can be published, Drafts remain unpublished; archived/Mock-only/cross-course questions are rejected. Legacy manually authored P22 quiz questions remain available, and deleting a quiz row does **not** delete the original bank item.
6. Admin Tools → Exams & Mock → choose a Course. ASP retains the existing exact **200 reviewed, versioned, immutable** form + 300-minute P10 engine; no per-question flag is allowed to bypass that contract. Non-ASP Draft questions may be explicitly marked **Mock-only** one by one. The mark excludes them from the P4 Practice pool and prevents Lesson Quiz links. It is a preparation state ONLY; no general-course Mock exam engine has been created or advertised as active.
7. To avoid accidental dual-use or rewriting learner questions, a question already linked to a Lesson Quiz must be explicitly unlinked before it can become Mock-only or archived. A reserved Mock-only question cannot be linked or published in any quiz. SQL triggers enforce this even when another authorized process attempts a direct update.

## Scope / authorization

- The new P28 SQL creates **no new question bank**; it reuses `lms_questions` and adds only a nullable `bank_question_id` reference to existing `lms_p22_lesson_quiz_questions`, a unique link index, two protective triggers, and five Admin-only RPCs.
- Anonymous and learner roles receive **no direct bank SELECT/INSERT/UPDATE**; the RPC verifies the signed-in Admin role using `lms_p1_actor_is_admin()`. Import writes and Mock-only decisions are audit-logged. SQL import explicitly avoids `approved` and `mock_exclusive` defaults; no autofill into real exams.
- P4/P8e Practice still requires approved questions and `NOT mock_exclusive`. P9B ASP reservation still requires 200 unique qualified questions and existing independent review, P10 keeps 200/300. No change to P21 subscriptions, P22 progress, P23 lesson single-page layout or P14 media access.
- The owner made contradictory statements regarding whether Mock-reserved questions appear in **Assessment Practice**. Until a single precise exception is approved and implemented server-side, the **safer existing rule applies: all Mock-reserved items are excluded from every Practice, assessment practice, lesson quiz and pre-assessment pool.** No client-side bypass.
- P28 does not retrofit old manual P22 questions into `lms_questions` automatically, nor silently change previously graded attempts. Linking and removal are explicit Admin actions.

## Before applying any SQL

1. Verify the correct isolated **Technica Staging** project identity, remote Supabase migration ledger, current P1–P22 installation, backup, grants and RLS. Do not replay the previous migrations. The P28 migration must run **once** only after previous migrations and in the correct order.
2. Run `npm run test:p28:bank` and `bash scripts/test-p28-postgres-smoke.sh` in isolated, disposable CI DB AFTER P22, with existing full CI and Vite builds. SQL added to source is not proof it is installed remotely.
3. In Staging, test signed Admin import of synthetic .xlsx with multiple worksheets, malformed row, duplicate import idempotency, selecting Course and Domain, attaching a Draft vs approved question, publishing, unpublishing, unlinking, cross-Course attempt, an ASP restricted 200 candidate, and attempted Mock-only flag on already linked/used question. Test an ordinary learner and signed-out user cannot access source keys or author questions, and an authorized paid learner sees only published Quiz prompts/options.
4. Verify with existing RLS/GRANT helper queries that newly added public functions are Admin-only and that only authenticated may EXECUTE. Admin must explicitly approve any future real question import; never use synthetic data in Production. Manual desktop + mobile visual QA is pending.
5. Rollback code by reverting P28 frontend. **Do not DROP columns or purge link metadata in Production**; forward-remediate in a reviewed migration to preserve historical links.

## Known limitations

- Excel import uses the existing browser parser (`.xlsx` and `.csv`), not legacy `.xls`. It is not the P9D.1 private, pinned ASP-2,500 ingestion workflow.
- Existing P22 manual quiz questions remain as legacy authoring; new linked questions use canonical P4 bank but do not mutate historical quiz grades.
- A marked non-ASP Mock-only question is not an executable multi-course Mock form. Its Mock engine needs another scoped, server-validated feature.
- New P28 functions require the owner to install the migration on the verified Supabase environment; until then the new screens clearly show an unavailable/permission error instead of inventing data.
