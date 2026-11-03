import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnoseReviewConnection,describeDbError} from '../src/production/reviewConnectionCheck.js';

const build={url:'https://ci-example.supabase.co',publicKey:'ci-public-publishable-placeholder'};
const user={id:'verified-user-id'};
const course={id:'asp-course-id'};
function fakeDb({apiError=null,profile={account_status:'active'},roles=[{role:'admin'}],rpcError=null,total=12}={}){
 const calls={api:0,profile:0,roles:0,rpc:0};
 const db={
  from(table){
   if(table==='lms_courses')return {select(){calls.api++;return Promise.resolve({error:apiError});}};
   if(table==='lms_profiles')return {select(){return {eq(){return {maybeSingle(){calls.profile++;return Promise.resolve({data:profile,error:null});}};}};}};
   if(table==='lms_role_assignments')return {select(){return {eq(){return {is(){calls.roles++;return Promise.resolve({data:roles,error:null});}};}};}};
   throw Error('Unexpected table query '+table);
  },
  auth:{async getUser(){return {data:{user},error:null};}},
  async rpc(name,args){calls.rpc++;assert.equal(name,'lms_p6_bank_summary');assert.equal(args.p_course_id,course.id);return {data:{total},error:rpcError};}
 };
 return {db,calls};
}
const errorCode={code:'PGRST202',message:'Could not find the function lms_p6_bank_summary in the schema cache'};
assert.match(describeDbError(errorCode),/not installed/);
assert.match(describeDbError({code:'42501',message:'permission denied'}),/permissions/);
assert.match(describeDbError({message:'Failed to fetch'}),/could not reach/);

{
 const d=fakeDb();
 const rows=await diagnoseReviewConnection(d.db,{build:{...build,publicKey:''}});
 assert.equal(rows[0].id,'build');assert.equal(rows[0].status,'fail');
 assert.equal(d.calls.api,0,'Missing build vars must stop API probes');
}
{
 const d=fakeDb();
 const rows=await diagnoseReviewConnection(d.db,{build});
 assert.equal(rows.find(x=>x.id==='api').status,'pass');
 assert.equal(rows.find(x=>x.id==='auth').status,'pending');
 assert.equal(d.calls.rpc,0,'Anonymous must NEVER query protected P6A RPC');
}
{
 const d=fakeDb({apiError:{status:401,message:'Invalid API key'}});
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user}});
 assert.equal(rows.find(x=>x.id==='api').status,'fail');
 assert.equal(d.calls.roles,0);assert.equal(d.calls.rpc,0);
}
{
 const d=fakeDb({profile:null});
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user}});
 assert.equal(rows.find(x=>x.id==='profile').status,'fail');
 assert.equal(d.calls.rpc,0);
}
{
 const d=fakeDb({roles:[]});
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user},identity:{isAdmin:false},course});
 assert.equal(rows.find(x=>x.id==='admin').status,'fail');
 assert.equal(d.calls.rpc,0,'Non-admin must NEVER access protected question review');
}
{
 const d=fakeDb();
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user},identity:{isAdmin:true}});
 assert.equal(rows.find(x=>x.id==='asp').status,'fail');
 assert.equal(d.calls.rpc,0,'No ASP course must skip review RPC');
}
{
 const d=fakeDb({rpcError:errorCode});
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user},identity:{isAdmin:true},course});
 assert.equal(rows.find(x=>x.id==='p6a').status,'fail');
 assert.match(rows.find(x=>x.id==='p6a').detail,/not installed/);
 assert.equal(d.calls.rpc,1,'Real admin can diagnose the P6A read-only RPC');
}
{
 const d=fakeDb({total:0});
 const rows=await diagnoseReviewConnection(d.db,{build,session:{user},identity:{isAdmin:true},course});
 assert.equal(rows.find(x=>x.id==='p6a').status,'pass');
 assert.match(rows.find(x=>x.id==='p6a').detail,/0 imported/);
 assert.equal(d.calls.rpc,1);
 const summary=JSON.stringify(rows);
 assert(!summary.includes(build.publicKey),'Reports must not reveal API key');
 assert(!summary.includes(user.id),'Reports must not reveal user UUID');
}
const shell=readFileSync(new URL('../src/production/SupabaseApp.jsx',import.meta.url),'utf8');
const diagUI=readFileSync(new URL('../src/production/ReviewConnectionDiagnostics.jsx',import.meta.url),'utf8');
const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
assert(shell.includes('<ReviewConnectionDiagnostics db={db} session={session}'),'Authenticated embedded reviewer must expose the diagnostics');
assert(shell.includes('reviewerOnly&&<ReviewConnectionDiagnostics db={db}/>'),'Sign-in page must expose the safe API check');
assert(shell.includes('Account or LMS tables')||shell.includes('LMS tables could not be verified'),'Identity error must not spin forever');
assert(shell.includes('reviewerOnly?fetchAspReviewDomains(db,selected.id):loadStructure(db,selected.id)'), 'Review must load domain metadata only; not lessons/topics');
assert(shell.includes('if(!user.isAdmin)return;'), 'Only verified admin reviewer can request the ASP catalogue');
assert(shell.includes('if(reviewerOnly){'), 'Reviewer must have isolated data-load path without learner entitlement dependency');
assert(shell.includes('lms_profiles')===false || shell.includes('loadIdentity(db,session.user)'), 'Reviewer must verify actual LMS profile');
assert(diagUI.includes('typeof __TECHNICA_BUILD_SHA__'),'Show non-secret build revision marker');
assert(vite.includes('WORKERS_CI_COMMIT_SHA'),'Cloudflare build revision must be compiled');
console.log('PASS secure ASP connection diagnostic correctly isolates configuration/API/auth/profile/Admin/P6A without leaking secrets or bypassing authorization.');
