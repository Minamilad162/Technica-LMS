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
