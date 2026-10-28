# Master Web App Build Prompt — GitHub / Security / Production Ready

عايزك تساعدني تبني **Web App احترافي وقابل للتوسع والصيانة** في مجال:  
`[اكتب نوع المشروع هنا، مثال: nails salon / clinic / restaurant / internal company system / dashboard / booking platform]`

تعامل مع المشروع كأنه **منتج حقيقي قابل للبيع والتسليم والتشغيل production**، وليس مجرد prototype.

---

## 1. التقنيات الأساسية المطلوبة

- **Frontend:** React + TypeScript + Vite
- **Backend / Database / Auth:** Supabase
- **Hosting / Deployment / Serverless Functions:** Cloudflare Pages + Cloudflare Workers/Pages Functions عند الحاجة
- **Source Control:** GitHub
- **CI / Security Gate:** GitHub Actions
- **Dependency Monitoring:** Dependabot

### متطلبات أساسية

- لازم المشروع يكون **scalable, maintainable, secure, production-ready** قدر الإمكان.
- لازم يكون **Responsive** بشكل ممتاز على الموبايل والديسكتوب.
- لازم يكون قابل للرفع على GitHub ثم Cloudflare Pages بدون مشاكل npm / Vite / build.
- لازم يبقى فيه documentation واضح من أول نسخة، ويتحدث مع كل تغيير.

---

## 2. مبادئ التنفيذ العامة

- قبل التنفيذ، افهم فكرة المشروع وتحليلها عمليًا.
- جهز خطة مفصلة خطوة بخطوة للتنفيذ من البداية للنهاية.
- اقترح تحسينات إضافية ذكية حتى لو لم أطلبها صراحة، طالما مفيدة للمشروع.
- وضح في كل مرحلة: هنعمل إيه، ليه، فين، وإزاي.
- نفذ تدريجيًا ومنظمًا بدون كسر أي جزء شغال.
- أي تعديل أو إضافة لازم يكون محافظًا على استقرار المشروع.
- لا تغير أي شيء مستقر إلا لو فيه سبب واضح ومكتوب.
- لو فيه أكثر من اختيار تقني، اختَر الأنسب من حيث البساطة والجودة وقابلية الصيانة.
- لو فيه قرار بين حل سريع وحل أنظف طويل المدى، وضح الفرق واختر الأنسب للمشروع.
- لا تعطل TypeScript أو تخفي errors بدل حل السبب الجذري.
- لا تضيف dependency جديدة إلا لو ضرورية فعلًا، وبعد توثيق السبب.

---

## 3. المخرجات المطلوبة في بداية أي مشروع

قبل كتابة الكود، اعرض:

- Project breakdown واضح.
- Feature list مرتبة حسب الأولوية.
- Suggested app architecture.
- Database design proposal.
- Pages / modules / components structure.
- Roles and permissions إذا المشروع يحتاج ذلك.
- UI/UX direction.
- Color palette مقترحة.
- Font pairing مقترح.
- Animation style مقترح.
- Deployment approach.
- Scalability and maintainability considerations.
- Security considerations.
- Suggested folder structure.
- Initial testing strategy.
- GitHub / Cloudflare / Supabase production workflow.

---

## 4. متطلبات npm / package management / build

### 4.1 أوامر التشغيل والتحقق

قبل تسليم أي نسخة ZIP أو قبل أي commit مهم، لازم يتم تشغيل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

> لو المشروع لا يحتوي على script باسم `typecheck`، يجب إضافته في `package.json` مثل: `"typecheck": "tsc -b --pretty false"`.

- استخدم `npm install` أثناء التطوير أو عند إضافة مكتبة جديدة فقط.
- استخدم `npm ci` قبل build / deploy / GitHub Actions لأنه يعتمد على `package-lock.json` ويثبت نفس النسخ بدقة.
- لازم `npm audit --audit-level=high` ينجح قبل اعتبار النسخة production-ready.

### 4.2 package.json و package-lock.json

