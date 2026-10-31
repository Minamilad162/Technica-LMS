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

## TI-style additional capabilities (2026-10-31)

New calculator tabs:
- **Memory:** select any of seven memory slots `x, y, z, t, a, b, c`. Save current expression to selected slot; recall its symbol or clear it. These values do not modify quiz answers.
- **L1–L3:** enter each list of up to 42 finite values separated by comma/whitespace, save, apply formulas to another list, view one- or two-variable statistics; fractional weights are supported for mean/population sigma, but sample SD and quartiles may be undefined for non-integer frequencies.
- **Angle:** angle-unit conversion (degrees/radians/gradians), DMS and rectangular/polar conversions.
- **K:** repeat a formula involving `x` on the last computed answer. Example enter `x+2`, enable and press Apply K repeatedly.
- **Table:** Auto generates values from Start/Step/Rows; Ask-x evaluates a custom list of x-values.

Expanded keypad and result modes:
- `Textbook` renders supported rational fractions stacked, simplified integer square roots and multiples of π (e.g. sqrt(8) → 2√2). `Classic` shows a line of numeric output. Exact-to-decimal, fraction and percent toggles are independent display actions, not changes to the stored numeric answer.
- `Decimals`: FLOAT or FIX 0–9 decimal places (rendering only; internal engine retains JS floating-point calculation value).
- `NORM/SCI/ENG` and `DEG/RAD/GRAD` continue to work.
- Advanced functions also accept explicit `deg(...)`, `rad(...)`, `grad(...)`, `dms(degrees,minutes,seconds)`, `RtoPr(x,y)`, `RtoPtheta(x,y)`, `PtoRx(r,theta)`, `PtoRy(r,theta)`, and `root(n,value)`.

**Important:** This is independently implemented functionality inspired by the actual TI-30XS MultiView reference. It is not a licensed TI emulator or a promise of exact TI firmware parity. Not all nested MathPrint templates, display menus, and numeric edge cases are implemented. For official exam compliance, confirm whether the exam permits a browser-based calculator and obtain a separately verified output reference before deployment.

