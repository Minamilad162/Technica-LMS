# TECHNICA CONSULT LMS — PROJECT MASTER SPECIFICATION

> **Canonical project source of truth** · v1.0.0 · 2026-10-28 · Status: Approved foundation / implementation roadmap  
> **Repository:** Minamilad162/Technica-LMS · **Default branch:** main  
> **Priority:** Exam Preparation first; Certificates later  
> **Product language:** English now; internationalization-ready for Arabic/RTL later  
> **Governance:** ALWAYS READ THIS FILE BEFORE ANY CODE, DATABASE, DESIGN, CONTENT, OR DEPLOYMENT CHANGE.

## 0. Purpose, authority, and mandatory change-control

This document is the project's living contract: architecture, approved UX, fixed business rules, current verified implementation, migration path, execution sequence, acceptance criteria, changes, defects, and lessons learned. It supersedes contradictory older planning docs **only where a specific decision below is explicitly marked APPROVED**. It does **not** mean an unimplemented feature is already shipped.

### Mandatory protocol for every future change
1. **Read this file in full first**, plus affected source files, migration history, tests, and relevant prior design guides.
2. Classify the proposed change as one of: **Approved invariant** (must preserve), **approved new scope**, **proposal pending approval**, or **verified correction/bug fix**.
3. Write an impact check: affected roles, course hierarchy, question/attempt/progress data, mobile and desktop UX, security, and old user data. Do not change adjacent approved behavior just to ship a requested feature.
4. Make a minimal targeted change; preserve the existing Technica design language, animations, content, and functioning workflows unless explicitly authorized.
5. Add/update automated tests AND manually verify desktop/mobile flows as applicable. Never claim a test or deployment succeeded without evidence.
6. Update the appropriate sections here in the **same commit as the implementation** (change log, affected requirement/status, test results, regression guard, and defect log if relevant).
7. Include a concise release note: what changed, what stayed unchanged, database effects, tests, and any remaining limitation. Treat migrations as forward-only and backed up.
8. For an approval that changes an invariant, record the previous rule, new approved rule, reason, impact, and date. Never silently overwrite the history.
9. Prefer work on the real application's existing source. Never replace real production data with fake/demo data. Demo mode must stay isolated from production.
10. Do not treat historical README claims as current implementation guarantees; inspect the repo and tests.

### Status terminology
- **APPROVED / LOCKED:** user-confirmed behavior/design; changes require explicit new approval.
- **EXISTING DEMO:** functionality described or present in current repository, but may use browser-local/sample state.
- **TO BUILD:** approved requirement not yet proven production-ready.
- **PROPOSED:** an engineering default subject to owner review.
- **FUTURE:** intentionally deferred.

## 1. Product identity and boundaries

**TECHNICA CONSULT LMS** is an intelligent online learning, examination-preparation, and assessment platform. It is not itself the official BCSP certification exam or an issuer of BCSP's ASP credential.

Two top-level product areas:
1. **Exam Preparation — CURRENT PRIORITY:** courses/materials, protected video, quizzes, question banks, custom/quick/adaptive practice, full mock exams, diagnostics, performance analytics, learner progress.
2. **Certificates — FUTURE:** assignments uploaded by learners, grading and admin review/approval, platform-issued certificates, verification and records. Architect shared identity, billing, roles, and audit now; do not implement certificates workflow yet.

Shared services: authentication/profile, entitlements, billing, notifications, file access, admin management, analytics, accessibility, localization, and operational monitoring.

First course: **ASP — Associate Safety Professional**. More courses can be configured later by administrators without custom development.

## 2. Approved content taxonomy and information architecture — LOCKED

**Course → Domain → Topic → Lesson** is the SINGLE canonical hierarchy for learning materials, learning navigation, and question categorization. Older terms like "module" are legacy display/storage terminology and must be mapped carefully, not silently preserved as a competing hierarchy.

