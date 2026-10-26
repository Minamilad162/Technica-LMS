## v1.10.0 Admin Courses Update

**New:** distinct Courses admin page, draft/scheduled/published course management, clickable learner profiles, and per-course PDF/video demo uploads. See `ADMIN_COURSE_MANAGEMENT_v1.10.md`. All edits/files remain **local-browser demo data**; publication schedules do not run on a hosted background server.


### v1.9.3 — Assessment review by course
The learner Review page now opens completed assessment courses inline, with all their past attempts, answer explanations, Practice again and Retake assessment actions. Practice submissions keep their separate immediate results route and do not enter assessment history. Demo results are stored locally per account; the production database is not connected. See `ASSESSMENT_REVIEW_BY_COURSE_v1.9.3.md`.

# تحديث v1.9.0 — ASP Course

- كورس **ASP Course** يحتوي 5 Domains بإجمالي **1,625 سؤال**، مستوردة من أول 5 شيتات في ملف Excel.
- **PSEE** كورس قادم بدون أي أسئلة حتى إضافة بنك أسئلته.
- **Practice**: المتدرب يحدد الكورس والـDomains وعدد الأسئلة والوقت وخيارات التدريب.
- **Assessment**: المتدرب يختار الكورس فقط، ويُطبّق النظام إعدادات الامتحان المحددة من شاشة **Admin → Course Builder → Assessment**.
- هذه النسخة Demo وتخزن الإعدادات محليًا؛ غير آمنة للامتحانات الإنتاجية حتى ربطها بـSupabase وصلاحيات السيرفر.

---

> **v1.6.1 demo login fix:** On the Login screen choose **Login with Demo Account** to log in directly as `TC1001`. Typing `TC1001` / `Demo@1234` still works. If a hosted version still shows the old error, redeploy this version and hard-refresh the browser.

## تحديث v1.6.0 — شاشات تسجيل الدخول وإنشاء حساب تجريبي

تمت إضافة التصميم المختار لشاشات Login وSign Up مع عرض مناسب للموبايل، وتسجيل خروج وRemember me. للتجربة: Employee ID: `TC1001`، Password: `Demo@1234`. الحسابات الجديدة مخزنة محليًا في المتصفح فقط، بدون Supabase أو رسائل بريد. **هذه ليست منظومة مصادقة آمنة للإنتاج**؛ لا تستخدم كلمات مرور أو بيانات شخصية حقيقية. التفاصيل بملف `AUTH_DEMO_GUIDE.md`.

> **v1.5.0:** All 11 site photos replaced with new clear, topic-specific scenes. See `HD_IMAGE_REPLACEMENT_v1.5.md`.

**تحديث v1.4.0:** استبدال 7 صور فعلية بصور جديدة عالية الجودة مع الحفاظ على الـPaths ونسخ الموبايل المتجاوبة. التفاصيل في `HD_IMAGE_REPLACEMENT_GUIDE.md`.

**تحديث v1.3.0 للصور:** تم تحسين أبعاد ووضوح صور المنصة الـ11، مع صور WebP أصغر للموبايل وتحميل متجاوب، مع الحفاظ على المحتوى والتصميم. اقرأ [IMAGE_QUALITY_UPGRADE.md](IMAGE_QUALITY_UPGRADE.md).

# TECHNICA CONSULT LMS — نسخة عرض للعميل v1.4.0 · Randomized 50 Questions Per Domain

المشروع ده نسخة **React + Vite** تفاعلية من التصميمات السبعة المرفقة، متجهزة للشاشات الكبيرة والموبايل.

## التشغيل لأول مرة على Windows أو Mac

1. ثبّت **Node.js 22** (يفضل أحدث نسخة LTS).
2. فك ضغط ملف ZIP في فولدر محلي.
3. افتح Terminal داخل فولدر المشروع ونفّذ:

```bash
npm install
npm run dev
```

4. افتح الرابط المحلي اللي هيظهر، وغالبًا `http://localhost:5173`.

لبناء نسخة جاهزة للنشر:

```bash
npm run build
```

ناتج النشر سيكون في فولدر `dist`، ويمكن رفعه على Cloudflare Pages أو Netlify.

