# Technica Secure Viewer — Windows capture-exclusion pilot (P68)

> **Pilot, not DRM:** this is an independently packaged, native Windows window using the OS `WDA_EXCLUDEFROMCAPTURE` mechanism through Electron `BrowserWindow.setContentProtection(true)`. It is not a video DRM/CDM/key-license implementation. It cannot make browser captures, external cameras or all third-party tools impossible.

## What it actually tests

The Electron application creates a **hidden** Windows window, requests native capture exclusion **before any media content is loaded or the window is shown**, checks the framework reports that protection is enabled, then displays a local animated `<video>` and a generated sample PDF in the protected window. On supported Windows 10 2004+ / Windows 11 capture paths, Windows usually excludes the entire window from screenshots/screen recordings. This is operating-system behavior, not a JavaScript reaction after pressing PrintScreen.

You can then choose **Open live Technica LMS** or press `Ctrl+2` in the app to load the current test LMS origin in the **same protected window**. Signed Supabase media access and server authorization remain unchanged.

## Try it on a Windows PC

**Portable build from GitHub:** open the GitHub Actions workflow **Secure Viewer Windows pilot**, get the latest successful **technica-windows-protection-pilot** artifact, extract it, and open `Technica-Secure-Viewer-Pilot-0.1.0-x64.exe`. This build is unsigned, so Windows SmartScreen may warn; do not treat an unsigned pilot as a production-ready installer. The build workflow only runs when this pilot changes or is manually triggered, not on every LMS deployment.

**Developer run (Windows):**

```powershell
cd desktop\secure-viewer
npm install
npm test
npm start
```

Then:
1. Keep the protected demo window visible. Try `Win + Shift + S` (Snipping Tool), PrintScreen and a screen recording. Record which method excluded the window and which, if any, captured it.
2. Press **Open live Technica LMS** or `Ctrl+2`, sign in using an **existing email/password** account and open a published Lesson video and a private PDF. The same top-level window remains protected.
3. Use `Ctrl+1` to return to the offline demo, `Ctrl+R` to reload.

## Known constraints (not optional)

- **Google OAuth:** Google disallows OAuth in embedded browsers. The pilot **does not support Google Sign-in yet**; Google login would require system-browser OAuth + a validated app deep-link or localhost callback and careful Supabase Auth handling. Do not spoof Chrome's User-Agent or expose tokens in deep links just to get around this. Use email/password for the pilot.
- **Browser bypass:** the original `workers.dev` site still opens in Chrome and therefore can still be captured. This pilot is **not enforcement**; production would need server-controlled restrictions that prevent the same protected media from being opened in untrusted ordinary browsers, ideally backed by DRM/license services and a secure managed client. User-agent checks and a frontend-only flag are **not** secure enforcement.
- **Windows only:** this build intentionally refuses to show content on Windows earlier than build 19041 or on Linux/macOS. Electron's macOS capture exclusion is not dependable with ScreenCaptureKit.
- **Not absolute:** Microsoft explicitly states display affinity is *not* a strict security boundary or DRM. External cameras, advanced drivers/capture hardware, compromised machines, protected-window child popups and resource extraction remain possible. The API must be tested on actual hardware and capture products.
- **Native PDF:** the embedded Chromium PDF viewer may vary by Electron/Windows version. The demo provides an actual generated PDF iframe and a video stream to test. No PDF or video is automatically decrypted, transcoded, downloaded or uploaded by the desktop wrapper.
- **Site restrictions:** pop-up windows are denied, navigation is limited to the exact current test LMS origin, all download requests and sensitive permissions are blocked. That is intentional for the pilot but means features requiring pop-ups, camera or external sign-in are not yet supported.
- **Security:** Node integration is off, sandbox and context isolation are on, devtools/webviews and arbitrary external navigation are disabled. No Supabase keys, user credentials, learner course files or database migrations are bundled.
- **Deployment:** uploading this new app to GitHub **does not automatically deploy or change the Cloudflare Worker**, Supabase, domain or login flow.

References: [Electron setContentProtection](https://www.electronjs.org/docs/latest/api/browser-window/#winsetcontentprotectionenable-macos-windows), [Microsoft SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity), [Google OAuth browser policy](https://developers.google.com/identity/protocols/oauth2/policies), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).
