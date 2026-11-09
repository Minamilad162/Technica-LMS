# P51 — Authenticated-only P44 payload ownership guard and checks

Target: **Technica Account** `klmwiivitgbyjbynxwbg` on 2026-11-09. The original/old LMS database, site credentials, and learner/admin records are unchanged.

## SQL

`supabase/migrations/202611090003_p51_p44_attempt_ownership_guard.sql` was applied in the remote ledger as `p51_p44_attempt_ownership_guard`. It only updates the `lms_p44_payload(uuid)` RPC. Previously, this SECURITY DEFINER function queried private `lms_p44_custom_config` by an unscoped attempt ID and raised a different error when absent, before calling the P4 authorization-enforcing payload. The new function checks `auth.uid()`, joins the attempt to its owner, and rejects missing or foreign IDs identically with `Attempt unavailable`; it then delegates to the unmodified P4 payload (retaining all entitlement, key-hidden-while-active, scoring, and ownership logic). No changes to attempt configuration fields or mock/practice calculations.

Explicit EXECUTE: `authenticated`, `service_role`; `PUBLIC` and `anon` revoked. Note service_role is backend-only.

## Verified

- GitHub CI for P50 commit `0b5d184876fa7ca545d7f511791018a9aad0b71a`: **success**.
- Simulated `authenticated` without JWT: `auth.uid() = NULL`, `lms_p1_actor_is_admin() = false`, visible profile/subscription rows = 0, and no direct SELECT grant on `lms_questions`.
- Simulated `anon`: neither filtered bank-answer RPC nor configured-practice payload callable, and direct `lms_questions` SELECT denied.
- P51 simulated `authenticated` missing/no-session attempted payload correctly raises `Attempt unavailable` in a **read-only** transaction; owner-filter function body and grants independently inspected.
- 35 public tables all have RLS; 80 valid indexes; zero invalid constraints/FKs. Auth signup trigger remains present. P14 private bucket private; P17 course cover public by design.
- All tests performed without inserting users, questions, courses, subscriptions, media or attempts. Actual cross-user auth-session comparison remains **unverified** because there are no users in new project.
- Current new project has no deployed Edge Functions, including `technica-lesson-media`. Do not claim PDF/video upload integration works or cut over frontend. Allowed origin secret and signed-session browser QA are release gates.

## Migration ledger caveat

The remote MCP `apply_migration` assigns timestamps at application time; it does NOT use the filename's version as `version`. Ledger counts now include P50 + P51 as independently recorded names. Never blindly execute `supabase db push` against new project until the source-to-remote migration ledger has been carefully reconciled. Fresh P28 contains the new 7-parameter catalog, so P28.2 is a **legacy-only forward upgrade** that must NOT be executed on the fresh DB.

## Remaining

Security advisors still list 21 no-policy RLS INFO (intentional RPC-only tables) and 72 authenticated security-definer WARN after P50; these must be reviewed by intended function behavior, not bulk revoked. End-to-end user authorization and Edge media uploads require a later separate staging/test process, with authorized existing data or dedicated temporary test accounts only when owner approves. No production migration/cutover now.
