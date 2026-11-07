import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const explorer=read('src/production/CourseLessonExplorer.jsx');
const ui=read('src/production/LiveLearnerWorkspace.jsx');
const viewer=read('src/production/ProtectedLessonViewer.jsx');
const admin=read('src/production/AdminLessonQuizEditor.jsx');
const builder=read('src/production/LiveCourseBuilder.jsx');
const sql=read('supabase/migrations/202611070003_p22_lesson_journey.sql');
const css=read('src/production/courseLessonExplorer.css');
const blueprint=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');

for(const marker of [
 'CourseLessonExplorer','courseTitle={chosen.title}','outline={outline}',
 'full={Boolean(full)}','demo={Boolean(demoChosen)}',
 'onSubscribe={()=>startCheckout(chosen.id)}'
])assert(ui.includes(marker),'Missing P22 learner integration: '+marker);
assert(explorer.includes('allLessons([d])')&&explorer.includes('d.topics.map')
 &&explorer.includes('t.lessons.map'),'P22 must preserve Course→Domain→Topic→Lesson navigation');
for(const marker of [
 'cle-grid','cle-lesson-sidebar','cle-steps','cle-reading','cle-player-footer',
 'Video','Reading','Knowledge Check','Resources',
 "quizProgress[lesson]","progress[lesson]?.video_completed",
 'lms_p22_complete_lesson_step','lms_p22_get_lesson_quiz',
 'lms_p22_submit_lesson_quiz','lms_p22_my_steps',
 "stepDone(selected.id,'video')","stepDone(selected.id,'reading')",
 'questions.some(q=>!Number.isInteger(answers[q.id]))',
 "onScroll={e=>", "saveStep('reading')",
 "onWatched={()=>saveStep('video')}",
 'previewOnly','full||selected.isFreeIntro',
 'onSubscribe?.()'
])assert(explorer.includes(marker),'Missing P22 learner behavior: '+marker);
assert(!explorer.includes('.insert({user_id'),'No direct browser progress INSERT allowed');
assert(!explorer.includes("getPublicUrl("),'Never expose public media URLs');
assert(viewer.includes('onEnded={finishWatched}')&&viewer.includes('fraction>=.9')
 &&viewer.includes("onSeeking={()=>{watched.current.last=null;}}"),
 'Video completion must require actual playback, not seek-to-end');
assert(css.includes('@media(max-width:540px)')&&css.includes('.cle-grid')&&css.includes('.cle-player-layout'));
assert(builder.includes('AdminLessonQuizEditor')&&admin.includes('is_published')
 &&admin.includes('correct_index')&&admin.includes('lessonId'),
 'Admins must be able to create Knowledge Check questions');
for(const marker of [
 "quiz_completed boolean NOT NULL DEFAULT false",
 'CREATE TABLE public.lms_p22_lesson_quiz_questions',
 'CREATE POLICY lms_p22_admin_quiz_read',
 'CREATE POLICY lms_p22_admin_quiz_write',
 'CREATE FUNCTION public.lms_p22_complete_lesson_step(',
 'CREATE FUNCTION public.lms_p22_submit_lesson_quiz(',
 'CREATE FUNCTION public.lms_p22_my_steps(',
 'CREATE FUNCTION public.lms_p22_get_lesson_quiz(',
 'CREATE FUNCTION public.lms_p22_refresh_completion(',
 "public.lms_p1_can_view_lesson(p_lesson_id)",
 'lesson_completed_at=now()',
 'quiz_completed=true',
 'quiz_passed=public.lms_lesson_progress.quiz_passed OR EXCLUDED.quiz_passed',
 'REVOKE ALL ON FUNCTION',
 'TO authenticated,service_role',
 "GRANT SELECT ON public.lms_lesson_progress TO authenticated"
])assert(sql.includes(marker),'P22 staged SQL missing '+marker);
assert(!/GRANT (?:ALL|INSERT|UPDATE|DELETE) ON public\.lms_lesson_progress TO authenticated/i.test(sql));
assert(!/DROP TABLE|TRUNCATE TABLE|DELETE FROM public\.lms_lesson_progress/i.test(sql));
assert(blueprint.includes('## 80. P22 — Course Lesson Grid and Verified Learning Journey'));
console.log('PASS P22 UI, no fake completion, subscribed/free-intro access, video-seek protection, complete-on-answer quiz, Admin editor, private RLS and staging-only migration source. Actual Supabase/OS device verification still required.');