- لازم `package.json` يحتوي على كل `dependencies` و `devDependencies` المطلوبة فعليًا.
- لازم يتم إرفاق `package-lock.json` مع المشروع دائمًا.
- ممنوع الاعتماد على packages موجودة محليًا فقط.
- ممنوع تعديل lockfile يدويًا إلا للضرورة وبفهم كامل.
- تأكد أن روابط `resolved` داخل `package-lock.json` من npm الرسمي وليست registry داخلية أو خاصة ببيئة معينة.
- عند وجود مشاكل تحميل packages، اضبط registry على npm الرسمي:

```bash
npm config set registry https://registry.npmjs.org/
```

ويفضل وجود `.npmrc` واضح:

```ini
registry=https://registry.npmjs.org/
```

### 4.3 ممنوعات داخل ZIP أو GitHub

ممنوع إرسال أو رفع:

```gitignore
node_modules
dist
.wrangler
.dev.vars
.env
.env.local
*.zip
npm-debug.log*
```

المسموح والمطلوب:

```text
src/
public/
package.json
package-lock.json
README.md
PROJECT_CONTEXT.md
CHANGELOG.md
.env.example عند الحاجة
```

### 4.4 vite / tsconfig / alias

لازم يتم ضبط `vite.config.ts` و `tsconfig.json` لدعم alias مثل `@/`:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

وتأكد أن TypeScript paths متوافقة مع Vite alias.

### 4.5 Tailwind / PostCSS

- إذا تم استخدام Tailwind v3، استخدم إعداداتها المناسبة.
- إذا تم استخدام Tailwind v4، استخدم `@tailwindcss/postcss` وليس `tailwindcss` مباشرة داخل PostCSS.
- تأكد من تثبيت PostCSS و Autoprefixer عند الحاجة:

```bash
npm install -D postcss autoprefixer
```

لو المشروع يستخدم ESM و `type: "module"` في `package.json`، استخدم صيغة ESM في config files.

### 4.6 Cloudflare Pages build

الـ default deployment platform هو **Cloudflare Pages**، ويستخدم Cloudflare Workers/Pages Functions فقط عندما يحتاج المشروع server-side logic.

- Build command الافتراضي:

```bash
npm ci && npm run build
```

- Output / publish directory الافتراضي لتطبيق Vite:

```text
dist
```

- Environment Variables وSecrets توضع في Cloudflare dashboard أو secret store المناسب، ولا يتم commit للقيم الحقيقية.
- إذا تم استخدام Wrangler، احتفظ بملف configuration المناسب داخل Git مع عدم وضع secrets داخله.
- ممنوع رفع `.wrangler`, `.dev.vars`, `.env`, أو `.env.local` إلى GitHub أو ZIP.
- بعد أي تعديل في build/deploy config، يجب اختبار clean install ثم production build قبل النشر.

---

## 5. GitHub workflow الإلزامي

### 5.1 GitHub repo

- ابدأ المشروع على GitHub، ويفضل أن يكون **Private** في البداية.
- لا ترفع `node_modules`, `dist`, `.env`, `.wrangler`, أو أي ZIPs.
- لازم `.gitignore` يكون مضبوط من أول نسخة.
- كل مرحلة مهمة لها commit واضح.
- عند الوصول لنسخة مستقرة، اعمل Git tag مثل:

```bash
git tag v1.0-production-baseline
git push origin v1.0-production-baseline
```

### 5.2 GitHub Actions CI Security Gate

لازم يوجد workflow مثل:

`.github/workflows/ci-security.yml`

ويشغل على الأقل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

الغرض:

- منع build مكسور.
- كشف TypeScript errors.
- كشف high vulnerabilities.
- ضمان أن المشروع يشتغل من clean install وليس من جهاز المطور فقط.

### 5.3 Dependabot

لازم يوجد:

`.github/dependabot.yml`

- فعل dependency updates.
- لا تعمل merge تلقائي لأي PR من Dependabot.
- لا تدمج Major upgrades عشوائيًا مثل Vite major أو Tailwind major أو React major.
- Major upgrades تكون planned upgrade منفصلة.
- أي Dependabot PR عليه failed checks لا يتم دمجه.
- Minor/Patch updates يتم مراجعتها وتشغيل CI قبل الدمج.

