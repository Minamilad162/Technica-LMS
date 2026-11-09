# P50 — Technica new database schema/security audit (2026-11-09)

Target account: **Technica Account**, project `klmwiivitgbyjbynxwbg`. The old database and live frontend remain unchanged. Do not seed or transfer users, courses, questions, attempts, subscriptions or media yet.

## Applied migration ledger

25 original repository migrations were applied to a clean instance. **Do not apply** `202611080002_p28_2_forward_upgrade_existing.sql` to this fresh installation: the initial P28 already has the 7-argument bank-list RPC and P28.2 rejects the new installation as designed. Subsequently applied `p50_schema_security_audit` (26th ledger entry).

IMPORTANT: Remote migration tool records application-time version identifiers, not the original repository filename timestamps. Before later CLI migration pushes, reconcile the source-version-to-remote-ledger mapping; do not blindly replay source migrations, and do not manually rewrite the remote ledger without a separately reviewed migration-repair plan.

## Read-only validation

- 35/35 public tables have RLS enabled; 80/80 public indexes valid/ready.
- 236 constraints, and now 0 unvalidated; P17 cover-path check was NOT VALID on a newly empty course table and P50 explicitly validated it.
- P50 revoked generic execution of Supabase's `public.rls_auto_enable()` event-trigger function from PUBLIC/anon/authenticated. `ensure_rls` event trigger remains enabled. The external security advisor's anonymous SECURITY DEFINER warning went from 1 to 0.
- P28 seven-argument admin list function and P44 configured practice engine exist.
- P14 private lesson bucket is private; public course-covers bucket is intentionally public. Private bucket has no direct authenticated storage.objects policy.
- Internal trigger/finalizer functions are not exposed to anon/authenticated; LMS SECURITY DEFINER callable RPCs are not available to anonymous clients.
- No users/courses/questions/practice attempts/subscriptions were written.
- Supabase Security Advisor still reports 21 RLS-without-policy INFO (many are intentionally RPC-only), and 72 authenticated SECURITY DEFINER WARN. These should be validated against actual authenticated users on future staging QA; do not blanket-revoke their RPC access because the app depends on them.
- Performance advisor also reports 31 unindexed FKs, 6 sets of multiple permissive policies, and unused-index INFO on an empty database. Do not remove legitimate indexes based solely on unused statistics.
- `technica-lesson-media` Edge Function is NOT deployed in this new project; browser end-to-end lesson upload, auth and signed playback QA remains pending. Do not switch frontend env vars yet.

## Release gate

New schema and DDL checks PASS; authenticated cross-user/RPC/browser security remains UNVERIFIED without test users. Before frontend cutover: deploy Edge with correctly scoped allowed origins + JWT verification, validate live Auth/RLS/session isolation, settle repository vs remote migration-version drift, then migrate authorized data in a separate guarded operation. Keep old production independent.
