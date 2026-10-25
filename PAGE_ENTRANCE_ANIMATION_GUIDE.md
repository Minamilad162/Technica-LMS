# Technica LMS — Page Entrance Motion (v1.8.0)

## What changed

Page motion is now driven by a **per-page choreography** rather than one generic reveal selector. On every route visit, visible components enter in a designed reading order: headings → primary content → secondary cards → controls/details. Further content enters naturally on scrolling into view.

| Workspace | Entrance sequence |
| --- | --- |
| Home / My learning | Greeting → headline → learning hero → mistakes reminder → course filters/cards → learning statistics |
| Practice | Title → three steps → domain selectors → domain tiles → customization options → session summary |
| Admin Analytics | Heading/filters → four KPIs → activity chart/support panel → question-bank coverage → learner table |
| Course Builder | Course identity → content tabs → modules → side panels or chosen tab content |
| Assessment Overview | Heading → assessment hero → statistics → customization → instructions/content |
| Results | Heading → score card → result breakdown → answer review panels |
| Question Bank / Saved | Heading → domain filters → search → first six question cards; pagination cards animate on change |
| Learners | Heading → directory panel → first five table rows |
| Login / Sign Up | Brand → story → benefits; form heading → fields → actions |
| Active Assessment / Practice Session | Only brief initial container fade and a 220–275ms content refresh **on question change**, never delayed answer/timer controls |

## Behavior and implementation

- `src/lib/motionPlan.js` owns all routes, selectors, variants, and stage times. Keep brand/page CSS authoritative.
- `src/components/MotionSystem.jsx` uses one `IntersectionObserver` and one throttled `MutationObserver`; it **never** gates user actions, writes app data, or changes scores and timers.
- `src/motion.css` implements lightweight opacity/transform animations and overrides for small screens and reduced motion.
- Entrance delay is capped at **550 ms** when the element is already above the fold, and **110 ms** for below-the-fold content; lists are capped per group to avoid hundreds of staggered animations.
- On navigation away, classes/listeners are cleaned up; revisiting a route replays the entrance sequence.
- Animation ends by removing the temporary class, restoring normal CSS transforms and hover effects.
- Dynamic tabs or newly created module cards are picked up safely without resetting already-visible content.
- `prefers-reduced-motion: reduce` disables reveal and question animations completely; if the user changes this setting mid-page, pending elements become visible immediately.
- Mobile uses shorter fades and upward transitions, never sideways slides of important content.
- No new npm dependencies, WebGL, or 3D engines are used.

## Regression checks

```sh
npm run check
npm run verify:bank
npm run test:selection
npm run test:auth
npm run verify:images
npm run test:motion
npm run build
```

**Verification status at packaging:** all six source/data tests listed above passed. `npm run build` could not run here because package installation from npm Registry was unavailable and the offline npm cache did not contain project dependencies. Browser rendering, timing, and visual/mobile QA must be verified in a browser before production deployment.

## Future work

Treat `UI_COMPONENT_REFERENCE_GUIDE.md` as the master reference; choose simple purposeful patterns that enhance comprehension. Prefer the smallest change over replacing stable React components or using a heavy animation package. Keep course progress, auth, user data, assessments, and accessibility independent of the motion layer.
