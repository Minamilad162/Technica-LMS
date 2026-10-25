# Technica Consult LMS — logo placement (v1.5.1)

The original user-supplied `technica-logo.webp` (transparent WebP) was copied **unchanged** into:

`public/images/technica-logo.webp`

The shared `Brand` component in `src/components/Layout.jsx` now displays the logo directly beside **TECHNICA CONSULT** and the **LMS** badge. Because the component is reused, the logo appears in:

- Desktop left sidebar
- Responsive small desktop/tablet sidebar (logo-only at narrow width)
- Mobile top navigation
- Mobile navigation drawer
- Standalone practice and assessment session headers

`src/styles.css` contains scoped responsive rules. The original 11 course images and 1,625 questions are unchanged.
