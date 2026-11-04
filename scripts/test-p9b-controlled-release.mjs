import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewAspMockReservation,reserveAspMock,approveAspPracticeQuestion,
 validateMockPreview} from '../src/production/aspBankReleaseApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const course='course-asp';
const ids=Array.from({length:200},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const good={courseId:course,mode:'read_only',required:200,ready:true,
 selected:200,distinctSelected:200,verifiedEligible:200,existingReserved:0,
 existingForms:0,officialDomainCount:9,low:70,medium:60,high:70,mockEngineActive:false};
assert.deepEqual(validateMockPreview(good,course,ids).ready,true);
for(const payload of [
 {...good,mode:'write'}, {...good,courseId:'other'},
 {...good,ready:false},{...good,verifiedEligible:199},
 {...good,distinctSelected:199},{...good,officialDomainCount:8},
 {...good,existingReserved:1},{...good,mockEngineActive:true},
 {...good,low:80},{...good,selected:199}
])assert.throws(()=>validateMockPreview(payload,course,ids),/invalid|inconsistent/i);
const calls=[];
const db={rpc:async(name,args)=>{
 calls.push({name,args});
 if(name==='lms_p9b_mock_preflight')return {data:good,error:null};
 if(name==='lms_p9b_reserve_mock')return {data:{
  formId:ids[0],courseId:course,version:1,reserved:200,state:'reserved',
  mockEngineActive:false},error:null};
 if(name==='lms_p9b_approve_practice_question')return {data:{
  questionId:ids[1],approvalState:'approved',domainId:ids[2],
  difficulty:'medium',mockExclusive:false},error:null};
 return {data:null,error:{message:'Unknown RPC'}};
}};
const preview=await previewAspMockReservation(db,course,ids);
assert.equal(preview.verifiedEligible,200);
assert.equal(calls[0].name,'lms_p9b_mock_preflight');
assert.deepEqual(calls[0].args.p_question_ids,ids);
assert.equal(calls[0].args.p_course_id,course);
await assert.rejects(()=>reserveAspMock(db,course,ids.slice(0,199),
 'RESERVE 200 ASP MOCK QUESTIONS'),/exactly 200/i);
await assert.rejects(()=>reserveAspMock(db,course,[...ids.slice(0,199),ids[0]],
 'RESERVE 200 ASP MOCK QUESTIONS'),/distinct/i);
await assert.rejects(()=>reserveAspMock(db,course,ids,'confirm'),/confirmation/i);
const reserved=await reserveAspMock(db,course,ids,'RESERVE 200 ASP MOCK QUESTIONS');
assert.equal(reserved.reserved,200);
assert.equal(calls[1].name,'lms_p9b_reserve_mock');
assert.equal(calls[1].args.p_confirmation,'RESERVE 200 ASP MOCK QUESTIONS');
const approved=await approveAspPracticeQuestion(db,ids[1]);
assert.equal(approved.approvalState,'approved');
assert.equal(calls[2].name,'lms_p9b_approve_practice_question');
assert.equal(calls[2].args.p_confirmation,'APPROVE ASP PRACTICE QUESTION');
await assert.rejects(()=>previewAspMockReservation({
 rpc:async()=>({data:null,error:{message:'Protected function missing'}})
},course,ids),/Protected function missing/);
const migration=read('supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql');
for(const p of [
 "CREATE TABLE public.lms_p9b_mock_forms",
 "CREATE TABLE public.lms_p9b_mock_items",
 "form_version integer NOT NULL DEFAULT 1 CHECK(form_version=1)",
 "question_count integer NOT NULL DEFAULT 200 CHECK(question_count=200)",
 "ENABLE ROW LEVEL SECURITY",
 "REVOKE ALL ON TABLE public.lms_p9b_mock_items FROM PUBLIC,anon,authenticated",
 "lms_p9b_mock_preflight",
 "lms_p9b_reserve_mock",
 "lms_p9b_approve_practice_question",
 "p_confirmation IS DISTINCT FROM 'RESERVE 200 ASP MOCK QUESTIONS'",
 "p_confirmation IS DISTINCT FROM 'APPROVE ASP PRACTICE QUESTION'",
 "r.rights_checked IS TRUE",
 "r.answer_checked IS TRUE",
 "r.review_state='ready'",
 "d.slug ~ '^asp11-0[1-9]$'",
 "v_count<>200 OR v_reserved<>200",
 "r.reviewed_by=v_actor",
 "approval_state='approved',domain_id=r.reviewed_domain_id",
 "NEW.mock_exclusive IS DISTINCT FROM true",
 "mockEngineActive',false",
 "PERFORM q.id FROM public.lms_questions q",
 "ORDER BY q.id FOR UPDATE",
 "FOR UPDATE",
 "INSERT INTO public.lms_audit_events",
 "IF NOT FOUND THEN RAISE EXCEPTION 'Question approval conflict'",
 "NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items"
])assert(migration.includes(p),'P9B server guard missing: '+p);
assert(!migration.includes('CREATE OR REPLACE FUNCTION public.lms_p8_'),
 'P9B must not change approved P8e 7-of-original-10 adaptive engine');
assert(!migration.includes('INSERT INTO public.lms_questions'),
 'Never auto-import/seed actual ASP bank');
assert(!migration.includes('UPDATE public.lms_p6_question_reviews'),
 'Never overwrite source human review data');
assert(!migration.includes('lms_p4_attempt_payload'),
 'No learner answer key payload change permitted');
const admin=read('src/production/AdminQuestionReview.jsx');
const panel=read('src/production/AspMockReservation.jsx');
for(const str of [
 '<AspMockReservation db={db} course={course} ids={mockSelected}',
 'filter===\'ready\'',
 'onClick={approveSelected}',
 'mockSelected.includes(q.id)',
 'Approve ONE for Practice (independent Admin)'
])assert(admin.includes(str),'P9B admin integration missing '+str);
assert(panel.includes('previewAspMockReservation')&&panel.includes('reserveAspMock'));
assert(panel.includes('exactly these 200 reviewed ASP question IDs permanently'));
assert(!panel.includes("db.from('lms_questions')"));
assert(read('.github/workflows/ci-security.yml').includes('scripts/test-p9b-postgres-smoke.sh'),
 'P9B PostgreSQL test MUST run in CI disposable Postgres');
assert(read('docs/current/LOGIC_REGISTRY.md').includes('LMS-026'),
 'Permanent logic registry must include P9B');
console.log('PASS P9B: explicit 200-ID reviewed Mock reservation, independent Practice approval, fail-closed client, source privacy and CI gates.');
