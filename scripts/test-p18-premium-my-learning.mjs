import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeProgress,learningSummary,courseProgressStatus,pickFeaturedCourse,loadVerifiedCourseReports}
 from '../src/production/premiumMyLearningApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const a='10000000-0000-0000-0000-000000000001';
const b='10000000-0000-0000-0000-000000000002';
const c='10000000-0000-0000-0000-000000000003';
const courses=[{id:a,title:'ASP'},{id:b,title:'CSP'},{id:c,title:'NEBOSH'}];
const empty=({courseId})=>({version:'p11-v1',courseId,courseTitle:'Course',
 generatedAt:'2026-11-07T00:00:00.000Z',
 learning:{totalLessons:0,completedLessons:0,readingCompleted:0,
  videoCompleted:0,quizzesPassed:0,completionPercent:null},
 practice:{attempts:0,assignedQuestions:0,answeredQuestions:0,
  correctAnswers:0,answerAccuracyPercent:null,scoredPercent:null,
  lastFinishedAt:null,levelUpAttempts:0},
 mock:{attempts:0,assignedQuestions:0,answeredQuestions:0,correctAnswers:0,
  answerAccuracyPercent:null,scoredPercent:null,lastFinishedAt:null},
 domains:[],recentAttempts:[]});
const real=(completed,total)=>({learning:{
 totalLessons:total,completedLessons:completed,completionPercent:total?100*completed/total:null
 },domains:[]});
assert.deepEqual(safeProgress(real(2,5)),{
 completed:2,total:5,percent:40,finished:false,domains:0
});
assert.equal(safeProgress(real(5,5)).finished,true);
assert.equal(safeProgress(real(0,0)).finished,false,'Zero published lessons are not completed');
assert.equal(safeProgress(real(7,5)),null,'Out-of-range progress rejected');
assert.equal(courseProgressStatus({status:'loading'}).state,'loading');
assert.equal(courseProgressStatus({status:'unavailable'}).state,'unavailable');
assert.equal(courseProgressStatus({status:'ready',report:real(5,5)}).state,'completed');
const progress={[a]:{status:'ready',report:real(2,5)},
 [b]:{status:'ready',report:real(3,3)},
 [c]:{status:'unavailable',report:null}};
assert.equal(learningSummary(courses,progress).completedLessons,null,'No fabricated partial global total');
assert.equal(learningSummary(courses.slice(0,2),progress).completedLessons,5);
assert.equal(learningSummary(courses.slice(0,2),progress).totalLessons,8);
assert.equal(learningSummary(courses.slice(0,2),progress).finishedCourses,1);
assert.equal(pickFeaturedCourse(courses,progress).id,a,'Prioritize verified incomplete');
assert.equal(pickFeaturedCourse([courses[1]],progress).id,b);
let active=0,max=0,calls=0;
const resolver=[];
const db={rpc:(name,args)=>new Promise(resolve=>{
 assert.equal(name,'lms_p11_my_progress');
 assert(courses.some(course=>course.id===args.p_course_id));
 calls++;active++;max=Math.max(max,active);
 resolver.push(()=>{active--;resolve({data:empty({courseId:args.p_course_id}),error:null});});
})};
const promise=loadVerifiedCourseReports(db,courses,{concurrency:2});
for(let i=0;i<40&&calls<2;i++)await Promise.resolve();
assert.equal(calls,2,'Two concurrent P11 requests maximum');
resolver.shift()();resolver.shift()();
for(let i=0;i<40&&calls<3;i++)await Promise.resolve();
assert.equal(calls,3);
resolver.shift()();
const results=await promise;
assert.equal(max,2);
assert.equal(Object.keys(results).length,3);
assert(courses.every(course=>results[course.id].status==='ready'));
const fallback=await loadVerifiedCourseReports({rpc:async()=>({data:null,error:{message:'permission denied'}})},
 [courses[0]]);
assert.equal(fallback[a].status,'unavailable','Missing P11 never presents demo completion');
const jsx=read('src/production/PremiumMyLearning.jsx');
const portal=read('src/production/LiveLearnerPortal.jsx');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const css=read('src/production/premiumMyLearning.css');
assert(workspace.includes('screen===\'learning\'?<PremiumMyLearning'));
assert(workspace.includes('activeCourses={enrolled} demoCourses={demoCourses}'));
assert(workspace.includes("onPractice={openPractice} onHistory={openHistory}"));
assert(portal.includes("onPracticeRoute={()=>navigate('/practice')}"));
assert(portal.includes("onHistoryRoute={()=>navigate('/my-practice')}"));
assert(jsx.includes('Active Enrollments')&&jsx.includes('Demo Previews'));
assert(jsx.includes('Verified Supabase access'));
assert(jsx.includes('No payment was made.'));
assert(jsx.includes('Completion percentages come from verified P11 records.'));
assert(jsx.includes('onBrowse')&&jsx.includes('onPractice')&&jsx.includes('onHistory'));
assert(jsx.includes('role="progressbar"')&&jsx.includes('aria-valuenow'));
assert(jsx.includes('aria-pressed={tab===x.id}'));
assert(jsx.includes('type="search"'));
assert(!jsx.includes('Math.random'),'No fabricated progress');
assert(!jsx.includes('localStorage'),'No browser-stored grade');
assert(!jsx.includes('sessionStorage'),'Demo state stays independent from real progress');
assert(css.includes('@media(max-width:580px)'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 75. P18'));
console.log('PASS P18: premium My Learning, verified per-course P11 progress, concurrency bounds, honest summary failures, enrolled/demo isolation, responsive routes and accessible filters.');
