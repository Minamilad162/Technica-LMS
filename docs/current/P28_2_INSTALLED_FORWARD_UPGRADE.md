# P28.2 — Safe forward upgrade for already-installed P28

**Status (2026-11-08): Source SQL/CI only, not remotely executed.** Owner's Supabase read-only screenshot confirms:
- `lms_p28_import_bank(uuid,jsonb)`: installed.
- `lms_p28_list_bank(uuid,text,integer,integer)`: installed.
- `lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)`: missing.
- `lms_p28_attach_lesson_question(uuid,uuid,boolean)` and the quiz/bank protection triggers: installed.
- P28 base installer now aborts with `P28 already installed or conflicts; do not replay`: correct safeguard, **not a signal to reinstall or delete objects**.

## Correct action and protections

Only apply `supabase/migrations/202611080002_p28_2_forward_upgrade_existing.sql` AFTER checking the real Technica environment, recorded migration versions, backup and the installed objects above. Do **not** re-run any P1/P4/P9B/P22/P28 initial migration and do not drop the original P28 RPC or any source question table. The file wraps changes in a transaction and stops before writes if mandatory objects are missing or the 7-argument function already exists.

This is a source-level migration proposal to be reviewed and explicitly run by the owner on the intended development/staging database, not automatically on production.

It performs three function-only changes:
1. `CREATE OR REPLACE FUNCTION lms_p28_import_bank(uuid,jsonb)`: preserve **Admin-only, idempotent Draft import**, but accept an optional `difficulty` value (`unclassified`, `low`, `medium`, `high`). Imported ASP still requires P6A rights/answer/domain review and independent P9B Practice approval. This import does **not** approve questions or reserve Mock items.
2. `CREATE FUNCTION lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)`: a **7-required-argument** Admin-only overload for real Course/Domain/Difficulty/Usage filters. The existing **4-argument** function remains intact to preserve old client compatibility. No `DEFAULT` args on the new overload, avoiding ambiguity in PostgreSQL function resolution.
3. `CREATE OR REPLACE FUNCTION lms_p28_guard_quiz_link()`: strengthens the existing trigger to block new standalone Lesson Quiz rows and silent reassignment/unlinking of linked source IDs. **Existing standalone P22 rows remain**, including editing the historical rows, with no answer/grade rewrite.

**Explicitly not changed:** existing `lms_questions` content, answers, sources, `mock_exclusive`, `approval_state`, P9B immutable 200 ASP reservations, P10 Mock engine 300 minutes, P4/P8e Practice selection, user subscriptions, learner quiz results, P22 quiz rows or question metadata. No data migration/backfill, no publishing, no destructive `DROP`, no guessed ASP domain mapping.

## Read-only preflight on the intended Supabase SQL Editor

```sql
SELECT
  to_regclass('public.lms_p22_lesson_quiz_questions') IS NOT NULL AS p22_present,
  EXISTS(
    SELECT 1 FROM pg_attribute
    WHERE attrelid=to_regclass('public.lms_p22_lesson_quiz_questions')
      AND attname='bank_question_id' AND NOT attisdropped
  ) AS p28_link_present,
  to_regprocedure('public.lms_p28_import_bank(uuid,jsonb)') IS NOT NULL AS p28_import_present,
  to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NOT NULL AS p28_old_present,
  to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NULL AS p28_new_missing,
  to_regprocedure('public.lms_p28_attach_lesson_question(uuid,uuid,boolean)') IS NOT NULL AS p28_link_function_present;
```

All columns should be `true` before running P28.2 on the correct staging DB. Record baseline counts in `lms_questions`, `lms_p9b_mock_items` and `lms_p22_lesson_quiz_questions` and confirm a DB backup/migration ledger snapshot. Never infer an applied version solely from a file name.

## Post-install read-only checks

```sql
SELECT
  to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NOT NULL AS old_client_rpc_retained,
  to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NOT NULL AS filtered_rpc_added,
  to_regprocedure('public.lms_p28_import_bank(uuid,jsonb)') IS NOT NULL AS import_rpc_retained,
  EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgrelid=to_regclass('public.lms_p22_lesson_quiz_questions')
      AND tgname='lms_p28_quiz_link_guard' AND NOT tgisinternal
  ) AS quiz_guard_retained,
  NOT has_function_privilege('anon',
    'public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)','EXECUTE')
  AS anon_cannot_read_answers;
```

Expected: every flag `true`. The same baseline question/reservation/lesson counts must be preserved. Only after owner runs SQL and a signed-in Admin session verifies filtered Bank, ASP domain mapping and Lesson Quiz picker in a real browser may the new UI be considered live.

## CI reproduction

`scripts/fixtures/p28_legacy_installed_test_only.sql` contains the original immutable P28 installer **solely for disposable PostgreSQL CI**, not for Supabase. The workflow clones the P22 baseline into a disposable second database, applies the historical initial P28, then P28.2, and tests:
- existing Bank/Mock/Quiz row counts stay untouched during patch;
- old 4-argument API still works alongside the new 7-argument API;
- Admin-only/RLS/anon denial, Draft-only and correct proposed Difficulty on new synthetic upload;
- filtered Practice never leaks Draft/Mock, duplicate import is idempotent;
- new direct standalone Lesson insert denied, old P22 rows editable, and replay of P28.2 blocked.

**Deployment note:** GitHub CI does not imply Cloudflare deployment or that Supabase SQL is installed remotely; PR #70 remains a development branch until merged.
