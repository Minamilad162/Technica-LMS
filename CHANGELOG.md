### 2026-11-08 — P34 PDF-sourced Unit Materials embedded in Qualifications (SOURCE ONLY)

- Reviewed connected Drive walkthrough transcript (course vs Unit resources at 06:12–09:33) and all three historical qualification PDFs. Built a 23-Unit code-keyed material map (OTHM L6 7, OTHM L7 6, ProQual NVQ L6 10) with verified PDF Unit Aims, Learning/Competence Outcomes and OTHM indicative study topics. No imaginary lesson PDFs or Assignment Briefs.
- Added premium Unit Material panel under selected horizontal Unit → Course, with authentic topics and a source PDF link; compact right rail keeps Resources/Actions. Evidence contextual card links to selected Unit Material. Admin → Unit Resources shows the same imported outline before local draft controls.
- Source documents are older qualification specifications (OTHM Dec 2023; ProQual Feb 2018), not complete courseware or current approved assessment briefs. Preview-only source data, no Supabase writes/migrations, entitlement or ASP Lesson changes. P34 verification test and Blueprint §94 updated.

## 2026-11-08 — P33: visible Learner Quiz shortcut and Draft publication guidance
- Owner screenshot: C04 Lesson 1 has 0 Published and 2 Not published Quiz links, questions marked DRAFT, plus 1 unsaved change. These links must not become learner-visible before independent review and publication.
- Renamed the learner's same-page Knowledge Check shortcut to **Quiz**, showing published count even at zero; section title now Lesson Quiz. Video and Material remain mounted. Empty state explains why saved Drafts cannot appear yet.
- Admin Question Bank lesson health strip explicitly guides Save All → Review Draft Questions → Open Lesson Quiz → Publish eligible items; existing P6A/non-ASP approval UI remains protected, no direct DB writes. Course Builder editor matches new Quiz wording. Tests/Blueprint updated.

## 2026-11-08 — P32: Lesson Quiz published visibility diagnosis
- User's learner screenshot showed existing Knowledge Check section but 0 published questions. Repo confirms the P30/P28 Lesson selector creates a secure P22 link, while P22 learner RPC returns only Published quiz rows. Draft-source questions remain hidden pending independent approval + explicit publish; no evidence of the exact live lesson/question state was available.
- Admin Question Bank now shows read-only actual-P22 per-Lesson Published and Not published totals and direct Open Lesson Quiz deep-link; Course Builder opens the exact Course/Domain/Topic/Lesson and scrolls to it.
- Admin Lesson Quiz editor shows actual published/pending status and warns when saved questions remain invisible. Added read-only SQL report for Course/Lesson UUID + approved/pending/missing link preflight; no SQL migration or live data edits.
- Preserves P30 Save All, P6A independent ASP review, P9B official Mock exclusion, P22/RLS learner Auth, published-only quiz and server-side answer scoring. Regression P32 added.

## 2026-11-08 — P31 Question Bank lesson assignment visible in Learner Quiz
- Kept Course → Domain → Topic → Lesson and P23 single-page Video → Study Material/PDF → Knowledge Check/Quiz.
- P30 approved+Active+non-Mock Lesson links publish via the existing P28/P22 server path; Draft links remain unpublished pending independent question approval and explicit Course Builder publish. Admin Save now explains this distinction.
- P31 learner Quiz loads protected published P22 questions for the selected Lesson; tapping the sticky Knowledge Check shortcut scrolls to the Quiz, including if tapped during lesson loading, and refreshes newly published questions without unmounting media. Added in-place Refresh and published-count labels.
- P22 Auth/entitlement/free-intro verification and server-only answer grading retained; no Admin Bank answer keys sent to learners. Added P31 integration test and runbook. No SQL/data writes from authoring.

## 2026-11-08 — P30 Question Bank UI + atomic batch save (source-only)
- Reproduced the owner-approved Technica Question Bank teal dashboard layout as a compact table with Course selector, upload/manual creation, filters, page counts, readable one- or two-line question preview, Domain, inline Difficulty, Active, Mock, Lesson, Status and bulk actions. Removed per-row answer expansion entirely.
- All row and bulk setting changes remain in browser memory with Unsaved badge; one Save All Changes action sends ONE transactional SQL RPC (max 500 question rows), with optimistic concurrency, whole-transaction rollback on any problem, Discard, and navigation/unload warning.
- Added `202611080004_p30_batch_question_bank_edits.sql` source-only Admin guarded batch RPC and read-only capability handshake; no existing Question Bank/Mock/attempt rows modified at migration install. Only Draft Difficulty is editable without independent review; official P9B Mock remains immutable and forbidden in Practice/Lessons.
- Preserved ASP P6A and non-ASP rights approval actions behind separate collapsed advanced workbenches; imports remain explicit Draft creation and not part of bulk settings Save.
- Added pure staging logic, static UI/security regressions, disposable PostgreSQL single-transaction/RLS/rollback smoke, Master Blueprint and P30 runbook. Production Supabase not touched.

## 2026-11-08 — Question Bank old UI / ASP Course false-missing diagnostic
- Screenshot confirmed main deployed old `AdminQuestionsPanel` and exact-ASP slug gate rather than unmerged P28/P29 upload UI. The old Admin Tools catalog fetch silently replaced SQL/Auth/RLS errors with empty Courses, falsely instructing admins to create an ASP Course.
- Admin Tools now distinguishes real Supabase Course loading/errors/empty with Retry/Courses navigation, and prefers existing canonical ASP identity. A legacy Course titled “ASP Course” but slugged `asp-course` remains visible with an explicit warning; no duplicate creation/import or silent migration of its identity.
- New explicit ASP Course authoring selects canonical `asp` slug and guards against a second course when a legacy ASP title already exists. Existing course/Question/Mock IDs untouched. Added pure and static regression tests.
- The new upload/check-box UI still requires successful CI, deployment and the already staged P28.2/P29 schema; none were applied to live Supabase by this code change.

## 2026-11-08 — P29 Admin Question Bank controls and Lesson Quiz selection
- Added visible per-question Active (true by default) and Mock Exam candidate checkboxes to the course-scoped Excel/CSV uploader. Admin picks a nested Lesson for the question and adds it directly to that Lesson Quiz; existing Course Builder Lesson Quiz selection from Bank remains.
- Added protected P29 SQL: additive boolean switches, Admin-only audited flag RPC and Mock selection handoff, strict 200-question ASP official reservation unchanged, disabled/candidate questions excluded from server P4/P8e new draws, disabled published lesson quizzes unpublished without deleting historical attempts or quiz answers.
- Old P28 database frontends remain in read-only compatibility mode until P28.2+P29 installed; new UI must be deployed to main separately. Real ASP source XLSX still not uploaded automatically.
- Added static P29 and disposable Postgres security tests, authoring runbook and Master Blueprint. No Supabase production writes.

## 2026-11-08 — P28.2 existing-installation forward migration
- Owner screenshot: original protected P28 import, 4-argument Bank listing, lesson link and both guards were installed; 7-argument filtered listing was absent. Re-running initial P28 raised the intended replay/conflict guard.
- Added one-time, transactional `202611080002_p28_2_forward_upgrade_existing.sql` to preserve old Bank RPC and data, create the 7-required-argument Admin filtered Bank RPC (without ambiguous defaults), enhance draft Difficulty import and strengthen new standalone Lesson Quiz exclusion. Does not alter existing questions/answers/approval, ASP 200 Mock form, learner progress or attachments.
- Added exact archived original-P28 **CI-only** SQL fixture and disposable PostgreSQL clone/test for old-to-new forward upgrades; real Supabase unchanged. Full test status and owner-approved staging install are separate gates.
- See `docs/current/P28_2_INSTALLED_FORWARD_UPGRADE.md`.

## 2026-11-08 — P28.1 ASP Course unified Question Bank (source branch)
- Owner's Supabase read-only check confirmed P1/P4/P9B installed, P22 missing, P28 not installed. Original P28 preflight P0001 rolled back before data changes. P22 prerequisite must be installed after verifying existing P2/P15 requirements, ledger and backup; no remote SQL was run in this development turn.
- New ASP-first Admin Question Bank import accepts nine official Domains, 2–6 options, correct index A–F, optional proposed Difficulty, Domain, Explanation and Reference. Ambiguous source Domain labels require explicit Admin mapping or remain unassigned. All uploaded questions remain Draft and ASP content rights/answer and independent second-admin review remain mandatory.
- Admin course-bank query filters per Course/Domain/Difficulty/Usage; Lesson Quiz picker selects only from the same bank, no creation of new standalone quiz questions (legacy editable rows preserved). Approved non-Mock questions power P4 Practice and non-Mock Assessment; ASP Mock stays immutable exact 200/300 via existing P9B/P10 reservation.
- SQL modified on P28 branch only, not applied remotely. CI and isolated PostgreSQL tests must pass with the updated SQL, then authenticated Staging UI verification before merging/release. No 2,500-question source file imported.

## 2026-11-08 — P28 preflight correction
- Corrected an overstrict prerequisite in the source-only P28 SQL: the ASP-specific P9B Mock form is not needed to install per-Course Question Bank, though it remains mandatory for ASP Mock runtime. Preflight identifies the missing P1/P4/P22 object by name. The original user-reported P0001 error came from an early prerequisite guard, before database mutations; actual remote inventory remains unverified. SQL must not be rerun until a read-only ledger and object check passes.

## 2026-11-08 — P28: Course Question Bank + Excel → Lesson Quiz → Mock-only source

