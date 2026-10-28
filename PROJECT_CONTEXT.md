# Technica LMS — Current Project Context

**Read first:** [TECHNICA_LMS_MASTER_BLUEPRINT.md](TECHNICA_LMS_MASTER_BLUEPRINT.md). This file summarizes infrastructure and status only; it does NOT supersede the canonical blueprint.

## Product
English-first Technica Consult LMS, first course ASP Associate Safety Professional; learning taxonomy Course → Domain → Topic → Lesson. Exam Preparation now; Certificates/assignments/admin grading later. Learner practice includes Quick 10/custom/timed/adaptive, pre-assessment, personalized progress; admin-exclusive 200-question / 300-minute Mock.

## Existing code / technology
- Current inspected repo version 1.15.0: React 19, Vite 6, JavaScript/JSX, npm scripts.
- Cloudflare Pages target with build output dist. Existing browser-local demo data in localStorage/IndexedDB; proposed Supabase backend files are NOT applied production migrations.
- Original ASP active demo bank: 1,625 questions from five legacy workbook sheets; verify mapping to current nine-domain ASP blueprint before changing identifiers.
- Preserve premium light, teal/mint responsive UI. Root UI_COMPONENT_REFERENCE_GUIDE.md is the current reference.

## Infrastructure source policies
See docs/infrastructure/README.md and its three preserved source Markdown files. AGENTS.md directs agent work. The generic policy expects GitHub Actions, Dependabot, RLS, secure secrets, tests, change log and rollback; check implementation evidence before calling any of these operational.

## Implemented this documentation integration
- Original owner documents archived; current root UI reference preserved.
- Infrastructure governance docs, app-specific audit and logic registry, automated source-policy validation and initial CI/dependency PR config.
- No runtime change, migration or direct production action.

## Known gaps
1. package-lock.json missing; reproducible npm ci not yet established.
2. Existing app remains JS/JSX with no actual typecheck script; adopt TypeScript incrementally later.
3. Auth, server question selection/scoring, mock exclusivity, entitlement and RLS are not production-verified.
4. Payment, DRM protected media, Zoom SDK and real analytics not live.
5. GitHub branch protection, Cloudflare production gate, browser test evidence and deployment rollback must be configured/verified separately.

## Operating rule
Update Blueprint and CHANGELOG with every feature/change; record BUG IDs, test results and rollback. No silent redesign or change to ASP scoring, course hierarchy, question data or agreed UI. Project readiness remains **DEMO / production NO-GO** until security and reliability gates are met.
