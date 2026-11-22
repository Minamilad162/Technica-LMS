# Technica LMS — Assessment access activation (22 November 2026)

## Confirmed live database state (read-only)

Supabase project: `klmwiivitgbyjbynxwbg` (Technica LMS, not CHEIRON Stop Card).

The seven qualification migrations `202611220001` through `202611220007` are installed. Centre administration, publishing, reviewer authorization, enrolment and protected portfolio RPCs are present. This audit used read-only database queries; it did not approve, publish, or enrol any person.

| Programme | Edition | Official Unit count | Source Criteria | Centre-approved Unit briefs | Published | Real enrolled learners |
|---|---|---:|---:|---:|---|---:|
| OTHM Level 6 OHS | Nov 2026 | 7 | 120 | 0/7 | No | 0 |
| OTHM Level 7 OHS Management | Dec 2023 | 6 | 65 | 0/6 | No | 0 |
| ProQual Level 6 NVQ OHS Practice | Feb 2018 | 10 | 202 | 0/10 | No | 0 |
| OTHM Level 6 legacy | Dec 2023 | 7 | 123 | 0/7 | No | 0 |

There are **30 already-populated centre-authored draft Unit briefs**, but **none approved** across the four source-backed editions. The seven November 2026 OTHM Level 6 Unit briefs are pre-populated (approximately 2,400–3,800 instruction characters each) and ready for **human review**, not automatic approval.

There are **zero active documented Assessors, zero active Internal Verifiers, zero centre resource documents, zero real enrolments** and zero source-backed certificate-issuer authorizations.

A separate `technica-qf-private-sandbox` programme is published in the database. **It is not an awarding-body-approved source qualification** and must not be presented as evidence that a real programme is approved.

## Implemented safely in the frontend

The Centre Admin page now has a read-only **Assessment access readiness** summary driven by the existing authenticated administrator RPCs. It lists the number of approved briefs, source rubric completeness, publication status, authorised reviewers, enrolled learners, and the next permitted action. The **Review next Unit** button takes the administrator to the first unapproved Unit.

No frontend flag can bypass the real database checks; there is no automated approval or award. The reference syllabus stays separate from an enrolled learner portfolio.

## Controlled activation sequence — OTHM Level 6, November 2026

1. Centre verifies **OTHM Level 6, November 2026** is the appropriate specification; review every Unit's existing draft **Assessment Brief**, required evidence methods and criteria. Approve each Unit **only with genuine centre authority**.
2. Upload genuine approved centre assessment materials if required; pending documents are private, and the centre must explicitly approve them.
3. Authorise one competent **Assessor** and one distinct competent **Internal Verifier** using verifiable competence references. The ordinary LMS administrator role does not itself grant professional assessment authority.
4. When all seven Units are approved, a duly authorised centre administrator records the genuine centre approval reference and full learner declaration, then **releases** that exact edition. This is a consequential administrative action, not a test button.
5. Enrol a real learner and assign the qualified Assessor and Verifier; test evidence upload, evidence-to-criteria mapping, assessor feedback, verification, resubmissions and audit trail with real approved permissions.
6. Keep actual certificate recording **off** until the awarding body explicitly authorises the centre to record real externally issued certificate references.

## Verify after changes

- The dashboard must display exactly the centre's current database status; it must never claim that source-only content is an assessment.
- Run `npm run test:qualification:readiness` and the normal production build.
- A real enrolled learner opens **Open portfolio**; without enrolment the same programme remains read-only **Explore actual Units**.
- Verify student / Assessor / Verifier isolation and RLS before the first live assessment.

**Not yet authorized:** No genuine centre publishing reference, Assessor / Verifier competence evidence, or real learner assignment was provided during this task. Therefore no production publication, professional authorization, enrollment, or certificate action was performed.