- Added per-Course protected Question Bank management in Admin Tools (Course picker, .xlsx/.csv validation preview, Draft-only idempotent import, optional manual entry, course-scoped search and explicit non-ASP approval).
- Lesson Knowledge Check now offers **Choose from Course Bank** with same-course server validation, Draft/non-Mock filtering, approved question publication and explicit unlink without deleting the original bank item. Existing manually authored questions remain supported.
- Exams & Mock supports Course selection. Preserved versioned ASP exact 200-question / 300-minute immutable P9B/P10; other courses can mark unused, unlinked Drafts Mock-only for a future Mock engine **without activating an exam**. Mock-only IDs remain excluded from Practice and Lesson Quiz.
- Additive P28 **source-only** SQL, unique quiz link index, triggers, Admin-only import/list/approve/mark/attach RPCs, audit events and CI / disposable PostgreSQL tests. No Supabase Production writes, no demo importer re-run, no Cloudflare deployment or learner data migration. Existing P21 subscriptions and P22/P23 progress/lesson UX preserved.
- Conflicting Assessment Practice statement deferred: fail-closed exclusive Mock rule still applies until clarified. Staging migration ledger, role-negative tests and browser QA remain pending.

### 2026-11-07 — P26 Qualification Portfolio reference screens (SOURCE ONLY)

- Added the missing Learning Assistant reference sections while preserving premium compact horizontal Unit tabs: Course (Resources & Actions), Contact (Assessor Feedback / Contact Diary), Records (Registration, Metrics, Grading Checklists and Recording Forms). Learner still has Evidence, Mapping and Submit; all visible in the same Unit workspace.
- Added compact assessor/verifier summary with no fabricated assignment/dates/expected progress. For NVQ Unit 1 guidance files, only reference names are shown and clearly non-downloadable. Admin Resources supports in-memory draft labels/file names; Contact & Records stores local demo notes and criterion-decision history, without claiming real grading.
- Added P26 regression contract and updated canonical Blueprint §84; no Supabase writes, new migrations, actual uploaded resources, real assessor decisions or changed ASP learning/subscriptions.

### 2026-11-07 — P25 Minimal Qualifications UX with numbered horizontal Units (SOURCE ONLY)

- Replaced text-heavy headers/step wizard, vertical learner Unit list and admin Unit dropdown with shared small horizontal 01–07 / 01–06 / 01–10 tabs, responsive overflow scroll, and Unit details opened directly below. Kept only Evidence / Mapping / Submit learner sections and compact Admin Unit Details / Task Templates / Assessments / IQA sections.
- Preserved evidence × assessment-criterion matrix, preview submission gate, Admin human acceptance/feedback mock. Draft mappings remain when switching Units; evidence library is shared across Units, with submitted-preview referenced files protected from removal. Existing official criteria remain read-only; unimported criteria do not appear fabricated.
- UI preview only: no Supabase, migrations, real file uploads or assessor decisions. Updated P19 test and canonical Blueprint §83; protected P21 subscriptions/P22-P23 Lessons unchanged.

### 2026-11-07 — P24 Qualifications frontend integrated with latest P23 Lesson flow (SOURCE ONLY)

- Added three qualification front-end previews (OTHM L6, OTHM L7, ProQual NVQ), Unit screens, Evidence Upload selection, evidence-to-assessment-criteria mapping matrix, a read-only official rubric, submit-preview, plus separate verified Admin Tools qualification/task-template and assessor/IQA decision previews. Learner and admin are lazy-loaded without changing P21 subscriptions or P23 single-page Lesson behavior.
- Sample learner/evidence/acceptance state is browser memory only: **no Supabase upload/write, migration, payment or actual assessment**. Added P19 qualifications UI CI test. Blueprint §82 and documentation updated; manual visual QA still pending.

### 2026-11-06 — P14 secure PDF/video Lesson content under Admin Tools (SOURCE ONLY)

- Corrected Admin Tools → Courses → Course → Domain → Topic → Lesson: no longer Text-only. Each Lesson has direct **+ PDF**, **+ Video** private file upload controls and protected preview; optional Text remains available for historical lessons. Learner `LiveLearning.jsx` and actual `SupabaseApp.jsx` now render real private PDF/MP4/WebM lesson content.
- Added `202611060001_p14_private_lesson_media.sql`: private restricted-MIME Supabase Storage bucket and service-only signed upload intents + atomic one-time metadata-verified SQL finalization. Does NOT mutate previously stored questions, user progress, entitlements or existing Lesson data.
- Added `technica-lesson-media` JWT-enabled Supabase Edge Function (real Auth/Admin + lesson P1 entitlement + RLS + asset ownership checks, restricted CORS) for signed private upload, finalize and short-lived read. No service key in browser and no Public URL. PDF up to 20 MiB, MP4/WebM up to 50 MiB (also subject to Supabase limits).
- Added animated watermark and anti-copy/print/right-click/download-button deterrence, tab-hidden concealment and 120-second replay authorization with video token refresh. **No claim of perfect screenshot, screen recording or HTTP download prevention:** web browser capture cannot be fully blocked without protected DRM/paginated rendering, and external cameras are never blocked. Video DRM (Widevine/FairPlay) is a separate approved integration.
- `npm run test:p14` and disposable `test-p14-postgres-smoke.sh` regression, runbook `P14_SECURE_LESSON_MEDIA.md`, Blueprint §69 / DEC-032, Logic Registry LMS-039/040. No live Staging/Production SQL, Edge deploy or file upload conducted.

### 2026-11-05 — P13 unified Admin Tools, authentic dashboard, Mock curation and learner plans

- Consolidated scattered Admin actions into one premium **Admin Tools** entry with six responsive sub-tabs: Dashboard, Courses, Question Bank, Exams & Mock, Users & Plans, System Tools. Existing old deep links remain for bookmarks, with no previous approved learner behavior removed.
- Implemented in BOTH application paths: `src/App.jsx` Demo HashRouter and **actual deployed Supabase live entry** `src/production/SupabaseApp.jsx`. The latter opens Admin Tools by default for authenticated real Admin (legacy course workspace still reachable), avoiding a Demo-only cosmetic solution.
- New real Supabase **P13 Admin-only read-only RPCs** for dynamic system KPIs, six-month verified registrations/Practice/Mock trends, active enrollment/course figures, paginated real learner directory and individual plan/progress/assessment detail. No trial/paid plan payment amounts or revenue fabricated: current P1 Entitlements are not a financial ledger.
- Reused existing P6A human question review; added dedicated secure 200-item Mock selection UI with persisted selection across pages, read-only P9B preflight and explicit irreversible protected server reservation. Reserve exactly 200 reviewed Draft ASP11 items, excluding them from Practice by existing immutability guards, never bulk auto-publish.
- Retained Technica palette and typography, improved polish using responsive cards, KPI/chart transitions, hover effects, softly animated hero and `prefers-reduced-motion` compliance; no new UI framework, chart SDK or licensed media.
- Added `npm run test:p13` and disposable `test-p13-postgres-smoke.sh` post-P11 with Admin/anon/paid/trial negative role checks, no existing DB row mutations and privacy checks; runbook `P13_UNIFIED_ADMIN_TOOLS.md`, Blueprint §68, Logic Registry LMS-037/038, DEC-031.
- P13 SQL is staged **source only**; no actual Staging or Production migration installed, no real learner financial data inferred, no production question or Mock reservation executed.

### 2026-11-05 — P12.2 authenticated Staging API QA and local-only evidence viewer (SOURCE ONLY)

- New deliberately opt-in `npm run qa:staging:read` validates **both distinct Staging and Production project references**, exact HTTPS staging URL, public anon key, four separately seeded Admin/Paid/Trial/Outsider accounts and explicit CLI acknowledgement before any remote login/read. Auth signin itself can generate auth audit events; all LMS table/RPC operations remain read-only with no attempts, question/source import, approvals, entitlements or grading writes.
- `scripts/lib/p12-staging-qa.mjs` covers **19** safe signed-JWT positive+negative scenarios: Auth four roles, published ASP course & hierarchy, P2, paid + denied Trial/outsider P4, protected P6A Admin/learner/anon, P10 real exclusive 200 readiness + Trial denial, P11 own reporting + outsider denial, direct protected question RLS and true cross-user progress fixture checks (PENDING without positive fixture). It never infers a successful denial from a missing RPC without a working positive control.
- Integrated **Staging Integration Evidence** panel into Admin Release Readiness, visible only after real Supabase Admin verification: local JSON import, strict whitelist validation, automatic rejection of email/URL/JWT/UUID/secret-bearing details, 19 status rows and safe aggregate report copy. No upload, storage, database write or GO action. Existing P12 permanent NO-GO unaffected.
- `npm run test:p12:staging` synthetic 19-step role/RLS/Production guard/zero-write privacy regressions integrated into CI. The REAL Staging command is deliberately **not** executed in CI because project/account credentials have not been supplied.
- Updated `P12_2_STAGING_API_QA_AND_EVIDENCE.md`, Release Checklist, Blueprint §67, Logic Registry LMS-036 and change log. No real staging/production access or Cloudflare deploy. Browser/iOS/Android/5h Mock, media, billing, load and rollback continue to require independent manual evidence.

### 2026-11-05 — P12.1 real Supabase Admin Release Readiness & QA dashboard (SOURCE ONLY)

- New `/release-readiness` Admin page integrates one-way read-only, authenticated Supabase checks for correct public HTTPS config, verified live Admin, actual ASP catalog, Course→Domain→Topic→Lesson structure, P2 own-progress table, P4 Practice entitlement, P6A protected ASP aggregate inventory, P8e Level Up 30-question readiness, P10 genuine exclusive 200 Mock form, and P11 own-analytics report. NO table mutations, approval, content import or public answer data.
- Runtime checks require actual Supabase active Admin JWT; historical Demo Admin UI role is NOT treated as database authorization. No protected P6/P8/P10/P11 calls if genuine Admin check fails. No public URL/key/JWT/user identifier/question content in results.
- Seven additional manual gates stay explicitly PENDING and default verdict permanently **NO-GO**, regardless of browser runtime check success: content rights+SME, real staging signed sessions, protected media, payments/refunds/trials, device/browser QA, capacity/recovery, backup/rollback and owner sign-off.
- Strict `npm run test:p12` mocked read-only contract (0 DB writes, no protected reads without Admin, safe aggregate report and never-GO) added to CI. Existing P10/P11 source-only and synthetic PostgreSQL tests preserved.
- Updated current release security checklist to avoid stale `NOT IMPLEMENTED` claims for source-complete P10/P11 while expressly not claiming any live deployment. Docs `P12_PRODUCTION_READINESS_AND_QA.md`; Blueprint §66; Logic Registry LMS-035.
- No Supabase Staging/Production migration, authentication/roles/data changes, real questions, payment events, Cloudflare release or real-device inspection.

