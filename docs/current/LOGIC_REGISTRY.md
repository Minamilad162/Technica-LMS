# Technica LMS — Business Logic Registry

**Status:** approved policy registry / production implementation pending. **Canonical:** ../../TECHNICA_LMS_MASTER_BLUEPRINT.md. Any logic change updates both this file and Blueprint + tests, not just UI.

| Rule ID | Invariant / formula | Data and test requirement | Status |
|---|---|---|---|
| LMS-001 | Course → Domain → Topic → Lesson | Stable IDs, scoped queries, correct ancestor, existing history migration | APPROVED / TO BUILD |
| LMS-002 | ASP legacy bank 1,625 = 250 + 625 + 200 + 300 + 250 (five old sheets) | Original question IDs/text/options/correct indices/explanations preserved; current ASP11 nine-domain remapping needs SME-approved crosswalk | Existing demo / mapping pending |
| LMS-003 | Mock Exclusive pool = 200 reserved questions | Server/database reservation. EXCLUDE from all Practice/Quick/Timed/Custom/Adaptive/Weakest/Missed/Lesson Quiz/Pre-Assessment/Trial modes even after review | APPROVED / TO BUILD |
| LMS-004 | ASP Mock timer = EXACTLY 300 minutes / 5 hours | Server authoritative start/deadline, autosave, resume, idempotent auto-submit, final duration cannot reset on refresh | APPROVED / TO BUILD |
| LMS-005 | Adaptive begins Low, promotes to Medium only at current tier >=70% correct, then High at Medium >=70% | Cumulative current-tier correct/attempted after internal checkpoint; below threshold remains same tier; dynamic distribution; no repeated questions | APPROVED / TO BUILD |
| LMS-006 | Attempt count equals requested eligible count | Avoid duplicates; if pool/exclusive exclusion causes shortage, show deterministic eligibility or fallback before launch | APPROVED / TO BUILD |
| LMS-007 | Practice answers are shown per selected reveal policy; formal mock does not leak answer key during exam | Server-only marking, snapshot, no correct-choice indices in pre-answer client payload | APPROVED / TO BUILD |
| LMS-008 | Filters New/Answered/Flagged/Incorrect may overlap | Deduplicate IDs, consistent union/intersection rule, correct available counts scoped to learner, course, entitlement and non-exclusive pools | APPROVED / TO BUILD |
| LMS-009 | Reading/images/PDF completion requires content coverage; video requires watched intervals and end event (seek alone insufficient) | Per-user idempotent server events, separate Viewed/Completed/Passed | APPROVED / TO BUILD |
| LMS-010 | Dashboard scores = actual correct/answered, by domain/topic; duration = actual attempt timing | No fake community average; avoid unsupported readiness claim | APPROVED / TO BUILD |
| LMS-011 | Subscription/trial enforced by server-issued entitlements | Expiry, refunds, course access, paid media links, no self-granted role | APPROVED / TO BUILD |
| LMS-012 | Certificates later | Assignment upload, evaluation, admin approval and platform credential; not BCSP-issued | FUTURE |

### Boundary examples for future regression tests
- 7/10 = 70% -> eligible for promotion after sufficient checkpoint; 6/10 = 60% -> remain.
- 13/20 = 65% -> remain; 14/20 = 70% -> promote.
- 20 Low at 60%, plus 10 Low at 90% -> cumulative 21/30 = 70% -> Medium.
- Reserved Mock question selected by any other pool -> reject/omit even if 'incorrect', 'flagged', or 'previously answered'.
- A 200-question mock at 300 minutes should not be clamped by legacy demo Assessment's 50-question / 180-minute limit.
- Lesson video seek-to-end with no watched duration -> incomplete.

### Change discipline
Every new calculation, denominator, filter, question selection, time policy, entitlement rule or scoring change must add a test and record old/new rule, acceptance and evidence. Existing local demo script results alone do not prove server security.

| LMS-013 | P4 Practice: private question keys; only APPROVED & non-Mock eligible; 10 Q Quick 10, 25 Q / 1200s Timed, 1–50 Custom and Domain | SERVER-RPC backed in staged source; restricted JWT + RLS; disposable PG negative tests; LIVE SUPABASE deployment/SME approval pending | P4 STAGED |
| LMS-014 | Quick 10 feedback only after server stores an answer; after feedback choice is immutable. Other P4 modes reveal answers only after final submission; deadline evaluated at database | P4 save/finish functions and RLS regression, real Supabase JWT testing pending | P4 STAGED |
| LMS-015 | Keep ASP imported bank DRAFT, unmapped and unclassified until SME approves; never silently mix 5 old groups into 9 domains; reserve mock-exclusives before activation | 1625-row importer validates all source IDs, dry run default, no overwrite; approval workflow pending | P4 STAGED |

| LMS-016 | Practice and Assessment question entry requires native fullscreen triggered by the user's Start gesture on supported browsers; loss of fullscreen/hidden tab closes questions and returns to setup. Unsupported browser must fail closed without pretending OS capture prevention. | Demo: shared fullscreen guard, Start button integration and browser Esc/exit regression; Live: own Practice fullscreen, no auto-resume on reload | P5 SOURCE / STAGING REQUIRED |
| LMS-017 | Live exited fullscreen attempts are server-sealed as abandoned and their snapshots are never returned by payload/finish; this is a client-reported event, NOT secure screen-state attestation. | Additive P5 migration + authenticated JWT ownership + disposable PostgreSQL negative tests. Real Supabase staging and delayed-network closure QA still required. | P5 SOURCE / STAGING REQUIRED |
| LMS-018 | Secure question watermark in Supabase Live uses authenticated user ID + session token + UTC minute, no demo account import; copy/print remain deterrence, OS capture and camera not prevented. | Isolated live entry + P3 bundle leak test; manual Chrome/iOS/Android capture acceptance must disclose hard limits. | P5 SOURCE / STAGING REQUIRED |


