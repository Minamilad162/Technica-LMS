# P5 — Fullscreen Question Session & Authenticated Watermark
Date: 2026-11-03. Scope: React demo Practice/Assessment and Supabase Live P4 Practice.

## User-visible behavior
- On **Start** for Demo Quick 10, other Practice modes or an approved admin-configured Assessment, the user click requests real native browser Fullscreen before the first question opens.
- In Supabase Live Practice, the practice panel itself enters fullscreen before the question API is called. Only the question workspace is shown over the catalog.
- **Esc, browser exit-fullscreen action, moving to a hidden browser tab, or explicit Leave/Exit** closes the question view and returns to the previous Practice/Assessment setup screen. Pressing Back to re-open questions without a new Start is rejected.
- On supported browsers, if fullscreen permission is rejected, **do not start a quiz**. This is fail-closed to avoid claiming a protected exam while rendering a normal browser window.
- Native fullscreen for arbitrary interactive web elements is not supported consistently on iPhone WebKit; iPhone browser entry is intentionally blocked with a readable message. iPad/Desktop/Android compatibility still requires physical QA.
- The full-screen requirement is a **UI behavior gate, NOT an OS trust attestation**. A determined user with DevTools, browser modifications, external recording software or a second camera can still capture screen pixels; never claim otherwise.

## Demo continuity
- Both Demo Practice and Demo Assessment require fullscreen at their Start click, and quit via the shared route guard. A quit discards only the ongoing unsubmitted session, not prior scores, assessment history, saved course content, calculator or access rights.
- Intentional successful submit and timer expiry release fullscreen and navigate to the same existing results routes. Existing question count, ASP source IDs, 70% adaptive decision (not activated), 200/300 reserved Mock decision (not activated), calculator UI and grading remain unchanged.
- The existing browser-only ProtectedContent copy/print/shortcut/faint watermark remains a deterrent. It cannot stop OS screenshots.

## Live Supabase security
- P4's separate live entry remains isolated from local Demo ASP answer bank and sample passwords.
- LiveProtectedContent applies copy/cut/contextmenu/drag/print deterrence, a repeated authenticated-user-ID + browser session + UTC-minute watermark, and optional best-effort keyboard/focus curtain. No demo auth code is imported into the Supabase build.
- Native fullscreen is requested on the whole live Practice surface in the Start click; when the session ends/exits, content is hidden before rendering the setup. The browser client requests the trusted P5 abandonment RPC.
- Refresh or reconnection does NOT silently reopen unfinished questions. Stored attempt IDs are sealed/retried on next connection, rather than exposing them from localStorage.
- **P5 SQL (separate migration)** adds an abandoned state to lms_practice_attempts and a restricted lms_p5_abandon_practice RPC. An abandoned attempt returns an empty questions array even from lms_p4_attempt_payload/finish. The attempt owner is validated from Supabase Auth JWT, and other users cannot abandon it.
- A browser event cannot be securely proven by PostgreSQL. If the user disconnects from the network before the abandonment RPC is delivered, the DB may temporarily show an in_progress attempt. Client still hides questions and retries; this feature cannot guarantee the server is instantly notified.
- This P5 implementation does **not** include universal screenshot/recording blocking, cross-device lockdown, browser-device attestation, multi-account sharing detection or protected video DRM.

## Deployment sequence
1. Confirm P1/P2/P4 are already applied to the **dedicated Technica LMS staging Supabase project** and restore backup is available. Never run in CHEIRON.
2. Apply supabase/migrations/202611030001_p5_fullscreen_attempt_exit.sql ONCE. It deliberately refuses to run without P4 and rejects duplicate application.
3. Run supabase/P5_VERIFY_READ_ONLY.sql, confirm 3 protected tables have RLS, the new RPC is callable only by authenticated (and service_role), and the attempt payload signature exists.
4. On real Supabase staging, use separate paid learner, other learner, anonymous and revoked users. Verify exit seals the attempt, rejects late changes and returns no question key; check real JWT REST directly, not only the SQL Editor.
5. Build and QA both Demo and VITE_DATA_MODE=supabase targets; test Chromium, Android Chrome, Safari iPad, and real iOS device unsupported screen; test Esc, Alt+Tab, browser tab switching, reload, Exit, calculator/keyboard, copy/print and existing progress.
6. Only after sign-off redeploy to Cloudflare. No Supabase or Cloudflare changes are applied by this GitHub source PR.

## Testing & status
CI: npm run test:p5, disposable PostgreSQL P1/P2/P4/P5 RLS/abandonment, P3 live bank leak scanner, original unit suites, Chrome browser Practice/ContentProtection/Hierarchy plus new fullscreen browser regression. CI success is NOT proof of full OS-screen capture blocking or live Supabase/DRM readiness.

## Rollback
Rollback frontend to previous main build through Cloudflare only after backup/sign-off. Leave additive P5 schema and recorded attempted exits in database unless approved data migration. Do not drop attempt tables or reimport ASP records.
