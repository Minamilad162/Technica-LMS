import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSelectedMockReadiness,validateSelectedMockPayload} from '../src/production/selectedMockApi.js';
const read=p=>readFileSync(p,'utf8');
const base={engineVersion:'p71-fixed-bank-mock-v1',durationSeconds:18000,
 maxPerAttempt:200,officialMockUnchanged:true,requiredCount:200,
 source:'question_bank_mock_flags'};
const partial=validateSelectedMockReadiness({...base,ready:false,selectedCount:5,deliveredCount:5});
assert.equal(partial.ready,false);
assert.equal(partial.selectedCount,5);
const full=validateSelectedMockReadiness({...base,ready:true,selectedCount:200,deliveredCount:200});
assert.equal(full.ready,true);
assert.throws(()=>validateSelectedMockReadiness({...base,ready:true,selectedCount:5,deliveredCount:5}));
assert.throws(()=>validateSelectedMockReadiness({...base,ready:false,selectedCount:201,deliveredCount:200,requiredCount:20}));
const old=validateSelectedMockReadiness({...base,engineVersion:'p34b-selected-mock-v1',
 ready:true,selectedCount:5,deliveredCount:5});
assert.equal(old.ready,false);
assert.equal(old.engineUpgradePending,true);
const hub=read('src/production/LiveExamPracticeHub.jsx');
const bank=read('src/production/AdminCourseBank.jsx');
const learner=read('src/production/LiveLearnerWorkspace.jsx');
const view=read('src/production/LiveSelectedMockExam.jsx');
const api=read('src/production/selectedMockApi.js');
const sql=read('supabase/migrations/202611120001_p71_fixed_course_mock_from_bank.sql');
const liveMockCss=read('src/production/liveMock.css');
assert.match(hub,/LiveSelectedMockExam key=/);
assert.match(hub,/id="lep-mock-course"/);
assert.match(hub,/catalog\?\.courses\.find\(c=>c\.id===mockCourseId\)/);
assert.doesNotMatch(hub,/officialAsp|<LiveMockExam/);
assert.match(bank,/useState\(mode==='mock'\?'mock':'all'\)/);
assert.match(bank,/setUsage\(mode==='mock'\?'mock':'all'\)/);
assert.match(bank,/Saved selections for/);
assert.match(learner,/LiveSelectedMockExam key=/);
assert.match(view,/readiness\?\.selectedCount/);
assert.match(view,/LIVE QUESTION BANK/);
assert.match(view,/getSelectedMockReadiness\(db,course.id\)/);
assert.match(view,/document.addEventListener\('visibilitychange',visible\)/);
assert.match(view,/window.addEventListener\('focus',visible\)/);
assert.match(view,/className="live-mock-start"/);
assert.match(view,/Start Mock Exam/);
assert.match(view,/kind="mock-exam-surface" identity=\{\{id:user.id\}\}/);
assert.doesNotMatch(view,/kind="exam-question"/,
 'Active Mock uses one full-exam capture curtain, not only a question wrapper');
assert.match(view,/requestQuestionFullscreen\(ref.current\)/);
assert.match(view,/useQuestionFullscreenGuard/);
const protection=read('src/production/LiveProtectedContent.jsx');
const policy=read('src/lib/contentProtection.js');
const captureCss=read('src/contentProtection.css');
assert.match(protection,/kind==='mock-exam-surface'/);
assert.match(protection,/if\(manualCaptureResume\)\{timeout.current=null;return;\}/);
assert.match(protection,/tc-mock-curtain/);
assert.match(protection,/Resume exam/);
assert.match(protection,/!document.fullscreenElement\?\.contains\(ref.current\)/);
assert.match(policy,/kind==='mock-exam-surface'/);
assert.match(protection,/window.addEventListener\('keydown',onKeyDown,true\)/);
assert.match(protection,/window.addEventListener\('keyup',onCaptureKey,true\)/);
assert.match(protection,/document.addEventListener\('visibilitychange',onVisibility\)/);
assert.match(captureCss,/\.tc-capture-curtain.tc-mock-curtain:not\(\[hidden\]\)/);
assert.match(captureCss,/html.tc-quiz-exit-lock \.live-mock \.live-mock-protected-surface/);
assert.match(liveMockCss,/\.live-mock-protected-surface\{/);
assert.doesNotMatch(view,/Refresh Mock questions|setInterval\(.*Readiness/,
 'No manual refresh button or polling for Mock setup');
assert.doesNotMatch(hub,/className="lep-mock-promise"/,
 'Remove duplicate static mock overview cards');
assert.doesNotMatch(view,/Grading &amp; timer|<b>Server<\/b>/,
 'Remove mock placeholder Server stat');

assert.match(liveMockCss,/\.live-mock \.live-mock-start\{/);
assert.match(liveMockCss,/\.live-mock \.live-mock-start:disabled/);
assert.match(liveMockCss,/@media\(max-width:650px\)/);
assert.match(api,/engineUpgradePending:legacy/);
assert.match(api,/if\(v\.questionCount!==200/);
assert.match(sql,/CREATE OR REPLACE FUNCTION public\.lms_p34_selected_mock_readiness/);
assert.match(sql,/CREATE OR REPLACE FUNCTION public\.lms_p34_start_selected_mock/);
assert.match(sql,/IF v_count<>200 THEN/);
assert.match(sql,/'ready',v_count=200/);
assert.match(sql,/'engineVersion','p71-fixed-bank-mock-v1'/);
assert.match(sql,/search_path=''/);
assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.lms_practice_attempt_items/);
assert.doesNotMatch(sql,/UPDATE\s+public\.lms_questions|DELETE\s+FROM\s+public\.lms_p9b_mock_items/);
console.log('P71/P72/P73 PASS: fixed Course Mock 200/300 and full-attempt browser capture curtain, not just the question.');
console.log('Production SQL install and actual device/learner attempt verification remain pending approval.');
