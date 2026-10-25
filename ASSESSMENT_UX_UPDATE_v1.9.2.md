# v1.9.2 — Assessment layout, unlimited retakes and final-review-only warnings

## Learner assessment overview
- Removed the old ASP domain/content panel beside **Before you start**.
- Displayed a dedicated **Start assessment** CTA card **to the left of** the **Before you start** instructions on desktop. On mobile, instructions come first, CTA follows.
- Removed the **Attempts remaining** stat. Three cards remain: questions, time limit, pass mark.
- Kept the instructions acknowledgement checkbox. Start remains disabled until accepted.
- Kept ASP Course with its five real domains and 1,625 imported questions; PSEE remains Coming soon.

## Attempts
- No attempt limit anywhere in the demo assessment start flow or Admin Course Builder.
- The original count/time/pass mark/domain selection remain Admin-configured.
- Legacy `maxAttempts` values in browser localStorage are intentionally ignored; previous attempt history/count is retained as informational demo history only and is **never an access guard**.

## Question navigator
- Navigating with **Next** or clicking question numbers does **not** highlight missed questions.
- Once the learner explicitly requests **Review and submit** from the last question or navigator, all unanswered questions get warning markers, their numbers appear in the review dialog, and the learner can return to them.
- The learner can explicitly submit incomplete answers after seeing the warning.
- Applies to both Practice and Assessment; timeout auto-submit behavior remains unchanged.

## QA
`npm run check`, `npm run verify:bank`, `npm run test:selection`, `npm run verify:images`, `npm run test:auth`, `npm run test:motion`, `npm run test:courses`, `npm run test:quiz-navigation`.

This is still a localStorage-backed client-side demo, not a production authorization system. No new runtime dependency was added.
