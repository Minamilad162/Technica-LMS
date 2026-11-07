# P19 — Qualifications frontend preview (no Supabase writes)

**Owner-approved scope:** OTHM Level 6 Diploma, OTHM Level 7 Diploma, and ProQual Level 6 NVQ. Future approved centre task templates may be customized without editing the awarding body's official criteria. Visual target: owner-supplied Technica qualification, mapping matrix and assessor/admin mockups on 2026-11-07.

## Implemented source-only UI
- Shared responsive src/qualification/QualificationsWorkspace.jsx used by the **real learner app** (LiveLearnerWorkspace, Qualifications left navigation), **real verified Admin Tools** (Qualifications tab), and the legacy ReactRouter route /#/qualifications.
- Learner flow: My Qualifications catalogue → Unit Overview → Tasks & Evidence → dedicated **Evidence × Assessment Criterion mapping matrix** → final submission preview. Click/toggle mapping checkboxes; evidence chooser uses native file selection (browser metadata only) and no network upload. WCAG-named controls, overflow-safe matrix on small screens, three-step progression.
- Admin flow: qualification and unit picker, official read-only reference structure, customizable center task template fields (frontend preview only), independent evidence review decision demo with criterion-level decisions, feedback and IQA placeholder.
- Official unit names/codes from supplied **OTHM Dec 2023** and **ProQual Feb 2018** PDFs. **Only the first LO and its first criteria** are presented as verified examples for each qualification. Other units deliberately say rubric not imported; never synthesize unverified assessment requirements.
- All displayed learner names, evidence, status counts, acceptance choices, mapping progress are **illustrative demo only**, not records from Supabase. No active enrollment, pass/fail, current acceptance, verified percentage or certificate claim is made.
- The source-only preview intentionally does not upload documents, write the mapping to Supabase, create assignments/claims or notify assessors. Preview submit and accept operate **in React memory** and explicitly disclose this. Browser reload loses preview data. No SQL/Edge migrations, API calls or external requests added.

## Screen-by-screen acceptance
1. Three legitimate qualifications appear under Qualifications, with count of mandatory Units.
2. Opening a Unit shows actual unit code/name and either verified first-LO criteria or a clear 'not imported' notice.
3. Evidence page offers add/remove browser-only files.
4. Mapping page links many evidence items to multiple criteria with accessible checkboxes, readable criterion tooltips, per-unit mapping coverage and clear note **linking ≠ acceptance**.
5. Submission preview only permits a fully linked previewed criterion set; clicking never uploads or creates a server record.
6. Admin Tools is accessible only after existing verifiedLiveAdmin(db) and shows a **separate** qualification builder, task template editor, assessor decision panel and IQA boundary.
7. Existing Course > Domain > Topic > Lesson, ASP P8e 70% promotion, 200/300 Mock, P14 media, P16 checkout and P18 course progress are unchanged.
8. Mobile scrolls the mapping matrix horizontally; bottom app navigation remains functional; reduced-motion preference honored.

## Known gaps and backend gate
- Need authorized centre-approved latest specification versions, complete all LO/AC rows and approved assignment briefs; the 2023/2018 source references are not proof that they remain current.
- Must build versioned schema/RLS, approved institution templates, enrollment entitlements, private file storage, malware/type/size validation, server-validated cross-reference, protected submission snapshot, assessor assignment, per-criterion human decisions, IQA audit, feedback and resubmission before enabling persistence.
- Real role checks must be enforced in Supabase, not assumed from the visual designer; no fake Acceptance state. Evidence upload and template editing have no backend yet.
- CI: npm run test:p19 plus all existing checks and both demo/live Vite builds; manual desktop/mobile visual comparison after preview deployment. No production database connection is needed by P19 test itself.


## P25 — Simplified premium horizontal Units navigation (2026-11-07)

**Approved visual correction:** Previous large Unit list and verbose multi-screen headers cluttered the learner and admin experience. In both workspaces, replace vertical Unit tiles/dropdowns with one compact horizontally scrollable row of numbered tabs (01, 02, ...). Clicking a number updates selected Unit details directly beneath the strip, with its real title and official Unit code. Preserve all existing qualification cards, correct Unit count and first imported LO/Assessment Criteria. On desktop and mobile the row stays horizontal and scrolls rather than wrapping into a tall grid.

**Learner UI:** one short qualification heading, number strip, active Unit name, and only three modest section controls: **Evidence, Mapping, Submit**. Evidence displays sample files and a single Add Evidence action; optional official criteria are behind a disclosure. Mapping keeps the full many-to-many evidence-to-criterion checkbox matrix and coverage. Submit still requires actual previewed criteria coverage and creates only an in-memory demo state. No large introductory banner, progress wizard, repetitive explanations, duplicated Unit list, or multi-level breadcrumbs. A small neutral footer states demo-only data and no uploads.

**State handling:** mapping is keyed by Qualification + Unit, so navigating Unit 01 → Unit 02 → Unit 01 restores its draft cross-reference selections. Evidence is shared by Qualification to allow mapping one document against multiple Units. Prevent removing files linked to a preview-submitted Unit. Switching Units changes the visible section to Evidence but does not discard other Units' draft mappings. Units without imported authoritative Assessment Criteria show a clear empty state, and cannot be submitted or auto-approved.

**Admin UI:** Qualification selector, same numbered Unit strip, selected Unit details and concise **Unit Details / Task Templates / Assessments / IQA** controls. Official LO/AC remains read-only. Centre task-template editing, per-criterion Met/Partial/Not Met, feedback and accept/return remain functional in React memory; Admin authorization is unchanged from P24. No dummy claim that the UI has accessed a real learner record.

**Release gates:** Vite Demo and Supabase-only builds, regression tests including P19/P20/P21/P22/P23, plus manual real-browser/mobile layout review. No new SQL, Edge Functions, private file upload, database writes or assessment approval. This remains a frontend preview until separately authorized backend rollout.


## P26 — Missing portfolio sections restored (2026-11-07)

The owner supplied screenshots of the reference platform's Course/Evidence/Registration/Contact/Metrics navigation, Resources/Actions, Competence Claim, Assessor/Verifier and grading/feedback areas. The P25 redesign left the Evidence ↔ Assessment Criteria matrix but omitted the other portfolio areas. P26 adds a compact programme strip, Course resources/actions, Contact Diary and example returned feedback, Records with registration, metrics, grading checklists and recording forms. Existing Evidence/Mapping/Submit remains independent and reachable from each Unit. These are premium responsive screens, **not imported student or assessor data**.

Admin Tools → Qualifications also adds draft resource metadata controls and Contact & Records for in-memory contact notes and local review history. Recorded decisions remain human-operated demo-only; no confirmed live acceptance, grading document, registration date, verifier account, deadline or protected resource URL is manufactured. First documented NVQ Unit 1 resource titles from the screenshot are presented explicitly as examples, not downloadable files. Complete authoritative rubric, resource upload, backend grades, contact history, real notifications and RLS must be implemented and approved separately.

Validation: npm run test:p19, npm run test:p26:qualification, full CI Vite builds and disposable PostgreSQL integration checks. Manual desktop/mobile visual QA remains outstanding.
