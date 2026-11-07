import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeQuestionRows} from '../src/lib/questionImport.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rows=[['Question','Option A','Option B','Option C','Correct Answer','Explanation'],
 ['What is a safe electrical isolation step?','Verify zero energy','Ignore isolation','No action','A','Synthetic rationale']];
const parsed=normalizeQuestionRows(rows,{courseId:'10000000-0000-0000-0000-000000000002',domainId:null,sourceName:'synthetic.xlsx'});
assert.equal(parsed.questions.length,1);
assert.equal(parsed.questions[0].correct,0);
assert.equal(parsed.problems.length,0);
const sql=read('supabase/migrations/202611080001_p28_course_bank_quiz_links.sql');
const api=read('src/production/courseQuestionBankApi.js');
const bank=read('src/production/AdminCourseBank.jsx');
const quiz=read('src/production/AdminLessonQuizEditor.jsx');
const builder=read('src/production/LiveCourseBuilder.jsx');
const workspace=read('src/production/AdminToolsWorkspace.jsx');
for(const required of [
 'ADD COLUMN bank_question_id uuid REFERENCES public.lms_questions',
 'CREATE TRIGGER lms_p28_quiz_link_guard',
 'CREATE TRIGGER lms_p28_bank_assignment_guard',
 'CREATE FUNCTION public.lms_p28_import_bank(',
 'CREATE FUNCTION public.lms_p28_list_bank(',
 'CREATE FUNCTION public.lms_p28_attach_lesson_question(',
 'CREATE FUNCTION public.lms_p28_mark_nonasp_mock(',
 'CREATE FUNCTION public.lms_p28_approve_nonasp(',
 "IF NOT public.lms_p1_actor_is_admin()",
 "v_q.course_id<>v_course","v_q.mock_exclusive","p_publish",
 "ON CONFLICT(course_id,source_id) DO NOTHING",
 "'draft',false",
 "REVOKE ALL ON FUNCTION"
])assert(sql.includes(required),'Missing P28 DB constraint '+required);
for(const fragment of ['verifiedLiveAdmin(db)','p_course_id:courseId','p_items:rows',
 'p_lesson_id:checkId(lessonId)','p_question_id:checkId(questionId)'])
 assert(api.includes(fragment),'Missing verified P28 API '+fragment);
assert(!sql.includes("to_regclass('public.lms_p9b_mock_items')"),'P9B must not block non-ASP Course Bank migration');
assert(sql.includes('P28 missing prerequisites:'),'Admin requires exact missing P1/P4/P22 diagnostics');
assert(bank.includes('importQuestionFile(file,courseId,domainId)')&&bank.includes('Confirm Draft Import'));
assert(bank.includes("selected.slug!=='asp'")&&bank.includes("selected.slug==='asp'"));
assert(bank.includes('reserveNonAspMockQuestion')&&bank.includes('approveNonAspBankQuestion'));
assert(quiz.includes('Choose from Course Bank')&&quiz.includes('attachBankToLesson(db,lessonId,q.id'));
assert(quiz.includes('q.mockExclusive')&&quiz.includes('item.bank_question_id'));
assert(builder.includes('courseId={courseId}')&&builder.includes('AdminLessonQuizEditor'));
assert(workspace.includes('AdminCourseBank db={db} courses={courses}')&&workspace.includes('mode="mock"'));
assert(!sql.includes('UPDATE public.lms_questions SET approval_state=\'approved\' WHERE course_id'));
console.log('PASS P28 static: scoped per-course Excel/CSV draft import; Admin-only RPC; Lesson quiz bank links; server-enforced non-ASP Mock/Quiz/Practice exclusion; no ASP Mock rule regression. Disposable PG and signed-in staging still required.');
