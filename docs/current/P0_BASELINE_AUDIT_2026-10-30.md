# Technica LMS — P0 Baseline Audit and P1 Execution Gate

> Date: 2026-10-30 (Africa/Cairo)
> Authority: [TECHNICA_LMS_MASTER_BLUEPRINT.md](../../TECHNICA_LMS_MASTER_BLUEPRINT.md) and [AGENTS.md](../../AGENTS.md)
> Scope: **SOURCE-ONLY AUDIT** of GitHub-connected \`main\`. Documentation only. NO code modification, database migration, deployed security check, browser test or live release.
> Project state: **P0 IN PROGRESS / NOT PASSED**. Paid production: **NO-GO**.
> Observed application version: \`package.json\` 1.15.0 (React 19 / Vite 6 / JavaScript+JSX).
> Prior referenced source baseline: commit \`8021f604...\` (v1.15 demo); subsequent documentation commit \`942204da51d7e55dc7e00ac14719d980cd2826f2\`. This report does **not** claim to independently verify current branch HEAD or deployed artifact.

## 1. Purpose and method

Compare implemented code and proposed SQL to owner-locked product requirements. All evidence here comes from reading concrete GitHub repository files through the connected GitHub interface, not from running the application. An attempted direct git network checkout from the current working environment failed with DNS resolution; therefore npm scripts, Vite build, CI job outcomes, SQL security probes, browser QA and runtime monitoring have **not been executed**. The connector's workflow query did not surface a validating PR-triggered run for the documentation commit; do not infer overall GitHub Actions CI status from that limited query.

Read files:
- \`package.json\`, \`README.md\`, \`src/App.jsx\`, \`src/main.jsx\`
- \`src/lib/store.jsx\`, \`src/lib/demoAuth.js\`, \`src/lib/supabase.js\`, \`src/lib/courseWorkspace.js\`
- \`src/pages/PracticePage.jsx\`, \`src/pages/QuizPage.jsx\`, \`src/pages/LearningPage.jsx\`
- \`src/data/courseCatalog.js\`, \`supabase/001_lms_schema_PROPOSED.sql\`, \`supabase/README.md\`
- \`.github/workflows/ci-security.yml\`, \`scripts/check-project.mjs\`
- \`docs/current/SECURITY_PLAN.md\`, \`docs/current/TEST_PLAN.md\`, \`docs/current/LOGIC_REGISTRY.md\`, \`docs/current/AUDIT_PLAYBOOK.md\`.

## 2. Findings — prioritized

| ID | Severity | Evidence | Observed gap / consequence | Required action | Validation |
|---|---|---|---|---|---|
| P0-F01 | CRITICAL (production blocker) | \`src/App.jsx\` AdminOnly using \`getAuthSession()\` and \`state.role\`; \`src/lib/demoAuth.js\` browser demo accounts and local/session storage | UI/role check is not authenticated server authorization. Session and admin capabilities must not be trusted from browser storage. | Build Supabase Auth, trusted role assignment, protected server routes, MFA for admins; keep demo adapter isolated | Direct API authorization denials as learner/anonymous; role escalation tests |
| P0-F02 | CRITICAL | \`src/lib/store.jsx\` uses \`createQuestionSet\`, session question sets and browser \`Date.now()\`; \`src/pages/QuizPage.jsx\` computes local countdown | No production-verified server-only question selection, answer secrecy, marking or authoritative deadline. | Secure exam APIs, protected answer records, signed-in attempt lifecycle, server timers | No correct answer in pre-submit payload; forged scores/time rejected |
| P0-F03 | HIGH | Proposed SQL \`lms_courses.domain\`, \`lms_modules\`, \`lms_lessons.module_id\`, \`lms_topics.course_id\` | Proposed schema **does not implement approved Course → Domain → Topic → Lesson** ancestry; applying it as-is would entrench the wrong hierarchy. | Replace proposed migration in a *new reviewed migration design*, with course-domain-topic-lesson foreign keys; preserve legacy import IDs | FK tests: lesson must belong to topic, topic to domain, domain to course; cross-course isolation |
| P0-F04 | CRITICAL (commercial) | SQL \`courses_read_published_or_admin\`, \`modules_read_published_or_admin\`, \`lessons_read_published_or_admin\`, \`topics_read_published_or_admin\` | Policies grant published course/lesson data to **any authenticated user**, without course enrollment or paid/trial entitlement checks; cannot use unchanged for commercial LMS. | Scope protected content queries by active enrollment/entitlement; separate intentionally public catalog metadata | Unenrolled learner cannot read paid lessons/media even with direct REST calls |
| P0-F05 | HIGH | SQL \`lms_attempts.attempt_type\` only \`practice/assessment\`; no mock form/reservation tables | No secure Mock-exclusive 200-question allocation / immutable form / 300-minute attempt model. | Plan distinct mock forms + reservations + attempt snapshots, exclusion in every non-mock query | Atomic reserve exactly 200; all other modes reject these IDs; refresh/expiry test |
| P0-F06 | HIGH | \`src/pages/LearningPage.jsx\` reads/writes browser \`localStorage\`; \`supabase/README.md\` documents browser-local PDFs/videos | Progress is not cross-device/server authoritative; protected paid media and accurate watch tracking not implemented. | Add media entitlement access, private storage, watched segments, idempotent progress events | Cross-device resume; seek-to-end does not complete; unauthorized media denied |
| P0-F07 | HIGH | \`src/lib/demoAuth.js\` demo accounts; proposed SQL only admin RLS insert into \`lms_profiles\` | No trusted public sign-up → profile provisioning path in proposed schema; simply enabling Supabase Auth would not automatically provision learner profile. | Add trusted auth trigger or service-mediated profile creation, resilient to duplicate sign-ups and admin-role spoof | Sign-up creates learner profile; default role learner; self-assignment of admin rejected |
| P0-F08 | MEDIUM | \`package-lock.json\` missing (GitHub 404); CI workflow temporarily falls back to \`npm install\` | Reproducible \`npm ci\` gate not established | Generate & commit verified lockfile, use npm ci, audit dependency changes | Clean install repeatable across CI and local |
| P0-F09 | MEDIUM | \`package.json\` lacks typecheck; CI logs warning/skip | No genuine TypeScript/type-analysis gate for current JavaScript demo | Decide incremental TypeScript or checkJs/JSDoc strategy; report exact verified state | CI executes real type/static analysis; no fake PASS |
| P0-F10 | HIGH (content) | \`src/data/courseCatalog.js\` has five generic ASP domain IDs; Blueprint records 1,625 imported of 2,500 workbook rows; ASP11 is nine-domain taxonomy | Existing sheet IDs have not been validated against current official domains/topics. Publishing without reconciliation risks wrong taxonomy, scoring and study advice. | Stage original workbook, preserve IDs/answers/references; human SME crosswalk and rights clearance | Reviewed domain/topic assignments, source row reconciliation and traceability |
| P0-F11 | HIGH | Question tables contain \`correct_index\`; SQL RLS currently limits direct SELECT to admin, but delivery Edge Functions absent | Data model is only a proposal; if future endpoint or client bundle exposes raw question table, paid answer keys may leak | Separate protected answer material and sanitised learner payload; server-only grading | Network payload inspection and negative API tests |
| P0-F12 | MEDIUM | \`.github/workflows/ci-security.yml\` exists, but no runtime result was independently verified in this audit | CI configuration is not evidence of passing build/tests or operational security | Execute scripts and capture job logs/commit/observed verdict in suitable environment | Explicit PASS/FAIL/SKIP evidence with commit and test environment |

**No findings above claim live production exploitation:** proposed SQL is clearly labeled non-deployed; this audit identifies blockers **if** it were used unchanged. Preserve current demo until replacement is validated.

## 3. Existing validated-by-source capabilities (NOT live verified)

- React/Vite application routes for demo login, home, learning, practice, admin courses/builder/question bank, assessments, review, results and analytics.
- Admin-only *frontend* Question Bank navigation and separated Course Builder demo.
- Browser-local practice state, quiz navigation, flags and result flows.
- Browser-local Process Safety Essentials learning demo with lesson media/quiz.
- CI YAML/scripts documented; these files are **configured**, but are not equivalent to a successful production test.

## 4. Required P1 architecture before implementing

### 4.1 Identity and permissions

Proposed minimum roles: anonymous visitor (public catalog only); trial learner; paid learner; content author/instructor (scoped course editing); admin (course/content/user management); later grader/superadmin only if required. Use a trusted role assignment source and strictly scoped RLS; never allow a learner to update their own role. Trial/paid should preferably be **entitlements**, not mutable user-chosen security roles. Use one \`profiles\` identity per Supabase Auth user.

Permissions:
| Action | Visitor | Trial learner | Paid learner | Author (scope) | Admin |
|---|---:|---:|---:|---:|---:|
| Public course catalog | Yes | Yes | Yes | Yes | Yes |
| Protected lessons/media | No | Limited approved trial assets | Purchased enrollments only | Assigned courses | Authorized admin preview |
| Take practice | No | Limited approved questions/quota | Entitled course | Role policy, no implicit learner attempt | Preview/test only |
| View learner progress | No | Own | Own | Scoped aggregate if permitted | Authorized administrative view |
| Create/edit courses | No | No | No | Assigned course draft content | Yes |
| Access answer key / mock reserve | No | No | No | Only authorized editorial review, if assigned | Approved privileged flows |
| Change roles / subscription | No | No | No | No | Audited privileged function |

### 4.2 Schema design and migrations (design only)

Plan versioned *new* migrations, not blind editing/deploying \`001_lms_schema_PROPOSED.sql\`:
- **Identity**: \`profiles\`, \`role_assignments\`, trusted onboarding, audit events.
- **Content hierarchy**: \`courses\` → \`domains\` → \`topics\` → \`lessons\` → \`lesson_blocks\`; \`course_versions\`, \`media_assets\`, \`lesson_quiz_config\`.
- **Access**: \`enrollments\`, \`entitlements\`, trial quota and course publish state.
- **Questions**: \`question_sources\`, \`questions\`, protected \`question_answers\`, classifications, review workflow and source versioning.
- **Attempts**: \`practice_sessions\`, \`exam_attempts\`, \`attempt_items\`, \`attempt_answers\`, \`mock_forms\`, \`question_reservations\`; immutable snapshots.
- **Progress**: \`learning_events\`, \`section_progress\`, \`video_watch_progress\`.
- **Later**: \`orders\`, \`payments\`, \`provider_events\`, live sessions, certificates (future).
- Enable RLS and explicit GRANT/REVOKE for every exposed table/view/RPC, plus private Storage policies. No anonymous writes and no service role key in frontend.
- Strict foreign keys and policy checks must protect cross-course references; schema revisions retain original legacy question IDs and learner history.

### 4.3 P1 ordered work packages

| Work item | Concrete output | Acceptance gate |
|---|---|---|
| P1-01 Environment | Dedicated dev/staging Supabase project, secrets inventory, secure Cloudflare env plan; no production migration | No secrets bundled/logged; independent environments |
| P1-02 Identity | Real signup/login/reset/verification, trusted learner profile provisioning, session handling | End-to-end signup/login across devices |
| P1-03 Access & roles | Trusted assignments, admin MFA and audit logging; trial/paid entitlement model | Negative role escalation & inactive-account tests |
| P1-04 Canonical schema | SQL migrations for four-level hierarchy + enrollment/entitlements, test fixtures | FK/uniqueness/soft archive and source-ID migration checks |
| P1-05 RLS/grants | Explicit GRANTs, least-privilege RLS, private buckets, no-raw-answer delivery API contract | Anon, learner A/B, author-scoped, admin direct SQL/API tests |
| P1-06 Frontend integration | DemoAdapter stays for demo; ProductionAdapter uses safe APIs, no premature disabling demo behavior | Login and course catalog work without breaking demo |
| P1-07 Gate & docs | Test logs, screenshots, migration/rollback script, updated Blueprint/BUG ledger/CHANGELOG | Owner design/logic acceptance; P1 marked PASS only with test evidence |

### 4.4 Initial tests to write FIRST

1. New learner may sign up, receives own profile, cannot become admin by client payload/metadata.
2. User A cannot select/update User B profile, progress, attempts or entitlements.
3. Guest cannot read paid lesson/PDF/video directly from Storage or Data API.
4. Trial user sees only designated lesson/question subset; attempt quota enforced server-side.
5. Author can edit only assigned course drafts; cannot view payment info or other courses.
6. API never returns raw correct answers during unsent/active exam.
7. No mock-reserved question appears in Quick, Custom, Timed, Adaptive, Lesson Quiz, Pre-Assessment, Missed or Weakest Subject.
8. Duplicate progress events and concurrent answer submissions do not inflate progress or score.
9. Original ASP question ID + answer/reference remain unchanged during source import and migration.
10. Upgrade from demo doesn't delete previously accepted UI/behaviors; mobile navigation and browser Back work as expected.

## 5. P0 exit status and next required action

- **PASS (static inspection only):** core source files, current demo flows, governance docs, proposed schema and CI configuration read; key architectural blockers identified with file evidence.
- **NOT RUN / BLOCKED:** \`npm install\`, \`npm run check\`, \`npm run verify:bank\`, existing regression scripts, \`npm run build\`, \`npm audit\`, browser/devices, current Actions run evidence, Supabase RLS SQL probes, source workbook row-by-row review, protected media tests.
- **P0 verdict:** **IN PROGRESS / NEEDS EVIDENCE**. Do not label code/security tests PASS or paid production ready.
- **Immediate next:** safely fix tooling reproducibility on a reviewed branch and run actual tests; validate importer/workbook and approved design flows; then confirm a reviewed P1 SQL/auth implementation plan. Do not apply the stale proposed SQL to any live Supabase project.

## 6. Audit change log

- 2026-10-30: First code-path and proposal-SQL source review added. Logged P0-F01–P0-F12, explicit confidence limits, proposed P1 role matrix, schema separation, integration/test gates. Documentation only, no source code or DB changed.


## 7. CI evidence addendum — 2026-10-30 (updates earlier 'not run' status)

**Earlier Sections 1 and 5 describe the initial source-only review, before CI logs were retrieved. This section is the newer evidence, not a retroactive claim that the local environment executed tests.**

**Verified \`main\` baseline:** GitHub Actions [run #37](https://github.com/Minamilad162/Technica-LMS/actions/runs/40977894570), head \`274bcad06f2ac56e82e85c61b71f382af08d9ab6\`, job \`validate\`, **SUCCESS**. Decoded job logs show:
- \`node scripts/check-infrastructure.mjs\`: PASS with explicit warnings about missing lockfile and typecheck.
- \`npm install --no-fund\`: PASS as fallback (not reproducible).
- \`npm run check\`: PASS.
- \`npm run verify:bank\`: PASS, **1,625 unique ASP demo questions across five old domains**.
- Existing regression suites: PASS (selection, images, demo auth, motion, courses, quiz navigation, review, admin, course dialog, authoring, admin bank, lesson media, learner UI and learning player).
- \`npm run build\`: PASS; Vite emitted bundle size warning, not build failure.
- \`npm audit --audit-level=high\`: PASS; **0 vulnerabilities found at run time**.

**P0 reproducible-install remediation (review branch, NOT merged):** [Draft PR #6](https://github.com/Minamilad162/Technica-LMS/pull/6), \`chore/p0-reproducible-install-20261030\`:
1. Used successful CI's npm-generated lockfile to create repository \`package-lock.json\` (lockfileVersion 3; 130 package entries), validated name and package metadata.
2. Removed a *temporary* diagnostic lockfile export from \`scripts/check-project.mjs\` (restored exactly to original).
3. Changed CI dependency step from fallback \`npm install\` to mandatory \`npm ci --no-fund\`.
4. GitHub Actions [run #41](https://github.com/Minamilad162/Technica-LMS/actions/runs/40978913432), head \`4cbf887546d476fc2ed51efc1913d271f72260f0\`, job **SUCCESS**; decoded logs explicitly show \`npm ci --no-fund\` **PASS** (80 packages installed), imported bank **PASS** (1,625), regression suites **PASS**, Vite build **PASS**, audit **0 vulnerabilities**. Subsequent documentation-only changes will trigger one final PR job to reconfirm.

**Unresolved P0 gates:** real-browser/mobile behavior, ASP source workbook content/rights review, genuine type/static checking, future Supabase RLS/GRANT probes, production Auth, secure question engine, and user approval of the P1 schema. These are NOT CI-tested. The project is still a browser-demo and paid-production **NO-GO**.

**Updated verdict:** P0 source audit + CI regression/build evidence **PASS**; overall P0 **PARTIALLY COMPLETE** because the broader UI/data and production-security gates remain. PR #6 is the reversible proposed fix for BUG-013; do not mark it merged until it is.
