import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUALIFICATIONS} from '../src/qualification/qualificationData.js';
import {getUnitSourceMaterial,UNIT_SOURCE_MATERIALS} from '../src/qualification/qualificationUnitMaterial.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const panel=read('src/qualification/UnitMaterialPanel.jsx');
const extras=read('src/qualification/QualificationExtras.jsx');
const workspace=read('src/qualification/QualificationsWorkspace.jsx');
const css=read('src/qualification/qualificationUnitMaterial.css');

const codes=QUALIFICATIONS.flatMap(q=>q.units.map(([code])=>code));
assert.equal(codes.length,23,'7 OTHM6 + 6 OTHM7 + 10 ProQual NVQ');
assert.equal(new Set(codes).size,23,'Unit codes must be unique across the three Qualifications');
assert.equal(Object.keys(UNIT_SOURCE_MATERIALS).length,23,'Every Unit must have PDF-based material');
for(const q of QUALIFICATIONS){
 for(const [code] of q.units){
  const m=getUnitSourceMaterial(code);
  assert.ok(m,'Missing source material for '+code);
  assert.equal(m.code,code,'Wrong code');
  assert.equal(m.qualification,q.id,'Wrong awarding body/level');
  assert.match(m.sourceUrl,/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/);
  assert.ok(['December 2023','February 2018'].includes(m.sourceVersion));
  assert.ok(m.learningOutcomes.length>0,'Missing outcomes in '+code);
  assert.ok(m.learningOutcomes.every(x=>typeof x.title==='string'&&x.title.length>12));
  if(q.id==='nvq6'){
    assert.equal(m.sourceVersion,'February 2018');
    assert.equal(m.indicativeTopics.length,0,'Do not invent teaching topics absent from NVQ handbook');
  }else{
    assert.equal(m.sourceVersion,'December 2023');
    assert.ok(m.aim.length>40,'Missing Unit aim for '+code);
    assert.ok(m.indicativeTopics.length>0,'Missing indicative study topics for '+code);
  }
 }
}
assert.equal(getUnitSourceMaterial('UNKNOWN'),null);
assert.equal(getUnitSourceMaterial('Y/617/7540').learningOutcomes.length,4);
assert.equal(getUnitSourceMaterial('K/617/7543').learningOutcomes.length,3);
assert.match(panel,/getUnitSourceMaterial\(unitCode\)/);
assert.match(panel,/Unit Material/);
assert.match(panel,/Learning outcomes/);
assert.match(panel,/Competence outcomes/);
assert.match(panel,/Indicative study topics/);
assert.match(panel,/sourceUrl/);
assert.match(panel,/target="_blank" rel="noopener noreferrer"/);
assert.match(panel,/Assignment Briefs|centre-approved|centre Assignment Brief|not separate teaching lessons/i);
assert.match(extras,/function LearnerCourseSection\(\{unitCode,/);
assert.match(extras,/<UnitMaterialPanel key=\{unitCode\} unitCode=\{unitCode\}\/>/);
assert.match(extras,/<aside className="qfx-course-sidebar"/);
assert.match(extras,/title="Resources"/);
assert.match(extras,/title="Actions"/);
assert.match(extras,/<UnitMaterialPanel key=\{unitRef\} unitCode=\{unitRef\} compact\/>/);
assert.match(workspace,/getUnitSourceMaterial\(qualification\.units\[unitIndex\]\[0\]\)/);
assert.match(workspace,/unitCode=\{qualification\.units\[unitIndex\]\[0\]\}/);
assert.match(workspace,/Read Material/);
assert.match(css,/\.qfx-course-material-layout/);
assert.match(css,/@media\(max-width:680px\)/);
assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(panel),'Material UI must be source-only with no network/DB calls');
console.log('P34: 23 PDF-grounded Unit materials with per-Unit rendering, source provenance, learner right rail and Admin preview PASS');
