# Technica LMS — Evidence-based Automated Audit Playbook

**Source:** ../infrastructure/source/PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md  
**Authority:** ../../TECHNICA_LMS_MASTER_BLUEPRINT.md. Uploaded full audit instructions are generic; use their applicable-check selection, DO NOT blindly apply other products' addenda.

## Modes
- **Audit Only** (default): inspect and report; no code changes.
- **Audit and Fix:** root cause, targeted safe changes, tests and before/after evidence; owner permission for change when requested.
- **Pre-Production:** explicit GO / GO WITH CONDITIONS / NO-GO plus evidence and blockers.
- **Performance Investigation:** measure before optimization; do not guess indexes/caches.
- **Security and Permissions:** auth, RLS, role escalation, storage and leakage probes in disposable test environment only.

## Project discovery (current snapshot)
- Existing demo: React 19 + Vite 6 + JS/JSX, browser-local localStorage/IndexedDB, 1,625 imported ASP questions, separate Learning Player demo; Cloudflare Pages target.
- Backend: Supabase plan/proposal, not verified active app storage/identity/exam engine.
- Critical current user flows: demo login, course builder, ASP practice, assessment results and review, Excel import, PDF/video demo upload, learning player, responsive navigation.
- Critical new production flows: paid auth, 200-question exclusive mock, 300-minute attempts, 70% adaptive levels, server answers, billing and secure media.

## Applicable checks
1. **Source correctness**: routes/import, bank ID/answer/reference integrity; course isolation and legacy mappings.
2. **Security/design**: no service_role secrets/client answer keys in future paid bundle, server RBAC/RLS (once built), file validation, CSP/CORS/headers and JWT entitlement.
3. **Concurrency**: double-submit answers, interrupted attempts, admin mock reservation races, simultaneous course edits, duplicate payment webhook events.
4. **Frontend**: React effect repeats, layout/browser responsiveness, bundle size, large question lists, errors and retries, picture/video memory/listeners cleanup.
5. **Build/supply chain**: clean install, reproducible lockfile, conditional TypeScript readiness, actual test suites, npm audit high, Dependabot review and CI.
6. **Performance (when measured)**: practice launch latency, exam autosave API calls and payloads, question-pool selection/exclusion, resume and dashboard aggregates.

## Non-applicable checks / cases
- CHEIRON-specific Dashboard Bundle RPC, incident Register drilldowns, fiscal-year manhours/KM, company/site isolation: **NOT APPLICABLE TO TECHNICA**.
- Managed Supabase connection-pool tuning: not applicable until direct SQL sessions or observed bottleneck justify it.
- Native mobile app checks: web responsive app only, unless scope changes.
- Excel-like finance charts, 3D rendering, trading dashboards: not requirements and never installed merely for audit.

## Manual/external verification
- Browser device/viewport walkthrough, real paid enrollment, Cloudflare env/headers, actual Supabase grants/RLS, supplier billing sandbox, video DRM, Zoom and rights review, load tests.
- Never run destructive load tests or migrations on production.

## Findings format
ID | Severity | Evidence/file/route | Impact | Root cause | Minimal fix | Tests executed and actual verdict | Remaining risk | Status/commit. Keep a durable historical BUG entry in Blueprint.

## Evidence classification
- Implemented in app code
- Infrastructure-managed (with configuration proof)
- Configured but not verified
- Not applicable
- Missing / action required

Do not use production-ready, secure, fixed or optimized without executed proof. A Vite build success is not security validation.

## Release decision
- **NO-GO** for paid production while browser-local role/answers, absent server-grade scoring/RLS, no billing or mock isolation remain.
- **GO WITH CONDITIONS** only for explicitly limited demos without private paid content and with accepted risks.
- **GO** only once all critical/high release blockers have evidence, recovery plan and deployment verification.

## Audit cadence
Run code/source/security review for every major milestone; run runtime/performance/load only in appropriate non-production test environment. Every result must include Applied, Non-applicable, Manual Pending, Tests Executed/Not Executed and owner/action.