~~~text
TECHNICA CONSULT LMS
├── Exam Preparation
│   ├── Course (e.g. ASP)
│   │   ├── Domain (N)
│   │   │   ├── Topic (N)
│   │   │   │   └── Lesson (N)
│   │   │   │       ├── Rich text / headings / lists / tables
│   │   │   │       ├── Images / diagrams / PDF references
│   │   │   │       ├── Protected video
│   │   │   │       └── Optional lesson quiz
│   │   │   └── Domain-wide practice and analytics
│   │   └── Course-wide practice / mock / diagnostics
│   ├── Practice Center / Results & Review
│   ├── Mock Exams
│   ├── Performance / Personalized Plan
│   └── Live Sessions (later integration)
├── Certificates (future)
└── Shared account / subscription / admin / payments / security
~~~

- Admin may add, rename, reorder, publish, schedule, archive, or manage access for courses, domains, topics, lessons subject to authorization and audit.
- Questions belong to one course and have domain/topic tags (lesson tag optional; tags can be many-to-many where necessary, with one primary reporting taxonomy).
- Question source, reference, explanation, source workbook/sheet/row, import provenance, and history must survive remapping.
- Hierarchy IDs must be stable; published attempts and progress must survive curriculum edits.

### ASP exam blueprint mapping — critical migration warning
The existing workbook/demo has **five worksheet-labeled legacy domains**, whereas BCSP ASP11 (effective September 1, 2025) uses **nine official blueprint domains**. Do not assume workbook "Domain 1" is equivalent to ASP11 Domain 1. Define an explicit crosswalk validated by a subject-matter expert; keep original legacy classifications as provenance until remapping is approved. Domain weights and question coverage should be evaluated against the official blueprint, not fabricated.

Reference: https://www.bcsp.org/hubfs/Website/Blueprints-References/ASP11-Blueprint.pdf

## 3. Existing project baseline — verified / limitations

Source reviewed on 2026-10-28: GitHub repository main README.md, package.json version **1.15.0**, ADMIN_COURSE_MANAGEMENT_v1.10.md, ASP_COURSE_ASSESSMENT_GUIDE.md, and supabase/README.md.

**EXISTING DEMO (preserve and assess rather than rebuild blindly):**
- React 19, Vite 6, react-router-dom 7; existing responsive desktop/mobile UX with admin and learner workspaces.
- Learning/course demo including content/media/player work, question import, quizzes, navigation, tests and motion/design references.
- Course management / course builder, demo practice and assessment flows, results and assessment review, question bank administrative UX, and local media uploads.
- Existing ASP import: workbook ASP_Question_Bank_2500_Simplified.xlsx, nine source worksheets; **first five active**: 250 / 625 / 200 / 300 / 250 = **1,625 imported questions**. Questions and answers/explanations originated in uploaded workbook. Verify uniqueness and correctness before real deployment.
- Legacy practice demo supports customizable domain selection and timing; legacy "Assessment" is separately admin-configured.
- Some user/account, progress, publishing schedules, demo question answers/results live in browser localStorage/IndexedDB. PDF/video demo uploads do not imply production/cloud-secured hosting.
- Supabase schema in supabase/001_lms_schema_PROPOSED.sql is a **proposal, NOT an applied migration**. Supabase is not presently the authoritative production learner store.
- Tests exist as npm scripts (check, verify:bank, test:courses, test:learning, test:admin, test:quiz-navigation etc.). Re-run them on actual working tree; their existence is not proof of current pass status.

**Never describe these as already in production:** real secure auth/RLS, server-side grading/attempts, paid entitlements, live Zoom, video DRM, enterprise-grade audit logs, official certificate issuance.

**Keep preserved:** approved style, bright/light theme, premium modern typography, restrained motion, existing accepted components, responsive mobile-first treatment and desktop layouts, clear iconography, simple UX. Use the UI_COMPONENT_REFERENCE_GUIDE.md and relevant project UI docs before visual changes.

## 4. Personas and permissions

