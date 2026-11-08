# P34 — Unit learning material distribution from supplied PDFs

## Evidence reviewed
- 15 previously imported Learning Assistant walkthrough videos (31 min), with exact resource navigation in the transcript at **06:12–09:33**: course-level documents are separate from unit/element-specific resources; selecting a Unit leads to its specific templates and guidance on the same outcome page.
- Evidence Wizard and cross-reference workflow at **10:03–19:30**: files are mapped to one or multiple criteria; individual evidence is *not* a complete assessor submission.
- Three PDFs in the owner-linked Drive folder: OTHM Level 6 Diploma (Dec 2023 specification), OTHM Level 7 Diploma (Dec 2023 specification), ProQual Level 6 NVQ (Feb 2018 qualification handbook).
- These three PDFs are **specifications/handbook, not complete learner handout packs or approved centre-issued Assignment Briefs**. OTHM includes aim, LO and indicative content topics. ProQual includes competency outcomes and assessment criteria, **not teaching-topic material**. The source PDF link is not presented as a separately issued study lesson.

## Mapping to Units

### OTHM Level 6 Diploma

| Unit | Official code | Learning / competence outcomes | Indicative topics |
|---|---|---:|---:|
| 01 | `H/617/7539` | 4 | 13 |
| 02 | `Y/617/8526` | 6 | 39 |
| 03 | `Y/617/7540` | 4 | 6 |
| 04 | `Y/617/8543` | 4 | 13 |
| 05 | `R/617/9092` | 5 | 46 |
| 06 | `H/617/7542` | 3 | 3 |
| 07 | `K/617/7543` | 3 | 4 |


### OTHM Level 7 Diploma

| Unit | Official code | Learning / competence outcomes | Indicative topics |
|---|---|---:|---:|
| 01 | `M/618/8236` | 3 | 23 |
| 02 | `T/618/8237` | 3 | 12 |
| 03 | `A/618/8238` | 3 | 10 |
| 04 | `F/618/8239` | 3 | 15 |
| 05 | `T/618/8240` | 3 | 16 |
| 06 | `Y/618/8246` | 4 | 8 |


### ProQual NVQ Level 6

| Unit | Official code | Learning / competence outcomes | Indicative topics |
|---|---|---:|---:|
| 01 | `D/616/9536` | 4 | Not in source |
| 02 | `F/616/9531` | 5 | Not in source |
| 03 | `J/616/9532` | 5 | Not in source |
| 04 | `R/616/9534` | 4 | Not in source |
| 05 | `Y/616/9535` | 5 | Not in source |
| 06 | `H/616/9537` | 4 | Not in source |
| 07 | `K/616/9538` | 6 | Not in source |
| 08 | `M/616/9539` | 4 | Not in source |
| 09 | `H/616/9540` | 4 | Not in source |
| 10 | `K/616/9541` | 4 | Not in source |


## Frontend integration
- React-only material data in `src/qualification/qualificationUnitMaterial.js`; lookup **by immutable awarding-body Unit code**, never just title. Exactly 23 distinct Unit codes across all three programmes.
- `UnitMaterialPanel` renders title, source edition, authentic Unit Aim (OTHM), Learning Outcomes, imported indicative study topics in an expandable list, and the direct **owner-provided source PDF link**. The NVQ case explicitly states teaching notes/templates were **not** present in the supplied handbook.
- The learner **Course** panel opens by default under the selected horizontal numbered Unit. On the right, **Resources** and **Actions** remain separate compact cards. The learner's Evidence right card links back to the same Unit Material. Admin → Qualifications → Unit → Resources displays the same source material above local draft resource controls.
- The UI does not fake uploaded worksheets, PDF files, lesson videos, or assignment briefs. Examples described in the video without matching supplied files are labelled **Not downloadable · not supplied**.
- No new Supabase schema, Storage changes, permissions, production writes or entitlement changes. Do not treat visible material as approved paid learner content without a later authorized backend phase.
- Supplied PDFs show historical editions; **verify awarding-body revisions and centre approval before publishing them as currently effective assessment specifications**.

## Verification checklist
- `npm run test:p34:materials`: all 23 source mappings, source URLs and historical versions, OTHM indicative topics, ProQual outcome-only coverage, and frontend Learner/Admin wiring.
- Existing `test:p19` and `test:p26:qualification` plus full regression, Demo and Supabase-only Vite builds, PostgreSQL isolated smoke.
- Manual learner + Admin desktop and phone checks: horizontal Unit tabs; materials switch with selected Unit; no cross-qualification contamination; Resource/Actions right column; PDF link opens the **correct document**; no false downloadable content; Evidence/Mapping/Submit unchanged.
