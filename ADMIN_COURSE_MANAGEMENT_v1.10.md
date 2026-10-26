# Technica LMS v1.10.0 — Admin workspace update

This release uses the supplied `UI_COMPONENT_REFERENCE_GUIDE.md` for consistent, lightweight interactions and preserves the existing design system.

## What changed

- **Overview:** Removed the entire `ASP question bank coverage` panel. The question bank route remains available.
- **Learners:** Clicking any learner name or action icon opens a profile dialog with role, assigned parent course, sample training module, progress, accuracy and last-active information. This data is explicitly mock data, not linked to other live users.
- **Navigation:** `/courses` is a distinct admin route and lights up **only Courses**; `/builder` lights up **only Course Builder**, and `/reports` is distinct from Overview. Removed Media library from desktop and mobile navigation. Admin routes are demo role-gated.
- **Courses:** Editable parent-course catalogue with ASP Course and PSEE, plus new user-created draft shells. Status filter (All/Published/Draft/Scheduled), inline details and edit form. Drafts may be scheduled to publish on a chosen future date/time. This is **browser-local scheduling**, not a server-side job; status is evaluated using the browser clock when the app is open or re-opened.
- **Course Builder:** Receives a `courseId` query parameter from Courses. Existing ASP modules and question bank remain associated with ASP; other courses do not inherit those lessons or questions. Supports PDF and MP4/WebM/MOV uploads in the resources panel, with file preview, download and deletion.
- **Media upload:** Real demo uploads save the binary `File` in IndexedDB (per-browser) and metadata in localStorage. Sample PDF/video entries are metadata placeholders clearly labeled `Sample item · no file attached`; none pretend to be uploaded or watchable. PDF max 30 MB, video max 150 MB. No server transfer takes place.

## Existing features preserved

ASP parent course has exactly five workbook domains and the original 1,625 questions. Practice remains customizable, Assessment remains admin-configured with unlimited retakes, and the course-grouped Assessment Review persists in demo storage.

## Storage + production limits

This build is still a **local browser demo**. User accounts/roles are illustrative; course settings, schedules and file uploads are not synchronized across devices. For deployment with real learners, migrate storage and scheduled publication to Supabase (Auth, Storage, database, RLS, an actual scheduled job) and enforce permissions server-side. Do not advertise local role checks as production security.

## Tests

Run `npm run check`, `npm run test:admin`, `npm run verify:bank`, `npm run test:selection`, `npm run test:courses`, `npm run test:review`, `npm run test:quiz-navigation`, `npm run test:auth`, `npm run test:motion`, `npm run verify:images`.

The above are source/logic tests. A production Vite build and desktop/mobile browser walkthrough must still be run on a machine with npm dependencies installed.
