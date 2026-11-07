import {getLearnerProgress} from './learnerProgressApi.js';

// P18: read-only, verified P11 learning statistics. No fabricated progress.
const MIN_CONCURRENCY=1,MAX_CONCURRENCY=4;
export function safeProgress(report){
 const x=report?.learning;
 if(!x||!Number.isSafeInteger(x.totalLessons)||!Number.isSafeInteger(x.completedLessons)
  ||x.totalLessons<0||x.completedLessons<0||x.completedLessons>x.totalLessons
  ||(x.completionPercent!==null&&(!Number.isFinite(x.completionPercent)
    ||x.completionPercent<0||x.completionPercent>100)))return null;
 return {
  completed:x.completedLessons,total:x.totalLessons,percent:x.completionPercent,
  finished:x.totalLessons>0&&x.completedLessons===x.totalLessons,
  domains:Array.isArray(report.domains)?report.domains.length:null
 };
}
export function learningSummary(courses=[],reports={}){
 const enrolled=courses.filter(Boolean),totalCourses=enrolled.length;
 const progress=enrolled.map(c=>reports[c.id]).filter(Boolean);
 const ready=progress.filter(x=>x.status==='ready'&&safeProgress(x.report));
 const complete=ready.filter(x=>safeProgress(x.report).finished).length;
 const allVerified=totalCourses>0&&ready.length===totalCourses;
 return {
  totalCourses,finishedCourses:allVerified?complete:null,
  totalLessons:allVerified?ready.reduce((n,x)=>n+safeProgress(x.report).total,0):null,
  completedLessons:allVerified?ready.reduce((n,x)=>n+safeProgress(x.report).completed,0):null,
  allVerified
 };
}
export function courseProgressStatus(result){
 if(result?.status==='ready'){
  const value=safeProgress(result.report);
  return value?{state:value.finished?'completed':'in-progress',progress:value}:{state:'unavailable',progress:null};
 }
 if(result?.status==='loading')return {state:'loading',progress:null};
 return {state:'unavailable',progress:null};
}
export function pickFeaturedCourse(courses=[],reports={}){
 // Prioritize a verified incomplete course without claiming it was "last opened".
 return courses.find(c=>courseProgressStatus(reports[c.id]).state==='in-progress')
  ||courses.find(c=>courseProgressStatus(reports[c.id]).state==='unavailable')
  ||courses[0]||null;
}
export async function loadVerifiedCourseReports(db,courses,{concurrency=3}={}){
 const list=(courses||[]).filter(x=>x&&typeof x.id==='string');
 const limit=Math.max(MIN_CONCURRENCY,Math.min(MAX_CONCURRENCY,Math.floor(Number(concurrency)||3)));
 const results={};let cursor=0;
 await Promise.all(Array.from({length:Math.min(limit,list.length)},async()=>{
  while(cursor<list.length){
   const course=list[cursor++];
   try{results[course.id]={status:'ready',report:await getLearnerProgress(db,course.id)};}
   catch{results[course.id]={status:'unavailable',report:null};}
  }
 }));
 return results;
}
