# Pilot access: 2 Admin + 2 Learner accounts — real Supabase Auth

Date: 2026-11-04. Current deployment: Technica LMS (NOT CHEIRON). **No users have been created and no SQL executed in the real Supabase project by this repository change.**

## Correct supported account creation

1. Go to the dedicated **Technica LMS** Supabase project, confirm its URL/ref.
2. Open **Authentication → Users → Add user**. Use the Dashboard to create four *real* Email/Password identities, or send four email invitations so each user sets their own private password. Supabase's recommended user creation paths are Dashboard or trusted Auth Admin API, not raw inserts into `auth.users` / `auth.identities`. Email verification is mandatory before role assignment.
3. Choose four unique emails known to their real owners; two destined for Admin and two destined for Learner. **Never paste passwords into chat, GitHub, SQL files or frontend variables.** If using invited users, complete the verification and password setup.
4. Open `supabase/PILOT_2_ADMIN_2_LEARNER_ASSIGN.sql`; use Find/Replace **all** occurrences of each of the four `@replace-me.invalid` addresses with exact real emails and customize names. The query refuses unchanged placeholders and missing/unverified Auth users, is atomic and idempotent, and adds Admin only to the two explicit Admin identities.
5. Run the script **once**, in the correct owner-approved database. The final read-only SELECT should show exactly two `admin`, two `learner` and `email_verified=true`; never modify P1 constraints to insert a fake `learner` assignment. In P1, learner = active LMS profile without a privileged role.
6. Sign in from the **main Technica login page** using each person's actual email/password, test correct admin vs learner menus, sign out, wrong-password denial and refresh persistence. Preview course and assessment data are still browser-local.
7. Test real P6A ASP review using genuine Admin, and negative-test that both learners cannot fetch review RPC/question answers directly. The fact an account can log in **does not** entitle it to the paid ASP course. Course entitlements are a separate explicit approval, not granted here.

## Source behavior / safety

- Main site `src/pages/AuthPage.jsx`: mandatory Email and Password; no `Login as Admin` / `Login as Learner` buttons or embedded sample credentials. Public signup entry redirects to login for this four-account pilot.
- `src/lib/portalAuth.js`: Supabase signInWithPassword; server-side `auth.getUser()` verification and P1 profile + active Admin role check, no localStorage trusted Admin flag. No user-selectable elevated role.
- `src/App.jsx`, `src/components/Layout.jsx`, `src/lib/store.jsx` and learning/result-watermark consumers now use the actual verified identity in memory; protected routes and signout use real Supabase Auth. The legacy demo-auth unit tests remain for historic local simulation but are not a published login flow.
- Published site must compile public `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never set `VITE_` service_role.
- **Known substantial release limitation:** the existing default main Vite bundle still contains the old 1,625-example ASP demo content and locally simulated progress/practice data. Frontend auth does **not** encrypt those browser assets. It is therefore a **controlled pilot, NOT a secure paid content launch**. The separate full `VITE_DATA_MODE=supabase` build and protected practice backend remain required before paid release. Do not present the existing local preview question bank as secure or actually administered via database.
- Password recovery requires the Supabase email provider/SMTP and authorized redirect configuration, verified in a real browser; the project can require a separate owner-approved password reset UX once the Auth settings are confirmed.

## Security checks / rollback

- RLS for `lms_profiles`, `lms_role_assignments`, paid questions and P6A must remain enabled.
- Verify two learners cannot grant themselves admin access via user metadata/localStorage/curl RPC; only trusted SQL Editor can assign Admin.
- The SQL file leaves existing suspended profiles unchanged (aborts), refuses pre-existing privileged Learner accounts and never imports questions, changes entitlements or edits passwords.
- Rollback GitHub UI changes by reverting PR if needed; account role changes require explicit DB-reviewed revocation. Do not delete `auth.users` to roll back frontend.
- A green CI result is source/ephemeral acceptance only; do not claim real Supabase provisioning, Cloudflare live build, browser QA or security release.

**Original password setup guide:** https://supabase.com/docs/guides/auth/users. **Admin API reference:** https://supabase.com/docs/reference/javascript/auth-admin-createuser.
