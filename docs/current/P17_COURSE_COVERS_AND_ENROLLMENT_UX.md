# P17 — Premium Course Covers, Course Cards and Enrollment State UX

**Source-only until real Supabase P17 migration is explicitly applied by owner.**
No existing LMS course rows, published state, entitlement, checkout, media or exam data was modified by preparing this change.

## Current audit — before P17
- Current P16 catalog showed a generic graduation-cap icon, basic text card and no Course cover; published Course title, summary and buyer intent were already bound to real Supabase records.
- The original P1 `public.lms_courses` ALREADY HAS a nullable `cover_path`. No new column or change to existing course metadata is necessary. P1 real Admin policies already control Course updates.
- P16's browser session-only fake checkout placed demo-preview Courses beside genuinely paid/manual enrollments in My Learning. Although technically separated by a small label, this could imply fake payment purchases real content.
- Catalog cards could show generic “Free Intro preview” even if the P15 Admin had **not enabled** the opt-in Intro. P17 replaces this claim with “Intro preview when available”; lesson availability remains checked by real P15 outline/RLS.
- Prior P15/P16 server checks remain authoritative: P1 paid/manual full course, P15 opt-in one first Intro; only real grants read P14 protected media/Practice. Any browser flag remains UI-only.
- The checkout page doesn't yet have trusted prices, currency, merchant provider or purchase ledger. NEVER imply a real charge.

## UI implementation
- **Admin Tools → Courses**: a 16:9 Course-cover editor with JPEG/PNG/WebP upload (max source 5 MB), client canvas center-crop to 1280×720 WebP (max output 2 MB), thumbnail preview, replace and remove actions, and clear error messages. Requires signed/active **real Admin**. Each upload uses a new UUID asset path and updates the existing `lms_courses.cover_path` ONLY after a successful upload. Previous public cover is removed after metadata update, with an explicit cleanup warning on failure. If metadata update fails, the new uploaded file is cleaned up on a best-effort basis.
- **Courses**: premium 16:9 image cards and deterministic theme-gradient fallback covers, matching Technica teal/ink identity; responsive cards, elevated layout, hover/focus accessibility, title/summary, accurate access state, and separate View Course/Enroll Now. Cover + title open selected Course details; Enroll Now passes the same Course ID to Checkout.
- **Course Details**: cover-led hero with actual published Course title/summary, status and call-to-action, Course → Domain → Topic → Lesson syllabus with published Lesson count computed from existing P15 title-only outline, and the same access logic as before. “Continue” on an enrolled/demo Course scrolls to syllabus.
- **My Learning**: **Active Enrollments** (verified P1 paid/manual rights) and **Demo Previews** (session-only fake checkout, visibly “No real payment or protected content”) render in distinct sections. Browser demo flags are explicitly lower precedence than real entitlements. No real receipt, score, progress, streaming or bank access can result from a cover or demo.
- **Fallback**: all published Courses have a deterministic multi-theme illustrated gradient Cover even when P17 Storage/SQL is not yet installed; image URLs are resolved only for valid paths beneath that Course UUID. No external arbitrary URL or untrusted SVG is allowed.

## P17 additive database / Storage migration
`supabase/migrations/202611070001_p17_course_covers.sql` creates:
- A separate **public** `technica-course-covers` bucket for course marketing images **only** (2 MB WebP maximum). This is deliberately distinct from the existing **private** `technica-private-lessons` bucket. Anyone with a public image URL can download a Course cover; no DRM claim for marketing covers.
- Admin-only `storage.objects` insert/select/delete RLS, strict course-owned UUID/UUID WebP paths, and existing P1 Admin role requirement. No non-Admin write policy.
- A NOT VALID format/ownership CHECK on existing `lms_courses.cover_path` to guard all *future* changes without rewriting historical rows; old rows are not silently migrated.
- Private append-only `lms_p17_cover_audit` plus SQL trigger for each cover addition/replacement/removal, including the authenticated user ID and timestamp. Public/anon/authenticated read privileges on audit table are revoked. Public-schema Data API grants and private audit permissions must be verified on the actual target environment.

**NO automatic database execution.** Owner must verify target project, current remote migration ledger, bucket conflicts, existing cover_path data, and backup, then apply this migration once in the authorized target SQL Editor. Do not replay P1/P14/P15 or run it on unrelated projects.

## Flow safeguards and gaps
1. Real status overrides Demo status. Demo is placed in a distinct My Learning section; cannot open protected lesson content and does not count in paid enrollment metrics.
2. Locked Lesson and Enroll Now still target the actual selected published Course and checkout. Title-only outline is intentional.
3. P15 Intro is optional; its visibility is determined by Admin opt-in and server RPC. Catalog cannot promise a Free Intro universally.
4. Cover upload transactions comprise public Storage object + course metadata + audit trigger; separate cleanup may need authorized operational follow-up if browser crashes or the post-save cleanup fails. A follow-up cleanup/audit tool can be added when billing backend is built.
5. Current P16 demo checkout is explicitly **not payment integration**. No pricing management, provider sandbox, wallet, genuine purchase receipt or server paid-entitlement is implemented by P17. Real payment requires backend-verified charge + idempotent webhook and entitlement grant, with owner-approved product/pricing schema.
6. Review user journey on iPhone 15 Pro Max and narrower phones, desktop Chrome, with no Cover (fallback), oversized upload, invalid SVG, unauthorized learner and inactive account. P17 change must not modify Practice, Mock, secure PDF/video, calculator or course hierarchy.

## Verification / release gates
- `npm run test:p17`: static security + API cover path validation, JPEG/PNG/WebP signatures, fallback theme determinism, distinct My Learning groups, source-only Admin upload and no demo-media bypass.
- `scripts/test-p17-postgres-smoke.sh`: disposable local Postgres fixture run **after P15**: no P1/P14 data mutation on installation, bucket settings, Admin-only course metadata updates, correct ownership path, audit records, anon/learner audit denial, migration replay guard.
- Re-run all prior P1–P16 suites, production Vite build and Cloudflare Workers build before release.
- **Remote state**: deployment of this source is not proof that P17 SQL was applied or that authenticated Admin image upload succeeds. Test actual public cover path and private lesson-media access separately after authorized migration.