- **Visitor / Demo user:** public/limited access to selected lessons, sample questions, previewable screens; strictly capped trial.
- **Registered Learner:** enrolled content, personal dashboard, lessons, practices, mocks, question review, bookmarks, and performance history permitted by plan.
- **Instructor / Content Editor (optional later):** scoped content authoring subject to admin approval.
- **Admin:** secure CRUD of curriculum/question pools, import/validation, assessment templates, publishing, subscriptions, learner support, reporting, and certificate processing when enabled.
- **Super Admin (optional):** global configuration, staff roles, audit oversight, integrations.

Role claims must be server-issued/verified; UI-only role switching is demo behavior only. Apply least privilege and tenant/course scope where relevant.

## 5. Admin Course Builder and learner content — APPROVED / TO BUILD

An admin must be able to design a course/lesson without modifying code:
- Reorderable rich content blocks; headings, colored text, lists, tables, image/diagram galleries, PDF attachment/viewer, protected videos, useful layout blocks; safe content sanitization.
- Preview, Draft, Scheduled, Published, Archived workflows with reliable server-side scheduling; revisions, author/audit, attribution and stable URLs.
- Lesson quiz creation/configuration: approx. 10–20 questions by default, **admin chooses exact count**, questions selected/linked from appropriate bank; optional pass criteria and retake settings.
- Publish/visibility decisions control entitlements. Autosave drafts and guard unsaved changes.
- Prevent changes to a live exam's historical question snapshot from rewriting past scoring.
- Keep layout templates/theme constraints so admin customization does not break the brand or mobile layout.

**Progress events:**
- Text/image content: consider covered when its mandatory segments have been rendered and the learner has scrolled/advanced through them; avoid credit for merely opening the page.
- PDF: track required pages opened/viewed under an explicit completion rule (not perfect reading proof).
- Video: record watched intervals/playback progress, and mark completed only after meaningful coverage and reaching the end; seeking directly to the end is insufficient.
- Quiz: distinguish submitted, completed, and passed. Admin can require quiz pass for lesson completion.
- Course progress derives from required lesson elements and required quizzes, stored on the server per learner with idempotent events and sync across devices.
- Clearly differentiate **Viewed**, **Completed**, **Passed**; do not claim mental comprehension was proved by passive viewing.

## 6. Exam / practice product modes — APPROVED / TO BUILD

### Entry cards (inspired by supplied references; original Technica visual design)
1. **Quick 10** — one-tap ten-question short practice; simple recommended defaults.
2. **Timed Quiz** — timed practice using chosen duration rules.
3. **Level Up / Smart Adaptive** — automatic Low → Medium → High via threshold engine below.
4. **Weakest Subject** — target lowest-performing domain/topic with sufficient attempts.
5. **Missed Questions** — retry previously incorrect, eligible non-exclusive questions.
6. **Build Your Own** — fully customized practice setup.
7. **Mock Exam** — admin-authored, exclusive 200-question, 5-hour test.
8. **Pre-Assessment** — balanced diagnostic giving personalized recommendations.

The screenshots provided on 2026-10-28 from Pocket Prep are **UX concept references only**: preserve functionality/intent, not third-party logos, copyrighted artwork, or an exact screen clone.

### Build Your Own settings
- Course; one/multiple Domains and Topics.
- Number of questions: quick presets and valid custom integer up to eligible pool size.
- Difficulty: Low, Medium, High, Mixed or Adaptive where applicable.
- Timer: none, time per question, or total exam duration. Explicit time inputs and clear pause/resume policy.
- Answer reveal: after each checked answer or only at the end; for a strict assessment/mock, rules set by admin.
- Submission: manual check answer button OR automatic on selecting an option (where immediate-feedback practice is enabled).
- Source filters: New/Unseen, Answered, Flagged/Bookmarked, Incorrect/Missed; counts shown from current eligible pool.
- Preserve question navigator, Back/Next, flags, bookmarks, save/resume policy, and calculator button.
- Prevent impossible combinations; show number actually available BEFORE start; never silently duplicate questions to satisfy requested count.
- Quick/Custom/Adaptive/Timed/Remediation are **practice**, distinct from admin-fixed formal **Mock Exam**.

### Question counts and reports
Question-selection filters may overlap (e.g. incorrect AND flagged); display counts honestly and deduplicate selected question IDs. Track whether filters are union or intersection in plain-language UI. Eligible counts must exclude Mock-exclusive IDs.

