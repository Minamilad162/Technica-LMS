// P12.2 STAGING-ONLY integration verification, read-only LMS scope.
// This module NEVER logs user/email/IDs, keys, question text or RPC payloads.
// No question/role/entitlement/attempt writes are performed. Auth sign-in is
// done by the CLI only for pre-created staging fixture accounts.
import {P12_SCENARIOS,P12_STAGING_VERSION,validateStagingEvidence} from '../../src/production/stagingQaEvidence.js';

const scenario=new Map(P12_SCENARIOS.map(x=>[x.id,x]));
const valid=(value)=>typeof value==='string'&&value.length>0;
const fail=(id,status,detail)=>{
 const x=scenario.get(id);
 return {id,area:x.area,title:x.title,status,detail};
};
const has=(v)=>v&&typeof v==='object'&&!Array.isArray(v);
const active=(p)=>p?.account_status==='active';
const denied=(error,kind)=>{
 if(!error)return false;
 const c=String(error.code||'');
 const msg=String(error.message||'').toLowerCase();
 const status=Number(error.status||0);
 if(c==='42501'||status===401||status===403||/permission denied|row.level.security/.test(msg))return true;
 if(c==='P0001'){
  if(kind==='reviewer')return /admin review role required/.test(msg);
  if(kind==='mock')return /access inactive|course access|authenticated/.test(msg);
  if(kind==='analytics')return /not authorized|not accessible|active lms account|course analytics/.test(msg);
 }
 return false;
};
async function selectOne(db,table,query){
 let q=db.from(table).select(query.columns);
 for(const [name,value] of Object.entries(query.equals||{}))q=q.eq(name,value);
 const r=await q.maybeSingle();
 if(r.error)throw Error('READ_QUERY_FAILED');
 return r.data;
}
async function listRows(db,table,cols,filter,ids){
 let q=db.from(table).select(cols);
 if(filter)q=q.eq(filter[0],filter[1]);
 if(ids)q=q.in(ids[0],ids[1]);
 const r=await q;
 if(r.error)throw Error('READ_QUERY_FAILED');
 return r.data||[];
}
async function rpc(db,name,args){
 const out=await db.rpc(name,args);
 return out&&('error' in out)?out:{data:null,error:{code:'UNKNOWN'}};
}
function readyCheck(report,courseId){
 return has(report)&&report.version==='p11-v1'&&report.courseId===courseId
  &&has(report.learning)&&Number.isSafeInteger(report.learning.totalLessons)
  &&has(report.practice)&&Number.isSafeInteger(report.practice.attempts)
  &&has(report.mock)&&Number.isSafeInteger(report.mock.attempts)
  &&Array.isArray(report.domains)&&Array.isArray(report.recentAttempts);
}
function accountTest(result){
 return has(result)&&valid(result.id)&&active(result.profile);
}
export async function runStagingQa(clients,{generatedAt=new Date().toISOString()}={}){
 if(!has(clients)||!['admin','paid','trial','outsider','anon'].every(r=>clients[r])
  ||!Number.isFinite(Date.parse(generatedAt)))
  throw Error('Five isolated authenticated/anonymous staging clients and a valid timestamp are required.');
 const state={};
 const checks=[];
 const run=async(id,task)=>{
  const x=scenario.get(id);
  if(!x)throw Error('Unknown staging check');
  try{
   const result=await task();
   if(!result||!['pass','blocked','pending'].includes(result.status)||
    !valid(result.detail)||result.detail.length>260)
    throw Error('INVALID_TEST_RESULT');
   checks.push(fail(id,result.status,result.detail));
  }catch{
   checks.push(fail(id,'blocked','Read-only staging check failed or returned an unverified response.'));
  }
 };
 const mark=(status,detail)=>({status,detail});
 async function auth(role){
  const db=clients[role];
  const {data,error}=await db.auth.getUser();
  if(error||!valid(data?.user?.id))return mark('blocked','Signed-in staging JWT could not be independently verified.');
  const user=data.user;
  const profile=await selectOne(db,'lms_profiles',{
   columns:'account_status',equals:{id:user.id}});
  if(Object.entries(state).some(([other,v])=>other!==role&&v.id===user.id))
   return mark('blocked','Two staging roles resolved to one LMS identity; use isolated test accounts.');
  state[role]={id:user.id,profile};
  if(!active(profile))return mark('blocked','Staging account is not an active LMS profile.');
  if(role==='admin'){
   // Check explicitly unrevoked Admin assignment, never just historical roles.
   const {data:own,error:roleError}=await db.from('lms_role_assignments').select('role')
    .eq('user_id',user.id).is('revoked_at',null);
   if(roleError||!(own||[]).some(r=>r.role==='admin'))
    return mark('blocked','Active unrevoked staging Admin role is missing.');
  }
  return mark('pass','Active dedicated staging account verified through signed Supabase JWT and P1 profile.');
 }
 for(const role of ['admin','paid','trial','outsider']){
  await run('stage-'+role+'-auth',()=>auth(role));
 }
 const authed=(role)=>accountTest(state[role])&&
  checks.some(x=>x.id==='stage-'+role+'-auth'&&x.status==='pass');
 const pending=(x='Requires a verified staging prerequisite or seeded fixture.')=>mark('pending',x);
 const block=(x)=>mark('blocked',x);
 let course=null,adminBankReady=false,adminBankCount=0,paidReady=false;
 await run('stage-asp-catalog',async()=>{
  if(!authed('paid'))return pending('Paid staging identity not verified; course read not attempted.');
  const c=await selectOne(clients.paid,'lms_courses',{columns:'id,slug,publication_state',equals:{slug:'asp'}});
  if(!valid(c?.id)||c?.publication_state!=='published')return block('Published ASP course is missing from paid staging catalog.');
  course=c;
  return mark('pass','ASP is a published course accessible with the paid staging identity.');
 });
 await run('stage-asp-hierarchy',async()=>{
  if(!course)return pending('Published staging ASP course is missing.');
  // Query the actual ASP course, not an unscoped domain tree.
  const d=await listRows(clients.paid,'lms_domains','id',['course_id',course.id]);
  if(!d.length)return block('No ASP domains visible to the paid account.');
  const t=await listRows(clients.paid,'lms_topics','id',null,['domain_id',d.map(x=>x.id)]);
  if(!t.length)return block('No ASP topics visible to the paid account.');
  const lessons=await listRows(clients.paid,'lms_lessons','id,publication_state',null,['topic_id',t.map(x=>x.id)]);
  if(!lessons.some(x=>x.publication_state==='published'))
   return block('No published ASP lessons visible to the paid account.');
  return mark('pass','Canonical ASP hierarchy is accessible with published lessons.');
 });
 await run('stage-p2-progress',async()=>{
  if(!authed('paid'))return pending();
  const res=await clients.paid.from('lms_lesson_progress').select('lesson_id',{head:true,count:'exact'})
   .eq('user_id',state.paid.id);
  if(res.error||!Number.isSafeInteger(res.count))return block('P2 private own-progress read denied or endpoint absent.');
  return mark('pass','P2 own-progress SELECT succeeded; actual lesson completion writes not tested.');
 });
 await run('stage-paid-practice',async()=>{
  if(!course||!authed('paid'))return pending();
  const r=await rpc(clients.paid,'lms_p4_can_practice',{p_course_id:course.id});
  if(r.error||r.data!==true)return block('Paid ASP Practice RPC did not grant verified access.');
  paidReady=true;
  return mark('pass','P4 server confirmed paid ASP Practice entitlement.');
 });
 for(const role of ['trial','outsider']){
  await run('stage-'+role+'-practice',async()=>{
   if(!course||!authed(role)||!paidReady)return pending('Paid positive control or dedicated staging identity is missing.');
   const r=await rpc(clients[role],'lms_p4_can_practice',{p_course_id:course.id});
   if(r.data===false||denied(r.error,'practice'))
    return mark('pass',role==='trial'?'Trial Practice access denied by P4.':'Unentitled Practice access denied by P4.');
   return block('Restricted account unexpectedly received Practice access or RPC response is unverified.');
  });
 }
 await run('stage-p6-admin',async()=>{
  if(!course||!authed('admin'))return pending();
  const r=await rpc(clients.admin,'lms_p6_bank_summary',{p_course_id:course.id});
  if(r.error||!has(r.data)||!Number.isSafeInteger(r.data.total)||r.data.total<0)
   return block('Private ASP reviewer inventory unavailable to staging Admin.');
  adminBankReady=true;adminBankCount=r.data.total;
  return mark('pass','Authorized Admin-only aggregate bank review RPC returned.');
 });
 for(const role of ['paid','anon']){
  await run('stage-p6-'+role,async()=>{
   if(!course||!adminBankReady|| (role==='paid'&&!authed('paid')))
    return pending('Positive Admin reviewer control or paid JWT is missing.');
   const r=await rpc(clients[role],'lms_p6_bank_summary',{p_course_id:course.id});
   if(denied(r.error,'reviewer'))
    return mark('pass','Private reviewer RPC denied an unauthorized client.');
   return block('Reviewer RPC did not demonstrably reject unauthorized access.');
  });
 }
 await run('stage-mock-200',async()=>{
  if(!course||!authed('paid'))return pending();
  const r=await rpc(clients.paid,'lms_p10_mock_readiness',{p_course_id:course.id});
  const d=r.data;
  if(r.error||!has(d)||d.engineVersion!=='p10-mock-v1'||d.required!==200||
    d.durationSeconds!==18000||!Number.isSafeInteger(d.verifiedReserved)||
    !Number.isSafeInteger(d.totalExclusiveFlags))
    return block('P10 200/300 versioned readiness RPC unavailable or invalid.');
  if(!d.ready||d.verifiedReserved!==200||d.totalExclusiveFlags!==200)
    return block('Real 200-item reserved Mock form is not ready; no exam started.');
  return mark('pass','P10 confirms exactly 200 exclusive questions; no answers were requested.');
 });
 await run('stage-mock-trial',async()=>{
  if(!course||!authed('trial'))return pending();
  const r=await rpc(clients.trial,'lms_p10_mock_readiness',{p_course_id:course.id});
  if(denied(r.error,'mock'))return mark('pass','P10 Mock readiness denied to Trial learner.');
  return block('Trial Mock access was not denied by server.');
 });
 await run('stage-p11-paid',async()=>{
  if(!course||!authed('paid'))return pending();
  const r=await rpc(clients.paid,'lms_p11_my_progress',{p_course_id:course.id});
  if(r.error||!readyCheck(r.data,course.id))return block('P11 learner-owned read report missing or invalid.');
  // The response must contain only own aggregate fields, never question content.
  if(JSON.stringify(r.data).match(/"correctIndex"|"prompt"|"email"|"userId"/))
   return block('P11 response contains protected content or user identifiers.');
  return mark('pass','P11 verified paid-own progress, Practice and Mock aggregate metrics.');
 });
 await run('stage-p11-outsider',async()=>{
  if(!course||!authed('outsider'))return pending();
  const r=await rpc(clients.outsider,'lms_p11_my_progress',{p_course_id:course.id});
  if(denied(r.error,'analytics'))return mark('pass','P11 denies an unentitled account without revealing learner metrics.');
  return block('Outsider P11 course analytics access was not explicitly denied.');
 });
 await run('stage-private-questions',async()=>{
  if(!authed('paid')||!adminBankReady||adminBankCount===0)
   return pending('A positive nonempty staging ASP inventory is required for meaningful RLS checks.');
  const r=await clients.paid.from('lms_questions').select('id',{head:true,count:'exact'})
   .eq('course_id',course.id);
  if(r.error&&denied(r.error,'questions'))return mark('pass','Private ASP question rows denied by direct client RLS.');
  if(!r.error&&r.count===0)return mark('pass','Direct learner SELECT reveals zero protected ASP questions.');
  return block('Private question access not demonstrably denied to learner.');
 });
 await run('stage-cross-user-progress',async()=>{
  if(!authed('admin')||!authed('paid'))return pending();
  const own=await clients.admin.from('lms_lesson_progress')
   .select('lesson_id',{head:true,count:'exact'}).eq('user_id',state.admin.id);
  if(own.error||!Number.isSafeInteger(own.count)||own.count===0)
   return pending('Staging Admin must first have a genuine own P2 progress fixture to test cross-user isolation.');
  const other=await clients.paid.from('lms_lesson_progress')
   .select('lesson_id',{head:true,count:'exact'}).eq('user_id',state.admin.id);
  if(other.error&&denied(other.error,'progress'))
   return mark('pass','P2 RLS prevents one learner reading another identity.');
  if(!other.error&&other.count===0)
   return mark('pass','Cross-user P2 progress read returned zero rows.');
  return block('One learner could read another user P2 progress.');
 });
 const report={version:P12_STAGING_VERSION,environment:'staging',
  scope:'read-only-api',verdict:'NO_GO',generatedAt,checks};
 return validateStagingEvidence(report);
}