### 5.4 Branch Protection

لو GitHub plan يسمح، فعل حماية `main`:

- Require status checks to pass.
- Require pull request before merging.
- Require CI Security Gate.

لو الـ repo private والخطة لا تطبق enforcement، نعتمد عمليًا على GitHub Actions + discipline + Cloudflare build/deploy gate.

---

## 6. Security baseline الإلزامي

### 6.1 ملفات security داخل المشروع

أنشئ الملفات التالية من أول مرحلة مناسبة:

- `SECURITY.md`
- `docs/current/SECURITY_PLAN.md`
- `docs/current/RELEASE_SECURITY_CHECKLIST.md`
- `docs/current/DEPENDENCY_AND_SUPPLY_CHAIN_POLICY.md`
- `docs/current/SECRETS_ENVIRONMENT_AND_CLOUDFLARE_POLICY.md`

### 6.2 Environment variables والـ secrets

- ممنوع رفع `.env` أو `.env.local` إلى GitHub أو ZIP.
- استخدم `.env.example` بدون قيم حقيقية.
- أي keys حقيقية تتحط في Cloudflare Environment Variables / Secrets فقط.
- في React/Vite frontend، استخدم فقط variables التي تبدأ بـ `VITE_`.
- ممنوع وضع `SUPABASE_SERVICE_ROLE_KEY` في frontend أو أي كود client-side.
- Supabase frontend يستخدم `anon key` فقط.
- أي server-only secrets تكون في Cloudflare Workers/Pages Functions Secrets فقط.

### 6.3 Supabase security

- فعل RLS على الجداول الحساسة.
- صمم roles من البداية عند الحاجة.
- افصل صلاحيات:
  - Super Admin
  - Admin
  - Company/Branch Admin
  - Normal User
  - Viewer
- لا تعتمد على إخفاء UI فقط كحماية؛ لازم قواعد database / RLS تمنع الوصول.
- راجع insert/update/delete policies بوضوح.
- لا تعرض بيانات خارج نطاق صلاحية المستخدم.

### 6.4 Dependency security

- لا تستخدم مكتبات مهجورة أو عليها vulnerabilities عالية بدون سبب واضح.
- لو مكتبة عليها `No fix available`، اقترح بديل أو وثق accepted risk مؤقتًا.
- أي dependency جديدة لازم توثق سبب إضافتها في `CHANGELOG.md` أو `PROJECT_CONTEXT.md`.
- تجنب إضافة مكتبات ضخمة لميزة بسيطة يمكن تنفيذها بكود بسيط.
- راجع حجم bundle وتأثير المكتبات على performance.

---

## 7. Production deployment على Cloudflare Pages

### 7.1 قبل الربط

تأكد من نجاح:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

### 7.2 إعداد Cloudflare Pages

- اربط الـ GitHub repository أو استخدم deployment workflow موثق.
- Branch الافتراضي: `main` ما لم يحدد المشروع غير ذلك.
- Build command:

```bash
npm ci && npm run build
```

- Build output directory:

```text
dist
```

- Environment Variables / Secrets في Cloudflare فقط، وليس داخل repository.
- لو المشروع يحتاج server-side endpoints، استخدم Workers/Pages Functions مع أقل صلاحيات لازمة وبدون exposing server secrets للـ frontend.

### 7.3 بعد deploy

نفذ smoke test سريع على الـ live deployment:

- Login.
- Home/Dashboard loads.
- Main navigation works.
- Core CRUD works.
- Filters/search work.
- Export/download features work.
- Auth/session works.
- Mobile view works.
- Console لا يحتوي على errors خطيرة.
- Critical API/RPC requests لا تحتوي على duplicate calls غير مبررة.

### 7.4 Rollback

وثق طريقة rollback بما يناسب المشروع:

- Cloudflare deployment rollback / previous deployment recovery.
- GitHub tag rollback.
- Database migration rollback أو forward-fix plan لو موجود.

---

## 8. التوثيق الإجباري داخل المشروع

