# P9D.1 — Private ASP2500 dry-run importer and offline Supabase reconciliation

Status: **IMPLEMENTED AS STRICT DRY RUN ONLY**. There is **NO apply or database-write mode**. Real Supabase content counts are unknown until the owner exports a read-only fingerprint CSV and compares it locally. Do not commit the workbook, SQL CSV or question content in public GitHub.

## Exact source intake

Original user-private file: `ASP_Question_Bank_2500_Simplified (1).xlsx`, source SHA256 `37def22d09ee2deacd5352bd9f6ffaf7ef55fbda1fd798ea456a6690939c24d5`. Nine ordered worksheets `Domain 1`–`Domain 9` with counts **250/625/200/300/250/300/175/275/125**; grand total **2,500**. Each sheet has exactly seven headers: `Question, Option A, Option B, Option C, Option D, Correct Answer, Explanation`. This does NOT prove licensed rights, official ASP11 Domain classification, question accuracy, academic level, question-reference citation or readiness for production.

The new standalone script `scripts/asp2500_dryrun.py` uses ONLY Python standard library to read ZIP/OOXML. It rejects wrong SHA, sheet/header/count mismatch, missing any of the seven fields, invalid A/B/C/D key, duplicate answer options, normalized duplicate question prompts, Excel formulas and oversized archives. Correct answer keys and proprietary prompts never appear in stdout. It creates stable provisional **`ASP2500-<sha256(normalized prompt)>`** IDs in private process memory only (not committed or published). It does not add or change P4 `lms_questions`, P6A reviews, source references, P8e attempts, P9B Mock forms or any other DB content.

## 1. Source-only private dry run (NO database data needed)

Keep the workbook **OUTSIDE the GitHub repository**; all commands run on the owner's local machine with Python 3.11+ from the cloned Technica repo:

```bash
python3 scripts/asp2500_dryrun.py \
  --source "/PRIVATE_PATH/ASP_Question_Bank_2500_Simplified (1).xlsx" \
  --report-out "/PRIVATE_PATH/asp2500-source-summary.json"
```

On Windows PowerShell, use `py scripts/asp2500_dryrun.py --source "C:\private\ASP_Question_Bank_2500_Simplified (1).xlsx" --report-out "C:\private\asp2500-source-summary.json"`.

This output contains **AGGREGATE COUNTS ONLY**, including source SHA, nine sheet counts and `comparison_mode: SOURCE_ONLY_NO_DB_SNAPSHOT`. The actual number of imported records on Supabase must NEVER be inferred from this source-only result. The original five-group 1,625-question `scripts/import-asp-p4.mjs` is **not** suitable and is untouched.

## 2. Actual Supabase comparison: separate SELECT-only CSV export

In the **confirmed Technica LMS project**, after verifying all P9C CORE_REQUIRED P4/P6A schemas are present, open:

`supabase/P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql`

Run it as a SELECT only in Supabase SQL Editor. It returns one row per existing ASP P4 `lms_questions` record with:
- `snapshot_version=P9D1_V1`, `course_slug=asp`, existing source_id;
- SHA256(normalized question prompt), SHA256(normalized 4 options + **zero-based correct index**), SHA256(normalized explanation);
- approval_state (draft/approved/archived), mock_exclusive and ever_attempted boolean.
- **Never** actual question prompts, options, correct answers, explanations, reviewer names/emails, learner records, role keys or session tokens.

Export Results as CSV **to a private local folder** (e.g., `C:\private\technica.p9d1.snapshot.csv`). **Do NOT upload CSV to GitHub, chat, an untrusted third-party service, or public file-sharing.** The hash export is sensitive metadata and is intended for local-only comparison. It does not need any service-role key and has no writes.

## 3. Compare source against real P4 records locally

```bash
python3 scripts/asp2500_dryrun.py \
 --source "/PRIVATE_PATH/ASP_Question_Bank_2500_Simplified (1).xlsx" \
 --existing-snapshot "/PRIVATE_PATH/technica.p9d1.snapshot.csv" \
 --report-out "/PRIVATE_PATH/asp2500-db-diff-summary.json"
```

Only report **aggregate counts** can be shared. Every source question is classified into one of:
- `NEW_DRAFT_CANDIDATE`: no matching existing `source_id` or normalized prompt fingerprint, NOT permission to import;
- `EXACT_DUPLICATE_PRESERVE_EXISTING`: question, options, keyed answer and explanation fingerprints match; preserve existing row even if it is approved, attempted or reserved;
- `ANSWER_OR_OPTIONS_MISMATCH_REVIEW` or `EXPLANATION_MISMATCH_REVIEW`: same question, different underlying source fields; DRAFT/unreserved/unattempted only, require manual SME decision;
- `PROTECTED_CONTENT_CONFLICT_STOP`: same prompt but changed answer/options/explanation AND existing is approved, archived, Mock-exclusive or attempted. **Do not overwrite.**
- `SOURCE_ID_COLLISION_STOP`: same source ID associated with different normalized question content; require investigation;
- `DUPLICATE_DB_PROMPT_REVIEW`: existing ASP DB contains multiple rows with the same normalized prompt hash; cannot choose arbitrarily.

**No import, draft insertion, auto-approval, classification, backfill, Mock reservation or production update** is possible through this CLI. Manual reviewer decisions and separate owner approval are required before designing the P9D.2 private staging importer.

Important limitation: SHA256 matching supports deterministic **exact normalized text** matching. It cannot reliably detect near-meaning duplicates, translated/rephrased versions, wrong answer keys, poor question quality or infringed copyrighted material. Differences in PostgreSQL vs Python Unicode lower/whitespace normalization require manual review, not auto-update. No sensitive records are displayed in terminal.

## 4. Validation and locked policies

- `npm run test:p9d1` creates **synthetic** 2,500-question, nine-sheet workbook in a disposable temp directory. It tests exact rows/header/hash validation, source-only mode, invalid pinned checksum, duplicate/mismatch/protected/conflicting existing snapshot cases, no live network/db connector, sensitive-output avoidance and strictly SELECT-only SQL export.
- P9C/P9C.1 original read-only SQL and P4/P6A/P8e/P9B security tests remain in GitHub Actions.
- Local actual workbook source-only verification: SHA256 matches; 2,500 question rows, exact sheet counts, zero normalized duplicate prompts and no empty required fields.
- **P8e invariant:** Level Up is ONLY Practice. N30 ideal 10 Low/10 Medium/10 High; move after **7 correct out of original ten** for Low and Medium, fixed even when more questions are attempted, cap 30; no Mock inclusion.
- **P9B invariant:** exactly 200 individually rights-/answer-/domain-verified DRAFT questions must be reserved in a versioned exclusive Mock form, then a separate second Admin may approve only one other reviewed non-Mock Draft at a time. P9D.1 **does neither**.
- Prior demo bank: 1,625/FIVE historical groups remains untouched; new candidate: 2,500/NINE worksheets, provisional domain association only, unclassified difficulty and non-verified rights.

## 5. Go/no-go

This phase can be **source/CI-ready** even while real comparison is **PENDING**. The actual DB fingerprint CSV must come from the owner's separate read-only SQL Editor run; there is no authenticated Supabase integration in the current connected tools and no production data should be guessed from GitHub. If `P9D1` reports conflicts, collect only aggregate summary and decide separate manual remediation. Do not use a service-role key or enable an `--apply` mode without a newly reviewed staged migration, backup and explicit owner authorization.
