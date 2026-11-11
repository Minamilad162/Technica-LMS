import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAdminDashboardDistributions} from '../src/production/adminDashboardCharts.js';
import {buildAdminPreviewOutline,countAdminPreviewLessons,
 ADMIN_PREVIEW_MODES} from '../src/production/adminCoursePreviewApi.js';
import {verifyAdminOverview} from '../src/production/adminToolsApi.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const report=verifyAdminOverview({
 version:'p13-v1',generatedAt:'2026-11-08T00:00:00Z',
 kpis:{users:120,activeAccounts:100,engaged30Days:56,courses:4,publishedCourses:2,
  activeEnrollments:19,practiceCompleted:42,mockCompleted:8,completedLessons:12,
  questions:2500,practiceApproved:900,mockReserved:200,
  verifiedRevenue:null,currency:null,revenueTracked:false},
 trend:['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']
  .map((month,i)=>({month,registrations:i,practice:i+1,mock:0})),
 courses:[
  {id:id(1),title:'ASP',status:'published',enrollments:3,questions:1600},
  {id:id(2),title:'CSP',status:'published',enrollments:7,questions:800},
  {id:id(3),title:'Draft',status:'draft',enrollments:0,questions:100},
  {id:id(4),title:'Archive',status:'archived',enrollments:0,questions:0}
 ]
});
const list=buildAdminDashboardDistributions(report);
assert.equal(list.length,4);
assert.deepEqual(list.map(x=>x.id),['questions','courses','users','activity']);
assert.deepEqual(list[0].slices.map(s=>s.value),[900,200,1400]);
assert.deepEqual(list[1].slices.map(s=>s.value),[2,1,1]);
assert.deepEqual(list[2].slices.map(s=>s.value),[100,20]);
assert.deepEqual(list[3].slices.map(s=>s.value),[42,8]);
assert(list.every(x=>x.slices.reduce((a,s)=>a+s.value,0)===x.total));
assert(list.every(x=>['questions','courses','users','exams'].includes(x.target)));
assert(list[0].insight.includes('1,400'));
assert(list[2].insight.includes('56'));
const mismatch={...report,courses:[report.courses[0]]};
assert.deepEqual(buildAdminDashboardDistributions(mismatch)[1].slices.map(s=>s.value),[2,2],
 'Partial Course list must not falsely invent draft vs archived breakdown');
const zero={...report,kpis:{...report.kpis,users:0,activeAccounts:0,engaged30Days:0,
 courses:0,publishedCourses:0,questions:0,practiceApproved:0,mockReserved:0,
 practiceCompleted:0,mockCompleted:0},courses:[]};
const zeros=buildAdminDashboardDistributions(zero);
assert(zeros.every(x=>x.total===0&&x.slices.every(s=>s.value===0)));
assert.throws(()=>buildAdminDashboardDistributions({...report,kpis:{...report.kpis,questions:3}}),/Inconsistent/);
const tree=[
 {id:id(10),title:'Domain 1',position:0,topics:[
  {id:id(20),title:'Topic 1',position:0,lessons:[
   {id:id(30),title:'Intro',publication_state:'published',position:0},
   {id:id(31),title:'Unpublished',publication_state:'draft',position:1}]},
  {id:id(21),title:'Empty Topic',position:1,lessons:[]}]},
 {id:id(11),title:'Empty Domain',position:1,topics:[]}
];
const draft=buildAdminPreviewOutline(tree,'draft',true);
assert.equal(countAdminPreviewLessons(draft),2);
assert.equal(draft.length,2,'Draft preview must preserve empty Domains for authoring review');
assert.equal(draft[0].topics.length,2,'Draft preview must preserve empty Topics');
assert.equal(draft[0].topics[0].lessons[1].publication_state,'draft');
const visitor=buildAdminPreviewOutline(tree,'visitor',true);
assert.equal(countAdminPreviewLessons(visitor),1);
assert.equal(visitor[0].topics.length,1);
assert.equal(visitor[0].topics[0].lessons[0].isFreeIntro,true);
const locked=buildAdminPreviewOutline(tree,'visitor',false);
assert.equal(locked[0].topics[0].lessons[0].isFreeIntro,false);
const subscribed=buildAdminPreviewOutline(tree,'subscriber',true);
assert.equal(countAdminPreviewLessons(subscribed),1);
assert.deepEqual(ADMIN_PREVIEW_MODES,['draft','visitor','subscriber']);
assert.throws(()=>buildAdminPreviewOutline(tree,'hacker'),/Invalid/);

