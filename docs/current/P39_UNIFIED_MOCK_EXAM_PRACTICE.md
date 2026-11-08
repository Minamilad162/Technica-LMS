# P39 — Mock Exam & Practice as one learner section

## Owner-approved information architecture (2026-11-08)

Replace separate learner menu entries **Practice** and **Assessments** with a single **Mock Exam & Practice** item at `/assessments`. Its screen has exactly TWO top-level tabs:

- **Practice** — the previous real protected Practice engine, unchanged functionality: Quick 10, Timed Quiz, Build Your Own (question count 1–50, optional timer 0–180 min), Domain Practice, Level Up Adaptive (owner's 7/10 baseline promotion rules) with course selection and approved-bank/P4/P8e server scoring. No Mock-only question exposure.
- **Mock Exam** — the **official ASP P9B/P10 form**, fixed at exactly **200 unique reserved ASP questions**, with exactly **300 minutes (5 hours)**. No question count, duration, difficulty preset, dynamic selected pool or other customization in this tab. Login + paid/manual/subscription or Admin entitlements required. Fullscreen, answer/flag autosaving, server deadline/grading and protected question payload remain.

Use the real `LivePractice.jsx` and `LiveMockExam.jsx` components, not old unsynchronized Demo `AssessmentOverview`, Demo `QuizPage` or the P34B dynamic `LiveSelectedMockExam`. The P34B tables and code remain for backwards compatibility, but **are not available as a third learner Mock mode**; do not drop live tables or existing attempts. Old `/practice` URL redirects to `/assessments?tab=practice`, while `/assessments/mock/live` remains a compatibility entry opening only the official P10 Mock. Mobile bottom and desktop sidebar show a single exam-preparation item. Historical `My Practice` remains separate because it is a results/history page, not an exam setup.

Historical Demo quiz session deep links `/assessments/take` and `/practice/session` are now available ONLY with the explicit local `VITE_LOCAL_QA_DEMO=1` + Vite DEV gate; in deployed production they redirect to the real Mock or Practice tab. A production `?legacyPreview=1` must never enable either of these old quiz engines.

The embedded learner Courses/My Learning cross-links to Practice should open `/assessments?tab=practice`. The separate non-router `SupabaseApp` learner workspace exposes the same two tabs in its own Practice screen. Tab changes must not mix attempt state: inactive panel is unmounted; protected P5 fullscreen and server attempts control access.

### IMPORTANT: Question Bank candidate flags vs official Mock reservation

P29/P34 **Mock Exam candidate toggle** is a staging marker only (`mock_candidate=true`). It is NOT automatically the immutable ASP Mock. The official ASP P10 endpoint reads the permanently reserved P9B form (`lms_p9b_mock_items`, `mock_exclusive=true`). Admin **Exams & Mock** has the existing explicit 200-ID permanent reservation gate with rights review; that security boundary has NOT been weakened. An Admin read-only P10 readiness strip in **Question Bank** now displays the true `0..200/200` reserved count and whether that specific permanent form is ready, so learners are not led to expect that checking any new candidate changes an already frozen exam.

If the owner later authorizes converting 200 selected candidates into the official permanent form in one Save, that requires separate contract design, live-ledger verification, irreversible reservation and independent rights/security approval. **Do not claim that P29 candidates become official Mock solely from Save All**, or bypass old reviewed rights/P9B controls. No production Supabase writes or migration changes are part of P39.

### Verification

Tests: `npm run test:p39:exam-practice`, existing P10 Mock and P15 navigation contracts, all P21-P38 suites, Vite build and disposable PostgreSQL smoke. Review at ~1440px and ~390px, keyboard focus/tab switching, My Learning Practice deep link, legacy /practice alias, direct official /assessments/mock/live, Mock readiness 199 (blocked) and exactly 200 (enabled), Practice customization and timer, subscription lock, no answer keys or dynamic Mock resurfacing.

Update `TECHNICA_LMS_MASTER_BLUEPRINT.md` and Logic Registry. Deploy via one grouped tested PR to `main`, then verify Cloudflare Worker build and real browser; no SQL migration or user-data change. 