| LMS-019 | P7 Live Admin authoring: default Admin Courses/Builder use real Supabase P1 Course→Domain→Topic→Lesson IDs; Create/Save requires verified Admin, new Course/Lesson as Draft, no auto-delete/publish/Demo import or local-storage fallback. | P7 source and disposable PostgreSQL Admin writes/learner denial, followed by real Supabase JWT/Cloudflare staging acceptance. | P7 SOURCE / STAGING REQUIRED |


| LMS-020 | Adaptive Level Up: selected N=1–50 questions; tier checkpoint min(N,max(3,ceil(.20N))); at current tier (Low→Medium→High), cumulative correct/answered ≥70% after checkpoint promotes once, otherwise remains. At perfect accuracy N=10→3/3/4, N=25→5/5/15, N=50→10/10/30. No client-driven grading, tier skipping or demotion. | Source policy + P8 staged protected RPC; disposable PostgreSQL thresholds/recovery, same-tier pool guarantee, Mock exclusion; actual Supabase staging and production migration pending. | HISTORICAL P8 BASELINE; SUPERSEDED BY LMS-024 |
| LMS-021 | My Learning uses P1 authorized catalog and Course→Domain→Topic→Lesson tree and reads verified P2 progress only; opening lessons does not mark completed; no local Demo fallback. | Source contract and RLS staging acceptance; P2 progress ingestion still pending. | P8 SOURCE / STAGING REQUIRED |


| LMS-022 | After user-run P8 migration, verify RPCs/grants and per-course/domain approved Low/Medium/High question counts with SELECT-only SQL. Level Up quick card navigates to live JWT-gated P8, preflight scoped to current N/domain; no stale success or Demo fallback. | `supabase/P8_VERIFY_READ_ONLY.sql` in disposable PG and owner-confirmed Supabase SQL Editor; Practice/Chromium source contract. | SOURCE IMPLEMENTED / LIVE VERIFICATION REQUIRED |

| LMS-023 | P9A bank release preflight is Admin-only/read-only; review READY does not mean P4 approved; exactly 200 Mock-exclusive flags alone do not prove a versioned Mock form; never publish/approve automatically. | `lms_p9a_release_preflight` staged protected aggregate RPC; no bank writes; role-denial/zero-mutation PostgreSQL smoke and fail-closed browser adapter; real STAGING JWT verification pending. | P9A SOURCE / STAGING REQUIRED |

| LMS-024 | **HISTORICAL P8d rule (SUPERSEDED by LMS-025)** — Level Up exists ONLY in Practice. Chosen N=1..50: ideal balanced thirds Low=max(1,floor(N/3)); Medium=max(1,floor((N-Low)/2)) when remaining; High=remainder. N=30 ideal 10/10/10. To leave Low/Medium, answer minimum own-tier target AND have cumulative correct/answered >=70%; below 70% keeps fetching new SAME-tier questions; stop EXACTLY N regardless of attained tier. No stage change revealed during attempt. | `202611040003_p8d_adaptive_thirds.sql` staged migration; new attempts persist Low/Medium gates, old P8 attempts retain original gates; P8d read-only SQL audit and Node/PostgreSQL tests for N30 6/10 failure, 10/14 recovery, Medium 7/10, all-Low cap, secure server-only grading; live JWT/Cloudflare pending. | HISTORICAL / SUPERSEDED BY LMS-025 |

| LMS-025 | **Owner-locked P8e fixed correct target, Level Up Practice ONLY:** N=30 ideal 10 Low/10 Medium/10 High. Each tier (Low and Medium) requires >=10 answered AND **7 total correct** based on ORIGINAL 10 baseline. After 6/10, one correct at Q11 => 7/11 promotes; further wrong responses never increase required correct count. General B → ceil(B×70%); extra attempts consume fixed total N. Stop at exactly N regardless of stage, hidden transitions, server-only scoring, no Mock inclusion. | `202611040004_p8e_fixed_correct_target.sql` staged versioned state; P8/P8d in-flight remain unchanged; Node/PG 7/11, 7/12, Medium 7/11, cap 30, RLS, query privacy; `P8E_VERIFY_READ_ONLY.sql`; live JWT staging pending. | LOCKED / SOURCE IMPLEMENTED / STAGING REQUIRED |

| LMS-026 | P9B: before any ASP Practice publication, explicitly reserve EXACTLY 200 individually vetted, rights-verified, approved-answer, ASP11-classified, stable **DRAFT** question IDs in a versioned immutable private Mock form. IDs are permanently excluded from all Practice/Level Up. After this, approve only ONE non-Mock reviewed question by a second active Admin distinct from original reviewer; audit every reservation/approval; no import or bulk release. The reserved form does NOT activate a Mock exam. | `202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql`, human-selected 200 UUIDs, server protected preflight/reservation/one-question approval, strict UI double confirmation, Node and ephemeral PG role/rights/immutability/mock-exclusive tests; actual Supabase staging installation + signed JWT pending. | P9B SOURCE IMPLEMENTED / OWNER-AUTHORIZED STAGING REQUIRED |
