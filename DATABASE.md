# Database Direction — Technica LMS

**Current status:** browser-local demo. The source's supabase/001_lms_schema_PROPOSED.sql is not a deployed production migration. Do not apply it to any shared project without a new review.

**Approved taxonomy:** Course → Domain → Topic → Lesson. Questions map to course/domain/topic and optional lesson; preserving stable original IDs, answers, references and question history is mandatory.

**Planned data domains:** profiles/roles, courses/domains/topics/lessons/lesson blocks, question bank/choice/versions and import provenance, mock-exclusive reservations and exam form versions, exam attempts/answers/timers, learning events/video progress, diagnostic reporting, entitlements/subscriptions/payment events and audit logs.

**Required constraints:** prevent mock-exclusive question selection by all non-mock sessions through trusted server access; server-attempt deadline exactly 300 minutes and unique attempt question IDs; attempt form/question snapshots immutable. No answer keys delivered before allowed reveal.

**Migration procedure:** numbered forward migrations, explicit RLS/grants, least privilege, backup, verify with disposable test data, recovery notes, review query plans and ensure no old progress/results loss. Admin UI-only roles are insufficient. Record actual SQL lineage and test results when integration begins.

See Blueprint, docs/current/LOGIC_REGISTRY.md and docs/current/SECURITY_PLAN.md.


## Qualifications portfolio

Migration `supabase/migrations/202611220001_qualification_portfolio.sql` requires the existing LMS profiles and Supabase Storage schemas. It provisions an empty Qualifications schema and a private evidence bucket. Installed on the Technica Account production project on 2026-11-22 as ledger version `20261122073054`; existing LMS records were untouched. The qualification data model is independent of course and subscription entitlements.

In staging, the centre database operator creates a **draft** in `lms_qualification_versions` with a unique catalog key and version, the approval reference and the exact declaration. Then populate `lms_qualification_units`, `lms_qualification_outcomes`, `lms_qualification_criteria`, and approved HTTPS `lms_qualification_resources`. Set `published_at` only after the complete rubric is verified. The published parent and its children are sealed. Future rubric changes require a separate draft version with its own child rows. Historical catalogue and PDF fixtures are never seeded into the live schema.

Provision `lms_qualification_enrolments` against the published version using three existing active, distinct LMS profile IDs. The learner, assessor and verifier roles are scoped to that enrolment. Learners and reviewers open **Qualifications** using their regular LMS account. Optional outcome-specific dates live in `lms_qualification_deadlines`. An assigned verifier can confirm completion only when all required outcomes are verified and no active review remains. Leave `allow_certificate_recording` at its default unless the centre has authorized the verifier to record an already issued certificate reference for that version. Official issuing and delivery remain with the awarding body.

The migration has no automatic historical-data import and the ordinary browser has no publication or assignment administration rights. Verify accepted uploads in real Supabase Storage before release, including authenticated enrolment isolation and file type/size metadata for each allowed format. The bucket checks declared MIME and byte count. Content scanning and retention of unused uploads need a centre-approved operational workflow before production usage.

The disposable test `scripts/test-qualification-portfolio-postgres.sql` exercises the roles and lifecycle. It uses synthetic data in a rolled-back transaction after applying the migration with the repository's P1 and Storage fixtures.
