import {verifiedLiveAdmin} from './liveAuthoringApi.js';

// Only the P28 Admin RPC can read question keys or write the protected bank.
// Never provide service-role credentials to the browser.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checkId=id=>{if(!uuid.test(id||''))throw Error('Select a real Course, Lesson or Question.');return id;};
const failure=e=>{throw Error(e?.message||'Question Bank operation failed. Check P28 migration and Admin permissions.');};
async function call(db,name,args){
 await verifiedLiveAdmin(db);
 const {data,error}=await db.rpc(name,args);
 if(error)failure(error);
 return data;
}
const difficultyOptions=new Set(['','unclassified','low','medium','high']);
const usageOptions=new Set(['all','practice','mock','draft','lesson','eligible']);
export async function listCourseBank(db,courseId,{search='',limit=50,offset=0,domainId=null,difficulty='',usage='all'}={}){
 checkId(courseId);
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>100000
  ||!difficultyOptions.has(difficulty)||!usageOptions.has(usage)||(domainId&&!uuid.test(domainId)))
  throw Error('Invalid bank filters or page.');
 const data=await call(db,'lms_p28_list_bank',{p_course_id:courseId,
  p_search:String(search).slice(0,160),p_limit:limit,p_offset:offset,
  p_domain_id:domainId||null,p_difficulty:difficulty,p_usage:usage});
 if(!data||!Number.isInteger(data.total)||!Array.isArray(data.items)
  ||data.items.some(q=>q.courseId!==courseId||!uuid.test(q.id||'')))
  throw Error('Question Bank returned unexpected course data.');
 return data;
}
export async function importCourseBank(db,courseId,rows){
 checkId(courseId);
 if(!Array.isArray(rows)||rows.length<1||rows.length>50)throw Error('Import must contain 1–50 rows per batch.');
 return call(db,'lms_p28_import_bank',{p_course_id:courseId,p_items:rows});
}
export async function approveNonAspBankQuestion(db,id){
 return call(db,'lms_p28_approve_nonasp',{p_question_id:checkId(id),
  p_confirmation:'APPROVE NON-ASP QUESTION'});
}
export async function reserveNonAspMockQuestion(db,id){
 return call(db,'lms_p28_mark_nonasp_mock',{p_question_id:checkId(id),
  p_confirmation:'RESERVE NON-ASP MOCK ONLY'});
}
export async function attachBankToLesson(db,lessonId,questionId,publish=false){
 return call(db,'lms_p28_attach_lesson_question',{
  p_lesson_id:checkId(lessonId),p_question_id:checkId(questionId),p_publish:!!publish});
}
export function stableBankSourceId(question){
 const text=[question.reference||'',question.prompt||''].join('|');
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 const shortRef=(question.reference||'imported').slice(0,120);
 return ('file:'+Math.abs(hash>>>0).toString(36)+':'+shortRef).slice(0,160);
}
const normalizeDomain=s=>String(s||'').toLowerCase().replace(/[\\s_-]+/g,' ').trim();
// Never infer an ASP11 domain from a legacy sheet number: match verified slug/title exactly.
export function mappedImportRows(questions,defaultDomainId=null,domains=[]){
 const validated=domains.filter(d=>uuid.test(d.id||''));
 return questions.map(q=>{
  const label=normalizeDomain(q.domainLabel);
  const matches=label?validated.filter(d=>[d.slug,d.title].some(n=>normalizeDomain(n)===label)):[];
  const matched=matches.length===1?matches[0]:null;
  const actualDomainId=matched?.id||(!label?defaultDomainId:null)||null;
  return {
   sourceId:stableBankSourceId(q),domainId:actualDomainId,
   // Display-only validation; server imports only its explicit allowed fields.
   unmappedDomainLabel:label&&!matched?q.domainLabel:null,
   topic:q.topic||'',prompt:q.prompt,options:q.options,
   correctIndex:q.correct,difficulty:q.difficulty||'unclassified',
   explanation:q.explanation||'',reference:q.reference||''
  };
 });
}
