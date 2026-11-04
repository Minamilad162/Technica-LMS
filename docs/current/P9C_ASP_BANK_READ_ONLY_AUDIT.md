# P9C — Real ASP question-bank read-only inventory & governance gate

**Created:** 2026-11-04 (Africa/Cairo) · **Scope:** Supabase SQL Editor on the confirmed Technica LMS project, **SELECT statements only** · **Owner production data never accessed or changed by this PR**.

## Why this stage is needed

Earlier P4/P6A/P8e/P9A/P9B implementations established protected code/migrations and disposable PostgreSQL fixtures. They do **not** prove that the real ASP course has 1,625 imported, licensed, individually reviewed source questions, an approved practice pool, or the exactly 200 committed Mock form. The real user's Supabase UI previously showed `main — PRODUCTION`; do not apply P9B or importer operations merely to inspect the bank.

P9C is an owner-executable **read-only audit kit**, not a database migration, role grant, remote procedure or auto-classification. The SQL returns only aggregate totals/statuses, with no question body, answer key, options, source IDs, reviewer notes, user IDs/emails or secrets. Queries include no BEGIN/COMMIT, DDL, DML, RPC writes or cross-project network connections.

## Owner execution order

1. Confirm SQL Editor project is **Technica LMS**; inspect `main — PRODUCTION` banner before every run. **Only read-only SELECT audits are allowed here.** Do not paste migration SQL, a service-role key, or a secret.
2. Run `supabase/P9C_SCHEMA_PREFLIGHT_READ_ONLY.sql` FIRST. This queries PostgreSQL catalogs only. All `CORE_REQUIRED` rows must show `PRESENT` for P4/P6A inventory to work. `ADAPTIVE_POLICY` should show P8e available, but no assumptions are made about whether P9A/P9B were deployed.
3. If a CORE_REQUIRED prerequisite is MISSING, STOP and report its component name. Do not install anything as part of P9C. If only OPTIONAL_GOVERNANCE (P9A/P9B) is missing, continue safely.
4. Run `supabase/P9C_ASP_BANK_AUDIT_READ_ONLY.sql` second. It is ONE SELECT statement and works **with or without P9B installed**. Read and share aggregated result rows for:
   - `00_CONTEXT`: exactly one real ASP course.
   - `01_SOURCE`: actual imported count vs historical 1,625 five-worksheet reference; source ID consistency, old group labels, normalized-prompt duplicates. *Reference count differences are diagnostic only, not authorization to import or delete.*
   - `02_STATUS`: Draft/Approved/Archived.
   - `03_REVIEW`: missing human reviews, answer and commercial rights unchecked, invalid/unclassified domains/difficulties, vetted Drafts. A P6A `ready` declaration is **not** P4 approval or legal rights certification.
   - `04_CONTENT`: missing source references/explanations, option/answer-index structural violations (count only).
   - `05_ASP11`: nine official ASP11 domains and mismatched titles; five legacy worksheets must NEVER be auto-mapped to the nine domains.
   - `06_PRACTICE`: **actual runtime eligible** approved non-Mock vs more strictly **governance-verified approved** (same matching official domain/difficulty, correct/rights reviewed). Approved gaps may mean questions are technically visible but not governance-safe, so investigate first.
   - `07_MOCK`: Mock flags, used-in-Practice conflicts, vetted unused Draft candidates (target 200), OPTIONAL P9B schema presence. **200 flags alone are NOT a versioned reservation.** Absence of P9B does NOT break this audit.
   - `08_TIER`: all-course Low/Medium/High runtime and strict governed counts, with conservative **30 eligible approved per tier** for a learner choosing 30 Level Up questions.
   - `09_DOMAIN`: nine official domains × three difficulty tiers = 27 rows per metric for approved and reviewed candidate pools, including domain-scoped 30-question Level Up readiness. Per-domain thresholds are not a requirement to make every individual domain playable at N30; they indicate whether a 30-question domain-scoped Level Up session can be started.
5. `supabase/P9B_VERIFY_READ_ONLY.sql` is an **optional separate** form-integrity audit and should be run ONLY when P9B forms have actually been installed; it examines the exact 200-row reserved form count and exclusion flags. P9C's base report does not touch absent P9B tables.
6. Capture the full SQL result as a private, dated evidence record including database environment label, verification time and row counts. For a follow-up in chat, provide only aggregate rows (no actual question prompts, correct choices, user identities or secrets). Use evidence to plan manual SME classification and separate owner-approved reservation/approval later.

## Report semantics and no-go rules

`PASS` is structural pass ONLY, not professional accuracy, ownership, license or production launch approval. `INFO`/ `REFERENCE_ONLY` describe inventory. `NOT_INSTALLED` for optional P9B indicates **do not claim Mock is reserved**. `CANDIDATES_ONLY` means only a possible manually curated set, not preselected/approved. `POOL_COUNT_OK` means the live engine's eligible item count exceeds a threshold, while `COUNT_ONLY_OK` additionally verifies matching P6A review metadata; neither evaluates difficulty calibration or question correctness independently. `SHORTAGE`, `BLOCKER`, or `REVIEW` require an explicit later human decision and owner-approved changes, not SQL repair inside this audit. `FLAGS_ONLY` means NOT that a valid 200-row form exists.

The **Level Up invariant remains P8e**: e.g. N30 ideal 10 Low/10 Medium/10 High; after at least ten Low questions, 7 total correct is the FIXED promotion target even if extra questions are used; session ends by 30. P8e pool preflight conservatively requires at least N approved non-Mock items **in EACH tier** because a learner can remain Low for all N. P9C merely measures that pool; it NEVER updates the policy or answers.

## Verification and CI

- `npm run test:p9c` asserts both SQL files contain a single SELECT-only query, no DDL/DML/role changes, no direct sensitive output, that P9B optional references never require its tables, and contract coverage for source/review/rights/ASP11/Mock/P8e gaps.
- `scripts/test-p9c-postgres-smoke.sh pre` executes BOTH queries against synthetic disposable PostgreSQL after P9A, BEFORE P9B exists, confirms core schema and optional P9B absence are handled safely, all 27 ASP11 domain/tier groups exist, historical 1,625 is informational, and compares private data fingerprints before/after read.
- `scripts/test-p9c-postgres-smoke.sh post` runs after synthetic P9B installation/reservation/one Practice approval, confirms optional P9B detection and exactly 200 Mock flags without claiming Mock activation, and verifies fingerprints unchanged.
- Existing P1/P2/P4/P5/P6A/P8e/P9A/P9B full Node/build/security suites remain mandatory. Real Supabase DB values are **NOT** retrieved by GitHub CI or this PR.

## Next controlled work after audit

Reconcile actual source import counts, crosswalk 5 legacy groups to 9 official ASP11 domains with a qualified SME, inspect real rights/answer/reference evidence, curate exactly 200 genuinely reviewed unused source IDs for Mock, run P9B in specifically authorized staging (if appropriate), then separately approve eligible Practice questions with an independent Admin. P10 200-question/300-minute Mock engine is distinct and future. No production DDL/DML, migration, import, publishing, reservation, learner role changes or Cloudflare deploy is included in P9C.