Source: [Official TI-30XS MultiView specifications](https://education.ti.com/en/products/calculators/scientific-calculators/ti-30xs-mv), [official guidebook](https://education.ti.com/en/guidebook/details/en/50BE24C84836434485BD2E8D49374AF7/30x_mv).



## Structured mathematical input & precision (PR #11, 2026-10-31)

### Entering multi-level math

1. Open the floating Calculator on Practice, Assessment or the Lesson Quiz. Textbook mode is selected by default.
2. Tap **a/b** to insert a proper fraction template. The caret enters the numerator. Press **ArrowDown** to switch to the denominator; ArrowRight at the last character advances to the next slot.
3. In any editable slot, tap **√□**, **ⁿ√□**, **xⁿ**, **eˣ**, **10ˣ** or **a b/c**. You can nest up to four template levels, including a fraction inside a square root or exponent. Long math input scrolls horizontally inside the LCD.
4. Physical keyboard: edit each input slot like a text input; **Ctrl+/** inserts a fraction, **Ctrl+R** inserts a square root, **Enter** calculates, and arrows navigate between slots at their boundaries. Backspace on an empty template slot removes its enclosing template; **✕ slot** removes the active template by button.
5. Choose **Classic** to switch to linear expression entry. The current Math document is serialized to a safe linear expression, keeping its calculation. Conversely, returning to Textbook from Classic keeps the expression as editable linear content ready for templates.

Incomplete input (such as an empty denominator) produces an error and does not silently calculate. The original TI hardware allows four consecutive template levels; the Technica editor enforces the same bound but provides a web-native horizontally scrolling layout, not the original four-by-16-character LCD.

### Calculation precision and mode rules

- When a formula contains only rational arithmetic (numbers, fractions, parentheses and integer powers), a bounded **BigInt rational evaluator** computes the exact underlying ratio. E.g. \`0.1+0.2\` is precisely 3/10 and \`1/3+1/6\` is 1/2 (the displayed format still follows mode).
- General math uses the existing JS numerical evaluator; logarithms, trigonometry, irrational roots and statistical calculations are not calculated using arbitrary precision, so there may be small numerical differences versus TI hardware.
- **FLOAT** displays up to 10 significant digits. **FIX 0–9** sets decimal places for display, without changing the stored result. This matches key displayed-mode concepts; it does **not** emulate TI internal chip/firmware rounding bit-for-bit.
- In **Textbook** \`2^3^2\` evaluates right-to-left as 512. In **Classic** it evaluates left-to-right as 64. Parentheses make explicit grouping available in either mode.
- Textbook output still supports exact fractions, simplified supported integer radicals and π multiples. Full symbolic addition/multiplication of arbitrary surds is not implemented; avoid claiming this is a computer algebra system or pixel-identical TI MathPrint engine.

### List editor and TI-style data menus

- The **L1–L3** panel now supports DATA, CLEAR and FORMULA menu groups; lists hold up to 42 numbers. Formulas such as \`L2=L1*2\`, \`L3=L2+10\` update after the source list is saved. Circular references are blocked.
- Editing a formula-generated list directly clears its formula; explicit **Clear formula** and **Clear ALL formulas** options preserve current numbers while turning off automatic recalculation.
- Switching tabs and returning to L1–L3 restores previously saved lists rather than displaying blank entries. Full calculator Reset asks before clearing settings, memory, list data and history.

### Verification and remaining certification gates

Run \`npm run test:calculator:mathprint\`, \`npm run test:calculator:extended\`, \`npm run test:calculator\` and all ordinary regression/build/DB checks. **Browser QA remains mandatory**, including touch-only template slots, physical keyboard caret boundaries, answering while calculator open and small-screen accessibility. Compare outputs with an actual TI-30XS MultiView reference before selling exact model equivalence. The tool is independently coded and does not use TI firmware or third-party licensed artwork.

References: [TI Home Screen](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_Home.HTML), [Order of Operations](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_OrdOps.HTML), [Fractions](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathFunc/MF_Frac.HTML), [Data Editor](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathTools/MT_DataEd.HTML), [Modes](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_Modes.HTML).


## Physical keypad placement and no-scroll behavior (2026-10-31)

The owner supplied a TI-30XS MultiView photo and requested a physical-style shape and button placement *inside the code*. In quiz/assessment, open Calculator: the panel shows the independently branded Technica blue-grey physical shell, pale LCD, top four-way cursor pad and a permanent seven-row/five-column main keypad. It keeps 35 main keys and six top utility keys in the same positions on desktop and mobile. The primary keypad no longer swaps order on mobile.

The photo-inspired layout is not an original Texas Instruments product/emulator and does not include TI branding or images. Every base key has a corresponding calculation/UI action, with green secondary legend actions accessed using 2nd. MODE opens angle, numeric modes, Classic/Textbook and precision controls; PRB opens factorial, nCr/nPr, random; DATA accesses L1/L2/L3; TABLE opens the f(x) table; STO accesses memory, and additional scientific operations remain under the TOOLS selector. Long advanced data menus can scroll; **the regular physical keypad is fixed, not a scrolling catalog**.

The floating panel remains draggable on desktop and its question/answer workspace remains independent on small screens. Chromium audit includes all key rows and no-scrolling assertions plus question answer interaction in current Practice, Assessment and Lesson Quiz. No changes to scoring, timer, questions or DB.


### v1.1.5 screenshot-based appearance adjustment

Using the owner's screenshot of the actual current Technica calculator, the casing is subtly widened on desktop (354 → 384px) with smoother silver bevels, navy and white key contrast, deeper LCD border, improved green 2nd labels and a more distinct navigation pad. On phones the keypad remains full-width and responsive without introducing internal scrolling; desktop and three mobile viewport screenshots are archived in the Chromium UI audit. This visual change does **not** modify the calculation algorithms or guarantee identical styling on actual iOS/Android devices.


### v1.1.6 — Math templates moved from LCD into TOOLS

The calculator LCD now shows only status, mathematical input, last calculation and computed result. The former permanent green chips (a/b, a b/c, square root, nth root, xⁿ, eˣ, 10ˣ and ✕ slot) are no longer inside the LCD.

To insert a structured expression, select the desired input field in the LCD, press **TOOLS**, and choose an item in the **Math templates** section. It inserts at the saved input cursor and closes TOOLS so you can continue typing on the keypad. **✕ slot** removes the selected nested template. The physical n/d and power buttons, cursor arrows and existing keyboard shortcuts continue working. Classic mode uses equivalent linear expressions.

Long advanced menus may scroll, but the primary physical keypad does not. The outer shell is now one continuously molded blue 3D shape with tonal edges, not white rails. This is a visual refactor only; it does not change the numerical engine, the LMS assessment flow, or TI-equivalence status.
