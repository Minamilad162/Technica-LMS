# P14.1 — Free protected PDF page delivery (source implementation, Staging pending)

**Status:** additive GitHub code; NOT deployed to real Supabase from this work.
User reported three existing P14 SQL checks TRUE, but environment identity, remote migration ledger, SQL grants, Edge deployment and actual uploads were NOT independently verified.
Never re-run P14. Existing P14 video and standard PDF are unchanged. P14.1 adds an *optional* more private PDF authoring path; not DRM.

## What the Admin and Learner do
- Admin Tools → Courses → Course → Domain → Topic → Lesson → **+ Secure PDF**.
- Admin first prepares the PDF with the **free, local Poppler tools**, using:
  `python3 scripts/prepare-protected-pdf.py "/private/lesson.pdf" "/private/lesson-pages"`
- On Windows, install trusted Poppler binaries locally, ensure `pdfinfo` and `pdftoppm` are on PATH, then use `py scripts/prepare-protected-pdf.py "C:\\private\\lesson.pdf" "C:\\private\\lesson-pages"`.
- Choose only the numbered files `0001.jpg`, `0002.jpg`, etc. (NOT `manifest.json` and NOT the source PDF). Up to 80 pages, up to 2 MiB each, max 50 MiB total.
- Admin supplies a display title. After explicit click, frontend obtains authenticated one-time package and per-page upload tokens, then requests server-only atomic finalization. Nothing is auto-published.
- For this new type of block, Learner sees page images in a Next/Previous viewer, not the original PDF. The Edge function checks real Auth JWT, active profile, P1 lesson entitlement, block RLS and package ownership on **each page** and issues a 45-second read URL. Original PDF bytes are never uploaded to this bucket.
- Legacy **+ PDF (standard)** and **+ Video** remain to avoid breaking existing course content. Legacy PDF still uses a signed URL in an iframe and is easier to extract. Label it honestly.

## Server changes and security
- Migration `202611060002_p141_protected_pdf_pages.sql` creates **new** private `technica-private-lesson-pages` bucket (JPEG only, 2 MiB file limit) and service-only `lms_p141_pdf_packages` table. Not an update to the installed P14 migration.
- One-time SECURITY DEFINER finalizer `lms_p141_finalize_pdf_pages(uuid)` locks the package, verifies *every* expected `storage.objects.metadata` size and MIME, checks count exactly (including refusal of extras), then inserts a `pdf` block with `{title,protectedPages:true,pageCount}`; commits or rolls back as one transaction. Client sees no private prefix or package ID in lesson content.
- Only Edge service role may manage package rows or invoke finalizer; no direct authenticated/anon page-bucket SELECT/list policies.
- Edge JWT verification must remain enabled; `TECHNICA_MEDIA_ALLOWED_ORIGINS` is an exact allowlist. No keys in Vite frontend, repo or browser.
- Per-page signed URL remains a bearer capability for 45 seconds. JPEG page pixels can be copied and screen recorded; user/time/session watermark is visible but **not irreversible**, nor a forensic watermark.

## Staging-only rollout
1. Read actual remote migration ledger, inspect P1/P14 state and confirm *the target is an isolated Staging project*. Preserve P14 installed history; do not rerun it or old bootstrap scripts.
2. Ensure new public schema table and RPC service grants are correct for Supabase Data API; confirm no `anon`/`authenticated` access to package table or finalizer.
3. Apply *only* P14.1 migration once in Staging SQL Editor after backup, checking bucket config and row counts before and after. Do **not** add permissive Storage policies.
4. Deploy updated `technica-lesson-media` Edge function with `verify_jwt=true`, exact origins, server-only environment secrets. Deploy React build only to Staging.
5. As real Admin, upload two-page sample generated locally; verify finalized block; Paid learner sees each page. Trial sees only a specifically granted lesson, outsider/suspended/anonymous must get 403 and no token. Direct Storage listing without a signed token must fail.
6. Negative: wrong/missing/extra page, invalid JPG, duplicate finalize, expired package, wrong Lesson/block/course, revoked entitlement, access after 45 seconds, large files/oversized pages and mobile Safari/Android navigation.
7. Device smoke: Windows Chrome/Edge, iOS Safari, Android Chrome; compare screenshot/record behavior and warn users, don't claim black capture.
8. Record exact staging project ref, deployed SHA, grants, migration IDs, tests and rollback. Production changes require separate explicit owner approval.

## Free video follow-up boundary
P14.1 **does not claim AES-HLS or DRM support**. Current video remains signed direct MP4/WebM from private Storage. Proper encrypted HLS needs trusted packaging, signed manifests and authenticated key/segment delivery plus a working Safari and Chrome player, realistic token renewals and leakage tests. AES-HLS still is NOT hardware DRM; OS screenshots and screen recording remain possible. Do not expose AES keys alongside public playlists.

## QA
- `npm run test:p14`: original P14 plus P14.1 isolated mock tests.
- `scripts/test-p14-postgres-smoke.sh`: disposable P14 + P14.1 private-bucket, service grant, metadata mismatch, atomic finalize and duplicate tests.
- No successful CI or synthetic test can prove real runtime, permission isolation at the actual hosted project, or screenshot prevention.
