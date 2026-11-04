import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {P12_SCENARIOS,validateStagingEvidence,stagingEvidenceSummary,copyStagingEvidence}
 from '../src/production/stagingQaEvidence.js';
import {runStagingQa} from './lib/p12-staging-qa.mjs';
import {stagingConfiguration} from './p12-staging-e2e.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const STAGE='aaaaabbbbbcccccddddd',PROD='fffffggggghhhhhiiiii';
const env={
 P12_STAGING_PROJECT_REF:STAGE,
 P12_PRODUCTION_PROJECT_REF:PROD,
 P12_STAGING_URL:'https://'+STAGE+'.supabase.co',
 P12_STAGING_ANON_KEY:'ci-anon-public-fixture',
 P12_STAGING_ENABLED:'YES_READ_ONLY',
};
for(const role of ['admin','paid','trial','outsider']){
 const prefix='P12_STAGING_'+role.toUpperCase();
 env[prefix+'_EMAIL']=role+'@staging.example.test';
 env[prefix+'_PASSWORD']=role+'-test-password';
}
const flag=['--confirm-staging-ref='+STAGE];
const valid=stagingConfiguration(env,flag);
assert.equal(valid.ref,STAGE);
assert.equal(valid.credentials.admin.email,'admin@staging.example.test');
for(const [override,args] of [
 [{P12_STAGING_PROJECT_REF:PROD},flag],
 [{P12_STAGING_URL:'https://'+PROD+'.supabase.co'},flag],
 [{P12_STAGING_ENABLED:'NO'},flag],
 [{P12_STAGING_ANON_KEY:''},flag],
 [{P12_PRODUCTION_PROJECT_REF:''},flag],
 [{P12_STAGING_TRIAL_EMAIL:env.P12_STAGING_PAID_EMAIL},flag],
 [{P12_STAGING_PAID_PASSWORD:'short'},flag],
 [{},[]],
])assert.throws(()=>stagingConfiguration({...env,...override},args),/GUARD/i);
assert.equal(P12_SCENARIOS.length,19);
assert.equal(new Set(P12_SCENARIOS.map(x=>x.id)).size,19);

const accounts={
 admin:'00000000-0000-0000-0000-000000000001',
 paid:'00000000-0000-0000-0000-000000000002',
 trial:'00000000-0000-0000-0000-000000000003',
 outsider:'00000000-0000-0000-0000-000000000004'
};
const course='10000000-0000-0000-0000-000000000001';
let writes=0,reads=0;
function makeClient(role,{mockReady=true}={}){
 return {
  auth:{getUser:async()=>({data:{user:{id:accounts[role]}},error:null})},
  from(table){
   const filters=new Map();let head=false;
   const q={
    select(_cols,options){reads++;head=options?.head===true;return this;},
    eq(k,v){filters.set(k,v);return this;},
    in(k,v){filters.set(k,v);return this;},
    async maybeSingle(){
     if(table==='lms_profiles')return {data:{account_status:'active'},error:null};
     if(table==='lms_courses')return {data:role==='paid'?
      {id:course,slug:'asp',publication_state:'published'}:null,error:null};
     return {data:null,error:null};
    },
    then(ok,bad){
     const sample={
      lms_role_assignments:role==='admin'?[{role:'admin'}]:[],
      lms_domains:[{id:'20000000-0000-0000-0000-000000000001'}],
      lms_topics:[{id:'30000000-0000-0000-0000-000000000001'}],
      lms_lessons:[{id:'40000000-0000-0000-0000-000000000001',publication_state:'published'}],
      lms_lesson_progress:[],
      lms_questions:[]
     };
     let data=sample[table]||[];
     if(table==='lms_lesson_progress'&&head){
      const target=filters.get('user_id');
      const count=role==='admin'&&target===accounts.admin?1:0;
      return Promise.resolve({data:null,count,error:null}).then(ok,bad);
     }
     if(table==='lms_questions'&&head)return Promise.resolve({data:null,count:0,error:null}).then(ok,bad);
     return Promise.resolve({data,error:null}).then(ok,bad);
    },
    insert(){writes++;throw Error('NO WRITE');},update(){writes++;throw Error('NO WRITE');},
    upsert(){writes++;throw Error('NO WRITE');},delete(){writes++;throw Error('NO WRITE');}
   };
   return q;
  },
  async rpc(name,{p_course_id}={}){
   reads++;
   if(name==='lms_p4_can_practice')return {data:role==='paid'||role==='admin',error:null};
   if(name==='lms_p6_bank_summary'){
    if(role==='admin')return {data:{total:2500},error:null};
    return {data:null,error:{code:'P0001',message:'Admin review role required'}};
   }
   if(name==='lms_p10_mock_readiness'){
    if(role==='trial')return {data:null,error:{code:'P0001',message:'Course access inactive'}};
    return {data:{engineVersion:'p10-mock-v1',required:200,durationSeconds:18000,
     ready:mockReady,verifiedReserved:mockReady?200:0,
     totalExclusiveFlags:mockReady?200:0},error:null};
   }
   if(name==='lms_p11_my_progress'){
    if(role==='outsider')return {data:null,error:{code:'P0001',message:'Course analytics not authorized'}};
    return {data:{version:'p11-v1',courseId:course,learning:{totalLessons:2},
     practice:{attempts:0},mock:{attempts:0},domains:[],recentAttempts:[]},error:null};
   }
   return {data:null,error:{code:'PGRST202',message:'RPC missing'}};
  }
 };
}
const clients=()=>Object.fromEntries(['admin','paid','trial','outsider','anon']
 .map(r=>[r,makeClient(r)]));
