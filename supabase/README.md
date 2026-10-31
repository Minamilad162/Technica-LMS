> **2026-10-30 P1 UPDATE (DRAFT PR #7):** A new, guarded foundation migration now exists at [migrations/202610300001_p1_foundation.sql](migrations/202610300001_p1_foundation.sql). Its [staging runbook](P1_STAGING_MIGRATION_RUNBOOK.md) is mandatory. The old \`001_lms_schema_PROPOSED.sql\` below is **incompatible** with the approved Course → Domain → Topic → Lesson model and **MUST NOT be deployed**. The new migration is **not applied to any database**, and does not prove Auth/RLS/Storage functionality. Run \`npm run test:p1:schema\` for source contract checks only; staging execution and real user permission tests remain required.

# Supabase integration plan (not active in the demo)

The demo uses **local React state, hard-coded sample data, and browser `localStorage`**. No Supabase account, database, login, Edge Function, Storage, email or network access is required to demonstrate the seven screens.

`src/lib/supabase.js` exposes a lazily initialized client for **future integration only**. Merely changing `VITE_DATA_MODE` to `supabase` does **not** connect the LMS UI to a database; production repositories, authentication, session delivery and secure grading have not been implemented. Do not expose service-role keys in a Vite build.

Suggested migration flow:

1. Create a separate Supabase LMS project and review `001_lms_schema_PROPOSED.sql` with the final LMS roles/requirements. Do **not** apply it to an existing unrelated project blindly.
2. Configure Supabase Auth. Provision profile roles via trusted server-side code, not via a browser update. Confirm the initial administrative profile securely.
3. Introduce a `repositories/` data-access layer for courses, topics, lessons, enrollments, analytics and user-specific saved questions. Keep the existing `useDemo` provider as the demo adapter.
4. Deliver sanitized exam questions and evaluate answers in an **Edge Function** that verifies the authenticated user, enrollment, attempt status, duration and retake limit. Learners must never receive `correct_index`, reference answer keys or the service-role key before submission.
5. Add Storage buckets with signed URLs and size/type restrictions for PDFs, photos and later training videos. The current file picker only demonstrates the selection UX and does **not** upload files.
6. Establish RLS and grant tests for `anon`, `authenticated` learners, instructors/admins, and `service_role`. Starting **October 30, 2026**, explicit Data API grants are required for new public tables.
7. Move dashboard analytics to secure aggregations/RPCs, not full raw learner table scans from client code. Add indexes based on actual query plans.
8. Connect the React app to real repositories only after migration and security validation; then set the right environment values and deploy the build.

The proposed migration intentionally keeps all answer keys unavailable to ordinary learners. It is a starting point, **not a deployed or tested production backend**.