### اختصارات Windows

- `START_DEMO_WINDOWS.bat`: لتثبيت المتطلبات أول مرة وتشغيل المشروع.
- `BUILD_WINDOWS.bat`: لبناء نسخة للنشر بعد تثبيت المتطلبات.

## الصفحات المنفذة

| الشاشة | الرابط داخل التطبيق | تفاصيل التجربة |
|---|---|---|
| 01 — Your learning workspace | `/#/home` | الهيرو، الكورسات، الفلاتر، التقدم، المتابعة |
| 02 — Build your practice | `/#/practice` | اختيار Domain واحد أو أكثر من أول 5 Domains من Excel وعدد الأسئلة والتوقيت وتغذية الإجابة |
| 03 — Learning analytics | `/#/analytics` | إحصائيات، رسم بياني، فلترة، جدول Learners، تصدير CSV |
| 04 — Course builder | `/#/builder` | Modules، Lessons، تعديل/إضافة/إعادة ترتيب، أسئلة جديدة |
| 05 — Assessment overview | `/#/assessments` | اختبار مستقل لكل Domain بـ50 سؤال عشوائي من بنك نفس الـDomain، مع خيارات تخصيص العدد والتوقيت وطريقة التغذية الراجعة |
| 06 — Assessment in progress | `/#/assessments/take` | إجابات، Question Navigator، Flag، Timer، حفظ محلي |
| 07 — Results and answer review | `/#/results` | نتيجة فعلية حسب إجابات المستخدم، ومراجعة الإجابات الصحيحة مع شرح Excel |

لرؤية كل الأسئلة: افتح **Question Bank** من القائمة الجانبية، أو افتح **Practise by ASP domain** من الصفحة الرئيسية.

لتجربة المسؤول: اضغط أيقونة/اسم المستخدم أعلى الصفحة ثم **Admin workspace**. للعودة اختر **Learner workspace**. للموبايل يوجد شريط تنقل أسفل الصفحة مع زر **More**.

## مهم جدًا بخصوص الـDemo

- بيانات المستخدمين والكورسات والـAnalytics تجريبية؛ أما بنك الأسئلة فهو من ملف Excel المرفق، بالنص والاختيارات والإجابات والتفسيرات كما هي. لا توجد قاعدة بيانات أو تسجيل دخول حقيقي.
- البيانات والتعديلات تتخزن في **localStorage** على نفس المتصفح فقط. يمكن إرجاعها من قائمة المستخدم بـ **Reset demo data**.
- يمكن تجربة إضافة الدروس والأسئلة، لكن رفع PDF/Excel حاليًا يعرض اسم الملف فقط **ولا يرفعه فعليًا**.
- بنك الأسئلة يضم **1,625 سؤالًا فريدًا** من أول خمسة شيتات: Domain 1 (250)، Domain 2 (625)، Domain 3 (200)، Domain 4 (300)، Domain 5 (250). كل سؤال يحتوي أربعة اختيارات A–D والإجابة الصحيحة والـExplanation الأصليين. الـAssessment يسحب افتراضيًا **50 سؤالًا عشوائيًا من الـDomain المحدد فقط**، دون تكرار داخل نفس المحاولة. خيار All 5 Domains متاح للاختبار المختلط (10 من كل Domain عند اختيار 50).
- يمكن البحث في `/#/question-bank` بفلتر Domain ومراجعة الإجابات والـExplanations. في الـPractice يمكن اختيار Domains مختلفة وعدد الأسئلة والتوقيت والتدريب على الأخطاء، وعدد الأسئلة الافتراضي أصبح 50. ونفس التخصيص متاح الآن في إعدادات Assessment.
- أسماء الـDomains ظلت **Domain 1 إلى Domain 5** لأن أسماء شيتات Excel مرقّمة ولا تتضمن مسميات تخصصية. لم نختلق أي تسمية.
- الـExcel الأصلي موجود في `source-excel/` للمراجعة. لم يتم إدخال Domains 6–9 في بنك الأسئلة بالنسخة الحالية، بناءً على نطاق الديمو.
- هذه نسخة عرض وليست امتحان ASP معتمدًا، ولم يتم تدقيق الحقائق العلمية للأسئلة بشكل مستقل.
- ملف `supabase/001_lms_schema_PROPOSED.sql` مجرد مقترح أولي للـProduction **ولا يتم تشغيله آليًا أو الاتصال به**.
- نسخ الـProduction تتطلب Supabase Auth وRLS وStorage وتأمين الـExam grading بالـEdge Functions وعدم إرسال الإجابات الصحيحة إلى Browser المتعلم.
- لا تستخدم أي `service_role` secret في الواجهة الأمامية.

