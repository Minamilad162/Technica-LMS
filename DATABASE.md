# Database Direction — Technica LMS

**Current status:** browser-local demo. The source's supabase/001_lms_schema_PROPOSED.sql is not a deployed production migration. Do not apply it to any shared project without a new review.

**Approved taxonomy:** Course → Domain → Topic → Lesson. Questions map to course/domain/topic and optional lesson; preserving stable original IDs, answers, references and question history is mandatory.

**Planned data domains:** profiles/roles, courses/domains/topics/lessons/lesson blocks, question bank/choice/versions and import provenance, mock-exclusive reservations and exam form versions, exam attempts/answers/timers, learning events/video progress, diagnostic reporting, entitlements/subscriptions/payment events and audit logs.

**Required constraints:** prevent mock-exclusive question selection by all non-mock sessions through trusted server access; server-attempt deadline exactly 300 minutes and unique attempt question IDs; attempt form/question snapshots immutable. No answer keys delivered before allowed reveal.

**Migration procedure:** numbered forward migrations, explicit RLS/grants, least privilege, backup, verify with disposable test data, recovery notes, review query plans and ensure no old progress/results loss. Admin UI-only roles are insufficient. Record actual SQL lineage and test results when integration begins.

See Blueprint, docs/current/LOGIC_REGISTRY.md and docs/current/SECURITY_PLAN.md.
