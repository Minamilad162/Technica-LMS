# TECHNICA CONSULT LMS — MASTER SPECIFICATION LINK

> **Canonical specification:** [TECHNICA_LMS_MASTER_BLUEPRINT.md](./TECHNICA_LMS_MASTER_BLUEPRINT.md)  
> **Agent instructions:** [AGENTS.md](./AGENTS.md)  
> **Status:** Compatibility link only; NOT a second source of truth.

## Important

The repository already contains a more comprehensive, owner-approved master blueprint. To prevent two competing specifications, **all future Technica LMS requirements, approved decisions, architecture changes, roadmap updates, errors, regression lessons and changelog entries MUST be recorded in the single canonical file**:

### [Open TECHNICA_LMS_MASTER_BLUEPRINT.md](./TECHNICA_LMS_MASTER_BLUEPRINT.md)

Before any work, read it in full together with AGENTS.md and the affected code/tests. Preserve all LOCKED decisions, accepted existing UI, and historical fixes. Change the blueprint in the same commit as future approved implementation, with test evidence.

The ASP Mock Exam rule is **200 mock-exclusive questions in exactly 300 minutes (5 hours)**. The taxonomy is **Course → Domain → Topic → Lesson**. Adaptive practice advances from Low → Medium → High at **70%** as documented in the canonical blueprint.

### Why this pointer exists

An additional specification was started during the documentation consolidation on 2026-10-28. The established BLUEPRINT already documents the project more comprehensively, including the verified React/Vite v1.15 demo baseline, current ASP bank limitations, previous UI decisions, Pocket Prep-inspired interactions, calculator requirements, security constraints and bug register. To avoid ambiguity, the duplicate was superseded by this compatibility pointer.

For audit purposes, Git history preserves the original text in commit [d556ecc1](https://github.com/Minamilad162/Technica-LMS/commit/d556ecc1d6545ae560b948207637e70e79c766ad). **Do not maintain two parallel master files.**
