# Technica LMS — P1 Production Foundation: Authentication & Data Model Design

> Prepared: 2026-10-30 (Africa/Cairo)
> Status: **DESIGN PROPOSAL FOR REVIEW; ZERO SQL DEPLOYED / ZERO APPLICATION CODE CHANGED**
> Depends on: [Master Blueprint](../../TECHNICA_LMS_MASTER_BLUEPRINT.md) and [P0 Source Audit](P0_BASELINE_AUDIT_2026-10-30.md).
> Existing app: React 19 / Vite 6 / JavaScript; data and login currently browser-demo only.
> Purpose: an implementable P1 specification that fixes P0-F01, F03, F04 and F07 before any Supabase integration.

## A. Approved invariants that P1 must preserve

1. Course → Domain → Topic → Lesson, reusable for all courses. ASP first; future course creation without hardcoding.
2. Exam Preparation now, Certificates future; English-first/i18n ready.
3. Existing accepted Technica light theme, admin Question Bank, v1.14 learner Saved removal, quiz navigation/flags, learning/player demonstration remain intact until independently replaced and tested.
4. Adaptive 70% stage promotion and 200 reserved ASP Mock questions/300 minutes remain server-side requirements for later phases; P1 must not embed a conflicting design.
5. No browser role/score/entitlement/timer as a trusted source. No commercial content or answer keys exposed through public JS/JSON.
6. Every change updates the master Blueprint and append-only BUG/decision/change history in the same reviewed work.

## B. Four architecture layers

1. **Frontend:** keep React Router + light existing UI, with AuthSessionProvider and service/repository adapters; the public catalog is safe and intentionally limited.
2. **Application API:** Supabase Edge Functions for sensitive workflows (role changes, enrollment/entitlement grants, secure question selection, scoring and mock reservations as later deliverables). Functions revalidate JWT, action authorization, quota and course scope.
3. **Database:** Supabase PostgreSQL with versioned migrations and explicit GRANT, RLS, foreign keys, server-only answer secrets and audit.
4. **Media:** private Supabase Storage for PDFs/images as appropriate; commercial video via independently selected protected playback provider. Signed token generation requires active entitlement; P1 establishes the authorization contract, not a DRM deployment.

## C. Canonical entity model: data ownership and relationships

### C1. Identity and access

| Entity | Important proposed fields | Ownership and notes |
|---|---|---|
| profiles | id = auth.users.id, name, locale, status, created_at | Learner sees/edits allowed own profile fields ONLY. No user-editable role |
| role_assignments | user_id, role, scope_course_id?, assigned_by, created_at, revoked_at | Trusted admin/service writes only. Owner-approved role set required before SQL |
| courses | id, slug, title, description, publication state, version, cover | Public catalog subset separate from protected fields |
| enrollments | user_id, course_id, status, start_at, expires_at | Backend/Admin granted only; learner reads own |
| entitlements | user_id, course_id, kind (trial/paid/admin grant), starts_at, ends_at, quota, source_id, status | Server-authoritative access to protected learning/assessment/media; never client-granted |
| audit_events | actor_id, action, object_type/id, allowed/denied, timestamp, sanitized metadata | Append-only server writes, no secrets/answer material |

