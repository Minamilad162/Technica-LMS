# UI / Data Visualization / Finance Reference Guide

**File:** `UI_COMPONENT_REFERENCE_GUIDE.md`  
**Status:** Living project reference  
**Last reviewed:** 2026-09-15 (fresh source watch)  
**Review mode:** Official-source verification required before adopting a new library, premium component, or major-version upgrade.

---

## 1. Purpose

This file is the shared UI/UX reference for current and future projects.

Use it when we need to:

- redesign a page, dashboard, table, KPI screen, finance module, or data-entry experience;
- choose a component library or visual reference;
- decide between a custom table and an enterprise data grid;
- add modern motion, 3D, financial charts, advanced filters, spreadsheet-like editing, or analytics components;
- evaluate newly released UI libraries, design trends, and component patterns;
- avoid rebuilding an existing high-quality pattern unnecessarily.

This is **not** a rule to install every library listed here.

> **Core rule:** choose the smallest and safest solution that fits the project's existing architecture, performance needs, licensing constraints, accessibility requirements, and design system.

---

## 2. Mandatory Usage Rule

Before a significant UI/UX implementation or redesign:

1. Review this file.
2. Check the project's existing stack and components first.
3. Look for an applicable reference in the sources below.
4. Prefer adapting a proven pattern over introducing a large new dependency.
5. Verify the current official documentation and license before implementation.
6. Preserve existing business logic and data behavior.
7. Document any new adopted source/pattern in this file.
8. Record major UI decisions in the project's normal change/audit documentation.

Do **not** replace an existing stable component simply because a newer component looks better.

---

# 3. Current Reference Stack

## Quick Selection Matrix

| Need | Preferred Reference / Tool | Default Position |
|---|---|---|
| 3D / WebGL / shader / immersive UI inspiration | ThreeUI | Inspiration first |
| KPI cards / analytics / dashboard visualizations | DashboardCN | Preferred |
| Executive / finance / analytics dashboards | Tremor | Preferred |
| Polished application / fintech UI | Untitled UI | Strong visual reference |
| General React UI primitives / blocks | shadcn/ui | Preferred foundation |
| Fully custom React tables | TanStack Table | Preferred table engine |
| Complex enterprise grid | AG Grid | Preferred enterprise grid |
| Spreadsheet / Excel-like editing | Handsontable | Use when spreadsheet UX is required |
| Material-style advanced React grid | MUI X Data Grid | Alternative enterprise grid |
| Financial market/time-series charts | TradingView Lightweight Charts | Preferred for market-style charts |

---

# 4. Source Registry

## 4.1 ThreeUI

**Official:** https://threeui.com/browse

### Best for

- Three.js / WebGL inspiration
- interactive backgrounds
- shaders
- immersive effects
- 3D product scenes
- animated visual sections
- premium-feeling loading / hero / landing experiences

### Use in our projects when

- a 3D element adds meaningful context or branding;
- an executive/marketing page needs a memorable visual;
- a loading state, hero, or showcase can benefit from lightweight motion.

### Do not use when

- the page is data-dense and the effect distracts from information;
- mobile performance is a concern;
- WebGL significantly increases bundle/runtime cost for a minor decoration;
- accessibility or reduced-motion behavior cannot be handled correctly.

### Implementation rule

Treat ThreeUI primarily as an **inspiration/reference source** unless the exact component's license and implementation requirements have been verified.

For production:
- provide a static/fallback state where appropriate;
- respect `prefers-reduced-motion`;
- lazy-load heavy 3D assets;
- measure real mobile performance;
- never block core workflows behind 3D rendering.

---

## 4.2 DashboardCN

**Official docs:** https://dashboardcn.com/docs  
**Components:** https://dashboardcn.com/docs/components

### Current reviewed architecture

DashboardCN currently extends the shadcn/ui approach into data-heavy product UI.

Its current documented foundation includes:

- Tailwind CSS v4
- shadcn/ui theme variables/primitives
- Recharts via shadcn's chart wrapper
- TanStack Table v9 for data tables
- source-copy installation through a shadcn-compatible registry
- MIT-licensed source components

### Strong components/patterns

