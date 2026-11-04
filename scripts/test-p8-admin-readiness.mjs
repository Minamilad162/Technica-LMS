import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADMIN_ADAPTIVE_COUNTS,fetchAdminAdaptiveReadiness,normalizeAdaptiveReadiness}
 from '../src/production/adminAdaptiveReadiness.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.deepEqual([...ADMIN_ADAPTIVE_COUNTS],[10,25,50]);
const rpcCalls=[];
const db={rpc:async (name,args)=>{
 rpcCalls.push({name,args});
 const count=args.p_count;
 return {data:{
  ready:count<=25,low:25,medium:30,high:40,requiredPerTier:count,
  checkpoint:count===10?3:count===25?5:10,thresholdPercent:70
 },error:null};
}};
const rows=await fetchAdminAdaptiveReadiness(db,'verified-course-id','verified-domain-id');
assert.deepEqual(rows.map(r=>r.ready),[true,true,false]);
assert.deepEqual(rows.map(r=>r.checkpoint),[3,5,10]);
assert.equal(rows[0].low,25);
assert.equal(rows[2].high,40);
assert.equal(rpcCalls.length,3);
for(const [i,call] of rpcCalls.entries()){
 assert.equal(call.name,'lms_p8_levelup_readiness');
 assert.deepEqual(call.args,{p_course_id:'verified-course-id',
  p_count:ADMIN_ADAPTIVE_COUNTS[i],p_domain_id:'verified-domain-id'});
}
await assert.rejects(()=>fetchAdminAdaptiveReadiness({rpc:async()=>({data:null,error:{message:'No P8 RPC'}})},'course'),/No P8 RPC/);
assert.throws(()=>normalizeAdaptiveReadiness({
 ready:true,low:9,medium:10,high:10,checkpoint:3,requiredPerTier:10,thresholdPercent:70
},10),/failed validation/,'Do not trust false Ready even if returned by backend');
assert.throws(()=>normalizeAdaptiveReadiness({
 ready:true,low:10,medium:10,high:10,checkpoint:5,requiredPerTier:10,thresholdPercent:70
},10),/failed validation/,'Checkpoint cannot silently change');
assert.throws(()=>normalizeAdaptiveReadiness({
 ready:true,low:10,medium:10,high:10,checkpoint:3,requiredPerTier:10,thresholdPercent:75
},10),/failed validation/,'70% policy must stay locked');
assert.throws(()=>normalizeAdaptiveReadiness({
 ready:true,low:10,medium:-1,high:10,checkpoint:3,requiredPerTier:10,thresholdPercent:70
},10),/failed validation/,'Corrupted or unverified counts never pass');

const component=read('src/production/AdminAdaptiveReadiness.jsx');
const admin=read('src/production/AdminQuestionReview.jsx');
const api=read('src/production/adminAdaptiveReadiness.js');
const sql=read('supabase/migrations/202611040001_p8_adaptive_levelup.sql');
assert(admin.includes('<AdminAdaptiveReadiness db={db} course={course} domains={official}/>'),
 'Admin readiness must be IN the ASP reviewer, not in a public learner page');
assert(admin.includes("if(course?.slug!=='asp')return null"),'Only ASP can show embedded audit');
assert(component.includes('fetchAdminAdaptiveReadiness(db,course.id,domainId||null)'));
assert(component.includes('No readiness is assumed before the server responds.'));
assert(component.includes('No question is approved, classified or published'));
assert(api.includes('getAdaptiveReadiness(db,courseId,count,domainId)'));
assert(!api.includes("db.from('lms_questions')"),'No direct browser bank queries');
assert(!component.includes('service_role'),'Browser must not contain a service role key');
assert(sql.includes("approval_state='approved'")&&sql.includes('NOT mock_exclusive'),
 'P8 readiness must restrict to approved non-Mock bank');
console.log('PASS P8c: protected admin read-only ASP tier readiness and 10/25/50 fail-closed server payload validation.');
