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
assert.ok(!/\.from\(|\.insert\(|\.update\(|\.delete\(/.test(ui),'No Supabase mutations allowed in UI preview');
console.log('P35 premium Qualification heroes, 3 verified local images, clear responsive typography and workflow preservation PASS');