- KPI Card
- Trend Chart
- Sparkline
- Data Table
- Distribution Bar
- Segmented Meter
- Radar Chart
- Radial Gauge
- Funnel Chart
- Sankey Chart
- Heatmap
- Activity Heatmap
- Activity Rings
- Dot Plot
- Scatter Chart
- Timeline
- Metric List
- Period Tabs

### Best for

- operational dashboards
- HSE / KPI / performance systems
- management scorecards
- analytics products
- compact visualizations inside cards
- data-heavy enterprise pages

### Why it is important

It fills the gap between low-level UI primitives and complete dashboard products while keeping the source code inside the project.

### Default rule

For our React + Tailwind/shadcn projects, check DashboardCN **before creating a dashboard visualization from scratch**.

---

## 4.3 Tremor

**Official:** https://www.tremor.so/  
**Components:** https://npm.tremor.so/components  
**Changelog:** https://www.tremor.so/changelog

### Current reviewed position

Tremor currently focuses on dashboard/analytics UI built with React and Tailwind.

The official site currently advertises:

- 35+ open-source dashboard/chart components
- 300+ blocks/examples
- React + Tailwind CSS
- Radix UI
- Recharts-based visualizations
- copy-and-paste components plus an npm package

### Strong patterns

- Area / Bar / Line / Scatter charts
- Donut charts
- Funnel charts
- Spark charts
- Bar lists
- Data bars
- Progress circles
- Trackers
- Tables
- Date range pickers
- filter/input components
- dashboard/report page templates

### Best for

- executive dashboards
- finance dashboards
- revenue/cost views
- KPI reporting
- management reports
- trend cards
- period comparison views
- compact analytical UI

### Default rule

Use Tremor as a **design and interaction reference** even when we do not import Tremor directly.

Prefer its patterns when we need:
- polished analytics density;
- readable financial values;
- small contextual charts;
- clean filtering;
- dashboard composition.

---

## 4.4 Untitled UI

**React:** https://www.untitledui.com/react  
**Fintech dashboard example:** https://www.untitledui.com/react/components/dashboards/dashboard-16  
**License:** https://www.untitledui.com/license

### Best for

- fintech
- banking-style dashboards
- expense tracking
- balances and transactions
- application shells
- sidebars/navigation
- enterprise forms
- tables
- metric cards
- high-quality visual hierarchy

### Fintech pattern currently reviewed

The reviewed Fintech dashboard includes patterns for:

- account balances
- spending over time
- recent transactions
- responsive sidebar navigation
- dark mode
- accessible React UI

### Technology direction currently shown by the example

- React
- TypeScript
- Tailwind CSS
- React Aria

### Licensing guardrail

Untitled UI includes free/open-source components and paid PRO assets.

Before copying a PRO asset:
- confirm the organization/user license covers the project;
- do not redistribute the original UI kit/assets;
- do not create a competing UI library/template from their assets.

### Recent reviewed additions (2026-09-15 watch)

- React **Date Picker** family refreshed/published on Sep 11, 2026, including date/time, date range presets, calendar and calendar-card patterns.
- React **Context Menu** support (Aug 3, 2026): pointer, long-press and keyboard-triggered menus built on Dropdown, with submenus, checkable items and shortcut hints.
- PRO Enterprise also added Audit Log + API Management patterns (Jul 1, 2026), useful as enterprise admin/security UX references.

### Default rule

Use Untitled UI heavily for **visual reference and UX structure**.

Only copy implementation code/assets when the applicable license explicitly allows it.

---

## 4.5 shadcn/ui

**Blocks:** https://ui.shadcn.com/blocks  
**Data Table:** https://ui.shadcn.com/docs/components/base/data-table  
**Table:** https://ui.shadcn.com/docs/components/base/table

### Best for

- application foundations
- forms
- dialogs
- sheets/drawers
- sidebars
- dropdowns
- filters
- tables
- responsive application layouts
- accessible primitives

### Current table direction

The official Data Table guide currently uses **TanStack Table v9**.

The philosophy remains:

- use a simple Table for simple data;
- build a custom Data Table for project-specific behavior;
- avoid an oversized one-size-fits-all table abstraction.

### September 2026 `cn` migration

shadcn/ui now imports `cn` from the standalone `cn` package instead of composing `clsx` + `tailwind-merge` in every project. New registry items declare `cn` automatically, while existing projects remain compatible through `lib/utils.ts`.

