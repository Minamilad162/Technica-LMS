# LMS Design Reference

The **seven original desktop/mobile compositions** supplied by the client are in `design-reference/`. Use them as the visual source of truth when refining the React screens.

## Tokens used in the implementation

| Token | Value | Usage |
| --- | --- | --- |
| `--navy` | `#0b263a` | Primary headings and text |
| `--deep` | `#053a48` | Dark hero panels |
| `--teal` | `#006673` | Primary buttons and navigation |
| `--teal2` | `#007f80` | Highlights / chart data |
| `--mint` | `#dff7ec` | Progress and safe positive emphasis |
| `--butter` | `#fff5d8` | Tips and warnings |
| `--coral` | `#ffede7` | Review and error visual accents |
| `--lilac` | `#eeeafd` | Categories and neutral results |
| `--blue` | `#e8f3ff` | Secondary metrics |
| `--line` | `#e9ecee` | Soft card outlines |

Primary font: **Inter**, supported by **DM Sans** and system sans-serif fallback. The home hero headline uses a serif accent matching the references. The UI favors 10–16px rounded corners, spacious white cards, muted shadows, and subtle hover/transitions.

## Key responsive decisions

- `> 900px`: persistent desktop rail + dashboard topbar.
- `701–900px`: compact icon sidebar to keep dashboard width manageable.
- `<= 700px`: dedicated mobile presentation with compact header and sticky bottom navigation.
- Quizzes hide the normal navigation for focused exam-taking, and mobile uses a question drawer instead of a permanent sidebar.
- Honor `prefers-reduced-motion` for users who reduce animations.

Keep the original teal/mint/butter/coral/lilac palette, course art, simple cards and dense information hierarchy when iterating. Don't modify reference artwork unless specifically required.
