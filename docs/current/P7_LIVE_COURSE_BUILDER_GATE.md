# P7 — Technica LMS live Course Builder / hierarchy rollout (source-only)

**Date:** 2026-11-04. **Owner approval:** integrate default Admin Courses / Course Builder incrementally with real Supabase, starting with Course → Domain → Topic → Lesson. **No database migrations or production writes are authorized by this code change.**

## What changes in deployed code
- Existing main Auth remains genuine email/password with a server-verified active Admin role.
- Default Admin **Courses** and **Course Builder** routes use the dedicated existing Technica Supabase URL and public/publishable key from Cloudflare BUILD variables; **never** the CHEIRON Supabase project or service-role key.
- The Courses page lists real rows from `public.lms_courses`; Admin can explicitly create draft courses and edit title/summary. Draft remains Draft; no publication, scheduling, destructive delete, automatic import or entitlement changes.
- A course card opens `/builder?courseId=<real UUID>`. The Builder accepts the real UUID or existing slug (e.g., `asp`) and lists actual `lms_domains`, `lms_topics`, `lms_lessons` and text rows in `lms_lesson_blocks` through existing `src/production/lmsApi.js`. Admin can explicitly add domains, topics, draft lessons, rename them, and add plain reading-text paragraphs. Saving triggers a fresh database read; a failed RLS request fails visibly, never silently saves to localStorage.
- The existing `BuilderPage.jsx` and `CoursesPage.jsx`, assessment settings, imported demo question bank, media and calculator remain untouched under an **explicitly labeled local-only legacy preview**, accessible by `?legacyPreview=1`. The old browser QA fixture uses `VITE_LOCAL_QA_DEMO=1` on Vite DEV only (never compiled Production). No automatic sync, classification, renaming or deletion of old assets.
- This phase is **metadata + plain-text course authoring**, not full CMS: no rich blocks, PDF/video storage/DRM, scheduling, course publication, multiuser conflict control, version-history authoring, reordering, refunds/payments, or protected practice migration yet. These remain separate milestone gates.

## No production actions performed
- This PR adds source and **disposable CI fixture PostgreSQL tests only**. It does not use a Supabase database connector, deploy a Cloudflare Worker, install SQL migrations, assign users or create/edit actual content. The new UI writes only on an authorized human Admin **Create / Save** click after a separately approved deployment.
- The existing P1 foundation (already defined in repo) has required course/domain/topic/lesson/lesson_blocks tables and RLS; no new migration is necessary for the P7 draft workflow.
- Existing public Demo source still contains the legacy 1,625 ASP question sample answers; the default public bundle is NOT suitable for selling protected paid question access. The secure `VITE_DATA_MODE=supabase` standalone bundle stays isolated from Demo content. Never claim paid launch ready because admin metadata is now live.

## Staging acceptance sequence
1. Confirm dedicated Technica project; verify P1 roles, RLS and tables using existing read-only checks; ensure a verified Admin email is active.
2. Cloudflare **Build** environment has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and latest reviewed GitHub commit. Avoid runtime-only Worker variables.
3. On a **nonproduction/staging** deployment, sign in as Admin; open Courses, confirm only real database courses listed. Create a safe Draft course with a new name; reload on a different browser/session to prove persisted Server state.
4. Open its Course Builder and explicitly create Domain → Topic → Lesson; rename an item, create a plain reading paragraph, reload, confirm UUID hierarchy and text persist.
5. Sign in as Learner; confirm no Admin menu and direct user access to /courses and /builder is redirected. Direct authenticated REST test against Supabase must deny learner insert/update; anonymous must not access private lesson blocks.
6. Confirm no new rows created on initial page load, and no local Demo records were auto-migrated. Confirm the old legacy preview is explicitly labeled and does not modify Supabase.
7. CI: `npm run test:authoring:live`, `npm run test:auth:portal`, `npm run test:hierarchy`, browser QA suites, default Vite build and separate `VITE_DATA_MODE=supabase` bundle scan. Disposable `scripts/test-p1-postgres-smoke.sh` now tests real Admin draft/structure/text writes and learner/anonymous denial.
8. Recheck read/write JWT/RLS in real Supabase **staging** before authorizing any Production interaction. Real DB success is not implied by CI.

## Rollback and next work
- Rollback source by reverting the P7 PR; existing browser-local legacy components and backend data remain untouched. Do not undo SQL migrations (none added) or delete live courses.
- Next: live learner Course Library and lesson player with entitlement and progress P2, richer course media, secure questions/P4, independent Adaptive/Mock, analytics and payments.
- Stale docs that still say the *default* Admin Courses/Builder are only Demo are historical, superseded for these two routes by this P7 gate; the rest of the default app remains a Demo/prototype, **not fully Live**.
