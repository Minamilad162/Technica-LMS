# TECHNICA CONSULT LMS — MASTER SYSTEM BLUEPRINT

> **Canonical project specification / single source of truth**
>
> Project: Technica Consult LMS
> Version: 1.0.6 (P1 backend foundation draft implementation)
> Last updated: 2026-10-30 (Africa/Cairo)
> Repository: https://github.com/Minamilad162/Technica-LMS
> Target branch: main
> Current inspected source baseline: v1.15.0, commit 8021f604c63c59b2100d944ead86fed149eb1ceb
> Language: English-first; i18n/Arabic + RTL-ready later
> Status key: APPROVED = user requirement; DEMO = exists only in browser/local demo; PLANNED = unimplemented production work; FUTURE = intentionally deferred; PROPOSED = technical recommendation awaiting validation.
>
> **Maintenance covenant:** This document must be read before every Technica LMS change and updated in the same change as the implementation or decision. Never claim a feature is production-ready because a browser-only demo screen exists. Preserve approved decisions, designs, datasets and regression behavior unless the owner explicitly changes them. Keep an append-only decision/change log and a tracked error/regression register. Never silently overwrite historical decisions; mark them superseded and reference the replacement.

---

## 0. Read this first: approved non-negotiables

1. **Product areas:** Exam Preparation is the priority; Certificates is a future separate workflow using shared identities, payments and administration.
2. **Hierarchy is Course → Domain → Topic → Lesson.** This applies to learning navigation, question classification and performance analysis. Admin creates/edits these objects; no course-specific hardcoding.
3. **Initial course:** ASP = **Associate Safety Professional**, the correct BCSP credential name. Preparation is independent, not an official BCSP exam or qualification and must not misrepresent affiliation/endorsement.
4. **Site UI is English** with an extensible translation architecture for later Arabic.
5. **Content:** Admin-authored, rich lessons (headings, formatting/approved colors, text, images, PDF, video); quizzes set by admin (e.g., 10 or 20 questions); progress recorded per learner.
6. **Practice:** Quick 10, timed/custom options, adaptive Level Up, Weakest Subject, Missed Questions and question review. User chooses question count, time mode, difficulty preference, answer reveal timing and eligible question-history pools as permitted for each mode.
7. **Adaptive logic:** Hidden Low → Medium → High; promotion after **at least 70% correct** in the current difficulty stage. Failing to reach threshold retains the stage, subject to the attempt's question limit and available eligible bank. Difficulty labels/stage transitions are not shown during the active adaptive test.
8. **ASP Mock Exam:** **200 exclusive, admin-reserved questions**, **300 minutes exactly (5 hours)**, admin-defined form, fixed timing and protected delivery. Reserved questions are completely excluded from learning quizzes, Quick 10, custom practice, adaptive practice, diagnostics, trial demos and any other exam/form unless an admin explicitly unreserves them. One learner's mock answers do not unlock them for other modes.
9. **Mock time supersedes 5h30:** The official BCSP ASP exam time is 5 hours; 5h30 belongs to the separately listed CSP exam. The initial mock is 200 questions / 5h, not a 5h30 assessment.
10. **Calculator:** Floating/dockable scientific calculator available in question flows, functionally inspired by TI-30XS MultiView. Implement our own licensed-safe appearance/engine; do not copy TI logos/artwork/software without permission.
11. **Video/IP protection:** Strong deterrents (authorization, signed short-lived playback, HLS/DASH/DRM if provider supports it, viewer watermarking, concurrency/rate controls), **but never promise impossible 100% screen-recording prevention** on uncontrolled user devices.
12. **Shared services:** secure per-user accounts, trial entitlements, subscriptions, payment methods usable in Egypt and internationally, learning/activity analytics, later embedded Zoom live classes.
13. **Prior UI choices remain preserved:** premium LIGHT responsive visual style, existing teal/mint/navy palette, subtle animations, mobile usability; keep admin-only Question Bank; do not resurrect removed learner Saved screen/button without new approval; Flag for review stays.
14. **Existing question content:** preserve all imported original question IDs, wording, answer indices, explanations/references and history; never invent missing ASP labels or answers, and never blend PSEE demo questions into ASP.
15. **Current technical boundary:** existing code is a React/Vite browser-local DEMO, not production. Server-side users, protected question delivery/scoring, payments, DRM and real multi-device analytics are not implemented merely because analogous frontend UI exists.
16. **Regression/change control:** Every edit must include an impact assessment, compatibility/migration plan, tests, change-log entry, and rollback note. No unrelated redesign or removal of approved functionality.

## 1. Product architecture and navigation

### 1.1 Top-level product

- **Module A — Exam Preparation [APPROVED / priority]**
  - My Dashboard / Learning Home
  - My Courses / Learning Player
  - Practice Center / Quiz Modes
  - Mock Exams
  - Results, Review & Performance Analytics
  - Study recommendations / pre-assessment
  - Live Sessions [FUTURE]
- **Module B — Certificates [FUTURE, reserve architecture now]**
  - Certificate programmes
  - Assignment submissions + evidence
  - Admin marking/review and approve/return workflow
  - Approved grades, certificate issue/download, verification and audit records
  - Technica-issued certificates are not BCSP credentials unless independently authorized
- **Shared platform**
  - Auth, profiles and roles; entitlements; payments/subscriptions; files/media; notifications; analytics; audit/security; global admin; trial/demo; localization.

### 1.2 Admin workspace

- Overview, Courses, Course Builder, Learners, Question Bank (admin only), Exam/Mock Builder, Results & Reports, Subscriptions/Payments, Media & Live Sessions (planned as screens/integration, not necessarily restored as a sidebar item), Settings & Audit.
- Admin manages Courses → Domains → Topics → Lessons, publish states, resource blocks, quizzes, assessment settings, published versions and question-bank classifications.
- Admin can mark 200 questions as **mock-exclusive**; selection must be validated atomically on the server. Admin can replace form questions with versioning and explicit release of reservations.
- Admin may add new courses beyond ASP with isolated banks, pricing, course paths and lesson content.

### 1.3 Learner workspace

- Home/Dashboard shows enrolled courses, continue learning, overall and domain/topic proficiency, time spent, diagnostic suggestions and progress.
- My Courses → course → domain → topic → lesson (reading/images/PDF/secure video/lesson quiz).
- Practice Center: Quick 10, Timed Quiz, Level Up, Weakest Subject, Missed Questions, Build Your Own, and Mock Exam access (distinct policy).
- Results & Review: All / Flagged / Incorrect / Correct; explanations and references after allowed reveal point; contextual Start Concept Quiz recommendations.
- Question page: clean text, image/math when relevant, answer cards, navigation, mark-for-review, progress/timer and floating scientific calculator.
- Profile, entitlements and payments. English UX, keyboard accessibility and phone-friendly focused quiz.

## 2. Existing implementation: verified repository audit (2026-10-28)

**Inspected repository main at 8021f604... (v1.15.0):**
- React 19 + Vite 6 + react-router-dom; local-browser React state/localStorage with media bytes in IndexedDB.
- Course-first ASP practice/assessment; 1,625 imported ASP questions from five Excel sheets labeled only Domain 1 through Domain 5. Distribution: 250 / 625 / 200 / 300 / 250.
- Underlying workbook contains 2,500 question records across nine sheets; prior ASP importer included the first five / 1,625 and skipped 875 as out of the existing demo's 5-domain scope. These 875 are NOT automatically validated against the current official blueprint.
- Admin Courses catalogue, Draft / Published / Scheduled, Course Builder with per-course modules and PDF/video demo upload/preview, manual question entry and Excel/CSV import, admin configuration of fixed course Assessment.
- The existing learner customizable Practice is historically limited to 1–50 questions; timer and pool controls exist as demo UI.
- Admin-only course-grouped Question Bank; role-gated in UI only. Demo login is not production security.
- PSEE is a separate demo course with 12 explicitly fabricated question examples, NOT part of ASP bank. Do not use them to claim validated educational content.
- An independent Process Safety Essentials learning-player demonstration exists (2 modules, 3 lessons, CSB YouTube embedded case-study video, images, original two-page PDF, 10-question self-check, local learner progress). It is NOT yet dynamically connected to the admin Course Builder, not protected streaming, and progress is browser-local.
- Course-based assessment review/history, practice results route, answer explanations, flags, browser autosave, light responsive motion/UI and existing regression scripts exist in demo form.
- Last known learner UI decision v1.14 removed the redundant ASP five-domain panel from Home/My Learning and removed the learner Saved navigation, /saved route and Save question actions. Per-session Flag remained.
- Existing Supabase folder is an UNDEPLOYED proposal; existing supabase.js client stub does not make data production-connected.
- Existing admin assessment limits (1–50 questions, 1–180 minutes) are historical demo behavior; the new **separate 200-question / 300-minute Mock Engine must not inherit them**.
- Existing scheduled publication is based on browser local clock only. Server scheduling is PLANNED.
- Existing README has older historical descriptions; this master spec overrides it for new scope, while preserving historical changelogs as evidence.