من أول خطوة، أنشئ وتحدث ملفات Markdown مرجعية.

### 8.1 ملفات أساسية

- `PROJECT_CONTEXT.md`
- `CHANGELOG.md`
- `README.md`
- `DEPLOYMENT.md`
- `DATABASE.md`
- `SECURITY.md`

### 8.2 PROJECT_CONTEXT.md يحتوي دائمًا على

- وصف المشروع.
- الهدف منه.
- التقنيات المستخدمة.
- الهيكل العام للمشروع.
- القرارات المعمارية المهمة.
- الجداول والعلاقات.
- الصفحات والموديولات.
- الصلاحيات والأدوار.
- assumptions.
- ما تم تنفيذه.
- الخطوات التالية.
- dependencies المهمة.
- أي مشاكل تم حلها وكيف اتحلت.
- آخر نسخة مستقرة.
- طريقة التشغيل والـ deploy.

### 8.3 CHANGELOG.md

كل نسخة لازم تسجل:

- رقم النسخة.
- تاريخ تقريبي.
- التعديلات.
- هل التعديل UI / logic / security / docs / database.
- أي migration أو breaking change.
- نتيجة build/security checks إن أمكن.

### 8.4 Logic Registry / Business Rules Registry

لو المشروع يحتوي dashboards أو تقارير أو حسابات أو rules، لازم إنشاء ملف داخلي مثل:

`docs/current/LOGIC_REGISTRY.md`

أو حسب المشروع:

`docs/current/DASHBOARD_CHART_LOGIC_REGISTRY.md`

ويحتوي على:

- كل KPI أو chart مربوط بأنهي field.
- شروط inclusion/exclusion.
- keyword rules إن وجدت.
- rate formulas.
- percentage denominator rules.
- drilldown matching logic.
- filter behavior.
- default filters.
- أي exceptions.
- أي mapping rules.

أي تغيير في logic لازم يحدث هذا الملف في نفس النسخة.

### 8.5 Client Handover Documents

عند الاستقرار، جهز ملفات client handover:

- `docs/client/CLIENT_HANDOVER.md`
- `docs/client/PRODUCTION_OPERATION_HANDOVER.md`
- نسخة DOCX/PDF عند الحاجة.

محتوى handover:

- وصف النظام.
- طريقة التشغيل.
- طريقة deploy.
- الصلاحيات.
- source of truth للـ data.
- حدود النظام.
- backup/rollback.
- security operations.
- contacts/ownership placeholders.

---

## 9. متطلبات اتجاه الكتابة ودعم العربي/الإنجليزي

- لازم المشروع يدعم النصوص المختلطة عربي + إنجليزي بشكل صحيح في كل مكان.
- أي بيانات معروضة من المستخدم أو قاعدة البيانات يجب أن تدعم Bidi / RTL / LTR.
- استخدم `dir="auto"` في كل الحقول النصية التي يدخل فيها المستخدم بيانات:
  - input
  - textarea
  - searchable select
  - rich text
  - notes fields

### 9.1 Bidi helper component

```tsx
function BidiText({ children }: { children: React.ReactNode }) {
  return (
    <span dir="auto" className="bidi-text">
      {children}
    </span>
  );
}
```

### 9.2 CSS عام

```css
.bidi-text {
  unicode-bidi: plaintext;
  text-align: start;
  overflow-wrap: anywhere;
}

.code-token,
.ltr-token {
  direction: ltr;
  unicode-bidi: isolate;
  display: inline-flex;
  align-items: center;
  text-align: left;
  white-space: nowrap;
}
```

### 9.3 الأكواد والأرقام المرجعية

الأكواد يجب أن تظهر دائمًا LTR ومعزولة عن النص العربي، مثل:

- Action No.
- Recommendation No.
- Source No.
- IDs
- Email
- Phone
- Tags / Codes

استخدم `<bdi dir="ltr">...</bdi>` أو component مثل `CodeToken`.

### 9.4 تغيير لغة الواجهة

عند تغيير اللغة:

