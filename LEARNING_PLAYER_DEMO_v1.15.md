# Technica LMS v1.15.0 — Learner Learning Player

## What is new

- **My Learning** is now a real course listing, separate from the Practice and Assessment routes.
- A **single published demonstration learning course**, **Process Safety Essentials**, features two modules and three lessons:
  1. **What process safety protects** — case-study video embedded from the U.S. Chemical Safety Board (CSB).
  2. **From hazard to top event** — illustrated reading and original PDF quick-reference guide.
  3. **Preventive and mitigative barriers** — illustrated reading and PDF guide.
- A **10-question original learning self-check** appears at the end of the learning path. It has answer choices, feedback with explanations, a 70% passing threshold and unlimited retries. It does not change the official ASP assessment bank or assessment results.
- Learners deliberately mark lessons complete. Their completion and quiz best score are saved **locally per demo Employee ID** (`technica-learning-v1:<id>:process-safety-foundations`). This is a demo, not a production progress/audit system.
- Desktop course outline, mobile expandable outline, keyboard-operated controls, per-lesson transitions, and `prefers-reduced-motion` handling.
- Home page now includes a **Start learning** path into the actual player.

## Video licensing / ownership

The case-study video is hosted on YouTube; no video is downloaded, copied, bundled, or claimed as Technica original content. The video is credited to the **U.S. Chemical Safety Board (CSB)**, and an explicit **Watch on YouTube** fallback link is supplied in case embedding is restricted.
- `https://www.youtube.com/watch?v=XuJtdQOU_Z4`
- Background context and public video listing: AIChE, *CSB Safety Video: Anatomy of a Disaster* (March 3, 2010).

The lesson writing, 10 question self-check, and two-page PDF quick-reference handout are original **demo material**, not certification questions and not part of the user-supplied ASP bank.

## Routes

- `/#/my-learning` — demo course library.
- `/#/learning/process-safety-foundations` — learning player.
- `/#/practice` and `/#/assessments` — existing independent features, unchanged.

## Development and testing

```bash
npm install
npm run dev
npm run test:learning
npm run check
npm run verify:bank
```

The learning-player test covers route wiring, the media paths, 3 lessons / 10 unique questions, per-user progress keys, completion math, the external video fallback and reduced-motion CSS.

**Limitations:** This is one deliberately seeded example course. The player is not yet populated dynamically from the Admin Course Builder and is not using shared server-side storage. Upload, streaming restrictions, quiz grading, and verified learner progress need a backend before production. An embeddable YouTube video also depends on YouTube availability and owner settings.
