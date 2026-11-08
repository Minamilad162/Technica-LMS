# P30 — Compact Admin Question Bank / Batch Save (approved design)

**Scope:** UI reconstruction of the exact owner-approved Question Bank screenshot, with two changes from owner feedback: remove all per-row answer/option dropdowns; stage ALL inline question settings and save once at the end. Core schema remains P1/P4/P6A/P8e/P9B/P10/P22/P28/P29.

## User experience

The Admin Tools Question Bank tab retains the Technica teal gradient hero, horizontal sub-navigation and Course selector. Main controls are Upload Excel/CSV, Add Question, Search, Domain/Difficulty/Usage filters and five small informational counters. Counters for Active, Mock, Draft and Lesson-linked are **explicitly labeled as current-page counts**, not fabricated platform totals.

A compact list/table shows **question text only** (never answer choices, solution, or answer key), Domain, Difficulty, Active switch, Mock Exam candidate switch, Lesson Quiz add-selector and Approval status. There is **no expanded question detail row and no inline answer dropdown**. Answers are visible only in separate authoring/review forms where needed, not the Question Bank listing.

Per question: changing any switch/dropdown stages it in React state and adds a subtle “Unsaved change” label and row accent. **No network write happens on field change.** Selected questions may bulk Activate, Disable, Mark Mock, Unmark Mock, change Difficulty, or add a Lesson. All actions only update staged state. The sticky action strip shows count of unsaved questions and buttons **Discard** / **Save All Changes**. Save performs ONE `lms_p30_save_question_bank` RPC for up to 500 modified questions, not N per-question RPCs. Filter and pagination changes preserve staged edits within the same Course. Leaving Question Bank/Course or navigating away prompts if changes are unsaved.

A new read-only `lms_p30_bank_capabilities` handshake prevents the inline controls from activating before the matching P30 SQL exists on that environment. Imports and new question creation remain separate explicit workflows and still require verified Admin auth. Historical P6A independent ASP review stays accessible through one collapsed Advanced Review section; non-ASP independently approved/Mock-only actions are preserved behind their own collapsed Advanced Review section. No live content is auto-uploaded or auto-approved.

## Server logic and safety

New additive, source-only migration: `supabase/migrations/202611080004_p30_batch_question_bank_edits.sql`. Requires original P28 (or the owner-installed P28.2), P29 and existing P9B. Install **only on explicitly authorized staging/development after read-only remote migration ledger, backup and prerequisites**. Never replay previous scripts and never run source-only SQL automatically against Production.

- `lms_p30_save_question_bank(course_uuid,changes_jsonb)` verifies actual user auth/Admin, real Course, validated JSON size/count (1–500), same-Course ID, unique question IDs, and stale snapshot values (`isActive`, `mockCandidate`, `difficulty`, `approvalState`) under row locks.
- One Postgres function means one transaction; any invalid/conflicting row fails and reverts **all changes in that Save call**. No partial successes, no background jobs. UI retains staged changes after failure.
- For Active/Mock toggles, calls existing Admin-only P29 audited guard within same transaction. `is_active=false` unpublishes linked Lesson Quizzes without erasing learner history; re-enable does not silently republish.
- Official ASP P9B reserved Mock rows are immutable. Marking a new Mock candidate remains restricted to unused, unlinked, Draft, Active questions; existing Practice and Level Up selectors stay server-side excluded. No automatic 200-question Mock selection/approval.
- Changing Difficulty is allowed for **Draft** only. Already approved ASP difficulty is frozen to protect independent P6A/P9B review; re-review is a separate workflow, not an inline permission bypass.
- Lesson Quiz selections **add** a reference to the same Course Bank question using the existing protected P28 RPC; existing Lesson links are retained. No duplicate same Lesson link, cross-Course links, Mock-only or disabled questions.
- Imported Drafts are active by default once P29 is present; “Active” does not mean Approved. No SQL changes to existing Question/Mock/Grades at P30 migration installation.
- Read-only capability probe reports version `p30-v1`, 500 maximum and `atomic=true` to verified Admins only.

## Verification

`npm run test:p30:bank` checks no expanding answer components, real per-row/bulk staging, single batch RPC, approved-only Difficulty lock, selected Lesson, and unsaved navigation protection.

`bash scripts/test-p30-postgres-smoke.sh` runs only on disposable PostgreSQL after P29 and proves migration installation changes no source/Mock/quiz rows, learners/anon cannot use RPC, one call changes two questions atomically, Draft Lesson Quiz link stays unpublished, approved Difficulty cannot be silently changed, stale snapshots reject, and attempts to alter official Mock or replay P30 fail closed. Full build and prior regression suites remain mandatory.

**Release gate:** CI success is not evidence of the actual Supabase P30 deployment or Cloudflare Workers build. Once all checks are green, merge via one grouped PR and separately confirm the selected database and Cloudflare deployment status. Never claim live UI behavior before both are verified.