const full=await runStagingQa(clients(),{generatedAt:'2026-11-05T10:00:00Z'});
assert.equal(full.checks.length,19);
assert.equal(full.verdict,'NO_GO');
assert.equal(stagingEvidenceSummary(full).passed,19,JSON.stringify(full.checks.filter(x=>x.status!=='pass')));
assert.equal(stagingEvidenceSummary(full).blocked,0);
assert.equal(writes,0);
assert(reads>15);
assert(!JSON.stringify(full).includes('ci-anon-public-fixture'));
assert(!JSON.stringify(full).includes('admin@staging'));
assert(!JSON.stringify(full).includes(accounts.paid));
const text=copyStagingEvidence(full);
assert(text.includes('NO_GO')&&!text.includes('Bearer'));
assert.equal(validateStagingEvidence(JSON.stringify(full)).checks.length,19);
for(const changed of [
 {...full,verdict:'GO'},
 {...full,environment:'production'},
 {...full,checks:full.checks.slice(1)},
 {...full,checks:[...full.checks.slice(0,18),full.checks[0]]},
 {...full,checks:full.checks.map((x,i)=>i===0?{...x,detail:'user@example.com'}:x)},
 {...full,checks:full.checks.map((x,i)=>i===0?{...x,detail:'https://secret.supabase.co'}:x)},
 {...full,checks:full.checks.map((x,i)=>i===0?{...x,detail:'Bearer eyJ'+('a'.repeat(32))}:x)},
 {...full,additional:'secret'}
])assert.throws(()=>validateStagingEvidence(changed),/Invalid|unapproved|Untrusted|Incomplete/i);

const noMock=clients();noMock.paid=makeClient('paid',{mockReady:false});
const notReady=await runStagingQa(noMock,{generatedAt:'2026-11-05T10:00:00Z'});
assert.equal(notReady.checks.find(x=>x.id==='stage-mock-200').status,'blocked');
assert.equal(stagingEvidenceSummary(notReady).verdict,'NO_GO');
const noAdmin=clients();
noAdmin.admin={...noAdmin.admin,auth:{getUser:async()=>({data:{user:null},error:{message:'Unauthorized'}})}};
const denied=await runStagingQa(noAdmin,{generatedAt:'2026-11-05T10:00:00Z'});
assert.equal(denied.checks.find(x=>x.id==='stage-admin-auth').status,'blocked');
assert.equal(denied.checks.find(x=>x.id==='stage-p6-admin').status,'pending');
assert.equal(denied.checks.find(x=>x.id==='stage-p6-paid').status,'pending');

const scripts=file('scripts/p12-staging-e2e.mjs')+file('scripts/lib/p12-staging-qa.mjs');
for(const banned of ['.insert(','.upsert(','.update(','.delete(','service_role_key','signUp(','createUser('])
 assert(!scripts.includes(banned),'Staging QA includes write method '+banned);
assert(scripts.includes('P12_PRODUCTION_PROJECT_REF'));
assert(scripts.includes('YES_READ_ONLY'));
const ui=file('src/production/StagingQaEvidencePanel.jsx');
const page=file('src/production/LiveReleaseReadiness.jsx');
assert(page.includes('<StagingQaEvidencePanel/>'));
assert(ui.includes('file.text()')&&ui.includes('validateStagingEvidence'));
assert(!ui.includes('db.from(')&&!ui.includes('fetch('));
const workflow=file('.github/workflows/ci-security.yml');
assert(workflow.includes('npm run test:p12:staging'));
assert(!workflow.includes('npm run qa:staging:read'));
assert(file('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 67. P12.2 — Staging read-only API integration and local QA evidence'));
assert(file('docs/current/LOGIC_REGISTRY.md').includes('LMS-036'));
console.log('PASS P12.2: staging ref guards, four signed role categories plus anonymous, 19 positive/negative read-only checks, local import privacy, NO-GO and zero mutations.');
