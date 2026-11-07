# TECHNICA CONSULT LMS — MASTER SYSTEM BLUEPRINT

> **Canonical project specification / single source of truth**
>
> Project: Technica Consult LMS
> Version: 1.1.11 (Practice Center quick mode selection)
> Last updated: 2026-11-05 (Africa/Cairo), P11 learner Progress & Analytics read-only source
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
7. **Adaptive logic (P8e CURRENT):** ONLY in Level Up Practice, learner chooses N, split its INITIAL question budget into near-equal Low / Medium / High thirds (N=30 → 10/10/10). Each tier has a FIXED correct-answer target = ceil(70% × ORIGINAL tier allocation), checked after at least that original number of tier questions. Example Low 6/10 then ONE further correct at Q11 → 7/11 → promote to Medium Q12; do NOT recalculate 70% of 11. Wrong extra attempts consume N but never increase required correct. End at N no matter the stage. Hide all difficulty/level-transition signals while solving. §§53–57 are historical and superseded for NEW sessions by §58.
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
| Scientific calculator | IMPLEMENTED IN DEMO | Original floating calculator added to Practice, Assessment and Learning Knowledge Check; full device/manual verification pending |
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
| DEC-013 | 2026-10-28 | SUPERSEDED BY DEC-016 | Historical proposal: fixed minimum 10 answers in each tier; current user-approved P8d instead proportionally divides selected N into near-equal thirds. |
| DEC-014 | 2026-10-28 | PROPOSED | Server-side Supabase domain model, signed streamed video and PSP vendor selection |
| DEC-015 | 2026-10-28 | LOCKED | Owner-supplied infrastructure, evidence-first audit, and UI reference governance are repo-integrated; existing newer root UI guide remains authoritative; maintain tests, docs, and prior accepted behavior. |
| DEC-016 | 2026-11-04 | LOCKED / SUPERSEDES P8 20% CHECKPOINT | Adaptive Level Up only in Secure Practice: selected N balanced thirds; 30 -> 10 Low, 10 Medium, 10 High in perfect journey. Promotion after own-tier minimum and >=70% cumulative correct; if below keep same tier, never exceed N, silently advance without learner level labels. |
| DEC-017 | 2026-11-04 | LOCKED | New P8d sessions use persisted Low/Medium checkpoints; existing P8 in-flight sessions retain their original stored 20% threshold without migration changes. No real database updates until separate user-approved staged rollout. |
| DEC-018 | 2026-11-04 | LOCKED / SUPERSEDES P8d EXPANDING DENOMINATOR | Fixed correct-answer target: 70% of the ORIGINAL tier base, e.g., for 30-Q Practice, 7 correct after at least 10 Low questions. 6/10 + one extra correct => 7/11 advances immediately; wrong extras never increase required 7. Medium uses the same rule; selected N remains the absolute cap and tier stays hidden. |
| DEC-019 | 2026-11-04 | LOCKED | P8e adds nullable per-attempt policy version: new sessions use fixed correctness; existing P8/P8d sessions are left intact until finished. No real DB migration or learner/question content mutation without separately approved staging verification. |
| DEC-020 | 2026-11-04 | LOCKED / SOURCE IMPLEMENTED | ASP Mock questions must be reviewed and individually selected by stable UUID, then exactly 200 unique DRAFT items reserved atomically in an immutable versioned form. Existing orphan mock flags block the operation; no auto-correction or auto-release. This reservation does NOT activate the 200/300 Mock engine. |
| DEC-021 | 2026-11-04 | LOCKED / SOURCE IMPLEMENTED | Practice approval can occur ONLY after the exclusive 200 Mock items are reserved, and only by a verified second Admin different from the original human reviewer, with per-item explicit confirmation, evidence/rights/domain checks, and permanent audit event. No bulk approval. Source changes do NOT authorize production DB writes. |
| DEC-022 | 2026-11-04 | LOCKED / P9C SOURCE | ASP bank evidence must be measured using SELECT-only aggregates against the actual confirmed Technica Supabase environment before content rollout: no automatic assumption of historical 1,625 as production rows; distinguish P4 runtime APPROVED from P6A rights/answer/domain verified; P9B tables OPTIONAL; verify 9 ASP11 domains, possible 200 reserved, and conservative P8e N30 per-tier minimum 30; never run DDL/DML/import/approval/reservation to obtain metrics. |
| DEC-023 | 2026-11-04 | APPROVED / P9C.1 SOURCE | Provide concise owner-run SELECT-only decision summary when P9B form tables are verified PRESENT, explicitly distinguishing real ASP imported/vetted/approved counts, P8e N30 30-per-tier pools, historical 1,625 reference, 200 flags vs 200 immutable form IDs, and NOT_IMPLEMENTED official Mock delivery. Do not infer actual results from SQL source text or synthetic CI fixtures. |
| DEC-024 | 2026-11-04 | CANDIDATE RECEIVED / NO IMPORT AUTHORIZATION | Owner uploaded a private NEW ASP workbook with 2,500 rows across 9 sheets, but it is neither a confirmed Supabase import nor a final accepted replacement for the historical 1,625 Demo/P4 source. Preserve confidentiality; classify only after SME verifies domain/difficulty/rights/answer/citation; do not bundle correct answer keys in public GitHub or Vite, do not invoke legacy hard-coded importer, and do not modify Production without distinct authorization. |
| DEC-025 | 2026-11-04 | APPROVED / P9D.1 SOURCE | For the 2,500-question PRIVATE XLSX use a NEW SHA256-pinned nine-sheet offline-only source reader and a separate owner-exported SELECT-only Supabase ASP metadata fingerprint CSV. Compute deterministic normalized prompt stable IDs and classify safe count-only new/exact/mismatch/protected-conflict results. NO network/db connection, hidden service keys, public question answer bundles, active import, migrations or Supabase production writes. Old 1,625/FIVE-group importer and Level Up P8e fixed 7-of-10 remain unchanged. |
| DEC-026 | 2026-11-05 | OWNER-LOCKED / ENGINEERING FREEZE | Stop repeated ASP question-bank research phases. Private source-of-record candidate is new 2,500/9 XLSX, preserve 1,625 Demo, P9D1 diff tool, human rights/answer/difficulty gate and P9B 200 reserved. Do not block unrelated Mock/Analytics development on content operations; never assert unpublished real questions have been imported. |
| DEC-027 | 2026-11-05 | P10 SOURCE / STAGING PENDING | Build actual official 200-question/300-minute server-based ASP Mock separately from Practice, with private snapshots/keys, JWT entitlement, autosaved answers/flags, fullscreen-exit close, explicit final score and no 200-key leaks. No production migration or content write without separate approval. |
| DEC-028 | 2026-11-05 | APPROVED P11 SOURCE / STAGING PENDING | Deliver real learner-owned analytics from protected P2, P4/P8e and P10 results; canonical Course→Domain→Topic→Lesson progress, separate Practice/Mock metrics and latest finished attempts. Count only verified `lesson_completed_at`; answer accuracy = correct/answered, exam score = correct/assigned. Never fabricate Topic question accuracy without question→topic FK. Filter by live JWT owner, P1 course + per-lesson entitlement (including Trial) and do not disclose private questions or other learners. No Production DB changes without authorization. |
| DEC-029 | 2026-11-05 | P12.1 SOURCE / GO-LIVE NO-GO | Release readiness is an Admin-only read-only dashboard using actual signed Supabase JWT and existing P1/P2/P4/P6A/P8e/P10/P11 read-only checks, with independent manual evidence gates that remain PENDING regardless of runtime pass. No production writes, release approvals or claims that synthetic CI proves deployment. |
| DEC-030 | 2026-11-05 | P12.2 STAGING-ONLY SOURCE / GO-LIVE NO-GO | Build real signed-JWT Staging 19-scenario READ-ONLY API integration harness for Admin/Paid/Trial/Outsider+Anon, with explicit nonmatching Prod/Stage project refs, manual CLI acknowledgement and no Service Role/production fallback. Integrate a local-only sanitized JSON Staging Evidence panel into existing Admin Release Readiness. No API smoke or imported JSON may certify browser/mobile end-to-end coverage or change Production NO-GO. |
| DEC-031 | 2026-11-05 | APPROVED P13 SOURCE / PRODUCTION NO WRITE | Centralize all Admin actions in one premium Admin Tools workspace with six sub-tabs, actual dynamic Supabase dashboards/charts, course hierarchy, human ASP review, P9B 200-item explicit Mock reservation, real learner plan/progress and system readiness. Apply to BOTH React Demo App and actual Vite SupabaseApp live entrypoint. Existing P1 entitlements have no financial ledger: show amount/currency/revenue as Not recorded, never invent paid sums. Real Admin JWT + RLS required; P13 read-only RPC migration is Stage-only source pending explicit owner approval. |
| DEC-032 | 2026-11-06 | P14 SECURE LESSON PDF/VIDEO / STAGING NOT DEPLOYED | Fix Admin Tools Course→Domain→Topic→Lesson Text-only authoring: expose upload +PDF/+Video and optional Text, protect source media in private Supabase Storage with authenticated Admin-only signed upload and server-ACL-per-Lesson short-lived playback. Atomic service-only upload finalization, no raw path or keys in client bundles, dynamic user/time watermark, discourage browser print/copy/download controls. Browser OS screenshots/recording/network copy cannot be 100% blocked; Widevine/FairPlay DRM and server-rasterized PDF needed for stronger protection and require future integration. No existing Production DB writes without separate approval. |

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
| BUG-013 | HIGH | FIXED / VERIFIED IN MAIN | PR #6 merged at e742d3b; lockfile committed and npm ci required; GitHub Actions main run #56 passed. |
| BUG-014 | MEDIUM | OPEN / type safety | Current v1.15 is React JavaScript/JSX with no genuine TypeScript check. Do not fake typecheck or blindly rewrite app; plan incremental migration and gate. |
| BUG-015 | MEDIUM | GUARDED / UI provenance | Older uploaded September UI guide must not overwrite the more recent October 24 root guide (includes previously approved motion/video/3D references). Archived older source; current root unchanged. |
| BUG-016 | LOW | FIX IMPLEMENTED / TEST PENDING | Initial infrastructure script rejected valid local untracked .env secrets; updated to use git ls-files for tracked secret detection, preserving secure local development. Runtime script verification remains pending in CI. |

