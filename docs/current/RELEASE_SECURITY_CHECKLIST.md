# Technica LMS — Production Release / Security Gate

**Verdict: NO-GO until independently verified in authorized real Staging and owner-approved Production.** Source code / GitHub synthetic CI success is NOT a live launch. Do not run SQL migrations, import licensed questions or alter Production records to complete a checklist.

| Gate | Source / CI status | Real environment evidence required |
|---|---|---|
| Master Blueprint, logic and bugs registry | Maintained through P12, review each merge | Owner-approved release scope, known-issues sign-off |
| Dependencies | `package-lock.json` tracked, CI `npm ci` and npm audit high | Confirm deployed build SHA and approved dependency security baseline |
| Typecheck | Legacy JS; TS typecheck script absent, CI WARNING | Add genuine typecheck for critical modules or accept documented risk |
| Existing UI/Calc/Practice regression | Automated Node contracts and build run in GitHub CI | User acceptance on real devices and sessions |
| Supabase P1 Auth/Admin/RLS | P1 role isolation tested in disposable PostgreSQL | Real signed JWT, Admin and unentitled/test-user role negative tests |
| Canonical Course → Domain → Topic → Lesson | P1/P7 source and hierarchy CI tests | Real ASP course structure and accessible published lessons |
| P2 verified learning progress | P2 schema + P11 read-only report source/CI implemented | Actual trusted event ingestion, lesson completion and video/quiz metrics |
| P4/P5 Practice/fullscreen security | Source/CI implemented | Actual auth, answer privacy, mobile screenshot limitations, expiry and exit acceptance |
| P8e Level Up | Source/CI implemented; fixed 7 correct of original 10 N30 | Actual approved non-Mock Low/Medium/High pools and Auth JWT E2E |
| ASP question bank 2,500/9 source | Private structural/source dry-run verified; no Production import | Formal rights/answers/difficulty/domain/reference review, approved staged import, P9B two-Admin 200 reservation |
| P10 official Mock 200/300 | Source and synthetic PostgreSQL 200/300 grading security tests | Actual installed migration, valid 200-item exclusive form, device time/exit/autosave correctness |
| P11 learner own analytics | Source and synthetic PostgreSQL test; own/Trial/admin isolation | Actual installed P11 RPC and cross-user safety, verified data source/denominators |
| P12 browser Admin runtime dashboard | SOURCE / mocked CI only, read-only, default NO-GO | Run as actual verified Supabase Admin in authorized Staging; collect aggregate status |
| P12.2 staged API integration / evidence center | SOURCE: 19-case Auth/JWT/Practice/Mock/P11/RLS read-only runner + local-only JSON evidence panel, synthetic CI tests | Explicit separate Supabase Staging/Production refs, 4 preseeded staging roles, real signed role-negative API evidence. No live run yet. |
| Protected media | Browser watermark/protection deterrence partially implemented | Backend signed media URLs, storage ACL, approved video rights/DRM where required |\n| P15 Free Intro | Published-only locked outline, Admin opt-in first Intro, private media re-authorization and local demo checkout source/tests | Apply additive P15 on isolated authorized Staging; verify admin setting, JWT/RLS Trial/outsider/suspended, no real grant from mock checkout and phone browser support. Production NOT installed. |
| Payments, subscription, trial and refunds | Entitlement schema and controlled manual grants exist | Chosen live commercial integration, webhook, refunds/expiry/revocation test |
| Browser QA | Responsive code + static tests | Current desktop Chrome/Firefox, mobile iOS Safari and Android Chrome, calculator and fullscreen |
| Performance | No live load evidence | Timed staging baseline for ~100 learners and concurrent Mock autosaves |
| Hosting & rollback | Cloudflare Pages/GitHub source | Real Cloudflare env/headers/CSP/HTTPS, staging URL smoke, backup and rollback verified |
| Production authorization | Never inferred from source or CI | Explicit owner approval and traceable change ticket after all blockers resolved |