Reference internal docs: README.md; CHANGELOG.md; DESIGN_GUIDE.md; UI_COMPONENT_REFERENCE_GUIDE.md; ASP_COURSE_ASSESSMENT_GUIDE.md; COURSE_AUTHORING_GUIDE_v1.11.md; QUESTION_BANK_ADMIN_COURSE_VIEW_v1.12.md; LEARNER_UI_SIMPLIFICATION_v1.14.md; LEARNING_PLAYER_DEMO_v1.15.md; supabase/README.md.

**Status matrix**

| Capability | 2026-10-28 state | Next production gap |
|---|---|---|
| React demo shell / desktop/mobile UI | DEMO | Visual QA, production integration |
| Course catalogue and builder | DEMO | Canonical Course/Domain/Topic/Lesson backend |
| ASP 1,625 imported bank / 5 demo domains | DEMO data | Audit, 9-domain blueprint mapping, secure API |
| PSEE sample and learning example | DEMO | Content provenance, isolate demo from commercial offering |
| PDF/video local upload | DEMO / IndexedDB | Authenticated server storage/CDN and access policy |
| Learning completion / self-check | DEMO | Verified server events and per-user rollups |
| Practice & fixed Assessment | DEMO | Flexible production practice and secure scoring |
| Adaptive 70% Level Up | PLANNED | New service/policy |
| Exclusive ASP Mock 200 / 5h | PLANNED | New reserved question pool and attempt lifecycle |
| Diagnostic/readiness analytics | PLANNED | Quality thresholds and truthful confidence labels |
| Scientific calculator | PLANNED | Original, tested component |
| Trial/paid access, Egypt/global payments | PLANNED | Payment provider, webhook and entitlement |
| Secured video & in-platform Zoom | FUTURE | Provider evaluation/integration |
| Certificates and admin assignments | FUTURE | Separate workflow |

## 3. Content hierarchy and ASP blueprint

### 3.1 Mandatory hierarchy

Course (ASP) → Domain (e.g., mathematical calculations) → Topic (specific competency) → Lesson (ordered learning unit).

- One course has many domains; one domain many topics; one topic many lessons.
- Course, domain, topic and lesson have stable IDs, slug, localized title, description, sort order, publish/version metadata; soft archive, not destructive deletion when learner history exists.
- Question belongs to exactly one course, a primary domain and primary topic; lesson association can be optional or many-to-many if question is used in related lessons. Preserve original source metadata and raw workbook sheet mapping.
- Every course can have a separate question pool, mock policy, assessment setup, learning units and entitlements.
- All admin authoring uses reusable blocks/templates, not custom code per ASP page.

### 3.2 Official ASP11 mapping (effective 2025-09-01)

Latest authoritative exam-blueprint version is ASP11. Current domain names and target distribution:

| Domain | Name | Weight |
|---|---|---:|
| 1 | Mathematical Calculations | 10% |
| 2 | Safety Programs and Concepts | 25% |
| 3 | Ergonomics | 8% |
| 4 | Fire Prevention and Protection | 12% |
| 5 | Emergency Preparedness and Response | 10% |
| 6 | Industrial Hygiene and Occupational Health | 12% |
| 7 | Environmental Management | 7% |
| 8 | Training, Education, and Communication | 11% |
| 9 | Legal | 5% |

**Content migration blocker:** The existing five Excel sheet labels DO NOT prove that sheet Domain 1 maps semantically to official ASP11 Domain 1, etc. Even if the workbook has nine sheets, validate questions against the **ASP11 topic definitions**, detect outdated curriculum, preserve original source, and publish mappings only after review. An import should classify all 2,500 workbook rows as candidate source content, NOT silently release all 2,500 as approved live ASP questions. Manual SME validation and question-rights review required. Difficulty Low/Medium/High is educational metadata, not an official BCSP difficulty rating.

Official source links:
- https://www.bcsp.org/associate-safety-professional-asp
- https://www.bcsp.org/credentials-at-a-glance
- https://www.bcsp.org/hubfs/Website/Blueprints-References/ASP11-Blueprint.pdf?hsLang=en
- https://www.bcsp.org/bcsp-news/2025-current-changes-index-board-of-certified-safety-professionals

### 3.3 Question model

Recommended fields: question_id (stable immutable), source_id/source_sheet/source_row, course_id, primary_domain_id, primary_topic_id, lesson links, stem_richtext, answer_option_ids (3/4 options as supported), correct_option_id (protected), explanation_richtext, references[], media[], authored_difficulty LOW|MEDIUM|HIGH, confidence/reviewer, reviewed_at, status DRAFT|REVIEWED|PUBLISHED|ARCHIVED, type, tags, language, version, content_hash, rights/provenance, mock_reservation_id nullable, created_by, audit fields.

Never overwrite original user-supplied text while AI-classifying. Propose difficulty classifications using a reproducible rubric and record confidence; human admin reviewer approves/bulk adjusts. Detect duplicates, broken math, answer-option ambiguity and stale references before publication.

## 4. Admin lesson builder & learner progress

### 4.1 Content editing

- Admin may compose reusable blocks: headings, rich text, callouts, images with alt text, annotated figures, downloadable/embedded PDF according to rights, video, mini-interactions, references and lesson-end quiz.
- Admin-controlled colors are constrained to safe design tokens/accessibility contrast; no arbitrary HTML/scripts/CSS injection. Draft preview, reorder, autosave, scheduled publication, version history, publish and rollback.
- Admin chooses number of quiz questions (typical 10–20), eligible topic/question subpool, passing threshold (configurable), attempt policy, reveal timing; validate enough non-mock eligible questions are available.
- Mobile/desktop player supports sections, media playback and completion status.

### 4.2 Progress semantics (new approved behavior)

- **Written/image/PDF material:** Mark the applicable section completed when the learner actually reaches/opens it using a sensible visibility/scroll checkpoint; page load alone does not imply reading. Save a server event with idempotency and per-user/course/lesson status. This is coverage tracking, NOT proof of comprehension.
- **Video:** Mark complete upon a verified playback-end checkpoint close to 100% plus reasonable watched-segment coverage. Merely dragging the seek bar to the end must not count. Progress resumes; server rejects invalid/duplicate/out-of-order events where practical. Avoid claiming unforgeable browser watch proof.
- **Lesson quiz:** Mark separate quiz status when submitted; store accuracy, attempts, duration and answer feedback. Whether quiz pass gates full lesson completion is admin-configurable; learning coverage and assessment mastery must remain separate indicators.
- **Aggregation:** Section → Lesson → Topic → Domain → Course completion; weight by mandatory elements/requirements, not simply opening a tab. Resume across devices in production.
- Track last activity, lesson time (capped for idle tabs), video progress, strengths/weaknesses, question history and recommendations.

### 4.3 Example supported path

ASP > Domain > Topic > Lesson > Reading/Images/PDF > Protected Video > End-of-Lesson Quiz > Result > Suggested Next Lesson.

## 5. Practice Center — reference-inspired UX

Screenshots supplied on 2026-10-28 show Pocket Prep-like conceptual flows; build **original Technica UI** and preserve approved Technica design tokens. Do not copy competitor trade dress or proprietary assets.

### 5.1 Quiz modes

| Mode | Learner intent | Main policy |
|---|---|---|
| Quick 10 | Start immediately | 10 available non-mock questions; fast default configuration |
| Timed Quiz | Train under time pressure | Overall timer or per-question timer |
| Level Up | Adaptive mastery | Hidden Low → Medium → High with 70% promotion |
| Weakest Subject | Improve weak domain/topic | Server ranks verified learner weaknesses |
| Missed Questions | Retry mistakes | Select from learner's incorrect history, excluding mock-reserved pool |
| Build Your Own | Custom practice | Course/domain/topic, eligible history, size, timer, difficulty policy, review behavior |
| Mock Exam | Formal simulation | Admin locked form: 200 exclusive questions, 300 minutes, fixed rules |

The previous separate **admin-configured Assessment** route and history remain; treat it as a different mode from learner-customizable practice and from exclusive Mock. Migration must not silently change these older flows.

### 5.2 Custom Quiz settings