### 2026-11-05 — P11 learner-owned verified Progress & Analytics (SOURCE ONLY)

- Built authenticated Supabase `/my-progress` for real enrolled learners, separate from existing Demo/Admin analytics. Learner sidebar access, course selection, official Course→Domain→Topic→Lesson verified completion, per-domain answer accuracy, Practice and Mock separately, and latest ten graded attempts. Missing RPC/backend displays an explicit unavailable state, never fake 78% or 100-user sample statistics.
- Added `202611050002_p11_learner_progress_analytics.sql`, a single STABLE read-only Auth JWT owner-scoped RPC. Access requires active profile and P1 course access; trial lesson counts honor `lms_p1_can_view_lesson` so restricted content is not exposed. Private answer snapshots stay on server, direct browser ACL not expanded.
- Differentiates **answer accuracy correct/answered** from **exam score correct/assigned**. Counts only finished/expired P4 (including Level Up) and P10 Mock; excludes active and abandoned. Unknown values shown as unavailable. Topic question accuracy is explicitly unavailable until an actual question→topic schema exists; lesson completion is never inferred from opening a lesson.
- Added `npm run test:p11` with fail-closed synthetic API contracts and `test-p11-postgres-smoke.sh` after P10 synthetic fixtures with cross-user/course/Trial/suspended role denial, metrics, no data mutations and proprietary source/answer secrecy. `docs/current/P11_LEARNER_PROGRESS_AND_ANALYTICS.md`, Logic Registry LMS-033/034 and Blueprint §65 updated.
- No Production Supabase migration, actual user-data queries, question-bank import, paid activation, staging deploy or Cloudflare Production release.

### 2026-11-05 — ASP Question Bank engineering freeze and P10 official Mock engine source

- Owner directed conclusion of recurring ASP question-bank phases and immediate move to next LMS module. **Engineering source bank is FROZEN** on the private 2,500/9 candidate with P9D1 offline optional reconciliation tool; the 1,625/five-group historical Demo remains untouched. This is **NOT** a claim of actual import, rights/answer validation, or Production publication.
- Added P10 staged SQL-only secure official ASP Mock engine: EXACTLY 200 versioned P9B exclusive Draft items, exactly 300 server-authoritative minutes, authenticated paid/manual course access or verified Admin, idempotent start, private answer snapshots, per-question answer/flag autosave, expiry/submit/server grading, fullscreen exit seal, fully private DB tables, no answer keys during exam or after finish. No changes to P4/P8e Practice.
- Added a genuine separate Supabase Auth ASP Mock route from existing Assessments page, a native-fullscreen 200-question exam UI with navigator, flags, answer save, countdown, submit confirmation and score, and a fail-closed 200-item readiness check. It cannot use Demo fallback or start on an unreserved bank.
- Added P10 Node contract and disposable PostgreSQL negative security tests plus canonical `docs/current/ASP_BANK_ENGINEERING_FREEZE_P10_HANDOFF.md`, Blueprint §64, Logic Registry LMS-031/032.
- **Release gates:** no real Supabase P10 SQL installation, no real ASP candidate source import/SME approval/rights attestation/200 Mock reservation, no mobile/browser live acceptance and no production launch performed by this source PR.

### 2026-11-04 — P9D.1 SQL export smoke acceptance

- The private fingerprint export SELECT is now executed against ephemeral PostgreSQL P9B fixtures (not only statically inspected). CI checks output row count, canonical source SHA256 normalized text interoperability with the Python importer, all three 64-character hash fields and zero protected bank/review/attempt/audit mutations. No actual Supabase data or secrets are accessed.

### 2026-11-04 — P9D.1: private ASP2500 local dry-run importer and offline fingerprint reconciliation

- Added `scripts/asp2500_dryrun.py`, an offline-only Python standard-library XLSX reader pinned to owner-uploaded source SHA256 and nine exact worksheets (250/625/200/300/250/300/175/275/125 = **2,500**). Validates header, question, four answer options, A-D keyed answer, explanation, unique normalized prompts, size/formula safety; generates stable provisional hash-based IDs WITHOUT publishing proprietary question contents.
- Added `supabase/P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql`: strictly SELECT-only private CSV export of EXISTING ASP source IDs, question/option-answer/explanation SHA256 fingerprints, approval state, Mock exclusion and previous Practice-use flag. No question text, answer keys, user identities or Supabase mutations.
- Offline `--existing-snapshot` compares the private 2,500 source against owner-exported fingerprint CSV. Reports aggregate **new, exact duplicate, draft options/key mismatch, draft explanation mismatch, protected used/approved/Mock conflict, source-ID collision and existing duplicate prompt** categories. With no snapshot, clearly reports SOURCE_ONLY_NO_DB_SNAPSHOT instead of inventing production totals.
- Synthetic nine-sheet 2,500-row Python regression suite covers malformed source/SHA rejection, database conflict scenarios, sensitive-output/privacy guards and no network/no write. Added private source/snapshot patterns to .gitignore and runbook `docs/current/P9D1_PRIVATE_ASP2500_DRYRUN.md`.
- Scope is **P9D.1 DRY RUN ONLY**. No `--apply`, no public question bank upload, no Supabase write, no existing historical 1,625/FIVE-sheet P4 importer modifications, no SME automatic rights/answer/classification, no Mock-200 reservation and no P8e fixed-7-correct policy change. Real Supabase DB comparison requires owner-exported read-only CSV.

### 2026-11-04 — ASP 2,500-question private candidate workbook received (metadata intake only)

- Audited the uploaded private 9-sheet workbook `ASP_Question_Bank_2500_Simplified (1).xlsx`: exactly **2,500** questions distributed **250/625/200/300/250/300/175/275/125**. Every question, 4 options, A-D answer key and explanation present; zero normalized exact duplicate prompts and zero duplicate options detected. This validates structure **only**, not scientific answer accuracy, copyright ownership or permission to distribute.
- No standalone difficulty, question-specific independent citations, Topic, Lesson, source ID, licensing/rights evidence or SME review/approval columns. Sheet-to-ASP11 mapping is tentative and must be verified. All items remain an **unapproved external candidate**, not actual Supabase rows.
- Historical `scripts/import-asp-p4.mjs` hard-rejects any bank other than **1,625 / FIVE legacy groups**. Do not overwrite the public/demo bundled bank, leak correct answers into Vite assets or execute a migration/import. A new **private backend-only, dry-run-first** reconciliation/importer is needed after explicit owner authorization.
- Source SHA256 and detailed metadata-only custody notes in `docs/current/ASP2500_CANDIDATE_SOURCE_INTAKE.md`. A separate private 11-sheet `ASP_2500_Review_and_Quality_Audit.xlsx` (nine original sheets plus Audit and SME Review Queue) was generated in the conversation; it is **not committed** to the public repository.
- No Supabase Production/Cloudflare writes, no question publication, no 200-item Mock reservation, and no change to the locked P8e adaptive 7-correct-of-original-10 rule.

### 2026-11-04 — P9C.1: concise SELECT-only ASP bank decision report

- Added `supabase/P9C_DECISION_SUMMARY_READ_ONLY.sql`, a single owner-run SELECT for the confirmed Technica project with P9B already installed. The report distinguishes real ASP question counts from the **historical 1,625** reference, human rights/answer review from technical approval, N30 Level Up approved Low/Medium/High pool counts, and 200 Mock-exclusive flags from a genuinely populated immutable Mock form. The formal 200-question/300-minute Mock engine is always displayed as NOT_IMPLEMENTED; source-only readiness never asserts real deployment.
- Added a strict one-SELECT privacy/no-mutation Node contract test and disposable PostgreSQL post-P9B test with protected table fingerprints before/after report generation. Older full P9C audits stay supported when P9B is absent.
- This source-only increment does not run SQL against Production, import/review/approve/reserve any question, modify P8e fixed 7-of-10 policy, install migrations or deploy Cloudflare. Owner-run real Results CSV is needed before making data-specific remediation decisions.

### 2026-11-04 — P9C: SELECT-only real ASP bank inventory and readiness audit

- Added a schema-only, single-SELECT preflight usable on the confirmed Technica Supabase project; separately identifies P4/P6A core prerequisites, installed P8e fixed-correct policy and **optional** P9A/P9B governance. Absent P9B does not break the inventory audit.
- Added a comprehensive single-SELECT ASP bank report: actual source/approval/draft/archived counts vs **1,625 historical reference only**, unique IDs/duplicate prompts, P6A human-reviewed answers/rights/difficulty, missing reference/explanation, official ASP11 domain completeness, P4/P8e approved non-Mock runtime vs strict governance-verified counts, potential Mock 200 candidates/flags and 9×3 domain/tier readiness with conservative N30 bank thresholds.
- Both SQL files return aggregate counts/statuses ONLY; no question prompts, choices, answer keys, source UUIDs, notes, emails or learner data and **zero DDL/DML/role changes**. They do not import, map, approve, reserve, activate Mock or silently change the approved P8e 7-of-original-10 Level Up rule.
- CI adds `npm run test:p9c` and disposable PostgreSQL P9C read-only pre-/post-P9B runs that verify exact schema handling, expected 27 domain/tier combinations, 200 Mock-flag reporting after the fixture, and unchanged protected table fingerprints.
- Owner-use instructions: `docs/current/P9C_ASP_BANK_READ_ONLY_AUDIT.md`. **Not done:** live Supabase audit execution/data retrieval, manual SME source/rights checks, actual Mock reservation, production migration, Cloudflare deployment or paid production activation.

