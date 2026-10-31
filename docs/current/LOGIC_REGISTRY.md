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
