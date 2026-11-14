import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMockPayload,validateMockReadiness,getMockReadiness,startOfficialMock,saveOfficialMock,
 submitOfficialMock,abandonOfficialMock,MOCK_QUESTION_COUNT,MOCK_DURATION_SECONDS} from '../src/production/mockApi.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const start=new Date('2026-11-05T08:00:00Z').toISOString();
const end=new Date('2026-11-05T13:00:00Z').toISOString();
const questions=Array.from({length:200},(_,i)=>({
 id:uuid(i+1),position:i+1,prompt:'Synthetic question '+i+'?',
 options:['Synthetic A','Synthetic B','Synthetic C','Synthetic D'],
 selectedIndex:null,flagged:false,
}));
const payload={
 attemptId:uuid(222),courseId:uuid(333),mode:'asp_mock_200',state:'in_progress',
 questionCount:200,durationSeconds:18000,startedAt:start,
 deadlineAt:end,serverNow:start,submittedAt:null,answeredCount:0,flaggedCount:0,
 correctCount:null,scorePercent:null,questions
};
assert.equal(MOCK_QUESTION_COUNT,200);
assert.equal(MOCK_DURATION_SECONDS,18000);
assert.deepEqual(validateMockPayload(payload),payload);
assert.deepEqual(validateMockReadiness({
 ready:true,verifiedReserved:200,totalExclusiveFlags:200,required:200,
 durationSeconds:18000,engineVersion:'p10-mock-v1'}).ready,true);
assert.equal(validateMockReadiness({
 ready:false,verifiedReserved:199,totalExclusiveFlags:200,required:200,
 durationSeconds:18000,engineVersion:'p10-mock-v1'}).ready,false);
for(const bad of [
 {...payload,questions:[...questions.slice(0,199)]},
 {...payload,questions:[...questions.slice(0,199),questions[0]]},
 {...payload,durationSeconds:3600},
 {...payload,deadlineAt:new Date('2026-11-05T12:00:00Z').toISOString()},
 {...payload,questions:questions.map((q,i)=>i===0?{...q,correctIndex:0}:q)},
 {...payload,questions:questions.map((q,i)=>i===0?{...q,explanation:'secret'}:q)},
 {...payload,questions:questions.map((q,i)=>i===0?{...q,selectedIndex:99}:q)},
 {...payload,answeredCount:1},
 {...payload,correctCount:200},
 {...payload,state:'submitted',questions:[]},
 {...payload,state:'abandoned',questions:[],correctCount:4}
])assert.throws(()=>validateMockPayload(bad),/invalid|graded|grade|leak|answer|closed/i);
const completed={...payload,state:'submitted',questions:[],answeredCount:2,
 correctCount:1,scorePercent:0.5};
assert.equal(validateMockPayload(completed).scorePercent,0.5);
assert.throws(()=>validateMockPayload({...completed,questions}),/closed/i);
assert.throws(()=>validateMockPayload({...completed,scorePercent:100}),/grade/i);
const calls=[];
const fake={rpc:async(name,args)=>{
 calls.push({name,args});
 switch(name){
  case 'lms_p10_mock_readiness':return {data:{ready:true,verifiedReserved:200,
   totalExclusiveFlags:200,required:200,durationSeconds:18000,engineVersion:'p10-mock-v1'},error:null};
  case 'lms_p10_start_mock':return {data:payload,error:null};
  case 'lms_p10_save_mock':return {data:{saved:true,serverNow:start},error:null};
  case 'lms_p10_submit_mock':return {data:completed,error:null};
  case 'lms_p10_abandon_mock':return {data:{closed:true,attemptId:uuid(222)},error:null};
  default:return {data:null,error:{message:'Unknown RPC'}};
 }
}};
assert.equal((await getMockReadiness(fake,uuid(333))).ready,true);
assert.equal((await startOfficialMock(fake,uuid(333),uuid(444))).questions.length,200);
await saveOfficialMock(fake,uuid(222),uuid(1),0,true);
assert.equal((await submitOfficialMock(fake,uuid(222))).state,'submitted');
assert.equal((await abandonOfficialMock(fake,uuid(222))).closed,true);
assert.deepEqual(calls.map(x=>x.name),[
 'lms_p10_mock_readiness','lms_p10_start_mock','lms_p10_save_mock',
 'lms_p10_submit_mock','lms_p10_abandon_mock']);
await assert.rejects(()=>startOfficialMock(fake,'bad',uuid(2)),/identity/);
await assert.rejects(()=>saveOfficialMock(fake,uuid(222),uuid(1),9,true),/Invalid/);
await assert.rejects(()=>getMockReadiness({rpc:async()=>({data:null,error:{message:'Missing migration'}})},uuid(333)),/Missing migration/);
const sql=file('supabase/migrations/202611050001_p10_mock_engine.sql');
for(const str of [
 'CREATE TABLE public.lms_p10_mock_attempts',
 'CREATE TABLE public.lms_p10_mock_answers',
 'deadline_at=started_at+interval \'300 minutes\'',
 'DEFAULT 200 CHECK(question_count=200)',
 'ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',
 "q.mock_exclusive AND q.approval_state='draft'",
 'lms_p10_mock_readiness(uuid)',
 'lms_p10_start_mock(uuid,uuid)',
 'lms_p10_mock_payload(uuid)',
 'lms_p10_save_mock(uuid,uuid,integer,boolean)',
 'lms_p10_submit_mock(uuid)',
 'lms_p10_abandon_mock(uuid)',
 'lms_p10_finalize(uuid,boolean)',
 'GRANT EXECUTE ON FUNCTION public.%s TO authenticated',
 "v_questions:='[]'::jsonb",
 "IF a.state='in_progress' AND clock_timestamp()>=a.deadline_at",
 "AND user_id=(SELECT auth.uid())",
 'public.lms_p4_can_practice',
 'UNIQUE(user_id,request_id)',
 "AND NOT EXISTS(SELECT 1 FROM public.lms_practice_attempt_items"
])assert(sql.includes(str),'P10 migration missing '+str);
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.lms_p8_'));
assert(!sql.includes('INSERT INTO public.lms_questions'));
const app=file('src/App.jsx');
const ui=file('src/production/LiveMockExam.jsx');
const portal=file('src/production/LiveMockPortal.jsx');
for(const str of ["path=\"/assessments/mock/live\"","<LiveMockPortal/>"])
 assert(app.includes(str));
for(const str of ['startPracticePresentation','useQuestionFullscreenGuard',
 'getMockReadiness','saveOfficialMock','submitOfficialMock','abandonOfficialMock',
 'LiveProtectedContent','200','300','server'])
 assert(ui.includes(str),'P10 live UI missing '+str);
assert(portal.includes('fetchLiveLearningCatalog'));
assert(portal.includes("['paid','manual']"));
assert(!ui.includes('from \'../data/mock\''));
const registry=file('docs/current/LOGIC_REGISTRY.md');
const master=file('TECHNICA_LMS_MASTER_BLUEPRINT.md');
assert(registry.includes('LMS-031'));
assert(master.includes('## 64. P10 — Secure official ASP 200/300 Mock engine'));
assert(file('.github/workflows/ci-security.yml').includes('scripts/test-p10-postgres-smoke.sh'));
console.log('PASS P10: protected 200x300 Mock engine contract, zero answer leaks, private grade, stateful API, isolated Auth route, fullscreen and CI coverage.');