const dashboard=file('src/production/AdminAnalyticsCharts.jsx');
const panels=file('src/production/AdminToolsPanels.jsx');
const api=file('src/production/adminCoursePreviewApi.js');
const page=file('src/production/AdminCoursePreview.jsx');
const explorer=file('src/production/CourseLessonExplorer.jsx');
const lessonQuizApi=file('src/production/lessonQuizSyncApi.js');
const app=file('src/App.jsx');
const builder=file('src/production/LiveCourseBuilder.jsx');
const cards=file('src/production/LearnerCourseCard.jsx');
const css=file('src/production/adminDashboardCharts.css');
const pc=file('src/production/adminCoursePreview.css');
assert(panels.includes('<AdminAnalyticsCharts report={report} onNavigate={onNavigate}/>'));
assert(panels.includes('Legacy Course grants')&&!panels.includes("['Active enrollments'"));
assert(dashboard.includes('role="img"')&&dashboard.includes('strokeDasharray')&&dashboard.includes('No verified records yet.'));
assert(dashboard.includes('onNavigate(data.target)'));
assert(!dashboard.includes('Math.random'));
assert(!api.includes('.insert(')&&!api.includes('.update(')&&!api.includes('.delete('));
assert(api.indexOf('await verifiedLiveAdmin(db)')<api.indexOf('liveCourseTree(db,courseId)'));
assert(page.includes('useLiveAdminAuthoring'));
assert(page.includes('readAdminCoursePreview(db,courseId)'));
assert(page.includes('CourseDetailHero')&&page.includes('CourseLessonExplorer'));
assert(page.includes('adminPreview full={mode!==\'visitor\'}'));
assert(page.includes('setReload(n=>n+1)'));
assert(page.includes("new URLSearchParams(params)"));
assert(app.includes('path="/admin/course-preview/:courseId"'));
assert(app.includes('<AdminOnly><RoutePage><AdminCoursePreview/></RoutePage></AdminOnly>'));
assert(panels.includes('target="_blank" rel="noopener noreferrer"'));
assert(panels.includes('Preview Course')&&panels.includes('Preview Page'));
assert(builder.includes('target="_blank" rel="noopener noreferrer"'));
assert(cards.includes('adminPreview=false')&&cards.includes('Working Draft · Admin only'));
for(const mark of [
 "if(adminPreview)return;",
 "if(adminPreview||!userId||!lessons.length)return;",
 "if(adminPreview||!selected||saving||stepDone(selected.id,step))return;",
 "if(adminPreview||!selected||saving||quizLoading||questions.length===0||",
 "if(adminPreview||!selected||!accessible||lessonLoading||saving||",
 "if(adminPreview)return;",
 "watchedVideos.current.add(b.id)",

 "lms_p22_submit_lesson_quiz",
 "lms_p22_complete_lesson_step",
 "Preview only · Quiz submission and learner progress are disabled.",
 "adminPreview?'ADMIN PREVIEW':userId"
])assert(explorer.includes(mark),'Admin read-only Preview contract missing '+mark);
assert(lessonQuizApi.includes(".select('id,prompt,options,is_published,position')")&&
 lessonQuizApi.includes("lms_p22_get_lesson_quiz"),
 'Admin preview and learner P22 Quiz RPC remain available through secure dedicated loader.');
assert(!explorer.includes(".select('id,prompt,options,correct_index") &&
 !explorer.includes(".select('id,prompt,options,is_published,position,correct_index"),'Preview must not expose answer keys');
assert(css.includes('@media(max-width:540px)')&&pc.includes('@media(max-width:790px)'));
assert(file('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 85. P27 — Admin Analytics & Course Preview'));
console.log('PASS P27: verified P13 question/course/user/activity pies, zero/mismatch data handling, Admin-only new-tab draft/visitor/subscriber Course Preview and no learner-progress or quiz writes.');
