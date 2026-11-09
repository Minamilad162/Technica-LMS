# P57: Open Learner Registration / Google OAuth setup

## Implemented in source

Public email/password Sign Up, Google OAuth button on Sign In and Sign Up, dynamic return path, PKCE detection, existing server-based role/profile/block check, no automatic subscriptions.

## Still required to enable Google end-to-end

1. In Google Cloud → Google Auth Platform set up branding, audience, and OAuth Web application credentials. Supply authorized **redirect URI**: `https://klmwiivitgbyjbynxwbg.supabase.co/auth/v1/callback` (Supabase project's callback, not the LMS hash route). Follow Google's current consent screen/publishing policy.
2. In Supabase → Authentication → Sign In / Providers → Google, enable provider and paste the **Google OAuth Client ID** and **Client Secret** privately. Never send secrets in chat, GitHub or Vite env.
3. In Supabase → Authentication → URL Configuration, set Site URL and Additional Redirect URLs for the currently deployed website *origin/path* (no hash), and later for the approved final custom domain. Check the browser's exact app origin and any staging host.
4. For email/password registration, ensure Email provider and email confirmation requirements are configured; use an appropriate SMTP sender if default email caps are insufficient. Sign Up UI is not a substitute for reliable verification email delivery.
5. Deploy the verified frontend build to the target host only after checking which Supabase project its public build-time configuration points to. Existing old database and current Cloudflare environment were intentionally left untouched.
6. Browser-test a brand-new Google identity; confirm Auth user + normal active `lms_profiles` record and zero admin role grants, correct session restoration and blocked-user rejection. Also test normal email confirmation and existing Admin/Learner sign-in.

Google setup remains **pending** until provider credentials and URL allowlists are configured; GitHub CI covers code only, not live OAuth or SMTP delivery.