For existing projects, treat this as an **optional controlled migration**, not a reason to refactor stable UI immediately. If adopted, use the official `shadcn migrate cn` path and run build/regression checks afterward.

### RTL note

shadcn/ui documents RTL support, which is relevant to Arabic/English products.

### Default rule

For new React/Tailwind application UI, shadcn is the preferred **base UI layer** unless the existing project uses another established system.

---

# 5. Table & Data Grid Decision Guide

## 5.1 TanStack Table

**Official:** https://tanstack.com/table/latest/docs/overview

### Current reviewed version

**TanStack Table v9**

### Architecture

Headless table/datagrid engine.

You own:
- markup
- styling
- cell components
- interaction design

TanStack owns:
- table state
- sorting
- filtering
- grouping
- pagination
- selection
- column behavior
- row models

### Important v9 direction

Features are opt-in and tree-shakable.

Current built-in capabilities include areas such as:

- cell selection
- cell spanning
- column filtering
- column grouping
- column ordering
- column pinning
- column resizing
- column visibility
- faceting
- global filtering
- row aggregation
- row expanding
- pagination
- row pinning
- row selection
- sorting

### Choose TanStack when

- we need complete design control;
- the table must match our own enterprise design system;
- the requirements are custom but not full spreadsheet behavior;
- bundle control matters;
- we already use shadcn/Tailwind;
- we need reusable custom table behavior.

### Avoid choosing it when

- the business expects Excel-like behavior immediately;
- we need a huge list of enterprise features out-of-the-box;
- the development cost of building table UX exceeds the value of customization.

### Preferred pairing

`TanStack Table + shadcn/ui + project design system`

For very large datasets consider server-side operations and/or virtualization.

---

## 5.2 AG Grid

**Official:** https://www.ag-grid.com/react-data-grid/  
**Key features:** https://www.ag-grid.com/react-data-grid/key-features/  
**Pricing:** https://www.ag-grid.com/license-pricing/

### Current reviewed version

Official documentation reviewed at **AG Grid 36.1.0**.

### Strong capabilities

- sorting/filtering/pagination
- custom cell rendering
- row grouping
- aggregation
- pivoting
- tree data
- column pinning
- large datasets
- advanced Excel export
- multi-sheet/export customization
- enterprise-grade grid behaviors

### Licensing model

- AG Grid Community: free / MIT for production use
- AG Grid Enterprise: commercial license required for Enterprise features

### Choose AG Grid when

- the grid is a central product feature;
- users expect power-user data tools;
- grouping/pivoting/aggregation matter;
- large data handling matters;
- Excel export is a major requirement;
- enterprise support is valuable.

### Recent v36/v36.1 adoption notes

AG Grid 36 added user-facing **Calculated Columns**, **Show Value As**, and automatic column generation for dynamic/unknown datasets. These are especially relevant to finance, analytics and ad-hoc management reporting.

AG Grid 36.1 added editable column/header names and more customizable Columns Tool Panel menus. It also introduced the **ag-dev AI coding skill** with version-matched guidance for coding agents such as Codex. For AI-assisted implementation, prefer version-matched official guidance over generic generated grid code.

### Default cost rule

Start by checking whether **Community** satisfies the requirement before choosing Enterprise.

Do not use Enterprise-only features in a commercial project without confirming the license.

---

## 5.3 Handsontable

**Official:** https://handsontable.com/docs/react-data-grid/  
**Pricing:** https://handsontable.com/pricing  
**License:** https://handsontable.com/docs/react-data-grid/software-license/

### Current reviewed version

**18.1.0** is shown as latest in the reviewed documentation.

### Strong capabilities

- spreadsheet-like cell editing
- row/column behavior
- copy/cut/paste
- Excel/Google Sheets-style workflows
- formulas
- autofill
- comments
- validation
- sorting/filtering
- row/column freezing
- export
- server-side data
- keyboard-heavy workflows

### Strong finance use cases

- budgeting
- planning
- forecasts
- cost models
- resource planning
- editable monthly input matrices
- bulk financial data entry
- Excel migration workflows

### Licensing guardrail

Handsontable requires a **commercial license for commercial production use**.

The non-commercial/hobby use path must not be assumed to cover our client/company projects.

### Choose Handsontable only when

the spreadsheet interaction itself is a real business requirement.

