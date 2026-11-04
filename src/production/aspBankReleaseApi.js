// P9B ASP bank governance: only protected active-Admin SECURITY DEFINER RPCs.
// No direct browser writes to questions, reviews, Mock form or audit tables.
async function call(db,name,args){
 if(!db||typeof db.rpc!=='function')throw new Error('Authenticated Supabase connection required.');
 const {data,error}=await db.rpc(name,args);
 if(error)throw new Error(error.message||'Protected ASP bank operation failed.');
 return data;
}
function safeIds(ids){
 if(!Array.isArray(ids)||ids.length>200||!ids.every(id=>typeof id==='string'
   &&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
  throw new Error('Select up to 200 verified question IDs.');
 return [...ids];
}
export function validateMockPreview(data,courseId,submittedIds){
 if(!data||typeof data!=='object'||data.mode!=='read_only'
   ||data.courseId!==courseId||data.required!==200
   ||data.mockEngineActive!==false)
  throw new Error('ASP Mock preflight is invalid or not read-only.');
 const countFields=['selected','distinctSelected','verifiedEligible','existingReserved',
  'existingForms','officialDomainCount','low','medium','high'];
 if(!countFields.every(k=>Number.isSafeInteger(data[k])&&data[k]>=0)
  ||typeof data.ready!=='boolean'||data.selected!==submittedIds.length
  ||data.distinctSelected>data.selected||data.verifiedEligible>data.distinctSelected
  ||data.low+data.medium+data.high!==data.verifiedEligible)
  throw new Error('ASP Mock preflight returned inconsistent inventory.');
 const allowed=data.selected===200&&data.distinctSelected===200
  &&data.verifiedEligible===200&&data.existingReserved===0
  &&data.existingForms===0&&data.officialDomainCount===9;
 if(data.ready!==allowed)
  throw new Error('ASP Mock server selection decision is inconsistent.');
 return Object.fromEntries(['mode','courseId','required','selected','distinctSelected',
  'verifiedEligible','existingReserved','existingForms','officialDomainCount',
  'low','medium','high','ready','mockEngineActive'].map(k=>[k,data[k]]));
}
export async function previewAspMockReservation(db,courseId,ids){
 const selected=safeIds(ids);
 if(!courseId)throw new Error('Select the genuine ASP course first.');
 return validateMockPreview(await call(db,'lms_p9b_mock_preflight',
  {p_course_id:courseId,p_question_ids:selected}),courseId,selected);
}
export async function reserveAspMock(db,courseId,ids,confirmation){
 const selected=safeIds(ids);
 if(selected.length!==200||new Set(selected).size!==200)
  throw new Error('Choose exactly 200 distinct ASP questions.');
 if(confirmation!=='RESERVE 200 ASP MOCK QUESTIONS')
  throw new Error('Type the full confirmation phrase before reservation.');
 const data=await call(db,'lms_p9b_reserve_mock',
  {p_course_id:courseId,p_question_ids:selected,p_confirmation:confirmation});
 if(!data||data.courseId!==courseId||data.reserved!==200||data.version!==1
    ||data.state!=='reserved'||data.mockEngineActive!==false
    ||typeof data.formId!=='string')
  throw new Error('Mock reservation response could not be verified.');
 return {formId:data.formId,courseId,reserved:200,version:1,state:'reserved'};
}
export async function approveAspPracticeQuestion(db,questionId){
 if(typeof questionId!=='string'||!questionId)throw new Error('Select one reviewed question.');
 const data=await call(db,'lms_p9b_approve_practice_question',{
  p_question_id:questionId,p_confirmation:'APPROVE ASP PRACTICE QUESTION'});
 if(!data||data.questionId!==questionId||data.approvalState!=='approved'
  ||data.mockExclusive!==false||!['low','medium','high'].includes(data.difficulty)
  ||typeof data.domainId!=='string')
  throw new Error('Question approval response could not be verified.');
 return {questionId,approvalState:'approved',domainId:data.domainId,difficulty:data.difficulty};
}
