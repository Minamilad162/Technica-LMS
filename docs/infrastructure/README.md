# Technica LMS — Infrastructure Reference Integration

**Integrated:** 2026-10-28 | **Scope:** documentation, governance, CI, security and audit foundation. No learner feature, database migration, or paid-production deployment changed.

## Single-source hierarchy
1. **TECHNICA_LMS_MASTER_BLUEPRINT.md** (repo root): final authority for Technica LMS product decisions, ASP taxonomy, exam behavior, question bank, UI invariants, defects and roadmap.
2. **AGENTS.md** (repo root): required agent workflow, read-first ordering, regression and documentation obligations.
3. **This README and original source documents:** engineering baseline policies. These apply only where compatible with the established codebase and approved product behavior.
4. **UI_COMPONENT_REFERENCE_GUIDE.md** (repo root): more recent master UI guide (2026-10-24); do not overwrite with uploaded older 2026-09-15 snapshot.
5. **docs/current/LOGIC_REGISTRY.md**: testable business rules. **docs/current/AUDIT_PLAYBOOK.md**: project-specific, evidence-first audit choices.

## Owner-supplied source documents (preserved copies)
- source/MASTER_PROJECT_PROMPT_GITHUB_SECURITY_READY.md — general React/TypeScript/Vite, GitHub, Cloudflare, Supabase, build, security, CI and documentation expectations.
- source/PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md — adaptive audit procedure, applicable/not applicable/manual checks, risk classification, measurable evidence and go/no-go conditions.
- source/UI_COMPONENT_REFERENCE_GUIDE_2026-09-15_UPLOADED.md — supplied dated UI reference snapshot, retained for provenance. Existing root UI guide is newer and stays authoritative for the project's actual UI references.

## Applicability / conflicts
- The baseline recommends React + TypeScript + Vite, but **existing Technica v1.15 is React/Vite with JavaScript JSX**. Keep current app working; plan gradual TypeScript migration separately with tests, not an unapproved rewrite.
- The baseline mandates npm ci and typecheck. **The inspected main branch has no package-lock.json or typecheck script**. CI temporarily uses npm install when lockfile is missing and emits a warning; conditional typecheck also warns. This is an explicit blocker for production-reproducibility, NOT a pass. P1 must generate/commit a lockfile through a clean networked environment and implement a genuine typecheck/migration gate, then remove the fallbacks.
- The uploaded audit guide contains CHEIRON-only instructions. **They are NOT applicable to Technica**; adapt only generic controls. Do not add company/fiscal-year/incident logic to LMS.
- Choose relevant UI patterns from the newer root guide; no automatic installation of UI component libraries or paid assets.
- Current Supabase code is proposed/demo, not deployed. Do not touch production DB or confuse frontend hiding with authorization.
- Project's existing user UX rules (e.g. Removed Saved navigation, admin-only Question Bank) outrank generic feature suggestions.

## Infra change protocol
Before change: read Blueprint → AGENTS → this README → relevant UI/logic/security guide → source/tests. Classify change. Define impact and rollback. After change: verify tests and visually check affected pages; append Blueprint change/error register plus CHANGELOG; publish evidence. **Never silently change an accepted decision.**

## Enforced today
- Repository policy docs and owners' full source references committed.
- GitHub Actions CI workflow for infrastructure validation, existing demo regression suite, build and high-severity npm vulnerability audit.
- Dependabot weekly PR proposals (not auto-merged).
- Documented security/audit/release planning.

## Still manual or incomplete
- Branch-protection required-check configuration on GitHub; Cloudflare deployment gate and live smoke tests.
- npm lockfile, true TypeScript compiler check, fully reproducible build; run actual CI and review outcome.
- Supabase production auth/RLS, protected question delivery/grades, paid entitlements, payments, DRM/Zoom.
- Real load/performance measurements, real browser visual regression, production security certification.

Do not label the current demo production-ready or a passing audit without evidence.