```ts
document.documentElement.lang = currentLanguage === "ar" ? "ar" : "en";
document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
```

- لا تعتمد فقط على اتجاه الصفحة العام.
- استخدم CSS logical properties مثل:
  - `margin-inline-start`
  - `padding-inline`
  - `border-inline-start`
  - `text-align: start/end`
- ممنوع معالجة مشكلة اتجاه الكتابة بتغيير الداتا المخزنة؛ الحل في UI/reusable components.

---

## 10. UI/UX requirements

- التصميم لازم يكون **premium / modern / elegant**.
- اهتم جدًا بالـ spacing والـ hierarchy والوضوح.
- استخدم ألوان وفونتات مناسبة لطبيعة المشروع.
- استخدم animations subtle وراقية وليست مبالغ فيها.
- كل شاشة محسوبة للموبايل والديسكتوب.
- اهتم بحالات:
  - loading
  - empty states
  - error states
  - success feedback
  - permission denied states
  - offline/network errors
- اجعل UX سريع وواضح.
- الكروت والجداول والفلاتر تكون قابلة للاستخدام على mobile.
- تجنب الزحمة، وفضل layout واضح ومريح.

---

## 11. Architecture and code quality

- استخدم feature-based structure قدر الإمكان.
- افصل:
  - UI components
  - business logic
  - data access
  - hooks
  - utilities
  - types
- استخدم reusable components.
- لا تكرر نفس logic في أكثر من مكان.
- أي rules أو calculations تكون في helper واضح ومختبر قدر الإمكان.
- استخدم TypeScript types بوضوح.
- لا تستخدم `any` إلا عند الضرورة ومع سبب.
- لا تترك console logs غير ضرورية في production.
- راعِ performance:
  - memoization عند الحاجة.
  - pagination / virtualization للجداول الكبيرة.
  - lazy loading للصفحات الكبيرة.
  - عدم إعادة تحميل charts بدون داعي.

---

## 12. Database / SQL / migrations

- أي SQL queries أو migrations تكون منظمة في ملفات واضحة.
- أسماء الملفات تكون مفهومة مثل:

```text
001_create_profiles.sql
002_create_orders.sql
003_rls_policies.sql
004_seed_defaults.sql
```

- أي migration لازم يكون لها هدف واضح.
- لا تعدل database schema عشوائيًا بدون توثيق.
- عند تعديل schema، حدث `DATABASE.md` و `PROJECT_CONTEXT.md`.
- راعِ indexes للأعمدة المستخدمة في filters/search.
- لا تخزن secrets داخل database tables إلا لو ضروري وبطريقة آمنة.

---

## 13. Export / PDF / PPTX / Excel / file generation

لو المشروع يحتوي Export أو Report أو PDF أو PPTX أو Excel:

- لازم يتم اختبار التصدير على local وعلى live Cloudflare Pages.
- الملف الناتج لازم يفتح في التطبيق المستهدف الحقيقي:
  - Microsoft PowerPoint للـ PPTX.
  - Excel للـ XLSX/CSV.
  - PDF viewer للـ PDF.
- لا تعتمد فقط على أن الملف يفتح في LibreOffice أو browser preview.
- تجنب handcrafted file formats المعقدة إلا لو لا يوجد بديل.
- لو تم استخدام dependency للتصدير، لازم تكون موثقة ومراجعة أمنيًا.
- أي download Blob/Object URL لازم يترك وقت كافي قبل revoke حتى لا يحدث corrupted download.
- أي export feature لازم يكون لها error handling ورسالة واضحة للمستخدم.

---

## 14. Testing strategy

قد لا ننفذ test suite كامل من أول يوم، لكن لازم التفكير في الاختبارات من البداية.

### 14.1 Required manual smoke test بعد كل release

- App opens.
- Login/logout works.
- Main dashboard/page loads.
- Navigation works.
- Core CRUD works.
- Filters/search work.
- Export/download works.
- Role permissions work.
- Mobile layout works.
- No critical console errors.

### 14.2 Technical checks

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

### 14.3 Functional tests حسب طبيعة المشروع

