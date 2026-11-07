import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=text('src/qualification/QualificationsWorkspace.jsx');
const sections=text('src/qualification/QualificationExtras.jsx');
const css=text('src/qualification/qualificationExtras.css');
for(const [label,pattern] of [
 ['unit overview',/LearnerCourseSection/],
 ['resource and action area',/Resources[\s\S]*Actions/],
 ['learner contact diary',/LearnerContactSection/],
 ['registration metrics and checklists',/LearnerRecordsSection/],
 ['grading checklists',/Grading Checklists/],
 ['recording forms',/Recording Forms/],
 ['assessor/verifier status',/Assessor[\s\S]*Verifier/],
 ['criteria feedback',/Assessment Feedback/],
 ['contact diary',/Contact Diary/],
 ['admin resource management',/AdminResourcesSection/],
 ['admin contact records',/AdminPortfolioRecords/],
 ['assessor outcome history',/reviewHistory/],
 ['unit-specific admin records',/notesByUnit/],
 ['unit-specific admin resources',/resourceDraftsByUnit/],
]){
 assert.ok(pattern.test(ui)||pattern.test(sections),label+' not implemented');
}
for(const pane of ['overview','evidence','mapping','submission','contact','records']) {
 assert.ok(ui.includes("pane==='"+pane+"'"),'Missing learner pane '+pane);
}
assert.match(ui,/setPane\('overview'\)/);
assert.match(ui,/setReviewHistoryByUnit/);
assert.match(sections,/Not downloadable/);
assert.match(sections,/No approved resources published for this unit/);
assert.match(sections,/REFERENCE EXAMPLE · NOT YOUR ASSESSMENT/);
assert.match(sections,/No live assessor response connected/);
assert.match(sections,/No real learner file is accessed|preview only/);
assert.match(sections,/onResourcesChange/);
assert.match(sections,/Grading Checklists/);
assert.match(sections,/Recording Forms/);
assert.match(css,/\.qfx-snapshot/);
assert.match(css,/@media\(max-width:770px\)/);
assert.ok(!/\b(?:db|supabase|client)\.(?:from|rpc|insert|update|delete|storage)\s*[\.(]/.test(sections),'Extra UI must not mutate Supabase');
assert.ok(!/https?:\/\/(?:[\w-]+\.)?supabase\./.test(sections),'No embedded Supabase endpoints');
assert.ok(!/setInterval|localStorage|sessionStorage/.test(sections),'No implicit storage or ongoing background calls');
console.log('P26 qualification reference portfolio: resource/actions, assessor status, feedback diary, grading/record forms, registration/metrics and demo-only admin records PASS');
