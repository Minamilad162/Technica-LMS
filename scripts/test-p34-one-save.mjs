import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSelectedMockReadiness,validateSelectedMockPayload}
 from '../src/production/selectedMockApi.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const bank=read('src/production/AdminCourseBank.jsx');
const api=read('src/production/courseQuestionBankApi.js');
const editor=read('src/production/AdminLessonQuizEditor.jsx');
const portal=read('src/production/LiveMockPortal.jsx');
const selected=read('src/production/LiveSelectedMockExam.jsx');
const learner=read('src/production/CourseLessonExplorer.jsx');
const p34a=read('supabase/migrations/202611080005_p34a_one_save_lesson_quiz.sql');
const p34b=read('supabase/migrations/202611080006_p34b_selected_mock_engine.sql');
const old=read('supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql');
const p30=read('supabase/migrations/202611080004_p30_batch_question_bank_edits.sql');
const has=(body,text,label)=>assert(body.includes(text),label+' missing '+text);
for(const key of ['lms_p34_save_question_bank','p_release_lesson_id',
 'lms_p34_bank_capabilities','p34a-v1','lms_p34b_admin_capabilities',
 'selectedMockOnSave'])has(api,key,'P34 frontend');
has(api,'return call(db,\'lms_p34_publish_lesson_quiz\'','P34 scoped publish');
for(const key of ['releaseLessonId','Save All Changes','saveCourseBankBatch(db,courseId,payload,releaseLessonId',
 'Publish saved Lesson questions on Save All Changes','Active, non-Mock questions publish immediately',
 'No separate Review Draft step','inspectLessonQuizPublication(db,inspectLessonId)'])
 has(bank,key,'P34 Admin');
assert(!bank.includes('>Review Draft questions</button>'),'No Review Draft step in Admin Save flow');
assert(!bank.includes('Draft link(s) require question approval AND publishing'),'No extra Draft step on Save');
has(editor,'publishBankLessonQuiz(db,lessonId,q.id)','P34 editor direct publish');
has(learner,"if(key==='quiz')void refreshLessonQuiz()",'Learner selected Quiz refresh');
for(const key of ['LiveMockExam','ASP Official Mock Exam','Exactly 200 questions selected'])
 has(portal,key,'P34 Mock UI');
for(const key of ['getSelectedMockReadiness(db,course.id)','startSelectedMock(db,course.id,requestId)',
 'saveSelectedMock(db,attempt.attemptId','submitSelectedMock(db,attempt.attemptId)',
 'attempt.questionCount','useQuestionFullscreenGuard','LiveProtectedContent'])
 has(selected,key,'P34 timed Selected Mock');
for(const key of ['CREATE TABLE public.lms_p34_lesson_releases',
 'ON DELETE CASCADE','lesson_only','public.lms_p34_release_one',
 "v_q.approval_state='archived'",
 'NOT v_q.is_active','v_q.mock_exclusive','v_q.mock_candidate',
 'public.lms_p30_save_question_bank(p_course_id,p_changes)',
 'public.lms_p34_save_question_bank','p34_admin_one_save_release',
 'REVOKE ALL ON FUNCTION public.lms_p34_release_one'])
 has(p34a,key,'P34A server');
assert(!/UPDATE\s+public\.lms_questions\s+SET\s+approval_state\s*=\s*'approved'/i.test(p34a),
 'Lesson release must not approve a bank Draft for Practice');
for(const key of ['CREATE TABLE public.lms_p34_selected_mock_attempts',
 'public.lms_p34_start_selected_mock','lms_p34_selected_mock_readiness',
 'lms_p34_save_selected_mock','lms_p34_submit_selected_mock',
 'lms_p34_abandon_selected_mock',"q.mock_candidate AND q.is_active",
 'NOT EXISTS(SELECT 1 FROM public.lms_p9b_mock_items',
 'NOT EXISTS(SELECT 1 FROM public.lms_p22_lesson_quiz_questions',
 "'mode','selected_mock'",'correct_index_snapshot','REVOKE ALL'])
 has(p34b,key,'P34B server');
assert(!/\b(?:UPDATE|DELETE|INSERT)\s+(?:INTO\s+|FROM\s+)?public\.lms_p9b_mock_items/i.test(p34b),
 'Official immutable Mock 200 records cannot be modified');
has(old,'Exactly 200 explicit question IDs required','Preserved official Mock');
has(p30,"v_q.approval_state='approved'",'Preserved P30 review boundary');
const now='2026-11-08T12:00:00.000Z',end='2026-11-08T17:00:00.000Z';
const rid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const cid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const qid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ready={ready:true,selectedCount:1,deliveredCount:1,maxPerAttempt:200,durationSeconds:18000,
 engineVersion:'p34b-selected-mock-v1',officialMockUnchanged:true};
assert.equal(validateSelectedMockReadiness(ready).ready,false);
assert.equal(validateSelectedMockReadiness(ready).engineUpgradePending,true);
assert.equal(validateSelectedMockReadiness({
 ...ready,engineVersion:'p71-fixed-bank-mock-v1',ready:true,
 selectedCount:200,deliveredCount:200,requiredCount:200,
 source:'question_bank_mock_flags'
}).ready,true);
assert.throws(()=>validateSelectedMockReadiness({...ready,ready:false}),/does not match the secure Course Question Bank/);
assert.throws(()=>validateSelectedMockReadiness({...ready,officialMockUnchanged:false}),/does not match the secure Course Question Bank/);
const questions=Array.from({length:200},(_,i)=>({
 id:'cccccccc-cccc-4ccc-8ccc-'+String(i+1).padStart(12,'0'),
 position:i+1,prompt:'Which action is safe?',
 options:['Verify authorization','Ignore hazard'],selectedIndex:null,flagged:false
}));
const attempt={attemptId:rid,courseId:cid,questionCount:200,
 mode:'selected_mock',state:'in_progress',durationSeconds:18000,
 serverNow:now,startedAt:now,deadlineAt:end,submittedAt:null,
 answeredCount:0,flaggedCount:0,correctCount:null,scorePercent:null,
 questions};
assert.equal(validateSelectedMockPayload(attempt).questions.length,200);
assert.throws(()=>validateSelectedMockPayload({...attempt,questions:
 attempt.questions.map((q,i)=>i===0?{...q,correct_index:0}:q)}),/reveal answer keys/);
assert.throws(()=>validateSelectedMockPayload({...attempt,questionCount:2}),/answer keys leaked or question count mismatched/);
assert.deepEqual(validateSelectedMockPayload({...attempt,state:'submitted',correctCount:1,scorePercent:0.5,
 submittedAt:now,questions:[]}).questions,[]);
assert.throws(()=>validateSelectedMockPayload({...attempt,state:'submitted',correctCount:1,scorePercent:0.5,
 submittedAt:now}),/Closed Mock cannot expose/);
console.log('PASS P34 frontend and SQL contracts: single Save publishes lesson-only Draft links, no Review Draft, selected Mock protected, official Mock untouched.');