وثق test checklist داخل:

`docs/current/TEST_PLAN.md`

ويفضل لاحقًا إضافة:

- unit tests للـ utilities المهمة.
- integration tests للـ data access.
- E2E tests للـ critical flows عند الحاجة.

---

## 15. آلية التنفيذ والتسليم في كل مرة

- في كل رد، اذكر باختصار ما الذي تم تعديله.
- ارجع المشروع كاملًا في ملف ZIP عند أي تعديل مؤثر.
- الـ ZIP يحتوي كل الملفات داخل المسارات الصحيحة وجاهز للنسخ واللصق.
- ممنوع إرسال `node_modules`, `dist`, `.env`, `.wrangler` داخل ZIP.
- لو التعديل صغير جدًا، ممكن ترجع patch واضح، مع إتاحة النسخة الكاملة عند الحاجة.
- سمّي ZIP باسم واضح يحتوي version وسبب التعديل:

```text
project-name-v1.04-feature-name-no-node-modules.zip
```

- حدّث `CHANGELOG.md` مع كل نسخة.
- حدّث `PROJECT_CONTEXT.md` مع كل تغيير مهم.
- لو التعديل يغير business logic أو chart logic أو permissions أو security، حدث ملف registry/documentation المناسب.

---

## 16. Release workflow المقترح

لكل نسخة مهمة:

1. نفذ التعديل.
2. حدث docs.
3. شغل:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

4. جهز ZIP بدون generated/secret files.
5. اعمل commit واضح.
6. Push إلى GitHub.
7. راقب GitHub Actions.
8. لو CI Green، Cloudflare Pages deploy يشتغل.
9. نفذ smoke test على live.
10. لو stable، اعمل tag:

```bash
git tag vX.Y-stable
git push origin vX.Y-stable
```

---

## 17. Production operation / handover

عند الوصول لنسخة مستقرة، أنشئ:

`docs/client/PRODUCTION_OPERATION_HANDOVER.md`

ويحتوي على:

- GitHub repo link placeholder.
- Cloudflare Pages site link placeholder.
- Supabase project link placeholder.
- environment variables names فقط بدون قيم.
- deploy workflow.
- rollback plan.
- backup plan.
- security checklist.
- dependency update policy.
- support / maintenance notes.
- latest stable tag.

ممنوع وضع أي secrets داخل handover.

---

## 18. قواعد مهمة جدًا أثناء التنفيذ

- لا تكسر أي جزء شغال.
- لا تغير حاجة مستقرة إلا لو في سبب واضح.
- لا تعتمد على حلول محلية فقط؛ لازم المشروع يشتغل من clean install.
- لا تضيف packages لمجرد تسهيل سريع لو ممكن تنفيذ آمن وبسيط بدونها.
- لا تتجاهل build/type/security errors.
- لا ترفع أسرار أو ملفات generated.
- لا تدمج Dependabot PR failed.
- لا تعمل major dependency upgrade عشوائيًا.
- لا تغير business logic بدون تحديث documentation.
- أي feature جديدة تكون reusable وقابلة للتوسع.
- فكر في edge cases وempty/error states.
- اقترح naming conventions واضحة.
- اكتب next steps بوضوح في كل مرحلة.

---

## 19. طريقة البداية المطلوبة منك الآن

1. افهم فكرة المشروع.
2. راجع المتطلبات.
3. اقترح تحسينات إضافية.
4. اعرض خطة تنفيذ مفصلة جدًا خطوة بخطوة.
5. اذكر structure المشروع المقترح.
6. اذكر قاعدة البيانات المقترحة.
7. اذكر الصفحات الأساسية والمميزات.
8. اذكر الشكل المقترح للـ UI/UX.
9. اذكر الملفات التوثيقية التي ستنشئها.
10. اذكر خطة GitHub/Cloudflare/Security من البداية.
11. بعد ذلك نبدأ التنفيذ مرحلة مرحلة، وكل مرحلة ترجع النسخة الكاملة ZIP.

---

## 20. Performance & Web Security Hardening Baseline