## 7. Adaptive engine: Low → Medium → High — LOCKED

**Purpose:** difficulty advances based on learner performance without revealing internal staging to learner.

- Beginning level is **Low** for Smart Adaptive sessions, unless separately approved.
- Promotion from Low to Medium when learner achieves **at least 70% correct in the evaluated Low group**; from Medium to High at **at least 70% correct in the evaluated Medium group**.
- On less than 70%, continue serving questions at the same difficulty until threshold reached OR session limit reached.
- Suggested initial evaluation group: 20 questions where session and pool size permit; configurable internally for short sessions (PROPOSED default, not owner-approved constant).
- Evaluate cumulative correct/attempted at the **current difficulty**, including extra questions. Promotion is one-way during a session unless new product rule approved; High remains High through end.
- Example of 100-question session: Low 20 with 12 correct (60%) → 10 more Low with 9 correct (21/30 = 70%) → Medium 20 with 16 correct (80%) → High for final 50. Exact split is **dynamic**, not forcibly fixed thirds.
- Maintain requested total question count, not fixed Low/Medium/High quotas. No repeats in same attempt.
- Backend owns selection and grade state; no answer keys, tier transitions, or hidden pool IDs exposed to client.
- If a tier's eligible questions run out or a small requested count prevents evaluation, enforce an explicit, tested fallback (proposed: stop or warn before start; never silently violate exclusive pool or score rule). Record reason as analytics.
- Both skill topic distribution and selected filters must remain valid throughout; avoid a session only testing one topic by accident.
- Show the learner overall test progress, NOT private difficulty stage or 70% mechanics during test.

## 8. Question Bank ingestion and answer integrity — APPROVED / TO BUILD

Minimum data: immutable question ID, course/domain/topic/optional lesson, question stem, ordered choice IDs/text, correct choice, explanation, reference citations, source file/sheet/row, version, difficulty Low/Medium/High, review status, question pool, tags, and creation/update audit.

- Preserve every imported original question, answer/explanation/reference, and source provenance.
- Validate Excel/CSV formats, empty/duplicate questions, invalid correct-choice references, bad encodings, outdated topics, inconsistent option counts, references and file version.
- AI may suggest taxonomy and difficulty from reasoning depth (recall vs application vs analysis), conceptual/computational load, and distractor complexity; **SME/Admin review is required** before publication.
- Data-driven difficulty refinements may use actual learner performance but never silently change official question answer/key.
- Imported 1,625 figure is the **historical active demo count**; verify actual current source, uniqueness and coverage before declaring production bank coverage.
- Remap legacy five worksheets to current ASP11 nine-domain outline only with an approved crosswalk; keep legacy tags.
- Unpublished/retired questions do not enter active tests without explicit template permission.

## 9. Mock Exam — LOCKED owner decision (updated 2026-10-28)

- **ASP Mock Exam: 200 questions; total time: EXACTLY FIVE HOURS = 300 minutes.** This replaces previous 5 hours 30 minutes draft.
- Reason: user requested match with BCSP ASP exam duration. Source: BCSP Complete Guide / https://www.bcsp.org/associate-safety-professional-asp
- Admin creates/locks the exact question set (or a versioned exclusive template); template may be revised by admin, but in-flight/historical attempts must remain pinned to the version they started with.
- **200 Mock Exclusive questions must NEVER be served in Quick/Timed/Build Your Own/Adaptive/Pre-Assessment/Lesson Quiz/Weakest Subject/Missed Questions or post-mock practice review.**
- Reservation is enforced by database constraints and centralized server-side eligible-question selection, not just hidden in front end.
- If selected from the 1,625 historical bank, the maximum remaining candidate pool is 1,425 before other restrictions; confirm duplicates/eligibility before advertising numbers.
- Full test includes server-authoritative countdown, auto-save answers, navigator, review flags, accessible resume behavior for brief outages, submit confirmation, automatic time-expiry submission, server-side scoring, domain/topic breakdown and integrity-preserving result snapshots.
- **Calculator available inside Mock** per approved platform scope. Clarify that on-platform functionality does not imply BCSP's test-center hardware/allowances are identical.
- No official passing-percent equivalence claims without BCSP authorization/evidence. Mock readiness is informative, not certification guarantee.
- Future admin options may allow multiple mock versions; exclusivity applies across all active Mock reserves.

