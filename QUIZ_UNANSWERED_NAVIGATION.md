# v1.9.1 — Question navigator & missing-answer review

## Both learner modes: Practice and Assessment

- Selecting **Next question**, **Previous** or any numbered item records the question the learner left in `visitedQuestions` within that session. If still unanswered, its navigator number gets a visible coral/red outline and **!** icon. Answered items are green (option index 0 counts), the current item has a teal focus outline; saved/flagged state stays independent.
- Choosing **Review and submit** on the final question or from Question navigator inspects **all questions**. If some are blank, a warning modal shows the exact count and directly clickable question numbers. All missing answers become visibly marked in the navigator, including never visited questions.
- **Review unanswered** takes the learner straight to the first missing question. They may also intentionally **Submit with unanswered**; the results already count blanks as unanswered. An explicit user choice prevents accidental completion. The fixed assessment configuration is unchanged.
- The reminder and needs-answer markers work equally for timed Practice and timed Assessment. Timer expiry retains the previous auto-submit policy; it cannot block on a modal.
- Existing React demo session persistence remains local (`localStorage`); the skipped list is stored in the same session. Old in-flight sessions without `visitedQuestions` still work with an empty list.
- All warning buttons use accessible names and keyboard-focusable elements; no heavy animation was added to the timed quiz.

## Assessment overview

The redundant **Assessment configuration — read only** panel was removed. Existing course selector, fixed Questions / Time / Pass mark / Attempts summary tiles, and admin-owned configuration remain unchanged.

## Verification

Run `npm run test:quiz-navigation`, plus all previous `npm` test scripts. A real `npm run build` and browser/mobile QA are recommended before production release.
