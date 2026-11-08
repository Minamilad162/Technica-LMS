import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('src/production/courseQuestionBankApi.js');
const bank=read('src/production/AdminCourseBank.jsx');
const builder=read('src/production/LiveCourseBuilder.jsx');
const editor=read('src/production/AdminLessonQuizEditor.jsx');
const learner=read('src/production/CourseLessonExplorer.jsx');
const css=read('src/production/courseQuestionBank.css');
const sql=read('scripts/sql/P32_READONLY_LESSON_QUIZ_VISIBILITY.sql');
const backend=read('supabase/migrations/202611080004_p30_batch_question_bank_edits.sql');
const source=read('supabase/migrations/202611080001_p28_course_bank_quiz_links.sql');
for(const marker of ['inspectLessonQuizPublication(db,lessonId)',
 "verifiedLiveAdmin(db)",".select('id,lesson_id,bank_question_id,is_published')",
 ".eq('lesson_id',lessonId)",'published:rows.filter(q=>q.is_published).length',
 'pending:rows.filter(q=>!q.is_published).length'
])assert(api.includes(marker),'P32 read-only lesson status API missing '+marker);
assert(!api.includes(".select('id,lesson_id,bank_question_id,is_published,correct_index"),
 'Admin publication diagnostics must not read answer keys.');
for(const marker of ['inspectLessonQuizPublication(db,inspectLessonId)',
 'Saved Lesson Quiz publication status','Check learner quiz for',
 'Open Lesson Quiz','Published','Not published',
 'No saved questions are linked to this Lesson',
 'Linked questions are saved but hidden from learners',
 '/builder?courseId=','&lessonId='])
 assert(bank.includes(marker),'P32 Admin lesson status markup missing '+marker);
assert(bank.includes('Save All Changes')&&bank.includes('stagedToBatch(staged)'));
for(const marker of ['params.get(\'lessonId\')','setLessonId(realLesson.id)',
 "id={'lms-builder-lesson-'+lesson.id}","scrollIntoView({behavior:'smooth'"])
 assert(builder.includes(marker),'P32 deep link to exact Lesson editor missing '+marker);
for(const marker of ['publishedCount=items.filter(q=>q.is_published).length',
 'pendingCount=items.length-publishedCount','Learners will see 0 questions until you approve the Drafts',
 'Review the question in the Course Bank','Not published · learner cannot see it yet',
 "q.is_published?'Unpublish':'Publish'"])
 assert(editor.includes(marker),'P32 Admin Lesson editor publication guidance missing '+marker);
assert(css.includes('.p32-publication-status')&&css.includes('@media(max-width:760px)'));
assert(learner.includes("fetchLessonQuiz(db,active,{adminPreview})"));
assert(learner.includes('No published quiz questions yet.'));
assert(backend.includes("v_q.approval_state='approved'"),'P30 must continue to auto-publish only independently approved questions');
assert(source.includes('p_publish boolean DEFAULT false'),'P28 linkage has an explicit publish flag');
assert(sql.includes('LEFT JOIN public.lms_p22_lesson_quiz_questions')&&
 sql.includes('source_draft_questions')&&sql.includes('published_learner_questions'));
assert(!/\b(?:UPDATE|INSERT|DELETE|TRUNCATE|ALTER|DROP)\s+(?:TABLE|INTO|FROM|public\.)/i.test(sql),
 'P32 diagnostic SQL must never write to a real database');
console.log('PASS P32: read-only actual-lesson published vs pending count, direct exact Course Builder Lesson Quiz link, correct learner zero-state, no answer keys or unsafe automatic approval.');
