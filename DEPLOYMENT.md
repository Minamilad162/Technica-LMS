# Deployment — Technica LMS

Deployment target: Cloudflare Pages, build output dist, GitHub main. Current app is a browser-local React/Vite demo; deploy only as a clearly labeled preview until production backend/entitlement controls are validated.

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
