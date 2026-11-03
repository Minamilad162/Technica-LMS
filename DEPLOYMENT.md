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
