import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const checkout=read('src/production/checkoutSimulationApi.js');
const journey=read('src/production/learnerJourneyApi.js');
const auth=read('src/pages/AuthPage.jsx');
const admin=read('src/production/AdminToolsWorkspace.jsx');
const bank=read('src/production/AdminCourseBank.jsx');
const practice=read('src/production/LivePractice.jsx');
const mock=read('src/production/LiveSelectedMockExam.jsx');
const css=read('src/styles.css');
const adminCss=read('src/production/adminTools.css');
const bankCss=read('src/production/courseQuestionBank.css');
const hubCss=read('src/production/liveExamPracticeHub.css');
const qualificationsCss=read('src/qualification/qualifications.css');

assert.match(checkout,/simulationEnabled=\(\)=>import\.meta\.env\?\.DEV===true/);
assert.match(checkout,/VITE_LOCAL_QA_DEMO==='1'/);
assert.match(journey,/localCheckoutEnabled=\(\)=>import\.meta\.env\?\.DEV===true/);
assert.doesNotMatch(admin,/No demo data or fabricated payment amounts/);
assert.doesNotMatch(admin,/StagingQaEvidencePanel/);
assert.doesNotMatch(bank,/Optional review tools for Practice and official Mock reservation/);
assert.match(bank,/Save All Changes/);
assert.match(bank,/OfficialMockBankFinalizer/);
assert.doesNotMatch(practice,/Questions are selected and scored in Supabase/);
assert.doesNotMatch(mock,/LIVE QUESTION BANK/);
assert.doesNotMatch(auth,/By continuing, you agree to our/);
assert.match(auth,/not yet a complete legal policy/);
for(const [name,source,pattern] of [
 ['app shell',css,/@media\(max-width:700px\)/],
 ['admin tabs',adminCss,/overflow-x:auto/],
 ['bank scroll',bankCss,/\.p30-bank \.p30-table-scroll/],
 ['exam hub',hubCss,/\.lep-page \.lep-tabs button/],
 ['qualifications',qualificationsCss,/\.qf-workspace \.qf-matrix-scroll/]
])assert.match(source,pattern,'Missing responsive coverage: '+name);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/font-size:16px/);
console.log('P83 PASS: checkout QA gated, production copy cleaned, mobile CSS guards retained.');