Do **not** add it merely to make a normal table look like Excel.

---

## 5.4 MUI X Data Grid

**Official:** https://mui.com/x/react-data-grid/  
**Features:** https://mui.com/x/react-data-grid/features/

### Current reviewed version

Reviewed docs show **MUI X Data Grid v9.13.0**.

### Model

- Community: MIT
- Pro: commercial advanced grid features
- Premium: higher-level analysis features

### Useful capabilities

Depending on plan:

- editing
- sorting
- filtering
- pagination
- virtualization
- column/row pinning
- tree data
- grouping
- aggregation
- formulas
- pivoting
- Excel export
- clipboard
- chart integration

### Choose MUI X when

- the project already uses Material UI;
- we want a batteries-included React grid;
- adopting MUI styling is acceptable;
- MUI ecosystem integration reduces implementation work.

### Default preference

For our custom-branded Tailwind/shadcn products:
- prefer TanStack for custom grids;
- prefer AG Grid for enterprise-heavy grids;
- use MUI X mainly when MUI is already part of the project.

---

# 6. Finance-Specific Visualization

## 6.1 TradingView Lightweight Charts

**Official:** https://tradingview.github.io/lightweight-charts/  
**Docs:** https://tradingview.github.io/lightweight-charts/docs

### Current reviewed version

**5.2**

### Best for

- stock/asset price charts
- market time-series
- candlestick/OHLC-style experiences
- portfolio history
- interactive financial charts
- dense time-series interactions

### Recent 5.2.1 notes

- Added an official **Agent Skill** for AI coding assistants covering v5 API conventions and common pitfalls.
- Improved crosshair/hover performance for charts combining series markers with large datasets by removing a dataset-sized clone from every pointer move.
- Added improved hovered Area/Baseline series layering when `hoveredSeriesOnTop` is enabled.

For Codex/AI-assisted financial chart work, consult the official skill/version guidance before implementation.

### Important requirement

The current license requires TradingView attribution as documented by the project.

### Use when

the product needs a genuine market/financial time-series interaction.

### Do not use when

a normal revenue/cost trend line from Tremor/Recharts is enough.

---

# 7. Recommended Patterns by Project Type

## 7.1 Executive / KPI / HSE / Operations Dashboard

Preferred stack/reference order:

1. existing project design system
2. DashboardCN
3. Tremor
4. shadcn/ui
5. Untitled UI for layout polish
6. TanStack Table for custom drilldowns
7. AG Grid only for advanced grid requirements
8. ThreeUI only for selective branded motion

Recommended UI patterns:

- KPI cards with micro-trends
- compact period selectors
- contextual tooltips
- drilldown from KPI/card/chart
- consistent status vocabulary
- small multiples
- sparklines
- distribution bars
- ranked lists
- period comparison
- sticky/frozen table headers
- accessible focus states
- no decorative chart without a decision purpose

---

## 7.2 Finance / Budget / Revenue / Cost Application

Preferred stack/reference order:

1. Tremor
2. Untitled UI Fintech
3. DashboardCN
4. shadcn/ui
5. TanStack Table
6. AG Grid or Handsontable based on workflow
7. TradingView Lightweight Charts only for market-style data

Recommended page structure:

### Top summary
- balance / revenue / cost / cash / variance cards
- percentage delta
- comparison period
- micro sparkline
- clear currency/unit

### Analysis section
- actual vs budget
- forecast vs actual
- cumulative trends
- revenue/cost waterfall where meaningful
- variance bars
- category contribution
- period filters

### Transaction/detail section
- searchable/filterable table
- sticky headers
- column visibility
- export
- clear numeric alignment
- totals/subtotals
- drilldown

### Financial input/planning
If users edit large matrices:
- consider Handsontable

If users mostly inspect/analyze:
- TanStack or AG Grid is usually better.

### Financial market data
If displaying price history:
- consider TradingView Lightweight Charts.

---

## 7.3 Data Entry / Monthly Input

Prefer:

- simple shadcn form/table when the input count is small;
- TanStack when rows require filtering, validation, and custom behavior;
- Handsontable when bulk spreadsheet editing is a real requirement.

Always include:

- validation near the field
- clear units
- autosave only when safe
- explicit save status
- stale-edit protection when relevant
- unsaved change warning
- keyboard navigation
- clear read-only vs editable states