## Safe runtime evidence

Open **Admin → Release Readiness** (`/release-readiness`) on a correctly configured **authorized staging** deployment, sign in as a real Supabase Admin, and review runtime responses. The page only reads the actual backend and lists seven still-PENDING independent evidence gates. It cannot approve its own release, install migrations, publish questions or assert a production GO.

## Mandatory release record

Record immutable commit SHA and environment/project identity (never publish private keys), executed migration versions (source vs installed), scope, actual signed JWT role-isolation evidence, exact tests run and artifacts, browser/device matrix, assessed risks, performance baseline, data backup/rollback, owner approval and **GO or NO-GO**. Future CI checks must not silently auto-promote the answer/content release or any Production migration.

**Current classification:** SOURCE-READY FOR STAGING ASSESSMENT; REAL STAGING/PRODUCTION VALIDATION PENDING; FINAL PAID-LAUNCH **NO-GO**.


### P12.2 staging evidence rule

Use `docs/current/P12_2_STAGING_API_QA_AND_EVIDENCE.md`. `npm run qa:staging:read` is explicitly manual with independent project reference/confirmation guards and only tests 19 read-only API scenarios. An imported JSON QA report does not prove its origin or grant Production authorization. Never put genuine staging accounts, keys, tokens or source questions in GitHub CI/reports. Real browser/mobile E2E, media, payments and load tests still must be separately evidenced. Current verdict remains NO-GO.

| P17 Course Covers / catalog clarity | P1 already provides cover_path; P17 source adds public marketing-only Cover bucket/Admin Storage RLS, audit trigger, responsive cards and real-vs-demo My Learning grouping. | Owner-reviewed P17 migration ONCE after ledger/backup; live Admin JPEG/PNG/WebP upload, unauthorized upload denied, public cover fetch, private Lesson unchanged; mobile QA. No live DB write made by code author. |

| P18 premium My Learning | Verified P11 enrolled course completion, course Spotlight, real-vs-demo separation, no synthetic metrics, bounded RPC concurrency, mobile responsive design source. | Verify actual signed P11 reports and iPhone/Android layouts; real payment provider, price/currency, webhook and financial settlement remain separate release gates. |

| P19-M Protected Course Media | Native fullscreen gate + same Assessment privacy screen for P14 Video/PDF, stop/unmount on exit/hidden/capture key/print, re-authorize on resume, mobile inline fallback and watermark. No DB/Edge policy edits. | Confirm role-negative signed URLs with real media, iPhone Safari/Android Chrome; standard PDF iframe still has potential native toolbar/download, OS screenshots cannot be prevented by the browser. Optional P14.1 canvas/image page delivery remains separate. |

| P20 Direct protected media and page speed | Course Video/PDF now load inline with optional fullscreen; browser-observable capture/blur/tab/print overlay remains, OS screenshots cannot be prevented; split 21 route chunks, lazy secure/Practice and concurrent identity/catalog reads. | Confirm CI, browser performance waterfall and actual learner device QA, including screenshot limitation and native PDF controls; no Supabase migration for P20. |

| P21 Platform Subscriptions | New time-based all-access memberships (3/6/9 month defaults, editable by Admin), pending requests, manual Admin activation with DB-owned expiry and audit, full P1/P4/P8/P10/P11/P14 gating; course paywall UI routes to Membership Plans. | Require owner-applied P21 SQL after ledger preflight; real gateway and auto-renewal not yet implemented; verify actual Supabase & mobile and legacy entitlements transition. No fake paid grants. |

| P27 Admin Charts & Course Preview | Four Admin-only P13-sourced SVG donut/pie charts with truthful counts and navigable Admin sections; new-tab Course Preview with Draft/Visitor/Subscriber modes using existing CourseHero/LessonExplorer and read-only Admin RLS. | Confirm real P13/P15/P22/P14 responses, paid/unpaid/free-intro cases, draft PDF/video, non-Admin deep-link denial, refresh and mobile QA. No SQL migration. |
