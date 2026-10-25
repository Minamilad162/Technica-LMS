# Authentication UI Demo — v1.6.1

## Pages

- `/#/login` — login with Employee ID (or registered email) + password, show/hide password, Remember me, sign up link, Forgot Password.
- `/#/signup` — full name, employee ID, email, password, confirmation, terms agreement; inline validation and duplicate account checks.
- `/#/forgot-password` — honest non-functional placeholder; requires backend; sends no emails.
- `/#/terms` and `/#/privacy` — visible demo-only disclaimer, not legally reviewed documents.

The UI matches the supplied industrial navy/teal/glass reference: wide photo and brand on the left, dark form on the right. A compact photo header and full-width form are used on mobile. The new generated background is `public/images/auth-refinery.webp` plus the mobile `auth-refinery-sm.webp`. The cropped brand symbol is `public/images/technica-icon.png`; the original official logo remains untouched.

## Test login

Employee ID: **TC1001**  
Password: **Demo@1234**

Alternatively click **Login with Demo Account** under the Login form; it automatically starts a sample session. This works in an empty browser without needing a signup or any preloaded accounts.

Or sign up with a non-sensitive test identity. New accounts are stored in the local browser only; no email is sent. Passwords are PBKDF2-hashed with random salt (and never stored in plaintext), but **client-side storage is not secure authentication**: any developer-tools user can change local browser state. Do not enter real production passwords, employee information, or sensitive emails. This frontend is NOT ready for a real launch. For deployment use Supabase Auth/Edge Functions, server-side authorization, RLS, rate limiting, email verification and secure password resets.

Remember me persists the demo session to localStorage. Unchecked uses sessionStorage. Signing out clears both. Previous LMS quizzes/data retain their existing local persistence.

## Run

```bash
npm install
npm run dev
npm run build
npm run test:auth
npm run check
npm run verify:bank
npm run test:selection
npm run verify:images
```

No Supabase keys needed; this is a standalone client-only preview. For static hosting (Cloudflare Pages), run `npm run build`, use `dist` output. React Router uses HashRouter, so paths work on Pages with `/#/login`.
