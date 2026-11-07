// P23 layout + persistence regressions. This is a static source/contract test,
// not a substitute for real mobile browser and signed media QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/production/CourseLessonExplorer.jsx');
const css=read('src/production/courseLessonExplorer.css');
const blueprint=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');
const oldP22=read('scripts/test-p22-course-lesson-explorer.mjs');
const signedViewer=read('src/production/ProtectedLessonViewer.jsx');
const layout=read('src/production/LiveLearnerWorkspace.jsx');

for(const text of [
 'cle-single-page',
 'cle-steps',
 'jumpToSection(key)',
 "target.scrollIntoView({behavior:",
 'getBoundingClientRect().top<=180',
 "currentSection===key?'location':undefined",
 "['video','Video',Video,'video']",
 "['material','Study Material',BookOpen,'reading']",
 "['quiz','Knowledge Check',CheckCircle2,'quiz']",
 'cle-lesson-sidebar',
 "allLessons([d])",
 "d.topics.map",
 "t.lessons.map",
 'readingEnd.current',
 "root:null",
 "saveStep('reading')",
 'watchedVideos.current.add(b.id)',
 "saveStep('video')",
 "lms_p22_submit_lesson_quiz",
 'questions.some(q=>!Number.isInteger(answers[q.id]))',
 'previewOnly',
 'full||selected.isFreeIntro'
])assert(ui.includes(text),'P23 required contract missing: '+text);
const video=ui.indexOf("id={'cle-video-'+selected.id}");
const material=ui.indexOf("id={'cle-material-'+selected.id}");
const attachments=ui.indexOf("className=\"cle-material-attachments\"");
const quiz=ui.indexOf("id={'cle-quiz-'+selected.id}");
assert(video>0&&video<material&&material<attachments&&attachments<quiz,
 'The lesson DOM must display Video -> Study Material -> protected Attachments -> Knowledge Check');
assert(!ui.includes('role="tablist"')&&!ui.includes('role="tab"'),
 'Top buttons should be scroll navigation, NOT panel toggles');
assert(!ui.includes("tab==='")&&!ui.includes('setTab('),
 'Changing a section must not unmount protected media, reading or learner quiz answers');
assert(ui.includes('ref={videoSectionRef}')&&ui.includes('ref={materialSectionRef}')&&ui.includes('ref={quizSectionRef}'),
 'Page sections must remain simultaneously mounted');
assert(css.includes('.cle-steps{position:sticky')&&css.includes('.cle-activity-section{scroll-margin-top:100px'),
 'The shortcut navigation should remain useful while scrolling');
assert(css.includes('.cle-reading{overflow:visible;max-height:none'),
 'The Study Material must scroll with the page, not inside a separate box');
assert(css.includes('.cle-material-attachments')&&css.includes('@media(max-width:540px)'),
 'Attachments remain inside Study Material and preserve responsive layout');
assert(layout.includes('<CourseLessonExplorer'));
assert(signedViewer.includes('authorizeLessonMedia')&&signedViewer.includes('onEnded={finishWatched}'));
assert(oldP22.includes("root:null"),'P22 reading completion contract should match same-page scrolling');
assert(blueprint.includes('## 81. P23 — Single-page Lesson Content and Jump Navigation'));
console.log('PASS P23: video → reading and private PDF attachments → quiz all mounted on one page; sticky section scroll shortcuts, responsive UI, read-end progress and secure quiz/video invariants.');
