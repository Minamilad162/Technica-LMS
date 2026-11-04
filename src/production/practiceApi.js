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
// P8: Stageable adaptive server RPCs. Stage 1 readiness is read-only and
// returns counts, not correct choices. Start/answer only work after the owner
// installs the guarded P8 migration on an APPROVED environment.
export const getAdaptiveReadiness=(db,courseId,count,domainId=null)=>
  rpc(db,'lms_p8_levelup_readiness',{p_course_id:courseId,p_count:count,p_domain_id:domainId});
export const startAdaptivePractice=(db,{courseId,count,requestId,domainId=null,durationSeconds=0})=>
  rpc(db,'lms_p8_start_levelup',{
    p_course_id:courseId,p_count:count,p_request_id:requestId,
    p_domain_id:domainId,p_duration_seconds:durationSeconds
  });
export const answerAdaptivePractice=(db,attemptId,questionId,selectedIndex)=>
  rpc(db,'lms_p8_answer_levelup',{
    p_attempt_id:attemptId,p_question_id:questionId,p_selected_index:selectedIndex
  });
export const getSecurePractice=(db,attemptId)=>
  rpc(db,'lms_p4_attempt_payload',{p_attempt:attemptId});
export const answerSecurePractice=(db,attemptId,questionId,selectedIndex)=>
  rpc(db,'lms_p4_save_answer',{p_attempt_id:attemptId,p_question_id:questionId,p_selected_index:selectedIndex});
export const finishSecurePractice=(db,attemptId)=>
  rpc(db,'lms_p4_finish_practice',{p_attempt_id:attemptId});
export const abandonSecurePractice=(db,attemptId)=>
  rpc(db,'lms_p5_abandon_practice',{p_attempt_id:attemptId});

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
