# P38 — Premium learner Subscription Plans design (2026-11-08)

## Approved reference / intent

Owner approved a light, colorful premium mockup with a mint-white **Choose Your Learning Plan** hero, learning-related illustration at the right, horizontal duration selector, three distinct pastel/deep-teal duration cards, a gently emphasized central plan, benefits row and transparent trust/activation information. The mockup is a *visual reference only*, **not an image to embed** or a source of plan pricing. Recreate its composition using responsive React/CSS and the existing logo/brand colors.

Scope is the learner-facing `SubscriptionPlans.jsx` route. Do not alter global navigation, Admin Tools subscription-plan management, P21 requests/grants, SQL policies, payment flow or verified access checks.

## Delivered design

- Spacious, bright hero with friendly teal gradient headline, pill benefits and a responsive **CSS-rendered** laptop/learning books/graduation-cap/checklist illustration using the existing Technica logo. No image generation asset is embedded as a screenshot.
- Real published P21 plan list, real name/description/duration/price/currency from Supabase. Highlight the six-month plan *if published*, else the median available plan; **Recommended** is a presentation suggestion, *not* a fabricated Most Popular ranking. Three cards when exactly three plans are published; grid gracefully handles any actual number of plans.
- Segmented duration controls are an **accessible focus/highlight switch** (all pricing cards remain visible), not a misleading exclusive filter. Clicking highlights the corresponding card; each plan keeps its own request CTA.
- Green/mint starter, emerald-gradient emphasized middle, soft lilac longest third card. Plan calendars are CSS/inline Lucide icon art. Benefits and platform feature/trust bars appear below.
- Money is never hardcoded. `displayPlanPrice` formats the configured P21 currency/amount. Comparison savings percentages appear *only* if a valid cheaper per-month price exists versus the shortest-duration published plan, both in the same currency. Unconfigured prices show an explicit unavailable state rather than fictitious amounts.
- If subscription is active, show server-owned plan and expiry, disable all new requests, and offer real `My Learning` callback. If a request is pending, show honest Awaiting Admin and disable duplicate plan requests.
- `Request this plan` remains a P21 Admin-review request via `lms_p21_request_plan`. No card checkout, simulated unlock, fake Secure Payment, claims of instant activation, or false paid entitlement. Status message says no charge and no access until activated.
- Responsive layout with 3/2/1 column transitions, card CTA and text overflow guards, reduced-motion support, keyboard focus and aria-pressed selection, desktop and mobile assets.

## QA and release

`npm run test:p38:subscription-ui` validates price and savings helpers, real-P21 integration, no invented prices/payments, accessibility and responsive design contracts. `npm run test:p21:subscriptions`, `npm run test:p36:countdown`, `npm run test:p37:header`, Vite build and existing CI/PostgreSQL suites must stay green. Confirm screenshot parity at 1440px desktop, ~1024px tablet, 390px/375px mobile in browser after Cloudflare release. Cloudflare deployment success and actual device QA are separate from GitHub CI.

No migrations. No live Supabase rows modified. No asset binaries, font files or source mockup screenshots committed. Existing admin-configured pricing and platform-wide subscription logic are authoritative.