- Scope: course / one or more domains / topics, where relevant.
- Size: integer input + slider + presets, validated against eligible pool. Existing demo 1–50 limit must be updated for flexible practice without affecting other policies.
- Timer: Off; whole exam with configured minutes; per question (with seconds/minutes). Show timer appropriately and accurately, pause policy explicit by mode.
- Difficulty: Low, Medium, High, Mixed or Smart Adaptive (depending mode, available tags and count).
- Answer reveal: After each question or At end; manual Check Answer vs automatic on option click. Ensure instant feedback never exposes answer keys for mocks or fixed closed-book assessments.
- Eligible pool filters: New / Previously Answered / Flagged / Incorrect; show grounded counts, permit combination and clear intersection/union semantics. Default pool respects actual per-user history and excludes reserved mock questions.
- Questions are unique per attempt unless explicit repeat mode; preserve flags, skipped navigation, formula/question images, explanations and source references as allowed.
- Warn about unanswered before final submit; autosave answers and restore interrupted practice.

### 5.3 Results & revision UX

- Result header: score %, correct/total, average seconds per answered question, elapsed time and date/mode.
- Tabs: All / Flagged / Incorrect / Correct; searchable/filterable by course/domain/topic as scale requires.
- Show exact answered/reviewed question, selected answer, correct answer and explanation only after configured disclosure point.
- Actionable concept recommendation: “You missed 4 questions in [topic]. Practice 10 more” only when based on actual scored learner data and pool availability.
- Optional benchmarks such as “Community average” may be shown ONLY with consent-appropriate, anonymized, adequately sized real cohort data; never fabricate comparative averages.
- Exclude mock-exclusive questions from ongoing practice recommendation pool; mock post-exam review may display permitted submitted items by access policy, not release them as general practice.

## 6. Smart Adaptive Level Up — baseline acceptance algorithm

**User-approved policy:** low first; promote to medium after 70% accuracy; promote to high after 70% medium; under-threshold performance keeps the learner in that stage. User should NOT see stage/difficulty allocations while solving.

Proposed implementable model (explicit constants to tune with owner/product QA):
1. Session stores requested total N (for example 100), allowed scope, immutable policy version, random seed/selection records and current difficulty initially LOW.
2. Eligibility: published, properly classified, non-mock-reserved, not previously drawn in this attempt; scope and learner pool filters honored.
3. Low/Medium/High nominal target quotas for N=100 may start 34/33/33 **but are elastic**. A stage unable to meet 70% consumes more questions from remaining N; the learner may finish with no high questions. Never present the original quotas as guaranteed counts.
4. Avoid promotion after only one lucky answer: **PROPOSED calibration rule** minimum 10 answered questions in the current stage before checking >=70%; evaluate on cumulative correct / answered in the current stage (for N<10 use a documented small-session rule). This threshold implementation detail requires validation, unlike the owner-approved 70% itself.
5. Promotion is monotonic within an attempt (LOW→MEDIUM→HIGH). The stage is not publicly revealed until result review, if at all.
6. If a stage has insufficient eligible questions: do not silently leak reserved questions or fabricate new questions. End with transparent after-test limitation or follow a separately agreed shortage policy; enforce count and scope safely.
7. Stop at total N or time limit. Persist per-stage answered and correct counts server-side with deterministic scoring and attempt-event trail.
8. Tests: 69% remains; 70% promotes; repeated attempts do not contaminate mastery within attempt; N=100 with many wrong low questions stays mostly/all low; available-bank exhaustion; no duplicates; excluded mocks; clock expiry; interrupted resume; unfair early promotion.
9. Adaptive session correctness threshold **is not** an ASP/BCSP pass mark. Do not label 70% as official exam passing percentage.

## 7. Exclusive ASP Mock Exam (owner-confirmed)

### 7.1 Locked form contract

- Exactly **200 questions** reserved by Admin. Exactly **5:00:00 / 300 minutes** total attempt time. Settings cannot be customized by the learner.
- Source questions selected from audited ASP bank; admin explicitly reserves 200 stable question IDs in a versioned Mock form. Reserve lock exists in server database/API, not just hidden buttons.
- Non-mock API queries must filter reserved IDs, including custom practice, old assessments, lesson quizzes, diagnostics, trial and “incorrect question” pools; admin bulk exports need controlled permissions.
- New form revisions: historical attempts retain immutable snapshot/version. Changing a reservation is privileged, audited and validated, and cannot modify an in-progress learner exam.
- Mock delivery: one question at a time with 4 choices when the actual item has 4; flagged/skip/review grid; no immediate answers; calculator; submit confirmation and timed server auto-submit.
- Timer deadline is stored on trusted server, not reset by refresh/tab close, and used to validate answer timestamps. Draft answers are saved with upsert/idempotency; resume policy must be published clearly. Avoid granting extra time from local clock tampering.
- Practice attempts can be retaken per policy; mock retake limits and cooldown remain admin configurable, not assumed unlimited.
- Result: correct/incorrect/blank counts, time use, domain/topic breakdown and next-step study advice. “Official certification”/“BCSP pass” must never be claimed from Technica Mock results.
- 200 items / 300 min implies ~90 seconds per item as an **average pacing guide**, not a required per-question timer.
- Validate actual production content licensing/provenance before commercialization and distribution.

### 7.2 External verification

BCSP exam time: 5 hours — https://www.bcsp.org/credentials-at-a-glance.
BCSP complete exam guide describes 200 multiple-choice items — https://www.assp.org/docs/default-source/bcsp-documents/bcsp-complete-guide.pdf?sfvrsn=2.
ASP11 changes effective 2025-09-01 — https://www.bcsp.org/bcsp-news/2025-current-changes-index-board-of-certified-safety-professionals.

## 8. Diagnostics, progress and personalized analytics

- Optional baseline pre-assessment with balanced sampling of approved non-mock questions across official blueprint domains; no official exam-score claim.
- Maintain per-user/domain/topic stats: exposure coverage, answered, correct, rolling accuracy, unseen count, questions missed, time per question, improvement trend and recent attempts.
- Strength/weakness decisions must apply sample-size and recency safeguards: a topic with 1 wrong answer is “insufficient evidence,” not conclusively weak. Show confidence/coverage separately from performance.
- Recommend next lessons, targeted concept quizzes and balanced review based on gaps, not arbitrary AI output.
- Dashboard visual cards: Course completion, Practice accuracy, weak topics, strong topics, readiness indicator labeled as **estimate**, study streak/time (when data support), upcoming classes.
- No invented statistics, fake learner benchmarking or exposure of other learners' private performance.
- Admin cohort/report data only through permission-checked aggregates, exports audited.

## 9. Scientific calculator

- A compact floating/bottom-sheet calculator accessible from all designated question/assessment pages; persists open state while moving between questions.
- TI-30XS MultiView-inspired **functionality**: arithmetic, brackets, fractions and mixed numbers, percent, roots, powers, logarithms, natural log, trig/inverse trig, degree/radian modes, memory, scientific notation and editing/history as verified feasible.
- Display expressions and results clearly. Keyboard and touch friendly; mobile drag should not obscure question/action footer, with dock/close/minimize and safe-area positioning.
- Use our own layout, visual assets, calculation parser and design; do not use photographed TI keypad, trademark, emulator code or product branding as shipped calculator.
- Math QA: order of operations, floating-point tolerance, fraction normalization, negative powers, divide-by-zero, angle modes and numeric precision. Do not silently use JS eval.
- Image reference provided: TI-30XS MultiView handheld photo (reference only; not licensed to distribute).

## 10. Trial, billing, media and live events

### 10.1 Access and payments

- Trial/demo entitlement with limited courses, lessons, practice samples, time/quota and no access to reserved mock questions. Admin configures trial audience/content and upsell.
- Paid access to chosen course(s), full preparation and optional sessions/mocks based on purchased SKU; entitlements are server checked for every content/attempt/media endpoint.
- Egypt payments and international cards: evaluate vendors for Egyptian merchant onboarding, settlement, currency, fees, refunds and recurring charging (examples to evaluate: Paymob/Fawry for local options and an eligible international PSP). Do not hardcode Stripe availability for Egypt.
- Payment state must come from signed, idempotent, reconciled provider webhooks, not redirect URL success or client localStorage. Support pending/failed/refunded/expired access revocation.
- Tax/invoicing requirements and merchant identity to be reviewed before launch.

### 10.2 Video and PDF protection

