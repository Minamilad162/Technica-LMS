import {verifiedLiveAdmin} from './liveAuthoringApi.js';
import {fetchAspReviewPage,fetchAspReviewSummary} from './questionReviewApi.js';
import {previewAspMockReservation,reserveAspMock} from './aspBankReleaseApi.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const count=x=>Number.isSafeInteger(x)&&x>=0;
const validDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
async function rpc(db,name,args={}){
 if(!db||typeof db.rpc!=='function')throw Error('Verified Supabase Admin connection required.');
 const {data,error}=await db.rpc(name,args);
 if(error)throw Error('Admin Tools data could not be loaded. Verify the P13 Staging migration and real Admin role.');
 return data;
}
export function verifyAdminOverview(x){
 if(!x||x.version!=='p13-v1'||!validDate(x.generatedAt)||!x.kpis||
  !Array.isArray(x.trend)||!Array.isArray(x.courses)||x.trend.length!==6)
  throw Error('Invalid Admin overview response.');
 const required=['users','activeAccounts','engaged30Days','courses','publishedCourses',
  'activeEnrollments','practiceCompleted','mockCompleted','completedLessons',
  'questions','practiceApproved','mockReserved'];
 if(!required.every(k=>count(x.kpis[k]))||
  x.kpis.activeAccounts>x.kpis.users||x.kpis.publishedCourses>x.kpis.courses||
  x.kpis.practiceApproved+x.kpis.mockReserved>x.kpis.questions||
  x.kpis.verifiedRevenue!==null||x.kpis.currency!==null||x.kpis.revenueTracked!==false)
  throw Error('Invalid system KPIs or unsupported revenue claims.');
 const months=new Set();
 for(const item of x.trend){
  if(!/^\d{4}-\d{2}$/.test(item.month||'')||months.has(item.month)||
   !['registrations','practice','mock'].every(k=>count(item[k])))
   throw Error('Invalid actual registration/activity trend.');
  months.add(item.month);
 }
 for(const item of x.courses){
  if(!uuid.test(item.id||'')||typeof item.title!=='string'||
   !['draft','published','archived'].includes(item.status)||
   !count(item.enrollments)||!count(item.questions))
   throw Error('Invalid course overview row.');
 }
 return x;
}
export function verifyUserList(x){
 if(!x||x.version!=='p13-v1'||!count(x.total)||!count(x.limit)||x.limit>50||
   !count(x.offset)||!Array.isArray(x.users)||x.users.length>x.limit||
   x.users.length>Math.max(0,x.total-x.offset))throw Error('Invalid Admin learner directory.');
 const ids=new Set();
 for(const u of x.users){
  if(('email' in u&&(typeof u.email!=='string'||!u.email.includes('@')))||
   ('provider' in u&&!['google','email'].includes(u.provider))||
   ('planStatus' in u&&!['free','active'].includes(u.planStatus))||
   ('planName' in u&&u.planName!==null&&typeof u.planName!=='string')||
   ('planEndsAt' in u&&u.planEndsAt!==null&&!validDate(u.planEndsAt)))
   throw Error('Invalid verified identity or platform plan summary.');
  if(!uuid.test(u.id||'')||ids.has(u.id)||typeof u.name!=='string'||
   !['active','suspended'].includes(u.status)||!validDate(u.joinedAt)||
   !['activePlans','lessonsCompleted','practiceAttempts','mockAttempts'].every(k=>count(u[k])))
   throw Error('Invalid learner directory user.');
  ids.add(u.id);
 }
 return x;
}
export function verifyUserDetail(x,uid){
 if(!x||x.version!=='p13-v1'||!x.profile||
   x.profile.id!==uid||!uuid.test(uid||'')||typeof x.profile.name!=='string'||
   !['active','suspended'].includes(x.profile.status)||!validDate(x.profile.joinedAt)||
   !Array.isArray(x.entitlements)||!Array.isArray(x.courseProgress)||
   !Array.isArray(x.lessonProgress)||!Array.isArray(x.recentAssessments)||
   !count(x.lessonProgressTotal)||x.lessonProgress.length>100||
   x.recentAssessments.length>10||!x.practice||!x.mock||x.revenueAvailable!==false)
  throw Error('Invalid protected learner detail.');
 for(const e of x.entitlements){
  if(!uuid.test(e.courseId||'')||typeof e.courseTitle!=='string'||
   !['trial','paid','manual'].includes(e.type)||
   !['active','revoked','refunded'].includes(e.status)||!validDate(e.startsAt)||
   !(e.endsAt===null||validDate(e.endsAt))||
   e.paymentRecorded!==false||e.amountPaid!==null||e.currency!==null)
   throw Error('Unverified enrollment or payment amount.');
 }
 for(const c of x.courseProgress){
  if(!uuid.test(c.courseId||'')||typeof c.courseTitle!=='string'||
    !['lessonsCompleted','practiceCompleted','mockCompleted'].every(k=>count(c[k])))
   throw Error('Invalid course progress row.');
 }
 for(const l of x.lessonProgress){
  if(!['courseTitle','domainTitle','topicTitle','lessonTitle'].every(k=>typeof l[k]==='string')||
   !['readingCompleted','videoCompleted','quizPassed'].every(k=>typeof l[k]==='boolean')||
   !(l.completedAt===null||validDate(l.completedAt))||!validDate(l.lastActivityAt))
   throw Error('Invalid protected lesson history.');
 }
 for(const a of x.recentAssessments){
  if(typeof a.courseTitle!=='string'||!['submitted','expired'].includes(a.state)||
   typeof a.mode!=='string'||!count(a.questionCount)||!count(a.correctCount)||
   a.correctCount>a.questionCount||!(a.scorePercent===null||
     (typeof a.scorePercent==='number'&&a.scorePercent>=0&&a.scorePercent<=100))||
   !(a.submittedAt===null||validDate(a.submittedAt)))
   throw Error('Invalid learner assessment records.');
 }
 if(x.lessonProgress.length>x.lessonProgressTotal)
  throw Error('Invalid lesson progress count.');
 for(const m of [x.practice,x.mock]){
  if(!count(m.completed)||!(m.lastScore===null||
    (typeof m.lastScore==='number'&&m.lastScore>=0&&m.lastScore<=100))||
   !(m.latestAt===null||validDate(m.latestAt)))
   throw Error('Invalid learner assessment history.');
 }
 return x;
}
export async function getAdminOverview(db){
 await verifiedLiveAdmin(db);
 return verifyAdminOverview(await rpc(db,'lms_p13_admin_overview'));
}
export async function getAdminUsers(db,{search='',limit=20,offset=0}={}){
 await verifiedLiveAdmin(db);
 if(typeof search!=='string'||search.length>80||!Number.isInteger(limit)||
   limit<1||limit>50||!count(offset)||offset>50000)throw Error('Invalid users search.');
 return verifyUserList(await rpc(db,'lms_p13_admin_users',{
  p_search:search,p_limit:limit,p_offset:offset}));
}
export async function getAdminUserDetail(db,userId){
 await verifiedLiveAdmin(db);
 if(!uuid.test(userId||''))throw Error('Select a real LMS profile.');
 return verifyUserDetail(await rpc(db,'lms_p13_admin_user_detail',{p_user_id:userId}),userId);
}
// Explicitly expose only ready human-reviewed Draft/Non-Mock eligible candidates;
// P9B server preflight does the final authoritative eligibility and 200 exclusion.
export async function getAdminMockCandidates(db,courseId,{offset=0,limit=25}={}){
 await verifiedLiveAdmin(db);
 if(!uuid.test(courseId||'')||!count(offset)||offset>100000||
   !Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid ASP selection.');
 const data=await fetchAspReviewPage(db,courseId,{filter:'ready',offset,limit});
 if(!data||!count(data.total)||!Array.isArray(data.items))throw Error('Invalid reviewed question list.');
 return {total:data.total,items:data.items.filter(q=>
  uuid.test(q.id||'')&&q.approval_state==='draft'&&q.mock_exclusive===false&&
  q.review_state==='ready'&&q.answer_checked===true&&q.rights_checked===true&&
  ['low','medium','high'].includes(q.difficulty)&&uuid.test(q.reviewed_domain_id||''))
  .map(q=>({id:q.id,sourceId:q.source_id||'',prompt:q.prompt||'',
    domainId:q.reviewed_domain_id,difficulty:q.difficulty}))};
}
export const getMockBankSummary=async(db,courseId)=>{
 await verifiedLiveAdmin(db);
 return fetchAspReviewSummary(db,courseId);
};
export async function preflightAdminMock(db,courseId,ids){
 await verifiedLiveAdmin(db);
 return previewAspMockReservation(db,courseId,ids);
}
export async function reserveAdminMock(db,courseId,ids,phrase){
 await verifiedLiveAdmin(db);
 return reserveAspMock(db,courseId,ids,phrase);
}
