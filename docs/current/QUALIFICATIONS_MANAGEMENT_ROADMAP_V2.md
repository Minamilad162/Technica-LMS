# Technica Consult LMS — Qualifications Management Roadmap V2.0

Owner-approved direction: 24 November 2026.
Canonical execution tracker: update this file after every implementation session.
Application baseline: `6c5419576ae07705dcff6ddc974ff36986da33c7` (PR #121).
Initial implementation progress: **0/10 phases accepted**. Next: Q00, then Q01.
Scope: OTHM Level 6 (2026 and 2023 editions distinct), OTHM Level 7, ProQual Level 6 NVQ, and isolated private testing.

## Baseline and constraints

- Official syllabus is read-only until the exact edition is released and the learner has an eligible enrolment. The reported Evidence upload message reflects that gate, not an upload failure. Recheck current production state before changing anything.
- Existing Centre Admin already handles Unit brief approval, release, staff authorisation, enrolment, reviewer reassignment and issuer authority, but the controls are buried in a long page.
- Existing portfolios already support evidence, cross-Unit mapping, versioned claims, assessment, verification, registration, contact, metrics and partial task/scheduling views. Reuse components, tables and RPCs rather than creating parallel systems.
- Historical 22 November audit recorded zero released official editions, zero real enrolments and zero active documented reviewers; this is not a fresh database check. See [activation record](QUALIFICATION_ASSESSMENT_ACCESS_ACTIVATION_2026_11_22.md) and [reference workflow](QUALIFICATION_REFERENCE_WORKSPACE_2026_11_22.md).
- The owner confirms Technica is approved for supplied qualification editions. Record genuine centre-selected assessment methods, approval references, reviewer competence and applicable issuer authority. Do not invent approval data or automatically approve official qualifications.
- Preserve original global navigation, qualification internal tabs, numbered Unit strip, English UI, Technica fonts/logos/icons and compact approved design. Match real and private testing visuals without mixing data or permissions.

## Operating model

Admin Qualification Management Center: Dashboard, Qualifications, Learners & Enrolments, Assessors & Verifiers, Tasks & Assessment Plans, Assessment Center, Certificates, Reports & Audit Log. Visible entry points from Admin Users > Assign Qualification and Qualifications > Enrol Learner must invoke the same validated wizard.

Separate one-time edition setup/release from daily learner enrolment and monitoring.

**Owner clarification — independent qualification lifecycle (24 November 2026):** An edition may be created, configured, approved and released with zero students, zero enrolments and no assigned enrolment-specific assessor/verifier. Having no subscribers or assigned students is a normal operational state, not a readiness blocker. Do not require a learner or learner-specific reviewer assignment to create, save or release a qualification. Retain genuine centre approval and any actual applicable programme-level staffing requirements; do not confuse these with individual enrolment assignments. A released edition with no learners is displayed as Released / Ready for enrolment, with 0 enrolled learners. Reviewer assignment and independent reviewer checks occur when enrolling a learner. Reusable assessment/task templates may be prepared before enrolment; individual tasks, deadlines, evidence and decisions require the relevant enrolment. Never manufacture an enrolment to activate a qualification. Publication does not grant a learner assessment access automatically. Each enrolment pins an exact version, learner, authorised assessor, independent verifier, start date and optional target date. Admin may hold several roles and select their own eligible account as assessor OR verifier on a given enrolment, with explicit workspace switching. Keep current distinct-person assignment guard; prevent verification of one's own earlier assessment even after reassignment. Admin alone cannot grade. Role authority is server-controlled, documented and revocable.

Tasks reference real Unit/LO/AC identifiers and existing claim/submission records; one evidence file can support multiple Units. No separate grading engine. Maintain separate activation, enrolment, task, claim and certificate states. Assessment task flow: Assigned -> In progress -> Submitted -> Awaiting assessment -> Changes requested / resubmission OR Awaiting verification -> Return to assessor OR Verified. Derive completion from applicable verified required claims; non-grading tasks have explicit separate semantics. Overdue is a computed flag. Preserve revisions, feedback, decisions, private storage and audit trail.

## Phase tracker

Status vocabulary: PLANNED, IN PROGRESS, BLOCKED, IMPLEMENTED, VERIFIED, DONE. IMPLEMENTED means code exists; VERIFIED means required automated/integration tests passed; DONE requires acceptance evidence, merge and applicable rollout verification. Progress = DONE phases / 10. Baseline functionality is not counted as new phase completion.

| ID | Phase | Status | Dependencies | Next evidence / blocker |
|---|---|---|---|---|
| Q00 | Baseline & architecture | IN PROGRESS | None | Repository/RPC inventory and 24 Nov production edition counts verified read-only; remaining migration/deployment/route audit |
| Q01 | Admin Management Center | IN PROGRESS | Q00 | Approved catalogue/setup UI merged (PR #122), CI verified; authenticated visual QA and remaining management surfaces pending |
| Q02 | Qualification activation | IN PROGRESS | Q01 | Simplified Draft/Live publication UI merged PR #123, CI passed; live visual QA and genuine centre publication pending |
| Q03 | Roles & staff management | IN PROGRESS | Q01 | PR #126 merged; role selection, inline authorisation, reassignment guards and workload CI verified, production RPC installed; live workspace/visual acceptance pending |
| Q04 | Learner enrolment engine | IN PROGRESS | Q02, Q03 | PR #126 merged; assignment and Users entry CI verified; production migration installed; live enrolment and visual acceptance pending |
| Q05 | Assessment plans & tasks | IN PROGRESS | Q04 | Approved four-step UI; reusable templates and individual assignments implemented in branch, CI and live validation pending |
| Q06 | Learner workspace | PLANNED | Q05 | Existing Evidence/Matrix/Outcome integration |
| Q07 | Assessor & verifier workspaces | PLANNED | Q04, Q05 | Independent review queues |
| Q08 | Monitoring & completion | PLANNED | Q05–Q07 | Real metrics, notifications, issuer safeguards |
| Q09 | E2E QA & release | PLANNED | Q01–Q08 | Staged test identities and production verification |

## Detailed checklist and acceptance criteria

### Q00 — Baseline & architecture
- [ ] Q00.1 Verify main SHA, deployed revision, Technica Supabase project and migration ledger read-only.
- [ ] Q00.2 Inventory each exact edition: Units/LOs/AC, approved briefs, release, active reviewers, enrolled learners; exclude sandbox.
- [ ] Q00.3 Map existing admin/user routes, RPCs, data model, RLS and storage; identify reuse versus necessary changes.
- [ ] Q00.4 Document role permissions, historical self-review prevention, task/claim relationship, version pinning and centre approval inputs.
- [ ] Q00.5 Inspect desktop/mobile actual user journey where access permits; reproduce upload/enrolment blocker.
Acceptance: dated baseline report, verified facts and explicit unknowns; no production writes.

### Q01 — Admin Management Center

Owner approved the 24 November mockup of the blue/white administrator catalogue, KPI row, selectable edition cards, right-hand setup workflow, and selected-edition summary/tabs with a zero-enrolment ready state. Preserve the existing app shell and use actual source edition names/counts, not illustrative figures. New-edition authoring, archive, actual assessment queue totals and full reporting are not exposed as fake controls; they need their own governed implementation. The Q01 dashboard uses approved Unit brief counts instead of unavailable assessment totals. Existing Unit briefs, protected materials, release, enrolment, reviewer authorisation, programme updates and issuer authority remain real actions.

- [ ] Q01.1 Add clearly visible admin menu entry and compact dashboard/navigation.
- [ ] Q01.2 Separate qualifications, enrolments, staff, tasks, assessment, certificates and reporting. No dead controls or unlabeled unfinished modules.
- [ ] Q01.3 Real version/readiness cards, blocker explanations and direct action links. Show zero enrolments as a normal empty state, not an activation blocker; keep edition status independent of learner assignment.
- [ ] Q01.4 Visible Enrol Learner and Assign Qualification actions, eventually shared Q04 wizard.
- [ ] Q01.5 Preserve Unit brief editor, material approval, updates/appointments, release, staff/reassignment and issuer controls; remove repeated sections.
Acceptance: enrolment and staff reachable within two navigation actions; existing functions preserved; non-admin access denied; desktop/mobile checked.

### Q02 — Qualification activation

**Owner-approved simplification (24 November 2026):** Retain Overview, Units, Materials, Assessment Plans and Settings; no separate activation wizard. Sticky Save Draft persists the selected edited Unit brief through the existing admin RPC; uploaded resources have their existing upload/approval lifecycle. Publish Qualification opens a compact dialog showing actual source/brief/method checks and requires genuine centre reference, full learner declaration and fresh attestation. Status is Draft or Live based on persisted publishedAt, independently of enrolment count. Publication locks the edition and does not enrol anyone or authorise certificate issuing. Archive and creation/cloning of new editions are separate governed features, not implemented by this change. No database migration or production data mutation.
- [ ] Q02.1 Show exact official source, version, reference, actual rubric and brief counts.
- [ ] Q02.2 One-time guided review: official criteria, real methods/instructions, resources, declaration, genuine centre reference and authorised release.
- [x] Q02.3 Make readiness blockers actionable instead of generic disabled forms. PR #123: dialog links to actual blocking Unit; automated qualification tests passed.
- [ ] Q02.4 Verify applicable awarding-body/centre procedures and preserve release guards and immutable pinned edition.
- [ ] Q02.5 Test reference-only access before release and enrolment eligibility afterward, including creating and releasing a fully approved edition with zero learners and no enrolment-specific reviewer assignments.
Acceptance: authorised human can release exact approved edition once; missing methods/briefs and non-admin release rejected by server. Actual release requires genuine records, separate from implementation.

### Q03 — Roles & staff management

**Owner clarification (24 November 2026):** Reviewer assignment is per learner enrolment pinned to an exact Live qualification edition, never a single reviewer assignment shared across the qualification. Provide one searchable Assign Qualification workspace with registered active learner account, Live edition, Assessor, Internal Verifier, start date and optional target date. Existing active Admin accounts must be discoverable by name/email in both reviewer selectors. Show their actual role-specific competence/authorisation status and allow the authorised centre administrator to record genuine role authorisation inline if needed; Admin status alone does not confer assessment authority. Do not fabricate competence records. The enrolment can only be saved with eligible distinct reviewers and learner, enforced by the server. Existing staff authorisation/revocation rules remain in force. The same admin can hold both professional roles and serve in different enrolments, subject to independent review and historical self-review guards. Provide central enrolment table with filters and an Edit Reviewers action prefilled with current assignments, permitting change of either or both reviewers, using audited reassignment and preserving historical decisions/evidence. Staff directory remains a supporting screen, not the primary assignment workflow. Coordinate Q03 and Q04 designs to avoid duplicate assignment forms; retain the approved UI gate before implementation.
- [ ] Q03.1 Search users and manage multiple documented reviewer role authorisations on the same account.
- [ ] Q03.2 Role workspace switch using server-authorised eligibility/assignments, never client privilege toggles.
- [ ] Q03.3 Eligible admin self-selection as assessor OR verifier; distinct reviewers per enrolment and historical own-work verification prevention.
- [ ] Q03.4 Revocation, audited reassignment, workload and impact on open portfolios.
- [ ] Q03.5 Tests for unqualified admin, multi-role admin across different enrolments, revoked users, unrelated identities and past-review conflicts.
Acceptance: independent reviewer decisions enforced server-side; assigned authorised users see only allowed data; audit preserved.

### Q04 — Learner enrolment engine

**Owner-approved compact form refinement (24 November 2026):** Replace separate search and select fields with a single accessible searchable dropdown, remove the inline competence-reference form, add optional enrolment/reassignment notes, and record explicit centre reviewer approval through Assign/Save. An active admin may be selected for both reviewer assignments on the same enrolment; this supersedes the earlier distinct-assignment rule only. The learner must be separate. Independent verification of the person's own assessment remains blocked server-side; reassign an independent reviewer before such verification. No fabricated external qualifications or competence records. Retain original navigation, real data and prior audit records.

- [ ] Q04.1 Shared searchable assignment workspace from Users and Qualifications: active learner account, exact Live edition, assessor, verifier, start/target dates, confirm. Reviewer selectors discover registered active Admin accounts and display real role eligibility; allow governed inline authorisation rather than requiring separate navigation.
- [ ] Q04.2 Reuse admin_assign RPC; validate active user, version, date order, duplicates and reviewer conflicts server-side.
- [ ] Q04.3 Central searchable learner/enrolment list/detail, assignment status, deadlines, portfolio link, audited reviewer change (prefill both current reviewers; allow changing either or both). Preserve historical evidence and decisions. Separate subscription and qualification access.
- [ ] Q04.4 Immediately show assigned real qualification in My Qualifications, open actual portfolio and Evidence without private sandbox fallback.
- [ ] Q04.5 Explain unavailable evidence access accurately with appropriate support/admin route.
Acceptance: eligible admin enrols real user without SQL; learner opens correct portfolio and uploads permitted files; assigned reviewers see it; unrelated users denied. No fabricated production records.

### Q05 — Assessment plans & tasks
- [ ] Q05.1 Design reusable approved templates per exact edition (including editions with zero learners) and individual enrolment plans.
- [ ] Q05.2 Fields: title, instructions, learner/enrolment, related Units/LOs/AC, evidence requirements, authorised attachments, assigned assessor, deadline, status, feedback/revision references.
- [ ] Q05.3 Admin/assigned assessor creates and schedules tasks with multi-Unit support and template reuse.
- [ ] Q05.4 Integrate versioned claims, submission snapshots, feedback and resubmission; derive completion and overdue correctly; audit edits/cancellation.
- [ ] Q05.5 Add only necessary forward migrations/RPCs with RLS, grants, idempotency, ownership, role/edition validation and concurrency checks.
Acceptance: actual assigned task reaches learner with instructions and deadline; criteria belong to correct edition; upload alone cannot mark task verified; no parallel grading system.

### Q06 — Learner workspace
- [ ] Q06.1 Prominent My Tasks, active/overdue/returned/submitted/completed filters, next action and deadlines.
- [ ] Q06.2 Task opens existing Outcome, Evidence upload/written evidence and cross-Unit Matrix mapping.
- [ ] Q06.3 Governed submission, actual criterion coverage, reviewer feedback, locked snapshots and resubmission.
- [ ] Q06.4 Preserve Overview, Course, Evidence, Matrix, Registration, Contact, Metrics, Study Library and numbered Units; consistent real/test styling.
Acceptance: learner completes task, maps one file to multiple eligible Units, submits, receives changes and resubmits; other portfolios and locked snapshots protected; desktop/mobile checks.

### Q07 — Assessor & verifier workspaces
- [ ] Q07.1 Assessor queue: assigned learners, new submissions, returned work, overdue tasks, pending criteria, workload, filters and direct review.
- [ ] Q07.2 Reuse criterion-level assessment and feedback/return/accept RPCs; manage assigned tasks within role.
- [ ] Q07.3 Verifier queue: assessor decisions, submitted snapshots, feedback and accept/return for reassessment.
- [ ] Q07.4 Preserve role isolation, immutable revisions, independent verification and audited transitions; no private draft exposure or admin grade override.
Acceptance: learner submit -> assessor return -> resubmit -> assessor accept -> distinct verifier return -> assessor follow-up -> verifier accept; stale, out-of-order and self-review attempts rejected.

### Q08 — Monitoring, notifications & completion
- [ ] Q08.1 Actual KPIs and drilldowns: active enrolments, progress, pending assessment/verification, overdue tasks, completed learners and reviewer workload. Label count units; exclude sandbox by default.
- [ ] Q08.2 Scoped deduplicated in-app notifications for assignment, deadlines, submissions, feedback, returns, verification and completion. Email only when separately configured/authorised.
- [ ] Q08.3 Reports and audit log by version, learner, reviewer, date and status; permission-scoped exports, minimal sensitive profile exposure.
- [ ] Q08.4 Actual verified required Outcomes and declaration govern completion; only record genuine externally issued certificate under applicable issuer authority.
Acceptance: real counts reconcile with drilldowns, notifications reach proper users once, no bypass of completion or certificate guards.

### Q09 — End-to-end QA & release
- [ ] Q09.1 Production build, existing qualification/readiness/reference regression, new workflow tests, disposable PostgreSQL RLS/role smoke tied to exact SHA.
- [ ] Q09.2 Controlled staging/sandbox E2E with distinct designated identities; positive/negative cases, file limits, private storage, multi-Unit mapping, revisions/concurrency.
- [ ] Q09.3 If required, migration preflight, ledger, data-preserving rollback/forward recovery and correct Technica target.
- [ ] Q09.4 Visual QA all four workspaces desktop/mobile; preserve navigation/branding; no unnecessary whitespace.
- [ ] Q09.5 Merge, verify main CI and Cloudflare deployed revision, authenticated live routes; actual centre activation/enrolment smoke only with genuine authority.
- [ ] Q09.6 Operational guide, known limits, owner acceptance and tracker evidence.
Acceptance: required checks passed, deployment independently verified, acceptance recorded; do not claim live from CI alone.

## Implementation and tracking rules

- **Owner UI approval gate:** Before implementing each UI-bearing phase or materially different screen, prepare a faithful high-fidelity mockup using actual system scope and existing Technica branding/navigation, present it to the owner, and obtain explicit approval. Record approved design reference and any changes in the session log. Do not implement unapproved UI. For non-visual audit/backend work, present the relevant workflow/technical plan rather than inventing a screen. Keep mockup data illustrative and distinguish it from real production data.
- Small coherent PRs by phase; Q02/Q03 can run in parallel after Q01, Q06/Q07 after dependencies.
- No destructive resets, fake official data, approval bypass, self-verification, or weakening existing role/RLS/storage protection.
- Additive versioned migrations only where needed; preflight, tests and correct project verification. Separate development test writes from authorised production actions.
- At every session start, read this file; choose next unblocked phase and checklist IDs. At end, update status, checkboxes, exact PR/commit/migration IDs, automated and manual test results, deployment proof, blockers and next action. Mark only verified tasks complete. Never silently omit failures.
- Report phase progress separately from code/CI/deployment and real centre operational readiness.

## Session log

| Date | Phase | Change / evidence | Status | Next |
|---|---|---|---|---|
| 2026-11-24 | Planning | Owner approved V2 scope; roadmap recorded. Baseline PR #121. No new code or production data changes. | Roadmap established | Q00 baseline audit, then Q01 admin redesign |

| 2026-11-24 | Planning | Owner clarified zero-student qualifications are valid; edition activation independent of enrolment and learner reviewer assignment. Added UI mockup approval gate before implementation. | Requirements updated; no code or production data changes | Q00 audit; Q01 revised mockup for approval |

| 2026-11-24 | Q01 | Owner approved revised qualification setup mockup. Implemented source-backed admin dashboard, edition filters/grid/list, workflow, detail tabs and separate admin navigation on branch codex/q01-admin-approved-design. Existing RPCs retained; no migration or production mutation. | IN PROGRESS — CI and authenticated visual QA pending | Complete validation, merge only after checks; finish Q00 live audit before further phases |

| 2026-11-24 | Q00/Q01 | PR #122 merged at 68fef8243a6c3d79933da72957625681fd1d0d8c. Production build, qualification regression and disposable PostgreSQL role isolation CI passed (run 45338207225). Read-only production audit: four official editions, zero released, zero approved Unit briefs, zero enrolments. | Approved catalogue/setup subdeliverable merged and CI verified; full Q00/Q01 acceptance still pending | Verify Cloudflare deployment and authenticated desktop/mobile rendering; obtain owner acceptance before next UI phase |

| 2026-11-24 | Q02 | Owner approved integrated Save Draft/Publish approach. PR #123 merged at 28e4e2c1a65a63302309cdaea2355163c18204c5; validate and disposable PostgreSQL CI passed (run 45343338463). No migration or live publication. | Integrated publication UI CI-verified; full Q02 acceptance pending | Check deployed UI and genuine authorised publication; Q03 design approval before implementation |

| 2026-11-24 | Q02 | Owner requested Approve All Unit Briefs alongside individual approval. PR #124 merged at b814b1a209e7dab54e74571c3b93896c632f7b8e; CI run 45344657403 passed, including atomic rollback, stale text, role isolation, preserved approvals, and published-edition lock. Migration 202611240001 applied to Technica production; RPC and privileges verified. Fixed pre-existing ambiguous alias in individual brief RPC. No Unit approvals or publications were performed in production. | Bulk approval implemented and database verified; visual rollout pending | Owner reviews deployed screen and performs genuine centre approval |

| 2026-11-24 | Q02 | Owner requested editable publication defaults. Proposed learner declaration and edition-specific internal publication decision reference, never an invented awarding-body approval. Existing explicit human sign-off and publication audit remain mandatory. Q03 mockup to be reviewed before implementation. | Implementation under validation | Verify CI and deployed UI; Q03 design approval |

| 2026-11-24 | Q02/Q03/Q04 | PR #125 merged at 0dd1e0f12afb033320fbc2bca40e06653e4f1fd1 after CI run 45345574620 passed both validate and PostgreSQL smoke. Editable internal publication reference and proposed declaration defaults; no production publication. Owner clarified learner-specific assignment via searchable active user/Admin dropdowns, inline genuine reviewer authorisation and editable individual assignments. | Q02 defaults merged/CI verified, rollout not independently verified; Q03/Q04 UI review pending | Present revised central enrolment assignment mockup, obtain approval before implementation |

| 2026-11-24 | Q03/Q04 | Owner approved central assignment design. Implemented shared Assignment Workspace, independent server searches of registered learners and admin/authorised reviewer candidates, inline explicit competence approval, prefilled reviewer editor, role-specific staff workload, Users entry, duplicate guard and historical self-verification protection. Migration 202611240002 and disposable SQL tests added. | Implementation in branch codex/q03-q04-enrolment-management, validation pending | Validate CI, deploy migration only after checks, verify Cloudflare and real authorised enrolment (zero live official editions in latest read-only audit) |

| 2026-11-24 | Q03/Q04 | PR #126 merged at 4312b2e2f240df6dd6c538f449f34663a32d06f6 after CI run 45347344399 passed frontend build/regression and PostgreSQL lifecycle/role tests. Corrected SQL predicate syntax identified in earlier disposable run. Migration 202611240002 installed on Technica production; directory RPC, authenticated/anon grants, IDs, duplicate, reassignment and historical self-verification guards verified. Read-only audit: 6 active accounts, 2 active admins, 0 authorised assessors, 0 authorised verifiers, 0 real enrolments. No production enrolments or authorisations fabricated. | Implemented and verified CI/database; authenticated live visual QA and real publication/assignment still required | Review both admin entry points on deployed site; owner publishes an approved edition and records genuine staff authorisations before enrolling; Q05 design gate remains |

| 2026-11-24 | Q04 | Approved compact assignment mockup implemented on codex/q04-compact-enrolment-form, with combined searchable account controls, optional note, single-step audited staff approval and same-account role allocation while preserving independent decisions. New migration 202611240003 and CI integration tests. | PR #127 merged at f0272132759819ac88c43d87c9097725ace69483; CI run 45348973331 passed; migration 202611240003 installed and production RPCs, note column, same-account allocation and independent decision guard verified | Authenticated Cloudflare visual QA and owner acceptance pending |

| 2026-11-24 | Q03 | Owner approved revised Assessors & Verifiers mockup. Implemented blue header, two-column authorisation form with guide, responsive live role cards and role-specific revoke shortcut. Existing directory, competence attestation, workload and audited revocation RPCs preserved. UI-only; no database mutation or migration. | PR #128 merged at f3696983938dbebede5660c98fec58b9a81d88a7; CI run 45350488588 passed build, frontend regression and PostgreSQL lifecycle/role isolation; no migration required | Authenticated Cloudflare visual QA and owner acceptance pending |

| 2026-11-24 | Q05 | Owner approved four-step task builder. Task Templates belong to the exact qualification edition and can exist without learners. Assigned Tasks belong to individual enrolments with saved instructions, selected criteria across Units, approved materials, individual due dates and existing reviewer assignments. Supports direct individual tasks, approved template reuse, assessor assignment for own portfolios and learner task display linked to existing outcomes/evidence. Migration 202611240004, no separate grading engine. | Code in branch; CI and production validation pending. Cancellation/rescheduling and full Q06/Q07 acceptance remain open. | Test and verify rollout before marking phase complete. |

### Production edition audit — 24 November 2026

| Edition | Units | Outcomes | Criteria | Approved briefs | Released | Enrolments |
|---|---:|---:|---:|---:|---|---:|
| ProQual NVQ L6 February 2018 | 10 | 45 | 202 | 0 | No | 0 |
| OTHM L6 December 2023 legacy | 7 | 29 | 123 | 0 | No | 0 |
| OTHM L6 November 2026 | 7 | 25 | 120 | 0 | No | 0 |
| OTHM L7 December 2023 | 6 | 19 | 65 | 0 | No | 0 |

Source: read-only aggregate query on Technica production Supabase, 24 November. No real records were changed. CI uses disposable PostgreSQL; live activation and authenticated visual QA remain separate. An edition can be active with zero enrolments after genuine centre release.

### Next session
Read this roadmap. Finish Q00 fresh production/deployment audit and Q01 acceptance (including visual QA); confirm real edition release/enrolment access without fabricating approvals. Q02 simplified UI approved and merged; verify authenticated Cloudflare deployment and authorised actual publication before marking DONE. Prepare Q03 reviewer management design for owner review next.
