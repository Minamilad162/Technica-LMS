# Dependency / Supply Chain Policy

Source: ../../docs/infrastructure/source/MASTER_PROJECT_PROMPT_GITHUB_SECURITY_READY.md

- GitHub Actions: .github/workflows/ci-security.yml; high-severity npm audit gate and existing tests.
- Dependabot: .github/dependabot.yml; weekly npm and action update PRs, NEVER auto-merge. Major upgrades require planned code compatibility and review.
- The existing v1.15 project is JS/JSX without package-lock.json; audited reproducibility is a production blocker. Generate package-lock.json in a networked clean environment using official npm registry; commit it only after verifying npm ci + build + tests; then remove temporary CI fallback.
- Add new dependency only with documented reason, compatibility, license, bundle impact and security review.
- Track fixed/accepted vulnerabilities with CVE/advisory, severity, temporary mitigation, approved owner and review date. Do not silently ignore high issues.
- Cloudflare actions/plugins/media dependencies must be pinned or reviewed according to validated compatibility.
- Avoid large UI libraries unless existing components fail the actual UX requirement.
