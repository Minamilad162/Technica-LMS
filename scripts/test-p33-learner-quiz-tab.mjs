import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const learner=read('src/production/CourseLessonExplorer.jsx');
const admin=read('src/production/AdminCourseBank.jsx');
const lesson=read('src/production/AdminLessonQuizEditor.jsx');
const p30=read('supabase/migrations/202611080004_p30_batch_question_bank_edits.sql');
const p22=read('supabase/migrations/202611070003_p22_lesson_journey.sql');
const publishedLabel="['quiz','Quiz',CheckCircle2,'quiz']";
assert(learner.includes(publishedLabel),'Learner top shortcut must be explicitly named Quiz');
assert(learner.includes("id={'cle-quiz-'+selected.id}"),'Same-page Quiz section must exist');
assert(learner.includes('>Lesson Quiz</h3>'),'Learner Quiz title must be visible');
assert(learner.includes("if(!scrollToLessonSection(key))setPendingJump(key)"),
 'Clicking Quiz during load must still jump after section mounts');
assert(learner.includes("if(key==='quiz')void refreshLessonQuiz()"),
 'Quiz top shortcut must reload published questions after Admin publication');
assert(learner.includes("questions.length+' published quiz questions'"),
 'Tab must display actual published question count');
assert(learner.includes("key==='quiz'&&!lessonLoading&&<span"),
 'Quiz shortcut must remain visible at 0 published questions');
assert(!learner.includes("key==='quiz'&&!lessonLoading&&questions.length>0"),
 'Learner must not hide Quiz badge just because questions are pending');
assert(learner.includes('No published quiz questions yet. If your instructor assigned questions to this lesson'),
 'Learner must explain why a saved Draft link is not visible');
assert(learner.includes("fetchLessonQuiz(db,active,{adminPreview})"),
 'Learner must continue loading protected P22 published questions');
assert(!learner.includes("db.from('lms_questions')"), 'Learner must never read the Admin Question Bank');

for(const snippet of [
 '0 Published','2 Not published',
 'Publish saved Lesson questions on Save All Changes',
 'releaseLessonId','Open Lesson Quiz',
 'inspectLessonQuizPublication(db,inspectLessonId)'
]){
 const dynamic=snippet==='0 Published'||snippet==='2 Not published';
 if(!dynamic)assert(admin.includes(snippet),'Missing P33 admin guidance: '+snippet);
}
assert(!admin.includes('>Review Draft questions</button>'),'Quiz publication must not require separate Draft review');
assert(admin.includes("className=\"p30-advanced-review\"")||admin.includes("className=\"p30-advanced-review\""));
assert(lesson.includes('Lesson Quiz</strong>'));
assert(lesson.includes('To publish these saved linked questions'));
assert(p30.includes("v_q.approval_state='approved'"),
 'Draft approval cannot be skipped in P30 Lesson link publication');
assert(p22.includes('is_published IS TRUE'),'Learner must only see published records');
console.log('PASS P33: visible same-page Quiz tab even at 0 questions, clear Draft vs Published flow and unchanged secure P22/P30 learner gates.');
