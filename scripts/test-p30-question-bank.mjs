import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BANK_DIFFICULTIES,originalQuestionValues,stagedQuestionEdit,stagedToBatch} from '../src/production/questionBankDraft.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bank=read('src/production/AdminCourseBank.jsx');
const api=read('src/production/courseQuestionBankApi.js');
const sql=read('supabase/migrations/202611080004_p30_batch_question_bank_edits.sql');
const workspace=read('src/production/AdminToolsWorkspace.jsx');
const css=read('src/production/courseQuestionBank.css');
const draft={id:'d1',prompt:'Safety question',isActive:true,mockCandidate:false,mockExclusive:false,
 difficulty:'low',approvalState:'draft',linkedCount:0,linkedLessonIds:[]};
assert.deepEqual(originalQuestionValues(draft),{isActive:true,mockCandidate:false,difficulty:'low',addLessonId:''});
const pending=stagedQuestionEdit(draft,null,'difficulty','high');
assert.equal(pending.next.difficulty,'high');
assert.equal(stagedQuestionEdit(draft,pending,'difficulty','low'),null,'Reverting an edit removes the unsaved row');
let next=stagedQuestionEdit(draft,null,'mockCandidate',true);
assert.equal(next.next.mockCandidate,true);
next=stagedQuestionEdit(draft,next,'isActive',false);
assert.equal(next.next.isActive,false);
assert.equal(next.next.mockCandidate,false,'Deactivating a pending Mock candidate must clear the candidate tick');
assert.throws(()=>stagedQuestionEdit({...draft,isActive:false},null,'mockCandidate',true),/Enable/);
assert.throws(()=>stagedQuestionEdit({...draft,linkedCount:2},null,'mockCandidate',true),/unused Draft/);
assert.throws(()=>stagedQuestionEdit({...draft,approvalState:'approved'},null,'difficulty','medium'),/independent review/);
assert.throws(()=>stagedQuestionEdit({...draft,mockExclusive:true},null,'isActive',false),/reserved/);
assert.throws(()=>stagedQuestionEdit(draft,next,'addLessonId','uuid-test'),/Only Active/);
const q2={...draft,id:'d2'};
const l=stagedQuestionEdit(q2,null,'addLessonId','a-lesson-id');
const array=stagedToBatch({[draft.id]:pending,[q2.id]:l});
assert.equal(array.length,2);
assert.equal(array[0].expectedDifficulty,'low');
assert.equal(array[0].difficulty,'high');
assert.equal(array[1].addLessonId,'a-lesson-id');
assert(BANK_DIFFICULTIES.includes('unclassified'));
for(const required of [
 'Save All Changes','Discard','unsaved','Upload Excel / CSV','Add Question',
 'Difficulty: ','Active: ','Mock Exam: ','Assign Lesson Quiz:',
 'onChange={e=>stage(q,','batchStage(','Save or discard pending edits',
 'stagedToBatch(staged)','saveCourseBankBatch(db,courseId,payload,releaseLessonId',
 'onDirtyChange?.(pendingCount>0)','beforeunload','p30-table',
 'p30-question-cell','p30-bulk-bar'
])assert(bank.includes(required),'Missing P30 compact single-save UX '+required);
assert(!bank.includes('p28-answers'),'Per-row answers must not be rendered in the Question Bank list');
assert(!bank.includes('expanded===q.id'),'Questions must not expand under their rows');
assert(!bank.includes('setQuestionBankFlags(db,q.id'),'No per-row remote toggles may remain');
assert(!bank.includes('attachBankToLesson(db,lessonId,q.id'),'No per-row remote Lesson assignment may remain');
assert(bank.includes('getCourseBankBatchCapabilities(db)'),'Batch must be disabled without P30 installation');
assert(workspace.includes('questionBankDirty')&&workspace.includes('p30-hero'),'Admin navigation must protect unsaved edits and match approved header');
assert(css.includes('.p30-switch')&&css.includes('.p30-table')&&css.includes('.p30-save-all'),
 'Responsive mockup-inspired Question Bank controls must be styled');
for(const required of [
 'lms_p30_save_question_bank','p_changes:rows','lms_p30_bank_capabilities',
 "response.requested!==rows.length"
])assert(api.includes(required),'Missing one-call API or capability guard '+required);
for(const required of [
 'CREATE FUNCTION public.lms_p30_save_question_bank(','CREATE FUNCTION public.lms_p30_bank_capabilities()',
 "jsonb_array_length(p_changes)","v_count>500","v_item ?& ARRAY",
 "p_course_id","FOR UPDATE","Question changed since loading",
 "v_q.approval_state<>'draft'","public.lms_p29_set_question_flags",
 "public.lms_p28_attach_lesson_question","v_q.mock_exclusive",
 "public.lms_p9b_mock_items","RAISE EXCEPTION","REVOKE ALL ON FUNCTION"
])assert(sql.includes(required),'Missing P30 transaction/security '+required);
assert(!sql.includes('DROP TABLE')&&!sql.includes('DELETE FROM public.lms_questions'));
console.log('PASS P30 pure logic/UI/DB contracts: no answer expander, one atomic Save, staged/bulk controls, immutable Mock, P30 capability and unsaved navigation.');
