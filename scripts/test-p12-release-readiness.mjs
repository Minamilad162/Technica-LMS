import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkReleaseReadiness,MANUAL_RELEASE_GATES,releaseReportText,summarizeReleaseReadiness,P12_VERSION}
 from '../src/production/releaseReadiness.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const courseId='10000000-0000-0000-0000-000000000001';
const userId='00000000-0000-0000-0000-000000000001';
const build={url:'https://test-project.supabase.co',publicKey:'anon-placeholder',mode:'supabase'};
assert.equal(P12_VERSION,'p12-runtime-v1');
assert.equal(MANUAL_RELEASE_GATES.length,7);
assert.equal(new Set(MANUAL_RELEASE_GATES.map(g=>g.id)).size,7);
const unavailable=await checkReleaseReadiness(null,{build});
assert.equal(unavailable[0].status,'pass');
assert.equal(unavailable[1].status,'blocked');
assert.equal(unavailable.filter(r=>r.status==='pending').length,7);
assert.equal(summarizeReleaseReadiness(unavailable).verdict,'NO_GO');
const noBuild=await checkReleaseReadiness(null,{build:{url:'http://insecure.supabase.co',publicKey:'key'}});
assert.equal(noBuild[0].status,'blocked');
assert.equal(noBuild[1].status,'blocked');
assert.throws(()=>summarizeReleaseReadiness([{id:'bad',title:'x',detail:'y',status:'GO'}]),/Invalid/);
assert.throws(()=>summarizeReleaseReadiness([
 {id:'x',title:'a',detail:'b',status:'pass'},
 {id:'x',title:'c',detail:'d',status:'blocked'},
]),/Duplicate/);
assert.equal(summarizeReleaseReadiness([]).verdict,'NO_GO');

const opCounts={read:0,write:0};
let revoked=false;
const api={
 auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},
 from(table){
  const q={
   select(){opCounts.read++;return this;},eq(){return this;},is(){return this;},in(){return this;},
   order(){return this;},head(){return this;},
   maybeSingle:async()=>({data:table==='lms_profiles'?
    {account_status:'active'}:null,error:null}),
   insert(){opCounts.write++;throw Error('WRITE DISALLOWED');},
   update(){opCounts.write++;throw Error('WRITE DISALLOWED');},
   delete(){opCounts.write++;throw Error('WRITE DISALLOWED');},
   upsert(){opCounts.write++;throw Error('WRITE DISALLOWED');},
   then(ok,bad){
    const byTable={
     lms_role_assignments:revoked?[]:[{role:'admin'}],
     lms_courses:[{id:courseId,slug:'asp',title:'ASP',publication_state:'published'}],
     lms_domains:[{id:'20000000-0000-0000-0000-000000000001',title:'Domain',topics:[]}],
     lms_topics:[{id:'30000000-0000-0000-0000-000000000001',title:'Topic',domain_id:'20000000-0000-0000-0000-000000000001'}],
     lms_lessons:[{id:'40000000-0000-0000-0000-000000000001',title:'Lesson',topic_id:'30000000-0000-0000-0000-000000000001'}],
     lms_lesson_progress:[],
    };
    return Promise.resolve({data:byTable[table]||[],error:null}).then(ok,bad);
   },
  };
  return q;
 },
 async rpc(name,args){
  opCounts.read++;
  if(name==='lms_p4_can_practice')return {data:true,error:null};
  if(name==='lms_p6_bank_summary')return {data:{total:2500,approved:100,draft:2400,mockReserved:200,readyToReview:0},error:null};
  if(name==='lms_p10_mock_readiness')return {data:{ready:true,required:200,verifiedReserved:200,
    totalExclusiveFlags:200,durationSeconds:18000,engineVersion:'p10-mock-v1'},error:null};
  return {data:null,error:{code:'PGRST202',message:'could not find function'}};
 }
};
const good=await checkReleaseReadiness(api,{build});
const status=Object.fromEntries(good.map(r=>[r.id,r.status]));
for(const id of ['build','admin','catalog','hierarchy','p2','p4','p6','p10'])assert.equal(status[id],'pass',id);
assert.equal(status.p8,'blocked');
assert.equal(status.p11,'blocked');
assert.equal(good.filter(r=>r.status==='pending').length,7);
assert.equal(opCounts.write,0,'P12 must only read data');
assert(opCounts.read>=7);
assert.equal(summarizeReleaseReadiness(good).verdict,'NO_GO');
assert(!JSON.stringify(good).includes('anon-placeholder'));
assert(!JSON.stringify(good).includes(userId));
const text=releaseReportText(good);
assert(text.includes('NO_GO')&&text.includes('No production deployment'));
assert(!text.includes('anon-placeholder'));
revoked=true;
const noAdmin=await checkReleaseReadiness(api,{build});
assert.equal(noAdmin.find(x=>x.id==='admin').status,'blocked');
assert.equal(noAdmin.some(x=>x.id==='p6'),false,
 'Must not run protected bank diagnostics without real Admin rights');
assert.equal(opCounts.write,0);
const ui=source('src/production/LiveReleaseReadiness.jsx');
assert(ui.includes('checkReleaseReadiness'));
assert(ui.includes('NO-GO'));
assert(!ui.includes("from '../data/mock'"));
const app=source('src/App.jsx');
const layout=source('src/components/Layout.jsx');
assert(app.includes('path="/release-readiness"'));
assert(app.includes('<AdminOnly><RoutePage><LiveReleaseReadiness/>'));
assert(layout.includes("['/release-readiness','Release Readiness'"));
const workflow=source('.github/workflows/ci-security.yml');
assert(workflow.includes('npm run test:p12'));
const master=source('TECHNICA_LMS_MASTER_BLUEPRINT.md');
assert(master.includes('## 66. P12 — Production readiness and live Admin diagnostics'));
assert(source('docs/current/LOGIC_REGISTRY.md').includes('LMS-035'));
console.log('PASS P12: actual authenticated Admin-only read-only diagnostics, 0 mutations, 7 manual evidence gates, 9 runtime checks and permanent NO-GO by default.');
