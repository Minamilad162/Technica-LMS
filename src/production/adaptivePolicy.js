/**
 * Secure Live Practice Level Up policy (P8e — fixed CORRECT target).
 *
 * The user chooses N = 1..50 questions. For a perfect uninterrupted journey,
 * divide N into balanced thirds (e.g. 30 => 10/10/10; 10 => 3/3/4;
 * 25 => 8/8/9; 50 => 16/17/17). Each promotion gate is a MINIMUM number of
 * answered questions at that tier; it is not a hard quota. Promotion also
 * requires ceil(70% of that ORIGINAL tier minimum) correct answers, regardless
 * of the number of extra questions needed to reach the fixed correct target.
 * E.g. N=30 => 10 initial Low, 7 correct required. 6/10 + 1 correct
 * => 7/11 immediately promotes; the denominator NEVER becomes 11.
 * If not yet enough correct, keep drawing SAME-tier unique items until the
 * target is achieved or selected N is exhausted.
 *
 * The next question is selected and marked on the PostgreSQL server. This JS
 * is for read-only policy validation/tests, NEVER a client grading authority.
 * Formal 200-question/300-minute Mock and non-adaptive modes do not use it.
 */
export const ADAPTIVE_TIERS=Object.freeze(['low','medium','high']);
export const ADAPTIVE_POLICY_VERSION='thirds-fixed-correct-v2';

export function adaptiveTierTargets(total){
 if(!Number.isInteger(total)||total<1||total>50)
  throw new RangeError('Adaptive Practice session must contain 1–50 questions');
 const low=Math.max(1,Math.floor(total/3));
 const remainder=total-low;
 const medium=remainder>0?Math.max(1,Math.floor(remainder/2)):0;
 const high=total-low-medium;
 return {low,medium,high};
}
// Existing P8 callers use checkpoint for the LOW tier.
export function adaptiveCheckpoint(total){
 return adaptiveTierTargets(total).low;
}
// Medium may differ by one question when N does not divide evenly into thirds.
export function adaptiveMediumCheckpoint(total){
 return Math.max(1,adaptiveTierTargets(total).medium);
}
export function adaptiveRequiredCorrect(checkpoint){
 if(!Number.isSafeInteger(checkpoint)||checkpoint<1||checkpoint>50)
  throw new RangeError('Invalid base tier question count');
 return Math.ceil(checkpoint*7/10);
}
export function adaptivePasses(correct,attempted,checkpoint){
 if(!Number.isInteger(correct)||!Number.isInteger(attempted)||!Number.isInteger(checkpoint)||
  correct<0||attempted<0||correct>attempted||checkpoint<1)return false;
 return attempted>=checkpoint&&correct>=adaptiveRequiredCorrect(checkpoint);
}
export function nextAdaptiveTier(tier,correct,attempted,total){
 if(!ADAPTIVE_TIERS.includes(tier))throw new Error('Unknown adaptive tier');
 const check=tier==='medium'?adaptiveMediumCheckpoint(total):adaptiveCheckpoint(total);
 if(tier==='high'||!adaptivePasses(correct,attempted,check))return tier;
 return tier==='low'?'medium':'high';
}
export function adaptivePreview(total,{accuracy=1}={}){
 const targets=adaptiveTierTargets(total);
 const correctLow=Math.round(Math.min(1,Math.max(0,accuracy))*targets.low);
 const correctMedium=Math.round(Math.min(1,Math.max(0,accuracy))*adaptiveMediumCheckpoint(total));
 const first=nextAdaptiveTier('low',correctLow,targets.low,total);
 const second=first==='medium'?nextAdaptiveTier('medium',correctMedium,adaptiveMediumCheckpoint(total),total):null;
 return {total,checkpoint:targets.low,mediumCheckpoint:adaptiveMediumCheckpoint(total),
  lowRequiredCorrect:adaptiveRequiredCorrect(targets.low),
  mediumRequiredCorrect:adaptiveRequiredCorrect(adaptiveMediumCheckpoint(total)),
  targets,threshold:70,first,second};
}