## 10. Calculator — APPROVED / TO BUILD

Use supplied **Texas Instruments TI-30XS MultiView** photograph as a **functional reference**, not a request to reproduce protected logos/branding pixel-for-pixel. Make a clean original Technica scientific calculator with:
- Multi-line expression/history display, fractions, percent, memory, scientific notation, powers, roots, log/ln, parentheses, sin/cos/tan and inverse, proper DEG/RAD, clear/backspace, robust keyboard control.
- Floating draggable/collapsible panel on desktop and ergonomic bottom sheet on small screens; always available in supported quizzes and Mock; do not obscure question text or answer controls.
- Calculator state persistence within a session where appropriate. Test numerical correctness, parsing precedence, decimals, edge cases and responsiveness.

## 11. Results, Review, Pre-Assessment & Analytics — APPROVED / TO BUILD

Following the reference screenshots, present:
- Overall percentage, answered correctly / total, total quiz duration, average time/question, by-domain/by-topic breakdown, chronological improvement.
- Review tabs: **All**, **Flagged**, **Incorrect**, **Correct**; optionally Unanswered. Click a question to inspect full explanation/reference when review is permitted.
- Personalized focused recommendation, e.g. "You missed 4 questions on topic X; review Lesson Y and take a 10-question concept quiz" — counts must come from genuine student events, no invented analytics.
- Weakest-topic quick action only after enough valid samples; distinguish low confidence from proven weakness.
- Track question coverage: new/answered/flagged/incorrect and per-difficulty performance with overlap awareness.
- **Pre-Assessment**: configurable balanced introductory diagnostic by eligible Domains/Topics; low and high confidence labels; strengths/weaknesses and recommended lesson order.
- **Learner Dashboard**: personal progress, practice accuracy, readiness indicator, time spent, recent exams, resumption, streak/calendar if desired (streak is optional; not a substitute for learning).
- Community averages shown in references are **OPTIONAL** and must be calculated from anonymized, sufficiently sized cohorts with privacy controls; do not invent a 76% average from screenshots.
- Personalized readiness is advisory; neither an official BCSP score nor a promised pass prediction.

## 12. Media protection — honest security boundaries

- Content must be accessible only to entitled users; private object storage, short-lived signed playback, server-authorized access, watermarking (account/session), controlled device/session policy, abuse logging, and rate limiting.
- Production high-value paid video: evaluate multi-DRM (e.g. Widevine/FairPlay/PlayReady via a suitable provider) with device/browser compatibility and license cost tests.
- Basic signed-video URLs alone are not full DRM.
- **No website can guarantee prevention of external-camera recording or all screen captures.** Marketing/UI must not claim impossible 100% screen-record prevention.
- Secure PDFs where practical; warn that any viewable visual content can be photographed.
- Do not publish paid protected video using unrestricted public URLs.

## 13. Payments, subscriptions, demo & Zoom

**Payments — TO BUILD:** Egypt and international payments; gateway shortlist Paymob / PayTabs subject to merchant eligibility and settlement details; full server webhook validation, idempotency, refunds, chargeback handling, renewal/expiry/revocation, and reconciliation. Avoid storing card details.

**Plans — TO BUILD:** Admin-defined bundles per course/modality, start/expiry, entitlements, trial limits, plan changes and coupons. Existing proposed plan durations (1/3/6/9/12 months) are configurable, not hard-coded.

**Demo — APPROVED:** limited sample lessons, question previews, a very small capped interactive practice experience, with secure isolation from paid/private banks and a smooth upgrade path. Demo is **not** a full anonymous bank export.