- Private storage, per-user access checks, short-lived signed playback tokens, protected adaptive streaming, watermark containing viewer identity/session, concurrent session limits and abnormal-access monitoring.
- Consider DRM-capable vendor/browser compatibility for Widevine/FairPlay when stronger protection is needed; vendor selection is OPEN. Hiding Download button or disabling right-click is NOT security.
- Screen recording on the learner's personal computer/phone cannot be completely prevented by a normal website, even with DRM. Communicate realistic risk controls, not “recording impossible.”
- Protect PDF access where licensed, set restrictive caching, track downloads where permitted. Files delivered to a client can still be copied/captured in some form.
- Current CSB YouTube demo is public external content and **not** a protected commercial streaming mechanism. Preserve attribution and fallback.

### 10.3 Live sessions

- Plan Zoom Meeting SDK for Web (embedded client view; component view where desktop capability fits). Verify Zoom account permissions, SDK signature backend, current minimum SDK version, terms, accessibility, mobile and recording/copyright permissions.
- Enrollment/entitlement-gated join, instructor schedule, reminders and session attendance. Do not expose SDK secrets in Vite.
- Official reference: https://developers.zoom.us/docs/meeting-sdk/web/.
- FUTURE; do not imply integration is currently live.

## 11. Roles, security, backend and data ownership

### 11.1 Proposed stack

- Retain React + Vite; Cloudflare Pages as expected delivery path (verify exact LMS deployment/account before changing routing or domain).
- Production backend: dedicated Supabase Auth, Postgres, Storage and Edge Functions (planned; schema in repo is proposal only). Cloudflare for edge, caching and optional media delivery where authorized.
- Data layer with repository adapters: DemoAdapter for existing offline behavior, ProductionAdapter for verified server operations. Do not call it production by switching one environment flag.
- Roles proposed: guest/trial learner, paid learner, instructor/content author, grader (later), admin, super admin (if governance requires). Least privilege, audited changes and course-scoped policies.
- New public tables: explicitly GRANT necessary privileges and enable correct RLS; no blanket anonymous writes or service-role keys in frontend. Validate actual platform default-grant behavior at migration time.
- Server-side question selection/grading, answers kept out of delivered payload until reveal rules allow. Every endpoint validates course entitlements and question reservation.
- Never expose correct answers for mocks or protected live assessments by bundling them in public JS/JSON. Current demo does exactly this and must not be commercially shipped as secure.
- Separate public display content from protected answer keys.
- Audit admin changes, uploads, mock reservations, payment events and learner exam lifecycle; respect data retention, privacy and recovery.

### 11.2 Suggested normalized data entities

users/profiles, roles/role_assignments, courses, course_versions, domains, topics, lessons, lesson_blocks, media_assets, lesson_quizzes, questions, question_options, question_sources, question_classification_reviews, question_tags, mock_forms, mock_form_questions, question_reservations, enrollments, entitlements, subscription_products, orders, payments, provider_events, learning_events, section_progress, video_watch_progress, quiz_templates, practice_sessions, exam_attempts, attempt_items, attempt_answers, answer_events, results, skill_aggregates, study_recommendations, live_sessions, live_attendance, notification_events, audit_log; future: certificate_programmes, assignment_submissions, grading_reviews, certificates, verification_tokens.

Indexes, RLS and data retention depend on live queries and privacy. Historic attempts reference immutable question and form revisions.

## 12. Design rules — protect accepted UI

- Continue current Technica light visual system. Base tokens in DESIGN_GUIDE.md: navy #0b263a, deep teal #053a48, primary teal #006673, vivid teal #007f80, mint #dff7ec, butter #fff5d8, coral #ffede7, lilac #eeeafd, blue #e8f3ff.
- Inter/DM Sans, spacious rounded cards, subtle tasteful motion and shared components; do not randomly introduce a competing theme.
- Dedicated mobile quiz focus, touch-safe controls, no horizontal scroll, readable question text, modal/popup editing and responsive calculator.
- Maintain reduced-motion accessibility, focus management, dialog scroll/fixed-header behavior and no clipped actions.
- Change only requested scope; screenshots supplied from Pocket Prep are **functional inspiration**, never a mandate to clone branding or layouts.
- Existing v1.14 removal of Saved UI stays LOCKED. Flags are transient question-review markers unless a new feature is approved.
- Keep data UI sortable/paginated where tabular, and keep views concise, clear and responsive.

## 13. Build phases — dependency-ordered delivery

| Phase | Deliverable | Definition of done |
|---|---|---|
| P0 — Baseline & protection | This master file, regression inventory, actual code/data status audit | Canonical doc versioned; no existing feature altered; gaps labeled |
| P1 — Production foundation | Supabase/Auth/RLS, roles, course entitlements, server repos, audit | Multi-device accounts; guarded APIs; no public answer keys; DB security tests |
| P2 — Course hierarchy & authoring | Course→Domain→Topic→Lesson real CRUD, rich blocks, publish/version | Admin can build a second fully independent course; no ASP hardcode |
| P3 — ASP bank clean-up | Audit 2,500 source items; map official 9 domains/topics; classify difficulty; validate rights | Original IDs preserved, review queue, reliable published subset and exclusions |
| P4 — Learning player | Connect builder to player; reading/image/PDF/video; precise progress; lesson quiz | Cross-device progress and admin-controlled 10–20 question quizzes |
| P5 — Quiz modes & calculator | Quick 10, Timed, Build Your Own, history filters, UX reference concepts, scientific calc | Every configuration works across phone/desktop and respects entitlements |
| P6 — Adaptive practice | 70% Low→Medium→High server-enforced staging | Threshold/exhaustion/resume tests pass; no stage leakage in active test |
| P7 — ASP Mock Engine | Admin reserve 200; 300-min server timer; exam/review/history | Mock-only pool invisible in every non-mock mode; no reset by refresh |
| P8 — Diagnostics & dashboard | Pre-assessment, domain/topic scorecards, truthful study suggestions | Per-user variance and sufficient-evidence logic tested; no fake benchmarks |
| P9 — Trials, commerce & hardening | Trial gating; Egypt/international PSP; upload/playback security | Webhook reconciliation, entitlement, RLS, payment and abuse tests |
| P10 — Live/video upgrade | Protected streaming vendor evaluation, Zoom embedded sessions | Rights, mobile/desktop, security, attendance and media controls verified |
| P11 — Certificates | Assignment submission, grading/return/approval, certificate issue/verify | Separate auditable workflow, shared auth and entitlements |
| P12 — Release audit | End-to-end QA, migration, responsiveness, ops/backup runbooks | Regression suite, security tests, genuine build, rollout and rollback plan |

**Implementation priority:** P0–P9 for credible Exam Preparation production. Keep video and Zoom interfaces architected from P1/P4 but deliver strong paid media protection and live integration when selected. Certificates stays deferred.

## 13A. Executable implementation backlog — agreed scope, proposed delivery sequence (2026-10-30)

> **Document-only planning update.** Phases and acceptance criteria below refine Section 13; they do NOT mark software as implemented or override the locked owner decisions. No implementation, migration, payment activation or release is authorized just by documenting the plan. Keep confirmed rules immutable; resolve open technical policy choices with owner before enforcing arbitrary defaults.

### Execution rules / dependencies

- **One source of truth:** this BLUEPRINT. AGENTS.md makes reading/updating it mandatory. Preserve all existing decisions, historic BUG rows and design constraints.
- **Safe change workflow:** branch → audit/impact analysis → scoped implementation → unit/integration/E2E/security testing → blueprint/CHANGELOG/tests update → review → approval → merge/deploy/verification.
- **No-regression gate at every phase:** demo ASP content and IDs, light/mobile UI, per-course editing, admin-only Question Bank, v1.14 learner Saved removal, bookmarks/flag distinctions, past practice/history, and isolation of Process Safety Essentials demo remain protected.
- **Schema/status:** the 2026-10-28 audited React 19/Vite 6 localStorage/IndexedDB demo is the baseline, NOT a secure production backend. Recheck current HEAD before beginning P0.
- **Product priority:** Exam Preparation first; Certificates only after future approval. English now, i18n-ready and Arabic RTL later.
- **Secure media starts early:** install entitlement and private storage contracts in P1/P4, even if full DRM vendor work is completed at P10; never sell insecure public course recordings while waiting for DRM.

### P0 — Baseline audit, workplan and safety net

