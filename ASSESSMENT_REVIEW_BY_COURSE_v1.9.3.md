# v1.9.3 — Assessment review by course

## Approved behavior
- The learner's **Assessment review** screen lists **only courses with completed assessment submissions**, not practice-only courses or empty catalog entries.
- Each course expands **inline**, and opening another course collapses the previous one. No new review-detail route.
- Inside the opened course, choose any completed assessment attempt; each attempt displays its own score, correct/incorrect/unanswered counts, date, elapsed time, pass mark, filterable original questions, answers, explanations and flags.
- **Practice this course** opens Practice setup with that course and its domains selected, without forcing assessment settings onto Practice.
- **Retake assessment** opens the existing Assessment overview with the same course preselected. Assessment question count, timer and pass mark remain admin-controlled; attempts remain unlimited.
- **Practice mistakes** in a historical attempt draws from *that attempt's incorrect questions*, not from some other recent attempt.
- Practice results after a practice submission still use `/practice/results`, preserving the existing immediate practice feedback; they do not appear in `/results` Assessment history.
- The original demo account's last assessment from earlier versions remains visible even if it predates this new archive. No fabricated assessment history is created from screenshot/sample result data.

## Demo persistence
- Assessment submissions append to `state.assessmentHistory` and are saved in the existing browser `localStorage` demo state.
- Each history item is tagged with the current demo learner ID and scoped on retrieval; the legacy unscoped `lastResult` is shown only for the original sample account.
- ASP workbook question IDs are stored as compact references. For added custom questions, the attempt stores a question snapshot so answer review can still work.
- **This is a local browser demo**, not a secure cross-device or server-backed learner record. For production, implement authenticated Supabase attempt/question/answer tables with RLS, server-confirmed scoring and immutable attempt snapshots.

## Regression checks
`npm run check`, `npm run verify:bank`, `npm run test:selection`, `npm run test:auth`, `npm run test:courses`, `npm run test:quiz-navigation`, `npm run test:motion`, `npm run test:review`.

UI system reference: `UI_COMPONENT_REFERENCE_GUIDE.md`, reusing existing Technica colors, compact data cards, accessible focus, mobile flex grids and reduced-motion fallbacks.
