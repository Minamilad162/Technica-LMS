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
const nineDomains=normalizeQuestionRows([
 ['Question','Option A','Option B','Option C','Option D','Option E','Option F','Correct Answer','Domain','Difficulty'],
 ['How do you verify safe entry into a restricted area?','Test atmosphere','Ignore controls','Skip checks','Guess','Call a buddy','Stop entry','F','ASP11-09','Hard']
],{courseId:'10000000-0000-0000-0000-000000000001',sourceName:'nine-domains.xlsx',sheetName:'Domain 9'});
assert.equal(nineDomains.questions.length,1,'ASP Domain 9 must import; old five-domain limit is invalid');
assert.equal(nineDomains.questions[0].correct,5);
assert.equal(nineDomains.questions[0].difficulty,'high');
assert.equal(nineDomains.questions[0].domainLabel,'ASP11-09');
const badGap=normalizeQuestionRows([
 ['Question','Option A','Option B','Option C','Option D','Correct Answer'],
 ['How do you verify maintenance isolation?','Check lock','Ignore lock','','Assume safe','D']
],{courseId:'asp',sheetName:'Domain 9'});
assert.equal(badGap.questions.length,0,'Option gaps may corrupt correct answer mapping');
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
assert(sql.includes("p_domain_id uuid DEFAULT NULL,p_difficulty text DEFAULT '',p_usage text DEFAULT 'all'"),'Secure bank filters must be database-side');
assert(sql.includes("v_difficulty:=")&&sql.includes("v_difficulty,'draft',false"),'Imported Difficulty must stay Draft');
assert(bank.includes("selected.slug==='asp'")&&bank.includes("courses.find(c=>c.slug==='asp')"),'ASP must be the primary Question Bank course');
assert(bank.includes('Filter bank by domain')&&bank.includes('Filter bank by difficulty')&&bank.includes('Filter bank by usage'),'Admin requires course-specific domain / difficulty / usage filters');
assert(quiz.includes("usage:'eligible'")&&quiz.includes('Filter Lesson Quiz by domain'),'Lesson Quiz must use filtered Course Bank');
assert(!quiz.includes('Manual question</button>'),'New Lesson questions must originate from Course Bank, not a separate pool');
assert(!sql.includes('UPDATE public.lms_questions SET approval_state=\'approved\' WHERE course_id'));
console.log('PASS P28 static: scoped per-course Excel/CSV draft import; Admin-only RPC; Lesson quiz bank links; server-enforced non-ASP Mock/Quiz/Practice exclusion; no ASP Mock rule regression. Disposable PG and signed-in staging still required.');
