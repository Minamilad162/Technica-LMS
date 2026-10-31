// RLS-gated, SECURITY DEFINER RPC: never exposes a complete answer bank.
// User identity comes from Supabase Auth JWT, not user input.
async function rpc(db,name,args) {
  const {data,error}=await db.rpc(name,args);
  if(error)throw new Error(error.message||'Practice request failed');
  return data;
}
export const startSecurePractice=(db,{courseId,mode,count,domainId=null,durationSeconds=0,requestId})=>
  rpc(db,'lms_p4_start_practice',{
    p_course_id:courseId,p_mode:mode,p_count:count,p_request_id:requestId,
    p_domain_id:domainId,p_duration_seconds:durationSeconds
  });
export const getSecurePractice=(db,attemptId)=>
  rpc(db,'lms_p4_attempt_payload',{p_attempt:attemptId});
export const answerSecurePractice=(db,attemptId,questionId,selectedIndex)=>
  rpc(db,'lms_p4_save_answer',{p_attempt_id:attemptId,p_question_id:questionId,p_selected_index:selectedIndex});
export const finishSecurePractice=(db,attemptId)=>
  rpc(db,'lms_p4_finish_practice',{p_attempt_id:attemptId});

export function safeRemainingSeconds(attempt,clock=Date.now()) {
  if(!attempt?.deadlineAt)return null;
  const serverNow=Date.parse(attempt.serverNow||'');
  const deadline=Date.parse(attempt.deadlineAt||'');
  if(!Number.isFinite(serverNow)||!Number.isFinite(deadline))return null;
  // Caller may attach observedAtEpoch when first receiving backend response;
  // elapsed time uses local monotonic-style Date delta but server sets deadline.
  const observedAt=attempt.observedAtEpoch??clock;
  const remaining=Math.ceil((deadline-serverNow-(clock-observedAt))/1000);
  return Math.max(0,remaining);
}
export const practiceSessionKey=(userId,courseId)=>`technica-live-practice:${userId}:${courseId}`;
