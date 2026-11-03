# P4/P5 — Safe staging verification and release decision

Date: 2026-11-03 (Africa/Cairo). **Scope: READ-ONLY CATALOG AUDIT + CI regression.** No live database was queried through the repository and **no production schema/data/deployment is changed**.

## Confirmed source evidence

- P4 SQL: `supabase/migrations/202610310003_p4_secure_practice.sql` — 3 protected tables, 5 server practice RPCs and the scope trigger; scripts are for manual staging migration only.
- P5 SQL: `supabase/migrations/202611030001_p5_fullscreen_attempt_exit.sql` — state `abandoned`, auth-scoped abandonment RPC, modified payload redaction.
- CI P1/P2/P4/P5 disposable Postgres smoke is **source-level/ephemeral test evidence**, not evidence of installation in the user's Supabase project.
- User previously reported P1/P2 applied. Their live project ID, schema/migration history and active RLS status are **NOT INDEPENDENTLY VERIFIED**. P4/P5 live installation remains **UNKNOWN**, not PASS.

## Step 1 — SQL catalog audit, zero writes

1. Open the **dedicated Technica LMS STAGING** project in Supabase Dashboard. Independently confirm project name/ref and SQL Editor target. Do not use CHEIRON or any production project.
2. Copy the entire `supabase/P4_P5_VERIFY_ALL_READ_ONLY.sql` and run in SQL Editor. The file is exactly **one SELECT statement** and references catalog metadata only. It is safe if P4 or P5 tables/functions are missing: the result identifies them as MISSING.
3. Review/copy its four columns `phase`, `object_name`, `status`, `details`. No emails, questions, answers, service keys, passwords or row-level content are returned. Do not share secrets or screenshots containing credentials.
4. `ENV / REVIEW` means the database name is informational only. Verify the actual project ref by the Dashboard URL; no SQL query proves that it is the right project.
5. `P1/P2 / PASS` indicates the **essential prerequisite tables exist with RLS on**; it does not mean all P1/P2 API flows pass. `P4 / PASS` means the **catalog** shows required tables, private browser grants, functions, index and trigger footprint. `P5 / PASS` means the catalog shows abandoned-state constraint, RPC grants and installed payload-redaction source guard.
6. Any `MISSING` = do not run live Practice. Any `FAIL` = stop; do not publish or grant paid access. An all-PASS catalog result is **not production acceptance**.

The old `P4_VERIFY_READ_ONLY.sql` and `P5_VERIFY_READ_ONLY.sql` remain available for detailed follow-up **after their migrations are confirmed**. Those old queries may fail if the corresponding tables are not installed; start with the new unified verifier.

## Step 2 — Only if staged migrations are absent

No migration is authorized as part of this verification task. With **explicit owner approval**, a verified database backup and the correct STAGING project:
- Confirm P1 + P2 first. Apply P4 exactly once if missing; migration intentionally rejects duplicate/conflicting schema.
- Run the unified verifier again. Apply P5 **only after P4** if missing; it intentionally refuses duplicate application.
- Re-run the verifier and the existing P4/P5 read-only checks.
- Never run P4/P5 against production as an exploratory test. Never modify CHEIRON.
- If catalog reports partial installations, **investigate rather than forcing or rerunning SQL**.

## Step 3 — Real Supabase JWT/API and browser acceptance (not performed here)

After owner-approved staging installation:
- Accounts: verified admin, paid learner A, learner B, trial-only learner and anonymous session. Validate real sign-in, published ASP course, separate entitlements and RLS direct REST checks.
- P4: A can start only approved non-mock Quick10/Timed25/Custom/Domain; B/anonymous/trial/expired/unentitled cannot access A's attempt or answer keys; no private table direct `SELECT`; no `correctIndex` in unsubmitted payload; server stores immutable Quick10 answer and grades other modes at finish. Check zero approved bank: start should reject rather than invent questions.
- P5: fullscreen starts before exposing any live question. Exit/Esc/background/reload locally hides questions; on successful online abandon, both payload and finish return an empty question array. Test stale requests, duplicate exit and cross-user abandon denied. On offline exit, delayed server abandonment is **known risk**.
- Browsers: desktop Chrome/Edge, actual Android Chrome, iPad Safari and actual iPhone (WebKit lacks arbitrary element fullscreen; currently **intentionally blocked**, not supported). Verify calculator input, accessibility, navigation, keyboard and previously approved Demo/Practice behavior.
- Security: native screenshots, recorders and external cameras **cannot be blocked universally** by React fullscreen/Watermark/shortcut handlers. No claim of certified device lockdown or video DRM.
- Release: do not deploy `VITE_DATA_MODE=supabase` paid frontend/turn on paid content until staging JWT tests, ASP question review and owner sign-off are complete. Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser/CI logs/chat.

## Results template

Record: **Project ref (partial/masked), environment STAGING, date, SQL audit output, source commit, JWT negative/positive cases, browsers, unresolved issues, GO/NO-GO**.

Release verdict as of this document: **NO-GO for paid production**. Source CI passing is separate from live Supabase verification. No active migration, staging/production configuration or Cloudflare deployment performed.

## Rollback and no-regression impact

This kit adds one read-only SELECT and an ephemeral-CI assertion; no application UX, ASP IDs, question answers, storage, account state, RLS policies or production SQL are modified. Roll back by reverting the kit commit/PR if needed. Any later live migration needs its **own** backup, change-control approval and recovery plan.
