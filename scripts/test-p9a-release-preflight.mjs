import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchAspReleasePreflight,validateAspReleasePreflight} from '../src/production/aspReleasePreflightApi.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const course='10000000-0000-0000-0000-000000000001';
const ready={
 mode:'read_only',releaseAllowed:false,courseId:course,total:200,draft:180,
 reviewedReadyDraft:30,needsHumanReview:150,eligibleCandidates:27,
 candidateLow:10,candidateMedium:9,candidateHigh:8,approved:20,
 approvedWithClassificationGaps:2,mockReserved:0,mockReservedReviewed:0,
 officialDomainCount:1,
 domainCandidates:[{slug:'asp11-01',title:'Mathematical Calculations',low:10,medium:9,high:8}],
 blockedReasons:['Mock reservation is not ready','Owner release approval not installed'],
 prompt:'secret never forwarded',correctIndex:0
};
const rpcCalls=[];
const db={rpc:async (name,args)=>{
 rpcCalls.push({name,args});return {data:ready,error:null};
}};
const value=await fetchAspReleasePreflight(db,course);
assert.deepEqual(rpcCalls,[{name:'lms_p9a_release_preflight',args:{p_course_id:course}}]);
assert.equal(value.releaseAllowed,false);
assert.equal(value.eligibleCandidates,27);
assert.equal('correctIndex' in value,false);
assert.equal('prompt' in value,false);
assert.deepEqual(value.domainCandidates,ready.domainCandidates);
assert.throws(()=>validateAspReleasePreflight({...ready,releaseAllowed:true},course),/Unverified/);
assert.throws(()=>validateAspReleasePreflight({...ready,courseId:'wrong'},course),/Unverified/);
assert.throws(()=>validateAspReleasePreflight({...ready,candidateHigh:10},course),/Inconsistent/);
assert.throws(()=>validateAspReleasePreflight({...ready,mockReservedReviewed:1},course),/Inconsistent/);
assert.throws(()=>validateAspReleasePreflight({...ready,needsHumanReview:200},course),/Inconsistent/);
assert.throws(()=>validateAspReleasePreflight({...ready,blockedReasons:[]},course),/mandatory blockers/);
assert.throws(()=>validateAspReleasePreflight({...ready,officialDomainCount:9},course),/Invalid ASP11/);
assert.throws(()=>validateAspReleasePreflight({...ready,domainCandidates:[{...ready.domainCandidates[0],slug:'bad'}]},course),/Invalid ASP11/);
await assert.rejects(()=>fetchAspReleasePreflight({rpc:async()=>({
 data:null,error:{code:'PGRST202',message:'No RPC'}
})},course),/not installed/);
await assert.rejects(()=>fetchAspReleasePreflight({rpc:async()=>({
 data:null,error:{code:'42501',message:'Permission denied'}
})},course),/Permission denied/);

const migration=read('supabase/migrations/202611040002_p9a_release_preflight.sql');
const admin=read('src/production/AdminQuestionReview.jsx');
const view=read('src/production/AspReleasePreflight.jsx');
const api=read('src/production/aspReleasePreflightApi.js');
assert(migration.includes('STABLE SECURITY DEFINER'));
assert(migration.includes('lms_p1_actor_is_admin()'));
assert(migration.includes('REVOKE ALL ON FUNCTION public.lms_p9a_release_preflight(uuid)'));
assert(migration.includes('TO authenticated,service_role;'));
assert(migration.includes("approval_state='draft'"));
assert(migration.includes('mock_exclusive'));
assert(migration.includes("review_state='ready'"));
assert(migration.includes('rights_checked IS TRUE'));
assert(migration.includes('answer_checked IS TRUE'));
assert(migration.includes("d.slug ~ '^asp11-0[1-9]$'"));
assert(migration.includes("'releaseAllowed',false"),'Never expose a false READY approval gate');
for(const forbidden of [
 'UPDATE public.lms_questions','DELETE FROM public.lms_questions','INSERT INTO public.lms_questions',
 'UPDATE public.lms_p6_question_reviews','SET approval_state=','SET mock_exclusive='])
 assert(!migration.includes(forbidden),'P9A must not mutate question/review data: '+forbidden);
assert(admin.includes('<AspReleasePreflight db={db} course={course}/>'));
assert(view.includes("if(course?.slug!=='asp')return null"));
assert(view.includes('Release blocked — preview only'));
assert(!view.includes('Publish question'));
assert(!api.includes("db.from('lms_questions')"));
assert(!api.includes('service_role'),'No service_role secret or direct bank access in browser');
console.log('PASS P9A protected, aggregate-only ASP release preflight; fail-closed contract and no bank writes.');
