# v1.14.0 — Learner UI simplification

- Removed the redundant **ASP Course — five internal domains** section from Home and My learning. ASP remains available in Explore courses and Practice / Assessment; its 1,625 imported questions are intact.
- Removed **Saved** from learner sidebar and `/saved` route entirely.
- Removed per-question **Save question** UI from Practice, Assessment, Practice results and Assessment review. **Flag for review** stays available during a session; this is unrelated to persistent bookmarks.
- Admin **Question bank** stays reachable only through `/question-bank` with the existing admin-only route guard; it remains filtered by course with the ASP and PSEE banks. The unused bookmark action was removed from its interface.
- Existing browser-local savedQuestions from older demo sessions are left untouched on disk for safe backward compatibility but are no longer exposed or updated by the application.
- Animations and all existing core learning/course features remain unchanged.

## Checks
`npm run test:learner-ui`, `npm run test:admin-bank`, `npm run test:motion`, plus the existing source/data tests. Browser-based visual QA and Vite build need Vite dependencies installed.
