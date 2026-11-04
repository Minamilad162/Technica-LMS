// P8c: verified Admin-only read-only pool diagnostics via the SAME P8
// SECURITY DEFINER readiness RPC used by learners. Never browser-query the
// protected question table and never infer approval from P6A review status.
import {adaptiveCheckpoint,adaptiveMediumCheckpoint,adaptiveRequiredCorrect,ADAPTIVE_POLICY_VERSION} from './adaptivePolicy.js';
import {getAdaptiveReadiness} from './practiceApi.js';

export const ADMIN_ADAPTIVE_COUNTS=Object.freeze([10,25,30,50]);

export function normalizeAdaptiveReadiness(payload,count){
 const n=Number(count);
 if(!ADMIN_ADAPTIVE_COUNTS.includes(n)||!payload||typeof payload!=='object')
  throw new Error('Unexpected Level Up readiness response.');
 const low=Number(payload.low),medium=Number(payload.medium),high=Number(payload.high);
 const values=[low,medium,high];
 if(!values.every(value=>Number.isSafeInteger(value)&&value>=0)
    ||payload.requiredPerTier!==n
    ||payload.thresholdPercent!==70
    ||payload.checkpoint!==adaptiveCheckpoint(n)
    ||payload.mediumCheckpoint!==adaptiveMediumCheckpoint(n)
    ||payload.lowRequiredCorrect!==adaptiveRequiredCorrect(payload.checkpoint)
    ||payload.mediumRequiredCorrect!==adaptiveRequiredCorrect(payload.mediumCheckpoint)
    ||payload.policyVersion!==ADAPTIVE_POLICY_VERSION
    ||typeof payload.ready!=='boolean'
    ||payload.ready!==values.every(value=>value>=n))
  throw new Error('Level Up readiness response failed validation; do not start a session.');
 // Return a deliberately whitelisted shape: never pass through question text,
 // answers, JWT, user information or unknown future RPC fields.
 return {count:n,low,medium,high,ready:payload.ready,
  checkpoint:payload.checkpoint,mediumCheckpoint:payload.mediumCheckpoint,
  lowRequiredCorrect:payload.lowRequiredCorrect,mediumRequiredCorrect:payload.mediumRequiredCorrect};
}

export async function fetchAdminAdaptiveReadiness(db,courseId,domainId=null){
 if(!db||!courseId)throw new Error('Select a verified course first.');
 const results=await Promise.all(ADMIN_ADAPTIVE_COUNTS.map(count=>
  getAdaptiveReadiness(db,courseId,count,domainId)
 ));
 return results.map((response,index)=>normalizeAdaptiveReadiness(response,ADMIN_ADAPTIVE_COUNTS[index]));
}