### 2026-11-04 — P9B: Controlled 200-question ASP Mock reservation & independent Practice approval

- Added an **unexecuted, guarded** P9B Supabase migration for a private immutable 200-item versioned ASP Mock form, secure Admin-only preflight, transactional exact-200 reservation and audited per-question Practice approval by an **independent second Admin**. Unverified answers, usage rights, unofficial domains, drafts previously used in Practice, duplicated IDs and orphan prior Mock flags are rejected. No question is released automatically.
- The existing ASP Question Review workspace now supports selecting reviewed draft question IDs across pages, validating a proposed 200-item reservation, and requiring explicit double confirmation. Practice approval is one reviewed question per click and fails closed until the Mock is reserved; no new main menu or mock engine is activated.
- P8e fixed 70%-of-original-tier Adaptive Practice behavior, questions/keys, hierarchy, legacy demo, other Practice modes, user roles and existing question/attempt data are unchanged by this source commit.
- CI includes P9B Node contract and disposable PostgreSQL negative security tests, including independent Admin approval, no unreserve/form mutation, 200 unique immutable Mock ID positions, ACL and no live bank writes. The detailed runbook is `docs/current/P9B_MOCK_RESERVATION_AND_APPROVAL.md`.
- **NOT DONE:** actual Supabase/Production migration or data mutation, real ASP 1,625-row import/SME rights verification, manual 200-item selection, actual Practice approval, Cloudflare deploy, full 200/300 Mock engine, paid launch. Never execute against production without a distinct owner approval.

### 2026-11-04 — P8e: fixed 70%-of-ORIGINAL tier, not expanding denominator

- Corrected owner clarification: for 30-question adaptive Practice, each initial stage base is 10 items and the correct-answer target is **7 total correct**; after 6/10 Low, one extra correct Q11 yields 7/11 and promotes Q12 to Medium. Additional wrong questions do not raise the 7-correct requirement. Medium uses the identical fixed-target rule. Always stop at chosen N, hide tier transitions and reserve Mock/Assessment behavior.
- New **staged, unexecuted** P8e SQL migration adds nullable per-attempt promotion policy; NEW sessions use fixed-base 70% correct, while existing P8/P8d in-flight sessions retain their prior rule and state. No bank/roles/learner answers modified by this code change.
- Live and Admin readiness require policy version `thirds-fixed-correct-v2`, verified fixed correct targets and original Low/Medium bases. Old backend responses fail closed. Owner-run SELECT-only SQL audit added.
- Disposable PostgreSQL and Node regression test 6/10→7/11, additional wrong Q11→7/12, Medium 6/10→7/11, no duplicates and cap 30; full legacy suites remain mandatory.
- No actual Supabase migration executed, no Cloudflare deployment, no question import or approval. Real signed JWT and content readiness remain pending.

### 2026-11-04 — P8d: Exact one-third adaptive Level Up gates in Practice

- Corrected the original P8 20%-of-N early-promotion policy to the owner's **balanced thirds**: N=30 has 10 Low + 10 Medium + 10 High if the learner clears each tier; N=10→3/3/4, N=25→8/8/9, N=50→16/17/17.
- After the tier's minimum answers, grade cumulative correct/answered on the **server**, promoting at ≥70% only. A failed tier keeps consuming fresh questions of the same difficulty, with re-evaluation after every answer; the session stops at exactly the chosen N even if no promotion occurred. Current tier/transition remains invisible during the attempt.
- Added separate nullable Medium gate to private P8 state, new P8d policy-version readiness, and a guarded **owner-run staging-only migration**. Existing in-progress P8 sessions retain their historical stored checkpoint; no bank or learner rows, mock, non-adaptive practice or production data are altered by this source update.
- Added the 30-question preset/diagnostic, strict client refusal of old 20%-gate readiness, SELECT-only `P8D_VERIFY_READ_ONLY.sql`, and disposable PostgreSQL/Node coverage for 7/10 vs 6/10, 10/14 recovery, 30/30 cap, uninterrupted old attempts and answer/bank isolation.
- This PR does not apply the P8d migration to live Supabase or deploy Cloudflare. Real 30-question Level Up remains blocked until dedicated staging migration authorization, approved pool counts and signed account testing.

### 2026-11-04 — P9A: Protected ASP bank release preflight (read-only)

- Introduced an authenticated Admin-only P9A preflight RPC in a staged, unexecuted migration. It reports genuine ASP11 human-reviewed candidate counts, Low/Medium/High classifications, 200-Mock-reservation shortfall, nine-domain completion and conditions blocking release.
- Added a compact **Bank release preflight** section INSIDE existing ASP Question Review, with manual Check action and no approval, import, mapping, mock reservation or publication controls. Never exposes source prompts, correct answers or user data through preflight.
- Client verifies the response is read-only, bound to the intended ASP course and always release-blocked; rejects contradictory counts or unexpected domain metadata.
- CI runs Node policy regression and disposable PostgreSQL Admin/learner/anonymous permission checks and verifies preflight does not change real question or review rows.
- **Still pending:** explicit owner-approved migration to an identified staging project, actual verified JWT/Cloudflare runtime QA, human ASP11 mapping, 200-versioned Mock reservation, separate controlled publishing and paid-production readiness. Production database was not accessed or changed.

### 2026-11-04 — P8c: Read-only Admin Level Up bank readiness

- Added **Level Up bank readiness** inside the real Admin ASP Question Review card, with an optional ASP11 domain filter and explicit read-only **Check real bank**.
- Queries the existing protected P8 readiness RPC with a genuine authenticated Admin session for 10/25/50 questions. Shows eligible Low/Medium/High counts and exact readiness per length; preserves the official 70% / proportional checkpoint rule.
- Rejects missing, contradictory, partial or untrusted RPC readiness responses; changes of course/domain invalidate prior results. No direct question table queries, answer keys, service role keys, bank approval/classification or database writes.
- New `test:adaptive:admin` added to CI; existing Practice/Calculator/Mock, P4/P5/P6A protections remain unchanged. Real Supabase question pool counts, Cloudflare deployment and actual JWT/browser sign-off are **not** verified by this source change.

### 2026-11-04 — P8b: Post-migration read-only audit and Level Up activation

- Owner reported manual installation of P8 on their Supabase database; **live installation and bank counts still unverified by assistant**.
- New `supabase/P8_VERIFY_READ_ONLY.sql` validates P8/P4/P5 RPC security and protected adaptive state plus per-course/per-domain reviewed Low/Medium/High pools (ready 10/25/50, max safe N), with no writes, question text, answers or personal data.
- Main Practice Center's **Level Up** card now navigates to real `/practice/live?mode=levelup&course=<slug>` instead of being inert. Preserved old Demo practice controls and disabled reserved Mock.
- Secure Practice resolves the real course slug, preselects Level Up, displays 10/25/50 readiness examples, and rejects stale preflight after changing N/domain. Server continues to enforce P8 readiness and authorization.
- Disposable PostgreSQL and Chromium smoke/contract expanded. No production SQL, no question classification/approval, no Cloudflare deploy executed by this code change.

### 2026-11-04 — P8: Real learner courses + proportional Level Up engine (staged)

- Default **My Learning** now reads Supabase catalog, entitlements, authorized Course→Domain→Topic→Lesson and P2 read-only verified progress. No fake completion or direct P2 writes. Original learning demo remains available with a clear Legacy Preview label.
- Added **Secure Practice** route from old Practice Center; existing Demo Practice, Calculator, Quick 10/Timed/Custom/Domain and fullscreen behavior preserved.
- Staged server-graded Level Up for 1–50 questions, tier checkpoint **max(3,ceil(N×20%)) capped to N**: 10→3, 25→5, 50→10. Cumulative tier accuracy ≥70% advances Low→Medium→High, with recovery possible. Server assigns only one next question after a locked and immutable saved answer.
- Protected P8 migration (NOT installed) demands ≥N approved non-Mock items **per** Low/Medium/High tier and excludes Draft/Unclassified/Mock-exclusive; P4 API bypass and premature finish blocked, P5 abandonment retained. Adaptive mode is disabled until real reviewed bank and owner-approved migration are ready.
- CI adds `npm run test:adaptive:live` and disposable PostgreSQL P8 progression/security test. **No production data, migrations or Cloudflare deployment touched.** Original 200-question 5h Mock stays fixed and exclusive.

### 2026-11-04 — P7: Live Supabase Courses and Course Builder (staged)

- Default authenticated Admin Courses now reads the real lms_courses catalog and creates Draft courses or updates title/summary via existing P1 RLS, never LocalStorage.
- Default Admin Course Builder loads Course→Domain→Topic→Lesson via database UUIDs, saves explicit add/rename actions and reading paragraphs, then refetches. Real missing ASP course displays an honest empty state; no Demo fallback.
- Existing local-only Courses/Builder, question files, media/assessment tools and accepted UI remain available via clearly labeled ?legacyPreview=1. Existing Vite DEV browser QA uses VITE_LOCAL_QA_DEMO=1 plus DEV check only.
- Added real Admin Course and Builder pages, scoped validated authoring API, live role verification hook and responsive CSS; source and disposable PostgreSQL Admin/learner RLS tests.
- Deliberately excluded automatic publication, deletion, migration and permission grants. No production Supabase/Cloudflare action performed. Learner content/progress and paid course launch still pending.

### 2026-11-04 — Real email/password login and guarded four-pilot-account provisioning

