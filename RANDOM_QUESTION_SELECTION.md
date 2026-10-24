# Random ASP Domain Assessments — v1.2.0

## Default
- Each of the five ASP domains has its own bank: Domain 1: 250; Domain 2: 625; Domain 3: 200; Domain 4: 300; Domain 5: 250.
- Select a domain in `/#/assessments` (or click its card on Home). The default assessment draws 50 random unique questions from that domain only.
- Questions are shuffled afresh on every attempt, without duplicate bank IDs. Overlap between different attempts is possible by design.
- Choose **All 5 domains** to draw an even mix; for 50 questions this is 10 from each.

## Customization
- Question number: 10 / 25 / 50 / Custom 1–50.
- Timer: No timer / Whole test (adjustable minutes, defaults to 60) / Per question (60 seconds).
- Feedback: At the end / After each question.
- Pool: All questions / Unseen / Previous mistakes. If the requested subpool is empty, the UI falls back to the selected domain's full pool and shows a notice. If fewer questions are available than requested, the session uses only those available.
- Practice page keeps these settings with its own independent state. New visitors start with 50 questions and Domain 1 selected by default.
- Question bank content, source answer index and explanation are NEVER regenerated. `bankId` is the stable key; session `id` is a temporary question number.

## QA
```bash
npm run verify:bank
npm run test:selection
npm run check
npm install
npm run build
```

The first three commands require Node.js but no npm dependencies. Build and browser test require network access for dependency installation, which was unavailable in the authoring environment.

This is a browser-only **demo**, not a secure test engine. Correct answers appear in client JSON; production use needs secured server-side question delivery and grading.
