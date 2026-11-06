# P15 — Published Courses, opt-in free Intro, My Learning & Practice navigation

**Status: SOURCE-ONLY, disposable CI. No real Supabase migration, enrollment/grant, Cloudflare deployment or production data write was executed.**
Do NOT reapply P1/P14. Existing Supabase screenshot/video limitations, P4/P5 Practice policy, P10 Mock, P11 reports, ASP bank governance and Admin Tools remain unchanged.

## Target learner navigation
- **Courses**: lists only real `lms_courses.publication_state='published'`. A course card opens a nested **Course → Domain → Topic → Lesson** outline. Published lesson TITLES are available even to active, unentitled learners, but lesson *content* is not.
- **My Learning**: real paid/manual courses under active, unexpired P1 entitlements; continue learning. A Local QA marker may demonstrate the navigation, strictly labeled `UI demo only`, never real entitlement.
- **Practice**: only paid/manual active enrollments; embeds unchanged P4/P5/P8 `LivePractice` (Quick 10, Timed, Custom, Domain, Level Up), never exposes question keys to non-entitled accounts.
- **My Practice**: own P11 verified aggregate statistics/recent attempts; missing P11 returns unavailable instead of sample scores. Initial UI shows first enrolled course's P11 data.
- User's live Vite Supabase entrypoint `SupabaseApp.jsx` dispatches non-admin users to `LiveLearnerWorkspace`; the existing Admin and Reviewer screens are preserved. Old ReactRouter Legacy Demo pages remain separate and are not treated as paid secure content.

## Opt-in Intro and authoritative security
- **Admin Tools → Courses** gains **Publish/Unpublish Course**, **Publish/Unpublish Lesson**, and **Enable/Disable Free Intro** buttons. Every action is verified by existing Supabase JWT + database Admin role and requires a direct click; publishing has confirmation. No auto-publishing.
- New additive SQL `supabase/migrations/202611060003_p15_published_intro_outline.sql` stores an Admin-approved Intro selection in `lms_p15_intro_settings` (one per course, service-only grants) and adds `lms_p15_set_intro`, `lms_p15_admin_intro_enabled`, `lms_p15_course_outline` and `lms_p15_can_preview_lesson`.
- First published lesson is deterministically selected by domain/topic/lesson positions and stable UUID ties **when Admin explicitly enables it**. Its exact UUID is saved. If another lesson is reordered ahead of it, a lesson is unpublished, or the course is set Draft, the free preview FAILS CLOSED; do not silently switch free content. Admin must intentionally re-enable to approve the new first lesson.
- The **course outline RPC** returns only published metadata (domain/topic/lesson IDs, titles, order, Intro boolean) for active authenticated accounts; never raw `lms_lesson_blocks`, question prompts/options, media paths, lesson bodies, or drafts.
- Two additive narrow P15 SELECT policies allow only the approved Intro `lms_lessons` row and that lesson's `lms_lesson_blocks` for active signed-in unentitled learners. Existing P1 paid/manual/Trial and Admin policies remain intact. No new direct Storage policy, no learner entitlement INSERT and no service role key in the frontend.
- Existing P14 Edge `technica-lesson-media` must be updated **separately on authorized Staging** to accept `lms_p15_can_preview_lesson` when P1 says no; P15 media permission is rechecked before issuing the existing short-lived signed URL. Private bucket remains private. **No DRM or guaranteed screenshot/screen-record protection is claimed.**

## Local checkout simulation, deliberately NOT payments
- Activated only on local Vite development with **both** `import.meta.env.DEV === true` and `VITE_LOCAL_QA_DEMO=1`. It never appears in a normal Production build.
- UI accepts 8–19 *fake* numeric digits; stores ONLY a per-user/course `sessionStorage` flag to simulate the checkout and My Learning experience. Digits are discarded on submit; no network call, no money, no card data, no billing and NO real `lms_entitlements` mutation.
- A simulated checkout can only show the course in the local demo My Learning page; full lesson media, Practice and Mock remain protected by server P1/P4/P14. No browser-controlled flag is sent as payment proof.
- Production course card says payment integration is pending; the already-authorized P1 paid/manual entitlement process remains the only supported route to real access. Genuine payments must later use a trusted backend with provider-verified webhooks and a billing ledger.

## Staging rollout
1. Inspect actual target project ref/migration ledger, current RLS and public-schema Data API GRANTs. Do not infer installation from GitHub CI.
2. Apply P15 additive migration ONCE in separately authorized **Staging**, after backup. Verify new functions, the service-only settings table and exact role privileges. No Production change or bootstrap rerun.
3. Deploy updated P14 Edge function in Staging with normal JWT verification and exact allowed origins; correct publishable client API key. Existing Media signed uploads still must pass their own real staging tests (P14 upload 401 issue is separate).
4. Test signed Admin chooses a published Course and first published Lesson and enables Free Intro. Paid learner, Trial, outsider, revoked/suspended and anonymous test roles must demonstrate: published outline vs content difference, only one Intro, video signed token for the Intro, denied other media and questions, no draft metadata, no direct Storage access.
5. Test manual published/unpublished transitions, first-lesson reorder fail-closed behavior, signed URL expiry, Cloudflare deployment SHA and mobile layouts. Confirm My Learning and My Practice reflect actual P1/P11 records.
6. Test local fake checkout only in an isolated machine running `VITE_LOCAL_QA_DEMO=1 VITE_DATA_MODE=supabase`; verify it cannot grant actual entitlements or stream locked media. Never put real credit-card data into test inputs.
7. Only after environment separation and evidence, request a separate explicit Production rollout authorization. Final paid launch remains NO-GO until live billing, security, contents and device QA.

## Source QA
- `npm run test:p15` covers outline validation, paid/manual entitlement gates, client-side local simulation exclusion, admin commands, source security.
- `scripts/test-p15-postgres-smoke.sh` runs only after existing disposable PostgreSQL P14 chain: no new data mutations on migration, Admin-only Intro enable, outsider sees only one Intro, paid content stays locked, suspended denied, draft/unpublish/reorder fail closed, anon/learner SQL privilege denial.
- Successful code tests are NOT evidence of real Supabase/Cloudflare functionality or payment processing.

**Local demo navigation:** After entering fake digits in local-only checkout, all published Lesson titles become *clickable demonstration placeholders* and the Course appears in My Learning. No private Lesson content, signed PDF/video URL, graded Practice or Mock is fetched without a genuine paid/manual entitlement. My Practice can select among the learner's actually enrolled courses.

## ReactRouter entrypoint /#/ integration
The actual existing Worker user portal can use the `/#/` ReactRouter shell, not only the isolated `SupabaseApp.jsx` Vite entrypoint. P15 now routes the same real protected UI via `LiveLearnerPortal.jsx` to `/#/course-catalog`, `/#/my-learning`, `/#/practice`, and `/#/my-practice`. The existing `Layout.jsx` learner sidebar/mobile primary nav is reorganized to match, and hides duplicate P15 navigation in the router embed. `LiveLearnerPortal` obtains real Supabase signed Auth via `db.auth.getUser()` and never treats a demo-only session as permission. Old Demo Practice/Learning preview remains accessible only via explicit `?legacyPreview=1`; Admin `/#/courses` and course builder routes remain Admin-only. No untrusted browser flags unlock private media.
