# P27 — Useful Admin Analytics & Safe Course Preview

**Date:** 2026-11-08  
**Implementation:** GitHub source. No new SQL migration, new Storage bucket, payment change, or live database write.

## Admin Dashboard
The current `Admin Tools → Dashboard` already receives `lms_p13_admin_overview()`, a verified Admin-only, read-only Supabase P13 RPC. P27 adds responsive four-ring Donut/Pie Charts with exact counts, percentages, accessible labels and actionable navigation.

| Chart | Server-derived breakdown | Action |
|---|---|---|
| Question bank | P13 `practiceApproved`, `mockReserved`, remainder `questions - practiceApproved - mockReserved` | Question Bank |
| Course publication | Published vs Draft vs Archived using complete P13 `courses` rows; fall back to published/not-published if incomplete | Courses |
| User accounts | Active vs Not active (`users - activeAccounts`) and contextual `engaged30Days` profiles | Users |
| Practice & Mock activity | Submitted/expired Practice vs submitted/expired Mock attempts, across all time | Exams & Mock |

The pie total always equals verified segment counts, with explicit 0/no-data states and no invented values. Existing six-month trend and per-course access bar chart remain. **P13 course enrollment metrics are legacy course-scoped grants, not P21 platform memberships**; rename those dashboard labels to “Legacy Course grants” so the new subscription model is not misrepresented. No claim of revenue or amount paid. The six-month trend is still six months, while the activity pie is all-time; those periods are visibly distinguished.

## Course Preview
Admins can now click **Preview Course** in `Admin Tools → Courses` or the older native Live Course Builder. Each Lesson also has a **Preview Page** link. Both open a new tab at:

`/#/admin/course-preview/:courseId?view=draft[&lesson=:lessonId]`

The route is wrapped in existing `AdminOnly` and performs a **second signed Supabase Admin verification** (`verifiedLiveAdmin`) before reading any draft Course or Lesson data. Course ID and Lesson ID are IDs only; URL never contains a signed media link or token. The source is the actual Supabase course tree, lesson blocks, cover and Admin-visible questions — no Demo overlay or synthetic sample data.

Three read-only preview modes:
- **Working Draft** (default): see every saved Domain, Topic, Lesson (including empty draft nodes and unpublished lessons) and all quiz questions, clearly marked Draft where applicable. All lesson content visible to this verified Admin for review only.
- **Visitor**: preview only published lessons, visually locked unless P15 explicitly enabled a free Intro. A draft Course is explicitly flagged “not visible in published catalog.” Clicking a locked lesson shows the would-be Subscription Plans flow; it does not create a paid grant.
- **Subscriber**: only published lessons, visually unlocked as a subscribed learner would see. This is an Admin-only **visual simulation**, not an actual learner token or authenticated impersonation.

The Preview intentionally reuses `CourseDetailHero` and the existing **single-page** `CourseLessonExplorer`, which preserves learner layout and sections in this order: Video → Study Material / PDF attachments → Knowledge Check. PDF and video remain private, served only through existing P14 Admin-authorized short-lived media view tokens.

In `adminPreview` mode, the shared Explorer:
- **Does not read/write learner progress** or submit P22 quizzes or P22 step-completion events.
- Reads quiz prompts/options through Admin-scoped P22 SELECT with `is_published` but **never selects `correct_index`**. Unpublished questions marked Draft.
- Allows in-memory answer selection for layout review only; no Submit button, score, completion percent or learner fake history.
- Shows a “Preview · N lessons” meter instead of claiming 0% completion on Admin.
- Has a Refresh Changes control to re-fetch saved Admin edits in the new tab. It does not auto-publish or persist edits.

A preview does **not** bypass RLS for ordinary learners, cannot be opened without a verified Admin session, does not mutate production, and does not guarantee OS screenshot protection (existing browser limitations still apply). Visitor/Subscriber previews are visual representations of the current Course and published lesson states; actual learner permissions remain enforced by P1/P15/P21/P22/P14 server functions.

## QA / rollout
- `npm run test:p27:admin`: pure distribution totals and mismatch/zero cases; Admin-only routing, draft vs published outline, no protected data in URL, Preview read-only guards, actual learner component reuse, source-only metadata/API access, mobile layout.
- The existing P13/P22/P23 and all core build/Postgres smoke tests must still pass. No new migration or SQL should be run.
- After building on Cloudflare, QA as Admin: draft Course, empty Domain, published Course, free Intro opt-in, draft quiz vs published quiz, PDF/video media, Preview Page deep links, edit+Refresh, browser new tab, different viewport sizes and disabled account. Also test **non-Admin direct URL denial** and no added learner progress rows after preview.
- P13 chart freshness is from the existing read-only overview refreshed on demand; it is not a streaming real-time telemetry subscription.
