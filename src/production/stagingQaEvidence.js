// P12.2: sanitized, local-only Staging QA API evidence schema.
// Browser never posts/imports raw Supabase payloads or secrets.
// Stage checks are NOT a launch authorization and never upgrade NO-GO.
export const P12_STAGING_VERSION='p12-staging-qa-v1';
export const P12_SCENARIOS=Object.freeze([
 {id:'stage-admin-auth',area:'Authentication',title:'Real staging Admin JWT and role'},
 {id:'stage-paid-auth',area:'Authentication',title:'Real staging paid learner JWT'},
 {id:'stage-trial-auth',area:'Authentication',title:'Real staging Trial learner JWT'},
 {id:'stage-outsider-auth',area:'Authentication',title:'Real staging unentitled account JWT'},
 {id:'stage-asp-catalog',area:'Learning',title:'Published ASP course available to paid account'},
 {id:'stage-asp-hierarchy',area:'Learning',title:'Authorized Course → Domain → Topic → Lesson'},
 {id:'stage-p2-progress',area:'Progress',title:'P2 read-only progress endpoint'},
 {id:'stage-paid-practice',area:'Practice',title:'Paid Practice access granted by server'},
 {id:'stage-trial-practice',area:'Practice',title:'Trial Practice access denied by server'},
 {id:'stage-outsider-practice',area:'Practice',title:'Unentitled Practice access denied by server'},
 {id:'stage-p6-admin',area:'Questions',title:'Admin private-bank aggregate reviewer access'},
 {id:'stage-p6-paid',area:'Questions',title:'Paid learner denied reviewer access'},
 {id:'stage-p6-anon',area:'Questions',title:'Anonymous client denied reviewer access'},
 {id:'stage-mock-200',area:'Exams',title:'Paid learner Mock readiness (200 exclusive reserved)'},
 {id:'stage-mock-trial',area:'Exams',title:'Trial learner Mock readiness denied'},
 {id:'stage-p11-paid',area:'Analytics',title:'Paid learner own P11 report validated'},
 {id:'stage-p11-outsider',area:'Analytics',title:'Unentitled learner P11 access denied'},
 {id:'stage-private-questions',area:'Security',title:'Browser direct private question access denied'},
 {id:'stage-cross-user-progress',area:'Security',title:'Other learner progress not exposed by RLS'}
]);
const statuses=new Set(['pass','blocked','pending']);
const allowed=new Map(P12_SCENARIOS.map(x=>[x.id,x]));
const secretPattern=/(?:eyJ[A-Za-z0-9_-]{18,}|sk_[A-Za-z0-9_-]{10,}|service[_-]?role|Bearer\s+[A-Za-z0-9_.-]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?:\/\/|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
export function validateStagingEvidence(input){
 const data=typeof input==='string'?JSON.parse(input):input;
 if(!data||typeof data!=='object'||data.version!==P12_STAGING_VERSION||
   data.environment!=='staging'||data.scope!=='read-only-api'||
   data.verdict!=='NO_GO'||!Number.isFinite(Date.parse(data.generatedAt||''))||
   !Array.isArray(data.checks)||data.checks.length!==P12_SCENARIOS.length)
  throw Error('Invalid staging evidence format or release assertion');
 if(Object.keys(data).some(x=>!['version','environment','scope','verdict','generatedAt','checks'].includes(x)))
  throw Error('Staging evidence has unapproved fields');
 const ids=new Set();
 const checks=data.checks.map(row=>{
  if(!row||!allowed.has(row.id)||ids.has(row.id)||!statuses.has(row.status)||
    row.area!==allowed.get(row.id).area||row.title!==allowed.get(row.id).title||
    typeof row.detail!=='string'||row.detail.length>260||
    !/^[\x20-\x7e]*$/.test(row.detail)||secretPattern.test(row.detail))
   throw Error('Untrusted, duplicate or private staging evidence item');
  ids.add(row.id);
  return {id:row.id,area:row.area,title:row.title,status:row.status,detail:row.detail};
 });
 if(ids.size!==allowed.size)throw Error('Incomplete staging QA evidence');
 return {version:P12_STAGING_VERSION,environment:'staging',scope:'read-only-api',
  verdict:'NO_GO',generatedAt:data.generatedAt,checks};
}
export function stagingEvidenceSummary(evidence){
 const safe=validateStagingEvidence(evidence);
 return {verdict:'NO_GO',passed:safe.checks.filter(x=>x.status==='pass').length,
  blocked:safe.checks.filter(x=>x.status==='blocked').length,
  pending:safe.checks.filter(x=>x.status==='pending').length,total:safe.checks.length};
}
export function copyStagingEvidence(evidence){
 const report=validateStagingEvidence(evidence),s=stagingEvidenceSummary(report);
 return ['TECHNICA LMS — STAGING QA API EVIDENCE (NOT LAUNCH APPROVAL)',
  'Result: NO_GO / '+s.passed+' PASS / '+s.blocked+' BLOCKED / '+s.pending+' PENDING',
  ...report.checks.map(x=>x.status.toUpperCase()+' | '+x.title+' | '+x.detail),
  'No Production authorization, API writes or browser/mobile E2E claim.'].join('\n');
}