## النشر على Cloudflare Pages

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22
- التطبيق يستخدم `HashRouter` لذلك الروابط الداخلية تعمل بصيغة `/#/home` من غير Rewrite Rules إضافية.

## ما يوجد داخل ملف ZIP

سورس React، ملف JSON بـ1,625 سؤال ومراجعة تلقائية له، ملف Excel الأصلي، صور محلية، جميع صور الـUI/UX السبع، تصميم CSS responsive، ملفات التخطيط للـSupabase، وثائق التشغيل عربي وإنجليزي، وسكربتات التشغيل والتحقق.

**الحالة:** نسخة Demo تفاعلية لإظهار الشكل وتجربة العميل؛ ليست نسخة Production وربط Supabase الفعلي مؤجل.

### التحقق من بنك الأسئلة

```bash
npm run verify:bank
npm run test:selection
npm run check
```

**التحقق الفعلي:** الـJSON والـDomains اتحقق منهم؛ مراجعة Syntax لكل ملفات JSX/JS تمت بنجاح. تعذر تنفيذ `npm run build` داخل بيئة إنشاء النسخة لعدم اتصال npm Registry، لذلك مطلوب اختبار الـBuild محليًا قبل نشر الديمو.

## تحديث v1.4.0 — اختيار 50 سؤالًا عشوائيًا لكل Domain

- افتح **Assessments**: اختر Domain 1 إلى Domain 5. الاختبار الافتراضي 50 سؤال من نفس الـDomain فقط، مهما كان عدد الأسئلة الموجود في البنك (250/625/200/300/250).
- اختر **All 5 domains** لو عايز اختبارًا مختلطًا ومتوازنًا.
- **Customize**: 10 أو 25 أو 50 أو Custom (من 1 إلى 50)، وتوقيت بدون مؤقت/للجلسة/لكل سؤال، مع اختيار التغذية الراجعة وبنك الأسئلة (All / Unseen / Previous Mistakes).
- كل Start جديد يعيد السحب عشوائيًا من نفس البنك، ويمنع التكرار داخل الاختبار الواحد فقط. من الطبيعي ظهور بعض الأسئلة في محاولات مختلفة.
- **Practice** ما زالت كما هي بجميع خياراتها، لكن الافتراضي أصبح 50 سؤالًا بدل 25، مع اختيار Domain واحد افتراضيًا.
- زر أي Domain في **Home → ASP Domains** يفتح Assessment لهذا الـDomain؛ صفحة Practice متاحة من القائمة.
- الاختبارات الآلية `npm run test:selection` نجحت لكل Domain ولحالات الـCustom وUnseen وMistakes.
- اختبار واجهة المتصفح/Production Build لم يتم هنا لأن بيئة البناء لا تتصل بخدمة npm Registry؛ شغّل `npm install && npm run build` على جهازك.


## تحديث v1.9.2 — Assessment

- شيلنا كارت عرض دومينات ASP المكرر من شاشة الـAssessment، وحطينا زر Start assessment في كارت بجانب Before you start (وعلى الموبايل التعليمات قبل زر البداية).
- مفيش حد أقصى لعدد مرات أداء الـAssessment، وMaximum attempts اتشال من إعدادات الـAdmin. مدة الاختبار وعدد الأسئلة ونسبة النجاح لسه من إعدادات الـAdmin.
- في الـPractice والـAssessment علامة تحذير الأسئلة اللي من غير إجابة **مش هتظهر بمجرد Next**؛ هتظهر لما المستخدم يضغط Review and submit، ويقدر يرجع للأسئلة دي أو يعمل Submit بإجابات ناقصة بعد تأكيد واضح.
