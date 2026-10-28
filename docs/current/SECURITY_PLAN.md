# Technica LMS — Security Plan (implementation tracking)

**State: Planned / not verified production-ready.** Follow ../../TECHNICA_LMS_MASTER_BLUEPRINT.md and source security baseline ../infrastructure/source/MASTER_PROJECT_PROMPT_GITHUB_SECURITY_READY.md.

| Area | Requirement | Current known status / action |
|---|---|---|
| Authentication | Supabase Auth sessions, password reset, expiry and auditable admin assignment | Demo-only; implement, test in test environment |
| Authorization | Course enrollment, trial limits, learner/admin scopes, RLS & least-privilege GRANTs | Proposed schema only; do NOT claim deployed |
| Exam protection | Server-only question selection / scoring, no answer keys client-side, Mock exclusive 200, 300-min server timer | Planned; paid launch blocker |
| Storage | Private PDFs/video/assets, MIME & size validation, signed link expiry, audit | Local demo IndexedDB only |
| Streaming | Short-lived access, watermark, optional compatible DRM, threat monitoring | Planned; zero screen-record guarantee impossible |
| Payments | PCI scope reduced by PSP-hosted checkout; verify signed webhook, idempotency and refund revocation | Planned |
| Secrets | .env.example placeholders, Cloudflare/Supabase dashboard secrets only, never VITE_ service_role | Audit continuously |
| Web controls | HTTPS, CSP/headers with tested exceptions, limited CORS, secure cookies, rate limiting and bot protection on abusive public endpoints | Pending infra configuration and live verification |
| Reliability | Attempt autosave/recovery, concurrency, idempotency, retention, backups/rollback | Planned |
| Monitoring | Structured access/error logs with no secrets, alert ownership and incident response runbook | Pending |

## Protection rules
- RLS and explicit grants on ALL exposed data; no blanket anon write. Validate policy bypass with direct API calls and role-change tests.
- Never use localStorage for trusted authorization, grading or timer enforcement.
- No public embedding of ASP correct answer bank in commercial production bundles.
- Never add external secret values or private client data into public GitHub or exported ZIP.
- Harden rich content editor against XSS, unsafe files, unapproved embeds and untrusted HTML.
- Apply only the test checks appropriate to stack, use non-production environment and save evidence.
- Document accepted exceptions and owner approvals instead of silent security shortcuts.

## Incident handling
1. Identify and record issue without leaking sensitive data.
2. Contain via feature flag/revoke token/disable exposure as necessary.
3. Assess which accounts, roles, content and payment records may be affected.
4. Fix root cause, rotate compromised secrets, add regression test and monitor.
5. Update Blueprint bug register and release checklist; notify responsible project contacts following adopted policy.

## Open dependencies
Choose auth configuration, merchant PSP, protected media provider, error monitoring/alerts, legal data retention and user privacy wording before paid release.
