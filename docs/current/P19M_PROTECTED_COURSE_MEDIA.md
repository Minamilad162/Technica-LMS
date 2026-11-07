# P19-M — Protected Course Media Screen (Video + PDF)

**Status:** P19-M source/UI implementation, no new SQL migration. It does not provide OS-level screenshot blocking, protected hardware playback or DRM. It is a course-media workstream separate from the ongoing P19 Qualifications/Evidence UI preview PR; do not overwrite that work.

## Scope and existing implementation evidence

Before P19-M, `SecureLessonMedia.jsx` used an auto-opening MP4/WebM `video` element or a PDF `iframe`, both backed by P14 signed, short-lived, authorized URL requests. The player provided a user watermark, no-download video controls and visibility hiding, but it did not require fullscreen or show the Assessment-style blackout when the user exited fullscreen. Assessment already uses `src/lib/contentProtection.js` capture-key heuristics, a black “PROTECTED LEARNING CONTENT” curtain and `src/lib/questionFullscreen.js` for native fullscreen. Those utilities are reused in P19-M rather than implementing a separate screenshot detector.

## New user experience

1. Learner opens a verified paid lesson or Admin-approved free Intro. Existing P1/P15 RLS still gates blocks. An idle, branded protected-media poster appears for each PDF/MP4/WebM block. **No signed media URL is requested until the learner clicks Open Protected Video/PDF.**
2. The click synchronously requests **native Element fullscreen**, before any network action, on supported browsers. If denied on a desktop, media is hidden and the user can retry. On iPhone/other mobile browsers where native Element fullscreen is unsupported or rejected, a **clearly labeled inline fallback** keeps lesson content usable; screen capture cannot be prevented there.
3. Only after fullscreen validation (or mobile fallback) does the existing P14 Edge `view` action issue its signed URL; the existing private Storage, entitlement, origin allowlist, upload workflow and JWT checks are not changed. MP4/WebM uses native controls with download/PiP/remote playback **controls discouraged** and a visible viewer/time watermark.
4. When the user leaves fullscreen, backgrounds the page, loses desktop focus (except legitimate PDF iframe focus), invokes a known capture/print shortcut, or triggers printing, the viewer **synchronously** hides the video/iframe, pauses video, clears its `src`, and displays a full-screen black curtain with **PROTECTED LEARNING CONTENT**. Resume requires a new click and a new server authorization. The viewer supports an Exit action to avoid traps. Video seek position is retained locally on re-open when possible; this is *not* course completion proof.
5. Video URL authorization is renewed before the P14 120-second TTL while the viewer remains active. The signed URL is still a bearer capability valid until it expires, and network/media copies may remain cached by the browser; hiding the DOM cannot revoke an issued token.
6. The PDF currently remains a browser PDF document in a signed URL `iframe` inside the new protected viewer. The `#toolbar=0` hint hides toolbars in some browsers, but **cannot guarantee no print/download/export button in every native PDF viewer**. A *true canvas/image-page PDF workflow* needs a separate approved P14.1 protected-page or vetted pdf.js packaging integration and QA. The pre-existing P14.1 source-only PR is not implicitly installed, merged or applied by P19-M.

## Guarantees and limitations

- Browser signals and shortcuts are **best effort**. **Mobile screenshot button combinations, operating system screen recording, external cameras, some desktop OS shortcuts, browser extensions and DevTools are not reliably detectable or blockable by ordinary web JavaScript.** Never claim captures are blacked by the OS.
- An app may show the black privacy screen on focus loss/fullscreen exit, but that does **not** prove the actual captured image is black. Real guarantees on devices require OS/native secure rendering and may require licensed DRM plus compatible hardware, which P19-M has not implemented.
- Native iOS fullscreen fallback deliberately favors lesson usability over falsely claiming enforcement. Mobile blur alone is ignored to avoid false black screens when the soft keyboard appears. PDF iframe focus is also ignored for desktop blur.
- Watermark is visible, time-bound and attributable to part of the current verified learner identifier; it is **not** forensic DRM. The user can still film pixels or intercept an authorized signed response.
- All PDF/video asset authorization remains in the existing Supabase Edge function, with P1 paid/manual/Trial and P15 Free Intro RLS checks; demo P16 Checkout marker cannot grant media. Private lesson bucket stays private.
- Viewer-only change. **No Supabase SQL, migration, Storage bucket, Edge deployment, entitlements, production content or P17 cover settings changed.**

## Source changes

- `src/lib/lessonMediaFullscreen.js`: shared native fullscreen + Assessment screenshot-key heuristic, visibility/focus support, native mobile inline fallback.
- `src/production/ProtectedLessonViewer.jsx`: protected source lifecycle, synchronous blackout + video pause and PDF revoke, server reauthorization on resume, watermark and accessible controls.
- `src/production/protectedLessonViewer.css`: same central black privacy-curtain style, fullscreen media layout, mobile and print styles.
- `src/production/SecureLessonMedia.jsx`: replaces unguarded automatic player with explicit secure viewer, retains Upload Modal and existing lesson content queries.
- `scripts/test-p14-secure-lesson-media.mjs`: P14 regression now expects guard in the extracted viewer module.
- `scripts/test-p19-protected-course-media.mjs`: tests reused helpers, fullscreen policy, mobile compatibility, no URL before click, a11y/print/visibility/shortcut/stop operations and no private Storage bypass.

## Deployment / verification

1. Review current **main** and concurrent Qualifications P19 PR. This separate media change must not overwrite/rename anything in Qualifications or existing assessment UI.
2. GitHub CI: `npm run test:p19:media` plus P14, P5, browser content-protection suite, prior P1–P18 tests, Vite build and disposable PostgreSQL RLS smoke tests. No new SQL needed for P19-M.
3. Real learner smoke with Course → Domain → Topic → Lesson: paid video, paid PDF, Free Intro video, revoked and anonymous attempts. Verify initial video/PDF does not fetch a signed URL before click, fullscreen on desktop, black curtain on Esc/tab hide/print key, and a **fresh authenticated** view request after Resume.
4. Mobile QA: iPhone Safari (unsupported fullscreen fallback), Android Chrome native fullscreen, PDF iframe navigation, video seek/play, rotate/soft keyboard, return from background, small portrait sizes. Capture OS screenshots manually and record the actual result; do NOT assert they are black just because browser overlay logic is present.
5. Security audit: direct browser Storage list rejected, Edge JWT and allowed origins retained, 120-second token expiration tested, unauthorized paid lesson and Demo marker denied.
6. For true PDF native-toolbar removal, implement and approve P14.1 rasterized-page delivery or another vetted canvas renderer separately. **Do not silently merge PR #54 or apply P14.1 SQL**.