---

# 8. Enterprise Table Design Standard

Regardless of library, our enterprise tables should consider:

## Readability

- clear typography
- numeric values aligned consistently
- currencies and percentages formatted consistently
- dates shown in one agreed format
- meaningful column widths
- ellipsis + tooltip only when necessary
- avoid tiny fonts to fit more columns

## Navigation

- sticky/frozen headers for long tables
- sensible pagination or virtualization
- keyboard navigation when users perform repetitive work
- search/filter state should be obvious
- reset filters must be easy

## Actions

- row action menus should not hide primary actions
- destructive actions require appropriate confirmation
- bulk actions should clearly show selected count
- loading state must not make the page jump unnecessarily

## Status

Use labels/colors consistently across the product.

Never encode critical meaning with color alone.

## Drilldown

Where a dashboard total comes from underlying records:
- totals must reconcile with drilldown records;
- filters must carry through;
- source-of-truth logic must be preserved.

---

# 9. Finance UX Rules

## Numeric accuracy

UI formatting must never change stored/calculated values.

Separate:
- raw value
- calculation
- displayed formatting

Be explicit with:
- decimal precision
- percentage basis
- currency
- thousands/millions scale
- sign convention
- exchange rate date/source where applicable

## Comparisons

Always label the comparison basis:

- vs previous month
- vs budget
- vs target
- vs prior year
- YTD
- rolling period
- fiscal year total

A green/red delta without its basis is not acceptable.

## Tables

Financial tables should support, as appropriate:

- subtotal / grand total
- sticky summary/footer
- export
- currency formatting
- variance amount
- variance %
- drilldown
- date/period filters

## Visuals

Avoid:
- unnecessary 3D finance charts
- overloaded multi-axis charts
- too many colors
- decorative gauges when a number/bar communicates better

Prefer:
- line/area trends
- variance bars
- stacked composition
- waterfall where it adds explanatory value
- sparklines
- compact comparison cards

---

# 10. Motion / Animation Standard

Animation should explain state or improve orientation.

Good uses:
- loading transitions
- chart entrance/updates
- expand/collapse
- drilldown
- state changes
- hover feedback
- micro-interactions

Avoid:
- long blocking animations
- constant decorative movement in data-entry pages
- animation that shifts table/layout position
- motion that delays access to information

Always consider:
- `prefers-reduced-motion`
- mobile performance
- interaction latency
- accessibility

---

# 11. Performance Rules

Before adopting a visual/component:

1. Check if the current stack can already do it.
2. Estimate dependency/bundle impact.
3. Lazy-load heavy visuals.
4. Virtualize large row/column sets when necessary.
5. Avoid rendering thousands of DOM nodes unnecessarily.
6. Debounce expensive filters/search.
7. Prefer server-side filtering/sorting when datasets require it.
8. Test realistic production-sized data, not only demo data.
9. Test mobile and low-powered devices for heavy animation/3D.
10. Do not use WebGL for decorative value that can be achieved cheaply with CSS/SVG.

---

# 12. Accessibility / RTL Standard

New UI patterns must be checked for:

- keyboard accessibility
- focus visibility
- contrast
- semantic labels
- screen-reader behavior where relevant
- reduced-motion support
- responsive behavior
- Arabic/English layout behavior when the project supports both languages

For RTL projects:
- do not simply flip every chart;
- verify table pinning, arrows, pagination, sidebars, dropdowns, and directional icons intentionally.

---

# 13. Licensing Checklist

Before adopting third-party code/assets:

- [ ] Is it free, MIT, open-source, or commercial?
- [ ] Does commercial production require a paid license?
- [ ] Is the feature we want in the free/community edition?
- [ ] Does the license require attribution?
- [ ] Can source code be copied into the project?
- [ ] Can it be modified?
- [ ] Are redistribution restrictions relevant?
- [ ] Does the client/company need to own a seat/license?
- [ ] Is the license compatible with our deployment model?
- [ ] Has the license status been recorded in the project documentation?

### Current notable guardrails

- DashboardCN: currently documented as MIT source components.
- AG Grid Community: free/MIT; Enterprise features require commercial licensing.
- Handsontable: commercial production requires a commercial license.
- Untitled UI: free/open-source and paid assets coexist; verify the specific component.
- TradingView Lightweight Charts: review and comply with attribution requirements.
- ThreeUI: verify the exact asset/component license before production use.

