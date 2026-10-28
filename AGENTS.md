# Agent instructions — Technica Consult LMS

The canonical project contract is [TECHNICA_LMS_MASTER_BLUEPRINT.md](./TECHNICA_LMS_MASTER_BLUEPRINT.md). **Read it in full before making any change to this repository.** Its approved decisions, locked behavior, project-status boundaries and bug/regression register take precedence over superseded statements in older README files or implementation notes.

## Before making changes
1. Read the master blueprint, then the affected feature guide, CHANGELOG.md, DESIGN_GUIDE.md and current code/tests.
2. Identify the change request, approved invariants, risk, impact and appropriate test plan.
3. Do not reintroduce previously removed UI or silently change core assessment, content, media or imported ASP question logic.
4. Preserve existing stable question IDs, answer keys, references, learner history and current light responsive theme.

## During implementation
- Prefer scoped, reversible changes and migration-safe updates; never wipe persistent real learner content.
- Enforce access rules, mock-exclusive question exclusions, timing and marking **on the server** once production backend is in use.
- Do not call the present browser-local demo production ready.
- Preserve the ASP 200-question / 300-minute mock contract, the Course → Domain → Topic → Lesson hierarchy and the owner's 70% adaptive-promotion requirement.
- Use original UI inspired by user screenshots rather than copying third-party designs.
- Maintain desktop/mobile QA, accessibility and motion controls.

## Before any merge/push
1. Run relevant tests and disclose unrun checks.
2. Update the master blueprint **in the same commit/PR**: status matrix, applicable sections, decision log, new or fixed BUG rows, and dated change history with test evidence.
3. Update CHANGELOG.md if a feature or fix changed user-facing behavior.
4. State the Git commit, verification results and known gaps; record release confirmation separately from local tests.

Never silently erase a past decision or bug. Mark decisions superseded and fixed bugs verified, retaining the history.

## Infrastructure adoption — October 28, 2026

The following are REQUIRED reference reads before relevant changes:
- docs/infrastructure/README.md (source provenance, precedence and compatibility limits)
- docs/infrastructure/source/MASTER_PROJECT_PROMPT_GITHUB_SECURITY_READY.md (general build/security/source workflow)
- docs/infrastructure/source/PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md and docs/current/AUDIT_PLAYBOOK.md (evidence-based, app-specific audit)
- UI_COMPONENT_REFERENCE_GUIDE.md (existing and newer current project UI guide; older uploaded snapshot is archived only)
- docs/current/LOGIC_REGISTRY.md (approved ASP question selection, 70% adaptive threshold, 200 exclusive / 300-minute Mock)
- docs/current/SECURITY_PLAN.md, RELEASE_SECURITY_CHECKLIST.md, TEST_PLAN.md (production gates)

Apply generic guidance selectively: current app is JavaScript React/Vite, not TypeScript, and the main branch has no package-lock. Do not mask missing reproducibility or typecheck as successful. Do not apply the CHEIRON-only audit addendum to Technica. Preserve the learner v1.14 Saved-page removal and the admin-only Question Bank.

Before merging, record observed CI status and failures; neither passing static checks nor the existence of these documents makes the current demo production-ready.