1. Read AGENTS.md, BLUEPRINT in full, CHANGELOG, relevant guides, current source, and automated tests. Identify current HEAD and deployed environment separately.
2. Inventory all routes, accepted UI states, practice/assessment behavior, imports, course demo assets, fake/local user state, and backend scripts; tag DEMO vs PRODUCTION vs PLANNED.
3. Audit the 2,500 original Excel workbook records (9 sheets), the existing 1,625 imported ASP demo questions (first five sheets), and the unrelated PSEE demo questions. Preserve source ID/row/wording/answer and citations.
4. Create a protected rollback baseline; CI must produce reproducible install/build (lockfile issue BUG-013) and honest security/typecheck status (BUG-014).
5. Design/approve wireframes for Admin Builder, Learning Player, Practice setup, Quiz, Results, Mock, learner dashboard, and account/checkout while preserving the accepted visual system.
**Exit gate:** reviewed migration map, prioritized task list, test baseline, no existing behavior regression, source/question-rights concerns logged.

### P1 — Production foundation and user management

1. Create isolated Supabase development/staging/production environments with documented secret management and Cloudflare build configuration; no keys with elevated privileges in client bundles.
2. Version SQL migrations and implement profiles, roles, role assignments, enrolments, entitlements, activity and audit trails. Implement Supabase Auth sign-up/sign-in, password reset/email verification, session handling, account deactivation and basic profile.
3. Apply explicit per-table GRANT/REVOKE plus RLS and separate Storage policies; prohibit anonymous writes. Server validates user and course entitlements on protected operations. Roles: guest, trial learner, paid learner, instructor/content author, admin; grader and super-admin only when required by governance.
4. Move admin authority and protected scoring/question delivery from browser-side flags/state to server-controlled API/Edge Functions. Maintain migration-safe adapters until demo state is retired deliberately.
5. Introduce audit events for login/admin edits and rate-limiting; protect high-privilege admin operations with MFA and session review.
**Exit gate:** two real learners cannot see/edit each other's progress, answers, billing or content permissions; learner cannot call admin APIs; refresh/second device retains account state; RLS positive/negative tests pass.

### P2 — Course hierarchy and CMS

1. Create canonical tables for courses, course_versions, domains, topics, lessons, lesson_blocks, media_assets and lesson_quiz_config with stable IDs, ordering, publish state, audit, archive and version history.
2. Admin CRUD: course → domain → topic → lesson; duplicate/reorder; draft → preview → scheduled/published; archival without destroying learner history.
3. Build safe rich block editor for headings, text, approved typography/colors, images, tables, PDFs, video, references, quiz; sanitize content, require alt text and accessible preview.
4. Connect Course Builder to learner catalog and navigation. Enrolment/entitlements determine visibility. Do not hardcode ASP IDs or lesson count.
**Exit gate:** create and publish a second independent course with full content; ASP content remains intact; learner sees only entitled published versions on phone/desktop.

### P3 — ASP question import, provenance and difficulty

1. Import each source workbook row into a staging/provenance layer, avoiding automatic publication and retaining immutable original content/answer keys/IDs.
2. Validate 2025 ASP11 official nine-domain/topic taxonomy against each question; DO NOT assume old workbook sheet Domain 1 maps to ASP11 Domain 1.
3. Detect duplicates, ambiguous choices, missing/wrong answers, broken formula formatting, citations and commercial-use licensing restrictions; review through admin queue.
4. Propose Low/Medium/High classification using rubric (recall/application/analysis, computation steps, distractor complexity) with confidence and human reviewer approval.
5. Establish published Practice eligibility and Mock-exclusive reservation relation at database/query boundary (separate protected correct-answer fields).
**Exit gate:** counts reconciled (raw, imported, rejected, awaiting review, published), mapping reviewer approvals recorded; each published question is traceable and correctly excluded from unauthorized pools.

### P4 — Learning Player, media access and progress

1. Connect published lessons to real learner player with responsive sections, reading/images/PDF and secure video playback interface.
2. Store private media behind authorized access checks and short-lived access tokens from day one; never ship permanent direct URLs to paid assets.
3. Emit idempotent server events for visible reading/image/PDF progress; video tracks watched segments and end checkpoint (seeking to end does not complete); handle idle time and multi-device resume.
4. Support admin-configured lesson quiz (usually 10–20 questions), submit/review and configurable pass rule. Separate **viewed**, **completed**, and **passed**.
5. Roll up lesson → topic → domain → course progress and learner resume state.
**Exit gate:** cross-device course continuation; viewing only the first page doesn't mark a lesson complete; seeking to last video second doesn't mark complete; entitled media works, unentitled media fails.

### P5 — Practice UX and secure exam API

1. Implement Quick 10, Timed Quiz, Build Your Own, Weakest Subject and Missed Questions without altering accepted fixed Admin Assessment.
2. Custom inputs: course/domain/topic scope, eligible counts, number of questions, timer off/whole-test/per-question, difficulty Low/Medium/High/Mixed/Adaptive, answers per-question/at-end, manual check/auto-advance, New/Answered/Flagged/Incorrect pools.
3. Enforce available-pool limits and **server-side** unique question selection; keep correctness/references unrevealed until selected feedback policy allows.
4. Implement question navigator, flags, autosave, keyboard/mobile, answer card, result details and All/Flagged/Incorrect/Correct filters.
5. Build an original scientific calculator with TI-30XS-like functions and independent test vectors (NOT copied TI design/software); floats on desktop, docks as mobile bottom-sheet.
**Exit gate:** tested configuration matrix (timers, item counts, reveal policy, flags, missed/new filters) with no Mock-only questions in any pool; arithmetic/fraction/trig/negative-power correctness verified.

### P6 — Adaptive 70% Level Up

1. Store server-side adaptive session policy, stage, per-stage answered/correct, selected question IDs, allowed scope and audit sequence.
2. Begin LOW. At approved minimum sample checkpoint, promote to MEDIUM when cumulative current-stage accuracy >=70%, then to HIGH under same rule; below threshold continue stage. Never reveal difficulty/stage live.
3. User controls total question count; prospective quotas are **elastic**. A learner may spend all N at LOW. Never invent/repeat protected items to fill shortfalls.
4. Decide shortage behavior and short-quiz threshold with product owner. Existing proposal = minimum 10 answered per stage (not locked). Keep exact 70% owner requirement.
5. Make session restart/idempotency and scoring deterministic under reconnection and concurrency.
**Exit gate:** boundary at 69% stays/70% advances; 100-question uneven distribution works; no duplicated item/early level exposure; exhausted pools, interrupted sessions and concurrent submissions tested.

### P7 — ASP exclusive Mock Exam

1. Admin reserves **exactly 200 reviewed ASP questions** to a versioned Mock form through atomic server operation; reservation excludes them from every other quiz/diagnostic/review generator.
2. Server-enforced deadline = **300 minutes (5 hours)** with submitted/expired state, persisted answers, reopen/refresh rules and automatic submit at expiry. No learner customization of count/time.
3. Add full 200-question navigation, skipped/flagged grid, reliable autosave, exam-safe calculator and final review/submit confirmation.
4. Results record immutable form/question versions, blank/correct/incorrect counts, domain analysis, timing and carefully controlled post-mock explanation policy. Retake/cooldown/pause policy to be approved.
**Exit gate:** exactly 200 exclusive/300 minutes; browser clock changes/reload/tab closure don't reset deadline; all non-mock routes provably exclude reserved items; attempts stay historically stable after admin edits.

### P8 — Pre-assessment, learner dashboard and analytics

1. Build a diagnostic quiz sampling reviewed non-mock questions by official domain/topic coverage.
2. Aggregate per learner: confidence/sample size, domain/topic accuracy, recent trend, practice history, mistakes, course completion, time on learning and mock history.
3. Personalized suggestions link weak concepts to actual lessons and eligible follow-up practice (e.g., “4 mistakes in Topic X — practice 10 more” only when supported by data).
4. Learner dashboard shows continue learning, strengths/gaps and estimated readiness with sample-size safeguards; admin aggregate insights do not expose unrelated learner private data.
**Exit gate:** users receive measurably different dashboards from distinct histories, sparse data says “insufficient evidence”, no fake community benchmark, recommendations lead to valid question pools.

### P9 — Trials, subscriptions and checkout

1. Admin defines plans/SKUs, durations, course access, quotas and trial/demo content/sessions; content and attempts enforce entitlement on every server call.
2. Validate Egypt merchant onboarding + international payment capability; compare PSP settlement, currencies, recurring support, refunds, tax/invoicing. Provider remains OPEN until commercial approval.
3. Create orders/payments/provider_events and verify signed webhooks with idempotency and reconciliation. Activation depends on verified payment state, never a client redirect query string.
4. Handle failures, pending, renewals, expirations, refunds, cancellation and support/admin adjustments with audit logging.
**Exit gate:** trial users cannot see paid resources; paid user gains exact purchased scope; forged/replayed webhook or client tampering does not activate access; refund/expiry revokes relevant access.

