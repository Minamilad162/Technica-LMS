// Official ASP Mock, completely separate from P4/P8e Practice.
// Only protected JWT-authenticated server RPCs can open and grade the form.
export const MOCK_QUESTION_COUNT=200;
export const MOCK_DURATION_SECONDS=18000;
export const MOCK_ENGINE_VERSION='p10-mock-v1';

async function rpc(db,name,args){
 if(!db||typeof db.rpc!=='function')throw new Error('Verified Supabase session required');
 const {data,error}=await db.rpc(name,args);
 if(error)throw new Error(error.message||'Official Mock is unavailable');
 return data;
}
export function validateMockReadiness(value){
 if(!value||typeof value!=='object'||value.required!==MOCK_QUESTION_COUNT
   ||value.durationSeconds!==MOCK_DURATION_SECONDS
   ||value.engineVersion!==MOCK_ENGINE_VERSION
   ||typeof value.ready!=='boolean'
   ||![value.verifiedReserved,value.totalExclusiveFlags].every(x=>Number.isSafeInteger(x)&&x>=0)
   ||value.ready!==(value.verifiedReserved===200&&value.totalExclusiveFlags===200))
  throw new Error('ASP Mock server is not ready for official exam delivery.');
 return {ready:value.ready,verifiedReserved:value.verifiedReserved,
  totalExclusiveFlags:value.totalExclusiveFlags};
}
export const getMockReadiness=async(db,courseId)=>
 validateMockReadiness(await rpc(db,'lms_p10_mock_readiness',{p_course_id:courseId}));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateMockPayload(value){
 if(!value||typeof value!=='object'||!uuid.test(value.attemptId||'')
  ||value.mode!=='asp_mock_200'||value.questionCount!==200
  ||value.durationSeconds!==18000
  ||!['in_progress','submitted','expired','abandoned'].includes(value.state)
  ||!Number.isSafeInteger(value.answeredCount)||value.answeredCount<0||value.answeredCount>200
  ||!Number.isSafeInteger(value.flaggedCount)||value.flaggedCount<0||value.flaggedCount>200
  ||!Number.isFinite(Date.parse(value.startedAt||''))
  ||!Number.isFinite(Date.parse(value.deadlineAt||''))
  ||!Number.isFinite(Date.parse(value.serverNow||'')))
  throw new Error('Invalid protected Mock response');
 const start=Date.parse(value.startedAt),end=Date.parse(value.deadlineAt);
 if(Math.abs(end-start-MOCK_DURATION_SECONDS*1000)>1)
  throw new Error('Invalid Mock server deadline');
 if(!Array.isArray(value.questions))throw new Error('Invalid Mock questions');
 if(value.state==='in_progress'){
  if(value.questions.length!==200||value.correctCount!==null||value.scorePercent!==null)
   throw new Error('Mock attempt leaked marking or has an invalid form');
  const found=new Set();
  for(let i=0;i<200;i++){
   const q=value.questions[i];
   if(!q||!uuid.test(q.id||'')||found.has(q.id)||q.position!==i+1
    ||typeof q.prompt!=='string'||!Array.isArray(q.options)
    ||q.options.length<2||q.options.length>6||typeof q.flagged!=='boolean'
    ||(q.selectedIndex!==null&&(!Number.isInteger(q.selectedIndex)
       ||q.selectedIndex<0||q.selectedIndex>=q.options.length))
    ||'correctIndex' in q||'correct_index' in q||'correct_index_snapshot' in q
    ||'explanation' in q||'explanation_snapshot' in q)
    throw new Error('Mock question set is invalid or reveals answers');
   found.add(q.id);
  }
  if(value.questions.filter(q=>q.selectedIndex!==null).length!==value.answeredCount
    ||value.questions.filter(q=>q.flagged).length!==value.flaggedCount)
   throw new Error('Mock answer counts are inconsistent');
 }else{
  if(value.questions.length!==0)throw new Error('Closed Mock may not expose questions');
  if(value.state==='abandoned'){
   if(value.correctCount!==null||value.scorePercent!==null)
    throw new Error('Abandoned Mock must not be graded');
  }else if(!Number.isSafeInteger(value.correctCount)||value.correctCount<0
     ||value.correctCount>200||typeof value.scorePercent!=='number'
     ||Math.abs(value.scorePercent-value.correctCount/2)>0.01)
    throw new Error('Server grade could not be verified');
 }
 return value;
}
export async function startOfficialMock(db,courseId,requestId){
 if(!uuid.test(courseId||'')||!uuid.test(requestId||''))
  throw new Error('Invalid Mock course/request identity');
 return validateMockPayload(await rpc(db,'lms_p10_start_mock',
  {p_course_id:courseId,p_request_id:requestId}));
}
export const getOfficialMock=async(db,attemptId)=>
 validateMockPayload(await rpc(db,'lms_p10_mock_payload',{p_attempt_id:attemptId}));
export async function saveOfficialMock(db,attemptId,questionId,selectedIndex,flagged){
 if(!uuid.test(attemptId||'')||!uuid.test(questionId||'')
   ||!((selectedIndex===null)||(Number.isInteger(selectedIndex)&&selectedIndex>=0&&selectedIndex<=5))
   ||typeof flagged!=='boolean')throw new Error('Invalid Mock answer request');
 const value=await rpc(db,'lms_p10_save_mock',{p_attempt_id:attemptId,
  p_question_id:questionId,p_selected_index:selectedIndex,p_flagged:flagged});
 if(value?.saved!==true||!Number.isFinite(Date.parse(value.serverNow||'')))
  throw new Error('The server did not acknowledge this Mock answer');
 return value;
}
export const submitOfficialMock=async(db,id)=>
 validateMockPayload(await rpc(db,'lms_p10_submit_mock',{p_attempt_id:id}));
export async function abandonOfficialMock(db,id){
 const result=await rpc(db,'lms_p10_abandon_mock',{p_attempt_id:id});
 if(result?.closed!==true||result?.attemptId!==id)
  throw new Error('The server has not confirmed Mock closure');
 return result;
}
export function officialMockSecondsLeft(payload,now=Date.now()){
 const serverNow=Date.parse(payload?.serverNow||''),deadline=Date.parse(payload?.deadlineAt||'');
 if(!Number.isFinite(serverNow)||!Number.isFinite(deadline))return 0;
 const observed=payload.observedAtEpoch??now;
 return Math.max(0,Math.ceil((deadline-serverNow-(now-observed))/1000));
}
