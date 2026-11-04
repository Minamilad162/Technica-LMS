# Deployment — Technica LMS

Deployment target: Cloudflare Pages, build output dist, GitHub main. Current app is a browser-local React/Vite demo; deploy only as a clearly labeled preview until production backend/entitlement controls are validated.

## ASP Question Review on the EXISTING published site (2026-11-03)

The ordinary `npm run build` now builds TWO independent HTML entrypoints in `dist`: `index.html` (existing published Technica UI and demo assessments, no regressions) plus `asp-review.html` (real Supabase Auth / verified Admin / P6A reviewer). The admin sidebar **ASP Question Review** opens the real `/asp-review.html` page directly, not an explainer. A regular non-admin cannot approve or read question answers: the P6A RPC authorizes the actual Supabase Auth JWT.

Cloudflare Pages must provide these **PUBLIC** build variables in the actual Production environment, even if `VITE_DATA_MODE=demo`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_TECHNICA_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Never add `SUPABASE_SERVICE_ROLE_KEY` in Vite/Cloudflare browser variables. The project needs the owner-approved P6A migration, a genuine verified admin and a course with `slug='asp'` before the review queue can load. Missing config shows a specific configuration screen; source changes cannot silently populate Cloudflare settings. **No Cloudflare deployment, migration execution or runtime role check is performed by the GitHub merge.**

When explicitly building the FULL secure Supabase app with `VITE_DATA_MODE=supabase`, Vite still emits only its separate `index.html` Live entry (not the browser-local Demo or its 1,625 historic answer keys). This preserves the security isolation and the existing standalone P3 Live bundle scan.

## Existing demo build
- Node 22 and npm.
- Current source lacks package-lock.json so npm ci cannot yet be used; temporary npm install works in a connected environment but is NOT reproducible.
- Run npm run check, npm run verify:bank, existing tests, npm run build, npm audit --audit-level=high and infrastructure check before meaningful release.
- Verify Cloudflare Pages build and mobile/desktop smoke test; don't infer live success from Git commit.

## Production-target requirements
- Generate and commit official package-lock.json; require npm ci.
- Add meaningful TypeScript typecheck when migration is scoped and validated.
- Use Cloudflare secrets only for backend secrets, never VITE_ service role.
- Review non-prod Supabase migrations/RLS and backend exam security before activating paid users.
- Enable branch protection and required CI status on main if repository permissions/settings support it.
- Publish/rollback with known Git commit and Cloudflare previous deployment. Migrations require verified forward-fix/recovery plan.
- Record CI run URL, smoke test verdict, deployment ID, remaining risks in CHANGELOG and Blueprint.

See .github/workflows/ci-security.yml and docs/current/RELEASE_SECURITY_CHECKLIST.md.


## ASP review navigation update (2026-11-04)

Current UI contract: `Admin → Question Bank → ASP course tile → Review & classify`. This expands the card and renders the secure `asp-review.html` **inside a same-origin iframe**. No separate ASP Review admin-menu tab. In a full Supabase-only build, the ASP course header contains an inline **Review questions** action. Both require real Supabase Admin credentials and protected P6A RPC privileges; Demo Admin credentials do not authorize reviewer access. The public Supabase build variables documented above remain necessary. Cloudflare `asp-review.html` is a required internal asset, *not* a standalone visible navigation section. No schema migration and no automatic deploy are part of this UI change.


## P7 amendment: default Admin Courses & Builder use real Supabase (2026-11-04)

The historical statement that the default build is Demo remains true for many learner/practice/media modules, but is superseded for Admin /courses and /builder. These routes now use actual P1 Supabase tables, verified Auth Admin role and explicit Draft CRUD. A real /builder?courseId=<uuid> selects a genuine course UUID, and the asp slug can be mapped to an existing database ASP course. Existing browser-only authoring remains available via ?legacyPreview=1 with an explicit warning; Production should not confuse these with server writes. Vite QA uses a strict import.meta.env.DEV-only fixture, never Production Auth bypass. Cloudflare must still supply the two public VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY variables as BUILD variables. See docs/current/P7_LIVE_COURSE_BUILDER_GATE.md. No new SQL migration or production action was performed.


## P8 secure learner learning / adaptive readiness (2026-11-04)

P8 source adds live Supabase My Learning, and a secure Level Up option in `/practice/live` (available from the original Practice Center). The Proportional 70% difficulty engine is contained in **NEW, UNEXECUTED** migration `supabase/migrations/202611040001_p8_adaptive_levelup.sql` and must NOT be applied automatically to a real database or deployed as if ready. Before explicitly authorized nonproduction installation, verify existing P1/P2/P4/P5 migrations, Auth/RLS and readiness of at least N approved and non-exclusive questions for each Low/Medium/High tier. P8 overlays the P4 answer/finish RPCs and preserves P5 abandon privacy. Main legacy Demo Assessment and 200-exclusive/5h Mock are unchanged. See `docs/current/P8_LIVE_LEARNING_ADAPTIVE_GATE.md` for exact algorithm, Staging acceptance, cloud secrets, API-RPC checks and rollback. No Cloudflare deploy or production DB writes in this source-only change.