---

# 14. What NOT to Do

Do not:

- install a new UI library for one small card;
- mix multiple design systems visibly on the same page;
- copy a premium component without confirming license coverage;
- replace stable business logic during a visual redesign;
- use demo-only categories/values as production logic;
- choose charts only because they look modern;
- overuse glassmorphism, gradients, 3D, glow, or animation;
- hide important values behind hover-only interactions;
- make dense tables unreadably small just to avoid horizontal scrolling;
- add Enterprise-only grid features without license validation.

---

# 15. Design Trend Adoption Rule

New trends are welcome, but they must pass this filter:

## Adopt if it improves

- clarity
- speed
- hierarchy
- discoverability
- task completion
- perceived quality without harming performance
- accessibility
- data comprehension

## Reject if it mainly adds

- decoration
- cognitive load
- latency
- inconsistent styling
- maintenance cost
- licensing risk

### Trends worth watching

- bento-style information grouping
- compact analytical cards
- micro visualizations
- contextual command/search interfaces
- progressive disclosure
- inline drilldown
- rich but restrained hover states
- variable-density data tables
- semantic motion
- better empty/loading/error states
- AI-assisted table/filter interactions
- interactive financial time-series
- adaptive/responsive dashboard layouts

---

# 16. Source Evaluation Scorecard

When a new UI site/library appears, score it before adding it as a preferred source.

Rate each from 0–5:

| Criterion | Score |
|---|---:|
| Visual quality | /5 |
| Enterprise suitability | /5 |
| Accessibility | /5 |
| Performance | /5 |
| Customization | /5 |
| React compatibility | /5 |
| Tailwind/shadcn compatibility | /5 |
| Table/data capability | /5 |
| Finance suitability | /5 |
| RTL readiness | /5 |
| Documentation | /5 |
| Maintenance/activity | /5 |
| Licensing clarity | /5 |

### Recommendation

- **55+** → Preferred reference candidate
- **45–54** → Approved secondary source
- **35–44** → Use selectively
- **<35** → Inspiration only / avoid dependency

The score is a decision aid, not a substitute for technical judgment.

---

# 17. Current Preferred Architecture by Scenario

## Custom enterprise application
`shadcn/ui + DashboardCN/Tremor visual patterns + TanStack Table`

## Heavy enterprise data grid
`existing design system + AG Grid`

## Spreadsheet workflow
`Handsontable`  
Only after commercial licensing is confirmed.

## MUI-based existing application
`MUI X Data Grid`

## Fintech application
`Untitled UI + Tremor + DashboardCN + appropriate table engine`

## Trading/market product
`TradingView Lightweight Charts + appropriate table engine`

## High-impact marketing/visual screen
`ThreeUI inspiration + lightweight project-specific implementation`

---

# 18. AI / Codex Usage Instruction

When this file is included in a project, use the following rule:

> Before implementing or redesigning a UI, inspect the existing project architecture and this reference guide. Reuse existing project components whenever reasonable. Check the listed reference sources for relevant patterns. Do not add a dependency only for appearance. Preserve business logic and source-of-truth behavior. Verify licensing, accessibility, responsiveness, RTL implications, performance, and regression risk. If a new source or useful pattern is discovered, propose adding it to this file with the review date and rationale.

For a requested redesign, the implementation plan should state:

- reference source(s) used;
- why they fit the page;
- whether code is copied, adapted, or only visually inspired;
- dependency impact;
- licensing impact;
- performance impact;
- accessibility/RTL impact;
- regression checks needed.

---

# 19. Continuous Update Procedure

This file is a **living document**.

When reviewing updates:

## Check existing sources for

- new major/minor versions
- new components
- new blocks/templates
- breaking changes
- deprecated APIs
- performance improvements
- accessibility improvements
- new chart/table behavior
- new finance patterns
- licensing/pricing changes
- security notices
- AI-assisted UX features
- RTL improvements

## Search for new sources in

- enterprise dashboards
- data visualization
- data grids
- financial UI
- fintech design systems
- shadcn registries
- Three.js/WebGL UI
- React component systems
- charting
- spreadsheet UX
- accessible UI libraries

