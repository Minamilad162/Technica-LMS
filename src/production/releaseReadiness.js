// P12.1: verified Admin-only, READ-ONLY runtime release diagnostics.
// Runs in the signed-in browser with the public Supabase key/JWT. NEVER
// imports, reserves, publishes, grants access or writes a DB row.
// Even a green infrastructure matrix is not production GO: independent
// staging/browser/content/ownership gates remain explicitly PENDING.
import {verifiedLiveAdmin} from './liveAuthoringApi.js';
import {listCourses,loadStructure} from './lmsApi.js';
import {describeDbError} from './reviewConnectionCheck.js';
import {fetchAspReviewSummary} from './questionReviewApi.js';
import {getMockReadiness} from './mockApi.js';
import {getLearnerProgress} from './learnerProgressApi.js';
import {getAdaptiveReadiness} from './practiceApi.js';
import {normalizeAdaptiveReadiness} from './adminAdaptiveReadiness.js';

export const P12_VERSION='p12-runtime-v1';
export const MANUAL_RELEASE_GATES=Object.freeze([
 {id:'content',area:'Content',title:'Licensed ASP questions, SME review and references',
  detail:'Verify source rights, answers, nine official domains and approved difficulty classification on the actual private 2,500-source intake.'},
 {id:'staging',area:'Integration',title:'Authorized staging end-to-end journeys',
  detail:'Run real Supabase JWT, P1/P2/P4/P8/P9B/P10/P11, Draft publishing, reviewer separation and entitlement-denial cases on a dedicated staging project.'},
 {id:'media',area:'Security',title:'Private videos, PDFs and media signing',
  detail:'Verify server-authorized private media access, expiration and download controls on real devices; browser-only screenshot prevention cannot be guaranteed.'},
 {id:'billing',area:'Entitlements',title:'Payments, refunds and access expiry',
  detail:'Verify the actual subscription/payment method, trial grants, refund/expiry and role changes; manual entitlements only if this is the approved launch model.'},
 {id:'devices',area:'Devices',title:'Real browser and mobile exam acceptance',
  detail:'Test iOS Safari, Android Chrome and desktop fullscreen, hidden-tab behavior, network loss, secure autosave, deadline and question watermark.'},
 {id:'performance',area:'Operations',title:'Capacity and failure/recovery test',
  detail:'Record staging baselines for ~100 learners, quiz selection, 200-answer Mock, concurrent login, API latency and retry behavior.'},
 {id:'release',area:'Release',title:'Production backup, rollback and owner sign-off',
  detail:'Approve exact staging evidence, production migration plan, backups, rollback, Cloudflare build variables, monitoring and final go-live.'}
]);
const row=(id,area,title,status,detail)=>({id,area,title,status,detail});
const counts=(r,keys)=>r&&keys.every(k=>Number.isSafeInteger(r[k])&&r[k]>=0);
const explain=e=>describeDbError(e);
const stages=['pass','blocked','pending'];
export function summarizeReleaseReadiness(rows){
 if(!Array.isArray(rows)||rows.some(r=>!r||!stages.includes(r.status)||
  !/^[a-z0-9-]+$/.test(r.id||'')||typeof r.title!=='string'||typeof r.detail!=='string'))
  throw new Error('Invalid release diagnostics');
 const ids=new Set();
 for(const r of rows){if(ids.has(r.id))throw Error('Duplicate release check');ids.add(r.id);}
 const passed=rows.filter(r=>r.status==='pass').length;
 const blocked=rows.filter(r=>r.status==='blocked').length;
 const pending=rows.filter(r=>r.status==='pending').length;
 return {version:P12_VERSION,verdict:'NO_GO',passed,blocked,pending,total:rows.length,
  note:'Browser checks do not certify Production. Manual evidence and owner approval are mandatory.'};
}
export function releaseReportText(rows){
 const status=summarizeReleaseReadiness(rows);
 return [
 'TECHNICA LMS P12 RELEASE READINESS — READ ONLY',
 'Verdict: '+status.verdict,
 'Checks: '+status.passed+' pass / '+status.blocked+' blocked / '+status.pending+' pending',
 ...rows.map(r=>r.status.toUpperCase()+' | '+r.area+' | '+r.title+' | '+r.detail),
 'No production deployment or data mutation was performed.',
 ].join('\n');
}
const safeBuild={url:import.meta.env?.VITE_SUPABASE_URL||'',
 publicKey:import.meta.env?.VITE_SUPABASE_ANON_KEY||'',
 mode:import.meta.env?.VITE_DATA_MODE||''};
