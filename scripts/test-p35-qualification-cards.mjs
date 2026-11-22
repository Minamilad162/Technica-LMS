import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {QUALIFICATIONS} from '../src/qualification/qualificationData.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/qualification/QualificationsWorkspace.jsx');
const css=read('src/qualification/qualifications.css');
const extra=read('src/qualification/qualificationExtras.css');
const material=read('src/qualification/qualificationUnitMaterial.css');
assert.equal(QUALIFICATIONS.length,3,'Keep all three qualifications visible');
const expected={
 othm6:'/images/hazop-engineers-sm.webp',
 othm7:'/images/course-banner-sm.webp',
 nvq6:'/images/practice-plant-sm.webp'
};
const images=new Set;
for(const q of QUALIFICATIONS){
 assert.equal(q.heroImage,expected[q.id],q.id+' hero mapping incorrect');
 assert.ok(existsSync(new URL('../public'+q.heroImage,import.meta.url)),'Hero asset missing: '+q.heroImage);
 images.add(q.heroImage);
 assert.ok(q.units.length>0&&q.name&&q.level,'Qualification content was lost');
}
assert.equal(images.size,3,'Each qualification needs a distinct hero photo');
for(const t of ['qf-course-hero','qf-course-hero-shade','qf-course-hero-head','qf-course-hero-level','qf-course-hero-brand','qf-course-foot']){
 assert.ok(ui.includes(t),'Missing card UI element: '+t);
 assert.ok(css.includes('.'+t),'Missing card CSS selector: '+t);
}
assert.match(ui,/item\.heroImage/);
assert.match(ui,/<img src=\{image\} alt="" loading="lazy" decoding="async" aria-hidden="true"\/>/);
assert.match(ui,/onClick=\{onClick\}/);
assert.match(ui,/aria-label=\{'Open '\+item\.name\}/);
assert.match(css,/\.qf-course-hero\{height:166px/);
assert.match(css,/\.qf-course-body h2\{font-size:19px/);
assert.match(css,/\.qf-course-units\{[^}]*font-size:13px/s);
assert.match(css,/\.qf-workspace \.qf-pane-tabs button\{font-size:14px/);
assert.match(css,/\.qf-workspace \.qf-number-tab\{font-size:14px/);
assert.match(extra,/\.qf-workspace \.qfx-simple-details span/);
assert.match(extra,/\.qf-workspace \.qfx-card-title h3\{font-size:17px/);
assert.match(material,/\.qf-workspace \.qmat-outcomes li\{font-size:13px/);
assert.match(material,/\.qf-workspace \.qmat-topics li\{font-size:13px/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(ui,/function UnitTabs/);
assert.match(ui,/Map evidence to assessment criteria/);
assert.match(ui,/Record preview decision/);
assert.ok(!/\b(?:db|supabase|client)\.(?:from|rpc|insert|update|delete|storage)\s*[\.(]/.test(ui),'No Supabase mutations allowed in UI preview');

const live=read('src/qualification/LiveQualificationPortfolio.jsx');
const catalogue=read('src/qualification/QualificationCatalogue.jsx');
const premium=read('src/qualification/qualificationPremium.css');
assert.match(live,/ProgrammeListPremium/, 'The real DB-backed route must use the premium catalogue');
assert.match(live,/<QualificationSourcePreview/, 'Source-backed qualification syllabus must be connected');
assert.match(catalogue,/QUALIFICATIONS\.map\(item =>/, 'All three pathways must render, not only enrolled records');
assert.match(catalogue,/assigned\.filter\(row => qualificationFor\(row\.title\)/, 'Enrolment matching must stay role-scoped');
assert.match(catalogue,/onOpen\(enrolments\[0\]\.id\)/, 'Enrolled programmes must open live portfolios');
assert.match(catalogue,/onPreview\(item\.id\)/, 'Other programmes must only open read-only syllabus');
for(const title of ['Verified source syllabus','Assigned to you','Open portfolio','Explore actual Units']){
 assert.ok(catalogue.includes(title), 'Missing catalogue label: '+title);
}
for(const className of ['qf-live-lead','qf-live-feature','qf-live-kpi','qf-live-preview-notice']){
 assert.ok(premium.includes('.'+className), 'Premium live section missing: '+className);
}
for(const rpc of ["commit('save_claim'","commit('review'","commit('finalize'"]){
 assert.ok(live.includes(rpc), 'Do not drop live backend workflow: '+rpc);
}


const imported=JSON.parse(read('src/qualification/qualificationImportedReferenceCatalog.json'));
const sourcePreview=read('src/qualification/QualificationSourcePreview.jsx');
const migration=read('supabase/migrations/202611220002_qualification_reference_catalog.sql');
assert.equal(imported.specifications.length,4,'New + historical source editions must be available');
const keyed=new Map(imported.specifications.map(v=>[v.catalog_key,v]));
assert.equal(keyed.get('technica-source-othm6-2026').reference_number,'610/8264/8');
assert.equal(keyed.get('technica-source-othm6-2026').units.length,7);
assert.equal(keyed.get('technica-source-othm6-2026').units.reduce((n,u)=>n+u.outcomes.length,0),0,'Do not invent current 2026 criteria');
const legacy=imported.specifications.filter(v=>v.catalog_key!=='technica-source-othm6-2026');
assert.equal(legacy.reduce((n,s)=>n+s.units.length,0),23);
assert.equal(legacy.reduce((n,s)=>n+s.units.reduce((m,u)=>m+u.outcomes.length,0),0),93);
assert.equal(legacy.reduce((n,s)=>n+s.units.reduce((m,u)=>m+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0),0),390);
for(const spec of imported.specifications){
 assert.match(spec.source_pdf,/^https:\/\//);
 for(const unit of spec.units){
  assert.ok(unit.code&&unit.title&&unit.position>0);
  for(const o of unit.outcomes){
   assert.ok(o.title&&o.criteria.length>0);
   for(const c of o.criteria)assert.ok(c.code&&c.title.length>10&&!/Learning Outcome\s*-\s*The learner/.test(c.title));
  }
 }
}
assert.match(live,/portfolioRpc\(db,'reference_catalog'\)/,'Live learner must read source content from actual Supabase');
assert.match(catalogue,/references\.find\(source => source\.catalog_key/,'Source version selection missing');
assert.match(sourcePreview,/source\.units\.map/,'Source Unit navigation missing');
assert.match(sourcePreview,/outcome\.criteria\.map/,'Real assessment criteria navigation missing');
assert.match(sourcePreview,/source\.version==='November 2026'/,'Do not conflate 2023 and 2026 requirements');
assert.match(migration,/auth\.uid\(\) IS NULL/);
assert.match(migration,/REVOKE ALL ON FUNCTION public\.lms_qf_reference_catalog\(\) FROM PUBLIC, anon/);
assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.lms_qf_reference_catalog\(\) TO authenticated/);
assert.ok(!/portfolioRpc\(db,'(?:save_claim|review|finalize)'/.test(sourcePreview),'Reference browser must never create real assessment data');

console.log('P35 premium Qualification heroes, 3 verified local images, clear responsive typography and workflow preservation PASS');