## Before promoting a new source

1. verify the official site;
2. inspect documentation;
3. inspect maintenance/release activity;
4. review license;
5. compare it with tools already in this file;
6. determine whether it adds a real capability;
7. score it using the scorecard;
8. add it to the changelog.

---

# 20. Update Watchlist

Monitor these locations periodically:

1. ThreeUI Browse
2. DashboardCN Docs / Components
3. Tremor Components / Blocks / Changelog
4. Untitled UI React / Dashboard examples / Changelog / License
5. shadcn/ui Blocks / Data Table
6. TanStack Table Docs / migration notes
7. AG Grid React docs / release notes / licensing
8. Handsontable docs / release notes / licensing
9. MUI X Data Grid docs / roadmap/releases
10. TradingView Lightweight Charts docs/releases

---

# 21. Review Snapshot — 2026-09-15

The following items were explicitly verified during this review:

- DashboardCN currently documents Tailwind CSS v4, shadcn/ui foundations, Recharts, TanStack Table v9, and MIT source components.
- TanStack Table's current docs are v9 and use opt-in/tree-shakable features.
- shadcn's current Data Table documentation uses TanStack Table v9.
- Tremor currently presents 35+ open-source components and 300+ block examples, with React/Tailwind/Radix/Recharts direction.
- Untitled UI includes a dedicated fintech dashboard pattern for balances, spending, and transactions.
- AG Grid documentation reviewed at version 36.1.0.
- AG Grid Community is free/MIT; Enterprise capabilities require licensing.
- Handsontable documentation currently shows version 18.1.0.
- Handsontable commercial production requires a commercial license.
- MUI X Data Grid documentation reviewed at v9.13.0.
- TradingView Lightweight Charts documentation reviewed at v5.2 and includes an attribution requirement.

---

# 22. Changelog

## 2026-09-15 — Fresh source watch update

Meaningful additions found after the initial consolidation:

- **shadcn/ui:** September 2026 migration from local `clsx` + `tailwind-merge` composition to the standalone `cn` package; existing projects remain compatible and migration is optional.
- **Untitled UI:** added/refreshed React date-picker family (Sep 11) and context-menu patterns; noted enterprise audit-log/API-management UI as a useful admin reference.
- **AG Grid 36/36.1:** recorded calculated columns, Show Value As, automatic column generation, editable header names, Columns Tool Panel customization, and the official `ag-dev` AI coding skill.
- **TradingView Lightweight Charts 5.2.1:** recorded official AI Agent Skill and meaningful large-dataset hover/crosshair performance improvement.
- No newer stable release was found in this watch that changes the recorded TanStack Table v9, Handsontable 18.1.0, MUI X v9, or AG Grid 36.1 version choices.

## 2026-09-15 — Initial consolidated reference

Added:

- ThreeUI
- DashboardCN
- Tremor
- Untitled UI
- shadcn/ui
- TanStack Table
- AG Grid
- Handsontable
- MUI X Data Grid
- TradingView Lightweight Charts

Also added:

- project selection matrix
- enterprise table rules
- finance UX rules
- performance rules
- animation rules
- accessibility/RTL rules
- licensing checklist
- trend adoption criteria
- new-source scorecard
- continuous update procedure
- AI/Codex implementation instruction

---

# 23. New Source Template

Use this template whenever a new source is added:

```md
## [Source Name]

Official:
Docs:
Changelog:
License:

### Category
Dashboard / Table / Finance / 3D / Charts / UI System / Other

### Best for
- ...

### Key strengths
- ...

### Weaknesses / risks
- ...

### Licensing
- ...

### Project fit
- ...

### Compared with existing sources
- ...

### Score
- Visual quality:
- Enterprise suitability:
- Accessibility:
- Performance:
- Customization:
- React compatibility:
- Tailwind/shadcn compatibility:
- Table/data capability:
- Finance suitability:
- RTL readiness:
- Documentation:
- Maintenance:
- Licensing clarity:

### Decision
Preferred / Secondary / Selective / Inspiration only

### Reviewed
YYYY-MM-DD
```

---

## End of file

**Maintenance principle:** evolve this guide when the ecosystem changes, but keep the source list curated. A smaller set of well-understood references is more useful than a large unverified bookmark list.