**Live sessions — TO BUILD LATER:** Zoom Meeting SDK for Web inside Technica interface where technically supported; per-session entitlement, scheduling, instructor controls, attendance, calendar and optional recording policy. Verify actual Zoom SDK, licensing and mobile compatibility before finalizing UX. Do not describe as currently integrated.

## 14. Architectural direction, schemas and security

**Retain core stack:** React/Vite SPA, Cloudflare Pages/Workers where appropriate, Supabase Auth/PostgreSQL/RLS/Storage/Edge Functions (production target). Separate presentation components from repositories/services and exam policy.

Suggested normalized entities (final schema requires review):
- identity: profiles, user_roles, course_enrollments, entitlements, sessions/audit;
- curriculum: courses, domains, topics, lessons, lesson_blocks, lesson_media, lesson_quiz_templates, content_versions;
- questions: questions, question_choices, question_topics, question_versions, imports, classifications, exclusive_question_reservations;
- exams: exam_templates, exam_template_versions, exam_template_questions, exam_attempts, attempt_questions_snapshots, attempt_answers, flags/bookmarks, attempt_timers/events;
- learner: lesson_progress, progress_events, practice_history, assessment_results, preassessment_reports, competency_summaries;
- commerce: plans, subscriptions, checkout_sessions, payment_events, refunds;
- later: live_sessions, meeting_attendance, assignments, grades, approvals, certificates, certificate_verification.

**Security invariants:**
1. No service_role key or answer keys in public frontend bundle.
2. Exam attempt generation, timing and grading validated on the server with auth, entitlements, pool isolation and course scope.
3. RLS + explicit least-privilege GRANTs for each exposed schema/table/function/bucket; never blanket anon write privileges.
4. Store official scoring inputs/versioned snapshots server-side; treat localStorage as a cache only.
5. Rate-limit sensitive endpoints, validate uploads/MIME/size, use private storage, audit admin changes, avoid leaking personal results.
6. Design idempotent autosave/submission, server timestamps, locked expiry and graceful interrupted-session recovery.
7. Back up and test migrations; never drop/overwrite existing user attempt/progress data without explicit approval.

## 15. UX design principles and visual references — LOCKED unless reapproved

- User-facing site copy is **English first**. Prepare i18n keys and RTL-safe layouts for future Arabic, but do not switch entire UI to Arabic now.
- Premium, contemporary, clean **light theme**; modern typography, subtle hover/transitions, clear hierarchy, purposeful icons, compact copy.
- **Mobile-first** responsive behavior; no horizontal scrolling for primary content, avoid overlapping controls; preserve desktop presentation.
- Fast skeleton loading, keyboard navigation, clear focus, readable contrast, sensible empty/loading/error states.
- Pop-up/overlay patterns where helpful, but exam focus mode should prioritize available viewport and reading comfort.
- Existing v1.x visuals accepted previously must not be "redesigned" as a side effect of backend work.
- Reference Pocket Prep screenshots supplied October 28, 2026:
  - Mode cards: Quick 10, Timed Quiz, Level Up, Weakest Subject, Missed Questions, Build Your Own, Mock Exam.
  - Quiz settings: show answers at end; manual Check Answer vs automatic submit on option selection; filters New, Answered, Flagged, Incorrect; question-count slider plus numeric field.
  - Results: score gauge, correct/total, average question time, total quiz time, concept-specific follow-up quiz recommendation; review tabs All/Flagged/Incorrect/Correct.
  - Calculator screenshot: TI-30XS MultiView concept and multi-line display.
- Reproduce the **interaction concepts** in original Technica branded UI rather than a visually identical competitor clone.

## 16. Implementation milestones, in mandatory dependency order