- Removed `Login as Learner` / `Login as Admin` one-click actions and visible sample credentials from the default Technica LMS Login page. Email and password are now required for real Supabase Auth.
- Added verified server-checked portal session for default React routes, active Admin/Learner role mapping and Supabase sign-out. Disabled the public `/signup` pilot entry. No ability to self-grant Admin via browser.
- Added owner-run `supabase/PILOT_2_ADMIN_2_LEARNER_ASSIGN.sql` for **two verified existing Supabase Auth admins + two learners**, without writing credentials, changing `auth.users` or creating fake learner role assignments.
- Added `docs/current/FOUR_PILOT_SUPABASE_ACCOUNTS_RUNBOOK.md` and CI login/SQL contract.
- **Not performed:** real Supabase Auth user creation, account approval/SQL execution, Cloudflare deployment, device JWT sign-in tests or paid course publication. The original Demo Question Bank still remains public browser content and is NOT deemed secure paid question storage.
### 2026-11-04 — Diagnose and unblock real ASP Supabase connection

- Removed unnecessary learner entitlement and topic/lesson read dependencies from the isolated secure ASP reviewer, which could previously block review due to unrelated RLS.
- Added **Check database connection** inside ASP review (before/after actual Supabase Auth) to isolate build variables, Data API, active profile, Admin assignment, ASP catalog and P6A RPC. Read-only calls, permission-gated, no secrets or question answers.
- Show meaningful failure instead of indefinite account/catalog loading. Include compiled Cloudflare build revision marker; Worker Builds now fails early if essential public `VITE_` variables are missing.
- Added SQL Editor catalog-only `P6A_VERIFY_READ_ONLY.sql` and CI assertions for Admin/no-Admin isolation, missing RPC, missing bank and no answer exposure.
- **Not performed:** Cloudflare deployment, actual production DB reads or writes, SQL migrations or P3 Admin bootstrap, bank import/approval.

### 2026-11-04 — ASP Review belongs inside Question Bank → ASP course card

- Removed standalone ASP reviewer item from the Demo admin menu; expanded ASP card now hosts **Review & classify**, displaying the real protected Supabase reviewer inside that card without navigating away.
- Preserved old `#/asp-review` bookmarks as admin-guarded redirects to the in-card view; all other courses, Demo bank browsing, search and pagination remain available.
- The secure `asp-review.html` bundle is an internal same-origin frame only. Real Auth admin privilege and P6A RPC still control all question/answer access, with safe same-origin resize messaging and compact iframe login UI.
- Full Supabase Live also shows **Review questions** as an expandable section within the ASP course workspace, not a separate Admin tab.
- **Not performed:** Supabase SQL/Cloudflare deployment, real JWT role integration or ASP bank approval. No Mock reservation or publication. Legacy Practice/Calculator security remains unchanged.


### 2026-11-04 — Fix persistent ASP review Supabase configuration false-negative

- Replaced exact `window.location.pathname` detection with the explicit isolated `reviewMain.jsx` entrypoint, which always initializes actual Supabase Auth for ASP Review irrespective of route rewriting or aliases.
- Added safe public build-configuration present/missing diagnostics; no publishable key is printed to the user or console.
- CI now builds the existing published site with harmless public Supabase fixture variables and verifies they are compiled into browser JavaScript, while preserving the separate full Live build and its no-Demo-answer-bank security scan.
- **No changes to DB/RLS/Question Bank, no Cloudflare deploy executed**; external production configuration and real JWT role checks still require validation.

### 2026-11-03 — Show real ASP Review on the published Technica LMS menu

- The published/default Vite build now emits `index.html` plus a separate real `asp-review.html` based on the isolated Supabase Live entry; original Demo Practice/Calculator are preserved.
- Demo admin sidebar/mobile More **ASP Question Review** now redirects to the actual secure page, not an explanatory placeholder. The secure page requires genuine Supabase Auth, verified active admin role and P6A server RPC authorizations; no simulated/demo role grants access.
- Cloudflare must receive the two public Supabase build variables even when `VITE_DATA_MODE=demo`. The dedicated full `VITE_DATA_MODE=supabase` build remains single-entry, with protected answer-bank bundle checks.
- Added multi-entry output smoke and admin-menu contracts. **Not performed:** Cloudflare deployment verification, P6A migration execution, ASP importer/review, actual JWT/authorization tests or production publication.


### 2026-11-03 — P6A review menu discoverability and Demo/Live clarity

- Added prominent authenticated-admin `ASP Question Review` navigation in Supabase Live and moved the ASP review panel out of the ASP course footer into its own workspace. Selecting review automatically targets the ASP course; missing ASP is explained.
- Added `ASP Review (Live)` in the legacy Demo admin sidebar/mobile More menu as an honest admin-only information screen; **not a live reviewer**. No Demo state or credentials can approve real bank questions.
- Preserved secure server authorization, P6A draft-only approvals, legacy Question Bank, learner menu and all existing Practice, Fullscreen and calculator behaviors.
- GitHub source changes **do not** imply Cloudflare rebuilt/deployed Live, and do not apply P6A SQL to Supabase. The actual deployment mode must be confirmed separately.


### 2026-11-03 — P6A protected ASP question-review workspace (source only)

- Added a new additive, manually deployed P6A migration with RLS-private reviewer decisions, verified-admin-only RPCs for paginated ASP bank review, official nine-domain setup and readiness aggregate; draft questions never become learner-visible through review actions.
- Added an ASP admin reviewer panel in Supabase Live with original question, answer/explanation, official domain and difficulty, human answer/rights confirmation and audit trail. No browser direct raw question-bank query.
- Added `npm run test:p6`, disposable PostgreSQL negative tests and a staging installation/verification guide.
- **Not completed:** Supabase P6A migration deployment, real JWT/device checks, draft importer apply, SME/rights review, reserving 200 Mock-exclusive items, publishing questions, Cloudflare deploy or any production database modification.
- Preserved legacy Demo/Practice, existing ASP IDs and answer keys, fixed Admin Assessment, calculator, P4 answer privacy and P5 fullscreen.

### 2026-11-03 — P4/P5 source-to-staging verification kit (read-only)

- Added one catalog-only SQL SELECT `supabase/P4_P5_VERIFY_ALL_READ_ONLY.sql` to detect **MISSING / FAIL / PASS** for P1/P2 prerequisites and P4/P5 schema, RPC grants, indexes, trigger and abandonment redaction source guard without reading any user/question rows.
- Added `docs/current/P4_P5_STAGING_VERIFICATION_GATE.md` with environment validation, safe SQL Editor procedure, real Supabase JWT and physical-browser test plan, staged migration approval gate and rollback.
- Added a disposable PostgreSQL CI execution of the audit to validate SQL query behavior when P1/P2/P4/P5 fixture schema is present.
- **Not performed:** connecting to the real Technica Supabase project, executing P4/P5 SQL on it, touching production, deploying Cloudflare, changing practice/assessment user behavior or declaring paid production readiness. Source CI results do not certify live Supabase.

### 2026-10-31 — Practice quick-select modes (v1.1.11)

- Added original Technica light-theme quick mode grid referencing previously supplied Pocket Prep conceptual screenshots: Quick 10, Timed Quiz, Practice by Domain, Weakest Subject, Missed Questions, Build Your Own, Level Up and Mock Exam.
- Working modes: Quick 10 (10 untimed, immediate feedback), Timed Quiz (25, whole-test 20 minutes), Practice by Domain (inline course-domain choice), Weakest Subject (from latest scored attempt), Missed Questions (actual wrong bank IDs from latest attempt), and Build Your Own (original editable setup).
- Level Up intentionally marked Coming later until vetted LOW/MEDIUM/HIGH difficulty metadata exists. The distinct 200-question/5-hour mock remains unavailable until the admin-reserved pool is ready. No false ordinary assessment/mock launches.
- Practice selection functions and labels centralized; session records mode while preserving saved Custom setup, scoring, calculator, watermarks and all fixed admin Assessment rules.
- Added deterministic policy/selection tests and end-to-end Chromium desktop/mobile quick mode tests; no DB migrations or Cloudflare deployment.

### 2026-10-31 — Mobile calculator soft keyboard focus regression (v1.1.10)

