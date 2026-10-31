# Web-Only Content Protection Pilot — 2026-10-31

**Status:** Experimental, learner UX oriented. **Not a DRM system and not screenshot proof.**

## Owner decisions

- Web-only (Chrome/Edge/Safari/mobile browsers), with **no mandatory Android/iOS/Windows app**.
- Start before Supabase question-bank migration; protect visible Practice, Assessment, lesson quizzes, lesson video/material surfaces and post-exam answer reviews.
- Prefer minimal user disturbance. Restrict copy/context menu/drag to protected areas. Do **not** disable all web page controls, clipboard outside content, keyboard editing in calculator, or ordinary tab switching.
- Keep a light, repeated user/session watermark (not a giant intrusive banner).
- Trial a fast black curtain only if the browser actually receives a screenshot keyboard shortcut. It does **not** prevent or detect all screenshots; native captures and recorders are outside web app control.

## Implemented and testable

| Surface or action | Browser implementation | Claim |
|---|---|---|
| Exam and practice questions/options | `ProtectedContent` around active question panel; blocks copy/cut/contextmenu/selectstart/dragstart | Deterrence, bypassable |
| Learning quiz, result explanations, lesson and embedded video | Same wrapper over current content region | Watermark/copy deterrence, **not DRM** |
| Watermark | 9 low-opacity tiled labels (Learner ID + browser session token + UTC minute), non-interactive | Deters casual sharing; traceability **not server-authenticated** |
| Screenshot keyboard events | PrintScreen and selected macOS/Windows shortcuts, if delivered to JavaScript, set a brief black full-viewport curtain | Best-effort experiment, **not screenshot detection** |
| Ctrl+P / browser print | Key heuristic and `@media print` replaces printable protected route with blocked message/dark sheet | Prevents normal Print/PDF rendering in supportive browsers, bypassable |
| Other site pages | Unchanged | Normal selection, clipboard and context menus |
| Calculator and answer actions | Outside selection block; watermark overlay has `pointer-events:none` | Must pass Playwright |

## Hard technical limitations

**The site cannot command Windows, Mac, Android or iOS to return a black screenshot.** OS and browser capture UI can run before the page sees a keyboard event, or never dispatch it. A screen recorder, extension, DevTools, network interception or a second phone camera can still acquire content. A web-only protection header such as `Permissions-Policy: display-capture=()` merely restricts this *page's own* `getDisplayMedia()`, not native screenshot/recording; do not turn it on globally because future interactive live sessions may require voluntary in-page screen sharing.

Important **current demo insecurity**: `src/data/aspQuestionBank.json` includes 1,625 question stems, options, answer keys and explanations in the browser bundle; `src/lib/store.jsx` maintains client-only sessions. The demo YouTube embed and sample PDF URL remain public. **None** of these resources are server-protected. This pilot must never be represented as preventing extraction of paid bank/media.

## Tests and acceptance

- `npm run test:content-protection` — helper/route/print contract and scope.
- Dedicated [Protected Content Browser QA](../../.github/workflows/content-protection-browser.yml) — real Chromium desktop 1366px + mobile 390px; click options, demonstrate copy blocked only inside protected content, watermark visibility and non-interception, print media black page, synthetic PrintScreen event showing transient curtain, non-blocked calculator input, lesson-video/quiz access.
- **Passing a simulated keyboard event proves only the curtain behavior.** It is not evidence that an actual OS screenshot is blocked/black or any external recording is detected.
- Manual Safari/iOS, Android Chrome, browser menu Save/Print, OS snipping/recording and physical-camera test matrix required before operational claims.

## Next production milestones — after Supabase readiness

1. Move ASP question bank off public JavaScript, issue authenticated minimal per-question payloads from server, grade on server, never send answer keys before submission.
2. Bind watermark session and learner identity to server-authenticated IDs; consider server-side suspicious-activity audit (without implying screenshot detection).
3. Replace external demo video and public PDF distribution with properly entitlement-gated signed delivery; add licensed DRM for paid media if economically justified.
4. Privacy notice and configured retention policy for per-session tracking.

## 36. Actual-use audit: clipboard, print and external video limitations (2026-10-31)

**Reported issue:** Watermark visible, but users could still copy content, print or screenshot/record the page. Previous Chromium smoke tests dispatched synthetic events on the question heading and artificially triggered PrintScreen. Those results never proved real clipboard shortcuts, OS screenshot blocking or protection of an external YouTube iframe. Report reproduced as a scope/test-quality gap.

**Fix in PR #17:** Native capture-phase `document` copy/cut listeners inspect the actual `window.getSelection()` ranges and the protected container, so Ctrl+C from body/document is blocked when selected text intersects a protected question; preserve normal clipboard on unprotected pages and calculator inputs. Existing selectstart/contextmenu/drag protections remain scoped. Add unit cases for selection-target differences and real Playwright `Control+C` with read/write clipboard permission to ensure the clipboard stays unchanged for question text but works outside it.

**Print:** `@media print` now sets `#root{display:none}` whenever protected React content is mounted, and shows a clear protected-content notice using text that remains readable even when browser Print backgrounds are disabled. Use `beforeprint`/`afterprint` lifecycle markers to support print dialogs and cleanup. Browser menu print/Save as PDF and manual real-device validation remain separate and can bypass CSS if print styles are disabled; no website can stop screenshots with this CSS.

**External learning video:** Add explicit learner/session stamp overlay inside the video player container with `pointer-events:none` so YouTube playback controls continue working. This is an on-page visible watermark, **not DRM**. The third-party embedded YouTube iframe is cross-origin; its menu, full-screen mode, external URL and recording cannot be blocked from the Technica page. Fullscreen may exclude the outer watermark. Server-delivered first-party videos / licensed DRM and paid course entitlement enforcement remain needed.

**Capture/recording ceiling:** PrintScreen and system screenshot UI may never send a JavaScript event to the webpage. The existing black curtain is only best-effort if the page receives the specific shortcut. Do not claim screen recording or screenshot prevention. Do not add focus-loss blackout by default: it can obscure legitimate navigation, accessibility and calculator usage without guaranteeing capture prevention.

**Release:** All core calculator/quiz/ASP tests, P1 Postgres smoke, static tests, a fresh Chromium clipboard/video/print test on desktop and simulated mobile must PASS. Do not merge or deploy an untested regression. No Supabase tables, live SSO or Cloudflare deployment modified.

## Why only watermark appeared to work

The old copy logic intercepted only events bubbling from a node within the protected panel; real keyboard copy sometimes targets the document itself. The old print test checked CSS properties, but did not prove actual blocked printing. The video wrapper watermarked the broad lesson, while the YouTube iframe remained independent and playable/recordable. The black curtain only handles limited screenshot keyboard events delivered to JavaScript; it will **not** appear for many OS-native screenshot tools and cannot affect their output reliably.

The v1.1.8 correction adds a real clipboard selection test, stronger print stylesheet and player-level watermark. Native screenshots, screen recording and external YouTube playback still have hard browser limits and need independent server/DRM controls for improved security.
