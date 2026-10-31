# Technica LMS — Floating Scientific Calculator (2026-10-31)

**Status:** Implemented in the current browser-demo quiz/assessment surfaces; not an official TI-30XS MultiView emulator.

## Availability and placement

- The **Calculator** launch button is mounted in \`src/pages/QuizPage.jsx\` for both **Practice** and **Assessment**. All present practice/assessment sessions using these routes share this implementation (including practice variants delivered through the same page).
- The 10-question Learning Player **Lesson Quiz / Knowledge Check** in \`src/pages/LearningPage.jsx\` also includes it. It is hidden on that page's result/review screen and non-question learning screens.
- Future Quick 10, Level Up, 200-question Mock Exam or separate future question component must use the same \`ScientificCalculator\` import; those separate production engines are not built yet.
- Opens as a non-modal floating tool: **question, answer buttons, navigation and running quiz timer remain visible and usable**. The calculator does not submit exam answers or change timer/scoring state.
- On desktop, drag by its top header to reposition; close/minimize with the header buttons. On phones, it becomes a scrollable docked sheet with limited viewport height so some question content stays visible.
- Open state, expression, history and memory survive switching between questions inside the same mounted quiz component; close/reopen retains values. Switching between routes creates a fresh calculator. It does not store data across sign-outs/sessions or leak answers to other users.

## Controls

- Click/press digit and operation keys, or type in the calculator expression field.
- **Keyboard:** digits, decimal point, \`+\`, \`-\`, \`*\`, \`/\`, \`^\`, \`(\`, \`)\`, \`%\`, \`Enter\` or \`=\` to evaluate, \`Backspace\` to remove an input character when outside the expression editor, \`Delete\` to clear, \`Escape\` to close.
- Typing when another question's button or text field has focus does **not** hijack it. The calculator is not a focus-trapping modal.
- **2nd** toggles inverse trigonometry, \`10^x\`, \`e^x\` and alternative functions. \`MODE\` cycles DEG/RAD/GRAD; direct tabs select angle and NORM/SCI/ENG numeric formatting.
- **Fraction:** \`n/d\` inserts \`/\` for fraction arithmetic; \`f↔d\` toggles fraction/decimal *results*; \`a b/c\` toggles mixed-number result notation for rational values.
- **Math:** standard precedence, parentheses, implied multiplication, powers/squares/cubes, inverse, square/cube/other roots, log/ln, exponentials, factorial, percent, permutations and combinations, modulo, trig/inverse/hyperbolic functions, absolute value, rounding and negative signs.
- **Memory/history:** STO stores numeric value in \`M\`, MR inserts \`M\`, MC clears it, M+ adds a value; Ans inserts the last answer; history remembers up to 12 calculations within the current quiz component.
- **Data:** 1-variable mean, median, sum, min/max, population and sample standard deviations; 2-variable least-squares linear regression slope, intercept and Pearson r.
- **Table:** evaluate 8 rows of user-entered \`f(x)\` with start/step.
- **Random:** \`rand()\` and \`randInt(min,max)\`.
- Domain and input errors are caught with a readable message. No use of JavaScript \`eval\`, remote calculator libraries or keys uploaded to a server.

### Examples

- \`(4+6)/2\` → 5
- \`sqrt(81)\` → 9; \`root(3,27)\` → 3
- \`sin(30)\` in DEG → 0.5; \`sin(pi/2)\` in RAD → 1
- \`nCr(5,2)\` → 10; \`nPr(5,2)\` → 20; \`5!\` → 120
- \`1/3+1/6\` → 0.5 (or 1/2 with f↔d result)
- \`2Ans\` means 2 × last answer; \`M+2\` means memory + 2.

## Matching the user's TI-30XS reference

The appearance uses a rounded blue handheld-like body, dark top controls, grey LCD-inspired multi-line display and 5-column scientific key grid with an independent Technica identity. **It is not pixel-for-pixel identical to the TI hardware, and does not include TI-branded artwork, copyrighted firmware, MathPrint exact symbolic algebra formatting, or a licensed TI emulator.** This distinction is intentional, as required by the existing Master Blueprint.

Feature set covers the main operations and several advanced ones, but some genuine model functions/behaviors (e.g. full symbolic radical simplification, exact MathPrint fraction templates, original keypad menu navigation and precise fixed-decimal/system-mode parity) are **not yet emulated identically**. For certification/exam use, validate calculation outputs and allowed-tool policy against the required scientific calculator model on a full independent reference matrix.

## Implementation references

- Pure parser: \`src/lib/scientificCalculator.js\`.
- React window: \`src/components/ScientificCalculator.jsx\`.
- Styles: \`src/scientificCalculator.css\`.
- Automated math/source tests: \`scripts/test-scientific-calculator.mjs\`, invoked via \`npm run test:calculator\` and GitHub Actions.
- Preserved old practice/assessment answering, flags, timer, review warnings, results and 1,625 imported ASP questions.

## Verification gates

- Automated tests: independent calculation vectors, angle modes, fractions, stats, error handling and integration references; existing demo regression suite, Vite build and P1 PostgreSQL CI must still succeed.
- Manual browser checks still required: desktop drag and focus, 375/390/430px viewport legibility, touch scrolling, keyboard shortcut isolation, calculator repositioning and overlap with timer/answer cards, reconnect and continuous answer selection with calculator open.
- No real production Supabase exam engine/entitlements/media is activated by this UI feature.