| BUG-017 | CRITICAL | OPEN / proposed SQL not deployed | Proposed \`supabase/001_lms_schema_PROPOSED.sql\` lacks Course → Domain → Topic → Lesson ancestry: courses.domain text, modules under course, lessons under modules, and topics directly under course. Do not deploy unreviewed; design new four-level migrations and FK tests. Evidence: [P0 source audit](docs/current/P0_BASELINE_AUDIT_2026-10-30.md). |
| BUG-018 | CRITICAL | OPEN / entitlement model | The proposed SQL lets any authenticated user SELECT published course/module/lesson/topic rows without active enrollment, trial scope or purchase. Introduce entitlement-scoped policies/queries, protect private media and test direct API access before commercial launch. Proposed SQL is not confirmed deployed. |
| BUG-019 | HIGH | OPEN / onboarding | Proposed SQL restricts profile INSERT to admin but defines no trusted learner profile provisioning after sign-up. Add audited trigger/service-mediated bootstrap with default learner role; test no self-promotion. |
| BUG-020 | MEDIUM | OPEN / verification gap | P0 2026-10-30 used connected GitHub source inspection only; direct git checkout failed due DNS, and npm/CI/browser/Supabase live tests not independently verified. Record runtime evidence before marking any phase PASS. |

Add new BUG rows immediately when an issue is discovered, include reproduction, root cause, fix, commit, proof and regression-test identifier. Never erase bugs after fixing; change status to FIXED / VERIFIED.

| BUG-021 | HIGH | FIX IN P8D SOURCE / LIVE MIGRATION PENDING | Legacy P8 20% checkpoint promoted 30-question Level Up after 6 Low instead of the owner-required 10; it could produce 6/6/18 rather than 10/10/10 perfect. P8d uses balanced one-third Low/Medium persisted gates, >=70% cumulative per-tier recovery, and exact N cap. Disposable Node/PG tests and P8d SELECT-only live audit prevent regression. Old active sessions remain unchanged; production acceptance pending. |

| BUG-022 | HIGH | FIX IMPLEMENTED IN P8E SOURCE / LIVE STAGING REQUIRED | P8d erroneously used 70% of a GROWING attempted count (6/10 + one correct = 7/11 wrongly stays Low) rather than fixed 70% of original 10-question tier (7 correct required). P8e keeps N30 original 10/10/10 thresholds but freezes correct target at 7 for Low/Medium regardless of extra failures; PostgreSQL and Node regression prove 7/11 and 7/12 promote, no extra items or in-flight rewrites. New owner-run guarded migration and JWT/Cloudflare acceptance remain pending. |

| BUG-023 | HIGH | PREVENTION / P9B SOURCE | Prior ASP bank had human review READY metadata but no explicit 200-ID private Mock reservation and no separately audited Practice approval path. P9B adds exact-200 immutable form, fail-closed server checks, second Admin per-item approval, secured UI and ephemeral negative tests; production installation and actual content rights/Mock delivery remain pending. |

| BUG-024 | MEDIUM / AUDIT GAP | P9C SOURCE FIXED / LIVE NUMBERS PENDING | Previously the 1,625 historical Demo bank, private P6A review READY count and optional P9B 200 Mock flags could be misconstrued as verified production inventory or legal readiness. P9C adds SELECT-only real database aggregates, optional missing-P9B handling, separate P4 runtime vs governance-reviewed eligibility, 9×3 tier diagnostic, and CI zero-write fingerprints. Owner-run real Supabase counts and SME content verification remain explicitly pending. |

| BUG-025 | MEDIUM / IMPORT SAFETY | PREVENTED IN P9D.1 SOURCE | Existing historical ASP importer hard-enforces 1,625/five groups and cannot safely ingest the newer 2,500/nine-sheet user-private source. New pinned offline-only parser and SELECT-only existing-bank hashed CSV snapshot differentiate duplicates/protected content conflicts without touching imported, reviewed, attempted or Mock-exclusive items. Real Supabase snapshot/export and qualified SME rights/answer checks remain pending. |

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


## 23. P0 CI verification and reproducible install — 2026-10-30

**Observed CI evidence and current status:** [docs/current/P0_BASELINE_AUDIT_2026-10-30.md](docs/current/P0_BASELINE_AUDIT_2026-10-30.md), Section 7.

1. Existing main baseline GitHub Actions [run #37](https://github.com/Minamilad162/Technica-LMS/actions/runs/40977894570), commit \`274bcad06f2ac56e82e85c61b71f382af08d9ab6\`: SUCCESS. Verified from decoded job logs: core project integrity, 1,625 ASP imported bank IDs, all registered demo regression scripts, Vite build, dependency audit 0 known vulnerabilities. This was the historical **npm install fallback**, not reproducible \`npm ci\`.
2. **Fix prepared on draft PR, not main:** [PR #6](https://github.com/Minamilad162/Technica-LMS/pull/6) \`chore/p0-reproducible-install-20261030\`: npm lockfile generated by CI, committed; CI now requires \`npm ci --no-fund\`; temporary extraction instrumentation fully removed. GitHub Actions [run #41](https://github.com/Minamilad162/Technica-LMS/actions/runs/40978913432), commit \`4cbf887546d476fc2ed51efc1913d271f72260f0\`: SUCCESS, \`npm ci\`, existing regressions, build and audit all passed. A subsequent docs-only commit may produce newer run; ensure the final PR head CI is also green before merge.
3. **Do not misinterpret CI:** TypeScript/static typecheck is still warning/SKIP, not PASS. CI demo auth/quiz tests do not test Supabase, RLS, mock exclusion, DRM, Zoom, purchases or real-browser/device acceptance.
4. **P0 status:** code+question integrity and existing CI regressions **EVIDENCED PASS**; overall **PARTIAL**, pending ASP source rights/domain crosswalk, browser/visual device QA, approved P1 data model and real production integration. Paid launch remains **NO-GO**.
5. **Change scope:** dependency lockfile + CI install gate only in draft PR, no user-visible behavior or question-bank logic changes, no SQL migration, no production deployment. Rollback: close PR without merge or revert the lockfile/CI commits on review branch.

### 2026-10-30 — v1.0.6
- Verified existing CI main run #37 by reading GitHub Actions log, replacing older “not run” limitation where evidence is now available.
- Generated/validated a lockfile in CI and committed it to a separate review branch with strict npm ci; run #41 passed.
- Updated BUG-013 to “fix verified in draft PR / not merged”; all other blockers remain. No design, application, database or paid production change.


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


## 25. P1 ephemeral SQL/RLS verification — 2026-10-30

- Added \`scripts/test-p1-postgres-smoke.sh\` and a dedicated GitHub Actions job with a disposable PostgreSQL 16 container. The smoke harness provisions fake Supabase Auth/DB roles and exercises the **actual new migration SQL** (not just text matching).
- [GitHub Actions run #51](https://github.com/Minamilad162/Technica-LMS/actions/runs/40980401056) at head \`68b66c972d631de7be37d0d9b3e49b945c159d84\`: both \`validate\` and \`p1-postgres-smoke\` jobs **SUCCESS**. Job logs confirm public catalog, unentitled deny, paid read, trial allowlist, admin draft read, no client admin self-grant and anonymous block deny. Later test refinements further cover cross-course isolation, expiry, revoke and suspension; use their final job run as proof.
- **Important status:** PostgreSQL success is a significant SQL/role-policy test, but mocks Supabase Auth and uses a disposable service. Live Supabase Staging JWT, Auth, Data API, Storage and other modules are NOT tested/deployed. No production claim or merge into main.
- Updated \`supabase/P1_STAGING_MIGRATION_RUNBOOK.md\` with exact test boundaries. Maintain owner approval gate for applying real database migrations. BUG-017/018/019 still OPEN until real Supabase tests.

### 2026-10-30 — v1.0.7 ephemeral database test
- Improved P1 test evidence from static source-only checks to actual PostgreSQL 16 migration/RLS test on disposable GitHub runner; no external database used.
- No user-facing UI, original ASP bank, cloud environment, payment or real video changed.


## 26. Integrated GitHub source release — 2026-10-31

- Owner requested the latest Technica LMS source on GitHub main. P0 PR #6 merged as `e742d3b` and verified by main Actions run #56.
- Integration branch `release/p0-p1-integrated-20261031` combines P0's mandatory npm ci and P1 guarded migration, schema contract test and disposable PostgreSQL security tests. Merge to main only after integration CI passes.
- Critical operational boundary: **P1 schema added to source; NOT run against Supabase**. React frontend remains v1.15.0 local demo. Real Auth/Storage/payment/DRM/200-question exam unavailable until separately delivered and tested. No production-claims.
- Preserved all previous decisions: Course → Domain → Topic → Lesson, ASP Mock = 200 reserved questions / 300 minutes (planned), 70% adaptive step (planned), admin-only Question Bank, removed Saved learner screen, and original question IDs.
- Production gate: real Supabase staging and roles/JWT/RLS/Data API/Storage security smoke, plus app/auth integration and browser acceptance still required.

### 2026-10-31 — v1.0.8 change record
- Canonical Blueprint combined from both reviewed branches. P0 documented FIXED in main; P1 SQL and tests now form a single versioned source proposal. No actual DB migration performed.


## 27. Verified main-branch integrated source — 2026-10-31

- PR #6 (P0 lockfile/npm ci) merged to `main` as `e742d3b4a4b7035d624756b7f5dcd57e436abca4`. Main run [#56](https://github.com/Minamilad162/Technica-LMS/actions/runs/41175791663) **SUCCESS**.
- P0/P1 integration [PR #8](https://github.com/Minamilad162/Technica-LMS/pull/8) merged to `main` as `343a91386d069bc5549d547e03cc711159075303`. Combined feature branch run [#57](https://github.com/Minamilad162/Technica-LMS/actions/runs/41175943743) and post-merge main run [#58](https://github.com/Minamilad162/Technica-LMS/actions/runs/41175995195) both **SUCCESS**: `npm ci`, P1 SQL static contract, legacy 1,625 imported ASP bank integrity, demo regressions, Vite build, npm vulnerability audit, disposable PostgreSQL 16 migration and role/RLS smoke tests.
- Old P1 draft [PR #7](https://github.com/Minamilad162/Technica-LMS/pull/7) closed unmerged as superseded by integration PR #8; its P1 implementation is present in the main tree via PR #8.
- **Implementation vs deployment:** SQL migration exists under `supabase/migrations/`, and was executed only on ephemeral PostgreSQL testing. NO Supabase environment/migration, payment, protected media, adaptive/mock server engine or real user Auth was deployed by this release. No cloud deployment or browser verification claimed.
- Application `package.json` remains the historical `1.15.0` browser-local demo; master specification release version `1.0.9` is DOCUMENT GOVERNANCE, not a product production-version claim.
- Preserve canonical rules and all regression locks. P1 backend integration and real staging tests are next work; no destructive old-schema import without migration plan.

### 2026-10-31 — v1.0.9 documented main release
- Recorded verified merge SHAs and GitHub CI proof without changing application/database behavior. No direct Supabase or Cloudflare action.


## 28. Floating scientific calculator — implementation (2026-10-31)

**User-approved feature intent:** a TI-30XS MultiView-function-inspired calculator button on every actual question-taking page, with a floating window so the learner can read questions and choices during calculation and can use both mouse and keyboard. The original TI reference image is design input only, not distribution artwork.

**Implemented on development branch [PR #9](https://github.com/Minamilad162/Technica-LMS/pull/9):**
- \`src/lib/scientificCalculator.js\`: original safe no-eval arithmetic parser with order of operations, implicit multiplication, fractions/mixed-result formatting, percent, factorial/nCr/nPr, roots, powers, trig/inverse/hyperbolic trig, DEG/RAD/GRAD, logarithms/exponentials, SCI/ENG outputs, memory and last-answer variables, random/randInt, 1Var and 2Var stats and f(x) table.
- \`src/components/ScientificCalculator.jsx\`: floating non-modal interactive UI with original blue shell/LCD-inspired display, function keys/2nd, history and data/table tabs. Desktop drag, close/minimize. Compact phone dock (max 52dvh). Keyboard shortcuts and editable expression with focus-safe handling; quiz time/answer state unaffected.
- \`src/scientificCalculator.css\`: scoped responsive styling, independent of existing approved desktop/mobile quiz layouts.
- Mounted in \`src/pages/QuizPage.jsx\` for BOTH practice and assessment (including all current question variants using these routes), and the 10-question \`src/pages/LearningPage.jsx\` CourseQuiz. Future production Mock/Adaptive flows must use this shared component when implemented.
- \`scripts/test-scientific-calculator.mjs\` + CI: 52 independent arithmetic/scientific vectors, three angle tests, rational/decimal formats, stats/regression, 17 invalid-input cases, RNG boundaries and all three quiz entry points. Existing bank/quiz/regression/build/DB tests must stay green.
- User guide: \`docs/current/SCIENTIFIC_CALCULATOR_GUIDE.md\`.

**Scope/limitations and non-regression rules:**
- Proprietary TI logos, exact photographic hardware shell, TI firmware/emulator and patented/copyrighted MathPrint-specific presentation are not copied; app has its own visual identity and math engine. This is a TI-*inspired* scientific tool, **not** a pixel-perfect TI-30XS replica or TI-certified equivalent. Some exact symbolic radical/fraction editing and fixed precision modes still require comparison and possible follow-up implementation.
- The calculator is a client-side exam aid, NOT server grading; no change to answer selection, attempt timing, quiz session persistence, admin rules, original 1,625 imported ASP questions or current UI route behavior.
- No new production Supabase access, paid functionality or standalone 200-question Mock is represented as implemented.
- Browser QA on desktop and 375/390/430px phones, pointer/keyboard focus behavior, visibility of question and answers and assistive technology remain manual release acceptance items. Passing CI source tests is not screenshot/device evidence.
- Before any commercial exam launch, confirm calculator policy and full output parity on a reviewed reference matrix, and preserve calculator availability in every newly created question screen.

### 2026-10-31 — v1.1.0 scientific calculator worklog
- Implemented and tested original scientific calculator in the three current question-taking flows on an isolated review branch. Kept legacy CSS and exam/business logic untouched except importing the shared component. No database changes.

## 29. Scientific calculator extension — 2026-10-31

**User change:** implement remaining useful TI‑30XS MultiView scientific calculation functions on top of existing floating calculator, preserving its presence in Practice, Assessment, and the Learning 10-question knowledge check.

**Implementation in review PR #10** (`feat/ti-scientific-parity-v2-20261031`):
- Exact-style rational output (stacked numerator/denominator), simplified integer square roots (e.g. `sqrt(8) → 2√2`), and rational multiples of π when directly supported by expressions; explicit approximate/exact answer toggle. This is **not a complete symbolic algebra engine**, and unrecognized expressions return accurate numerical values.
- Textbook/Classic display selection and FLOAT/FIX 0–9 decimal mode. Supports NORM/SCI/ENG and DEG/RAD/GRAD from first implementation; percent/decimal display and fraction conversion.
- Seven independent stored variables `x,y,z,t,a,b,c` with store/recall/clear within a quiz; preserved original M memory and Ans. No storage in Supabase or other exam sessions.
- Angle conversions, DEG/minute/second input and output, rectangular↔polar helper calculations with selected angle mode; explicit angle modifier expression functions and signed odd roots.
- Three-list `L1,L2,L3` numeric editor, independently edited inputs, formula expressions referencing other lists, integer/fractionally weighted 1Var statistics with medians/quartiles and summary sums, 2Var regression diagnostics; dependent list formula safeguards.
- Function table adds automatic Start/Step/Count and custom Ask-x values. Constant K panel allows repeated operations on last result.
- Source code: `src/lib/scientificCalculatorExtended.js`, `src/components/CalculatorAdvancedPanels.jsx`, additions to `src/lib/scientificCalculator.js`, `src/components/ScientificCalculator.jsx` and scoped CSS.
- Automated checks: `scripts/test-scientific-calculator-extended.mjs` and `npm run test:calculator:extended` in GitHub Actions, plus all prior scientific, question bank, learning, React build and PostgreSQL regression tests.
- Official feature inventory cross-checked against the public TI-30XS MultiView specification and Guidebook (https://education.ti.com/en/products/calculators/scientific-calculators/ti-30xs-mv and https://education.ti.com/en/guidebook/details/en/50BE24C84836434485BD2E8D49374AF7/30x_mv).

**Boundaries:** No TI firmware/software/emulator, logo, photographed keypad, or proprietary MathPrint implementation copied; original Technica rendering is not certified 1:1 model parity. Exact symbolic output covers intentionally limited cases; advanced list/menu navigation, full 4-line hardware LCD limits, numeric precision of the real model, and random number seeding may differ. Must perform an independently validated feature-by-feature output parity matrix, browser/mobile functional QA and exam-allowed-calculator review before commercial claims.

**Non-regression:** no changes to the assessment/quiz timer, grading, navigation, session/save semantics, user data, 1,625 imported ASP questions or Supabase schema. Future exam routes must reuse shared calculator.

### 2026-10-31 — v1.1.1 scientific extensions
- Added independent pure-math modules and React panels, extended math/angle/memory/list/table feature tests; tracked model comparison limitations explicitly.
- This stage is source code on review branch until CI and owner release gate pass; not a Supabase migration.


## 30. Nested textbook math editor, rational precision and dynamic data menus — 2026-10-31

**Owner request:** finish the previously noted gaps in scientific calculator textbook-format entry, list/menu mechanics and precision rather than claiming mere MathPrint-like output is complete.

**Implemented source on [PR #11](https://github.com/Minamilad162/Technica-LMS/pull/11):**
- \`src/lib/mathTemplateEditor.js\`: original nested expression document tree, field IDs/selection, insertion, slot editing, deletion, safe serialization to the established expression engine and strict maximum **4 nested levels**. Template types include fraction, mixed number, square root, n-th root, exponent, e^x and 10^x.
- \`src/components/MathTemplateEditor.jsx\`: actual interactive *input* templates within calculator LCD, not just result display. Fields support independent selection/editing, next/previous arrow navigation, numerator↔denominator via Up/Down, keyboard Enter, Ctrl+/ fraction and Ctrl+R radical, pointer keypad integration, slot removal and horizontal scrolling. **CLASSIC** remains linear expression input.
- \`src/lib/calculatorPrecision.js\`: bounded exact rational arithmetic via \`BigInt\` for rational-only expressions (no \`eval\`), including terminating decimals and fractions; representation converted back for the scientific/trigonometric engine. LCD-style **10 significant digits** in FLOAT, 0–9 fixed decimal digits for FIX, display of NORM/SCI/ENG. Rounding is a separate view concern: underlying trigonometric and irrational computation remains IEEE-754 \`Number\`, not a clone of TI internal arithmetic.
- Added the model-documented exponent precedence difference: \`2^3^2\` = **512** in Textbook and **64** in CLASSIC. Existing calculator arithmetic and API stay backward compatible in the default mode.
- \`src/lib/scientificCalculatorExtended.js\`: recalculates dependent list formulas (L1→L2→L3) after source updates, rejects direct/indirect circular formulas, while retaining 42 items per list. \`CalculatorAdvancedPanels.jsx\` adds the CLEAR/FORMULA menu grouping and list/formula management. Full reset now confirms before clearing expression, settings, memory, lists and history.
- \`scripts/test-mathprint-precision.mjs\`: new deterministic test suite for nested fields, invalid/incomplete templates, max nesting, exact rational fractions, 10-digit outputs, documented power precedence, dependent list recalculation, circular guards and UI source wiring. Must run alongside previous calculator tests, P1 PostgreSQL smoke, ASP 1,625 question integrity, quiz/learning regression and Vite build.

**Official reference behavior used for cross-check (design research, not copied code):**
- TI official Home Screen: https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_Home.HTML (4-line 16-character hardware display; four template levels).
- TI official Order of Operations: https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_OrdOps.HTML (MATHPRINT right-assoc ^, CLASSIC left-assoc ^).
- TI official Data Editor: https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathTools/MT_DataEd.HTML (L1/L2/L3, max 42 and formulas).
- TI official Modes: https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_Modes.HTML (FLOAT up to 10 display digits and FIX 0–9).
- TI official Fraction input guide: https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathFunc/MF_Frac.HTML.

**Boundaries / realistic completion criteria:**
- This is **independent Technica textbook-style input**, not a licensing claim or pixel-identical implementation of the TI proprietary MathPrint system. Native firmware/menu key sequencing, four hardware LCD text rows, some advanced root/π combined symbolic canonicalization and TI internal floating-point error behavior are not identical.
- Avoid calling it 100% firmware-compatible or a certified exam calculator. Independently validate a full reference output matrix on actual device or manufacturer-approved online reference and perform human browser QA (desktop, mobile touch, physical keyboard, contrast, screen-reader) before promising hardware parity.
- No SQL or Supabase/Auth/Cloudflare deployment in this feature. No change to quiz score, countdown, question bank/IDs, flags or navigation. The calculator stays present on every *currently built* question page; future official Mock/Adaptive engines require the shared component when constructed.

### 2026-10-31 — v1.1.2 calculator math entry change record
- Built a functional structured nested-input editor, high-precision rational-only arithmetic, TI-style numeric display and dependent list formula menus; protected existing quiz behavior and data through dedicated CI.
- Merge/deployment status must be confirmed separately by actual GitHub Actions results and main-branch commit after passing PR gates.


## 31. TI-30XS MultiView verified-reference compliance audit — 2026-10-31

**Owner requirement:** validate implementation by genuine tests and audit every original calculator function; do not accept broad claims of completion.

**Audit document (canonical subsidiary):** [TI30XS_CALCULATOR_AUDIT_20261031.md](docs/current/TI30XS_CALCULATOR_AUDIT_20261031.md). This document includes a manufacturer-backed function-by-function matrix and explicit severity/status. It supersedes earlier casual phrasing of the calculator as feature-complete.

Confirmed defects against TI documentation and work performed under [PR #12](https://github.com/Minamilad162/Technica-LMS/pull/12):
- Factorial was wrongly allowed through 170, now TI-specified **0–69**.
- 1Var frequency values exceeding 99 were incorrectly allowed, now TI-specified **0–99**.
- K operator rejected TI-style \`*2+3\` syntax and had no 44-char guard; these are added, but the manufacturer's exact automatic UI cadence remains different.
- RAND seed had no function; repeatable seeded random stream introduced, **NOT the certified TI sequence**.
- List formulas previously silently treated missing linked data as zero and accepted formulas without list references; now enforce list names, length mismatches and circular dependency guards.
- Pressing ENTER did not auto-close pending parentheses. Added a safe UI finalizer and bound while preserving strict parser APIs.
- Real Chromium touch QA discovered actual blocker: the floating calculator intercepted answer clicks on a 390px phone. Reworked mobile question/calc split into an in-flow scrollable top question pane and bounded bottom calculator; run the new independent Chromium checks before calling this fully fixed.

Verification:
- Node reference cases \`npm run test:calculator:ti-audit\`; existing calculator/multilevel arithmetic suites; legacy bank/quiz/learning checks; Vite and P1 disposable Postgres smoke.
- Real Chromium workflow [calculator-browser-audit.yml](.github/workflows/calculator-browser-audit.yml) checks desktop pointer drag, math templates, keyboard Enter, answer selection with tool open, navigation and currently built question routes on mobile 375/390/430.
- Record exact **latest commit CI status** before merging. Old passing math unit tests alone did not verify mobile answer interactions.

**Explicit strict parity outcome:** NOT equivalent to original TI-30XS MultiView firmware in all details. Known partial/missing capabilities include full symbolic simplification, exact TI PRNG sequence, firmware-specific K automatic input workflow, full StatVars menu/key navigation, four-line 16-char physical LCD, 23 pending values/8-value hardware EOS stack and actual internal numeric precision/errors. Hardware attributes do not apply to a cloud LMS. Any request to certify “all TI functions” must be handled as a separate measurable firmware-device reference test with physical hardware or an authorized source, not via a generic green CI result.

### 2026-10-31 — v1.1.3 calculator audit record
- Maintained accepted quiz styles and answer/score/timer business logic; no database migration or live cloud deployment claimed. Do not reduce existing operations merely to match a test.
- Pending release gates: most recent Playwright desktop/mobile and all CI checks on exact review SHA; manual iOS/Android usability and official device output parity remain unverified.


## 32. User photo-based calculator physical layout / compact keypad — 2026-10-31

Owner explicitly requested implementing the supplied TI‑30XS MultiView **visual shape, exact keypad grouping and spatial layout** IN THE CODE of Technica LMS, not an image mockup. They also requested **as little internal scrolling as possible**, while keeping questions and choices visible and preserving all existing scientific functionality. The reference is user-supplied image in the conversation, not artwork embedded in the app.

**Implemented as an independently designed, Technica-branded physical-style UI** (no TI trademark/logo/photographic assets, no claim of firmware parity):
- \`src/components/CalculatorPhysicalKeypad.jsx\`: stable 5-column layout of **35 main keys in 7 rows**, plus **6 upper function keys in 2 rows**, circular four-arrow navigation pad occupying upper-right two columns, yellow-green second-labels and color-separated white numeric, dark operations, blue scientific keys and lime 2nd key. Key order LOCKED across responsive widths:
  - upper: 2nd / MODE / DELETE alongside four-arrow pad; LOG / PRB / DATA below.
  - main: LN n/d ×10^x TABLE CLEAR / π SIN COS TAN ÷ / ^ x⁻¹ ( ) × / x² 7 8 9 − / a b/c 4 5 6 + / STO► 1 2 3 ◀▶ / ON 0 . (−) ENTER.
- \`src/calculatorPhysical.css\`: blue-grey physical rounded shell, white side rails, pale LCD, compact nested math input and mode labels, responsive per-viewport key heights. The **PRIMARY keypad remains rendered with all main key rows visible and no internal scroll/reordering** on 1440×900 desktop and 375/390/430 widths in Chromium tests. The menu panels may scroll *only if the advanced form content genuinely exceeds available space*. No permanent 8-button tab nav taking up primary calculator height.
- \`src/components/ScientificCalculator.jsx\`: same safe science/math engine and state, with primary physical keypad and contextual **MODE, PRB, DATA, TABLE, STO/MEMORY** menus. \`2nd\` now maps visible upper legends to inverse trig, 10ˣ/eˣ, HYP, K, angle/stats, mixed/decimal, etc. All advanced tools remain reachable by TOOLS button/menu panel. Existing MathTemplateEditor, previous answer, memory, statistics, list editor, K, history, variable panels and random seed remain; menus overlay keypad rather than permanently expand it.
- The circular directional control is linked to nested MathTemplateEditor focus/field navigation (or Classic text cursor).
- Calculator remains floating and non-modal in Practice, Assessment and Lesson Quiz; no change to question/answer state, navigation, timer or quiz scoring. On mobile the question area is independently scrollable during calculator use; only menus and long math expressions can scroll inside the calculator.
- \`scripts/test-calculator-physical-layout.mjs\` and strengthened real Chromium \`scripts/test-calculator-browser.mjs\` assert the photo-based key order, 35+6 keys, directional pad, key visibility/no internal keypad scroll, menu behavior, desktop drag, calculator operations, answers/navigation with tool open and viewport bounds. CI includes all previous science/TI-reference cases plus disposable PostgreSQL tests.

**Known limitations / non-regression:** A visually familiar layout is NOT an official TI-30XS MultiView replica or a guarantee of all firmware functions. Protected code and state remain unchanged. Desktop and viewport-simulated browser QA do not replace real iOS/Android hardware testing. UI reference must remain original Technica brand design (no TI logos and no licensed firmware/image code). If height is extremely constrained, the fallback may expose a menu scrollbar while the main keypad still fits supported test sizes.

### 2026-10-31 — v1.1.4 physical keypad layout
- Implemented user-approved physical reference and compact scrolling-free primary calculator. Requires review-head unit/Chromium CI success before merge into main. Rollback: revert isolated \`CalculatorPhysicalKeypad\` + \`calculatorPhysical.css\` and parent UI integration, without touching math engine or SQL.


## 33. Physical calculator screenshot review: contrast, edging & modest resize — 2026-10-31

**Owner-provided current screenshot:** 353 × 590 physical-layout calculator with blue shell, white/silver rails, lime second key, LCD and 5×7 main keypad. Owner requested **more polished borders, colors, color contrast and a slightly larger calculator**, while preserving key placement and keeping the basic keypad wholly visible without scrolling. This is a CSS-only visual-refinement scope; no algorithm/React layout restructuring approved or required.

Implementation on isolated [PR #14](https://github.com/Minamilad162/Technica-LMS/pull/14):
- Scoped overrides in \`src/calculatorPhysical.css\`: desktop shell increases **354 → 384 px** (~8.5%); rounded and beveled bottom casing, gradient silver rails and deeper colored shell, improved outline/shadow of the LCD, rounder 3D key surfaces with stronger light/dark differentiation, higher contrast pale keycaps, dark operations and lime 2nd key; function/alternate legends enlarged within available key height.
- Preserve hard-won **5-column × 7-row physical keypad ordering**, 6 upper keys, circular arrow pad, all key handlers and every menu/button; do not reintroduce permanent multirow tabs or any scrolling on the main keypad.
- Mobile: width uses almost entire viewport, with responsive 375/390/430px fit and slight 1–2px step-height increase when space allows. On low-height phones retain compact responsive bound, keep exam text and answer interactions available; advanced data menus and very long math expressions may still scroll as necessary.
- **Contrast implementation:** dark navy operation keys with white text; white number keys with dark ink; blue function keys with bright text and high-visibility green 2nd legends; muted green LCD with charcoal text. Differentiation is intentional; there is no use of original TI branding or firmware.
- Enhanced real Chromium screenshot/geometry tests in \`scripts/test-calculator-browser.mjs\`: 1440×900 desktop and mobile widths 375/390/430; verify rounded casing, distinct color categories, small secondary legend readability, desktop ≥380px width, handset width fit, all 35+6 keys, keypad never scrolls, last row unclipped, mode/2nd controls and quiz answer/next behavior. Screenshot PNGs are captured per viewport and archived by \`.github/workflows/calculator-browser-audit.yml\` (14 days).
- Preserve existing P1 disposable Postgres, all calculator/TI guide reference math, ASP bank, learning/quiz, Vite build and CI security gates.

**Release constraint:** only merge to main after most recent HEAD GitHub Actions + real Chromium both PASS. CI screenshots are evidence for visual review, not a guarantee of pixel-identical TI device or physical phone/Safari appearance. No Cloudflare deployment or database changes in this visual stage.

### 2026-10-31 — v1.1.5 visual polish
- Per user screenshot: refine edges and contrast, modestly enlarge physical calculator, retain full-size/key order and non-scrolling main keypad.


## 34. Calculator LCD cleanup and continuous 3D blue casing — 2026-10-31

**Approved user request:** remove the visually intrusive white vertical side rails; form the calculator casing as one smoothly beveled 3D blue molded body. Move the persistent a/b, a b/c, square-root, nth-root, x-power, exponential and remove-slot chips OUT of the LCD and into the contextual TOOLS panel. Preserve every working MathPrint-style input function, scientific calculation, physical key location, keyboard route, quiz answer navigation and no-scroll base keypad.

**Implementation on isolated PR #15:**
- src/calculatorPhysical.css uses a continuous dark-to-mid blue cross-body gradient with tonal raised side bevels and inner light/shadow edges, rather than bright white/silver side strips. Retains the 384px desktop shell and responsive 375/390/430px layout. This affects the calculator casing only, not white numeric keys.
- src/components/MathTemplateEditor.jsx renders the **editable structured math expression only** (no fixed template-button toolbar inside the LCD). Screen continues to show status/mode, selected input, previous calculation and result. The MathTemplateEditor ref API / keyboard shortcuts / four-level nested fields are unchanged.
- src/components/ScientificCalculator.jsx places all seven math-template actions (fraction, mixed fraction, square/nth root, exponent, eˣ, 10ˣ) and **Remove slot** inside TOOLS → Math templates, above existing advanced scientific functions. Buttons call the EXISTING template insertion/deletion APIs and close TOOLS back to keypad; focus selection survives the menu transition. Classic input still inserts linear expressions.
- Long advanced function lists may scroll ONLY while TOOLS is open, but the normal 35-key / 6-utility-key physical keypad remains fully visible and non-scrolling, with question/answer controls independent.

**Regression / release gates:**
- Real desktop and mobile Chromium 375/390/430 tests: LCD contains no persistent Math tool buttons; TOOLS exposes all seven insertion actions plus removal; nested fraction and root insertion through menu computes correctly; verify last keypad row and arrow pad visible, blue shell RGB border, no white rail gradient, screenshot evidence, answer selection/navigation with calculator open.
- Existing scientific calculations, Math-template parsing, TI reference vectors, P1 SQL smoke and bank/learning/assessment regressions must pass. No Supabase migration or live Cloudflare deployment.
- Preserve independent Technica branding; not a licensed TI firmware clone. Changes approved by owner and documented here before main merge.

### 2026-10-31 — v1.1.6 math TOOLS and 3D body
- Refined outer casing and moved display chips to contextual TOOLS while retaining full Math input functionality. PR #15 stays on review branch until browser + source CI pass.

## 35. Web-only assessment, lesson and video content protection pilot — 2026-10-31

**User-approved scope:** without native apps or database readiness, implement low-friction watermarks and copy/drag/print deterrence on questions, exam/practice, reviews, lesson quizzes and lesson/video content. Add an **experimental** short black curtain when JavaScript receives a PrintScreen/capture key event; do not pretend to control OS screenshots or screen recording. Keep the user experience smooth and preserve calculator typing, answer interactions, timers, progress and normal site features.

**Implementation:** `src/components/ProtectedContent.jsx`, `src/lib/contentProtection.js`, `src/contentProtection.css`; wrappers around `QuizPage.jsx`, `LearningPage.jsx`, `ResultsPage.jsx` and `PracticeResultsPage.jsx`; import CSS from main. Watermarks use an opaque ephemeral browser session identifier plus demo learner ID and UTC minute, nine tiles at ≤10% opacity; invisible to hit testing. Only protected-area selection/copy/context menu/drag are suppressed. `PrintScreen` or select OS capture shortcuts are *unreliable* browser events; an event triggers a ~1.25s black privacy curtain, which is **not proof of screenshot blocking**. Print CSS hides protected route in print preview. Unprotected app pages and calculator input remain available.

**Threat model and verified limitations:** A normal website cannot guarantee black screenshots or prevent OS recordings. No interception of outside processes, extensions, DevTools, own device cameras or screen share is possible. `display-capture=()` limits only a site's own Screen Capture API and is NOT a general OS screenshot ban; avoid breaking future live sessions. Real production data is NOT protected: the React demo bundles 1,625 ASP questions with solutions; YouTube demo video and sample PDF are public. Must migrate to server Auth/RLS, secure question delivery/answer key separation and DRM/signed media when backend is ready.

**Acceptance:** `npm run test:content-protection` + dedicated desktop/mobile Chromium protection test, all legacy math/quiz/learning/security/DB regressions, build. Publish the exact tested-versus-impossible matrix at [WEB_CONTENT_PROTECTION_PILOT_20261031.md](docs/current/WEB_CONTENT_PROTECTION_PILOT_20261031.md). No merging until tests pass; no Supabase migration or production Cloudflare deploy in this stage.

### 2026-10-31 — v1.1.7 web-only deterrence
- Added per-learner watermark, protected copy/drag/context menu, browser print mask, and simulated screenshot-key black curtain to key learner routes; unchanged exam logic and main site UX.
- **Never assert this blocks actual OS screenshots/recording.**


## 36. Actual-use audit: clipboard, print and external video limitations (2026-10-31)

**Reported issue:** Watermark visible, but users could still copy content, print or screenshot/record the page. Previous Chromium smoke tests dispatched synthetic events on the question heading and artificially triggered PrintScreen. Those results never proved real clipboard shortcuts, OS screenshot blocking or protection of an external YouTube iframe. Report reproduced as a scope/test-quality gap.

**Fix in PR #17:** Native capture-phase `document` copy/cut listeners inspect the actual `window.getSelection()` ranges and the protected container, so Ctrl+C from body/document is blocked when selected text intersects a protected question; preserve normal clipboard on unprotected pages and calculator inputs. Existing selectstart/contextmenu/drag protections remain scoped. Add unit cases for selection-target differences and real Playwright `Control+C` with read/write clipboard permission to ensure the clipboard stays unchanged for question text but works outside it.

**Print:** `@media print` now sets `#root{display:none}` whenever protected React content is mounted, and shows a clear protected-content notice using text that remains readable even when browser Print backgrounds are disabled. Use `beforeprint`/`afterprint` lifecycle markers to support print dialogs and cleanup. Browser menu print/Save as PDF and manual real-device validation remain separate and can bypass CSS if print styles are disabled; no website can stop screenshots with this CSS.

