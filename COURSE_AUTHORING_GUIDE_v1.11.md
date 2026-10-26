# Technica Consult LMS — v1.11.0 Course Builder

## Fix for newly created courses

Previously the builder wrapped module and lesson editing in `activeCourse.id === 'asp'`. A newly created draft course displayed the “ASP sample course” message with no way to create its own lessons. This hard-coded condition is removed.

## Admin workflow

1. **Courses → Create course**. Enter a name; choose a category from an editable **demo category list**; add a description; save as **Draft**, **Scheduled** (local time), or **Published**. The existing responsive modal is preserved.
2. Open the new course → **Course Builder → Details** to edit its name, category, and description in place.
3. **Content** → **Add module**; rename it; add, edit, reorder, and delete lessons. Every course gets its own `courseModules[courseId]`. ASP legacy `modules` are migrated non-destructively.
4. For a **PDF** or **Video** lesson, either choose a course-specific upload or upload a file directly in the lesson editor. Actual media bytes live in browser IndexedDB; the lesson stores the associated `mediaId`. Files may be added later to draft lessons. Preview uses actual stored bytes, never sample placeholders.
5. **Questions** → **Add question** manually (3 or 4 answers, correct answer, explanation), or **Import Excel / CSV**. A downloadable CSV template ships at `public/samples/course-question-import-template.csv`.
6. **Assessment** → configure the *admin-owned* question count, duration, pass mark, question group and enabled state. Do not enable an exam for which the bank has fewer questions than configured.
7. **Publish** when ready, or schedule publication using the Courses admin page. In this client-only demo, scheduled publication is evaluated from browser local time, not a backend scheduler.

## Excel behavior

- `.xlsx` and `.csv` accepted, up to 12MB; `.xls` is not supported. Multiple Excel worksheets are read and validated.
- Required headers (case and spaces ignored): `Question`, `Option 1`, `Option 2`, `Option 3`, `Correct Answer`. Alternative `Choice A` / `Option A` headers work. `Option 4`, `Explanation`, and `Domain` are optional.
- Correct answer can be **A–D**, **1–4**, or the exact text of a choice. Invalid rows are skipped and reported. Existing question prompts are deduplicated on a per-course basis; no dummy questions are silently inserted.
- ASP is limited to the supplied five domains. Domain 6–9 rows are skipped with a validation warning when importing into ASP. New courses keep all valid rows in their own course group.
- File bytes and course content are **demo-local**. They are not Supabase uploads; saving data in this browser is not production persistence.

## Tests

- `npm run test:authoring` — course/module and bank separation, import normalization, published-only learner availability and admin assessment configuration.
- Regression suites: `npm run verify:bank`, `npm run test:courses`, `npm run test:admin`, `npm run test:review` and other existing tests.
- Tested XLSX parser with the existing ASP workbook containing nine worksheets: exactly 1,625 recognized ASP-domain records and 875 skipped out-of-scope; the same workbook imported into an independent new course produced 2,500 valid course-scoped question records.

## Limitations

- The full Vite production build may need to be run on a developer computer/CI because this execution environment cannot access the npm registry and contains no local `node_modules`.
- The XLSX reader uses the browser's `DecompressionStream('deflate-raw')`, available in current Chromium. CSV is a fallback where this API is unavailable.