### P10 — Paid-video protection and embedded live classes

1. Vendor decision gate before commercial video rollout: compare Cloudflare Stream signed-token controls with DRM-capable playback (e.g. Mux DRM Widevine/FairPlay/PlayReady), actual cost, browser matrix, onboarding and contract.
2. Add identity/session watermark and concurrent playback constraints, protected source files and cache rules, authorization audit, reasonable token expiry/refresh. State plainly that **100% screen-recording prevention is impossible** on user-owned hardware.
3. Integrate Zoom Meeting SDK with server-created signatures/authorization. Use component view where suitable on desktop and client view on mobile; keep Zoom secrets out of browser bundle.
4. Admin schedule, enroll attendees, send reminders, verify join entitlement, save attendance where permitted and enforce recording/privacy policy.
**Exit gate:** paid lessons unavailable without entitlement; authorized playback works on target browser/device matrix; Zoom session plays embedded on desktop/mobile, revocation and audit tested.

### P11 — Release/security/performance readiness

1. Test role and RLS matrices, XSS in lesson blocks, media token leaks, mock exclusivity and time, payments replay, answer-key leakage, vulnerability/dependency audit, backups/restores, accessibility and privacy.
2. Load-test concurrent learners/exams and large progress event volume; verify responsive layouts and long-session autosave under network interruption.
3. Reproducible CI build and DB migration rollback, stage smoke, signed-off release checklist and measured production verification. Add structured errors/monitoring and support response paths.
**Exit gate:** all production blockers resolved or explicitly accepted; live deployment only after approval; document proof separately from CI pass.

### P12 — Certificates (FUTURE; not in active build scope)

Reserve relation to identity, entitlements and courses; later design admin-created certificate programmes, learner assignment uploads, grader feedback, approval, grade, certificate issue/revocation/verification. Do not advertise Technica-issued certificates as BCSP-issued credentials.

### Cross-phase acceptance and review checklist

- Database/roles: zero anonymous writes; explicit GRANT/RLS for all exposed data, private Storage policies, admin actions audited.
- Questions/content: original ASP IDs/answer/reference preserved, approval/rubric and rights recorded, no PSEE demo mixing, no 200 Mock leaks.
- Exams: automated tests for 69% vs 70%, count limits, timers, submit idempotency, refresh/resume, disclosure and scoring.
- UX: preserve Technica color/theme, v1.14 removed Saved screen, admin-only Question Bank; test keyboard/mobile/tablet/desktop and loading/error states.
- Release hygiene: every completed phase requires master blueprint status update, append-only bug/change entries, regression tests, rollback steps, evidence/commit. No silent main push of implementation.

### Decisions to settle before their relevant implementation gate

- P3: question rights; reviewed ASP11 mapping and which 200 items get reserved for Mock.
- P5/P6: small-session/adaptive checkpoint threshold; question-filter union/intersection semantics and empty-pool policy.
- P7: mock pause/resume and retake limits; whether full per-question mock answer review is allowed.
- P9: exact trial quotas, packages/pricing, merchant and payment gateway.
- P10: selected DRM/streaming provider, cost, browser support and Zoom account/licence.

## 14. Change-control workflow (MANDATORY for every future change)

1. **Before coding:** Read THIS file, the latest CHANGELOG.md, relevant per-feature guide and source/tests. Identify locked invariants, code/data origin and current verified release.
2. **Scope:** State feature requested, related screens, planned migrations, compatibility and security risks. Use the smallest safe change.
3. **Implement:** Preserve production user data and existing functionality; use proper migrations, idempotency and feature flags for breaking changes; never silently delete learner history.
4. **Verify:** Run specific tests plus full regression suite applicable to modified routes/data. Test desktop/mobile, language-ready layouts, learner/admin permissions, mock exclusivity and timing when touched.
5. **Review:** Compare before/after against accepted UI rules; ensure no unexpected behavior/dataset changes.
6. **Document in same commit:** Update relevant sections here, status matrix, decision log, known-issues register, change history, tests and rollback. Update CHANGELOG.md when applicable. Add test to prevent any fixed bug from recurring.
7. **Release:** Prefer reviewed branch/PR for code/database-risk changes; deployment to main only after approval and tests. A documentation-only commit may go to main. Preserve tagged or revertible state.
8. **After release:** Record observed result / production verification separately from passing local tests. No feature is marked DONE without evidence.

### Change entry template

- ID / timestamp / author / branch / commit:
- User request / confirmed acceptance criterion:
- Affected routes, components, backend and migrations:
- Existing invariant(s) protected:
- Test commands / exact verdict / browser QA:
- Bugs/regressions detected or prevented:
- DB rollback / Git rollback:
- Screenshots or evidence:
- Change to spec / status table:
- Release/deployment verified?:

## 15. Decision register (append-only)

| Decision ID | Date | State | Decision / constraints |
|---|---|---|---|
| DEC-001 | 2026-10-28 | LOCKED | Two modules: Exam Preparation now; Certificates later |
| DEC-002 | 2026-10-28 | LOCKED | Course → Domain → Topic → Lesson |
| DEC-003 | 2026-10-28 | LOCKED | English-first with future Arabic-ready architecture |
| DEC-004 | 2026-10-28 | LOCKED | ASP first, preserve source questions and explanations |
| DEC-005 | 2026-10-28 | LOCKED | Adaptive difficulty advances only at >=70% current-stage correct |
| DEC-006 | 2026-10-28 | LOCKED | ASP Mock = 200 exclusive questions, 300 minutes, admin controlled; supersedes earlier 330-min suggestion |
| DEC-007 | 2026-10-28 | LOCKED | Mock-reserved items excluded from all other generators/pools |
| DEC-008 | 2026-10-28 | LOCKED | Quiz and lesson progress individualized; video completion not counted by mere seek-to-end |
| DEC-009 | 2026-10-28 | LOCKED | Trial restricted; Egypt+international checkout; Zoom embedded desired later |
| DEC-010 | 2026-10-28 | LOCKED | Preserve approved light responsive UI and existing v1.14 Saved removal |
| DEC-011 | 2026-10-28 | LOCKED | Master Markdown read/update on every project change; errors/fixes tracked permanently |
| DEC-012 | 2026-10-28 | LOCKED | Use Pocket Prep screenshots as UX ideas, original Technica implementation |
| DEC-013 | 2026-10-28 | PROPOSED | Stage minimum answered = 10 for reliable adaptive 70% check; calibrate short sessions |
| DEC-014 | 2026-10-28 | PROPOSED | Server-side Supabase domain model, signed streamed video and PSP vendor selection |
| DEC-015 | 2026-10-28 | LOCKED | Owner-supplied infrastructure, evidence-first audit, and UI reference governance are repo-integrated; existing newer root UI guide remains authoritative; maintain tests, docs, and prior accepted behavior. |

## 16. Error, conflict & regression prevention register

| ID | Severity | Status | Evidence, risk and permanent prevention |
|---|---|---|---|
| BUG-001 | HIGH | OPEN / migration | Historical demo uses 5 generic ASP domains / 1,625 questions; current ASP11 has 9 official domains. Audit workbook 2,500 rows, validate semantic mapping before publish; tests assert provenance and category mapping. |
| BUG-002 | HIGH | OPEN / security | Current source bundles answers and local demo roles; not secure live exam. Secure server delivery/grading and role/RLS tests before paid launch. |
| BUG-003 | HIGH | OPEN / separation | New mock 200-question exclusive reservation currently not implemented; all non-mock paths must enforce exclusion at DB/query layer. Add negative tests for all modes. |
| BUG-004 | HIGH | OPEN / timing | Existing admin assessment is 1–50 items / 1–180 min. Do not repurpose it to implement 200 / 300-min mock; create separate mock config/attempt policy and clock tests. |
| BUG-005 | MEDIUM | FIXED in demo v1.10.1; REGRESSION GUARD | Course Create/Edit dialogs previously clipped/shifted under transformed parent. Portal to body, focus trap and scroll-safe footer; retain and test mobile/zoom. |
| BUG-006 | MEDIUM | FIXED in demo v1.11; REGRESSION GUARD | Course Builder formerly hardcoded lesson editing to ASP. Use per-course independent modules; never reintroduce ASP-only condition. |
| BUG-007 | MEDIUM | LOCKED UX | Learner Saved page/actions intentionally removed in v1.14. New question flags/review must not unintentionally restore it. |
| BUG-008 | HIGH | OPEN / integration | Demo PDF/video uploaded to local IndexedDB; learner progress/local users not cross-device or server-authoritative. Production adapters required; do not represent as real shared storage. |
| BUG-009 | MEDIUM | OPEN / media | Public YouTube demo video cannot satisfy download/recording protection requirement. Paid provider/access architecture required; recording cannot be guaranteed prevented. |
| BUG-010 | MEDIUM | OPEN / truthfulness | Pocket Prep screenshot contains community average and concept diagnostics. Do not fabricate benchmarks; compute concept advice only from real scored history. |
| BUG-011 | MEDIUM | OPEN / definition | “Mark read material finished when user passes through” requires real visible-section/scroll milestone; merely opening lesson must not increment coverage. |
| BUG-012 | MEDIUM | OPEN / content rights | Review imported question/IP ownership and references before paid publication; never assume external certification question content can be redistributed. |
| BUG-013 | HIGH | OPEN / build repeatability | Main branch lacks package-lock.json; npm ci gate cannot yet execute. Temporary CI fallback is explicitly warned; generate and commit a verified lockfile, then remove fallback. |
| BUG-014 | MEDIUM | OPEN / type safety | Current v1.15 is React JavaScript/JSX with no genuine TypeScript check. Do not fake typecheck or blindly rewrite app; plan incremental migration and gate. |
| BUG-015 | MEDIUM | GUARDED / UI provenance | Older uploaded September UI guide must not overwrite the more recent October 24 root guide (includes previously approved motion/video/3D references). Archived older source; current root unchanged. |
| BUG-016 | LOW | FIX IMPLEMENTED / TEST PENDING | Initial infrastructure script rejected valid local untracked .env secrets; updated to use git ls-files for tracked secret detection, preserving secure local development. Runtime script verification remains pending in CI. |

