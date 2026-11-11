// P71: Course Mock uses saved Question Bank flags with a fixed-200 gate.
// P9B/P10 historical ASP reserved forms and all answer keys remain protected.
import {officialMockSecondsLeft} from './mockApi.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function rpc(db,name,args){
 if(!db||typeof db.rpc!=='function')throw Error('Verified Supabase login required.');
 const {data,error}=await db.rpc(name,args);
 if(error)throw Error(error.message||'Selected Mock unavailable.');
 return data;
}
export function validateSelectedMockReadiness(x){
 const fixed=x?.engineVersion==='p71-fixed-bank-mock-v1';
 const legacy=x?.engineVersion==='p34b-selected-mock-v1';
 if(!x||(!legacy&&!fixed)
  ||x.durationSeconds!==18000||x.maxPerAttempt!==200
  ||x.officialMockUnchanged!==true||typeof x.ready!=='boolean'
  ||!Number.isSafeInteger(x.selectedCount)||x.selectedCount<0
  ||x.deliveredCount!==Math.min(x.selectedCount,200)
  ||x.ready!==(fixed?x.selectedCount===200:x.selectedCount>0)
  ||(fixed&&(x.requiredCount!==200||x.source!=='question_bank_mock_flags')))
  throw Error('Mock Exam configuration does not match the secure Course Question Bank.');
 // Legacy P34B still provides accurate count-only display, but cannot
 // start variable-size Mock attempts through the new fixed-200 learner UI.
 return {...x,ready:fixed&&x.ready,engineUpgradePending:legacy,requiredCount:200};
}
export async function getSelectedMockReadiness(db,courseId){
 if(!uuid.test(courseId||''))throw Error('Select the actual Course.');
 return validateSelectedMockReadiness(await rpc(db,'lms_p34_selected_mock_readiness',{p_course_id:courseId}));
}
export function validateSelectedMockPayload(v){
 if(!v||v.mode!=='selected_mock'||!uuid.test(v.attemptId||'')
  ||!uuid.test(v.courseId||'')||v.durationSeconds!==18000
  ||!Number.isSafeInteger(v.questionCount)||v.questionCount<1||v.questionCount>200
  ||!['in_progress','submitted','expired','abandoned'].includes(v.state)
  ||!Number.isSafeInteger(v.answeredCount)||v.answeredCount<0||v.answeredCount>v.questionCount
  ||!Number.isSafeInteger(v.flaggedCount)||v.flaggedCount<0||v.flaggedCount>v.questionCount
  ||!Number.isFinite(Date.parse(v.startedAt||''))
  ||!Number.isFinite(Date.parse(v.deadlineAt||''))
  ||!Number.isFinite(Date.parse(v.serverNow||'')))
  throw Error('Invalid Selected Mock response.');
 if(Math.abs(Date.parse(v.deadlineAt)-Date.parse(v.startedAt)-18000000)>1)
  throw Error('Invalid Selected Mock server deadline.');
 if(!Array.isArray(v.questions))throw Error('Invalid Mock question payload.');
 if(v.state==='in_progress'){
  if(v.questionCount!==200||v.questions.length!==v.questionCount||v.correctCount!==null||v.scorePercent!==null)
   throw Error('Selected Mock answer keys leaked or question count mismatched.');
  const seen=new Set();
  for(let i=0;i<v.questionCount;i++){
   const q=v.questions[i];
   if(!q||!uuid.test(q.id||'')||seen.has(q.id)||q.position!==i+1
    ||typeof q.prompt!=='string'||!Array.isArray(q.options)
    ||q.options.length<2||q.options.length>6
    ||q.options.some(o=>typeof o!=='string')
    ||typeof q.flagged!=='boolean'
    ||q.selectedIndex!==null&&(!Number.isInteger(q.selectedIndex)
      ||q.selectedIndex<0||q.selectedIndex>=q.options.length)
    ||['correct_index','correctIndex','correct_index_snapshot','explanation','reference_text'].some(k=>k in q))
    throw Error('Mock questions are invalid or reveal answer keys.');
   seen.add(q.id);
  }
  if(v.questions.filter(q=>q.selectedIndex!==null).length!==v.answeredCount
    ||v.questions.filter(q=>q.flagged).length!==v.flaggedCount)
    throw Error('Selected Mock count mismatch.');
 }else{
  if(v.questions.length!==0)throw Error('Closed Mock cannot expose question text.');
  if(v.state==='abandoned'){
   if(v.correctCount!==null||v.scorePercent!==null)
    throw Error('Abandoned attempt cannot have an answer grade.');
  }else if(!Number.isInteger(v.correctCount)||v.correctCount<0
    ||v.correctCount>v.questionCount||typeof v.scorePercent!=='number'
    ||Math.abs(v.scorePercent-v.correctCount*100/v.questionCount)>0.02)
    throw Error('Invalid server Mock grade.');
 }
 return v;
}
export async function startSelectedMock(db,courseId,requestId){
 if(!uuid.test(courseId||'')||!uuid.test(requestId||''))
  throw Error('Course and request IDs required.');
 const readiness=await getSelectedMockReadiness(db,courseId);
 if(!readiness.ready)throw Error('Exactly 200 saved Mock questions and the fixed-200 server gate are required.');
 return validateSelectedMockPayload(await rpc(db,'lms_p34_start_selected_mock',
  {p_course_id:courseId,p_request_id:requestId}));
}
export const getSelectedMock=async(db,id)=>
 validateSelectedMockPayload(await rpc(db,'lms_p34_selected_mock_payload',{p_attempt_id:id}));
export async function saveSelectedMock(db,attemptId,questionId,selectedIndex,flagged){
 if(!uuid.test(attemptId||'')||!uuid.test(questionId||'')
  ||!(selectedIndex===null||Number.isInteger(selectedIndex)&&selectedIndex>=0&&selectedIndex<=5)
  ||typeof flagged!=='boolean')throw Error('Invalid Mock answer selection.');
 const result=await rpc(db,'lms_p34_save_selected_mock',{
  p_attempt_id:attemptId,p_question_id:questionId,
  p_selected_index:selectedIndex,p_flagged:flagged});
 if(result?.saved!==true||!Number.isFinite(Date.parse(result.serverNow||'')))
  throw Error('The server did not save the selected Mock answer.');
 return result;
}
export const submitSelectedMock=async(db,id)=>
 validateSelectedMockPayload(await rpc(db,'lms_p34_submit_selected_mock',{p_attempt_id:id}));
export async function abandonSelectedMock(db,id){
 if(!uuid.test(id||''))throw Error('Invalid attempt ID.');
 const result=await rpc(db,'lms_p34_abandon_selected_mock',{p_attempt_id:id});
 if(result?.closed!==true||result.attemptId!==id)
  throw Error('The server did not confirm closure of selected Mock.');
 return result;
}
export const selectedMockSecondsLeft=officialMockSecondsLeft;
