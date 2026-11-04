# ASP Question Bank — Engineering Freeze and Move to P10

**Decision date:** 2026-11-05. **Owner instruction:** Stop recurring question-bank analysis cycles and progress to the next LMS module. **Status:** DEVELOPMENT SCOPE FROZEN; NOT a claim that real questions are imported, licensed or published.

## One-time final decision
1. The owner-supplied **private 2,500-question / 9-sheet** ASP workbook is the **chosen future source of record for new ASP content onboarding**. The historical 1,625/five-group demo/source remains intact for legacy regression only; do not blend or replace it automatically.
2. P9C/P9D1 source validation and local offline comparison tools are complete, documented, CI-tested. **STOP creating further named question-bank phases, new audits or repeated requests for the same data** as a condition of continuing software work. The existing P9D1 offline diff remains available as an operational tool for final release reconciliation, not a separate development sprint.
3. Course → Domain → Topic → Lesson remains the only canonical hierarchy. The source's numbered nine worksheets are provisional, not proof of official ASP11 mapping. Low/Medium/High, answer accuracy, commercial usage rights and independent references require verified review before question publication.
4. For P4 Practice, remain fail-closed: only `approved` and `mock_exclusive=false` questions; independent Admin approval only after P9B 200 reserved items. The 200 reserved Mock IDs must **never** enter Practice or Level Up.
5. Level Up retains P8e **fixed 7 correct out of ORIGINAL 10** for N30, with no growing denominator and total N hard stop. No change to existing Practice modes, calculator, hierarchy, protected content or learner roles.
6. **Next engineering stream is P10: Official ASP Mock Exam**, 200 questions, exactly 300 minutes, independent private versioned form, server-side deadline, per-question autosave, flags, navigation, submit/expire and server-only grading. It may be developed and tested with isolated synthetic data while the real question bank is still undergoing human review.
7. We do NOT auto-import/approve/reserve real questions, use unreviewed source, or execute P10 migrations against production. Real Supabase readiness, licenses/copyright evidence, explicit 200 Mock reservation and authorized staging deployment remain **release gates**, not blockers to coding P10.

## Why freeze is compatible with responsible release
The workbook's **2,500 verified rows** establish structural integrity only. Real Supabase ASP bank import/count, domain/difficulty mapping, SME answer correctness, reference and commercial rights and Mock reservation are NOT independently verified. A final deployment checklist will require one source reconciliation and the exact rights/approval evidence; repeated open-ended source analysis is not the main workstream.

## P10 source implementation
- Migration: `supabase/migrations/202611050001_p10_mock_engine.sql` — *not installed on real Supabase*. Depends on P4+P9B, creates private RLS-on 200-item frozen answer snapshot and Mock attempts, 300-minute absolute server deadline, protected JWT owner-scoped readiness/start/payload/save/submit/abandon functions. No correctIndex or explanation exposed in exam payload; no question content shown after completion/exit. Idempotent start/submit and server-only scoring.
- Client: `src/production/LiveMockPortal.jsx`, `LiveMockExam.jsx`, `mockApi.js` — integrated route `/assessments/mock/live` and existing Assessments page entry. Paid/manual ASP enrollment or verified Admin required; 200-reserved preflight must be ready, otherwise Start disabled. Native fullscreen required; exit/hiding tab closes and seals attempt per P5. Controls include question navigation, answer save, clear, flag, 300-minute countdown, submit confirmation and protected score.
- Tests: `npm run test:p10` and `scripts/test-p10-postgres-smoke.sh` in disposable GitHub Actions PostgreSQL with P9B synthetic Mock 200. Negative ACL and cross-account checks, no key leaks, ID uniqueness, 300min locked, idempotent start/submit, options/flags, expiry, protected QuestionBank/Practice segregation and exit seal.
- Browser/device and real Supabase JWT acceptance, real 200 official questions, exact score/report UI and production installation remain pending; **P10 is source-only** until verified and approved.

## Staging/production safety
Installing new P10 SQL is a database change and needs a separate authorization on the intended environment; source code merge itself does not install it. No React/browser code uses service-role keys or raw answer bank imports. Neither test nor UI may silently fall back to demo questions or claim that the timed official Mock is active before P10 readiness responds with 200 verified exclusive items.

**Next after P10 code:** integrate results/progress & analytics (P11) while maintaining the question-bank release gate as a final checklist item, not another exploratory phase.