**External learning video:** Add explicit learner/session stamp overlay inside the video player container with `pointer-events:none` so YouTube playback controls continue working. This is an on-page visible watermark, **not DRM**. The third-party embedded YouTube iframe is cross-origin; its menu, full-screen mode, external URL and recording cannot be blocked from the Technica page. Fullscreen may exclude the outer watermark. Server-delivered first-party videos / licensed DRM and paid course entitlement enforcement remain needed.

**Capture/recording ceiling:** PrintScreen and system screenshot UI may never send a JavaScript event to the webpage. The existing black curtain is only best-effort if the page receives the specific shortcut. Do not claim screen recording or screenshot prevention. Do not add focus-loss blackout by default: it can obscure legitimate navigation, accessibility and calculator usage without guaranteeing capture prevention.

**Release:** All core calculator/quiz/ASP tests, P1 Postgres smoke, static tests, a fresh Chromium clipboard/video/print test on desktop and simulated mobile must PASS. Do not merge or deploy an untested regression. No Supabase tables, live SSO or Cloudflare deployment modified.


## 37. Optional web-only lost-focus exam privacy curtain EXPERIMENT (2026-10-31)

**User need:** The previous screenshot-black prototype did not visibly trigger from actual device screenshots. Printing and clipboard are working and must not be changed. Test the most reasonable browser-only alternative without requiring native apps, while respecting ordinary learner UX.

**Verified browser limits:** A normal website cannot detect OS native screenshot/recording, force captured pixels black, or detect external recorders. `navigator.mediaDevices.getDisplayMedia()` only exposes a user-authorized capture initiated by this site, not third-party screen recorders. Window `blur` and `visibilitychange` mean loss of focus/tab visibility, NOT screenshot detection, and do not fire for many capture methods. An always-on black overlay would make content unreadable by learners, so is unacceptable.

