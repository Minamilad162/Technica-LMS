# Security Policy — Technica Consult LMS

This repository currently contains a client demo and planned production architecture. **Do not deploy demo authentication, local answer keys or client-only role switching as a secure paid production platform.**

## Reporting
Report suspected vulnerabilities privately to the repository maintainers through an available private GitHub channel (e.g. private vulnerability report if enabled) or the owner's established private project contact. Do not include exploit details, personal data, or credentials in public issues.

## Security expectations
- Keep secrets out of git, Vite public variables, client bundles, screenshots, crash logs and ZIPs.
- Admin permissions, question banks, correct answers, mock exclusivity and scoring must be server-enforced for production.
- Require private media and explicit authorized access, RLS/grants, validated uploads, webhook signatures, hardened HTTP headers and audit logs.
- Report severity, affected components, non-sensitive reproduction, suspected impact, recommended containment, verification evidence and fix commit.
- Never perform destructive security testing against production or other users without authorization.

Further details: docs/current/SECURITY_PLAN.md, docs/current/RELEASE_SECURITY_CHECKLIST.md and docs/current/AUDIT_PLAYBOOK.md.
