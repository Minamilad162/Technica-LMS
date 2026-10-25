# v1.6.1 — Demo Login Access Fix

- Added **Login with Demo Account** under the sign-in form for one-click entry.
- Sample account `TC1001 / Demo@1234` is always available in the client-only demo; sign-up is not required.
- Improved copy/paste handling for employee IDs (full-width characters, whitespace and zero-width characters).
- Improved error message for missing local-only accounts.
- Added regression tests for empty/corrupted local account storage and common typing/copying variants.
- Added small version marker so old deployments can be identified.

This is **not** secure production authentication. No Supabase connection, backend changes, real email, or new user credentials.