**Experimental implementation** ([review PR #18](https://github.com/Minamilad162/Technica-LMS/pull/18)):
- Keep the existing Print CSS and real clipboard copy blocking unchanged.
- Pre-mount a hidden, full-screen dark overlay and toggle `HTMLElement.hidden` immediately in the event handler rather than waiting for React's asynchronous rerender.
- Listen to both `keydown` AND `keyup` for best-effort PrintScreen/macOS/Windows capture shortcut heuristics, retaining the existing 1250ms release timer.
- In **active exam and lesson-quiz screens only**, immediately show the overlay when the page receives `window.blur` or `visibilitychange` to hidden; remove it on focus, pageshow or foreground pointer/touch return. This might obscure some snipping interfaces that steal focus before capture, **not guaranteed** and not a substitute for genuine OS control.
- Exclude lesson-video and reading content from focus-loss shield because clicking external YouTube iframe often transfers focus legitimately; ordinary video playback must not turn black. Watermark and scoped existing controls remain.
- Real Chromium QA simulates focus loss and takes a browser screenshot **WHILE the curtain is already active**, asserting black pixels; also checks video focus does not hide, restores exam controls, and existing clipboard/print/quiz/learning tests.
- **Not allowed claim:** test demonstrates conditional overlay rendering, NOT that native `PrintScreen` or OS recording triggers the overlay or that native screenshots are black. Native cross-device field testing remains required; expected on many phones: screenshot still succeeds normally.

**Release:** no Supabase, paid media, Auth or Cloudflare deployment changed. If this focus-loss experiment proves annoying on actual user devices, turn off/revert its exam-only behavior; preserve vetted clipboard, print and watermarks. Avoid excessive polling, animation, camera permission requests, false screenshot-detection claims, or focus-loss warnings that affect normal learning.

### 2026-10-31 — v1.1.9 experimental capture-focus shield
- Improved shortcut reaction timing and narrow-scope focus-loss privacy rendering. Confirm limits against MDN Window/Page Visibility and Screen Capture documentation. Do not assert OS screenshot prevention.


## 38. Mobile screenshot limitation + calculator keyboard false-blackout correction — 2026-10-31

**User acceptance feedback:** desktop focus/screenshot black-shield works when their screenshot tool steals focus. Mobile OS screenshots still save normal content, and opening/dismissing the phone keyboard or minimizing the floating calculator intermittently triggers an intrusive "PROTECTED LEARNING CONTENT" black screen.

**Root cause:** v1.1.9 treated all \`window.blur\` events in an active question as capture-related. Mobile soft keyboards and native focus transitions can raise blur while the tab remains visible. \`blur\` is not a screenshot signal; the Web platform has no standard callback/pre-capture hook for Android/iPhone hardware screenshots. Browser-only code **cannot guarantee a black image on phone OS screenshots**, with or without a watermark.

**Approved fix:** preserve proven desktop keyboard/focus blackout; on mobile/touch devices **never black out solely on \`window.blur\`**. Limit focus-shield on mobile to a genuinely hidden tab (\`document.visibilityState==='hidden'\`), and always clear on visible/return. Listen to VisualViewport resize to recover from stale mobile shield during software-keyboard transitions. Leave keyboard shortcut heuristics, watermarks, clipboard/print, quiz grading, timer, calculator code and video player unchanged.

**Implementation:** \`isMobileWebContext\`, \`shouldBlackoutForBlur\` and \`shouldBlackoutForVisibility\` pure helpers in \`src/lib/contentProtection.js\`. \`ProtectedContent.jsx\` applies platform-specific distinction while retaining all event cleanup and the body portal shield.

**Regression:** extend \`scripts/test-content-protection.mjs\` for desktop/coarse-pointer/mobile/viewport cases; extend real Chromium QA to desktop 1366 and simulated touch phone widths 375/390/430, including focus on the calculator Math field, keyboard opening/dismissal \`blur\`, VisualViewport resize, minimize/restore, background visibility, desktop focus-loss black screenshot and no JavaScript crashes. Do NOT describe a simulated mobile test as proof of actual phone OS screenshots.

**Risk/tradeoff:** A mobile snipping UI that only blurs the browser (without hiding the tab) will no longer trigger black. This is intentional to avoid blocking legitimate typing. The user's desired all-device black screenshots cannot be achieved in an ordinary public website; first-party backend controls and visible watermarks remain the nonintrusive deterrent.


## 39. Pocket Prep-inspired quick-select Practice Center (original Technica UI) — 2026-10-31

**User request and prior photo reference:** Preserve course-first and fully customizable Practice setup, but display high-visibility quick practice mode buttons based on previously shared quiz mode screenshots. The existing reference concepts are Quick 10, Timed Quiz, Level Up, Practice by Domain, Weakest Subject, Missed Questions, Build Your Own and separate Mock Exam. Use original Technica premium LIGHT design; never copy competitor artwork/visual assets/trade dress. Admin's fixed Assessment and exclusive 200-question/300-minute mock policies are **separate** from learner Practice.

**Implemented in demo:**
- In \`src/pages/PracticePage.jsx\` after selecting a course and before lengthy domain/custom configuration: responsive 2-column desktop/mobile mode-card grid; icon, name, grounded count/time, short help, clear disabled/planned state and keyboard focus. CSS is \`src/practiceModes.css\`.
- **Quick 10** launches 10 random eligible course questions, untimed, feedback per answer. **Timed Quiz** launches 25 random questions with 20-minute **total** timer, feedback only at completion; presets do not overwrite saved custom settings. **Practice by Domain** expands inline domain picker, then starts up to 25 questions from selected domain. **Build Your Own** scrolls to the original detailed settings without replacing or changing them.
- **Missed Questions** unlocks only after the latest completed attempt for the chosen course has incorrect answers, then practices the recorded wrong bank IDs (max 25) with no silent fallback. **Weakest Subject** unlocks only when a real scored previous attempt includes at least one incorrect answer, computes lowest accuracy among domains **of that latest completed attempt only**, and launches 15 practice questions in that domain. Does NOT fabricate server-based diagnosis or use unrelated mock/other-course history.
- **Level Up** visibly marked *Coming later* because the current 1,625 ASP demo question records have **no vetted LOW/MEDIUM/HIGH difficulty tags**; cannot honestly implement the approved hidden 70% promotion. **Mock Exam** visibly marked *Coming later*: 200 admin-reserved questions and 5h/300min separate locked form are not provisioned; it MUST NOT launch a generic 50-question Practice or admin Assessment under mock label.
- Shared \`src/lib/practiceModes.js\` centralizes presets and history-domain selection, making tests deterministic. \`src/lib/store.jsx\` persists \`practiceMode\`/\`practiceModeLabel\` per session/result without changing fixed assessment policy, question selection, calculator, watermark, learning progress or existing question bank.
- **Known demo limitations:** original custom count cap 1–50, no server-side secure question distribution, no approved difficulty data or reserved mock questions, lastResult-only mistakes rather than full per-user practice-history aggregation. Broader customization, dynamic level-up algorithm, comprehensive per-user review history and backend-based anti-leak require separate future development. Never mislabel these as complete.

**Regression gates:** \`npm run test:practice-modes\` checks eight mode policies (including disabled level-up and mock), real bank selections/unique IDs, course-scoped wrong/weakest calculation; \`Practice Modes Browser QA\` checks desktop + mobile Quick10/Timed/domain/custom/mistakes/weakest flows and exact labels/count/timing; all previous math/ASP bank/learning/RLS/tests + Vite build pass. Must update canonical blueprint and changelog together. No Supabase/Cloudflare deploy in this task.

### 2026-10-31 — v1.1.11 quick practice modes
- Restored user-referenced fast mode selection on Practice page, with honest gates for modes not yet supported by actual metadata.


## 40. Course → Domain → Topic → Lesson Authoring Phase (2026-10-31)

**Approved invariant:** A course has one or more independently ordered domains; each domain contains zero or more topics while drafting, and each topic contains zero or more lessons while drafting. Learners eventually navigate Course → Domain → Topic → Lesson. Admin must not attach lessons directly to a course or domain. Stable IDs and cross-course isolation are mandatory.

**Current stage implementation (DEMO ONLY):** `src/components/CourseHierarchyEditor.jsx` is the primary **Course Builder → Content** authoring surface. It supports adding/renaming/reordering/deleting domains and topics, and adding/editing/reordering/deleting lessons under a topic, with title, type, description and a previously uploaded course-media reference. `src/lib/courseHierarchy.js` validates hierarchy structure and uniqueness, and `store.jsx` persists per-course `courseHierarchies` to existing local browser demo state. No production server writes or dynamic learner player mapping are claimed. Text/Image/Quiz lesson options here are classification metadata; the complete rich editor and end-of-lesson quiz authoring are NOT yet connected.

**Legacy non-destructive rule:** Older browser-local `modules` and `courseModules` are retained unchanged. On first opening a course without a saved new hierarchy, old modules appear as **topics inside a clearly labelled 'Unmapped legacy content' domain**, with original lesson IDs/media refs preserved. DO NOT silently equate legacy PSM headings to official ASP question-bank domain IDs. The original Module → Lesson editor remains in a collapsed `Legacy modules (compatibility)` section for reference and rollback; changes after the new tree has been saved are NOT automatically synchronized. A separately reviewed mapping/migration is required before using this tree as published/learner progress or question classification.

**Database alignment:** Existing `supabase/migrations/202610300001_p1_foundation.sql` already defines `lms_courses`, `lms_domains`, `lms_topics`, `lms_lessons` with proper foreign keys, RLS and explicit grants. A separate optional P2 SQL handoff package adds server-only lesson progress, event log, and structure revision snapshots for **staging after P1**, plus preflight/verification/rollback scripts. Neither P1 nor P2 is deployed to the user database during this stage. Do not run the historical incompatible `001_lms_schema_PROPOSED.sql` on top of P1.

**Regression:** `npm run test:hierarchy` plus `test:authoring`, imported ASP bank, assessment, practice, learning, calculator, content protection and build. No Cloudflare deployment. Any merge follows CI and review.

### 2026-10-31 — v1.1.12 nested learning hierarchy (staged branch)
- Primary nested authoring is implemented in browser-local demo; production integration, migration and learner routing remain open.


## 41. P3 dedicated Supabase real auth + safe course hierarchy (2026-10-31)

**User-reported migration:** P1 + P2 SQL have been run successfully in a Supabase SQL Editor. No tool in this session independently verified the target project or its actual data/RLS. **No live Supabase credentials or production deployment were configured by the assistant.**

**Secure delivery constraint:** The legacy React demo statically imports a 1,625-question ASP JSON including answer keys. It is unacceptable to merely turn on real authentication while continuing to publish this bundle. `vite.config.js` now selects `src/production/main.jsx` as its distinct app entry when `VITE_DATA_MODE=supabase`; no demo quiz, calculator, answer-bank or local auth module is referenced by that entry. `scripts/test-p3-live-bundle.mjs` scans a compiled production-mode bundle for actual demo prompts/password markers. CI must build both demo and live modes independently; publishing an untested bundle is forbidden.

**P3 implemented:** Supabase email/password Auth, email-signup verification, password-reset flow, profile status and server-issued admin role lookup; RLS-governed public/published catalog and entitled course structure queries; admin-only UI for creating draft Course/Domain/Topic/Lesson, editing titles, publishing course or lesson, and writing plain reading-text lesson blocks via existing P1 foreign keys and policies. All learner/admin privilege decisions ultimately rely on P1 Supabase RLS, not React role checks. No client grants or writes to P2 verified progress, events or snapshots. Trial and paid entitlements are read only; never inserted from browser. See `docs/current/P3_SUPABASE_LIVE_CONNECT_RUNBOOK.md` and `supabase/P3_BOOTSTRAP_FIRST_ADMIN.sql`.

**Mandatory limitations:** This live app is a deliberately limited **catalog/learning-authoring preview**, not a full production LMS. ASP bank, sample course learning player, Quiz Modes, Assessment, level-up, 200-question/300min Mock, payment, media uploading and grade calculation stay in the **demo-only build** until protected backend systems exist. Existing demo code, sample ASP mappings, current calculator, screenshot deterrence and UI remain unchanged. No automatic migration from browser localStorage or auto-classification of old 5 Excel worksheets as official 9 ASP domains. Old `lms_p1` policies remain the sole SQL authority.

**Onboarding:** User must configure the correct separate LMS Supabase project URL and **public** anon key as build variables (never `service_role`), enable Supabase Auth, sign up and verify an actual email, then have trusted DB owner apply the one-off `P3_BOOTSTRAP_FIRST_ADMIN.sql` to that verified account before admin authoring. No bootstrap admin passwords, hard-coded administrator email or plaintext secrets are stored.

**Tests:** `npm run test:p3` for repository/model/security contract; `VITE_DATA_MODE=supabase ... npm run build` + `npm run test:p3:bundle` for no demo bank or demo passwords in compiled output; prior full demo suites, P1+P2 disposable Postgres RLS and browser regression must remain green. Staging device + real Supabase REST/JWT authorization tests, authenticated user journeys and mobile UX still required before real deployment. Do not misreport CI sandbox as a connected production database test.

### 2026-10-31 — P3 secure split-entry Supabase onboarding (staged)
- Real Supabase Auth/catalog/authoring source created behind explicit VITE_DATA_MODE=supabase; demo remains default and isolated. No actual Supabase credentials or Cloudflare live deployment applied.


## 42. P4 protected question bank + transactional practice engine (2026-10-31)

**Implementation:** Staged SQL migration `supabase/migrations/202610310003_p4_secure_practice.sql` after P1/P2 creates `lms_questions`, `lms_practice_attempts`, `lms_practice_attempt_items`, all RLS-enabled with explicit service-role-only direct table GRANTs. PostgreSQL SECURITY DEFINER RPCs authenticate with `auth.uid()`, check active account, published course and paid/manual entitlement or genuine admin role, and select questions only from `approval_state='approved' AND mock_exclusive=false`. User-scoped idempotent start, immutable frozen grading snapshots, lock-protected answer updates, server deadline, idempotent finish and exact score calculation keep the answer key out of unsubmitted attempt payloads. The browser cannot directly SELECT question answer data or mutate attempts. Admin authoring/import uses a backend-only secret in one-off tooling; never in public Vite variables.

**Live UI:** `src/production/LivePractice.jsx` offers Quick 10 (10 Q, immediate correct-answer feedback only AFTER saved answer; that option is then immutable), Timed Quiz (25 Q/20 minutes server deadline, results at finish), Custom (1–50 Q/0–180-minute total timer) and Practice by Domain (mapped domain required), with response persistence, resume by opaque attempt ID and score review. The existing full browser-local demo Practice and Admin Assessment are unchanged. Quick10 server feedback differs from formal Assessment but follows the accepted immediate-feedback teaching flow. No secret client scoring.

**Question source:** `scripts/import-asp-p4.mjs` is dry-run by default. It validates the exact 1,625 legacy ASP workbook rows, does NOT overwrite existing records, and when explicitly run with backend-only service credentials imports **draft/unclassified/unmapped** questions only. It does NOT approve content, classify ASP 9 domains or reserve the 200 Mock questions. P4 cannot offer ASP full practice until the owner/SME approves eligible questions. The approved Mock Exclusive 200/300 and Level Up at cumulative 70% remain NOT IMPLEMENTED. Admin fixed Assessment/PreAssessment and exam-policy attempts remain separate from P4; never claim otherwise.

**Release and migration:** User said P1/P2 ran successfully, but ChatGPT has not connected directly to that Supabase project and did not execute P4 or deploy Edge Functions/Cloudflare. P4 secured Postgres RPCs are a transactional trusted backend layer, so P4 does not require a separate Edge Function; future high-stakes assessment may require such a function for distribution and grading. Check `docs/current/P4_SECURE_PRACTICE_RUNBOOK.md` for backup, staging SQL, real-JWT negative tests and controlled rollbacks. Existing demo bank source is public; only the dedicated live build prevents shipping it in the paid frontend. CI runs P1/P2/P4 disposable PostgreSQL and P4 contract/ASPBANK validation; does not prove real Supabase security.

### 2026-10-31 — P4 secure Practice Center staged
- Backend selection, scoring, eligibility and mock-pool exclusions enforced in PostgreSQL. No new P4 tables applied to a live Supabase target automatically, and no existing demo modes or imported ASP keys changed.


## 43. P5 protected fullscreen question sessions — 2026-11-03

**Owner request:** Open question Practice / Assessment in true fullscreen; if user exits fullscreen, leave questions completely and return to the previous page. Strengthen anti-copy/print tracking and watermark in Supabase Live. Preserve existing layouts/calculator and all approved ASP/P4 rules.

**Implemented in source (not deployed):** All Demo Practice modes and admin-configured Assessment now request native fullscreen from the real Start-button gesture before starting any question session. Browser API denial or unsupported iPhone WebKit fails closed and reports a compatibility message. Question routes check the native fullscreen element and use fullscreenchange, visibilitychange, explicit Exit and hash-route listeners to discard an unfinished Demo session, then navigate back to the corresponding setup. Legitimate submission/timer expiry releases fullscreen intentionally, preserving historical result navigation and no regression to score/time/ASP 200/300 or calculator logic. Repeated Start is guarded against duplicate requests. This is a UI policy and cannot prevent screenshots or recordings by Windows, other software or another camera.

**Live P4:** New independent LiveProtectedContent (no demo login import) adds authenticated-user-ID + session + UTC-minute repeated overlay and scoped copy/print deterrence; fullscreen uses the live-practice DOM element so learners see only the question workspace. Its exit guard closes questions locally, navigates back to the course's practice setup and invokes authenticated PostgreSQL RPC lms_p5_abandon_practice. Reloading a live question page does NOT restore questions outside fullscreen; it retries abandonment. Additive migration 202611030001_p5_fullscreen_attempt_exit.sql creates a state='abandoned' and redacts abandoned question snapshots from P4 payload and finish RPCs, checks real auth.uid ownership and preserves RLS. Never claim server-side proof of actual fullscreen/recording: browser events are client controlled and failed network calls can delay the database update.

**Acceptance:** Real native Chrome desktop start/exit Esc, explicit Exit, tab hidden, route and refresh, demo results and calculator; isolated production bundle without ASP answer-bank or demo credentials; P5 disposable Postgres no cross-user abandon or result leak; real JWT/Supabase device QA still pending. iPhone full interactive element fullscreen unsupported—require a supported browser/device until native/PWA solution is approved. No new Mock/Level Up, video DRM or OS screenshot prevention. See docs/current/P5_FULLSCREEN_QUESTION_SECURITY_RUNBOOK.md and supabase/P5_VERIFY_READ_ONLY.sql. **Source CI is not production deploy.**

### Change history — 2026-11-03 (P5)
- Added native fullscreen entry and auto-exit, live watermark parity and restricted server abandonment. P1/P2/P4 unaffected; P5 migration deliberately manual.

**P5 scope extension — Lesson self-check:** The final 10-question Lesson Quiz in the Demo Learning Player now also requests native fullscreen on user selection/Next, closes and reverts to the last lesson on fullscreen loss, preserves completed lesson progress, and requests fresh fullscreen for retakes. P5 browser QA exercises this path. This does not introduce secure production grading for demo lesson quizzes.


## 44. P4/P5 non-destructive staging verification kit — 2026-11-03

**Owner-directed gate:** Inspect whether P4/P5 SQL was applied to the *dedicated Technica LMS* Supabase project, with absolutely no changes to production. This is a source-code and deployment-evidence audit, **not** approval to run migrations.

**Evidence at time of writing:** P1/P2 reported applied by owner; actual project ref and JWT/API results were never independently confirmed. P4/P5 migrations and their GitHub Actions disposable-PostgreSQL tests exist in repository source; no independent evidence that P4/P5 migrations are installed in real Supabase. Actual Supabase status remains **UNKNOWN / NOT VERIFIED**. Do not label these migrations deployed from CI or repository contents alone.

**Additive verification tooling:** `supabase/P4_P5_VERIFY_ALL_READ_ONLY.sql` runs as a single SELECT and reports P1/P2 prerequisites, P4 private-table RLS and browser GRANT boundaries, protected RPC metadata, trigger and index footprints, P5 abandoned-state constraint, and the P5 payload-redaction source marker. It returns `PASS`, `FAIL`, `MISSING`, or `REVIEW` with no questions, answer keys, private user rows or secrets. It is designed to return `MISSING` safely if P4/P5 are absent. `docs/current/P4_P5_STAGING_VERIFICATION_GATE.md` records environment confirmation, safe execution, staged migration decision tree, full JWT/device QA and NO-GO rules. The disposable Postgres P5 smoke now exercises this **read-only** audit after P1–P5 SQL fixtures; that does not query live Supabase.

**No regression / scope:** Existing P4/P5 SQL migration files, fixed ASP bank/question keys, approval requirements, 200 Mock exclusives / 300 minutes, 70% adaptive logic, legacy demo/UI, P5 fullscreen behavior, calculator, frontend bundles, Supabase environments and Cloudflare deployment are **unchanged**. No production or staging database was modified by this commit.

**Release gate:** A catalog PASS is not sufficient: real Supabase Auth JWT cases, direct Data API denials, abandoned-attempt redaction, offline/refresh behavior and supported physical browsers must pass in authorized STAGING. Actual iPhone WebKit fullscreen limitations, operating-system recording and camera capture remain unresolved. No paid production release based on this step alone. Rollback: revert this additive query/documentation/test patch; no database rollback needed.


## 45. P6A ASP source review workbench — 2026-11-03

**Next approved implementation after P4/P5 source/staging migration preparations:** Structured ASP source review, not premature publication. Owner reported prior migrations completed, but live Supabase project/ref and JWT API security are not independently verified from this session. Maintain honest `P4/P5 owner-reported` versus `production verified` distinction.

**Repository additions:** `supabase/migrations/202611030002_p6a_asp_review_workbench.sql` adds private `lms_p6_question_reviews` (RLS, zero browser direct grants) and four admin-only RPCs: explicit creation of the 9 original ASP11 domain labels, bank-readiness summary, paginated privileged review queue, and recorded reviewer classification. The queue returns raw answer indices only to active verified admins and never grants question table access. Reviewer actions verify official-domain ownership, Low/Medium/High stage, original answer and commercial-rights checkboxes. All decisions are separately logged without altering original prompt/answers, setting `lms_questions.approval_state`, or auto-mapping legacy groups. Regular learners must fail directly at the database RPC boundary.

**Live admin UI:** `AdminQuestionReview` is conditionally available only for real active admins while ASP is selected in the Supabase production-mode entry. Provides paginated status counts, source prompt/choices/explanation/reference, controlled official-domain setup and verified reviewer decision with notes. Existing demo, paid learner practice, P5 fullscreen, calculator and all other courses are preserved.

**Locked release decision:** Even a review marked `ready` remains a DRAFT, unclassified P4 question in the protected bank. The 200 Mock-exclusive questions must be selected, reserved and held out from all other pools in a separately approved release flow; no bulk approval without that gate. The 1,625-row importer remains **DRY RUN by default**, with no auto-import in this change. Real content-source licensing, unique question mapping across the five historical groups and official 9 domains, and future Mock versioning remain human-review tasks.

**Deployment and testing:** New migration is supplied for **owner-controlled STAGING only**, not executed by ChatGPT and not deployed to Cloudflare. Source CI has `npm run test:p6` and disposable Postgres P6A negative tests after P1/P2/P4/P5; all tests must be observed before merge, and real JWT/device tests remain pending. See `docs/current/P6A_ASP_REVIEW_RUNBOOK.md`. Rollback source safely; never erase captured reviewer decisions with ad-hoc DROP SQL. Production paid launch remains NO-GO.


## 46. P6A admin navigation discoverability correction — 2026-11-03

**Observed issue:** Owner could not find P6A ASP reviewer in the website Menu after code was merged. Source audit established a concrete split: P6A was rendered **below** the Live ASP course practice card and only when an Admin had already selected the ASP course; the separately bundled legacy Demo has its own sidebar `Layout.jsx` and did not have any P6A route. GitHub merge **does not** prove Cloudflare deployed the Supabase Live entry or that P6A SQL was applied to the target database.

**Scoped solution:** Supabase Live has an explicit, persistent authenticated-admin navigation group with `Courses & Builder` and `ASP Question Review`. Choosing review selects the `asp` course and loads its own hierarchy; the reviewer opens as a dedicated workspace rather than an easy-to-miss page footer. No ASP course produces a clear empty state. Non-admin/learner screens never show this admin menu, and SQL RPCs remain the security authority. The legacy Demo admin sidebar/mobile More menu now includes **ASP Review (Live)**, which routes to an **admin-gated explanation page only**, not a fake reviewer, mock approval or production RPC. Demo login and ASP answer bank stay isolated from Supabase Live.

**Regression and deployment boundary:** The existing Demo Question Bank, routes, learning, calculator, mock contracts, P4/P5 fullscreen/practice, ASP IDs, P6A migration/permissions, server grading and release rules remain unchanged. P6A source-menu tests assert the route is admin-only, Live menu is role-gated, and no production reviewer leaks into the Demo bundle. Rebuild and deploy the desired mode explicitly: default builds Demo; `VITE_DATA_MODE=supabase` with **public** Supabase values selects Live. P6A migration and real Auth/JWT/device testing are separate acceptance gates; **no Supabase/Cloudflare action was executed by adding the menu**. Source rollback: revert this UI-only commit.


## 47. Real ASP Review on the currently published Technica site — 2026-11-03

**Clarification from owner:** The build being pushed/deployed is treated as the active ("Live") site and the previous Demo-menu informational placeholder is insufficient: the real P6A admin review screen must be reachable from that site's menu. Do not force-convert the entire existing app and break its mature Demo Practice/Calculator, and do not put the full historic ASP question/answer bank into an authenticated Supabase Live bundle.

**Implementation (source):** The existing/default `npm run build` is now a Vite multi-page build: its `index.html` remains the original working React demo, with unchanged Question Bank, Practice, calculator, mock/pre-assessment contracts, and `asp-review.html` is a **second independent HTML entrypoint** importing only `src/production/main.jsx` and secured P6A API. The Demo admin sidebar/mobile menu label **ASP Question Review** navigates directly to `asp-review.html` (via existing guarded route and same-site redirect) rather than displaying the previous 'available elsewhere' message. On the real review HTML page, Supabase Auth and the actual active database admin role are required; the P6A RPC continues to enforce authorized question access, review status and audit trails. The separate admin page defaults to the actual review tab; it does not import the local DemoProvider, the Demo ASP bank JSON or simulated admin credentials.

**Auth/config contract:** The `getSupabaseClient({secureReviewEntry:true})` override only initializes a public-key Supabase client for the *standalone review entry*, even when the index build has `VITE_DATA_MODE=demo`; it does not grant any new database privileges. Production Cloudflare Pages must supply correct **public** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. Owner-controlled P6A SQL and true Auth/JWT admin are still required and not installed/tested by this patch. Never add the service-role key to the browser. This does **not** claim the original Demo's historic bank is private; full public Demo must be retired when preparing a paid release.

**Full Live build remains isolated:** When `VITE_DATA_MODE=supabase`, Vite emits only the existing Supabase Live `index.html` and must continue to pass `test:p3:bundle` (no demo answers/credentials). Existing Supabase Live Admin Menu already has direct ASP Question Review navigation. New CI verifies the normal deployed-site build includes `dist/asp-review.html` and its JS asset; all legacy and protected RPC tests continue. Github merge is not proof Cloudflare deployed or live Supabase P6A exists. No SQL or deployment mutation in this change.


## 48. ASP review connection bootstrap hardened (2026-11-04)

**Reported symptom:** After the Live menu and independent reviewer entry were deployed, the user still saw `Technica LMS · Supabase configuration required` / `Secure Supabase connection is required` even though the Cloudflare Workers build configuration showed public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables. This precise error message can be generated by `getSupabaseClient` returning null when the URL-dependent `standaloneReviewPage` test does not detect the exact basename `asp-review.html` while `VITE_DATA_MODE=demo`. Therefore the error does **not** establish that the build keys are missing. Cloudflare HTML routing/rewrites were not directly inspected; root cause is a brittle URL gate capable of producing this false negative.

**Fix:** Replace the URL/filename-dependent review-mode inference with `src/production/reviewMain.jsx`, which explicitly renders `<SupabaseApp secureReviewEntry={true}/>` from `asp-review.html`. `SupabaseApp` now initializes the public Supabase client using that explicit prop, and defaults its admin view to the ASP review queue. The original full Supabase `src/production/main.jsx` remains unchanged. Actual data permission still depends on real `auth.uid()`, verified admin role and P6A PostgreSQL RPCs; the prop is **only** a frontend initialization switch, never an authorization credential.

**Safe diagnostics:** If Supabase cannot initialize, display which public build variables are **present/missing** without showing their values. Cloudflare Workers distinguishes Build variables (Settings → Builds) from Worker Runtime variables (Settings → Variables and Secrets); Vite `import.meta.env.VITE_*` must be present **during build**, so saving runtime variables or retrying an old static build alone cannot inject them. CI uses harmless public fixture values and asserts both appear in compiled assets; default build still contains `index.html` + isolated `asp-review.html`, while the full `VITE_DATA_MODE=supabase` build excludes legacy Demo question answers.

**No regression and explicit boundaries:** P1–P6A migrations, question bank, auth/RLS grants, approved Mock reservations, Demo UI, calculator, Practice/assessment and Cloudflare settings are unchanged. No direct Cloudflare deployment or real Supabase query was performed by this patch. Owner must verify new Cloudflare build uses the merged commit and real public build variables, then test a real Supabase Admin JWT (and missing-role denial) before accepting this as operational. Code rollback: revert this isolated review-entry bootstrap change.


## 49. ASP Question Review relocated into its proper course card (2026-11-04)

**Owner's correction:** Do not show P6A as an independent Admin Menu tab or standalone navigational destination. Reviewer is a *sub-workflow of Admin → Question Bank → ASP course card*. The published/deployed site remains the same; do not replace functioning Practice/Calculator with a fake Live page.

**Default/published build:** Removed the distinct `ASP Question Review` entry from the browser-local Admin sidebar/mobile More list. `QuestionBankPage` now renders an **ASP-only Review & classify** control *inside the ASP course tile*. Expanding the ASP tile spans the existing course-selector grid and displays a secure same-origin `asp-review.html` iframe inside that tile. Other courses keep their existing browse cards. The old `#/asp-review` bookmark redirects to `#/question-bank?course=asp&review=1` and opens the card directly; it no longer navigates to a separate tab/page. Existing Demo Question Bank browsing and search/pagination remain unchanged when the reviewer is closed. No question review is performed through the Demo state.

**Security/embedding:** The HTML `asp-review.html` remains an internal *technical entrypoint* (necessary for separate Vite bundle/auth isolation) but is no longer a User Menu destination. `reviewMain.jsx` renders `SupabaseApp secureReviewEntry={true} reviewerOnly={true}`, so iframe content is only the real Admin Review (or genuine Supabase Auth login), not duplicate Course Builder navigation. Non-admin Supabase users receive an explicit denial; all review data is fetched through existing admin-gated P6A server RPCs, not the old public demo question JSON. The frame sends **layout height only** via same-origin `postMessage`; parent validates origin and exact child-window source. The iframe's real credentials must never be derived from the Demo account. CSS is scoped and mobile-friendly. Real auth/JWT, paid rights verification, P6A DB installation and Cloudflare public build vars are still runtime gates.

**Full `VITE_DATA_MODE=supabase` Live build:** Removed the separate internal Live Admin Navigation tab; for an actual active Admin with ASP selected, an inline **Review questions** button in that same course's workspace toggles the existing `AdminQuestionReview` under the ASP card header. Other courses and learner pages remain unchanged, and the protected question attempts are hidden while review is open. Course structure authoring is restored by closing review.

**Explicit non-regression:** No modifications to P1–P6A migrations, P4 server-only answers/grading, protected Live practice/fullscreen, imported ASP question IDs/keys, Demo learner Practice, Calculator, other courses, entitlements, or Auth/RLS policy. CI runs the isolated Live bundle leakage guard and both Demo and database-driven P6A reviews. No Supabase DB write, Cloudflare deployment or production sign-off implied by the GitHub merge. Rollback is source-only; the stored review decisions remain intact.


## 50. P6A live Supabase connection troubleshooting without bypassing security — 2026-11-04

**User report:** ASP review embedded in the existing published course card still did not read the database even after the public Supabase URL/key were saved in Cloudflare build settings. Do not infer a broken key or automatically apply a migration; source repo/CI and the worker live environment are separate. The previous reviewer path loaded `lms_profiles`, `lms_courses`, and unrelated `lms_entitlements` in a single Promise.all, and requested the entire Domain→Topic→Lesson tree before showing a review queue. An unrelated RLS denial could leave the Admin review indefinitely showing "Verifying" or "Preparing" despite valid Supabase Auth.

**Source correction:** In secure `reviewerOnly` mode, load and validate genuine Supabase Auth profile/role first, fetch courses **only for verified active Admin**, and fetch only the selected ASP's domain metadata. Do **not** read entitlement rows or topics/lessons to open the reviewer; these aren't dependencies of human question review. The normal full Live LMS and original Demo logic remain untouched. Correctly render loading failures rather than endless spinners. Underlying P6A RPCs continue to require active Auth Admin and keep draft questions private.

**Read-only, safe UI diagnosis:** Add the expandable **Check database connection** control within the existing ASP review card, available before and after actual Supabase sign-in. Diagnostic stages in order: (1) public VITE build variables present / URL HTTPS, (2) Supabase Data API read-only HEAD request, (3) real Auth `getUser` verification (no Demo credentials), (4) active LMS profile, (5) active Admin role, (6) genuine ASP course slug, and (7) the admin-protected, aggregate-only `lms_p6_bank_summary` read-only RPC. Do not attempt P6A RPC unless real authenticated Admin has been verified. Include generic actionable error codes for missing RPC `PGRST202`, permission `42501`, missing table `PGRST205`, invalid key/JWT and network failure, **without outputting secrets/tokens, emails, user IDs, question text or answer keys**. Compile the non-secret `WORKERS_CI_COMMIT_SHA` from Cloudflare into the browser so users can identify stale deployments. If Worker Build lacks either public VITE variable, fail its build early instead of deploying a nonfunctional review entry; local development and GitHub CI use harmless placeholders.

**SQL footprint fallback:** `supabase/P6A_VERIFY_READ_ONLY.sql` checks P1/P4/P6A table metadata, RLS/browser grants and all P6A RPCs without reading Auth users, emails or question contents and without any write; safe to run in the owner-confirmed separate Technica SQL Editor. Catalog PASS is not a real JWT test or approval to publish questions.

**Operational gates:** Source changes do not verify the values saved in the customer's Cloudflare worker, and do not verify or run the P3 first-admin bootstrap, P6A migration, question import, JWT acceptance or Cloudflare deployment. If Admin is missing, use existing `supabase/P3_BOOTSTRAP_FIRST_ADMIN.sql` *only after an explicitly authorized account/target/project check*. If P6A is MISSING, apply separately only after authorized staging verification/backup. **Never** auto-promote Demo users to live Admin; don't loosen RLS or expose service role credentials. Existing Calculator, Practice, P4/P5 and 200-Mock governance unaffected.


## 51. Mandatory email/password login and four-account pilot — 2026-11-04

**User-approved change:** Remove the default UI's one-click `Login as Admin` / `Login as Learner` entry. All portal users must enter a genuine email and password, and the database (not browser-local state or user-supplied role) determines Admin vs Learner. Provision exactly two Admin and two Learner pilot identities under the dedicated Technica Supabase project.

**Implementation:** Added `src/lib/portalAuth.js` to authenticate via Supabase `signInWithPassword`, re-verify `auth.getUser()`, and fetch `lms_profiles`/active `lms_role_assignments` through existing P1 RLS. The published default React login now requires Email+Password; it no longer imports `loginDemo`, contains sample-password UI or opens privileged routes without a verified session. Startup re-verifies real Auth (never trusted localStorage role); logout signs out from Supabase. Admin route gating, learner progress identity, assessment ownership and watermark consumers read the verified identity. `/signup` redirects to login for the managed pilot. The historic demoAuth utility stays exclusively for historic tests, **not** the published sign-in path.

**Four-account creation:** The supported Supabase flow is Authentication → Users → Add user / Send invitation to provision four real email/password users in a trusted control plane. SQL Editor must NOT directly insert or store credentials in `auth.users`/identities. The **separate owner-run** file `supabase/PILOT_2_ADMIN_2_LEARNER_ASSIGN.sql` validates all four confirmed, distinct Auth identities; only assigns Admin to the two named Admin emails; adds active profiles for the two learner identities with **no elevated role** (P1 role assignment constraint has only `admin` and `content_author`); checks for conflicts/suspended accounts and aborts the full transaction rather than damaging existing access. This SQL is supplied but **NOT executed against any actual DB** by code merge. The actual four emails/passwords are not part of this source or chat.

**No-regression and security distinction:** Existing Demo Practice/Calculator/Assessment screens and source ASP question IDs remain present in the existing default published build (for pilot UI continuity), but their browser-local data is **not** server-protected. Real Supabase Auth gating does **not** make those embedded ASP demo answers confidential. Paid production remains **NO-GO** until the isolated full Supabase bundle and P4/P5 server practice have replaced the historic public-answer bank, plus real JWT negative tests. P6A ASP review continues to use its own protected RLS/RPC, without privilege escalation from Demo accounts. Backend policies, User accounts, Cloudflare deployment, payments and question approval are unchanged by this source-only PR.

**Tests and release:** `npm run test:auth:portal` confirms real Auth/role mapping, rejects anonymous/suspended users, checks no demo sign-in shortcuts or sample passwords in the published build and guards the SQL against raw Auth writes; existing Demo unit tests remain unchanged. Need passing repo CI and real Supabase Cloudflare sign-in checks for **two Admin + two Learner** after authorized account creation. Rollback source code by reverting this patch; no stored user data deleted.


## 52. Staged real Supabase Course Builder integration — P7 source (2026-11-04)

**Authorized scope:** Gradually convert the existing default Technica LMS to the genuine Supabase database, beginning with Admin Courses and Course Builder → Course / Domain / Topic / Lesson. Preserve all accepted UI/Practice/Calculator behavior and never modify Production database records without separate approval.

**Architecture:** The original default Admin Courses and Builder were browser-local Demo. New default components src/production/LiveCoursesPage.jsx and src/production/LiveCourseBuilder.jsx reuse Technica card/hierarchy/editor styling and existing P1 lmsApi.js data access. The scoped liveAuthoringApi.js and useLiveAdminAuthoring.js validate titles and parent linkage, use getSupabaseClient({secureReviewEntry:true}), re-verify auth.getUser(), active P1 Admin profile+role, and defer authorization to existing RLS. Real UUID/slug course selection, P1-backed Course create as Draft, title/summary update, Domain/Topic/draft Lesson add/rename, lesson reading-text add and live reload. No hardcoded ASP source-mapping or artificial conversion from five old bank sheets to nine official ASP11 domains.

**Production data boundary:** All authoring mutations require an explicit human Admin Create / Save action; initial page load is read-only. New courses and lessons are always Draft. No automatic publication, localStorage-to-Supabase import, SQL upgrade, deletion, reordering, privileged grant, entitlement, protected media or question bank write. All required tables already exist in P1, so NO new migration. This PR does NOT touch real Supabase, execute SQL or deploy Cloudflare. Admin operations in Production remain subject to separate owner acceptance.

**Preserved functions:** Old src/pages/CoursesPage.jsx, src/pages/BuilderPage.jsx, PDF/video local-demo tools, legacy authoring, assessment settings and historical question IDs remain available under clearly labeled ?legacyPreview=1 and remain local-only. Vite DEV browser QA retains these under both explicit VITE_LOCAL_QA_DEMO=1 and import.meta.env.DEV; Production never enables the shortcut. The default learner Practice and 1,625 legacy ASP sample answers remain Demo/public browser assets: never claim protected paid content. The separately isolated full VITE_DATA_MODE=supabase bundle remains a distinct release target.

**Verification:** npm run test:authoring:live validates Admin Auth, suspended/learner denial, P1 draft-only insertion and parent UUID linkage, no local fallback. Ephemeral scripts/test-p1-postgres-smoke.sh verifies Admin writes an actual Course→Domain→Topic→Lesson→text block chain and learner/anonymous denial. Existing Builder, Practice, Calculator, Question Bank, ASP tests and secure full Live no-answer-leakage bundle gate remain mandatory. PostgreSQL/CI source tests are NOT a real Supabase staging/Cloudflare JWT test. docs/current/P7_LIVE_COURSE_BUILDER_GATE.md documents staging acceptance, rollback and next learner CMS/progress work.

**Current state:** Public login/Auth is real Supabase (user-confirmed); default Admin Courses/Builder is P1 metadata+text source implementation pending staging verification. Learner Learning Player, results/progress, other Demo content/bank and media remain local or partial. Paid-production verdict remains NO-GO until protected P4/P5 content, entitlement/media, full mock and device tests pass. Rollback is source-only: revert P7 PR without deleting backend/local data.


## 53. P8 live learner catalog + proportional adaptive difficulty (2026-11-04)

**Approved expansion:** Continue gradual Supabase conversion from P7 to real learner `My Learning` and introduce skill-driven difficulty in Practice/test sessions. **Never change any Production Supabase records/migrations without separate owner authorization.** Existing local Demo Practice, scientific calculator, ASP question IDs and protected P4/P5/P6 contracts must not regress.

**Learner read-only implementation:** Default `/my-learning` and new `/learning/course/:courseId` read actual Supabase P1 course catalog, active entitlements, Course→Domain→Topic→Lesson tree and text lesson blocks through RLS. `src/production/liveLearningApi.js` reads current validated P2 `lms_lesson_progress` for verified completions, **never** synthesizes progress or writes P2 events from the client. Learners without enrollment see metadata only; authorized trial/paid lessons remain filtered by P1 policies. Prior demo learning player preserved under explicitly labeled `?legacyPreview=1` and historical route. Missing course/progress/error states do not fall back to public Demo data. No user progress/media write performed in this PR.

**Adaptive rule — proportional to session count:** Stage next-gen server-graded `Level Up` after P4/P5, using a staged **unexecuted** additive migration `supabase/migrations/202611040001_p8_adaptive_levelup.sql`. N=selected **1–50** questions. Minimum tier checkpoint `min(N, max(3, ceil(N*0.20)))`: 10→3, 25→5, 50→10; for shorter sessions fewer stages may be reached. Start Low; after the checkpoint, promote to Medium only when cumulative Low-stage correct/answered ≥70%, then promote Medium→High at cumulative Medium-stage ≥70%; reset tier counters upon promotion, maintain total N; never downshift or label difficulty during the test. If below 70%, remain in tier, and later cumulative recovery can trigger promotion. At 100% accuracy, expected distribution for N=10: 3/3/4, N=25: 5/5/15, N=50: 10/10/30. This policy scales with number of questions and is not an unconditional increase after each answer.

**Server and content safety:** The SQL migration introduces a private RLS-protected adaptive state table and authenticated-only readiness/start/answer RPCs. The authenticated, course-entitled learner receives just one server-selected question at a time. Answer correctness and next difficulty selection are computed from private snapshots after each immutable ordered answer; P4 direct answer path cannot bypass Level Up; P4 finish blocks early finish; P5 fullscreen abandon seals the attempt. No answer key, explanation or hidden tier exposed before final submission. Every tier must hold **at least N already approved, non-mock-exclusive** questions (conservative worst-case pool guarantee); never select Unclassified/Draft/archived/Mock-exclusive, never auto-approve, never silently reassign ASP legacy five groups. The readiness RPC fails closed if P8 is not installed or pools insufficient. Formal Mock Exam is still exclusive 200 / exactly 300 minutes, **not adaptive**; old generic Assessment/demo bank lacks server-graded difficulty, so is not silently converted. A future real assessed-exam variant requires independent server governance.

**UI and compatibility:** The original Practice Center/Calculator/test routes remain untouched except a clearly labeled link into `/practice/live` with existing secure P4/P5 `LivePractice`. Level Up appears as a fifth secure mode with N/domain/timer controls and read-only 3-tier readiness. Historical browser demo practice mode remains "Coming later" until a source bank has human-verified difficulty labels and P8 is installed. Server-selected next question is received via P8 RPC after answering, not chosen by React. The dedicated `VITE_DATA_MODE=supabase` app also imports this same LivePractice and shares policy. No new package dependencies.

**Testing & release:** New `test:adaptive:live` checks 20%-of-N checkpoint for 10/25/50, ≥70% boundaries and recovery, no client grading and real learner catalog contract. New disposable Postgres P8 smoke runs AFTER P4/P5/P6 and verifies one-item release, exact 3/3/4 perfect path, cumulative 25 recovery, 50 checkpoint, RLS denial, no Mock/draft leakage, no duplicate answers, immutable retry, P4 bypass denial, P5 abandoned redaction and server scoring. Existing browser/Calculator/ASP/Practice tests remain mandatory. **SQL/Cloudflare Production and real Supabase JWT/device QA are not executed by this code change.** See `docs/current/P8_LIVE_LEARNING_ADAPTIVE_GATE.md`. Paid launch remains NO-GO until backend user events/protected question bank/media/billing/mock and independent authorization validation.


## 54. P8b migration-follow-up: live readiness audit and visible Level Up route (2026-11-04)

**Owner-reported status:** User stated that they manually ran the staged P8 migration in their Supabase database. The assistant **has not independently queried the actual Technica Supabase project**, confirmed the exact environment/project/ref, inspected its data, or modified its records. Do not change this status to "verified" or "production-ready" based only on the user's report or CI.

**Approved next step (read-only):** Added `supabase/P8_VERIFY_READ_ONLY.sql` for manual use in the confirmed Technica Supabase SQL Editor. It performs ONLY catalog metadata and aggregate count SELECTs: P8 readiness/start/answer and P4/P5 function installation/grants/SECURITY DEFINER, private adaptive RLS/no direct browser grants, then *approved, non-mock-exclusive* Low/Medium/High bank counts by course and domain (plus draft/unclassified/reserved counts). Reports readiness for 10/25/50 and current per-tier safe maximum. Does not read question text, options, correct answer, user email or secret credentials. User must confirm the targeted Supabase project; CI runs the same query against disposable PostgreSQL after P8 install but cannot substitute for real Auth JWT/browser QA. **No production SQL executed by this PR.**

**Adaptive activation UX:** Existing `src/pages/PracticePage.jsx` and `PRACTICE_MODES` keep original Quick10/Timed/Custom/Domain/Weakest/Missed as-is. Replace Level Up's inert "Coming Later" card with an enabled **server-only navigation** to `/practice/live?mode=levelup&course=<selected slug>`; never call Demo `beginPractice` or expose bundled bank. Mock stays planned/locked. `LivePracticePortal` resolves the selected slug to a *real Supabase* course or falls back to an authorized course; entitlements and actual authenticated JWT decide read access. `LivePractice` starts on Level Up via a trusted route parameter, shows quick 10/25/50 counts and per-tier readiness from the protected P8 read-only RPC; only starts if the readiness result matches the **current N and domain** and server validates again. If migration missing, bank unclassified or insufficient, the user sees an actionable blocked state without publishing/auto-classifying records.

**Important bank gate:** P8 intentionally requires at least N approved, non-Mock questions in **each** Low, Medium and High tier for a selected course/domain; total questions or P6A review READY do not satisfy P8. Never grant permission, import answers, modify `approval_state` or infer difficulty from past worksheet names to unlock Level Up. Maintain original policy checkpoint=min(N,max(3,ceil(.2*N))), 70% cumulative within tier, N=10/25/50. No adaptive change to exclusive 200-question/5h official Mock, and no automatic changes to generic Demo assessment. Further real data acceptance must be via the user-run READ-ONLY audit + signed real Admin/Learner test on owner-approved staging.

**Acceptance and rollback:** Source contracts and Chromium QA must cover the enabled Level Up card and server-only navigation; ephemeral P8 PostgreSQL smoke additionally exercises the read-only SQL Editor audit for functions/RLS/course pool. Existing Practice/Calculator/browser regression, Auth/P4/P5/P6 and isolated full Supabase build tests required. GitHub source merge does not imply actual Cloudflare deployment, live SQL execution or real bank readiness. Revert source PR to restore prior UI; P8 migration was manually applied by owner and must not be dropped automatically.


## 55. P8c read-only Admin adaptive-bank readiness — 2026-11-04

**Context:** Owner reported applying P8, but a real live pool was not independently verified. Admin ASP11 review READY does not mean P4 approval. P8 needs N approved and non-Mock items **in each** Low, Medium, High tier (N=10/25/50), with the original proportional 20%-of-N checkpoint and 70% in-tier correctness.

**Source:** The secure Admin → Question Bank → ASP → Review & classify workspace now includes an explicitly requested, read-only **Level Up bank readiness** check and ASP11 domain filter. It calls only existing authenticated `lms_p8_levelup_readiness` P8 RPC for exact 10/25/50 counts; it does not access `lms_questions` directly or expose learner questions, answers, JWTs or roles. It fails closed for missing/contradictory RPC payloads, mismatching count/70%/checkpoint, and stale course/domain responses. It never approves, publishes, migrates, maps or reserves question records, or changes P4/P5/P6A RLS. All source changes are reverted without dropping owner-run SQL.

**Preserve:** Course→Domain→Topic→Lesson, real email/password login, ASP historical imported source identity, ASP11 official 9-domain manual classification, 200-question 300-minute exclusive Mock, Level Up server-only progression, existing Demo Practice/Calculator/assessment and secure Live bundle isolation. P6A human reviews stay draft. Production question bank is **NOT** declared ready just because the check UI exists.

**Tests:** `npm run test:adaptive:admin` is included in CI with mocked P8 RPC positive/negative cases (10/25/50, domain, missing migration, contradictory readiness), alongside existing P1–P8 and build/DB gates. Real Supabase project Admin JWT/browser read and owner-run `P8_VERIFY_READ_ONLY.sql` remain outstanding; neither GitHub merge nor green CI is live acceptance. No direct DB, Cloudflare, user or content mutation performed.


## 56. P9A — Read-only ASP Question Bank Release Preflight (2026-11-04)

**Continuation after P8c:** Source inspection confirmed that the protected P6A reviewer records human decisions as private DRAFT review metadata, while the P4/P8 practice bank accepts only separately approved, non-Mock questions. The prior 1,625 bundled/demo questions are NOT automatically live imported, mapped or licensed. Real P8 readiness and Admin/Learner JWT checks are still unverified. The owner requested proceeding to database/question-bank completion, without altering live production data without explicit approval.

**Delivered (source only):** `supabase/migrations/202611040002_p9a_release_preflight.sql` creates a new **read-only, authenticated active-Admin-only** `lms_p9a_release_preflight(uuid)` SECURITY DEFINER aggregate. It requires the true ASP course, P4/P6A/P8 metadata, checks each candidate's human-review state, answer verification, commercial-use-rights verification, official ASP11 nine-domain linkage, and classified Low/Medium/High difficulty. It reports actual imported/draft/reviewed/approved counts, per-domain draft candidates, anomalies in already approved rows, Mock flags/verified flags and explicit blockers. It does not return question text/options/correct indices, reviewer notes, user emails or secrets. Anonymous and learners cannot execute it; private table access remains denied.

**No release or Mock activation:** A mere `mock_exclusive=true` count of 200 does NOT establish an audited, versioned, immutable Mock form. The current preflight unconditionally returns `releaseAllowed=false`, keeps all preview candidates DRAFT and requires a separately approved true 200-question reservation and explicit audited per-item release process. The P9A migration is **not executed by this PR**, does not publish, approve, import, classify, reserve, edit existing tables, change entitlements/roles, and is not permission to deploy to production. If the function is absent, UI fails closed; never auto-runs SQL.

**UI:** Integrated `AspReleasePreflight` within **Admin → Question Bank → ASP course card → Review & classify** next to existing P8c Tier Readiness. The Admin explicitly runs the read-only check, sees six summary counts, Low/Medium/High candidate inventory, nine-domain breakdown and blockers. No Publish/Approve/Reserve control, menu navigation change or public Demo bank fallback. Input response is strictly validated, tied to the selected course and whitelisted for aggregate-only display.

**Tests and release proof:** New `test:p9a` Node regression checks identity/course binding, fail-closed contradictions, non-Mock review and rights gates, missing RPC and no client direct bank read. Disposable `test-p9a-postgres-smoke.sh` runs after P8 in CI, verifies learner/anon denial, real Admin aggregate-only response and database record fingerprints unchanged across migration/RPC. Existing P1–P8, ASP integrity, Demo UI, Calculator and protected live bundle gates stay mandatory. `docs/current/P9A_ASP_RELEASE_PREFLIGHT_GATE.md` defines owner-only Staging installation and JWT acceptance (not executed). CI success does not mean real Supabase or Cloudflare deployment verified.

**Next required stage:** reconcile actual ASP imported 1,625 source rows and official ASP11 mapping/provenance; approve individual sources with rights; select **exactly 200 reviewed stable Mock question IDs** in versioned audited reservation before any general release; create a separately authorized Admin approval RPC/UI and real JWT/access tests. Full 200/300 Mock engine, protected media, verified learner events, analytics and billing still pending. Paid production remains **NO-GO**. Rollback source/UI/CI without deleting real questions or the owner-run P8 migration.


## 57. P8d — HISTORICAL balanced thirds with expanding denominator (2026-11-04)

> **SUPERSEDED for NEW sessions by §58 / DEC-018.** P8d 30=10/10/10 baseline allocation remains correct, but the old correct/attempted ratio was not the intended fixed number of correct responses. Do not re-use the growing denominator for new Level Up Practice.

**Decision and defect:** The owner clarified and LOCKED the Level Up logic with an exact **30-question example**. The original P8/P8b/P8c implementation used a minimum checkpoint equal to about **20% of N** (N=30 allowed progression after only 6 Low questions), which is **not** the required logic. The historical details in §6 and §§53–55 are retained for audit history but SUPERSEDED BY THIS SECTION. DEC-016/DEC-017 and LMS-024 are the current authority.

**Current contract:** User selects any N=1..50 only from Secure **Practice → Level Up**, NOT from regular Practice modes, Admin Assessment or exclusive ASP Mock 200/300. Ideal balanced stage quotas are Low = max(1,floor(N/3)); Medium = max(1,floor((N-Low)/2)) for N>Low; High is the remaining number. N=10 -> 3/3/4, N=25 -> 8/8/9, **N=30 -> 10/10/10**, N=50 -> 16/17/17. Each initial Low→Medium or Medium→High promotion requires at least its OWN minimum count answered in that tier AND **cumulative correct*10 >= tier_attempted*7**. Below 70%, the server draws ANOTHER approved, non-exclusive question at the SAME tier and recalculates the numerator/denominator after every answer. Once promoted, start next tier counters fresh, never demote or skip stages. Stop at exactly chosen N answered (or existing server-authoritative deadline), regardless of the tier reached. 70% is not an official passing mark.

**Worked 30-question example:** all correct gives Low Q1–10, Medium Q11–20, High Q21–30. If after 10 Low questions only 6 are correct, remain Low. Four later correct answers progressively result in 7/11, 8/12, 9/13, 10/14 (>=70%), so **Q15 first Medium**. Seven correct from 10 Medium Q15–24 promotes to High Q25–30; total **14 Low + 10 Medium + 6 High = 30**. If Low never reaches 70% by Q30, terminate at 30 without advancing. No difficulty indicator, promotion banner or client-side tier selection during the session.

**Database source delta:** `supabase/migrations/202611040003_p8d_adaptive_thirds.sql` is a guarded, separately owner-run staging migration ONLY after original P8. A new NULLABLE `lms_practice_adaptive_state.medium_checkpoint_size` safely lets in-flight P8 sessions keep their old `checkpoint_size` for both tiers; NEW sessions persist Low/Medium balanced gates. The delta revises only P8 checkpoint, readiness, start and ordered answer RPCs, with no P4 generic Practice, Admin Assessment, Mock, P6A review, question bank, learner role, approval or data mutation. Correct answer counters remain private server-owned state behind real JWT and RLS. `lms_p8_levelup_readiness` now announces `policyVersion='thirds-v1'` plus Low `checkpoint`, `mediumCheckpoint`, 70% threshold and N-per-tier eligible approved non-Mock counts. The browser FAILS CLOSED if old P8 20% SQL remains installed. The question-pool preflight still demands N approved non-Mock per tier (not merely 10 for N=30), ensuring never running out while remaining Low.

**UI:** Add 30 preset to learner's 1–50 Level Up Practice setup and Admin's secure readiness panel; no live tier indicator, answer key, high/medium notification or adaptive change to non-Level Up modes. `src/production/adaptivePolicy.js` specifies the testable arithmetic but **SQL remains the grading authority**. The old historical Demo assessment remains unaffected. Test and design contract is in `docs/current/P8D_ADAPTIVE_THIRDS_POLICY.md`.

**Verification and limitations:** `npm run test:adaptive:live` and `npm run test:adaptive:admin` cover 10/25/30/50, threshold 6/10 vs 7/10, 9/13 vs 10/14, 70% Medium, client rejection of old RPC, no public stage marking, and server-only progression. `scripts/test-p8-postgres-smoke.sh` uses **disposable PostgreSQL only** to seed synthetic approved test questions, run P8 then P8d, demonstrate existing in-flight checkpoint preservation, server-side 30 perfect 10/10/10, recovery 14/10/6, and all-Low 30-question stop, uniqueness, row ACL and non-Mock delivery. `supabase/P8D_VERIFY_READ_ONLY.sql` is SELECT-only and checks actual installed one-third functions, private medium checkpoint, bank counts and helper permissions. All P1/P9A/Calculator/Practice/demo+live build tests stay mandatory. GitHub success is source/ephemeral DB evidence, **NOT actual Supabase migration, data readiness, JWT browser acceptance or Cloudflare deployment**. The owner reported manually applying original P8 in a database earlier; DO NOT rerun it. Production database remains untouched and paid release remains NO-GO until separately authorized staging/live verification.


## 58. P8e — Owner-corrected fixed-base 70% correct-count promotion (2026-11-04)

**FINAL LOCKED POLICY (§0, DEC-018, LMS-025):** In **Secure Practice → Level Up ONLY**, the learner chooses N=1..50 total unique questions. Its ideal Low/Medium/High stage allocation is balanced thirds, e.g., N=30 → 10/10/10 if each stage is passed without extras. Each current stage has BASE B from the original allocation, and promotion requires (a) the learner has answered at least B stage questions, and (b) the learner has accumulated **ceil(7×B/10) correct answers** in that stage. The required correct count is FIXED, NOT dynamically re-calculated from the expanding actual number attempted. Extra wrong answers keep the same required correct target and draw unique approved non-Mock questions of SAME tier until the required correct count is reached or total N is exhausted. Promoting changes the NEXT question's tier, resets counters only for the new tier, never demotes/skips, and never alerts learner during the active exam. High remains High. The selected N always caps the session, regardless of tier. This is NOT an ASP official exam passing threshold, and the independent 200/300 Mock/regular Assessment/Practice remain unaffected.

**Exact acceptance N=30:** Low B=10 and required correct=7. If Q1–10 contain 6 correct, Q11 is Low. If Q11 is correct, cumulative correct=7/11 attempted but the correct target is still 7/10 BASE → **Q12 is MEDIUM** (not Q15). If Q11 wrong and Q12 correct, **Q13 is Medium** since 7/12 still meets fixed 7 correct. Medium independently requires 7 correct after at least 10 Medium questions, so 6/10 Medium + one extra correct promotes to High NEXT question. For two stages requiring one extra each, distribution is 11 Low + 11 Medium + 8 High, exactly 30. If never reaching 7 correct Low by question 30, finish at Low. Never extend the count to make the learner reach High.

**Supabase state and migration:** Original P8 migration is already manually reported applied in a real environment; NEVER rerun it. The earlier staged P8d migration (version thirds-v1) added a NULLABLE Medium checkpoint to preserve old P8 in-flight attempts. **New sequential guarded delta** `supabase/migrations/202611040004_p8e_fixed_correct_target.sql` must run ONLY after approved P8d staging installation. It adds `lms_practice_adaptive_state.promotion_policy TEXT NULL`, with NEW sessions explicitly marking `thirds-fixed-correct-v2`; preexisting P8/P8d sessions remain NULL and continue their historical growing-denominator rule, not silently regraded. Readiness/start/answer RPCs continue server-side grading with JWT+entitlement, private answer/attempt tables and RLS, ordered immutable one-at-a-time non-Mock non-DRAFT questions, no repeats and exact N cap. Readiness now returns `policyVersion='thirds-fixed-correct-v2'`, Low/Medium original base and `lowRequiredCorrect`/`mediumRequiredCorrect`; both learner and secure Admin panels reject old or inconsistent server responses (fail closed). The conservative real bank gate is still **N approved, non-Mock questions per tier**, because a learner can spend all N in one tier. The UI never fetches protected answer keys, level-change alerts or unrestricted bank access.

**Tests:** Node unit regression checks fixed 7 correct of original 10, 6/10→7/11 and 7/12 promotions, stage minimum, Medium same, 25/50 counts, old server version refusal and never client scoring. Disposable PostgreSQL applies P8→P8d→P8e on synthetic data, checks in-flight P8d ratio is preserved, 6/10 Low + Q11 correct advances, 6/10 Medium + Q22 correct advances, result 11/11/8, exact 30 unique questions, additional Low wrong Q11 + correct Q12 advances and browser role cannot read private state. SELECT-only `supabase/P8E_VERIFY_READ_ONLY.sql` verifies actual stage baselines/required correct counts, nullable private version and server function signatures on owner-approved staging. Existing P1/P9A/ASP/Calculator/Practice/isolated live bundle and CI security gates still mandatory. Source implementation/CI success **do not mean** the actual P8e SQL is installed in a user's Supabase, the ASP source bank is approved, Cloudflare is deployed or commercial launch is ready. No live data or production migration was touched in this change. Owner approval, staging backups and real signed JWT/browser acceptance remain required.


## 59. P9B — Versioned 200-question ASP Mock reservation and independent Practice publication (2026-11-04)

**User continuation:** After confirmation that the user-run P8/P8d/P8e issue was fixed, the owner explicitly authorized continuing ASP question bank / difficulty governance while preserving 200 exclusive Mock questions and requiring no production data changes without separate permission. The current P6A review is private DRAFT metadata, not P4 learner approval; the original 1,625-question legacy Demo bank is NOT established as licensed, imported, classified production content. P8e remains the controlling Level Up Practice 7-of-original-10 correct-target rule and MUST NOT be modified.

**Boundaries/locked business logic — DEC-020/021, LMS-026:** Exactly **200 distinct, individually SME-reviewed, answer-checked, commercial-rights-checked, official ASP11-domain-classified stable question IDs** must be reserved in an immutable versioned private Mock form BEFORE any further ASP Practice bank release. A mere 200 `mock_exclusive` flag count without such a form is NOT sufficient. Mock questions remain DRAFT and are never eligible for P4 Quick10/Timed/Custom/Domain or P8e Level Up; neither a Mock timer nor attempt engine is activated by reservation. Only a verified **independent second Admin**, not the reviewer, can explicitly approve ONE separately reviewed, non-exclusive ASP DRAFT question for Practice. No auto-mapping of historical source groups to ASP11, no bulk publication, no overwriting original question text/answers/references and no changing existing learner records.

**Source-only schema:** `supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql` adds RLS-enabled private form and form-items tables with no authenticated/anon table grants, protected `lms_p9b_mock_preflight(uuid,uuid[])` read-only aggregate, `lms_p9b_reserve_mock(uuid,uuid[],text)` exact-200 transaction, and `lms_p9b_approve_practice_question(uuid,text)` independent single-item release. Preflight enforces exactly 200 unique IDs, zero pre-existing stray Mock flags/form, 9 official ASP11 domains, current source DRAFT/non-Mock/unattempted, P6A ready reviewed official classification and true answer/rights flags; result contains counts only, never question text, answer keys or reviewer notes. Reservation must lock course/questions/reviews, revalidate inside the transaction, write 200 immutable Mock IDs in selected order, flip ONLY those 200 `mock_exclusive=true` and audit the actor. DB triggers reject form/item update/delete, unreservation or changing Mock source/key/classification/approval. One immutable form version 1 only; replacement would need a future audited migration.

**Separate approval:** `lms_p9b_approve_practice_question` requires existing immutable exactly-200 reserved IDs, verified active separate Admin reviewer/approver identities, explicit one-question action, true human answer/rights review, official ASP11 domain, Low/Medium/High difficulty, draft/non-Mock/not previously attempted source. Only approval_state, reviewed domain, difficulty and updated timestamp change on that ONE question; P4 will then include it in approved non-Mock Practice selection. Every action adds an audit event. Duplicate approvals, self-review approval, unverified rights/answer, wrong course, missing form or attempted/reserved item must fail and mutate nothing. No batch-approval function exists.

**Admin UI:** Inside existing ASP `Review & classify` card, Admin can select reviewed-ready DRAFT UUIDs across 20-question pages, view the exact 200 selection count, call protected read-only preview, type `RESERVE 200 ASP MOCK QUESTIONS` plus explicit confirmation to reserve. The selected question's details retain original P6A workflow; `Approve ONE for Practice (independent Admin)` is shown only for reviewed-ready DRAFT non-Mock and calls protected one-question RPC after confirmation, which rejects the same reviewer's action. Existing ASP, P8c diagnostics and P9A release preflight remain integrated with no new navigation. P9A global releaseAllowed remains false because no actual 200/300 Mock engine/commercial release acceptance exists. P9B UI never bypasses absent SQL and never fetches private Mock rows or learner answer keys.

**Validation:** `npm run test:p9b` tests RPC shapes, the explicit two confirmation phrases, contradictory counts, 199/duplicate IDs, protected client integration and P8e non-regression. Disposable PostgreSQL `scripts/test-p9b-postgres-smoke.sh` runs after P1/P2/P4/P5/P6A/P8/P9A; tests zero existing row writes at schema install, anonymous/learner/cross-course denial, synthetic 200 reviewed DRAFT candidates, stray Mock flag blocker, 199/duplicate/incorrect confirmation denial, atomic exactly-200 immutable reservation, unavailable duplicate reservation, Mock source edit/unreserve/form item delete/edit denial, original reviewer cannot self-approve, unverified commercial rights blocked, verified second Admin can approve exactly one non-Mock question with ASP11 classification, audit proof and excluded reserved question count. P8e policy, existing calculator, course hierarchy and protected build tests must still pass.

**No production action:** This PR installs NO SQL on real Supabase, DOES NOT import/classify/approve/reserve any actual ASP source record, and DOES NOT deploy a Cloudflare live build. User recently showed `main — PRODUCTION` in Supabase; never suggest blind migration execution or a database write there. Detailed staged runbook: `docs/current/P9B_MOCK_RESERVATION_AND_APPROVAL.md`. Production rights/SME evidence, actual curated 200 Mock selection, signed JWT/backup/deployment/device checks, formal 300-minute Mock engine and paid release remain outstanding. Paid production is still NO-GO.


## 60. P9C — Read-only ASP bank and prerequisite audit, no Production data changes (2026-11-04)

**Owner authorization:** Explicitly requested examination of GitHub source, construction and testing of a **read-only audit of the real ASP question bank**, and Master Blueprint update, **without modifying production data**. This is a report-only phase, NOT permission to run P9B migrations, import the historic 1,625, select/reserve 200 real Mock questions, review/approve real content, change entitlements, or deploy Cloudflare. The confirmed SQL Editor previously showed `Technica LMS / main (PRODUCTION)`, so audit scripts must work as SELECT-only when owner executes them there. The agent cannot infer actual production counts merely from repository fixtures or CI.

**Source code inspection / actual constraints:** P4 `lms_questions` retains `course_id`, `source_id`, legacy group, domain, difficulty, answer/reference, `approval_state` and `mock_exclusive`; practice selection considers approved non-Mock questions only. P6A `lms_p6_question_reviews` holds **separate** human review metadata (rights checked, answer checked, official ASP11 domain, difficulty, review state); READY does not publish. P8e Level Up is **LOCKED**: at N30, original Low and Medium stages require at least ten answered and a fixed **seven correct**, never 70% of an expanding denominator; a failing learner may consume all N Low questions, so conservatively need **N approved non-Mock per tier**. P9B's versioned immutable 200 Mock reservation/independent Practice approval is **source code only until separately installed**, and absent P9B form objects must NOT cause the P9C baseline SQL audit to fail. 1,625 is a historical source reference (five legacy worksheets) and no automated mapping to nine official ASP11 domains is allowed.

**Read-only owner-run SQL kit (NO migration, DML, DDL or RPC action):**
- `supabase/P9C_SCHEMA_PREFLIGHT_READ_ONLY.sql` is **ONE SELECT** against catalog metadata to identify P1/P4/P6A CORE_REQUIRED tables, P8e policy column/RPC, and separately OPTIONAL P9A/P9B functions/tables. It does not query question records, and P9B missing is explicitly handled.
- `supabase/P9C_ASP_BANK_AUDIT_READ_ONLY.sql` is **ONE SELECT** with a standard output table `section/metric/scope/actual_count/target_count/status/note`. It reads only the real ASP course's question/review/domain/attempt-item records and emits counts, NOT prompts/options/answers/references/source IDs/user IDs/review notes. Sections include ASP course, source import count vs 1,625 **reference only**, distinct IDs and normalized-prompt duplicate-count indicators, Draft/Approved/Archived, missing/incomplete verified answer/rights/ASP11/difficulty review, blank reference/explanation counts, nine-domain completeness, runtime approved non-Mock vs **stricter matching P6A-governance verified** approved source, approved-at-risk conflicts, prior Practice-use anomalies, Mock exclusive flags and unused reviewed Draft candidate count target 200. Counts of 200 flags NEVER certify an existing immutable Mock form.
- P8e readiness inventory returns global Low/Medium/High counts, each compared with **30 approved non-Mock per tier** for the chosen N30; domain section returns 9×3 tier aggregates for reviewed Draft candidates, P4 runtime approved and stricter governance-reviewed approved. These are numeric readiness checks only, NOT manual SME rights/accuracy or paid-launch certification. P9B form existence is checked via catalog metadata only; when installed, `supabase/P9B_VERIFY_READ_ONLY.sql` remains the separately applicable SELECT-only 200-form reconciliation.
- See `docs/current/P9C_ASP_BANK_READ_ONLY_AUDIT.md` for the two-step SQL Editor owner run order, how to read the statuses, the `main — PRODUCTION` constraint, optional migration handling and evidence capture. If a core table is missing, stop and report, never auto-install a migration.

**CI/test and no-mutation evidence:** `npm run test:p9c` statically verifies one SELECT per file, bans DDL/DML/grant/permission-writing statements, enforces privacy/9×3-domain/P8e/200-Mock checks, and requires integration into CI. `scripts/test-p9c-postgres-smoke.sh pre` executes both SELECT statements on **disposable PostgreSQL** after P9A and before P9B exists, proving the optional missing Mock schema is handled. The `post` run after P9B synthetic 200-Mock reservation confirms the 200 Mock-flag count and explicit form presence; both compare protected question/review/attempt/audit fingerprints before/after every report (must be identical). P1/P2/P4/P5/P6A/P8e/P9A/P9B and existing compiler/build/security suites remain mandatory. These are **synthetic database tests**; no real Supabase private data has been fetched.

**Current stage boundary / next steps:** P9C source reports and tests are introduced without contacting real Supabase or altering questions. Actual owner-run SQL Editor aggregate output is still required to determine true imported/reviewed/rights/difficulty/domain/Mock readiness and document remediation. Then human SME review, source rights checks, original 1,625 reconciliation, explicit governed 200 Mock question selection, independently approved Practice pool and future 200/300 Mock engine may proceed only with separate authorization and proper staging. Real JWT/mobile Cloudflare acceptance and commercial release remain NO-GO until verified.


## 61. P9C.1 — Concise owner-run readiness decision summary (2026-11-04)

**What the owner supplied:** The owner's current Supabase screenshot shows the P9C schema preflight returning `P8e: fixed correct target column = PRESENT`, `P8e: server readiness RPC = PRESENT`, `P9B Mock reservation/independent approval RPCs = PRESENT`, and `P9A release preflight = MISSING` (which is OPTIONAL). CORE_REQUIRED rows were outside the cropped screenshot; their actual results have not all been verified from the image. The separate `Pasted text.txt` upload contains the text of `supabase/P9C_ASP_BANK_AUDIT_READ_ONLY.sql`, **not actual SQL Editor Results rows**. Thus real imported/reviewed/approved question numbers and Mock reservation counts are STILL UNKNOWN. Do not imply the actual bank was inspected.

**Useful source-only increment:** `supabase/P9C_DECISION_SUMMARY_READ_ONLY.sql` provides a single, short, selectable **SELECT-only** report specifically for a confirmed Technica SQL Editor database **with P9B private form/items PRESENT**. It reads existing P4/P6A/P9B protected bank data via a one-statement set of common table expressions and produces only `area,check_name,actual,required,status,meaning`: actual imported vs historical 1,625 informational reference, DRAFT/approved/archived, no human review, fully checked answer AND usage rights official ASP11/human difficulty readiness, technically P4-approved vs governance-reviewed approved Practice counts, nine official domains, per-tier approved (and governance-reviewed) Low/Medium/High N30 conservative >=30 per tier, reviewed unused Draft candidate count for 200 Mock, true P9B versioned form count, 200 distinct Mock form IDs with excluded-DRAFT flags, and total Mock flags. A 200 candidate set is NOT a reservation; 200 flags are NOT a real immutable form; even a valid 200-item form is NOT an active 200-question/300-minute official Mock engine.

**Core locked policy preservation:** P8e Level Up Practice fixed correctness remains **7 right of the original 10 Low questions to promote**, even if Q11/Q12 adds further attempts; identical independent Medium gate, total N30 hard cap. The report compares conservative **30 approved unique non-Mock items per tier**, not 10 per tier, because a learner may stay Low for the entire N30. Question bank import/classification/approval/reservation remains separately authorized in the trusted server/admin workflow, and the report never changes those values.

**Source safety and verification:** `npm run test:p9c:decision` enforces a single SELECT, no DDL/DML/GRANT/REVOKE, no question prompts, correct options, notes or user identifiers output, mandatory rights-and-answer human checks and a clear no-Mock-engine signal. The existing `scripts/test-p9c-postgres-smoke.sh post` runs the report after **synthetic** 200-item P9B form fixture, checks 9 official domains, 200 form items, Mock flags and no active Mock engine, compares protected bank fingerprints before/after, and runs as GitHub CI along with every prior test. This proves read-only behavior in disposable PostgreSQL only, NOT actual Supabase data.

**User operation and limit:** With core P4/P6A and P9B tables verified, owner can run only this SELECT in the intended Technica `main — PRODUCTION` SQL Editor, export aggregated Results as CSV and provide the counts for interpretation. The agent has no connected Supabase account query access in this session; the available Supabase plugin was not connected. No live query or state change was performed, and no new production migration has been installed. Do not modify production question/learner data without separate explicit approval. User runbook: `docs/current/P9C_ASP_BANK_READ_ONLY_AUDIT.md`. P10 formal 200/300 Mock engine remains future.


## 62. ASP 2,500-question XLSX — private candidate source and SME intake (2026-11-04)

**Owner upload and custody:** The owner provided `ASP_Question_Bank_2500_Simplified (1).xlsx` containing exactly **2,500 questions**, nine sheets `Domain 1` through `Domain 9`, and seven fields per row: Question, Option A, Option B, Option C, Option D, Correct Answer A-D and Explanation. Source SHA-256 is `37def22d09ee2deacd5352bd9f6ffaf7ef55fbda1fd798ea456a6690939c24d5`. Source and proprietary questions/keys MUST NOT be committed into a public repository or client bundle by this intake step. Detailed **metadata-only** report: `docs/current/ASP2500_CANDIDATE_SOURCE_INTAKE.md`.

**Verified STRUCTURAL inventory (not subject-matter certification):** Domain1 250; D2 625; D3 200; D4 300; D5 250; D6 300; D7 175; D8 275; D9 125. Total 2,500. No blank questions/options/explanations or invalid A-D key labels; no exact normalized repeated questions across sheets, including punctuation-insensitive normalization; no duplicate options within one row. Answer letter distribution A=615, B=635, C=640, D=610. This does NOT establish correctness of particular answers, legal rights to the source or absence of semantic duplicates.

**Classification and rights NOT in source:** Sheets are numbered `Domain 1..9`, not named with the official canonical ASP11 domain titles. Sample questions are topically consistent with the existing nine ASP11 catalog sequence (Mathematics, Safety Programs, Ergonomics, Fire, Emergency Response, Industrial Hygiene, Environmental, Training, Legal), but mapping is **PROVISIONAL** and still requires qualified SME sign-off. All **2,500 lack difficulty Low/Medium/High, independent question-specific source reference/citation, Topic, Lesson, rights evidence, verification/approval metadata and stable source ID fields**. An explanation is not an independent bibliographic reference. Neither answer_checked nor rights_checked may be assumed true, and no question may be considered reviewed, approved or Mock reserved merely because the file has four options and a keyed letter.

**Legacy importer incompatibility:** Current `scripts/import-asp-p4.mjs` hard-enforces **1,625** items in five historical groups [250,625,200,300,250], loading `src/data/aspQuestionBank.json`. The 2,500/9 XLSX is a *new candidate*, not the same input and cannot be fed to that script unchanged. Do not replace any bundled public/demo answer-bank file or write correct answers to public GitHub, especially as content rights remain unverified. A **NEW** separate backend-only, explicit SHA-pinned, dry-run-first parser/diff/import design is needed, and must preserve already approved/attempted/Mock-exclusive DB records. Candidate import defaults would be `draft`, `unclassified`, official `domain_id=NULL`, `mock_exclusive=false`, empty unverified reference, and no P6A answer/rights approvals. Generation of provisional source IDs must use a content hash/traceability plus diff review; source row number alone is unstable if a sheet is reordered.

**Private reviewer handoff:** The active conversation has a generated local private copy `ASP_2500_Review_and_Quality_Audit.xlsx` retaining the nine original sheets and adding `ASP Intake Audit` summary plus `SME Review Queue` of 2,500 source trace IDs and editable fields for proposed domain validation, difficulty, answer and commercial-rights checks, references, Topic/Lesson and SME notes. No reviewer verdicts are prefilled as Yes. This file is user-private and intentionally NOT added to GitHub.

**Real database remains UNKNOWN:** A user-provided workbook is distinct from the `P9C_DECISION_SUMMARY_READ_ONLY.sql` Supabase **results**. The previous reported success of running SQL shows no actual real-bank counts in this chat; 1,625 historical and 2,500 new candidate are **source counts only**. Before any import/reconciliation, compare actual `lms_questions` P9C.1 aggregate counts and current authorizations in the confirmed Technica project, and require explicit staging+owner approval for any writes. P9B's 200 unique vetted Mock reservation and independent second-admin Practice approval remain unchanged; P8e 30-question Level Up still requires **7 correct from original 10** at Low/Medium stage and an absolute N cap. Formal 200-question/300-minute Mock engine is still separate and not activated.

**Next controlled milestone:** Verify qualified SME rights/answer/Domain checks and Source citations for this candidate; reconcile with real DB; design an entirely private dry-run 2,500-question parser/diff; then, only after separate authorization and verified backup/staging, import DRAFT items, review correct answers/difficulty, reserve 200 non-Practice Mock questions, and independently approve the eligible Practice bank. **No database data were changed by this source intake.**


## 63. P9D.1 — PRIVATE ASP2500 pinned local Dry Run and zero-write Supabase fingerprint diff (2026-11-04)

**Approved owner work:** Prepare/test new importer for user-supplied ASP2500 9-sheet source, perform a DRY RUN and comparison against existing ASP question records **without any Production Supabase data modifications**, protect question confidentiality, and update the Master Blueprint/GitHub. The source was uploaded in this conversation, while **live Supabase Results/snapshot were not supplied and no Supabase connection is installed**. Distinguish actual local source-only audit from a live DB comparison which cannot be honestly completed yet. **No actual Production query or write was made.**

**Input and invariants:** Private XLSX SHA256 `37def22d09ee2deacd5352bd9f6ffaf7ef55fbda1fd798ea456a6690939c24d5`, nine sheets named `Domain 1..9`, exact seven question/answer/explanation headers, expected 250/625/200/300/250/300/175/275/125 = 2,500 source records. Source is NOT rights-verified, difficulty-classified, question-reference-cited, ASP11 Domain SME-mapped or active in P4. Existing 1,625/FIVE-source `scripts/import-asp-p4.mjs` remains untouched, and no proprietary question/answer/options or full data is committed to GitHub or Vite. Worksheet labels are not assumed official ASP11 taxonomy. New source IDs `ASP2500-<sha256(normalize(question prompt))>` are provisional stable across row sorting, and content revisions require their own manual diff; collisions, modified keyed answers/options/explanations are never automatically reconciled.

**Source-only dry run:** `scripts/asp2500_dryrun.py` is backend/local **read-only** Python 3.11+ standard-library ZIP/OOXML parser, with no `--apply` flag, no network/DB client code. It pins original SHA, checks expected workbook shape, every required value, A-D answer, unique option labels/prompt normalized hashes, rejects formulas/oversized or unsafe XML, generates internal content fingerprints only, and prints count-only JSON `SOURCE_ONLY_NO_DB_SNAPSHOT` when the actual database CSV is not available. Exactly 2,500 rows and nine per-sheet counts from the owner source were also independently validated locally in this session. No data writes other than optional private local aggregate report JSON.

**Read-only real DB snapshot and offline diff:** `supabase/P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql` is ONE SELECT to export each existing `public.lms_questions` ASP record to **private local CSV only**: source_id, SHA256(normalized question prompt), SHA256(normalized option list + 0-based correct answer index), SHA256(normalized explanation), approval_state, Mock-exclusive, ever-attempted, version and course identity. No plaintext copyrighted content/answers/learner IDs/emails is selected, but per-record source IDs+hashes are PRIVATE metadata and must not be attached to GitHub. `--existing-snapshot` loads user-exported CSV locally; categories are **NEW_DRAFT_CANDIDATE**, **EXACT_DUPLICATE_PRESERVE_EXISTING**, **ANSWER_OR_OPTIONS_MISMATCH_REVIEW**, **EXPLANATION_MISMATCH_REVIEW**, **PROTECTED_CONTENT_CONFLICT_STOP**, **SOURCE_ID_COLLISION_STOP**, **DUPLICATE_DB_PROMPT_REVIEW**. A source ID collision, duplicate DB prompts or changed content of previously approved/archived, attempted or Mock-exclusive questions must fail closed for any hypothetical future write. No automatic mapping/updates/import happen. SHA normalization is approximate for complex Unicode; hashes do NOT detect semantic duplicates or certify correctness/legal rights.

**CI and privacy:** `npm run test:p9d1` creates a wholly SYNTHETIC XLSX 2,500-row/nine-sheet workbook using Python stdlib and verifies input checksums/schema/answer shape, stable IDs, no-output privacy, broken source rejection, local snapshot exact/answer/explanation/protected conflict categories, and no network or DB data mutation. Existing CI P4/P6A/P8e/P9B/P9C tests must pass. In addition, ephemeral PostgreSQL executes the exact P9D.1 fingerprint SELECT on synthetic P9B data, checks row count and Python SHA256 normalization interoperability, validates all three hash field formats and proves question/review/attempt/audit table fingerprint stability. This never reads real production question content. `.gitignore` excludes the private original/reviewer workbooks and `*.p9d1.snapshot.csv` exports. Runbook: `docs/current/P9D1_PRIVATE_ASP2500_DRYRUN.md`. No SQL migrations, Cloudflare deployments, Supabase production data/role writes or Mock reservations. P8e remains **7 correct out of ORIGINAL 10** at Low and Medium promotion for N30 while the chosen count caps the attempt; 200 Mock form still requires rights-checked SME+independent Admin decisions.

**Status and next phase:** P9D.1 code **SOURCE/CI-ready only**, actual user-run SQL CSV diff with existing Supabase is **PENDING**. Owner can run SELECT-only `P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql` on the confirmed Technica project, export CSV privately, and run the offline Python diff on their own machine; share ONLY aggregate JSON from that result. P9D.2 then evaluates scoped private Draft staging import following manual SME answer/rights/ASP11/difficulty/reference review and explicit owner approval; no Production content is approved by P9D.1.


## 64. P10 — Secure official ASP 200/300 Mock engine and Question Bank engineering freeze (2026-11-05)

**Owner decision — STOP LOOPING ON QUESTIONS:** The owner explicitly requests concluding the prolonged ASP question-bank work and proceeding to the NEXT FUNCTIONAL MODULE. The permanent engineering choice is to use the privately supplied **2,500-question nine-worksheet candidate** for future ASP content onboarding, while preserving the old **1,625/five-group Demo importer** for historical regression only. This is **not** real Supabase import/rights/answer approval and does not waive professional SME quality, citation, usage rights or privacy controls. Source-only P9C/P9D1 audits have been completed; no additional bank audit/review sprint is required to start building P10 or P11. One release-gate reconciliation remains when production publication is separately approved. Document: `docs/current/ASP_BANK_ENGINEERING_FREEZE_P10_HANDOFF.md`; locked DEC-026, LMS-031.

**P10 business requirements:** An official `ASP Mock Exam` consists of EXACTLY **200 previously P9B-reserved immutable ASP Mock-exclusive question IDs**, and starts an EXACTLY **300-minute (18,000-second / five-hour)** server-authoritative deadline. Questions are NOT pulled from P4 approved Practice, P8e Adaptive Level Up, or any browser-bundled `src/data/mock` content; no mixing, overlap, auto-reservation or public answer key. Learners must have verified signed Supabase Auth JWT, active paid/manual ASP entitlement (or verified Admin), and native fullscreen on supported browsers. The server creates a new private 200-answer grading snapshot at start, stores each selected answer and flag, allows navigation/review, accepts editable selections until deadline, grades and submits securely and idempotently, and automatically finalizes expiry on the next server interaction. Native fullscreen exit, tab hiding or explicit Exit hides questions and triggers protected server abandonment; no false guarantee of OS screenshot prevention. Offline full reload does NOT silently restore protected content. There is no frontend-determined correctIndex.

**Stage-only P10 SQL migration (not installed in real database):** `supabase/migrations/202611050001_p10_mock_engine.sql` has additive P4/P9B guarded prerequisites and creates two PRIVATE RLS-on non-browser-granted tables `lms_p10_mock_attempts` and `lms_p10_mock_answers`. Attempts have fixed question count 200 and database CHECK on deadline = start + exactly 300min, user+client_request_id unique, explicit in_progress/submitted/expired/abandoned states. Answers freeze prompt/options/correct-index inside the protected DB only and store nullable selectedIndex/flag; no source/keys are changed by migration. Protected SECURITY DEFINER RPCs `lms_p10_mock_readiness` (count-only), `lms_p10_start_mock` (idempotent atomic 200 frozen form), `lms_p10_mock_payload` (user-bound, only question text/choices during active session, never correct keys, after finish only aggregate grade and empty questions), `lms_p10_save_mock` (answer/flag autosave), `lms_p10_submit_mock` (idempotent server grade), and `lms_p10_abandon_mock` (full exit seal). Internal `lms_p10_finalize` is NOT granted to regular authenticated users. Course entitlement rechecked on operations; P9B reserved Draft+exclusive 200, unused Practice and count integrity revalidated on start. P4/P8e migration logic and all previously approved question/attempt records remain untouched.

**Frontend and route:** `src/production/mockApi.js` strictly validates exact 200/18000 session readiness and learner payload safety, including no correctIndex/explanation and no question content after closed states. `LiveMockPortal.jsx` verifies actual Supabase ASP course enrollment and fails closed on missing P10 SQL or Mock form; `LiveMockExam.jsx` opens from native user gesture fullscreen and uses existing visual style/watermark, status HUD, 5h countdown, 200-position navigator, answer selection, clear, flag/unflag, per-action server save, submit confirmation and final grade. `src/App.jsx` adds `/assessments/mock/live`; existing `AssessmentOverview.jsx` offers the secure official route in addition to (and without rewriting) legacy configurable Assessments. No Demo fallback / no user-supplied answer key / no automatic Mock activation.

**Validation:** `npm run test:p10` protects RPC JSON schema, server-generated 200/300 timing, no-answer leaks, state transitions, course/fullscreen route and resource references. `scripts/test-p10-postgres-smoke.sh` after synthetic P9B exactly-200 fixture tests migration zero-existing-question writes, learner direct-table denial, anonymous/cross-course/cross-user denial, real reserved-form readiness, 200 unique private form positions and 18,000-second server deadline, duplicate-request idempotency, parallel attempt denial, answer/flag autosave and server-only 1/200 grading, post-submit non-reveal, timed expiry and fullscreen-exit abandoned sealing. This is **disposable PostgreSQL only**, not real Supabase JWT/device/production success.

**Unchanged release blockers — NOT a reason to loop on bank development:** Owner-approved real source licensing/answer/reference checks, controlled staging import of private 2,500 with collision report, human-checked 9-domain/difficulty, reservation of exactly 200 actual Mock questions, P10 migration on explicit authorized staging, live JWT/RLS and browser testing, access/entitlement, Mock expiration/fullscreen behavior and final production acceptance remain pending. Do not claim any official real five-hour Mock can be taken today. **Next engineering focus after P10 is P11 learner progress and analytics**, not another open-ended P9 question-bank audit.


## 65. P11 — Real learner progress and assessment analytics (2026-11-05)

**Owner-approved progression:** After P10 source Mock and ASP bank engineering freeze, proceed directly to P11 learner dashboard/analytics without reopening source-question classification. Existing full question-bank release gate remains a separate final activation checklist, not a development dependency. P11 code implements real database read-only reports with synthetic CI fixtures; **no authorized real Supabase Production/Staging migration or live data read has occurred**.

**Canonical learning hierarchy and no fake progress:** New `/my-progress` route, learner sidebar/mobile menu, `LiveLearnerProgress.jsx` + `learnerProgress.css` show the selected course, verified Learning completion, Practice/Level Up performance, Mock 200/300 results, expandable Domains with Topics and up to 10 most recent finished exams. The only valid hierarchy is **Course → Domain → Topic → Lesson**. Learning statistics count only P2 server-verified `lms_lesson_progress.lesson_completed_at`; reading, watched video, quiz passing are separate counters; loading/opening a lesson alone cannot increase completion. In a course with no lessons, completion is NULL/unavailable, not automatically 100%. Legacy `src/pages/AnalyticsPage.jsx` and Demo data retain their separate historical Admin/Demo role, but the new Learner progress route NEVER renders fake community averages, fixed 78% accuracy, or demo question-bank data. If backend P11 RPC is missing or unauthorized, display a failure state.

**Migration, ownership and privacy:** New *additive source-only* `supabase/migrations/202611050002_p11_learner_progress_analytics.sql` requires P1/P2/P4/P6A/P10 and introduces ONE `STABLE SECURITY DEFINER` `lms_p11_my_progress(p_course_id uuid)` read-only RPC. NO tables, no data updates, no schema migration on real environments. The function uses only the verified `auth.uid()`, requires active profile + P1 `lms_p1_can_view_structure` and a published course unless Admin; every visible lesson is further checked through `lms_p1_can_view_lesson`, including Trial-only lesson grants. Learner cannot provide arbitrary target user ID. Direct browser GRANTs on protected question/attempt/answers remain unchanged. Output is aggregate-only; no source prompts, options, correct index, reference/citation notes, learner identifiers, other users, snapshots or private keys. Even a verified Admin querying P11 receives **their own learner progress**, not a cross-user staff dashboard.

**Score denominators and historical honesty:** Aggregate only finished `submitted` and server-expired `expired` P4/P8e Practice attempts and P10 Mock attempts; exclude active/abandoned/closed without grade. Practice and Mock are **separate**, with `levelup` counted within Practice. **Answer Accuracy = 100×correct/answered**, NULL if no answer; **Scored Percent = 100×correct/assigned question count**, NULL if no graded attempts, with unanswered assigned questions counting as incorrect only for score. P10 contributes 200 assigned per completed/expired Mock. RPC derives domain question accuracy from existing `lms_questions.domain_id`, falling back to P6A `reviewed_domain_id` for 200 exclusive Draft Mock source questions, without exposing keys or question IDs. **Topic question accuracy is intentionally unavailable (`null`)**: P4/P10 question snapshots lack a trusted topic reference, and fabricating accuracy from Domain or lesson quiz would be wrong. Topic shows actual lesson completion and quizzes passed only. Recent attempts expose mode, state, counts, score and times, not question content; latest 10.

**UI + fail-closed API:** `src/production/learnerProgressApi.js` checks `p11-v1`, exact selected course UUID, nonnegative aggregate counts, lesson/topic/domain hierarchy totals, Mock assigned=attempts×200, answered/correct limits, score percentage sanity and never accepts invalid/historical Demo responses. `src/production/LiveLearnerProgress.jsx` verifies Auth via `fetchLiveLearningCatalog` and actual permitted course IDs, and invokes the P11 RPC only after user course authorization. It uses existing Technica design language and mobile responsive layouts. Fullscreen is not required for read-only Analytics (but remains required in Practice/Mock); no payment/role bypass or Mock answer disclosure.

**Regression and release evidence:** `npm run test:p11` uses synthetic strict payload validation, invalid totals/percentages, exact route/sidebar and "no Topic accuracy" contract tests. `scripts/test-p11-postgres-smoke.sh` runs after **synthetic** P10 200-question fixtures on disposable PostgreSQL and tests no writes on P11 migration + report, anonymous/unentitled/cross-course/Trial/revoked/suspended access denial, Trial's one explicitly granted lesson vs paid's two published vs Admin's three including draft, one trusted P2 completed lesson, Practice and Mock grade denominators, no content/keys and no other user's records. CI also requires existing Course Builder/P8e/P9B/P10 regression and security tests. Detailed runbook `docs/current/P11_LEARNER_PROGRESS_AND_ANALYTICS.md`. **Real Supabase staging/JWT, P2 validated event-ingestion and any production activation remain pending**. No new question-bank analysis sprint needed.

**Next engineering work:** P12 readiness and integration QA (Staging authorizations, real signed JWT/RLS, data confidentiality, practice/mock/lesson integration, backend P2 event-ingestion, browser/mobile tests, performance, entitlement/payment and content release gates) before an owner-approved Production launch.


## 66. P12 — Production readiness and live Admin diagnostics (2026-11-05)

**User instruction:** Move straight to the next feature after P11. Build **P12.1 Admin Release Readiness** instead of reopening ASP source-question work. Only a future final controlled rights/answer/import/reservation launch gate can activate the private 2,500-question candidate, while historical 1,625 Demo material stays separate. No additional P9 bank research sprint is needed for this module.

**Implemented source-only Admin feature:** `/release-readiness` is an Admin-only navigation item and React page `src/production/LiveReleaseReadiness.jsx` with existing Technica responsive visual language, status overview, per-category expandable checklist, rerun and safe aggregate checklist copy. `src/production/releaseReadiness.js` creates a real Admin-JWT-gated **read-only** report. It validates configured public HTTPS Supabase build values without exposing URL/key, uses `verifiedLiveAdmin` to verify `auth.getUser()`, active P1 profile and unrevoked Admin role, and **stops ALL protected module probes** on any auth failure. Current Demo `role:admin` only governs navigation; it NEVER grants database permissions. Read-only probes include live ASP catalog, non-empty canonical Course → Domain → Topic → Lesson structure, P2 own progress table read, P4 entitlement RPC, P6A aggregate bank counts without question text/answer, P8e exact N30 verified Level Up pool readiness, P10 exact 200 real P9B versioned Mock-exclusive form readiness, and P11 owner-only verified analytics RPC.

**No automatic release certification:** The front end intentionally always shows **NO-GO**, even when all read-only runtime probes pass, because it cannot attest manually reviewed source rights, real staged independent role/JWT, signed video/PDF media, subscription billing and refund/expiry, mobile iOS/Android fullscreen and screenshot limitations, end-to-end autosave/network-loss, 100-learner capacity, backups, rollback, monitoring or owner's explicit Production GO. Seven manual evidence gates remain PENDING, not editable/approved through this browser page. Runtime checks do not import, grant entitlements, reserve 200, approve source answers, publish courses, mutate P2/P4/P10/P11 data, or deploy anything. Only whitelisted status + counts may be copied; no login tokens, passwords, Supabase keys, source IDs, answer keys, prompts, user IDs or raw error messages. Error diagnosis is sanitized using the prior review diagnostics helper.

**Tests and governance:** `npm run test:p12` is a mocked read-only contract suite that proves real Admin gate before protected probes, unauthorized missing-config handling, safe fail-closed module counters, NO-GO verdict, seven independent PENDING evidence gates, 0 DB writes, no question/identity secret disclosure, and protected admin route. GitHub CI keeps all previous P1/P2/P4/P5/P6/P8/P9B/P10/P11 synthetic/PostgreSQL and browser-build tests. `docs/current/RELEASE_SECURITY_CHECKLIST.md` has been reconciled to distinguish **P10/P11 source implemented** from **not installed/verified in target Production** rather than repeating obsolete `NOT IMPLEMENTED` statements. `docs/current/P12_PRODUCTION_READINESS_AND_QA.md` is the read-only release runbook. Logic Registry LMS-035 and DEC-029 are locked for future changes.

**Environment/evidence honesty:** Only GitHub source has changed. No actual Supabase staging/production introspection, migration, question-bank import, SME sign-off, device/browser test or Cloudflare deployment has been authorized or performed in this phase. Real staging acceptance and screenshots/evidence are mandatory before this system can be considered production ready. Current launch verdict remains **NO-GO**. Next P12 modules, if separately requested: staging integration suite with real Supabase JWT role negatives, private media/payment integration acceptance, responsive/device/scale/performance tests and audited owner go-live approval.


## 67. P12.2 — Staging read-only API integration and local QA evidence (2026-11-05)

**Owner direction and release boundaries:** After completed source-only P12.1 Admin Release Readiness, continue the next functional feature: **P12.2 Staging API Integration QA + locally inspectable QA Evidence**. There is NO connected or explicitly authorized real Staging/Production Supabase environment in this session; no real JWT, user DB, question bank, or website was accessed. We built/tested source and mocks, never installed migrations or manipulated Production. ASP private 2,500/9 source remains engineering-frozen; no new content-analysis loop.

**New 19-case on-demand Staging QA:** `scripts/p12-staging-e2e.mjs` is a stand-alone Node + `@supabase/supabase-js` **read-only API smoke**, NOT a browser automation or production-ready E2E certification. It fails *before network requests* unless owner expressly provides `P12_STAGING_PROJECT_REF`, `P12_PRODUCTION_PROJECT_REF` (different, both twenty lowercase characters), exact `P12_STAGING_URL=https://<staging-ref>.supabase.co`, public `P12_STAGING_ANON_KEY`, `P12_STAGING_ENABLED=YES_READ_ONLY` and exact `--confirm-staging-ref=<staging-ref>`; four distinct existing staging Email/Password accounts for real active Admin, Paid learner, Trial learner, outsider; and anon fifth client. No Service Role key, no `VITE_...` Prod fallback and no automatic CI live run. Login via Supabase Auth may create ordinary Auth audit records but the harness makes **zero LMS schema/question/attempt/entitlement/score writes**.

**Stage API matrix:** `scripts/lib/p12-staging-qa.mjs` verifies four real JWT+P1 profiles (Admin role separately verified), real ASP published catalog, permitted Course → Domain → Topic → Lesson, P2 own-read endpoint, P4 *paid positive / Trial+Outsider denial*, P6A *Admin positive / Paid+Anon denial*, P10 *exact 200 versioned exclusive Mock readiness / Trial denial* WITHOUT exam start/answer/submit, P11 *paid owner aggregate / outsider denial*, direct private ASP question RLS with a positive nonempty Admin inventory fixture, and a cross-user P2 row isolation negative control requiring a genuine other-user progress row (otherwise PENDING). Total **19** distinct scenarios, each Pass/Blocked/Pending with generic output only. Missing RPC/positive-control does NOT count as successful negative ACL denial. Real Mock not reserved is BLOCKED but does not trigger any importer or reservation.

**New local-only Admin Evidence Center:** `src/production/StagingQaEvidencePanel.jsx` embedded in `/release-readiness`, using `stagingQaEvidence.js` for strict `p12-staging-qa-v1` whitelist (exact 19 case IDs, valid status, no extra response data, no raw emails, source IDs, user UUIDs, JWT/URL/token/answer text). Small JSON uploaded from local disk into browser memory only, NEVER to Supabase, connected apps, storage or GitHub. Displays 19 scenario statuses and copy-safe text with unchanged **NO-GO**. Import is *not authenticated evidence provenance* and cannot approve a release. Styling `stagingQaEvidence.css` retains premium existing Technica visual language and mobile-responsive layout without adding an unnecessary new navigation page.

**QA and governance:** `npm run test:p12:staging` is deterministic synthetic Node QA, including refusal of identical Prod/Stage refs, insecure/incorrect URL, missing opt-in, duplicate identities, module negative/positive role controls, restricted questions/cross-user reads, 19 aggregate categories, secret-redaction, local panel integration, no database mutation methods, and never-GO. Real remote `npm run qa:staging:read` is **intentionally NOT IN GitHub CI** and requires separate Staging credentials/owner invocation; its optionally created JSON stays local and ignored by Git, with exclusive create mode and without any private data. Runbook `docs/current/P12_2_STAGING_API_QA_AND_EVIDENCE.md`. Logic Registry LMS-036 and decision DEC-030 govern future work. Existing P12.1 seven manual release gates remain **PENDING** regardless of stage API counts.

**Not done / cannot be inferred:** No real project login executed; no actual Browser/iOS Safari/Android Chrome user journeys, native fullscreen five-hour clock, interruption/recovery, payment/entitlement webhook, signed media, screenshot controls, paid bank/licensing validation, staged migrations, 100-user load, backup/rollback, CI-to-Cloudflare Prod deployment, or owner launch authorization. Any E2E testing that **writes** lesson progress, practice answers, Mock results or roles is outside P12.2 and must use separately authorized disposable Staging fixtures only. Final Production verdict remains **NO-GO**, not a promise of full integration completion.


## 68. P13 — Unified Admin Tools workspace (2026-11-05)

**User request:** Scattered Admin features feel disorganized. Implement one main **Admin Tools** entry with six clear sub-tabs for Course Builder/Content, Question Bank, Mock Exam 200-question curation/exclusivity, Users/Subscriptions/individual progress, genuine dynamic KPI/Chart system dashboard, and System Tools; preserve Technica typography/color/branding while polishing with modest effects/animation. Both desktop and mobile must be usable. Do NOT revert prior accepted Course → Domain → Topic → Lesson, P8e Level Up fixed-7-correct check or P9B exclusive Mock 200.

**Important architecture finding:** Technica has TWO site entrypoints. `src/main.jsx` mounts ReactRouter Demo `src/App.jsx`; **actual public Supabase Vite build** in `src/production/main.jsx` mounts `SupabaseApp.jsx` directly without that Router. Merely adding `/admin-tools` to Demo would not show in the real deployment. P13 therefore delivers **the same** verified `AdminToolsWorkspace.jsx` in BOTH contexts. Demo Admin sidebar is consolidated to Admin Tools, old routes kept as backwards-compatible bookmarks; real Supabase Admin opens the unified workspace by default in `SupabaseApp`, with a Course workspace toggle preserving existing authoring flow. Admin-only workspace re-verifies server-issued Auth JWT and active database Admin role before protected modules. Demo role alone is insufficient.

**Six panels in `AdminToolsPanels.jsx`:** 1) Dashboard uses dynamic REAL P13 server KPIs (users, active, engaged30d, enrollments, courses/published, P4 Practice and P10 Mock attempts, completed P2 lessons, approved Practice and reserved Mock questions), six-month real registration/Practice/Mock SVG trend with metric picker and actual per-course enrollments. 2) Courses offers existing protected Authoring adapters for Draft course, Domains, Topics, Lessons, rename and reading text, with collapsible canonical tree; no automatic publish. 3) Question Bank embeds protected P6A human review/rights/difficulty and keeps P9B independent Practice approval. 4) Exams & Mock allows Admin to **manually select exactly 200 unique human-checked Draft non-reserved ASP questions across protected pages**, server read-only P9B preflight, typed phrase `RESERVE 200 ASP MOCK QUESTIONS`, final explicit confirmation, atomic versioned immutable Mock 200 reservation; successful server transaction sets exclusive flags, excludes those questions from all Practice/Level Up; preflight on stale candidates can fail and must never auto-correct or auto-reserve. 5) Users & Plans uses protected real Admin paginated directory and per-learner profile, current/historic enrollment type, start/end, actual lesson completion and per-course P4/P10 practice/mock scores. 6) System Tools consolidates P12 runtime readiness and locally loaded P12.2 Staging QA evidence. No second Admin sidebar scatter is reintroduced.

