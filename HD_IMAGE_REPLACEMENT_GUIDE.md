# New HD image assets — Technica LMS v1.4.0

The following original images from the previously uploaded `images.zip` are now replaced by **new source-generated photographs**, not merely enlarged versions of the old images. The relative URL paths remain exactly `/images/<name>.webp`; no manual replacements are needed. Each image also has a matched `-sm.webp` responsive variant.

| Image path | New source |
| --- | --- |
| `/images/moc-plant.webp` | compact_industrial_processing_skid_with_yellow_rai.png |
| `/images/pha-plant.webp` | industrial_refinery_processing_skid.png |
| `/images/emergency-plant.webp` | stainless_steel_process_tanks_and_piping.png |
| `/images/pump.webp` | industrial_centrifugal_pump_assembly.png |
| `/images/refinery.webp` | stainless_steel_distillation_towers_and_piping.png |
| `/images/tank-farm.webp` | industrial_tank_dome_with_yellow_stairway.png |
| `/images/course-banner.webp` | sunlit_stainless_steel_refinery_complex.png |

The following existing images are intentionally retained to preserve key elements of the approved UI: `hero-plant`, `practice-plant`, `process-vessel`, `hazop-engineers`.

*All UI code references continue to use their previous filenames.* Images are stored in `public/images/`.

Validation: run `npm run verify:images`, `npm run check`, `npm run verify:bank`, `npm run test:selection`, and `npm run build`. No Supabase database is needed.
