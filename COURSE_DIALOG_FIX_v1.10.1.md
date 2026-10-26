# Technica LMS v1.10.1 — Create/Edit Course Dialog

## Issue

The Create course popup was rendered inside `.page-enter`. The page entrance animation uses `transform`, creating a containing block for `position: fixed` descendants. This could displace the popup from the viewport and clip its top. The previous generic modal used a single scroll surface, so the title/footer could scroll away. This caused the Create course dialog to be cut off and awkward to scroll on short screens.

## Changes

- `src/pages/CoursesPage.jsx`: Portal-based dedicated CourseDialog; close by Escape/close button/backdrop; restore focus; focus trap; body scroll lock; visible fixed actions as `footer` outside scrolling form. Preserve form logic and scheduling.
- `src/courseDialog.css`: Responsive flex dialog; viewport-bounded max-height; only content scrolls; always-visible header/footer; mobile and short-height rules.
- `src/main.jsx`: imports the scoped course dialog styles.
- `scripts/test-course-dialog.mjs`: regression checks for portal, layout, submit behavior and accessibility hooks.

## Verification

Run `npm run test:course-dialog`, `npm run test:admin`, `npm run check`; when node dependencies are available, run `npm run build` and visually exercise viewport heights 900/600/375, narrow mobile widths, 200% zoom, keyboard Tab/Escape and the scheduled-date field. This is a local demo; publishing does not run as a server job.