**Data/finance honesty:** P1 `lms_profiles` has name,status,created time; P1 `lms_entitlements` has user/course, `entitlement_type` trial/paid/manual, active/revoked/refunded, `starts_at`, `ends_at` and grant metadata. It has **NO** verified payment amount, currency, transaction record, invoice, provider charge ID or subscription billing ledger. P13 therefore explicitly displays **Amount paid = Not recorded**, **Verified Revenue = Not tracked**, and never treats a `paid` entitlement as proof of payment. A future separate payment gateway/ledger requires explicit provider selection, trusted event validation and owner-approved schema; no fabricated numbers.

**New source-only read-only migration:** `supabase/migrations/202611050003_p13_admin_tools_analytics_read_only.sql` requires existing P1/P2/P4/P10. It creates 3 additive STABLE SECURITY DEFINER RPCs: `lms_p13_admin_overview()`, `lms_p13_admin_users(search,limit,offset)`, `lms_p13_admin_user_detail(userId)`. Every entry checks `auth.uid()` and `lms_p1_actor_is_admin()`; no anonymous or regular learner access. Bounded names search and paginated users; no direct browser read grants added, no correct answer indices/options/private prompts/video paths returned, no updates/inserts/deletes. Analytics compile aggregate 6-month trend; detail only for requested profile with verified entitlements and P2/P4/P10 counts, no unrelated learner data in user-specific response. Client validates version/shape and explicitly refuses unexpected payment amounts or invented revenue. Missing migration results in clear "unavailable", NOT demo placeholders.

