# Technica LMS — Motion and UI polish v1.7.0

Source of truth: `UI_COMPONENT_REFERENCE_GUIDE.md` (user-supplied master guide).

## Applied references

- **Bencho** (Sections 3.6, 23): fast tactile hover/press/focus feedback, selection emphasis and form focus states. Adapted with existing CSS; no third-party block copied.
- **Coterie / motion that behaves** (Sections 3.7, 6): brief contextual page/card entrance; smooth but stable analytics and modal navigation. No source assets copied.
- **A.S Motion Kit / e-learning** (Section 6): once-only hero/course reveal, progress visual, chart path draw; deliberately avoids continuous exam-motion.

## Implemented

- App-wide reveal controller (`src/components/MotionSystem.jsx`) using `IntersectionObserver` and a restricted DOM observer to support dynamically added cards; removed on route changes. Includes a no-IO fallback.
- Design-token-compatible CSS motion (`src/motion.css`): same current teal/navy/mint/coral/pastel palette; no UI framework, animation library or WebGL dependency added.
- Pages: authentication, home/learning, course/domain cards, practice topic selectors, analytics, builder, assessment overview, results/review and library.
- Hover/tap/keyboard states; modal, dropdown, toast, progress and chart line polish.
- On active exam/practice sessions: no scroll-stagger/choreography, preserving question readability and timer performance.

## Accessibility and performance

- Explicit `prefers-reduced-motion: reduce` opt-out; browser without `IntersectionObserver` keeps ordinary static UI.
- Opacity/transform only for reveals; no continuous high-cost animated images, parallax, WebGL, third-party JS, or extra network requests.
- Keyboard `:focus-visible` rings, touch targets left unchanged; no dependency on hover or animation for navigation.
- Existing data/business logic, question selection, authentication demo mode, and route access are unchanged.

## Scope and reference limits

The guide references other third-party kits and example screenshots not included in this project. Its dated library/version claims are not an instruction to install or upgrade anything. Design references are inspiration only; no external component code or proprietary assets copied.