function buildCheck(build){
 try{
  const u=new URL(build.url);
  if(u.protocol!=='https:'||u.username||u.password||!build.publicKey)throw Error('Bad public config');
  return row('build','Platform','HTTPS public Supabase build configuration','pass',
   'Public build URL and public key are present. This does not verify Production identity or Cloudflare secrets.');
 }catch{
  return row('build','Platform','HTTPS public Supabase build configuration','blocked',
   'HTTPS Supabase URL and public build key are missing or invalid.');
 }
}
const readCheck=async(id,area,title,task,interpret)=>{
 try{return interpret(await task());}
 catch(e){return row(id,area,title,'blocked',explain(e));}
};
export async function checkReleaseReadiness(db,{build=safeBuild}={}){
 const rows=[buildCheck(build)];
 const cfg=rows[0];
 if(cfg.status!=='pass'||!db||typeof db.rpc!=='function'||!db.auth){
  rows.push(row('admin','Access','Verified live Supabase Admin','blocked',
   'Cannot run any protected runtime checks without valid Supabase build values and a real signed-in Admin.'));
  return rows.concat(MANUAL_RELEASE_GATES.map(g=>row(g.id,g.area,g.title,'pending',g.detail)));
 }
 let user;
 try{
  user=await verifiedLiveAdmin(db);
  rows.push(row('admin','Access','Verified live Supabase Admin','pass',
   'Current Supabase JWT and active LMS Admin role verified. Demo Admin is not sufficient.'));
 }catch(e){
  rows.push(row('admin','Access','Verified live Supabase Admin','blocked',explain(e)));
  return rows.concat(MANUAL_RELEASE_GATES.map(g=>row(g.id,g.area,g.title,'pending',g.detail)));
 }
 let course;
 rows.push(await readCheck('catalog','Learning','Authorized ASP course in real Supabase',
  async()=>{
   const courses=await listCourses(db);
   course=courses.find(c=>c.slug==='asp');
   return course;
  },c=>row('catalog','Learning','Authorized ASP course in real Supabase',
   c?.id?'pass':'blocked',c?.id?'ASP course exists in the signed-in project.':'No ASP course is visible in this database.')));
 if(!course?.id){
  for(const [id,area,title] of [
   ['hierarchy','Learning','Course → Domain → Topic → Lesson'],
   ['p2','Progress','P2 protected lesson progress'],
   ['p4','Practice','P4 server-side Practice authorization'],
   ['p6','Content','P6A private bank inventory'],
   ['p8','Practice','P8e Level Up 30-question readiness'],
   ['p10','Exams','P10 reserved 200-question Mock readiness'],
   ['p11','Analytics','P11 own-progress RPC']])
   rows.push(row(id,area,title,'blocked','Requires a verified ASP course and Admin session.'));
  return rows.concat(MANUAL_RELEASE_GATES.map(g=>row(g.id,g.area,g.title,'pending',g.detail)));
 }
 rows.push(await readCheck('hierarchy','Learning','Course → Domain → Topic → Lesson',
  ()=>loadStructure(db,course.id),tree=>{
   if(!Array.isArray(tree))throw Error('Unexpected course structure');
   const domains=tree.length,topics=tree.reduce((a,d)=>a+(d.topics||[]).length,0);
   const lessons=tree.reduce((a,d)=>a+(d.topics||[]).reduce((n,t)=>n+(t.lessons||[]).length,0),0);
   return row('hierarchy','Learning','Course → Domain → Topic → Lesson',
    domains&&topics&&lessons?'pass':'blocked',
    domains+' domains · '+topics+' topics · '+lessons+' lessons. All levels require real content.');
  }));
 rows.push(await readCheck('p2','Progress','P2 protected lesson progress',
  async()=>{
   const {data,error}=await db.from('lms_lesson_progress')
    .select('lesson_id',{head:true,count:'exact'}).eq('user_id',user.id);
   if(error)throw error;
   return data;
  },()=>row('p2','Progress','P2 protected lesson progress','pass',
   'P2 table answered an authorized, read-only own-progress query. Does not prove event ingestion.')));
 rows.push(await readCheck('p4','Practice','P4 server-side Practice authorization',
  async()=>{
   const {data,error}=await db.rpc('lms_p4_can_practice',{p_course_id:course.id});
   if(error)throw error;
   return data;
  },v=>row('p4','Practice','P4 server-side Practice authorization',
   v===true?'pass':'blocked',v===true?'Private course entitlement/authorization RPC accepted this verified Admin.':'P4 Practice authorization is not active for this account.')));
 rows.push(await readCheck('p6','Content','P6A protected ASP bank inventory',
  ()=>fetchAspReviewSummary(db,course.id),
  data=>{
   if(!counts(data,['total','approved','draft','mockReserved','readyToReview']))
    throw Error('Invalid private ASP bank counters');
   return row('p6','Content','P6A protected ASP bank inventory',
    data.total>0&&data.approved>0?'pass':'blocked',
    data.total+' real ASP rows; '+data.approved+' approved Practice; '+data.mockReserved+
    ' Mock-exclusive flags. Inventory is not evidence of source rights or independent review.');
  }));
 rows.push(await readCheck('p8','Practice','P8e Level Up 30-question readiness',
  async()=>{
   const data=await getAdaptiveReadiness(db,course.id,30,null);
   return normalizeAdaptiveReadiness(data,30);
  },data=>row('p8','Practice','P8e Level Up 30-question readiness',
   data.ready?'pass':'blocked',
   'Verified non-Mock pools Low '+data.low+', Medium '+data.medium+', High '+data.high+
   '. Needs 30 each under fixed-correct-target policy.')));
 rows.push(await readCheck('p10','Exams','P10 reserved 200-question Mock readiness',
  ()=>getMockReadiness(db,course.id),
  data=>row('p10','Exams','P10 reserved 200-question Mock readiness',
   data.ready?'pass':'blocked',
   data.verifiedReserved+' / 200 verified reserved; '+data.totalExclusiveFlags+
   ' exclusive flags. A ready form does not prove real mobile/browser acceptance.')));
 rows.push(await readCheck('p11','Analytics','P11 own-progress RPC',
  ()=>getLearnerProgress(db,course.id),
  data=>row('p11','Analytics','P11 own-progress RPC','pass',
   'Authenticated, own-user progress report returned for '+data.courseTitle+
   '. Zero attempts is allowed; server-owned P2/P4/P10 data is queried without exposing keys.')));
 return rows.concat(MANUAL_RELEASE_GATES.map(g=>row(g.id,g.area,g.title,'pending',g.detail)));
}
