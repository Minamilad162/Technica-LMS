# P12.2 — Staging API Integration QA & Local Evidence Center

**State:** Source and synthetic CI only. The real Supabase Staging project, accounts and browser/device environments are **not connected** in this chat. The runner is **opt-in** and does not run inside public GitHub CI. **Production = NO-GO** until independently verified.

## Delivered feature

**Admin → Release Readiness → Staging Integration Evidence** is a compact, responsive panel within the existing Admin route `/release-readiness`. It accepts an aggregated local JSON result using a browser File input; it validates the strict `p12-staging-qa-v1` schema and fixed **19** QA cases, lists Pass/Blocked/Pending, and allows copying only approved summary information. **No file is uploaded to a database, browser storage, Cloudflare, GitHub or any external endpoint.** Importing evidence does not validate the evidence file's origin or authorize go-live. The surrounding Release Readiness verdict remains **NO-GO** unconditionally.

## Real staging API smoke (explicit owner-run only)

`scripts/p12-staging-e2e.mjs` is a Node **read-only API integration harness**, not a headless browser/camera/mobile automation. It uses only the **public Supabase anon key** and 4 dedicated, previously seeded, disposable **Staging Auth test accounts** with genuine Supabase email/password sessions:

- verified LMS Admin
- paid/manual ASP learner
- Trial ASP learner
- unentitled outsider

A fifth anonymous public client is checked without login. Four independent `auth.signInWithPassword` calls generate ordinary Auth sign-in audit events, but the runner performs **zero LMS table/RPC writes**. It does not sign up users, create privileges, import questions, start attempts, approve reviews, submit answers, reserve Mock items, alter progress, send emails or deploy anything. It must never receive any Service Role key.

The script refuses to initiate network requests unless ALL of these are supplied explicitly:

- `P12_STAGING_PROJECT_REF`: 20-character Supabase project reference.
- `P12_PRODUCTION_PROJECT_REF`: **known and different** 20-character Production project reference; refusing the same reference prevents obvious accidental Production access.
- `P12_STAGING_URL`: EXACT `https://<P12_STAGING_PROJECT_REF>.supabase.co` — no aliases, URLs ending in other domains or HTTP.
- `P12_STAGING_ANON_KEY`: public key only (never `service_role`).
- `P12_STAGING_ENABLED=YES_READ_ONLY` AND `--confirm-staging-ref=<P12_STAGING_PROJECT_REF>`.
- `P12_STAGING_{ADMIN,PAID,TRIAL,OUTSIDER}_{EMAIL,PASSWORD}`: four distinct existing staging logins with passwords (at least eight chars). Store in **private local shell/secret manager**, never in a committed `.env`, shell screenshots, chats or CI logs.

Example after setting those environment variables privately in Windows PowerShell:

```powershell
npm ci
npm run test:p12:staging
npm run qa:staging:read -- --confirm-staging-ref=$env:P12_STAGING_PROJECT_REF --report-out=.p12-staging-qa/staging.p12-staging-qa.json
```

The runner either exits **0** only when every staging API scenario passes or **2** on any Blocked/Pending (i.e., unready Staging). Missing guard/credentials/auth fails with code **3**. It prints aggregate counts, never token/source/question/user IDs and never details of raw Supabase exceptions. Private report is created with exclusive no-overwrite mode; `.p12-staging-qa/` and `*.p12-staging-qa.json` are Git-ignored. Export/import only sanitized JSON: `version, environment, scope, verdict, generatedAt, checks[]`. No cookies, JWTs, emails, names, underlying question IDs or source content.

## 19 independently named API scenarios

| Area | Safe, non-mutating real Staging verification |
|---|---|
| Auth (4) | Admin / Paid / Trial / Outsider genuine signed Supabase JWT, active P1 profile; verified actual Admin role |
| Learning (2) | Paid-accessible published ASP course and real Course → Domain → Topic → Lesson hierarchy |
| P2 (1) | Paid own-progress read endpoint available; no progress-event write |
| Practice (3) | Positive paid P4 entitlement + **negative** Trial and outsider Practice access |
| Question security (3) | Positive Admin protected P6A summary + negative Paid and Anonymous reviewer access |
| Mock (2) | Actual P10 versioned exclusive 200/300 readiness (without opening exam) + negative Trial Mock access |
| P11 (2) | Paid own-analytics aggregate returned (no answers) + negative outsider P11 access |
| RLS (2) | Paid direct questions read denied with positive nonempty Admin inventory; cross-user P2 isolation when the other account has a genuine existing progress row |

**Positive controls matter.** For example, an RPC missing for every account does **not** qualify as a negative Admin/Trial permission pass; the corresponding check remains Pending or Blocked. Missing real Mock-200 reservation results in **Blocked**, but this does not stop development or induce automatic source import. Cross-user P2 RLS remains Pending if no separate fixture row exists to make the negative check meaningful. The QA harness does NOT generate these fixtures. The P11 API report is only shallowly shape-validated in this harness; the signed-in learner page retains its stricter response validator, and real browser acceptance must verify it separately.

## CI and limitations

`npm run test:p12:staging` uses synthetic in-memory Supabase responses and exercises 19 scenarios, full/partial/blocked outcomes, real environment/Production reference guard, no-mutation behavior, no secret/identity payload output, strict imported JSON schema, foreign/elevated launch states rejected, the Admin evidence-panel integration, and the unchanged NO-GO. No actual Supabase network call occurs in CI.

**Not included in an API smoke:** browser navigation/clicks, OS screenshots, Fullscreen persistence, logout/redirect in iOS Safari/Android Chrome, payment/webhook execution, 5-hour timer real-time clock, media signing, CORS, network interruption, high concurrency and data recovery. These retain their P12.1 manual gates. End-to-end **write** tests of P2 completion, Practice answer auto-save and P10 five-hour Mock grading may only be performed on a separately explicitly authorized staging fixture environment and are NOT part of this read-only runner.

**Release decision:** NO-GO after any run. No automatic owner approval/deployment. Next safe work is actual Staging provisioning and device E2E when the owner provides dedicated environment authorization; no Production modifications.
