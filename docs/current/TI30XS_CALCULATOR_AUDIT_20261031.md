# Technica LMS — TI-30XS MultiView calculator compliance audit

**Audit date:** 2026-10-31 · **Baseline:** \`main\` b4ea4864 · **Review:** [PR #12](https://github.com/Minamilad162/Technica-LMS/pull/12)

## Executive conclusion

**NOT 100% functionally/firmware equivalent to a genuine TI-30XS MultiView.** The implementation is an original, independently authored scientific calculator. Its most important scientific calculations and a significant subset of TI-style tools are covered by deterministic tests. Hardware-accurate key sequences, complete exact symbolic output, random number sequence, the four-line 16-character LCD, internal numeric precision and all menu/error states remain different or unverified.

**Risk: RED for advertising “all original TI functions / exact copy”; AMBER for use as an independent exam-preparation calculator pending browser/device acceptance.** This explicitly supersedes prior overbroad completion statements. Passing npm unit tests alone never establishes full TI parity.

## Reference evidence

Official manufacturer documentation:
1. [TI-30XS MultiView product features](https://education.ti.com/en/products/calculators/scientific-calculators/ti-30xs-mv)
2. [TI-30XS MultiView Guidebook](https://education.ti.com/en/guidebook/details/en/50BE24C84836434485BD2E8D49374AF7/30x_mv)
3. [TI order of operations](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_OrdOps.HTML)
4. [TI modes](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_GetStart/GS_Modes.HTML)
5. [TI data editor](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathTools/MT_DataEd.HTML)
6. [TI error reference](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_RefInfo/RI_Errors.HTML)
7. [TI probability functions](https://education.ti.com/html/eguides/scientifics/EN/Content/EG_30XSMV/M_MathFunc/MF_Prob.HTML)
8. [TI fractions](https://education.ti.com/html/eguides/scientifics/TI-30XS-MultiView/EN/Content/EG_30XSMV/M_MathFunc/MF_Frac.HTML)

## Source-to-device feature matrix

Status keys: **TESTED FUNCTIONAL** = automated mathematical/interaction tests; **PARTIAL** = useful implementation but known TI behavior gap; **MISSING** = no comparable function; **NOT APPLICABLE** = physical device trait.

| TI device area | Technica evidence / implementation | Audit classification |
|---|---|---|
| Addition/subtraction/multiplication/division and parentheses | Safe Pratt parser and reference vectors | TESTED FUNCTIONAL |
| Implied multiplication | \`4(2+3)\`, \`2pi\` supported | TESTED FUNCTIONAL |
| Order of operations and signed powers | Tests for \`-2^2\` and \`(-2)^2\` | TESTED FUNCTIONAL |
| MathPrint/Classic exponent associativity | Right/left associative \`2^3^2\`: 512 / 64 | TESTED FUNCTIONAL |
| Automatic closing parentheses on ENTER | Implemented in UI-specific \`finishCalculatorEntry\` | TESTED FUNCTIONAL after PR tests |
| Hard EOS 23 pending operations/8 pending values | UI Enter limits pending parentheses; full firmware EOS operation stack not copied | PARTIAL |
| Four nested MathPrint templates | Structured fraction/root/exponent/mixed editor, four levels, independent focus | TESTED FUNCTIONAL (not identical key UX) |
| Exact fully symbolic MathPrint algebra | Simplifies limited integer radicals, simple π fractions, exact rationals; no complete surd/polynomial algebra | PARTIAL |
| Square root/nth root/cube root | Verified positive and odd negative roots and errors | TESTED FUNCTIONAL |
| Powers/reciprocals/squares | Verified numeric evaluator, displays are web-native | TESTED FUNCTIONAL |
| Scientific notation x10^n input | Text entry e/E and scientific formatting supported; no identical TI key flow | PARTIAL |
| Natural/common logs, exponential functions | Numeric reference cases | TESTED FUNCTIONAL |
| Trig/inverse trig DEG/RAD/GRAD | Numeric vectors and 3 modes | TESTED FUNCTIONAL |
| Hyperbolic trig/inverses | Functions in advanced tab; math regression vectors | TESTED FUNCTIONAL |
| Angle conversions, DMS | Decimal/sexagesimal and degree/radian/grad conversions | TESTED FUNCTIONAL |
| Rectangular ↔ polar | Numeric conversion panel and expression functions | TESTED FUNCTIONAL |
| π constants and result toggling | Numeric π and limited rational multiples as exact output | PARTIAL |
| Fraction automatic reduction | BigInt rational engine, rational output | TESTED FUNCTIONAL for supported numeric expressions |
| Improper ↔ mixed fractions | Existing mixed formatting and input templates | TESTED FUNCTIONAL (not same TI keystrokes) |
| Fraction↔decimal and percent display | Mode toggles, percentage operator | TESTED FUNCTIONAL |
| Ten-digit FLOAT display, FIX 0–9 | Output formatter tests | TESTED FUNCTIONAL for display, NOT TI internal precision |
| SCI/ENG/NORM modes | Numeric formatter tests | TESTED FUNCTIONAL for output format |
| Memory/Ans, seven variables | Calculator state and recall x/y/z/t/a/b/c | TESTED FUNCTIONAL (different menu interaction) |
| History reuse/scrolling | Up to 12 React-local entries; not hardware four-line storage flow | PARTIAL |
| DATA editor L1/L2/L3 (42 items) | List editor and 42-entry guard | TESTED FUNCTIONAL |
| List formulas and automatic refresh | Dependency propagation, circular-ref protection, reference/length mismatch checks | TESTED FUNCTIONAL after PR tests |
| DATA/CLEAR/FORMULA menus | Web tabs and actions; not exact TI cursor/menu semantics | PARTIAL |
| One-variable stats, means/medians/σx/Sx | Reference values and frequency bounds | TESTED FUNCTIONAL |
| Quartiles, min/max and Σx/Σx² | Computed via linked data list | TESTED FUNCTIONAL for unit-tested cases |
| 2-variable regression slope/intercept/correlation | Computed; TI's complete StatVars navigation/prediction menus are not cloned | PARTIAL |
| Statistical FRQ domain 0–99 | Fixed in this audit, including fractional weight support | TESTED FUNCTIONAL after PR tests |
| Permutations and combinations nPr/nCr | Reference cases from TI guidebook | TESTED FUNCTIONAL |
| Factorial 0–69 | **FIXED**: old code incorrectly allowed 70–170 | TESTED FUNCTIONAL after PR tests |
| rand() and randInt(A,B) | Numeric range tests, seeded repeatable independent PRNG | PARTIAL — TI algorithm and seed output sequence not matched |
| Constant K operator | Operator-first \`*2+3\`, 44-char guard; explicit apply button, not firmware auto-repeat workflow | PARTIAL |
| Function TABLE AUTO and ASK-X | f(x) table with checked fixed list of X inputs | TESTED FUNCTIONAL |
| Error detection and recovery | Domain/zero/circular/size errors; no exact TI localized message, cursor recovery or error categories | PARTIAL |
| Actual 4×16 physical LCD and menu icons | Floating responsive browser LCD, not physical screen | MISSING (hardware-UI parity) |
| TI directional-pad/key-by-key menus incl HYP/2nd | Web tabs, select/keyboard controls | PARTIAL |
| ON/OFF, 2-key reset, solar/battery, low battery | Web window close/reset, no hardware | NOT APPLICABLE |
| UI in currently built exams/quiz routes | Practice, Assessment and Lesson Quiz component mounts; browser QA pipeline | TESTED FUNCTIONAL, subject to run evidence |
| Timer, answer selection and navigation isolation | Source regression tests and Chromium interaction suite | TESTED FUNCTIONAL, subject to run evidence |
| Protected production Mock/exam engine | Not implemented: LMS still has a demo quiz backend | MISSING (LMS production scope) |

## Concrete bugs confirmed by the audit

- **AUDIT-CALC-001: TI factorial domain** — accepted 70! up to 170!, whereas official x! domain is 0–69. Patched lower bound.
- **AUDIT-CALC-002: TI FRQ domain** — accepted frequency >99. Patched element bound 0–99.
- **AUDIT-CALC-003: TI K entry** — only x-explicit formula worked; official TI supports operator-first format and 44-character K. Added syntax and guard, but not identical auto-repeat firmware workflow.
- **AUDIT-CALC-004: RAND seed** — lacked any seed control; added reproducible seed facility with **non-TI PRNG**. Exact manufacturer seed algorithm parity is still NOT proven.
- **AUDIT-CALC-005: FORMULA DIM MISMATCH** — silently treated absent rows as zeros and accepted list formulas without references. Now requires source list references and matching lengths.
- **AUDIT-CALC-006: Mobile overlay blocks answers** — real Chromium 390 px browser run #1 recorded 17 passing steps / **one real failed answer click**, due to calculator intersecting quiz answer button. Added split-screen mobile quiz + calculator layout; MUST pass a fresh independent Chromium run before FIX VERIFIED.
- **AUDIT-CALC-007: Enter auto-close** — TI completes pending parentheses on ENTER while browser evaluator previously returned an unmatched-paren error. Added safe UI normalization without mutating strict low-level parser.

## Automated regression suite and browser evidence

- Existing: \`npm run test:calculator\`, \`npm run test:calculator:extended\`, \`npm run test:calculator:mathprint\`.
- New guide-reference suite: \`npm run test:calculator:ti-audit\`.
- Existing P1 disposable PostgreSQL smoke, ASP 1,625-question integrity, all previous practice/assessment/learning tests and Vite production build.
- New independent real Chromium pipeline: [Calculator Real Browser Audit](../../.github/workflows/calculator-browser-audit.yml), run \`scripts/test-calculator-browser.mjs\`, with **1440×900 desktop** and **390×844 mobile touch**. Validates real calculator open, Math field editing, numerator/denominator, Enter, quiz answer selection while open, question navigation, desktop dragging, mobile within viewport, close/reopen and browser exceptions.
- The first Chromium run [#1](https://github.com/Minamilad162/Technica-LMS/actions/runs/41179220523) FAILED and exposed real mobile interception. See later runs in PR #12; a passing latest head is required for merge, and this report must record its exact run ID before calling the fix fully verified.
- Cloud browser/screenshots of published production instance, Safari/iOS physical device testing, exhaustive screen-reader testing, independent physical TI-calculator reference-output equivalence and real server exam tests remain **NOT DONE**.

## Release verdict

The tool is **usable as an original scientific calculator for preparatory quizzes if the regression and browser gates pass**, but **NOT approved to claim “every TI function with exact TI behavior”**. The missing/partial cells above are visible release-blockers for any exact-device-parity contract. The user can prioritize parity improvement under a follow-up workstream; do not conceal or mark these rows PASS without independent evidence.