**UI/visual system:** `src/production/AdminToolsWorkspace.jsx`, `AdminToolsPanels.jsx`, `adminToolsApi.js`, `AdminToolsPortal.jsx`, `adminTools.css`, reused `AdminQuestionReview`. Premium Technica teal/white/charcoal palette, compact hero, accessible scrollable tab-nav, animated but lightweight SVG chart, KPI hover lifts, reveal transitions, responsive side panels and mobile layout, reduced-motion accommodation. No external media or unnecessary dependency.

**CI acceptance:** `npm run test:p13` validates Admin KPI/learner response contracts, no unsupported payment data, six tabs, real/live entrypoint plus Demo route, protected P9B 200 selection and confirmation, legacy course/navigation compatibility and Blueprint record. `scripts/test-p13-postgres-smoke.sh` after existing synthetic P11 fixtures tests source-only P13 migration against DISPOSABLE PostgreSQL: Admin positive, anon/paid/trial denial, 6-month trend and real learner plan/score, safe bounded lookup and zero bank/progress/attempt/audit mutations. Existing P1–P12 regression required.

**Environment restrictions:** NO real Supabase Production/Staging migration, no content rights waiver, no action/reservation on real ASP data, no Cloudflare deployment or actual subscription payment reconciliation has been performed. P13 source/CI ready only; production payment totals remain unknown, source Question Bank 2,500 intake is still final human-controlled release gate. Next safe action is authorized Staging install and signed JWT/device QA before GO. See `docs/current/P13_UNIFIED_ADMIN_TOOLS.md`.


