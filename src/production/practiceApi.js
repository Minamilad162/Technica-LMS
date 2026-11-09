import {ADAPTIVE_POLICY_VERSION,adaptiveCheckpoint,adaptiveMediumCheckpoint,adaptiveRequiredCorrect} from './adaptivePolicy.js';
// RLS-gated, SECURITY DEFINER RPC: never exposes a complete answer bank.
// User identity comes from Supabase Auth JWT, not user input.
// P47: distinguish an uninstalled backend from an empty, unapproved question pool.
// Return safe, actionable copy without exposing answers, question text or private IDs.
export function practiceErrorMessage(name,error){
 const raw=String(error?.message||'Practice request failed');
 const code=String(error?.code||'');
 if(name==='lms_p44_start_custom'&&
   (code==='PGRST202'||code==='42883'||
    (/lms_p44_start_custom/i.test(raw)&&
     /schema cache|could not find|not found|does not exist/i.test(raw))))
  return 'Build Your Own is not activated in the learning database yet. An administrator needs to verify the P44 server setup; if the function is installed, refresh the API schema.';
 const shortage=raw.match(/Not enough approved (?:non-mock|Practice) questions:\s*(\d+)\s*(?:eligible|available),\s*(\d+)\s*requested/i)
  ||raw.match(/Not enough approved questions at selected difficulty:\s*(\d+)\s*available,\s*(\d+)\s*requested/i);
 if(shortage){
  const available=Number(shortage[1]),requested=Number(shortage[2]);
  return available===0
   ?'This course currently has 0 approved Practice questions. An administrator must review and approve active, non-Mock questions before a session can start.'
   :'Only '+available+' approved Practice questions are available for these settings, but '+requested+' were requested. Choose fewer questions or ask your administrator to approve more non-Mock questions.';
 }
 return raw;
}
async function rpc(db,name,args) {
 const {data,error}=await db.rpc(name,args);
 if(error)throw new Error(practiceErrorMessage(name,error));
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
// Guard against an old (20%-gate) P8 function still installed in Supabase.
// The UI must NEVER start a new session until the P8d third-based policy is
// verifiably deployed. A signed readiness RPC is aggregate-only, no keys.
export function validateAdaptiveReadiness(payload,count){
 const n=Number(count);
 if(!Number.isInteger(n)||n<1||n>50||!payload||typeof payload!=='object')
  throw new Error('Invalid adaptive readiness request.');
 const {low,medium,high,ready,requiredPerTier,checkpoint,mediumCheckpoint,
  lowRequiredCorrect,mediumRequiredCorrect,thresholdPercent,policyVersion}=payload;
 if(![low,medium,high].every(value=>Number.isSafeInteger(value)&&value>=0)
   ||typeof ready!=='boolean'||requiredPerTier!==n
   ||checkpoint!==adaptiveCheckpoint(n)||mediumCheckpoint!==adaptiveMediumCheckpoint(n)
   ||lowRequiredCorrect!==adaptiveRequiredCorrect(checkpoint)
   ||mediumRequiredCorrect!==adaptiveRequiredCorrect(mediumCheckpoint)
   ||thresholdPercent!==70||policyVersion!==ADAPTIVE_POLICY_VERSION
   ||ready!==[low,medium,high].every(value=>value>=n))
  throw new Error('Level Up server policy is outdated or bank readiness is inconsistent. Confirm the separately approved P8e fixed-correct migration before new sessions.');
 return {low,medium,high,ready,requiredPerTier:n,checkpoint,mediumCheckpoint,
  lowRequiredCorrect,mediumRequiredCorrect,thresholdPercent:70,policyVersion:ADAPTIVE_POLICY_VERSION};
}
export const getAdaptiveReadiness=async(db,courseId,count,domainId=null)=>
 validateAdaptiveReadiness(await rpc(db,'lms_p8_levelup_readiness',{
  p_course_id:courseId,p_count:count,p_domain_id:domainId
 }),count);
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

// P44 configurable Practice. The ONLY start/answer/advance path for the new
// 1..100-question Build Your Own; never silently fall back to P4 custom.
export const startConfiguredPractice=(db,{courseId,count,requestId,durationSeconds=0,
 perQuestionSeconds=0,difficulty='mixed',feedbackTiming='end',camera=false,domainId=null})=>
 rpc(db,'lms_p44_start_custom',{
  p_course_id:courseId,p_count:count,p_request_id:requestId,
  p_duration_seconds:durationSeconds,p_per_question_seconds:perQuestionSeconds,
  p_difficulty:difficulty,p_feedback:feedbackTiming,p_camera:camera,p_domain_id:domainId
 });
export const answerConfiguredPractice=(db,attemptId,questionId,selectedIndex)=>
 rpc(db,'lms_p44_answer',{
  p_attempt_id:attemptId,p_question_id:questionId,p_selected_index:selectedIndex
 });
export const nextConfiguredPractice=(db,attemptId)=>
 rpc(db,'lms_p44_next',{p_attempt_id:attemptId});

// P56: a single audited, securely graded session that samples across all
// eligible courses; never download a merged bank into the browser.
export const getAllCoursesAdaptiveReadiness=async(db,count)=>
 validateAdaptiveReadiness(await rpc(db,'lms_p56_all_readiness',{p_count:count}),count);
export const startAllCoursesPractice=(db,{mode,count,requestId,durationSeconds=0})=>
 rpc(db,'lms_p56_start_all',{p_mode:mode,p_count:count,p_request_id:requestId,
 p_duration_seconds:durationSeconds,p_per_question_seconds:0,p_difficulty:'mixed',
 p_feedback:'end',p_camera:false});
export const startAllCoursesConfiguredPractice=(db,{count,requestId,durationSeconds=0,
 perQuestionSeconds=0,difficulty='mixed',feedbackTiming='end',camera=false})=>
 rpc(db,'lms_p56_start_all',{p_mode:'custom',p_count:count,p_request_id:requestId,
 p_duration_seconds:durationSeconds,p_per_question_seconds:perQuestionSeconds,
 p_difficulty:difficulty,p_feedback:feedbackTiming,p_camera:camera});