| ID | Milestone | Deliverable / acceptance gate |
|---|---|---|
| 00 | Repo audit and baseline | Check main, source map, tests, inventory of legacy data/media/routes, no destructive changes; mark verified vs demo. |
| 01 | Production architecture and hierarchy | Course→Domain→Topic→Lesson schema and migrations, stable IDs, RLS/grants, adapter boundaries, migration mapping. |
| 02 | Admin course/lesson builder | Real CRUD, rich blocks, secure media, preview, publishing and quiz-config workflow. |
| 03 | Learner player and progress | Real personalized progress events, PDF/video completion rules, sync, dashboard core. |
| 04 | ASP bank verification & reclassification | Source audit of 1,625, answer preservation, official nine-domain crosswalk proposal, SME review, difficulty labels. |
| 05 | Secure practice engine | Quick 10 / Timed / Custom, filters, timer, answer modes, bookmarks/flags, review. |
| 06 | Adaptive engine | Server-side 70% progressive tiers, no-repeat/exclusion invariants, edge-case tests. |
| 07 | Mock and calculator | Versioned reserved 200, EXACT 300-minute timer, secure resume/submit, scientific calculator. |
| 08 | Diagnostics and analytics | Pre-Assessment, strengths/weaknesses, recommended focused quizzes, truthful aggregate results. |
| 09 | Subscriptions, payments and trial | Real Egypt/international gateway, plans/entitlements, limited safe demo, reconciliation. |
| 10 | Protected video and live sessions | DRM assessment/implementation, secure playback, Zoom integration as separately ready. |
| 11 | Production readiness | CI, migrations, security/privacy, load, cross-device/mobile, accessibility, backup, audit and incident runbooks. |
| 12 | Certificates — deferred | Assignments, admin grade/approval, platform certificate issuance/verification. |

**Current next action:** milestone 00 audit → milestone 01 data architecture. Do NOT rebuild the whole UI or deploy database migrations blindly.

### Definition of done for EVERY milestone
- Implemented in actual existing repo; no regression of approved design/workflows.
- Relevant unit/integration/security tests included and executed; real browser mobile/desktop test when UI touched.
- Data migration and rollback/forward repair plan documented; no sample/production mixing.
- Update status above, change log below, and open-risk/bug register below in same commit.
- Release note / Git commit identifies precise scope; never mark untested parts PASS.

## 17. Priority automated regression tests

- Taxonomy CRUD preserves ASP question count, IDs, answers, legacy mapping, learner progress and old assessment results.
- Mock exclusive 200 never enters ANY practice, trial, diagnostic, remediation or lesson quiz pool, regardless of filter/API call.
- 200-question mock begins with exactly 300 minutes; server-time expiry, autosave, refresh, reconnection, timeout and double-submit are consistent.
- Adaptive Low/Medium/High only promotes on cumulative >=70% at required checkpoint; <70% remains tier; no duplicate; exact requested count; pool exhaustion handled.
- Practice filters New/Answered/Flagged/Incorrect show honest counts, overlap and selection logic.
- Instant/after-submit answer modes and manual/auto answer submission behave as selected; formal exam cannot disclose correct answer early.
- Per-question vs whole-test timers, pause/resume policies and flagged navigation consistent on mobile/desktop.
- Protected content, PDF, video entitlement and lack of leaked keys/answers verified for anonymous/non-enrolled/expired users.
- Payment webhooks idempotent; learner cannot self-grant subscription/admin roles.
- Track lesson video watched intervals (seek-to-end alone not completion), material/PDF events, per-user progress consistency.
- Calculator mathematical precedence, fractions/trig/log/DEG/RAD and accessibility.
- No regressions in accepted mobile navigation, layout, transitions or practice history.

## 18. Known gaps, bugs, lessons learned / regression register