## 69. P14 — Secure PDF/Video Lesson delivery (2026-11-06)

**User request:** In P13 Admin Tools → Courses, the real Lesson currently shows only `+ Text`; user expects to upload a **PDF or Video**. Correct the interface and real Supabase learner delivery, retaining strict Course → Domain → Topic → Lesson and already approved content. **Security:** user wants to avoid file downloads, screenshots and screen recording. Do not falsely claim browsers can guarantee this. Implement server-side access control and deterrence, while identifying real DRM limits.

**Implemented in GitHub source, not yet installed/deployed to real Staging/Production:** `AdminToolsPanels.jsx` presents **+ PDF**, **+ Video**, optional Text, Rename and secure Preview on each saved Lesson. `LessonMediaUploadModal` accepts PDF up to 20 MiB, video MP4/WebM up to 50 MiB, checks extension/MIME/file header locally for UX, uploads using an Admin signed upload authorization, finalizes the actual object only after server validation, and keeps content in the exact parent Lesson. `SecureLessonContent` displays real RLS-authorized legacy text, PDF and video blocks in BOTH actual Supabase React `SupabaseApp.jsx` and learner Router `LiveLearning.jsx`. Uploading content does NOT publish Draft Lessons nor simulate P2 completion. No existing ASP question-bank or Mock/Practice files, approvals or flags changed.

**Protected data plane and server authority:** `supabase/migrations/202611060001_p14_private_lesson_media.sql` adds private `technica-private-lessons` bucket, MIME/50 MiB restrictions, service-only table `lms_p14_media_upload_intents` and one-time transactional `lms_p14_finalize_media(uuid)`. This function locks the intent, checks actual `storage.objects.metadata` byte count + MIME (not merely client declaration), prevents duplicate attachment, and atomically writes `lms_media_assets` + `lms_lesson_blocks` with payload containing only `assetId` and safe title; private path remains service-only. Existing P1 RLS remains authoritative over Lesson blocks, including Trial allowlist/draft. Browser uses `lessonMediaApi.js` and never calls `getPublicUrl`, directly lists `storage.objects`, fetches `lms_media_assets` or embeds service keys. `supabase/functions/technica-lesson-media/index.ts` has `verify_jwt = true` (via `supabase/config.toml`), checks signed-in user via `auth.getUser`, active profile and Admin for uploads, validates file/path/course ownership, issues one-time signed upload tokens. For viewing, checks `lms_p1_can_view_lesson`, user-scoped `lms_lesson_blocks` RLS, matching lesson/block/asset kind/course and issues a **120-second** private signed read URL. Allowed browser origins must be explicitly configured in Edge secrets. Already-issued signed URLs are bearer tokens until expiration, even if a membership changes.

