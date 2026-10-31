# P3 — Technica LMS live Supabase integration (staged, 2026-10-31)

## Status and release boundary
P1 and P2 were reported as successfully run by the project owner; this source tree
does not prove which Supabase project was used or validate live API RLS. Do not claim
a live deployment until an authenticated staging walkthrough and the Cloudflare
production build have both been reviewed. P3 deliberately **does not** launch
real exams, payments, video DRM, certificates, protected questions or progress
events. They require additional dedicated server-side work.

## 1. What P3 does
- Uses **Supabase Auth email/password**, without browser demo Employee IDs,
  browser-local credential files or demo login fallback.
- Checks the P1 profile `account_status` and reads active server-issued
  `lms_role_assignments`. Only a genuine active `admin` can see
  administrative forms. The real authorization is enforced by Supabase P1 RLS.
- Published catalog can be viewed by authenticated learners. Their course
  structure is requested only for courses with currently active entitlements.
  P1 RLS additionally limits accessible published lessons, including trial
  allowlists.
- Admin can create a draft Course, Domain, Topic and Lesson, rename each, toggle
  draft/published for courses/lessons, and add plain-text lesson blocks. This
  uses P1 tables/foreign keys and their existing admin RLS write policies.
- No need for new P3 schema migrations: P1 already supports these authoring
  operations; P2 adds progress/event tables, which P3 intentionally DOES NOT
  allow the learner browser to write.

## 2. Protect the ASP question bank
The existing demo ships 1,625 legacy questions/answers as public JSON.
Switching the UI to database auth without excluding those imports would
still leak answers to anyone inspecting the site bundle.

Live mode uses a **separate Vite HTML entrypoint**. `vite.config.js`
substitutes `/src/production/main.jsx` for `/src/main.jsx` when
`VITE_DATA_MODE=supabase`. There is **no static import** of `App.jsx`,
`DemoProvider`, or `aspQuestionBank.json` from this entry. The
`npm run test:p3:bundle` test scans emitted files for a real ASP prompt
and old demo passwords. Treat this as a smoke assertion, not a formal
guarantee against all future dependency leaks.

## 3. Provision a real staging admin
1. In the correct dedicated Technica LMS Supabase project, confirm P1 + P2
   tables exist and RLS is enabled.
2. Enable email/password authentication in Supabase Auth.
3. Configure Auth Site URL and allowed redirect destinations for the actual
   testing domain. Verify that email confirmation and password reset emails
   work in the deployment. Email confirmation must be completed.
4. Open the live app, create your genuine admin account using email/password,
   and verify the account email. Registration alone **does not** grant admin.
5. Open `supabase/P3_BOOTSTRAP_FIRST_ADMIN.sql` in the **same** Supabase
   SQL Editor. Replace the placeholder with the email of the verified user
   **after checking the project URL**; run the SQL once as the trusted owner.
   This adds an active role assignment; it does not use client metadata or
   service_role credentials.
6. Sign out and sign in again. The UI should display Course management.
   A user without an active admin assignment sees only the learner catalog.

Never add `service_role` keys to frontend code, Cloudflare client environment,
Git commits or public screenshots. VITE_SUPABASE_ANON_KEY is a **public
anon/publishable key**, not a database password.

## 4. Build-time environment (Cloudflare Pages → Settings → Environment variables)
```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_LMS_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```
Build command: `npm ci && npm run build` (or `npm run build` with
Cloudflare installing dependencies). Output: `dist`.

**Avoid connecting to the CHEIRON Supabase project.** No production deployment
is performed by this pull request. Demo mode remains default locally; it uses
`VITE_DATA_MODE=demo` and preserves all old ASP practice behavior.

## 5. Safe smoke checks before enabling the live site
- New learner signup creates `lms_profiles`; forged
  `raw_user_meta_data.role='admin'` does NOT grant admin.
- No admin: cannot insert/update course or role assignment via direct REST,
  nor read draft course/lesson content.
- Verified bootstrap admin: can create a draft course, domain, topic, lesson,
  reading block; publication works and is immediately stored in Supabase.
- Another learner with no course entitlement sees published *catalog metadata*
  only, never private hierarchy/lesson text.
- Paid learner with active entitlement sees only eligible published lessons.
- Trial learner sees only explicitly granted published lessons.
- Suspended/revoked admins lose access on new request; RLS rejects writes.
- Verify Cloudflare live build excludes the old ASP bank and passwords; test
  `npm run test:p3:bundle` after a live-mode build.
- Browser tests on real mobile/desktop + direct authenticated Supabase REST/RLS
  tests are required before claiming release. CI's disposable PostgreSQL smoke
  is **not** evidence of live Supabase Auth/Storage.
- Actual exercise/assessment grading, approved ASP 9-domain migration, secure
  lesson media and purchased access do not exist yet in this live mode.

## 6. Recovery/rollback
Switch `VITE_DATA_MODE` back to `demo`, rebuild and redeploy only if an
explicitly approved rollback is appropriate. Do not remove P1/P2 tables:
those contain the separately created live data. Restore from backup if
required. Never automatically import local demo lessons or remap the ASP
five legacy workbooks into the approved ASP domain hierarchy.

## Next work
Server question bank & answer isolation, admin taxonomy mapping, exam session
and grading Edge Functions, learner progress event ingestion, signed private
media, entitlements/payment lifecycle, cross-device security and mobile QA.
