# P33 — Learner Quiz tab always visible; Draft question publication path

## Screenshot evidence (2026-11-08)

Admin Question Bank shows Course **C04** with 2,500 bank questions, Lesson `Domain 1 / topic1 / lesson 1`, **0 Published**, **2 Not published**, at least two question rows marked **DRAFT** with Lesson Quiz set to Lesson 1, and **1 unsaved** edit. This explains the Learner Lesson Quiz being empty: the P22 learner RPC exposes only `is_published=true` questions. The real published count is zero in the screenshot. The Course and Lesson IDs cannot be inferred from title text; the P32 Admin health inspector uses real UUIDs.

Learner screenshot also contains a top shortcut named `Knowledge Check` (at the right of Video and Study Material). It is the actual Quiz section, but its name was not obvious. The user requested an explicit `Quiz` tab. The same-page scrolling mechanism is already implemented; do not replace it with page/tab-swapping, unmount videos or expose answers.

## Changes

- Learner top jump shortcut is now explicitly **Quiz**, even with **0 published** questions. It retains the real published count badge (including zero), and clicking it scrolls to **Lesson Quiz** in the same page below Video and Study Material/Attachments. It still refreshes the P22 published questions on click and supports clicks during initial load. Empty-state text explains that assigned questions require independent approval plus publication, not that the Quiz tab is missing.
- Admin Course Builder section is called **Lesson Quiz** (not Knowledge Check) and warns about saved but unpublished questions.
- Admin Question Bank existing read-only per-Lesson count now gives the concrete sequence **Save All Changes** (for 1 unsaved), **Review Draft questions** (opens existing ASP P6A or non-ASP rights/answer workbench), **Open Lesson Quiz** then **Publish** approved, Active, non-Mock linked entries. It does **not** bypass any approval, write to real Supabase data or mark Draft as Approved automatically.
- Status tooltips explain Draft, Approved, reserved Mock. Preserve one-request P30 Save All batching and P28/P29/P30 server guards.

## Verification and deployment

Pure UI regression `npm run test:p33:learner-quiz`, P22/P23/P27/P31/P32 tests, full build and disposable PostgreSQL CI, then Cloudflare build check. No new SQL migration; P22/P28/P29/P30 still must already exist on the correct live project. For live user verification, choose real Course C04 and same Lesson UUID, complete and save any unsaved changes, manually review draft rights/answers, then publish approved quiz rows. Reopen Course Lesson 1 as an eligible Learner; the Quiz tab should show the published count and question options. Do not auto-publish the ASP Mock 200-question exclusive pool or unsafe Drafts.
