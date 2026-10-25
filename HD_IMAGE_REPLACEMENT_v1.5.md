# Technica LMS v1.5.0 — Completely New Images

Replaced **all 11 images** used by the React UI, with **11 newly generated, distinct industrial scenes**. The new scene descriptions and native pixel dimensions are recorded in `IMAGE_REPLACEMENT_MANIFEST_v1.5.json`.

- All existing `public/images/*.webp` names are preserved to keep component paths compatible.
- Every `-sm.webp` image is newly derived from the corresponding new main image at 780 pixels wide; nothing is upscaled.
- `src/components/HDImage.jsx` accurately maps native image widths in `srcSet`.
- Optimized WebP output for website load time; use original PNGs inside the optional `image-masters` folder when needing another crop.
- Home, Practice, Assessment, Course Builder images mapped by context; see manifest.
- CSS preserves text readability over images by using opacity and fade masks instead of `screen` blend modes.
- No database required. Question bank, assessments, all routes retained.

These are new generated industrial photographic-style illustrations (not photographs of a specific real plant).
