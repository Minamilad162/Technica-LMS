# LMS image quality upgrade — v1.3.0

## Scope

- Enhanced all 11 existing site photography assets, preserving their crop, colors, subject and original composition.
- Exported 3×–4× high-pixel-density WebP versions and smaller mobile alternatives, all stored locally under `public/images/`.
- Added a responsive `HDImage` component using `srcSet` and `sizes`, browser decoding, lazy loading of secondary images, and high priority for hero imagery.
- No remote external image dependencies; all image paths remain compatible with the existing app.
- The originals were mostly small screen crops (189–741 px). Upscaling and edge enhancement improve displayed sharpness and output size but cannot create true photographic detail absent from the source. For actual native camera-grade HD quality, original photos or replacement assets are needed.

## Validation

See `IMAGE_OPTIMIZATION_REPORT.json` for source/original, HD, mobile dimensions and file sizes. The original v1.2.0 assets are available unchanged in the previous release.

## Reproduction

Images were enhanced offline using local Pillow/OpenCV processing: gentle denoising, luminance-only local contrast, Lanczos upsampling, restrained edge sharpening, and WebP quality optimization. This is *not* an AI reconstruction.
