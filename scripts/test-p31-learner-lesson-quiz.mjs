import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchLessonQuiz,validateLessonQuizPayload,quizQuestionIdsChanged,
 summarizeSavedLessonAssignments} from '../src/production/lessonQuizSyncApi.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const ui=read('src/production/CourseLessonExplorer.jsx');
const admin=read('src/production/AdminCourseBank.jsx');
const portal=read('src/production/LiveLearnerWorkspace.jsx');
const p30=read('supabase/migrations/202611080004_p30_batch_question_bank_edits.sql');
const p22=read('supabase/migrations/202611070003_p22_lesson_journey.sql');
const question=(id='q1')=>({id,prompt:'Which control helps reduce the workplace risk?',options:['Risk assessment','Ignore hazards']});
assert.deepEqual(validateLessonQuizPayload([question()]),[question()]);
assert.deepEqual(validateLessonQuizPayload([]),[]);
assert.throws(()=>validateLessonQuizPayload([{...question(),correct_index:0}]),/invalid question/);
assert.throws(()=>validateLessonQuizPayload([{...question(),correctIndex:0}]),/invalid question/);
assert.throws(()=>validateLessonQuizPayload([question('q1'),question('q1')]),/invalid question/);
assert.throws(()=>validateLessonQuizPayload([{...question(),options:['Only one']}]),/invalid question/);
assert(quizQuestionIdsChanged([question('q1')],[question('q2')]));
assert(!quizQuestionIdsChanged([question('q1')],[question('q1')]));
const draftPreview=validateLessonQuizPayload([{...question(),is_published:false,position:1}],{adminPreview:true});
assert.equal(draftPreview[0].is_published,false);
let called=false,adminTableCalled=false;
const learnerDb={
 rpc:async(name,args)=>{
  called=true;
  assert.equal(name,'lms_p22_get_lesson_quiz');
  assert.deepEqual(args,{p_lesson_id:'lesson-123'});
  return {data:[question()],error:null};
 },
 from:()=>{adminTableCalled=true;throw Error('Learners must never SELECT admin P22 table');}
};
assert.deepEqual(await fetchLessonQuiz(learnerDb,'lesson-123'),[question()]);
assert(called&&!adminTableCalled,'Learner must use only the P22 access-verified RPC.');
const dbError={rpc:async()=>({data:null,error:{message:'Not authorized'}})};
await assert.rejects(()=>fetchLessonQuiz(dbError,'lesson-123'),/Not authorized/);
const previewDb={from:table=>{
 assert.equal(table,'lms_p22_lesson_quiz_questions');
 return {select:fields=>{
  assert(!fields.includes('correct_index'));
  return {eq:(name,value)=>{
   assert.equal(name,'lesson_id');assert.equal(value,'lesson-123');
   return {order:async()=>({data:[{...question(),is_published:false,position:0}],error:null})};
  }};
 }};
}};
const preview=await fetchLessonQuiz(previewDb,'lesson-123',{adminPreview:true});
assert.equal(preview[0].is_published,false);
assert.deepEqual(summarizeSavedLessonAssignments([
 {questionId:'a',expectedApprovalState:'approved',addLessonId:'lesson-123'},
 {questionId:'b',expectedApprovalState:'draft',addLessonId:'lesson-123'},
 {questionId:'c',expectedApprovalState:'approved',addLessonId:null}
]),{assigned:2,approved:1,draft:1});
for(const required of [
 "fetchLessonQuiz(db,active,{adminPreview})",
 "fetchLessonQuiz(db,lessonId,{adminPreview})",
 "scrollToLessonSection(pendingJump)",
 "if(!scrollToLessonSection(key))setPendingJump(key)",
 "if(key==='quiz')void refreshLessonQuiz()",
 "id={'cle-quiz-'+selected.id}",
 "ref={quizSectionRef}",
 "id={'cle-video-'+selected.id}",
 "id={'cle-material-'+selected.id}",
 "Refresh questions",
 "quizQuestionIdsChanged(questions,newQuestions)",
 "quizLoading||questions.length===0",
 "lms_p22_submit_lesson_quiz",
 "quizQuestionIdsChanged",
 "No published Knowledge Check questions",
 "quizError",
 "questions.map((q,i)"
])assert(ui.includes(required),'P31 Lesson UI missing: '+required);
assert(!ui.includes("db.from('lms_questions')"),'Learner must never read protected bank directly.');
assert(!ui.includes('lms_p28_list_bank'), 'Learner must never use Admin list Bank RPC.');
assert(portal.includes('<CourseLessonExplorer db={db} userId={user.id} courseId={chosen.id}'),
 'Actual learner course path must mount the same single-page Lesson component.');
assert(admin.includes('summarizeSavedLessonAssignments(payload)'));
assert(admin.includes('require question approval AND publishing in Course Builder'));
assert(p30.includes("public.lms_p28_attach_lesson_question(v_lesson,v_id,v_q.approval_state='approved')"),
 'P30 persists the selected Lesson quiz question as published ONLY after approval.');
assert(p22.includes("WHERE lesson_id=p_lesson_id AND is_published IS TRUE"),
 'P22 learner fetch must exclude Draft/unpublished quiz entries.');
assert(p22.includes("jsonb_build_object('id',id,'prompt',prompt,'options',options)"),
 'P22 server must omit answer keys from learner quiz payload.');
console.log('PASS P31: Course Question Bank Save -> approved published Lesson Quiz -> P22 learner RPC -> same-page Quiz jump/refresh; Draft hidden, answer keys protected.');