| ID | Type / state | Description | Permanent guard / action |
|---|---|---|---|
| REG-001 | CONFIRMED LIMITATION / OPEN | v1.15.0 application remains a browser-local demo in checked docs; cloud auth, grading, entitlement and reporting are not verified production-ready. | Never label demo flows secure; implement and test server-backed functions before launch. |
| REG-002 | MIGRATION RISK / OPEN | Historic ASP source active bank is 5 workbook domains; current ASP11 has 9 official domains. | Preserve original tags, explicit SME-approved crosswalk, compare official blueprint, regression tests. |
| REG-003 | CRITICAL SECURITY RULE / OPEN | A practice-available question must never share Mock Exclusive pool. | Central server selection and DB reservation constraints + adversarial tests. |
| REG-004 | APPROVED CORRECTION / FIXED IN SPEC | Original mock estimate was 5h30; updated by owner to **5h exactly** on 2026-10-28. | Mock config/test asserts 300 minutes; remove 330-minute defaults from future implementation. |
| REG-005 | EXPLICIT LIMITATION / OPEN | Full screenshot/video recording prevention is not technologically guaranteed on the web. | DRM + signed links + watermarks + honest documentation; never promise 100%. |
| REG-006 | HISTORICAL UI ISSUE / VERIFY | Earlier demo login "Account not found" for TC1001 / Demo@1234 was addressed in v1.6.1 README. | Re-run demo auth tests; preserve existing sign-in options and test mobile navigation. |
| REG-007 | UX REGRESSION RISK / OPEN | User-approved bright premium design can regress during feature builds. | Consult UI guide and snapshot mobile/desktop before and after each change. |
| REG-008 | ANALYTICS INTEGRITY / OPEN | Demo sample results and screenshots cannot be treated as real progress or community averages. | Strict data-source labels, real-event aggregates, privacy and sample-size rules. |

### How to register a newly found error
Create a new row with ID, date, severity, reproduction steps, affected versions/roles, root cause, precise fix commit, regression test name, verification and final status. Do not remove historical entries after fixing; mark FIXED and link regression guard.

## 19. Decision register (owner-approved truths)

| Date | Decision | Status |
|---|---|---|
| 2026-10-28 | Hierarchy exactly Course → Domain → Topic → Lesson | APPROVED / LOCKED |
| 2026-10-28 | English-first, future Arabic possible | APPROVED / LOCKED |
| 2026-10-28 | Exam Preparation prioritized; Certificates later with assignments/admin approval | APPROVED / LOCKED |
| 2026-10-28 | ASP first course; existing Excel questions and explanations/references preserved | APPROVED / LOCKED |
| 2026-10-28 | Rich admin editable lessons, media, video, lesson quiz, personal progress | APPROVED / LOCKED |
| 2026-10-28 | Quick/Timed/Custom/Adaptive/Weakest/Missed/Mock quiz concepts & settings from supplied screenshots | APPROVED / LOCKED |
| 2026-10-28 | Adaptive Low → Medium → High, minimum 70% correct to advance, hidden staging | APPROVED / LOCKED |
| 2026-10-28 | Admin-owned 200 Mock Exclusive questions isolated from all other quizzes/modes | APPROVED / LOCKED |
| 2026-10-28 | Mock duration corrected to EXACTLY 5 hours (300 min) | APPROVED / LOCKED |
| 2026-10-28 | Results review tabs, concepts, weakness analytics and Pre-Assessment | APPROVED / LOCKED |
| 2026-10-28 | TI-30XS-style integrated scientific calculator | APPROVED / LOCKED |
| 2026-10-28 | Limited trial, Egypt/international payments, protected video, in-platform Zoom later | APPROVED scope; implementation pending |
| 2026-10-28 | Every approved change must update this master spec and preserve historical bugs/decisions | APPROVED / LOCKED |

## 20. Change log

### 2026-10-28 — Master specification v1.0.0
- Created canonical master specification and mandatory future-agent governance.
- Consolidated all owner requirements, existing repo baseline, supplied quiz/results/calculator visual references, architecture and ordered milestones.
- Corrected Mock Exam timer from proposed 5h30 to official ASP-aligned 5h = 300 minutes.
- Distinguished historical five-sheet demo ASP import from current nine-domain official blueprint; crosswalk marked pending.
- Logged known risks and protection against previously accepted logic/visual regressions.
- **Documentation-only:** no claim of newly completed production features, database migration, or passing test suite.

---

### Instructions to coding agents and contributors

**Before editing code:** read this file and UI_COMPONENT_REFERENCE_GUIDE.md, check actual main branch and affected existing tests. **After every approved edit:** update this file in the same PR/commit (feature status, technical decisions, changed milestone, tests, bug lessons, change log). If a requirement conflicts with a locked decision, seek explicit owner approval before altering it. Ship targeted improvements, not undocumented redesigns.