import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAspCourseTitle,aspMissingReason} from '../src/production/questionBankCourseSelection.js';
import {checkAspCourseRecovery,repairExistingAspCourseId} from '../src/production/aspCourseSetupApi.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id='10000000-0000-0000-0000-000000000099';
const existing={id,title:'ASP Course',slug:'asp-course',publication_state:'published'};
const canonical={...existing,id:'10000000-0000-0000-0000-000000000010',slug:'asp'};
for(const title of ['ASP','ASP Course','Associate Safety Professional',
 'Associated Safety Professional','ASP (Associate Safety Professional)',
 'ASP - Associated Safety Professional','Associate Safety Professional (ASP)'])
 assert(isAspCourseTitle({title}),title+' must be recognized without inventing a new course');
for(const title of ['ASP Fundamentals - another qualification','CSP','Safety course'])
 assert(!isAspCourseTitle({title}),title+' must not be auto-treated as canonical ASP');
assert.deepEqual(checkAspCourseRecovery([existing],id),{
 id,oldSlug:'asp-course',title:'ASP Course',state:'published'});
assert.throws(()=>checkAspCourseRecovery([canonical,existing],id),/canonical ASP Course already exists/);
assert.throws(()=>checkAspCourseRecovery([existing,{...existing,id:canonical.id}],id),/ambiguous/);
assert.throws(()=>checkAspCourseRecovery([{...existing,publication_state:'archived'}],id),/manual Admin review/);
assert.throws(()=>checkAspCourseRecovery([existing],'bad'),/existing ASP Course/);
assert.match(aspMissingReason([existing]),/internal identifier/);
assert.match(aspMissingReason([]),/published ASP Course/);

let writes=[],identityQueries=0;
const tables={
 lms_profiles:{select(){return this;},eq(){return this;},
  maybeSingle:async()=>{identityQueries++;return {data:{account_status:'active',full_name:'Admin'},error:null};}},
 lms_role_assignments:{select(){return this;},eq(){return this;},
  is:async()=>{identityQueries++;return {data:[{role:'admin',scope_course_id:null}],error:null};}},
 lms_courses:{select(){return this;},order:async()=>({data:[existing],error:null}),
  update(values){
   writes.push({table:'lms_courses',values,conditions:[]});
   return {eq(k,v){writes.at(-1).conditions.push([k,v]);return this;},
    select(){return this;},single:async()=>({data:{...existing,slug:'asp'},error:null})};
  }}
};
const db={auth:{getUser:async()=>({data:{user:{id:canonical.id}},error:null})},
 from(table){assert(tables[table],'Unexpected DB table accessed: '+table);return tables[table];}};
await assert.rejects(()=>repairExistingAspCourseId(db,id,'wrong'),/Explicit Admin confirmation/);
assert.equal(writes.length,0,'No writes without explicit Admin confirmation');
const result=await repairExistingAspCourseId(db,id,'USE EXISTING ASP COURSE');
assert.deepEqual(result,{id,title:existing.title,publicationState:'published'});
assert.equal(identityQueries,2,'Profile and roles both verified');
assert.deepEqual(writes,[{table:'lms_courses',values:{slug:'asp'},
 conditions:[['id',id],['slug','asp-course'],['title','ASP Course'],['publication_state','published']]}],
 'Update only the single existing Course with optimistic scoped checks');
const ambiguousDb={...db,from(table){
 if(table==='lms_courses')return {...tables.lms_courses,
  order:async()=>({data:[existing,canonical],error:null})};
 return tables[table];
}};
await assert.rejects(()=>repairExistingAspCourseId(ambiguousDb,id,'USE EXISTING ASP COURSE'),/canonical ASP Course already exists/);
assert.equal(writes.length,1,'Ambiguous / duplicate ASP cannot write');

const bank=read('src/production/AdminCourseBank.jsx');
const fin=read('src/production/OfficialMockBankFinalizer.jsx');
const res=read('src/production/AspMockReservation.jsx');
const hub=read('src/production/LiveExamPracticeHub.jsx');
const portal=read('src/production/LiveMockPortal.jsx');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const mock=read('src/production/LiveMockExam.jsx');
const mockApi=read('src/production/mockApi.js');
const p9b=read('supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql');
const p10=read('supabase/migrations/202611050001_p10_mock_engine.sql');
assert(bank.includes('repairExistingAspCourseId(db,selected.id'));
assert(bank.includes('onRefreshCourses?.()'));
assert(bank.includes('<OfficialMockBankFinalizer'));
assert(bank.includes('selected.publication_state!==\'published\''));
assert(fin.includes('loadMarkedMockCandidateIds(db,course.id)'));
assert(fin.includes('revision])'),'Reload saved selection after Save All');
assert(fin.includes('marked.length===200&&course.slug===\'asp\''));
assert(fin.includes('ids?.length===200&&!disabled'));
assert(fin.includes('marked.length>200'));
assert(fin.includes('<AspMockReservation'));
assert(res.includes('previewAspMockReservation(db,course.id,selected)'));
assert(res.includes("p9b_reserve")===false,'Never call unguarded Mock SQL from UI');
assert(res.includes('reserveAspMock(db,course.id,selected,phrase)'));
assert(res.includes("PHRASE='RESERVE 200 ASP MOCK QUESTIONS'"));
assert(hub.includes('officialAsp.publication_state!==\'published\''));
assert(portal.includes('viewingCourse.publication_state!==\'published\''));
assert(workspace.includes('officialAsp.publication_state!==\'published\''));
assert(hub.includes('<LiveMockExam')&&!hub.includes('LiveSelectedMockExam'));
assert(mock.includes('startOfficialMock(db,course.id,requestId)'));
assert(mockApi.includes("MOCK_QUESTION_COUNT=200")&&mockApi.includes("MOCK_DURATION_SECONDS=18000"));
assert(p9b.includes('Exactly 200 explicit question IDs required')&&p9b.includes('r.rights_checked IS TRUE'));
assert(p10.includes("v_count=200 AND v_total=200")&&p10.includes("interval '300 minutes'"));
const p1=read('supabase/migrations/202610300001_p1_foundation.sql');
assert(p1.includes('lms_course_admin_write'),'Database must enforce Admin-only updates');
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 100. P42'));
console.log('PASS P42: existing ASP Course repair scoped by Admin RLS, selected 200 saved candidates preflighted, Draft/unpublished blocked, immutable P10 200/300 retained.');
