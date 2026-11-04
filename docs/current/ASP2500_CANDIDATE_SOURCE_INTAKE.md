# ASP 2,500-question workbook — Candidate Source Intake (2026-11-04)

**Status:** Source RECEIVED and structurally audited. **NOT imported, domain-approved, difficulty-classified, rights-cleared, Mock-reserved, Practice-approved or released**. This file does NOT replace an existing imported 1,625-bank without an explicit owner-approved migration/reconciliation.

## Private source identity
- User-uploaded filename: `ASP_Question_Bank_2500_Simplified (1).xlsx`
- SHA-256: `37def22d09ee2deacd5352bd9f6ffaf7ef55fbda1fd798ea456a6690939c24d5`
- 9 worksheets, named literally `Domain 1` through `Domain 9`.
- Every worksheet has exactly these 7 headers: `Question | Option A | Option B | Option C | Option D | Correct Answer | Explanation`.
- Original workbook is a PRIVATE user source: **do not commit the 2,500 prompts, answer options, answers, explanations or any complete derivative into public GitHub or a Vite/browser bundle**, and do not invent/claim a license.

## Structural audit (source-only, no SME facts verification)

| Source worksheet | Count | Tentative ASP11 category (NOT approved) |
|---|---:|---|
| Domain 1 | 250 | Mathematical Calculations |
| Domain 2 | 625 | Safety Programs and Concepts |
| Domain 3 | 200 | Ergonomics |
| Domain 4 | 300 | Fire Prevention and Protection |
| Domain 5 | 250 | Emergency Preparedness and Response |
| Domain 6 | 300 | Industrial Hygiene and Occupational Health |
| Domain 7 | 175 | Environmental Management |
| Domain 8 | 275 | Training, Education, and Communication |
| Domain 9 | 125 | Legal |
| **TOTAL** | **2,500** | 9 tentative sheet-to-domain associations, to be signed off by qualified ASP SME |

Source-only automated quality results:
- Empty questions **0**; empty answer-option cells **0** (all 4 options filled); invalid/missing answer labels **0** (all A/B/C/D); missing explanations **0**.
- Rows with identical duplicated option text within the same question **0**.
- Exact normalized-question duplicates across all 9 sheets **0**, also **0** after punctuation-insensitive normalization; near-semantic duplication and factual/correctness accuracy **not independently verified**.
- A/B/C/D correct-label counts **615/635/640/610**. This is a structural balance observation, not evidence that each key is factually correct.
- The workbook has **no Difficulty, Topic, Lesson, Source ID, Reference/Citation, reviewer identity, commercial rights/evidence or approval state columns**. An `Explanation` is NOT equivalent to an independently verified citation/source.
- External right-to-use claims have NOT been independently established. All 2,500 questions must begin DRAFT/unclassified, with rights_checked=false and answer_checked=false until individually reviewed.

## Difference from historical P4 importer

Existing `scripts/import-asp-p4.mjs` is intentionally hardcoded for **1,625 items across FIVE legacy groups** [250, 625, 200, 300, 250], loaded from `src/data/aspQuestionBank.json`. It refuses any other count or domain split. Do **NOT** replace the public/demo `src/data/aspQuestionBank.json` or execute the existing importer with this uploaded workbook; it cannot accept 2,500/9 and raw correct answers could leak into a client bundle.

A separate future owner-approved **backend-only, dry-run-first, staged** P4 importer may accept the private candidate workbook or private server-side normalized payload. It must:
- Confirm the exact SHA/fingerprint, parse exactly 9×7 schema/2,500 source rows, convert A-D to server-private 0-based indexes and preserve all prompts/options/explanations precisely without scientific rewrites.
- Generate stable **candidate** source IDs from domain label + question-content fingerprint, with explicit source-to-ID and updated-content collision/diff report. Source row number is traceability metadata, **not** a stable identity across sorting.
- Keep original source sheet label in `legacy_group`; leave `domain_id=NULL`, `difficulty='unclassified'`, `approval_state='draft'`, `mock_exclusive=false`, `reference_text='' ` until a qualified SME verifies official ASP11 mapping, source/rights/citations and difficulty. Never infer that 9 sheets make domain mapping automatically approved.
- Compare against existing real `lms_questions` by ID/content/source in READ ONLY mode first; report new / duplicate / edited / already approved / attempted / mock-exclusive conflicts, and perform **zero production mutations** without separate explicit owner approval and rollback plan.
- Preserve P8e Level Up fixed correct target (N30: original ten Low, require seven correct at each Low/Medium promotion; hard stop at total N) and 200 exclusive Mock items. Select/mock-reserve only after full human review and independent rights confirmation, not automatically or randomly.

## Locally prepared reviewer workbook
A private review workbook `ASP_2500_Review_and_Quality_Audit.xlsx` is provided in the active conversation only. It retains all 9 original source sheets and adds:
- `ASP Intake Audit` aggregate source counts / caveats;
- `SME Review Queue`: 2,500 provisional hashed Source IDs; source sheet/Excel row; bounded question excerpt; PROPOSED (not confirmed) official ASP11 domain, dropdowns for domain confirmation, Low/Medium/High, answer and rights verification, reference, Topic/Lesson, reviewer notes, formula-backed manual readiness.
**No answers are marked as human-checked and no rights flag is preapproved.** The file should remain private; do not assume it exists in the GitHub repository.

## Real Supabase remains unknown
Prior P9C/P9C.1 queries audit the **actual database**, while this new XLSX audits a **candidate source file**. They are distinct. Do not claim that Supabase now contains 2,500 questions. Ask the owner for the aggregate P9C.1 Results CSV before designing an approved reconciliation. The old **1,625** reference still describes the prior candidate/demo source, not this new upload.

## Next safe step
1. Review this exact new source against the real P9C.1 database counts.
2. Build the new private dry-run importer/diff and SME review queue after approval.
3. Independently validate rights and answer keys, apply vetted official ASP11 mapping and calibrated difficulty, then reserve exactly 200 Mock questions (with P9B guards) and separately approve Practice candidates only through the independent-Admin workflow.
4. Verify real P8e bank availability, server-side privacy, Mock 200/300 engine and authorized deployment.

This document contains metadata only and **no proprietary question content**, answer keys, options, or user identifiers.
