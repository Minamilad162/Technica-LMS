/**
 * Technica LMS P8 adaptive policy.
 *
 * A checkpoint uses 20% of the REQUESTED session length, at least 3 items.
 * Promotion requires >=70% cumulative correctness within the current tier.
 * Check again after every answered item once that checkpoint is reached.
 * Stages are monotone: LOW -> MEDIUM -> HIGH, never downshift.
 * The official exclusive Mock is NOT adaptive and is NEVER mixed here.
 *
 * IMPORTANT: JS is a testable policy specification, not a grading authority.
 * The matched PostgreSQL P8 RPC re-computes all counters from private answers.
 */
export const ADAPTIVE_TIERS=Object.freeze(['low','medium','high']);
export function adaptiveCheckpoint(total){
 if(!Number.isInteger(total)||total<1||total>50)throw new RangeError('Adaptive session must contain 1–50 questions');
 return Math.min(total,Math.max(3,Math.ceil(total/5)));
}
export function adaptivePasses(correct,attempted,checkpoint){
 if(!Number.isInteger(correct)||!Number.isInteger(attempted)||!Number.isInteger(checkpoint)||
  correct<0||attempted<0||correct>attempted||checkpoint<1)return false;
 return attempted>=checkpoint&&correct*10>=attempted*7;
}
export function nextAdaptiveTier(tier,correct,attempted,total){
 if(!ADAPTIVE_TIERS.includes(tier))throw new Error('Unknown adaptive tier');
 if(tier==='high'||!adaptivePasses(correct,attempted,adaptiveCheckpoint(total)))return tier;
 return tier==='low'?'medium':'high';
}
export function adaptivePreview(total,{accuracy=1}={}){
 const checkpoint=adaptiveCheckpoint(total);
 const correct=Math.round(Math.min(1,Math.max(0,accuracy))*checkpoint);
 const first=nextAdaptiveTier('low',correct,checkpoint,total);
 const second=first==='medium'?nextAdaptiveTier('medium',correct,checkpoint,total):null;
 return {total,checkpoint,threshold:70,first,second};
}