**Important modeling choice:** trial and paid status should be **entitlements** rather than trusting a user-editable \`role='paid'\`; course authors need **course-scoped** access, not global author privilege.

### C2. Content and hierarchy

\`\`\`text
courses 1 → N domains
domains 1 → N topics
topics 1 → N lessons
lessons 1 → N lesson_blocks
lessons N ↔ N media_assets (via lesson_media)
courses 1 → N course_versions / published snapshots
topics 1 → N questions (primary classification)
lessons N ↔ N questions (optional educational linkage)
\`\`\`

Suggested keys:
- \`domains(id, course_id, slug, title, position, status)\`
- \`topics(id, domain_id, slug, title, position, status)\`
- \`lessons(id, topic_id, slug, title, position, publication_state, published_version_id)\`
- \`lesson_blocks(id, lesson_id, block_type, sanitized_payload, position)\`
- \`media_assets(id, owner_course_id, media_type, private_object_path, version, metadata)\`

Define foreign keys and uniqueness per parent (e.g. unique course+domain slug). Reject mismatched parent chains when linking questions, media, quiz templates or results. Archive rather than cascading deletion once real learner history exists. Course version snapshots prevent admin edits from rewriting learner's past progress/exams.

### C3. Question protection contracts (future P3–P7, accounted for in P1 schema)

- \`questions\`: opaque ID, course/topic/lesson link, source provenance, publicly safe publishing metadata, version, difficulty, status. **Do not** make raw answer columns directly readable to learners.
- \`question_answers\` or a private schema: answer keys and scoring material accessible only to trusted server service, never plain Data API learner SELECT.
- \`question_sources\`: original workbook name/sheet/row/immutable legacy ID, explanation/reference and content-rights status.
- \`question_reservations\` and \`mock_forms\`: enforce all non-mock exclusion in server selection before any protected items are served.
- \`exam_attempts/attempt_items/attempt_answers\`: immutable form version, deadline and idempotent saves for later implementation.

**Important:** This is a future-compatible data CONTRACT, not a claim to have implemented the adaptive/mock engine in P1.

## D. Proposed authenticated user lifecycle

1. Learner signs up with email/password, verifies email according to approved product policy.
2. Supabase Auth creates \`auth.users\` row. Trusted service or carefully reviewed database trigger inserts a \`profiles\` row with default **learner** status. No role field from browser metadata is trusted.
3. Login session is obtained and refreshed via official Auth client; frontend reads only allowed profile and authorized course catalog.
4. Paid/trial entitlement grants require trusted server action; public user cannot insert/update \`enrollments\` or \`entitlements\`.
5. Account deactivation/revocation blocks protected endpoints; MFA mandatory for high-privilege admins once established.
6. Password reset/logout/end session tested on multiple devices and refresh. Avoid assuming current \`src/lib/demoAuth.js\` accounts are real users.

**Bootstrap risk:** Auth triggers can block registration if they fail. Test fresh signup, duplicate events, provisioning retries/alerts and rollback. See https://supabase.com/docs/guides/auth/managing-user-data

## E. Permissions / row- and field-level data boundary

| Surface | Anonymous | Learner/trial | Paid learner | Course author | Admin |
|---|---|---|---|---|---|
| Public course catalog fields | Read | Read | Read | Read | Read/write |
| Draft course/content | Denied | Denied | Denied | Own assigned scope | Read/write |
| Published lesson protected blocks | Denied | Only trial-granted subset | Only active course entitlement | Assigned course | Controlled preview |
| Media original object/token | Denied | Scoped subset | Entitlement-checked | Only authorized assets | Authorized |
| Learner private profile/progress | Denied | Own | Own | Scoped aggregate with authorization only | Audited privileged scope |
| Role grants, payment/entitlement changes | Denied | Denied | Denied | Denied | Privileged audited path |
| Correct answers during active attempts | Denied | Denied | Denied | No general unrestricted access | Editorial privileged action only |
| Mock reservations and answer grading | Denied | Denied | Denied | Denied except explicit grant | Server/admin protected actions |

Public catalog should be intentionally constructed from safe metadata; **published content is not automatically free content**. For protected tables, RLS policy checks enrollment/entitlement, not just \`is_published\`. Private Storage access must independently honor the same entitlement.

### RLS/GRANT minimum requirements

1. Explicitly \`REVOKE\` undesired privileges, \`GRANT\` only necessary Data API actions, and \`ENABLE ROW LEVEL SECURITY\` on every exposed table. No anonymous writes.
2. As of **2026-10-30**, Supabase's existing-project default rollout means new \`public\` tables require explicit grant to be reachable via the Data API; do not confuse GRANT with RLS.
3. Restrict \`EXECUTE\` on functions, review \`SECURITY DEFINER\` functions, use fixed \`search_path\` and validate call permissions.
4. Service-role credentials stay server-side; never expose \`service_role\` or privileged DB credentials as \`VITE_*\` env vars.
5. RLS checks cannot be justified by frontend route guards alone. Direct API negative tests are mandatory.
6. When joining a lesson to a topic/course, ensure full ancestor entitlement and publication/version status, not only a checked lesson ID.

Official references:
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/managing-user-data

## F. P1 implementation sequencing (future; do not execute until reviewed)

| Step | Build task | Evidence before acceptance |
|---|---|---|
| P1.1 | Set up dedicated development/staging Supabase, environment and Cloudflare secrets plan | Environment names, no prod DB touched, no leaked secrets |
| P1.2 | Create versioned identity/profile + role tables and trusted default learner onboarding | Sign-up, sign-in, password reset and spoof-role tests |
| P1.3 | Build four-level content hierarchy tables with strict FK/unique constraints and controlled archive/version metadata | Course/domain/topic/lesson migration fixture and cross-parent negative tests |
| P1.4 | Introduce enrollment/entitlement tables and authorization helper; design safe public catalog/protected lesson split | User A/B, trial, expired and no-purchase authorization tests |
| P1.5 | Configure GRANT/RLS, Storage policies, secured server functions and audit | Anon, auth, course author, admin test matrix PASS in sandbox |
| P1.6 | Add frontend ProductionAdapter and AuthSessionProvider under explicit environment gate while preserving DemoAdapter | All accepted routes/UI and local demo remain functional; production uses only verified APIs |
| P1.7 | Create operations notes, migration/rollback, CI and browser test evidence | Reproducible build, audit evidence, reviewed sign-off |

### P1 explicit exclusions
- Do not import all 2,500 source workbook rows as live questions automatically (P3).
- Do not release 200 exclusive ASP mock questions before question provenance and security are proven (P7).
- Do not market user-localStorage learning progress as real production progress (P4).
- Do not activate real payments, DRM, Zoom or Certificates under P1.
- Do not rewrite UI colors, navigation, accepted admin screens or the removed learner Saved screen.

## G. P1 design decisions requiring owner acceptance

1. Signup model: public self-signup plus paid entitlement post-payment, versus invitation-only for any premium tracks. Default recommendation = public signup, protected content gated by purchases/trial.
2. Instructor/content author role: course-specific edit rights vs global authorship. Default recommendation = course-scoped.
3. Trial: availability and lesson limits to be chosen in P9; P1 supports a configurable entitlement without fixing quantities.
4. Account lifecycle: MFA policy for admin, suspended learner state, data retention/erasure.
5. Canonical naming: whether retain historical \`lms_\` SQL prefixes for migration compatibility; database design must stay consistent regardless.

The decisions above are **proposals**, not silently approved policy. Continue documentation, static design and tests planning; pause irreversible migration and code/release steps until scope is accepted.

## H. Status and audit note

- SOURCE-INSPECTED: legacy demo, proposed SQL, routes, and documentation.
- DESIGNED ONLY: schema hierarchy, Auth architecture, RLS/GRANT matrix, profile lifecycle and test plan.
- NOT EXECUTED: migrations, actual Auth configuration, RLS checks, end-to-end tests, payments, protected streaming, Cloudflare deployment.
- Owner-facing readiness: **P1 DESIGN AVAILABLE FOR REVIEW / NOT IMPLEMENTED**.
- 2026-10-30: New P1 document created; documentation-only.