| BUG-017 | CRITICAL | OPEN / proposed SQL not deployed | Proposed \`supabase/001_lms_schema_PROPOSED.sql\` lacks Course → Domain → Topic → Lesson ancestry: courses.domain text, modules under course, lessons under modules, and topics directly under course. Do not deploy unreviewed; design new four-level migrations and FK tests. Evidence: [P0 source audit](docs/current/P0_BASELINE_AUDIT_2026-10-30.md). |
| BUG-018 | CRITICAL | OPEN / entitlement model | The proposed SQL lets any authenticated user SELECT published course/module/lesson/topic rows without active enrollment, trial scope or purchase. Introduce entitlement-scoped policies/queries, protect private media and test direct API access before commercial launch. Proposed SQL is not confirmed deployed. |
| BUG-019 | HIGH | OPEN / onboarding | Proposed SQL restricts profile INSERT to admin but defines no trusted learner profile provisioning after sign-up. Add audited trigger/service-mediated bootstrap with default learner role; test no self-promotion. |
| BUG-020 | MEDIUM | OPEN / verification gap | P0 2026-10-30 used connected GitHub source inspection only; direct git checkout failed due DNS, and npm/CI/browser/Supabase live tests not independently verified. Record runtime evidence before marking any phase PASS. |

Add new BUG rows immediately when an issue is discovered, include reproduction, root cause, fix, commit, proof and regression-test identifier. Never erase bugs after fixing; change status to FIXED / VERIFIED.

## 17. Test and release checklist

**Existing demo scripts (package.json v1.15):**
- npm run check
- npm run verify:bank
- npm run test:selection
- npm run verify:images
- npm run test:auth
- npm run test:motion
- npm run test:courses
- npm run test:quiz-navigation
- npm run test:review
- npm run test:admin
- npm run test:course-dialog
- npm run test:authoring
- npm run test:admin-bank
- npm run test:lesson-media
- npm run test:learner-ui
- npm run test:learning
- npm run build (when dependencies available)

**New release-blocking automated coverage (planned):**
- Data: course hierarchy, foreign keys, migration from demo, stable question IDs and full-source import auditing.
- Questions: non-duplication, correct answer secrecy, source rights/review, per-course isolation, difficulty confidence, mock exclusions across every mode.
- Adaptive: boundary 69%/70%, 100-question shortfall cases, minimum sample threshold, eligible-bank exhaustion, session restore.
- Mock: exactly 200/300min, server deadline, refresh resume, concurrent session, invalid clock/tamper, autosubmit, immutable form snapshots.
- Learning: completed text viewed, PDF/image completion, video seek-skip spoofing, retry idempotency, quiz grade/progress.
- Users/payment: role privilege escalation, RLS grants, JWT/entitlements, webhook signatures/replay, refund and expiry enforcement.
- Accessibility/security: mobile desktop, keyboard, responsive calculator, reduced motion, sanitized authoring, storage token expiries, no credentials in frontend.
- Report exact test PASS/FAIL and production verification; never infer tests from intended code.

## 18. Open implementation decisions (not approved assumptions)

1. Final ASP question-pool scope after mapping all 2,500 original workbook records to current ASP11, plus admin-selected exclusive 200 form.
2. Difficulty classification rubric and review process; default adaptive minimum of 10 answered/stage vs other sensible checkpoint.
3. Whether users may pause mock attempts; whether mocks permit answer disclosure in full vs aggregate post-submit; mock retake policy.
4. Fixed admin assessment and new mock routing/navigation labels (keep existing route compatibility).
5. Trial quotas, paid package/SKU durations, pricing, PSP onboarding and refunds.
6. DRM-capable video vendor, hosting cost, playback/browser restrictions and watermark format.
7. Zoom licensing, meeting scheduling, entitlement/attendance automation and SDK UI for phone/tablet.
8. Final certificate workflow, grading rubric and identity verification.

Until these are approved, implement configurable policies without presenting proposals as fixed business rules.

## 19. Historical change log for THIS master document

### 2026-10-28 — v1.0.0
- Created canonical architecture, phased roadmap, permanent change control and error ledger.
- Integrated the owner's detailed spoken requirements and six reference images: Pocket Prep quiz mode tiles, quiz settings, result/weak-topic remediation, answer-review tabs, and TI-30XS reference.
- Compared actual repository main v1.15.0 with planned capabilities; recorded 1,625 existing questions and source workbook 2,500/9-sheet finding.
- Confirmed and locked **ASP Mock 200 / 5 hours (300 minutes)**, replacing original 5h30 proposal.
- Identified migration issue: official ASP11 nine-domain blueprint vs historical 5-domain demo.
- Preserved existing approved v1.14 Saved UI removal, admin-only Question Bank, light visual system and v1.15 learning-player sample.
- No production implementation, database migration, live payments or protected media changed by this documentation update.

---

**Repository governance:** keep this file at repository root with AGENTS.md reminding all coding agents to read it before modifications. A future feature is not complete until this file and its change/error register are updated with the implementation evidence.


## 20. Infrastructure integration, policies and evidence — 2026-10-28

The project owner's three original foundation documents have been committed at docs/infrastructure/source/ and adapted through docs/infrastructure/README.md. The existing more comprehensive UI_COMPONENT_REFERENCE_GUIDE.md (reviewed 2026-10-24) is the current UI decision reference, while the owner's 2026-09-15 uploaded snapshot is archived for provenance. **This Blueprint remains the single source of truth for Technica LMS product requirements and locked decisions.**

Infrastructure governance now includes AGENTS.md, PROJECT_CONTEXT.md, docs/current/LOGIC_REGISTRY.md, AUDIT_PLAYBOOK.md, SECURITY_PLAN.md, RELEASE_SECURITY_CHECKLIST.md, TEST_PLAN.md, DEPENDENCY_AND_SUPPLY_CHAIN_POLICY.md and SECRETS_ENVIRONMENT_AND_CLOUDFLARE_POLICY.md; root SECURITY.md, DEPLOYMENT.md and DATABASE.md. They apply the generic policies only where relevant to this existing app. CHEIRON-only checklists are explicitly non-applicable.

GitHub Actions workflow .github/workflows/ci-security.yml and .github/dependabot.yml were added. The CI runs infrastructure source check, demo regression suites, Vite build, and npm audit high gate in a clean GitHub runner. **Temporary compatibility exceptions:** no package-lock.json so npm ci is currently replaced by an explicitly warned npm install fallback; no TypeScript script so typecheck is WARN/SKIP, not PASS. Fix these before production launch. No runtime test, CI execution status, Cloudflare deployment, RLS, live database migration or protected content behavior is claimed by this documentation commit.

### 2026-10-28 — v1.0.1 changelog
- Adopted original owner-provided Web App Build/Security Prompt and evidence-based Automated Audit Instructions as infrastructure standards.
- Preserved existing root UI guide and archived the supplied earlier snapshot without losing earlier accepted references.
- Added CI, Dependabot, initial infrastructure verification script, security/release/audit/logic documentation, .gitignore hardening, and mandatory AGENTS workflow pointers.
- Recorded missing lockfile and typecheck as open production blockers; retained app code and demo data unchanged.


### 2026-10-28 — v1.0.2 infrastructure follow-up
- Verified 20 required GitHub repository paths by direct reads on main, including three uploaded source snapshots with correct character lengths 21,682 / 28,547 / 32,077; preserved the larger newer UI root guide.
- Enhanced .gitignore to exclude .env.* (but allow .env.example), .dev.vars variants, Wrangler outputs and ZIPs.
- Fixed false-positive local-secret detection in scripts/check-infrastructure.mjs by checking Git-tracked files, not ignored local .env files; runtime confirmation pending.
- CI, npm audit, node checks, browser QA and production launch have not been executed/verified in this session; status is configuration committed, not tests passing.


### 2026-10-30 — v1.0.3 actionable implementation-plan update
- Added Section 13A, a dependency-ordered backlog P0–P12 with concrete engineering tasks, tests, phase exit gates and owner decision checkpoints; this refines Section 13 without competing with the canonical source.
- Confirmed unchanged locked rules: Course → Domain → Topic → Lesson; 70% Low→Medium→High; Mock-only 200 items in 300 minutes; original Technica theme and learner Saved removal.
- Distinguished private-stream access from full DRM, prepared media security early in P1/P4, and kept certificates for a later scope.
- Documentation update only; no application code, database migrations, streaming vendor, payment integration, browser QA or release modified/verified by this plan.


## 21. P0 source-only audit (2026-10-30)

**Status: P0 IN PROGRESS — NOT PASSED. Paid production remains NO-GO.**

New auditable report: [docs/current/P0_BASELINE_AUDIT_2026-10-30.md](docs/current/P0_BASELINE_AUDIT_2026-10-30.md).

- Inspected repository files: \`package.json\`, app routes, browser-local demo auth/storage, course and question paths, lesson progress, draft Supabase SQL, test scripts and CI config.
- Confirmed from source: React/Vite demo 1.15.0; protected admin navigation in frontend only; \`src/lib/store.jsx\` and \`src/pages/LearningPage.jsx\` use local browser persistence; \`src/lib/supabase.js\` remains unintegrated with real app flows.
- **Blockers exposed by direct source review:** proposed SQL lacks the four-level Course/Domain/Topic/Lesson hierarchy; published lesson RLS does not enforce entitlement; proposed profile provisioning after Auth signup is undefined; server-delivered secure questions/timer/mock reservations absent; existing CI lacks package-lock and typecheck.
- The draft SQL is **not deployed/verified**; findings are pre-deployment risks, not confirmed incidents. Preserve existing v1.15 demo and current designs until a reviewed implementation.
- Audit method limit: direct git checkout in this environment failed DNS; no npm install, runtime checks, browser tests, live RLS probes, independent CI result, or deployed app verification was performed. GitHub-connected file reads are **static source evidence**, NOT automated test PASS.
- Proposed P1 packages are explicitly in the audit report: environment separation, Supabase Auth/profile bootstrap, trusted role/entitlement management, canonical schema migrations, GRANT/RLS/direct API tests, demo-to-production adapter, regression/release evidence.
- Must not move to P1 deployment or declare P0 closed until P0 missing evidence and owner-approved technical/design gates are resolved.

### 2026-10-30 — v1.0.4 P0 inspection notes
- Added P0 source-only audit report and security/design discrepancies with evidence, acceptance tests and P1 work packages.
- App code, existing question bank, database migrations and UI were left unchanged; only documentation was committed.
- Added BUG-017..BUG-020 to permanent register. No reported runtime PASS, paid launch or Supabase migration.


## 22. P1 auth + data model review design (2026-10-30)

**State: DESIGN PROPOSED / NOT APPROVED AS IMPLEMENTED.** Technical architecture for next phase is documented at [docs/current/P1_AUTH_DATA_MODEL_DESIGN_2026-10-30.md](docs/current/P1_AUTH_DATA_MODEL_DESIGN_2026-10-30.md).

- Establishes trusted Supabase Auth profiles, role assignments and **entitlements** independently (trial/paid status must not depend on mutable role flags).
- Correct hierarchy: course → domain → topic → lesson → content blocks; unlike current non-deployed SQL's modules and direct course-level topics.
- Separates safe public catalog data from entitled lesson blocks/private media and protected question answers.
- Enforces explicit Postgres GRANT with RLS and private Storage policies, including Supabase's 2026-10-30 Data API change for newly created tables.
- P1 work packages specify environment isolation, learner account provisioning, canonical migrations, entitlement RLS, frontend adapters, acceptance tests and rollback.
- Keeps user approval gate for new permissions, initial self-signup policy, author scope and media/commerce vendors.
- **Evidence limitation:** GitHub source read only; no SQL applied, CI/runtime/browser test run, no app UI changed or deployment.

### 2026-10-30 — v1.0.5 design documentation
- Added P1 Auth/Data Model Design for review, with role/entitlement matrix, four-level hierarchy, migration plan and negative security test suite.
- No code, media, questions, database, environment or production settings changed.


## 24. P1 foundation implementation (DRAFT PR #7) — 2026-10-30

**Branch:** \`feat/p1-secure-foundation-20261030\`; **PR:** [#7](https://github.com/Minamilad162/Technica-LMS/pull/7). **Status: CODE IMPLEMENTED IN REVIEW BRANCH / NOT DEPLOYED / NOT MERGED.**

### Implemented code (not live features)
- \`supabase/migrations/202610300001_p1_foundation.sql\`: fail-on-conflict new migration for dedicated Technica Supabase *staging*, 11 proposed tables and four-level \`courses → domains → topics → lessons → lesson_blocks\`, role assignments, signup profile trigger, trial/paid/manual course entitlements and limited trial lesson grants, protected media metadata, audit table, authorized helper functions, explicit grants/RLS and server-only privileged data writes.
- \`scripts/test-p1-foundation.mjs\` + \`package.json\` script + GitHub Actions static contract gate, checking ancestry, trigger and no client-driven admin role, time/status entitlement logic, public vs protected access, RLS/GRANT and absent destructive statements.
- \`supabase/P1_STAGING_MIGRATION_RUNBOOK.md\`: mandatory staging application checklist, direct REST / JWT RLS positive/negative tests, manual verification queries and rollback.
- \`supabase/README.md\`: explicit warning that older \`supabase/001_lms_schema_PROPOSED.sql\` must **not** be deployed as it conflicts with approved hierarchy.

### Verification, limits and next gate
- [GitHub Actions run #45](https://github.com/Minamilad162/Technica-LMS/actions/runs/40979943570) on branch commit \`5c8b2f9428daac43ad068571e3aa6e45d4172ea6\`: **SUCCESS**. Log confirms P1 static schema check PASS (11 tables, course chain, trusted signup, time/entitlement and RLS/GRANT guardrails), 1,625 imported ASP questions PASS, old demo regression suite PASS, Vite build PASS, and \`npm audit --audit-level=high\` found 0 known vulnerabilities at that time.
- These checks **DO NOT parse or execute PostgreSQL**; the new SQL may require adjustments before deployment. No actual Supabase credentials, migration, RBAC negative test, live payment, protected video, user login or device QA were run.
- PR #7 is independent of Draft PR #6 (which adds a reproducible npm lockfile). PR #7 still uses main's temporary CI \`npm install\` fallback; typecheck remains pending. Do not misrepresent either as resolved in main.
- **P1 incomplete:** obtain approved development/staging Supabase project, execute/review migration, verify auth signup trigger and correct data access using separate identities, document Storage policies, build server-protected question/role/grant APIs, and integrate Auth frontend adapters after verified backend.
- Current legacy React demo, ASP/PSEE question banks, current assessment/practice settings, UI/animations and route behavior are unchanged.
- Decision status: architecture and UX owner-approved invariants preserved; implementation SQL is **PROPOSED FOR REVIEW**, not a silent approval of every role/permission choice.
- **Risk registry:** BUG-017 (wrong older hierarchy), BUG-018 (published content not entitlement-checked) and BUG-019 (signup profile path) have draft mitigations in PR #7, but **remain OPEN until staged SQL and direct API tests PASS**.

### 2026-10-30 — v1.0.6 P1 review implementation
- Added first actual P1 backend migration, test gate, runbook and warning against outdated schema.
- GitHub Actions static test passed on development branch; database/migrations/front-end production integration remain unexecuted.
- No merge to main, cloud deployment, database change, uploaded customer material or user-visible UI change.