- Preserve desktop exam focus-loss black shield and existing screenshot-key heuristics.
- Fix mobile false blackouts when opening the software keyboard, dismissing it or minimizing/restoring the calculator: ignore \`window.blur\` alone on touch/mobile; use actual page visibility for background privacy instead.
- Restore any stale shield when the mobile VisualViewport resizes while the page remains visible. No changes to calculator UI, calculations, quiz scores, copy/print, or learner watermarks.
- Add real desktop and 375/390/430 mobile Chromium regression for keyboard focus, blur and resize, calculator minimize/restore, desktop black screenshot when focus lost and mobile hidden-tab masking. Native phone screenshots remain uncontrolled by JavaScript.

### 2026-10-31 — Screenshot focus-loss privacy experiment (v1.1.9, PR #18)

- Pre-mount and synchronously toggle the black privacy overlay on best-effort capture keyboard keydown/keyup, reducing React rerender latency.
- Blackout only active quiz/assessment question screens when browser loses focus or becomes hidden; clear on focus/pageshow/return pointer. Exclude external video players from focus-based blackout to avoid playback interruption.
- Added physical browser screenshot-under-overlay tests and restored-state checks. These validate the CONDITIONAL overlay only, **not** real native screenshot detection or OS screen-record prevention.
- Existing verified clipboard and print behavior unchanged. No Supabase/Cloudflare deployment.

### 2026-10-31 — Actual-use security pilot debugging (v1.1.8, PR #17)

- Fixed a clipboard event-target hole: native Ctrl+C can target document/body even when text selected inside question; now checks Selection ranges in capture phase and preserves unprotected input copy.
- Strengthened browser printing behavior to remove protected React root from printed output instead of only using visibility and pseudo-content; screen stays normal outside Print Preview.
- Added low-opacity Technica learner/session stamp directly over embedded YouTube player without blocking playback controls.
- Upgraded QA from hand-dispatched synthetic copy events to Playwright real Ctrl+C and clipboard readback, plus print media and YouTube overlay checks.
- **Not achieved:** blocking actual OS screenshot/recording, turning YouTube into DRM media, stopping DevTools/media URLs or proprietary print CSS bypasses. Never present those as PASS.

### 2026-10-31 — Web-only learner content protection pilot (v1.1.7)

- Added faint session watermark to practice/assessment questions, learning video/materials, lesson quizzes and post-exam answers.
- Scoped selection/copy/cut/context menu/drag prevention to protected content, leaving calculator inputs and normal site functions usable.
- Added a brief black privacy curtain triggered on best-effort keyboard capture shortcuts (PrintScreen etc.), plus dark print-view CSS. No universal screenshot or screen-recording control is implied.
- Added independent static and Chromium desktop/mobile tests for copy/print, synthetic PrintScreen, watermark and quiz controls.
- Current demo still exposes 1,625 ASP questions and answers in the frontend plus a public YouTube/PDF; this is *not* production content security. Server-based question delivery and future DRM are separate stages.

### 2026-10-31 — Calculator unified 3D blue casing and clean LCD (v1.1.6)

- Removed bright white side strips, replacing them with smooth blue molded edges and darker 3D inset shadows. Retained original physical keypad and rounded 384px body.
- Removed always-on a/b, mixed, root, nth-root, power, eˣ, 10ˣ and X slot shortcut row from the LCD. The LCD now focuses on mode/status, editable expression, recent calculation and result.
- Moved all template actions into TOOLS → Math templates (including Remove slot). The nested editor ref, keyboard shortcuts, existing calculations and Classic input behavior remain available.
- Added source and real Chromium assertions for clean display, TOOLS insertion and calculation, blue casing without white strips, visible main keypad and quiz answer/navigation on mobile.
- No database, scores, timer, question bank, Cloudflare deployment or TI brand/firmware changes.

### 2026-10-31 — Calculator screenshot-based visual polish (v1.1.5)

- Slightly increased physical calculator width on desktop from 354px to 384px, maintained no-scroll keypad and narrow mobile viewport fit.
- Refined silver beveled frame and rounded bottom casing, deeper blue shell and LCD bezel, softer LCD green, tactile key borders and shadows.
- Improved contrast between blue scientific, white numeric, dark arithmetic, yellow-green 2nd and small alternate-function legends. All original 35 main + 6 upper key positions unchanged.
- Extended Chromium layout/contrast assertions with desktop and 375/390/430px phone screenshot artifacts; no changes to quiz logic, timers, scientific calculation, Supabase or learning flow.

### 2026-10-31 — Calculator physical keypad from user reference

- Replaced the old generic 5x9 scientific key grid and permanently visible 8-tab menu with a compact physical-style 5-column/7-row photo-referenced layout (35 main keys + 6 upper controls + circular arrow pad). Upper second labels, white numbers, dark arithmetic and Technica-branded blue shell visually preserve reference groupings without third-party TI assets.
- All existing scientific computation, Math templates, numeric precision, statistics, 1Var/2Var, lists, memory and K remain available through physical keys and contextual menus. Navigation arrows now interact with math template fields.
- Main keypad never scrolls on approved viewports; long Data and Table menus alone may scroll. Added photo-specific layout, real browser no-scroll/visibility checks and retained all quiz/assessment regression gates.
- Original TI logos, firmware and device-level parity claims are not included. No Supabase or Cloudflare deployment.

### 2026-10-31 — TI-30XS MultiView audit, guidebook vectors and real browser QA

- Audited original Technica scientific calculator against official manufacturer function, error, numeric mode, probability and list documentation; created detailed [audit report](docs/current/TI30XS_CALCULATOR_AUDIT_20261031.md) with tested/partial/missing parity for each major feature.
- Fixed incorrect factorial upper bound (70–170 rejected), FRQ >99 domain, TI-style K syntax with 44-character limit, list formula reference/length mismatch and automatic closing parentheses on calculator ENTER.
- Added independently seeded random input and a reproducible generator. Important: it does not mimic the original TI PRNG algorithm.
- New \`scripts/audit-ti30xs-reference.mjs\` is part of the standard CI, alongside earlier calculator/ASP/SQL/build suites.
- Replaced source-only UI assumptions with a separate real Chromium browser pipeline: practice, assessment and learning quiz; desktop 1440px drag & keyboard; mobile 375/390/430px touch, calculator keypad, fraction, quiz answer selection/navigation and browser exceptions.
- Audit found and reproduced a **real mobile answer-click blocker**; repaired the mobile split with in-flow scrollable question pane and bounded calculator, pending newest browser CI proof.
- This is source-level functionality validation, NOT TI hardware/firmware certification, Safari-device acceptance or a published Cloudflare deployment.

### 2026-10-31 — Nested math entry, precision, lists and menus (PR #11)

- Added interactive Math-style expression entry templates (up to 4 levels of fraction, mixed fraction, square/n-th root, power, e-power and 10-power) with keyboard and pointer navigation/edit/remove. Existing Classic text input remains available.
- Added bounded BigInt exact rational calculation to avoid binary floating-point drift for fraction/finite-decimal formulas, 10-significant-digit display, FIX and SCI/ENG presentation.
- Corrected Classic vs Textbook power associativity: 2^3^2 -> 64 vs 512.
- Added dependent L1/L2/L3 formula recalculation and cycle detection, CLEAR/FORMULA menu actions and confirm-before-full-reset. Preserved 42-element limit.
- Added \`npm run test:calculator:mathprint\` and CI gate for nested editor model, rational precision and list behavior. Existing ASP questions, quizzes, timer, learning, routes, authentication demo and Supabase schema unchanged.
- The original Technica UI does not copy TI firmware. This is not officially certified/fully screen-equivalent to MathPrint; specific symbolic combinations and real-device/menu behavior require independent comparative/manual QA.

## 2026-10-31 — Calculator: advanced TI-style functions (source PR #10)

- Added textbook-style exact fraction, simplified integer-root and π-multiple display where mathematically supported, plus approximate toggle, CLASSIC/Textbook, FIX 0–9 and percent display.
- Added seven stored calculator variables, data lists L1/L2/L3 and safe formulas, weighted statistics and quartile/regression outputs.
- Added angle units, DMS, rectangular/polar coordinate conversions, Ask-x table and repeated K operations; repaired signed odd-root handling.
- Added independent math/UI regression script to CI. Existing quiz/assessment/learning scoring, timers, routes, original ASP/PSEE question banks and database have not changed.
- Calculations and UI are original Technica work, not TI proprietary firmware/brand or a pixel-exact licensed emulator. Browser/mobile manual acceptance and device/model output-parity matrix remain outstanding.
- No claims of real Supabase deployment or finished 200-question production Mock.

### 2026-10-31 — Floating scientific calculator in quiz and assessment routes

- New reusable \`ScientificCalculator\` React component with floating desktop window, draggable header, close/minimize, and compact mobile dock. The question and answer controls remain available while it is open.
- Added a dedicated safe scientific engine for standard and advanced operations, angle modes, fraction/decimal conversion, scientific notation, memory, history, 1-/2-variable statistics and a function table.
- Available in Practice, Assessment and the Learning Player 10-question Knowledge Check. No changes to existing bank answers, timer, grading, navigation, user scope, or database.
- Added \`npm run test:calculator\` into CI and a dedicated user guide. Existing imported 1,625 ASP questions and regression suite are preserved.
- TI-30XS MultiView image/model is functional inspiration only; this original Technica tool is not a branded/pixel-exact emulator. Exact model parity for specialized notation and fixed modes, manual browser/touch QA, and future 200-question Mock/Adaptive routes remain follow-up gates.
- Source implementation prepared under PR #9; confirm actual run result and merge status before claiming deployment to main.

### 2026-10-31 — Latest GitHub main source merge verified

- Integrated P0 + P1 through [PR #8](https://github.com/Minamilad162/Technica-LMS/pull/8) (merge `343a913`) after merging P0 [PR #6](https://github.com/Minamilad162/Technica-LMS/pull/6) (`e742d3b`). Prior P1 draft PR #7 closed as superseded.
- Combined PR run #57 and post-merge main run #58 both **PASS**, including npm ci, 1,625 ASP questions integrity, legacy regression suite, Vite build, vulnerability audit, disposable PostgreSQL 16 migration and access/RLS checks.
- **No live Supabase migration or runtime data switch:** browser-demo 1.15.0 remains the application; P1 server schema is source-only and must be applied only after a reviewed staging rollout.

### 2026-10-31 — P0/P1 integrated GitHub source release

- Combined P0 reproducible npm ci and P1 secure PostgreSQL foundation in one source release, preserving existing accepted React UI, imported ASP question bank and demo flows.
- Database migration SQL is NOT executed on any Supabase project. Browser-auth/paid-access/video/exam features are not production enabled. Real Supabase RLS and Auth staging verification remains mandatory.
- Previous GitHub Actions: P0 run #56 (main) SUCCESS, P1 run #55 (branch) SUCCESS. Integrated branch CI and main postmerge CI are separate release gates.

### 2026-10-30 — P1 disposable PostgreSQL security smoke (PR #7)

- Added \`scripts/test-p1-postgres-smoke.sh\` and a \`postgres:16\` ephemeral CI job which executes the real P1 migration and verifies RLS with mock anon/authenticated users and sample entitlements.
- GitHub Actions [run #52](https://github.com/Minamilad162/Technica-LMS/actions/runs/40980524294) verified **both jobs PASS**, including denied anonymous lesson access, course separation, paid/trial gates, expiry/revoke and suspended account. No live Supabase instance was used; final CI head should be checked again.
- This is only the first backend foundation slice. Production Auth, real Supabase JWT/Data API and Storage tests, frontend integration and 200/300 Mock are not implemented. Existing demo left intact.

### 2026-10-30 — P1 backend foundation draft (PR #7; no DB deployment)

- Added a review-only Supabase SQL migration for Course → Domain → Topic → Lesson hierarchy with strict foreign keys and refusal to overwrite legacy tables.
- Proposed trusted profile creation on Auth signup, scoped admin/content-author role assignments, published-content access gated by active trial/paid/manual entitlements, trial lesson allowlist and server-only media metadata/audit records.
- Applied explicit Data API grants and RLS policy declarations to all 11 proposed P1 tables. An old incompatible schema proposal is explicitly marked **do not deploy**.
- Added a static \`test:p1:schema\` and GitHub Actions gate; full pre-existing demo/ASP tests and Vite build were preserved.
- Added P1 staging migration/test/rollback runbook. **Static CI PASS does not establish PostgreSQL syntax correctness or live RLS security.** No database was accessed and no app/UX behavior changed.
- Updated TECHNICA_LMS_MASTER_BLUEPRINT.md; BUG-017/018/019 remain open until staged RLS/auth verification. Reproducible npm-ci lockfile remains separate Draft PR #6.

### 2026-10-30 — P0 build reproducibility (Draft PR #6, not merged)

- Verified existing \`main\` CI run #37 (2026-10-30, head \`274bcad\`): 1,625 original imported ASP questions, existing demo regression scripts, Vite build, dependency audit all PASS; that run used a warned \`npm install\` fallback.
- Generated \`package-lock.json\` using npm on GitHub Actions and committed it to feature branch \`chore/p0-reproducible-install-20261030\`. Changed CI to require \`npm ci --no-fund\`, and removed temporary diagnostic logging.
- CI run #41 (head \`4cbf887\`) passed \`npm ci\`, regression suite, build and audit with 0 known vulnerabilities found at the time of execution. The final PR head must pass too.
- Fixed BUG-013 **in draft PR**, not yet merged; TypeScript typecheck is still pending. No app code, design, imported data, Supabase schema, storage or deployed behavior was changed.
- Updated \`docs/current/P0_BASELINE_AUDIT_2026-10-30.md\` and the canonical \`TECHNICA_LMS_MASTER_BLUEPRINT.md\` with evidence and remaining blockers. P0 partially complete; production remains NO-GO.

### 2026-10-28 — Infrastructure verification and safeguard follow-up

- Verified 20 expected repository paths on main, including all three owner-supplied original document snapshots by expected text lengths.
- .gitignore now blocks all .env.* except .env.example; infrastructure check inspects Git-tracked secrets instead of rejecting ignored local developer secret files.
- No executed npm, browser, security audit, Supabase or Cloudflare deployment result claimed. Production gaps retained in Blueprint.

## 2026-10-28 — Infrastructure integration (documentation + CI, no application feature release)

- Archived the three original owner-provided infrastructure Markdown references under docs/infrastructure/source/; preserved the newer existing root UI_COMPONENT_REFERENCE_GUIDE.md rather than replacing it with an older reference.
- Added docs/infrastructure/README.md, project context, security plan, release checklist, test plan, audit playbook and LMS logic registry.
- Added GitHub Actions initial CI/security gate, weekly Dependabot proposals, and scripts/check-infrastructure.mjs. Updated AGENTS.md and .gitignore to enforce read-first governance and secret safety.
- Added SECURITY.md, DEPLOYMENT.md, DATABASE.md and recorded gaps in the canonical TECHNICA_LMS_MASTER_BLUEPRINT.md.
- **Known gaps:** v1.15 JavaScript demo has no committed package-lock.json nor TypeScript typecheck; CI uses an explicitly warned legacy npm install fallback until fixed. Passing CI does NOT imply production auth/RLS, payment, DRM or protected exam logic.
- **Verification:** files committed and retrieved via GitHub API; runtime npm tests/build/security audit, GitHub Actions run, Cloudflare smoke test and browser QA not performed in this documentation integration. No database migrations, app logic, or production settings changed.

---

## v1.14.0 — Simplified learner home and removed Saved questions

- Removed the redundant ASP five-domain panel from Home / My learning.
- Removed Saved from learner navigation and retired the /saved route.
- Removed bookmark actions from quizzes and review screens; kept Flag for review.
- Preserved admin-only course-based Question Bank and the original ASP bank.


## v1.12.0 — Admin-only course-first Question Bank (demo)
- Removed Question Bank from learner navigation; restricted the direct route and demo role switching to authenticated admin sessions.
- Added a dedicated local demo admin account for client previews.
- Added All courses / ASP Course / PSEE bank selector, preserving ASP's 1,625 imported questions.
- Added 12 explicitly marked fictional PSEE demonstration questions; PSEE remains Draft, unpublished to learners.
- New admin-created courses automatically appear in the question-bank course list.
- Linked Course Builder to its selected course's bank and kept Saved Questions available to learners.
- Added `test:admin-bank` regression suite and updated auth/course-authoring checks.

## v1.11.0 — Full course authoring for newly created courses

- Removed ASP-only module and lesson editor restriction; independent module stacks per course, with legacy ASP migration.
- Added lesson-linked PDF/video attachments in IndexedDB, direct upload and preview, and draft placeholders.
- Added in-builder course Details editing and dummy category dropdown.
- Added manual questions and real XLSX/CSV import with multiple sheets, row validation, duplicate handling and course isolation.
- Added dynamic learner practice and assessment support after publishing courses; fixed per-course admin assessment settings.
- Kept existing 1,625 ASP bank entries and UI styling intact.
- See `COURSE_AUTHORING_GUIDE_v1.11.md`.

## v1.10.1 — Create / Edit Course dialog layout fix (2026-10-26)

- Render course dialog via a React portal to document.body to avoid transformed page containers shifting/clipping fixed overlays.
- Keep course dialog title/close icon and Cancel/Create or Save footer continuously visible while the form has its own scroll area.
- Center and constrain the popup to desktop, mobile, short and zoomed-in viewports (`dvh` fallback included).
- Restore keyboard focus to the Create/Edit trigger after closing; support Escape, backdrop close, Tab focus containment and body scroll locking.
- Retain all existing form validation, draft/scheduled/publish flows, and course data model.
- Add targeted regression/source checks and a stand-alone height/scroll test fixture.

# v1.10.0 — Admin course management & learner profiles (26 Oct 2026)

- Remove ASP question bank coverage section from Overview, keeping the bank itself untouched.
- Add clickable admin Learner profiles with per-person demo progress and training details.
- Separate Courses (`/courses`) from Course Builder (`/builder`) and fix sidebar active states; remove Media library menu.
- Introduce course catalogue with Draft/Published/Scheduled, create/edit and schedule by browser-local time.
- Scope Course Builder's media materials and assessment selections to a chosen course.
- Add local PDF/video uploads via IndexedDB, show clear sample media without attached files.
- Preserve 1,625 ASP questions and the existing assessment/practice/review workflows.
- See ADMIN_COURSE_MANAGEMENT_v1.10.md for feature scope, limits and QA.

## v1.9.3 — Assessment review grouped by course (2026-10-26)
- Course accordion inside Assessment review; attempts and question explanations load inline per selected course and attempt.
- Save each completed assessment in learner-scoped assessment history instead of only keeping `lastResult`.
- Preserve old sample-user last assessment without populating fake historical results.
- Split immediate Practice results into `/practice/results`; Practice is not included in course assessment history.
- Course-specific actions: Practice this course, Retake assessment, Practice mistakes from selected attempt.
- No changes to imported ASP questions, PSEE Coming soon, assessment time/quantity, unlimited retakes or quiz unanswered-answer warnings.
- Responsive, keyboard, and reduced-motion styling in `src/reviewCourses.css`.

## v1.9.2 — Assessment CTA and final-review warning polish

- Removed ASP content/domain card on assessment overview; Start assessment now sits in a dedicated card to the left of Before you start on desktop.
- Removed the three-attempt limit and the max-attempts Admin setting; historical caps in localStorage are ignored.
- Question navigator unanswered warning markers appear only after learner explicitly selects Review and submit, not after each Next.
- All ASP question-bank content and admin-configured exam rules preserved.

# v1.9.0 — ASP Course / Practice versus Assessment

- ASP Course is the parent of 5 imported workbook domains (1,625 verified questions); PSEE is an empty upcoming course.
- Learner practice can choose ASP course domains, question count, timing (including custom total minutes), feedback and question pool.
- Learner assessment chooses a course only. Question count, duration, pass mark, covered domains and attempts are defined in Admin → Course Builder → Assessment.
- Old locally persisted learner assessment overrides no longer determine assessment questions or timer.
- Course names now appear in Home, selection, quiz and results; internal Domain 1–5 labels remain under ASP only.
- Added course-isolation/configuration regression tests. No change to the supplied question bank.
- See ASP_COURSE_ASSESSMENT_GUIDE.md. Browser-only demo, not secure production assessment.

---

## v1.5.1 — Technica Consult logo in navigation

- Added the supplied transparent Technica Consult logo next to **TECHNICA CONSULT LMS**.
- Updated the sidebar, desktop assessment/practice header, mobile top navigation, and mobile slide-out menu.
- Refined responsive sizing for compact laptop sidebars and narrow phone screens.
- Kept course images, 1,625-question ASP bank, test configuration, and all routes unchanged.

## v1.5.0 — Completely replaced image collection

- Replaced all 11 older image assets with distinct new industrial scenes at native 1536–1672 pixel width.
- Added matching smaller mobile WebP images; all 22 assets verified.
- Preserved existing `/images/*.webp` paths and 11 React image mappings.
- Updated `HDImage.jsx` responsive source widths and removed faded blend effects in banners and cards.
- Kept the original 1,625-question demo and all previous LMS pages and interactions.

## v1.4.0 — True HD image replacements (25 Oct 2026)

- Replaced 7 low-detail LMS photos with the newly generated high-resolution industrial photographs, maintaining the exact public image paths.
- Regenerated corresponding `-sm.webp` responsive variants from the new master images.
- Corrected `HDImage.jsx` source set pixel width descriptors to match real file widths.
- Kept the 4 approved image compositions for the dark hero, engineering image, practice with worker and HAZOP with people.
- No database, question-bank, design, workflow, or routing changes.

## v1.3.0 — HD assets and responsive image loading (2026-10-25)

- Improved all 11 photographic LMS assets without changing layouts or subjects.
- New locally hosted responsive image variants for desktop and mobile.
- Added optimized high-priority loading for the hero and lazy loading for secondary imagery.
- Continued to use the same 1,625-question ASP test bank and existing 50-question random selection workflow.

# CHANGELOG

## v1.2.0 — 50 random questions per selected domain (2026-10-24)
- Assessment now defaults to a single selected ASP domain and draws 50 random, unique questions from that domain’s question bank per attempt.
- Retained optional All 5 Domains balanced mode (50 = 10 questions from each).
- Assessment customization: 10, 25, 50, custom 1–50; timing; feedback; All/Unseen/Past Mistakes pools.
- Practice defaults to 50 with all prior customization features preserved.
- Home ASP domain cards open the associated domain assessment setup.
- Added isolated sample engine + automated no-duplicates / randomness / domain isolation tests.
- Correct answers, options and explanations remain unchanged in the Excel-derived JSON; no Supabase connection added.
- Build remains unverified due to npm Registry access; static JSX parse validation and standalone Node tests passed.

# Changelog

## v1.1.0 — ASP 5-Domain question bank integration (2026-10-24)

- Preserved all 7 approved UI/UX screens in React, including mobile responsiveness.
- Extracted first 5 worksheets from the client ASP Excel file: 1,625 verified questions.
- Retained original 4 options, correct answer, explanation, and domain per question.
- Added random unique sampling, question-domain filtering, practice error review, and unseen tracking.
- Assessment draws 10 questions per domain (50 total) and scores against Excel answers.
- Added browsable question-bank page with domain filter, search, answer and explanation expand, and pagination.
- Added domain shortcut cards on Home and imported question counts on Analytics.
- No Supabase database or authentication is required for demo; state is localStorage only.
- Offline bank integrity checks pass; production build/browser QA pending npm dependency installation.

## v1.0.0 — Initial 7-screen LMS UI demo

- React/Vite responsive learner/admin UI and simulated workflows.

## v1.8.0 — Staggered content entrances (2026-10-26)
- Redesigned entrance choreography for learner, practice, assessment, results, library and administration routes.
- Added route-specific ordered motion plans and guarded dynamic content reveals; preserved all existing colors and UI layouts.
- Added nonblocking question-to-question content transitions and gentle score panel emphasis.
- Respected reduced-motion, capped animation delays, improved mobile choreography and avoided extra runtime dependencies.
- Included `PAGE_ENTRANCE_ANIMATION_GUIDE.md` and `npm run test:motion` regression checks.

## v1.9.1 — Unanswered question warning
- Separate visited-and-skipped from not-yet-seen questions in the Question navigator.
- Highlight unanswered question numbers with visible alert markers in both Practice and Assessment.
- When learner requests submission at the final question, show missing-answer count and quick links before allowing explicit blank submission.
- Simplify Assessment overview by removing the redundant read-only configuration card; retain fixed admin settings and summary tiles.
- Add `test:quiz-navigation` regression coverage.


## v1.13.0 — Video/PDF-only lessons
- Restrict course-builder lesson types to Video and PDF; remove manually-entered duration and module total duration.
- Detect video runtime from attached media metadata when supported; PDF has no time.
- Retain existing legacy lesson data and keep assessment timer settings unchanged.

## v1.15.0 — Learner Learning Player
- My Learning now displays a dedicated Process Safety Essentials demo course, instead of a practice-only course landing page.
- Added a responsive learning player with modules, Video/PDF lessons, explanatory text, multiple industrial visuals, local per-account progress, and completion actions.
- Linked a CSB public safety video with an external fallback; produced a two-page original quick-reference PDF.
- Added original 10-question end-of-course self-check (pass >= 70%, explanations, retries). ASP and PSEE question banks are unchanged.
- New `test:learning`, dedicated responsive motion styles, and entrance motion plan. No new runtime dependencies.


## 2026-10-31 — Course Builder hierarchy (staged)
- Added first-class nested Course → Domain → Topic → Lesson authoring with per-course browser-local storage, stable IDs, add/edit/reorder/delete and optional previously uploaded media references.
- Preserved previous modules/lessons under an opt-in legacy accordion; initial new tree labels imported old module headings as unmapped legacy topics, not official ASP exam domains.
- Added `npm run test:hierarchy` and CI check. No production DB, Supabase migration execution or Cloudflare deployment. Existing P1 database migration already has the four-level foreign keys; optional P2 SQL handoff is separate and staging-only.


## 2026-10-31 — P3 Supabase staged backend integration
- Added a physically separate Vite entry for Supabase live builds, excluding demo password/sample ASP answer-bank modules.
- Integrated real email/password Supabase Auth, profile + role checks, verified admin bootstrap template and database-backed course hierarchy management through P1 RLS.
- Added plain reading-text blocks, controlled publication state, account recovery and learner entitlement visibility; P2 learning events/progress are still service-only and not written by client.
- New CI checks: P3 contract test and compiled live-bundle leak audit. Tests cannot substitute for real Supabase JWT/RLS and Cloudflare deployment validation. Existing demo flow remains unchanged.


## 2026-10-31 — P4 secure bank/practice staged
- Added RLS-protected bank, server-owned practice attempts and immutable scoring snapshots, backend-only answer selection and transaction-safe finish using scoped PostgreSQL RPCs.
- Live Supabase mode now has Quick 10, Timed Quiz, Build Your Own and Practice by Domain, with resume, server time and feedback gates; original demo and assessment remain unchanged.
- Added dry-run-first 1625 ASP bank importer (draft/unmapped only), SQL security tests and P4 runbook. No automatic Supabase migration or Cloudflare deployment; Mock/Level Up/official Assessment remain pending.


## 2026-11-03 — P5 Fullscreen question security
- Demo Practice and Assessment now request real native fullscreen at Start; Esc, native fullscreen exit, browser hidden and explicit Exit discard unsent sessions and return to setup.
- Supabase live Practice enters fullscreen for question workspace, watermarks authenticated user ID and browser session, and applies scoped copy/print deterrence. P5 SQL seals abandoned attempts without exposing their question/answer snapshots; no unsafe automatic resume on refresh.
- Added controlled P5 migration, read-only verification, disposable PostgreSQL negative tests, fullscreen browser regression and rollout runbook. No screenshot/recording guarantee, iPhone native element fullscreen not supported consistently, no production deploy.

- Applied P5 fullscreen requirement to the demo lesson's final 10-question knowledge check as well, returning to previous lesson when exiting and preserving prior lesson progress.


## 2026-11-07 — P22 Premium Course Lesson Explorer (development branch; migration not applied)
- Replaced long nested Course syllabus list with a responsive Domain/Topic-grouped Lesson card grid. Selecting a Lesson opens an elegant dedicated learner view with secondary Domain/Topic/Lesson navigation, Video/Reading/Knowledge Check/optional Resources tabs, Previous/Next and progress by Lesson/Topic/Domain/Course. Keeps the original Technica main sidebar and teal/mint style.
- Added playback-segment tracking to existing protected video viewer (only actual played ending counts; skipping to the end not accepted in the normal client), scroll-to-bottom text completion, complete-all-answers quiz submission, and server-backed green progress indicators.
- Added Admin Knowledge Check editor to the live Course Builder (per-lesson question prompts, choices, correct answer, draft/publish), leaving private media signed and existing question/exam bank unchanged.
- Added additive P22 Supabase staging-only migration for learner-owned server-persisted progress, grade-vs-completion separation and Admin-only quiz answer RLS; DOES NOT run from deployment and must be applied only after ledger/backup/authorization.
- Added P22 test script and CI hook; preserved P15/P20/P21 contracts with changes limited to the new UI location. Video playback proof is browser-only and can be spoofed by malicious clients until trusted server checkpoint enforcement is implemented. Live browser/server validation and staged rollout remain gates.
- Rollback: revert P22 UI/import/test additions on branch; SQL roll-forward review required if ever applied. No data deletion, question-bank mutation, real subscription change, CI/release or production database write in this feature.


## 2026-11-07 — P23 Continuous Lesson Viewer and In-page Shortcut Navigation
- Replaced top Video/Reading/Knowledge Check/Resources **panel-switching tabs** with three sticky in-page shortcut buttons: Video, Study Material, Knowledge Check. Every section stays mounted in one uninterrupted vertical lesson page; clicking a shortcut scrolls smoothly to its visible section and the active shortcut follows scroll position.
- Moved protected PDF Attachments to the bottom of the Study Material section, after the reading content and before the Quiz. No separate Resources panel and no change to signed/private P14 media rights or watermarks.
- Reading material now uses natural page scrolling instead of an internally scrollable box; the end-of-reading observer keeps P22's 3-second visibility completion behavior, including short reading content. Existing video playback/quiz completion and Domain/Topic/Lesson rollups remain server-backed, not cosmetic.
- Preserved main sidebar, secondary Lesson navigation, lesson grid, Previous/Next controls, platform-wide P21 subscription, Intro preview, responsive Technica palette and accessibility semantics. No database migrations/production data writes.
- Updated P22 static reading-progress regression and added P23 one-page layout / no-tab-unmount regression to npm and GitHub Actions. Manual signed-browser/mobile tests remain required after CI.
- Rollback: revert P23 frontend changes only; no Supabase rollback needed.