هذه الفحوصات تدخل في أي مشروع جديد أو Audit لمشروع قائم **عندما تكون منطبقة على الـ stack**، ولا يتم اعتبار أي بند Pass بدون Evidence.

### 20.1 API / Data Access

- اكتشف N+1 queries/requests وأي fetch داخل loops.
- امنع duplicate API calls وrequest waterfalls غير الضرورية.
- استخدم pagination/server-side filtering بدل Full Dataset Loading عندما يكبر حجم البيانات.
- استخدم debounce/throttle للـ search/autocomplete الذي يرسل requests للخادم.
- Cache الـ expensive queries فقط مع TTL وinvalidation وعزل صحيح حسب user/company/filter/FY عند الحاجة.
- قلل API payload للحقول المطلوبة فقط وتحقق من compression الذي توفره المنصة بدل افتراضه.

### 20.2 Database / Supabase

- افحص slow queries وQuery Plans وmissing indexes قبل أي optimization.
- لا تضف indexes عشوائيًا؛ قارن read/write cost والاستخدام الفعلي.
- في Supabase، راجع RLS performance مع الحفاظ الكامل على authorization semantics، وافحص indexes للأعمدة المستخدمة في policies.
- إذا كان الاتصال عبر Supabase managed APIs/Supavisor فلا تنشئ connection pool إضافي بلا حاجة؛ افحص direct pooling فقط عند وجود backend connections مباشرة.

### 20.3 Frontend Performance

- فعّل route/component lazy loading وcode splitting للـ heavy modules عند الحاجة.
- راقب production bundle/chunk size، واحذف unused dependencies/imports بعد التحقق.
- تأكد من minification/tree shaking في production build.
- اضغط الصور، استخدم أبعاد مناسبة وlazy loading للصور غير الحرجة.
- استخدم loading skeletons عندما تحسن perceived UX.
- استخدم React Profiler أو قياس فعلي لاكتشاف unnecessary re-renders؛ لا تستخدم memoization عشوائيًا.
- استخدم pagination/virtualization للقوائم الكبيرة عند الحاجة.

### 20.4 Security Hardening

- HTTPS إلزامي في Production.
- `.env`, `.env.local`, `.dev.vars` وأي secrets ممنوعة من Git/ZIP.
- Password hashing وإدارة credentials تتم بواسطة Auth provider/server-side library موثوقة، وليس Frontend.
- استخدم parameterized queries / safe SDK calls ولا تبنِ SQL من user input.
- طبّق Input Validation على server/database boundaries، ومعها Output/API contract validation للبيانات الحرجة عند الحاجة.
- اضبط CORS بأقل origins/methods/headers المطلوبة.
- أضف Security Headers المناسبة مثل CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` وclickjacking protection حسب التطبيق.
- استخدم Rate Limiting على auth/public/expensive endpoints.
- استخدم CAPTCHA/Bot Protection مثل Cloudflare Turnstile فقط للـ public أو abuse-prone flows عند الحاجة، وليس كإضافة عمياء لكل صفحة.
- لا تعرض stack traces أو SQL/internal errors للمستخدم.
- استخدم logging/monitoring بدون passwords, tokens, secrets أو sensitive payloads.
- افحص Storage bucket/object permissions حتى لو كان directory listing غير منطبق على static hosting.

### 20.5 Release Evidence

قبل اعتبار Performance/Security item مكتملًا، صنفه بوضوح كواحد من:

- Implemented in application code.
- Managed by infrastructure.
- Configured but not verified.
- Not applicable.
- Missing / needs action.

وعند أي Performance fix، سجل before/after evidence متى أمكن: request count, query duration, payload size, bundle size, render count أو latency.

---

## 21. ملحوظة نهائية مهمة

هذا البرومبت هدفه بناء مشروع Web App احترافي قابل للتشغيل الحقيقي.  
الأولوية دائمًا: **استقرار + أمان + قابلية صيانة + تجربة مستخدم ممتازة**.  
أي قرار أو تعديل يجب أن يخدم هذه الأولويات، ويتوثق بشكل واضح داخل المشروع.