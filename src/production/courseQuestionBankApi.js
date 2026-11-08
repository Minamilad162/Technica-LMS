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
 let data,compatibilityMode=false;
 try{
  data=await call(db,'lms_p28_list_bank',{p_course_id:courseId,
   p_search:String(search).slice(0,160),p_limit:limit,p_offset:offset,
   p_domain_id:domainId||null,p_difficulty:difficulty,p_usage:usage});
 }catch(e){
  // Older installed P28 exposes only the 4-argument catalog. During a
  // database-first transition show the real unfiltered bank for uploads;
  // never claim Domain/Difficulty/Usage filters or P29 switches are active.
  if(!/PGRST202|42883|could not find the function|does not exist|schema cache/i.test(String(e.message||'')))throw e;
  compatibilityMode=true;
  data=await call(db,'lms_p28_list_bank',{p_course_id:courseId,
   p_search:String(search).slice(0,160),p_limit:limit,p_offset:offset});
 }
 if(!data||!Number.isInteger(data.total)||!Array.isArray(data.items)
  ||data.items.some(q=>q.courseId!==courseId||!uuid.test(q.id||'')))
  throw Error('Question Bank returned unexpected course data.');
 return {...data,compatibilityMode};
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
// Single atomic Admin RPC for all staged rows, NOT one request per switch.
export async function getCourseBankBatchCapabilities(db){
 const x=await call(db,'lms_p34_bank_capabilities');
 if(x?.version!=='p34a-v1'||x.maxBatch!==500||x.atomic!==true
  ||x.lessonQuizPublishOnSave!==true)
  throw Error('One-Save Question Bank publication is not enabled on this database.');
 return x;
}
export async function saveCourseBankBatch(db,courseId,rows,releaseLessonId=null){
 checkId(courseId);
 if(releaseLessonId)checkId(releaseLessonId);
 if(!Array.isArray(rows)||rows.length>500||(!rows.length&&!releaseLessonId))
  throw Error('Choose question edits or an existing Lesson Quiz to publish.');
 const ids=new Set();
 for(const r of rows){
  checkId(r.questionId);
  if(ids.has(r.questionId))throw Error('Question appears twice in one batch.');
  ids.add(r.questionId);
  if(typeof r.isActive!=='boolean'||typeof r.mockCandidate!=='boolean'
   ||typeof r.expectedActive!=='boolean'||typeof r.expectedMockCandidate!=='boolean'
   ||!['unclassified','low','medium','high'].includes(r.difficulty)
   ||typeof r.expectedDifficulty!=='string'
   ||typeof r.expectedApprovalState!=='string'
   ||(r.addLessonId&&!uuid.test(r.addLessonId)))
   throw Error('Invalid staged Question Bank change.');
 }
 const response=await call(db,'lms_p34_save_question_bank',{
  p_course_id:courseId,p_changes:rows,p_release_lesson_id:releaseLessonId||null});
 if(!response||response.requested!==rows.length||!Number.isInteger(response.saved)
  ||response.saved<0||response.saved>rows.length)
  throw Error('Question Bank Save response could not be verified.');
 return response;
}
// Admin directly publishes existing bank-linked Draft lesson questions with
// one explicit action. This receipt is scoped to the Lesson only, not Practice.
export async function publishBankLessonQuiz(db,lessonId,quizQuestionId){
 return call(db,'lms_p34_publish_lesson_quiz',{
  p_lesson_id:checkId(lessonId),p_quiz_question_id:checkId(quizQuestionId)});
}
export async function setQuestionBankFlags(db,questionId,isActive,mockCandidate){
 if(typeof isActive!=='boolean'||typeof mockCandidate!=='boolean')
  throw Error('Select an explicit Active / Mock Exam state.');
 const data=await call(db,'lms_p29_set_question_flags',{
  p_question_id:checkId(questionId),p_is_active:isActive,p_mock_candidate:mockCandidate});
 if(data?.id!==questionId)throw Error('Bank state change was not verified.');
 return data;
}
export async function loadMarkedMockCandidateIds(db,courseId){
 const data=await call(db,'lms_p29_mock_candidate_ids',{p_course_id:checkId(courseId)});
 if(!data||!Array.isArray(data.ids)||data.count!==data.ids.length
  ||data.ids.some(id=>!uuid.test(id)))throw Error('Unexpected Mock selection response.');
 return data.ids;
}
// Admin-only read-only diagnostic for one real Lesson's publication status.
// P22 RLS rejects learners; no correct_index/options/answers are ever selected.
export async function inspectLessonQuizPublication(db,lessonId){
 checkId(lessonId);
 await verifiedLiveAdmin(db);
 const {data,error}=await db.from('lms_p22_lesson_quiz_questions')
  .select('id,lesson_id,bank_question_id,is_published')
  .eq('lesson_id',lessonId);
 if(error)throw Error('Cannot inspect Lesson Quiz publication: '+(error.message||'verify P22 and Admin access'));
 const rows=Array.isArray(data)?data:[];
 if(rows.some(row=>row.lesson_id!==lessonId||!uuid.test(row.id||'')||
   (row.bank_question_id&&!uuid.test(row.bank_question_id))||
   typeof row.is_published!=='boolean'))
  throw Error('Unexpected Lesson Quiz publication results.');
 return {
  total:rows.length,
  published:rows.filter(q=>q.is_published).length,
  pending:rows.filter(q=>!q.is_published).length,
  linked:rows.filter(q=>q.bank_question_id).length,
  rows
 };
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
const normalizeDomain=s=>String(s||'').toLowerCase().replace(/[\s_-]+/g,' ').trim();
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