**On-screen deterrence and fundamental limits:** Viewer conceals content on tab-hidden, blocks in-page right click, text copy/drag and save/print shortcuts when possible, hides native video download/PiP controls, requests a new signed media token for the next window, and overlays a repeated changing user/time watermark. PDF iframe attempts to hide browser toolbar where supported; some browsers may still expose save/print and network bytes, so true no-download cannot be guaranteed. User devices can capture screen or external camera even with JS restrictions. For high-value video, separately approved **multi-DRM encrypted streaming** (Widevine + FairPlay) is the only practical route to materially stronger, device-dependent capture and file protection; it is NOT implemented in P14. Stronger PDF delivery may require server-rasterized pages and watermark but does NOT make screenshot impossible. Never label generic MP4 signed URL playback as DRM, download-proof or screenshot-proof. Standard JS/CSS deterrence is not a substitute for OS protected video pipeline.

**CI / staging:** `npm run test:p14` covers file validation, private signed upload, ACL-scoped short-lived playback, payload stripping and UI safety. `scripts/test-p14-postgres-smoke.sh` on disposable PostgreSQL with synthetic Storage tables tests private bucket, no anon/authenticated access to upload intents/finalizer, transactional metadata-verified finalization, no duplicate media block and P1 learner RLS / Trial access. Existing P1–P13 tests remain enabled. Real Supabase Storage quota, service Edge deployment with exact Origin/JWT, protected signed URLs, Safari/Android PDF viewer and video token refreshing require owner-approved Staging test; no Production SQL, existing data writes or live deployment performed in this stage. Detailed runbook: `docs/current/P14_SECURE_LESSON_MEDIA.md`. Logic Registry LMS-039/040. **Production GO remains pending**.

## 72. P15 — Published learner catalog, Free Intro & local-only enrollment simulation (2026-11-06)

**User decision:** Move Assignments aside; improve actual Technica LMS learner journey without breaking existing ASP and security: Admin published Courses visible to all active learners, Course → Domain → Topic → Lesson outline with lock icons, **only first Intro Lesson free** even without payment, paid/manual enrollment unlocks full course, My Learning only for own enrolled courses, clearly separated Practice and My Practice. Make later real purchase integration possible; allow fake-number checkout simulation solely in local QA. Do not turn fake payment into production access.

**Implemented in source, NOT installed on real Staging/Production:** New live learner UI `LiveLearnerWorkspace.jsx` with four clear tabs Courses, My Learning, Practice (existing P4/P5/P8 LivePractice), My Practice (existing P11 own-report), responsive clean Technica styling. `SupabaseApp.jsx` dispatches only verified non-admin learners to workspace; preserves existing Admin Tools and review workflow. Course list reads actual published `lms_courses`. My Learning reads active paid/manual P1 entitlement only. No fabricated financial metrics, graded attempts, practice bank or progress.

**Security / admin:** New additive `202611060003_p15_published_intro_outline.sql` adds service-only `lms_p15_intro_settings`, secure `lms_p15_course_outline(courseId)` with public published metadata **without private block contents**, `lms_p15_can_preview_lesson(lessonId)`, Admin-only `lms_p15_set_intro(courseId,enabled)`, read-only Admin intro status, and two precise additional SELECT policies for **one** first published approved Intro. Admin Tools → Courses adds explicit Publish/Unpublish Course and Lesson and Enable/Disable Free Intro, using verified real JWT/Admin and P1 RLS. New Intro must be explicitly enabled; defaults to OFF to prevent accidental paid-content disclosure from existing courses. The enabled Intro UUID is snapshotted. If lesson/course publication or sorting changes, access fails closed rather than silently exposing the new first lesson. Trial/Paid/manual legacy entitlements remain authoritative; learner browser cannot grant access itself.

**Private video/PDF:** Update `technica-lesson-media` Edge function **source** only: if existing P1 lesson access denies, allow the signed active learner only when P15 Intro RPC confirms exact approved published Intro and RLS-scoped block; keep private bucket and signed URLs unchanged. No claim of DRM, screenshot blocking or encrypted HLS. Existing P14 upload 401 error with API keys needs separate real Supabase/Cloudflare configuration verification. No media exposure from simply seeing a published locked title.

**Local payment QA only:** React dev build with `VITE_LOCAL_QA_DEMO=1` accepts arbitrary 8–19 **fake** digits, immediately discards them, stores UI-only per-user/course `sessionStorage` marker to illustrate checkout and show `Demo only` course inside My Learning. It does **NOT** add a real paid entitlement, transmit card data, show real protected media, enable Practice, call an external processor or claim the course was bought. Real Backend/Provider integration, prices/refunds/renewals and webhook verification are future separate owner-approved work. Production has no fake checkout at all.

**Source, CI and stage gates:** `learnerJourneyApi.js`, `LiveLearnerWorkspace.jsx`, `liveLearnerJourney.css`, source-only P15 SQL, selective P14 Edge opt-in Intro path, Admin Tools changes, `npm run test:p15`, disposable `test-p15-postgres-smoke.sh`. No unapproved production writes, schema installation, payment entitlement grants or GitHub->Cloudflare auto-rollout. P15 new public table RPC privileges must be verified in actual Staging separately, role-negative E2E and iOS/Android QA required. See `docs/current/P15_PUBLISHED_COURSES_INTRO_AND_DEMO.md`. Production GO remains pending.

**Current Cloudflare /#/ route parity:** The existing `App.jsx` / `Layout.jsx` ReactRouter portal is a second, real browser entrypoint in addition to the standalone Supabase Vite app. P15 now exposes protected `/#/course-catalog`, `/#/my-learning`, `/#/practice`, and `/#/my-practice` via `LiveLearnerPortal.jsx`, verifying real Supabase Auth (no Demo credential fallback), reusing embedded P15 UI and responsive existing Layout navigation. Local-only legacy demonstration remains behind explicit preview, and Admin `/#/courses` remains Admin-only. This avoids shipping a feature that works only in a different entrypoint from the user's actual Worker portal.

### P15 follow-up after owner SQL execution — 2026-11-06
User reports the P15 SQL Editor execution returned `Success. No rows returned` on their Supabase Technica project. **Recorded as user-reported SQL success only, not independently verified remote migration ledger, table privileges or genuine JWT RLS.** Never rerun that migration automatically. New P15.1 source patch prioritizes named injected Supabase publishable/secret Edge keys over deprecated JWT-based anon/service_role keys to address `INVALID_API_KEY` mismatch; frontend accepts new `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy build variable name carrying a publishable key. Integrated PR #55's safe media upload stage/status diagnostics; retain Verify JWT and private storage. Before server release verify actual Cloudflare build variables, exact deployed Edge function version and role-negative tests. Source and deployment are not the same; no custom Supabase publishable/secret key has been disclosed or written to the repository.

## 73. P16 — Enroll Now, selected-Course Checkout and simulated payment (2026-11-07)

**Approved user flow:** Add Enroll Now button to Admin-published Course cards and Course detail. Clicking any LOCKED paid Lesson (not the free Intro) routes directly to Checkout for its actual selected Course; checkout must display that Course name/summary and signed-in learner, never switch to another course. After a successful simulation the learner can choose My Learning or Course outline; the simulated Course appears in My Learning and all published lesson TITLE panels become clickable for demo navigation. Course → Domain → Topic → Lesson hierarchy preserved; ordinary Paid/manual enrollment and all existing video/PDF privacy unaffected.

**P16 implementation (source; release status tracked separately):** `src/production/LiveCheckout.jsx` / `liveCheckout.css` renders a responsive full checkout page with review + fictional 6–12 digit test reference + explicit simulation acknowledgement + clear no-charge success screen. `LiveLearnerWorkspace.jsx` adds Enroll Now from card/detail and checkout navigation on locked lesson clicks. `src/production/LiveLearnerPortal.jsx` / `App.jsx` adds bookmarkable `/#/checkout/:courseId` and `/#/course-catalog/:courseId`, while isolated Supabase-Vite workspace supports same flow internally. `checkoutSimulationApi.js` stores only per-real-auth-user/per-course UI-only sessionStorage marker; entered digits are discarded. Production **simulated** mode can be disabled with `VITE_DISABLE_CHECKOUT_DEMO=1` (and that flag DOES NOT enable real billing). No new SQL migration, no real user charge, no payment card collection, no fake paid database entitlements.

**Security gate:** `sessionStorage` is not trusted for P1 entitlement, P15 Intro, P14 private PDF/Video or protected Practice/Mock. After demo the learner may click published locked lesson titles for a placeholder ONLY. Actual block/media reading remains strictly `full||l.isFreeIntro`, with server RLS and Edge recheck; it must NOT change to `full||demo`. Real full lessons unlock only after a future backend confirms genuine payment and creates audited, time-scoped `paid` entitlements. Real payment provider, amount/currency, order ledger, webhook idempotency/refunds, and owner-approved payment process remain PENDING. See `docs/current/P16_CHECKOUT_SIMULATION.md`. P15 migration previously reported applied; do not reapply.

**QA:** `npm run test:p16` added to CI; isolated checkout tests enforce user/course separation, no reference digit storage, locked-Lesson checkout routing, My Learning demo and no private content bypass. Continue prior P1–P15 tests and disposable PostgreSQL RLS suite; no live Supabase DB edits in P16.

## 74. P17 — Course Covers, premium course cards and enrollment-status clarity (2026-11-07)

**Approved:** Every Admin-published Course gets a recognizable 16:9 visual cover; Admin can upload/replace/remove its image via Admin Tools. Learner catalog cards and Course Details hero adopt the existing Technica palette and responsive visual hierarchy while preserving Course → Domain → Topic → Lesson and Enroll Now / locked Lesson → selected Course Checkout. Provide a deliberate gradient fallback before image upload; do not insert stock screenshots or unrelated images. My Learning separates *real* paid/manual Courses from *demo* checkout previews so mock purchase cannot be mistaken for a paid Course.

**Data finding:** P1 `public.lms_courses.cover_path` already exists. Source changes use this field; no new Course column or destructive table rewrite. Additive `supabase/migrations/202611070001_p17_course_covers.sql` provisions **public** `technica-course-covers` WebP-only Storage bucket with 2 MB max and Admin-only upload/delete/select Storage RLS, creates future-write guard on Course UUID-scoped `cover_path`, and a private audited cover-change table/trigger. No changes to private Lesson bucket/P14 signed URLs, P15 Intro or P1 entitlements. **Production database was not touched by source work.** Must verify and install new SQL once via authorized Supabase SQL Editor before testing Admin upload on live app.

**UI implemented in source:** `CourseCover.jsx` + `liveCourseCovers.css` creates deterministic teal/ocean/indigo/amber gradient artwork, uploaded image preview, and admin-only 1280x720 browser-converted WebP upload/replace/remove. `LearnerCourseCard.jsx` + `liveCourseCards.css` creates image-led responsive cards, badges and Course Details hero. `LiveLearnerWorkspace.jsx` displays *Active Enrollments* separately from *Demo Previews* and no longer assumes Free Intro always enabled; status precedence real > demo > not enrolled, and locked Lesson still leads to selected Course Checkout. `lmsApi.js` reads the existing cover_path from authorized Course rows. Uploaded file is committed before metadata update; prior object deletion after update and audit trail; failed cleanup is surfaced, not hidden.

**Security:** Published course cover is intentionally public and downloadable; lesson videos/PDFs stay PRIVATE. Storage object path must match Course UUID and UUID WebP filename. Images are validated by extension/type+magic bytes, decoded and transcoded by browser; SVG/remote URLs not accepted. Client Admin verification plus server P1 Admin/RLS are both required. No paid entitlement grant from Demo; no payment provider, money, receipt or pricing invented. P17 is independent of P16 checkout simulation; genuine billing remains backend webhook/ledger release gate.

**QA:** `npm run test:p17`, disposable Postgres RLS/audit smoke `scripts/test-p17-postgres-smoke.sh` after P15, all prior regression suites and Cloudflare build. Real Supabase migration ledger, Storage metadata and role-negative browser tests remain deployment gates. See `docs/current/P17_COURSE_COVERS_AND_ENROLLMENT_UX.md`.

## 75. P18 — Premium My Learning, real verified course progress and next payment integration gate (2026-11-07)

**Approved:** Improve My Learning to a premium Technica-branded dashboard while proceeding with the next enrollment lifecycle stage. **Do not fake course progress, payment or entitlements.** Course → Domain → Topic → Lesson hierarchy, existing P14 private media, P15 Free Intro and P16 selected-course Checkout remain unchanged.

**Implemented in source:** `src/production/PremiumMyLearning.jsx` and `premiumMyLearning.css` render a premium My Learning hero, active Course count, an actual P11-verified lessons-completed summary, Course Spotlight with Continue Learning, responsive enrolled Course cards with P11 progress bar and accurate status, a separate amber Demo Previews section with no percentages, interactive All/Enrolled/Demo tabs and title/summary search, plus direct Practice and My Practice navigation. `premiumMyLearningApi.js` fetches authenticated `lms_p11_my_progress` with max-three concurrent requests, P11-validated counters, no guessed completion; when any real Course report is inaccessible, the global verified aggregate stays **unknown** rather than showing a fabricated total. `LiveLearnerWorkspace.jsx` integrates the same My Learning in both Supabase and `/#/` ReactRouter and `LiveLearnerPortal.jsx` routes Practice/History correctly. Real P1 paid/manual enrollment takes precedence over P16 demo markers. A Course Spotlight opens that course's syllabus; no false claim about specific last-visited lesson.

**Payment backend staging contract:** Genuine checkout requires chosen provider/merchant, stored per-Course price+currency and policy, backend-created idempotent order, hosted payment, verified webhook, auditable paid-entitlement creation/revocation, refunds, failed charges and role-negative tests. **P18 has not invented pricing, built a fake backend order or modified production SQL.** Simulation remains UI-only; protected content never unlocks until a verified entitlement exists. No new database migration is needed to view My Learning. P17 `202611070001_p17_course_covers.sql` remains separately owner-installed before Admin public cover uploads, if still pending.

**Verification:** `npm run test:p18` in GitHub CI covers P11 report integrity, concurrency, honest unavailable states, no fake scores, distinct real/demo and functional navigation, responsive UI. `npm run test:p17` updated for the new component. Master specs maintained in `docs/current/P18_PREMIUM_MY_LEARNING_AND_PAYMENTS_BACKEND.md`. Deploy only after CI/build. P11 progress RPC should be tested with signed learner on authorized environment; server-side payment implementation remains a separate future phase pending provider selection.

## 77. P19-M — Protected Course Media Screen (2026-11-07)

**Approved:** Apply the same Assessment-style black screen (“PROTECTED LEARNING CONTENT”), browser fullscreen requirement and capture-shortcut/visibility deterrence to real Course Video and PDF Lessons. Reuse the existing Assessment protection functions, not a new OS screenshot detection claim. Existing Course → Domain → Topic → Lesson, P14 upload/media Edge JWT, P15 free Intro, P1 paid/manual permissions, P16 Demo (not real purchase), P18 My Learning and current Assessment/proctoring must remain unchanged.

**Implemented in source:** `src/lib/lessonMediaFullscreen.js` reuses existing `src/lib/contentProtection.js` keyboard/mobile heuristics and `src/lib/questionFullscreen.js` native Element fullscreen check/request. `src/production/ProtectedLessonViewer.jsx` and `protectedLessonViewer.css` create idle Open Protected PDF/Video poster; only on direct click request native fullscreen before asking the existing P14 `technica-lesson-media` Edge function for a signed URL. Exit fullscreen, visibility/tab hidden, focus loss on desktop (except PDF iframe), known capture/print shortcut or print event immediately covers media with a black fullscreen curtain, pauses/removes video/iframe DOM URLs and requires user-click Resume + reauthorization. iPhone/unsupported mobile native fullscreen has an explicitly labeled functional inline fallback. Video retains visible user/time watermark, best-effort no-download/PiP/remote controls and local seek position. P14 signed URL refresh stays within the known 120-sec TTL. `SecureLessonMedia.jsx` now delegates to the viewer instead of auto-fetching private media. Assessment question fullscreen/attempt abandonment semantics unchanged.

**Technical truth:** Standard PDF still uses signed P14 iframe inside this protected shell. `#toolbar=0` is a browser hint only; it does not guarantee no PDF export/download or native screenshot. Browser JS **cannot reliably detect or black real iOS/Android screenshots, OS recording, extensions or physical camera capture**; native secure OS/DRM would be required for stronger guarantees. Do not advertise 'screenshot disabled'. The optional P14.1 page-rasterization PR #54 is independent, not merged nor installed by this work. A signed URL already issued remains usable until expiration even after screen is concealed. P19-M adds no new SQL/Edge migration or external library; user-reported P15 remains as installed. PR #60 is an unrelated, ongoing **P19 Qualifications/Evidence** preview; this workstream is named P19-M and separate to avoid merging unrelated flows.

**Regression gates:** `npm run test:p19:media`, P14 updated to expect delegated viewer, P5 fullscreen, browser content-protection tests, all P1–P18 suites and build. Manual desktop/iPhone/Android tests still mandatory; progress and Entitlements not modified. Documentation: `docs/current/P19M_PROTECTED_COURSE_MEDIA.md`. Production go-live depends on a successful Cloudflare build and real signed media tests.

## 78. P20 — Direct Lesson Media & Performance (2026-11-07)

**User correction from deployed screenshot:** The P19-M “Open Protected Video/PDF” poster and mandatory fullscreen click are unwanted. **Already-entitled Lesson PDF/Video must display directly inline** (native video Play as needed), with `Fullscreen (optional)`. Keep the existing black `PROTECTED LEARNING CONTENT` privacy overlay and watermark for detectable browser exit/visibility/shortcut/print signals. A screenshot can still be captured normally via OS buttons/tooling because the website does NOT receive an OS screenshot event: do not claim or advertise impossible screenshot prevention.

**Implemented source:** `ProtectedLessonViewer.jsx` now automatically authorizes P14 signed private media near the viewport using IntersectionObserver (450px root margin), without a compulsory open gate; video controls/iframe appear in place. Fullscreen is optional via native request. Browser visibility/tab hidden, desktop blur where reliable, print and recognized keyboard capture commands synchronously blank and pause media; automatic return-to-focus resume with fresh JWT/Edge authorization and optional manual Resume. Retain P1/P15 server authorization, private bucket, no-download/PiP/remote controls, time/user watermark. Removed periodic 95-second URL renewal which reset playing video/PDF. Native browser PDF still may display download UI; separate P14.1 rasterized-page project remains pending. **No P20 SQL, Edge or production data write.**

**Cross-page performance:** `App.jsx` splits 21 heavy routes into `React.lazy` chunks (Admin, Mock, question bank, Practice, reports, builder, etc.) with Suspense. `LiveLearnerWorkspace.jsx` lazily loads Practice, Checkout, Premium My Learning and secure media. `lmsApi.js` runs profile+roles requests concurrently; `learnerJourneyApi.js` runs validated identity, published-only catalog and user entitlements concurrently, retaining active-user RLS. Media authorization deferred only until near viewport. No real-user perf score or page-CPU benchmark claimed; the old default DemoStore still imports a ~974KB ASP demo bank and needs a separate isolated refactor without breaking demo exams.

**QA:** Replace old P19 click/fullscreen-required test with direct/optional P19 contract; `npm run test:p20:performance` checks 4 read requests initiated concurrently and source-route chunk structure. Existing P14/P15 Media Auth and all CI must pass. Validate actual Chrome/iPhone/Android screenshot outcomes and core web vitals by SHA in browser after Cloudflare Production build; no claim actual OS screenshots are blocked. Detailed notes `docs/current/P20_DIRECT_MEDIA_AND_PERFORMANCE.md`.

## 79. P21 — Platform-wide Subscriptions and Admin-managed Plans (2026-11-07)

**User-approved business model change:** NEW enrollment/monetization is **NOT sold by Course**. One active time-based **Platform Subscription** covers every published Course, Lesson Video/PDF, Practice, adaptive Level Up and official Mock/Assessment for its authorized duration. Initial plan templates: **3 months, 6 months, 9 months**; Admin must be able to create/edit plan name, duration (1–36 months), price, currency, description and publication visibility. **Do not invent commercial price or currency**, and don't change already purchased subscription durations when Admin edits a plan.

**Implemented P21 source:** New additive `202611070002_p21_platform_subscriptions.sql` creates `lms_subscription_plans`, `lms_subscription_requests` and `lms_platform_subscriptions` with explicit Data API grants/RLS, immutable active plan snapshots, one pending request per learner and audit events. P21 RPCs restrict plan edits and manual activation/revocation to verified LMS Admin; learners may only request an approved priced plan. A learner selection is **pending**, not payment, and **does not unlock** protected content. Admin manual approval (only after documented external payment verification or authorized complimentary grant) creates a server-owned membership with `starts_at=now()` and `ends_at=now()+make_interval(months=>plan.duration_months)`. Expiry/revocation/suspended user denies current access. Future signed payment provider integration is a separate trusted backend workstream, **not implemented by P21**.

**Backend functional gate:** `lms_p21_has_active_subscription()` protects full-site access at database level. Existing P1 Course+Lesson and P4 Practice authorization functions are revised additively to honor active global subscriptions; P8/P10 Mock inherit P4, P11 inherits P1, P14 Edge checks P1 before issuing private Video/PDF tokens. P15 Free Intro remains Admin-opted and does not grant Practice/Mock. Historical P1 paid/manual Course entitlements are temporarily honored for existing customers until the owner approves an explicit migration, rather than silently revoking their prior purchases. The new UI sells only platform plans.

**Frontend/Admin:** `/subscription-plans` shows all published plans, duration, real Admin-configured price, pending request or active membership/expiry. All Course CTA and old `/checkout/:courseId` navigation goes to membership plans instead of per-Course paywall. `Admin Tools → Subscriptions` supports plan editing/creation, pending review, manual Admin approval/rejection, membership revocation and active membership counts. `My Learning` shows plan and includes every published Course while authorized. `LiveLearnerWorkspace`, `SupabaseApp`, `LiveLearning`, `LivePracticePortal` and `LiveMockPortal` consume the same verified global status; no client-only demo flag can grant true content access. The former P16 per-Course simulation exists as an unlinked legacy QA-only artifact.

**Migration release gate:** Owner must inspect actual Supabase target migration ledger and current production/staging state; the P21 SQL has NOT been applied by writing GitHub source. Require backup, explicit authorization and a single application in Technica Staging after P1/P4/P15. Once applied, verify PostgREST grants, Admin RLS, payment-free manual activation, 2+ Courses, Practice/Mock, paid Lesson PDF/Video, expiry, revoke, suspended account and unchanged old purchases. Tests: `npm run test:p21:subscriptions` and `bash scripts/test-p21-postgres-smoke.sh` on disposable database, all earlier CI gates and live device QA. Blueprint companion `docs/current/P21_PLATFORM_SUBSCRIPTIONS.md`.

**P21 post-review QA clarification:** Freeze plan name, price, currency and duration in the *pending request* when learner chooses the plan; never change these terms if Admin edits the plan before manual approval. Admin request list displays the snapshotted terms; approving a pending request grants only those terms. Rejection remains possible even if Admin subsequently hides/edits a plan. Regression: disposable PostgreSQL test changes price/term after request and checks activated record remains at originally selected values.
