import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptiveCheckpoint,adaptiveMediumCheckpoint,adaptiveTierTargets,adaptivePasses,adaptiveRequiredCorrect,nextAdaptiveTier,ADAPTIVE_POLICY_VERSION} from '../src/production/adaptivePolicy.js';
import {progressForLesson,mayReadLiveCourse} from '../src/production/liveLearningApi.js';
import {getAdaptiveReadiness} from '../src/production/practiceApi.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const [size,low,medium,high] of [
 [1,1,0,0],[2,1,1,0],[3,1,1,1],[4,1,1,2],[5,1,2,2],
 [10,3,3,4],[15,5,5,5],[20,6,7,7],[25,8,8,9],
 [30,10,10,10],[50,16,17,17]
]){
 assert.deepEqual(adaptiveTierTargets(size),{low,medium,high},
  'Balanced thirds for '+size);
 assert.equal(adaptiveCheckpoint(size),low,'Low checkpoint for '+size);
 assert.equal(adaptiveMediumCheckpoint(size),Math.max(1,medium),
  'Medium checkpoint for '+size);
 assert.equal(low+medium+high,size,'Exactly N questions in ideal session');
}
assert.equal(ADAPTIVE_POLICY_VERSION,'thirds-fixed-correct-v2');
assert.equal(adaptiveRequiredCorrect(10),7);
assert.equal(adaptiveRequiredCorrect(8),6);
assert.equal(adaptiveRequiredCorrect(17),12);
assert.throws(()=>adaptiveCheckpoint(0));
assert.throws(()=>adaptiveCheckpoint(51));
for(const size of [10,25,30,50]){
 const check=adaptiveCheckpoint(size),pass=Math.ceil(check*0.7);
 const middle=adaptiveMediumCheckpoint(size),middlePass=Math.ceil(middle*0.7);
 assert.equal(nextAdaptiveTier('low',pass,check,size),'medium','Low promotes at 70%');
 assert.equal(nextAdaptiveTier('medium',middlePass,middle,size),'high','Medium promotes at 70% after its OWN minimum');
 assert.equal(nextAdaptiveTier('high',check,check,size),'high','High never exceeds High');
 assert.equal(nextAdaptiveTier('low',pass-1,check,size),'low','Below 70% remains Low');
 assert.equal(nextAdaptiveTier('low',pass,check-1,size),'low','Cannot promote before proportional checkpoint');
}
assert.equal(nextAdaptiveTier('low',5,10,25),'low');
assert.equal(nextAdaptiveTier('low',6,10,25),'medium','6 correct unlocks base-8 tier even after ten tries');
assert.equal(nextAdaptiveTier('low',7,10,25),'medium');
assert.equal(nextAdaptiveTier('low',12,30,50),'medium','12 correct meets 70% of base 16, extra questions do not raise target');
assert.equal(nextAdaptiveTier('low',11,30,50),'low');
assert.equal(nextAdaptiveTier('low',6,10,30),'low','6/10 Low must stay Low');
assert.equal(nextAdaptiveTier('low',7,10,30),'medium','7/10 Low promotes only after ten');
assert.equal(nextAdaptiveTier('low',7,9,30),'low','Even 7/9 cannot skip first 10');
assert.equal(nextAdaptiveTier('low',6,11,30),'low','6 correct is still less than fixed 7 target');
assert.equal(nextAdaptiveTier('low',7,11,30),'medium','6/10 plus one correct => promote at 7/11');
assert.equal(nextAdaptiveTier('low',7,12,30),'medium','Extra wrong attempts never raise the original 7-correct target');
assert.equal(nextAdaptiveTier('low',10,14,30),'medium','Additional correct answers also qualify');
assert.equal(nextAdaptiveTier('medium',6,10,30),'medium','6/10 Medium stays Medium');
assert.equal(nextAdaptiveTier('medium',7,10,30),'high','7/10 Medium promotes to High');
assert.equal(nextAdaptiveTier('medium',7,11,30),'high','6/10 Medium plus one correct promotes to High');
assert.equal(nextAdaptiveTier('medium',7,9,30),'medium','No promotion before ten Medium questions');
assert.equal(nextAdaptiveTier('medium',12,16,50),'medium','Medium gate for 50 is 17');
assert.equal(nextAdaptiveTier('medium',13,17,50),'high','Medium 13/17 passes 70%');
assert.equal(adaptivePasses(7,11,10),true,'Denominator locked to original ten');
assert.equal(adaptivePasses(6,11,10),false);
assert.equal(adaptivePasses(0,0,3),false);
assert.equal(adaptivePasses(10,9,3),false);
assert.throws(()=>nextAdaptiveTier('superhard',1,1,10));

const serverReady={ready:true,low:30,medium:35,high:50,
 requiredPerTier:30,checkpoint:10,mediumCheckpoint:10,thresholdPercent:70,
 policyVersion:'thirds-fixed-correct-v2',lowRequiredCorrect:7,mediumRequiredCorrect:7};
const authDB={rpc:async(name,args)=>{
 assert.equal(name,'lms_p8_levelup_readiness');
 assert.equal(args.p_count,30);
 return {data:serverReady,error:null};
}};
const validated=await getAdaptiveReadiness(authDB,'real-asp',30,null);
assert.equal(validated.checkpoint,10);
assert.equal(validated.mediumCheckpoint,10);
assert.equal(validated.ready,true);
assert.equal(validated.lowRequiredCorrect,7);
assert.equal(validated.mediumRequiredCorrect,7);
await assert.rejects(()=>getAdaptiveReadiness({rpc:async()=>({
 data:{...serverReady,policyVersion:'thirds-v1',checkpoint:6,mediumCheckpoint:6},
 error:null})},'real-asp',30),/outdated/,'Old 20% RPC must fail closed');
await assert.rejects(()=>getAdaptiveReadiness({rpc:async()=>({
 data:{...serverReady,ready:true,low:9},error:null
})},'real-asp',30),/outdated/,'Insufficient real pool must fail closed');
await assert.rejects(()=>getAdaptiveReadiness({rpc:async()=>({
 data:{...serverReady,mediumCheckpoint:9},error:null
})},'real-asp',30),/outdated/,'Server Medium gate cannot silently change');
await assert.rejects(()=>getAdaptiveReadiness({rpc:async()=>({
 data:{...serverReady,thresholdPercent:60},error:null
})},'real-asp',30),/outdated/,'70% cannot be weakened');
await assert.rejects(()=>getAdaptiveReadiness({rpc:async()=>({
 data:{...serverReady,lowRequiredCorrect:8},error:null
})},'real-asp',30),/outdated/,'Correct-answer target cannot increase with extras');

const fixedSql=read('supabase/migrations/202611040004_p8e_fixed_correct_target.sql');
for(const marker of [
 "ADD COLUMN promotion_policy text NULL",
 "s.promotion_policy='thirds-fixed-correct-v2'",
 "s.promotion_policy IS NULL",
 "v_tier_correct*10 >= (CASE",
 "ELSE s.checkpoint_size END)*7",
 "v_tier_correct*10>=v_tier_attempted*7",
 "'policyVersion','thirds-fixed-correct-v2'",
 "'lowRequiredCorrect'",
 "'mediumRequiredCorrect'",
 "IF v_answered<a.question_count",
 "AND NOT x.mock_exclusive",
 "i.position <> s.answered_count+1",
 "SECURITY DEFINER SET search_path=''"
])assert(fixedSql.includes(marker),'P8e fixed-base server promotion contract missing: '+marker);
assert(!/UPDATE public\\.lms_questions|INSERT INTO public\\.lms_questions|DELETE FROM public\\.lms_questions/.test(fixedSql),
 'P8e must not modify ASP question bank content');
assert(!fixedSql.includes('UPDATE public.lms_practice_adaptive_state SET promotion_policy'),
 'P8e must not change promotion rules of in-flight attempts');

const course={id:'real-course-uuid'},catalog={
 identity:{isAdmin:false},entitlements:[{course_id:'real-course-uuid',status:'active'}]
};
assert.equal(mayReadLiveCourse(catalog,course),true);
assert.equal(mayReadLiveCourse({...catalog,entitlements:[]},course),false);
assert.equal(mayReadLiveCourse({...catalog,identity:{isAdmin:true},entitlements:[]},course),true);
assert.equal(progressForLesson([{lesson_id:'a',lesson_completed_at:null}], 'a').lesson_completed_at,null);
assert.equal(progressForLesson([{lesson_id:'a',lesson_completed_at:'2026-11-04'}],'a').lesson_completed_at,'2026-11-04');
assert.equal(progressForLesson([],'a'),null);

const migration=read('supabase/migrations/202611040001_p8_adaptive_levelup.sql');
const api=read('src/production/practiceApi.js'),live=read('src/production/LivePractice.jsx');
const route=read('src/App.jsx'),portal=read('src/production/LivePracticePortal.jsx');
const learning=read('src/production/LiveLearning.jsx');
for(const pattern of [
 "to_regprocedure('public.lms_p5_abandon_practice(uuid)')",
 "ADD CONSTRAINT lms_practice_attempts_mode_check",
 "CREATE TABLE public.lms_practice_adaptive_state",
 "ENABLE ROW LEVEL SECURITY",
 "REVOKE ALL ON TABLE public.lms_practice_adaptive_state FROM PUBLIC,anon,authenticated",
 "CREATE FUNCTION public.lms_p8_checkpoint",
 "ceil(p_count/5.0)",
 "v_tier_correct*10>=v_tier_attempted*7",
 "approved' AND NOT mock_exclusive",
 "NOT EXISTS(",
 "i.position <> s.answered_count+1",
 "i.answered_at IS NOT NULL",
 "Adaptive answer is immutable",
 "public.lms_p4_attempt_payload(a.id)",
 "Adaptive answers require the protected Level Up RPC",
 "Answer all adaptive questions before finishing"
])assert(migration.includes(pattern),'P8 server policy missing: '+pattern);
assert(!migration.includes('GRANT SELECT ON TABLE public.lms_questions TO authenticated'));
assert(!migration.includes('INSERT INTO public.lms_questions'),'Migration must not auto-import questions');
assert(!migration.includes("difficulty='unclassified'"),'Unclassified must never be eligible for adaptive selection');
const delta=read('supabase/migrations/202611040003_p8d_adaptive_thirds.sql');
for(const marker of [
 "public.lms_p8_medium_checkpoint(p_count)",
 "ADD COLUMN medium_checkpoint_size integer",
 "coalesce(s.medium_checkpoint_size,s.checkpoint_size)",
 "public.lms_p8_checkpoint(p_count)",
 "'mediumCheckpoint',public.lms_p8_medium_checkpoint(p_count)",
 "'policyVersion','thirds-v1'",
 "v_tier_correct*10>=v_tier_attempted*7",
 "IF v_answered<a.question_count",
 "NOT x.mock_exclusive",
 "SECURITY DEFINER SET search_path=''"
])assert(delta.includes(marker),'P8d third-based backend missing: '+marker);
assert(!delta.includes('UPDATE public.lms_questions'),'P8d must never reclassify existing bank');
assert(delta.includes("coalesce(s.medium_checkpoint_size,s.checkpoint_size)"),
 'Old stored tier gate must be preserved; actual in-flight rows are checked in disposable PostgreSQL');
assert(!delta.includes('INSERT INTO public.lms_questions'),'P8d must never import bank');
assert(delta.includes("s.medium_checkpoint_size,s.checkpoint_size"),
 'In-flight attempts without medium checkpoint must keep their original P8 gate');
assert(api.includes("lms_p8_levelup_readiness")&&api.includes("lms_p8_start_levelup")&&api.includes("lms_p8_answer_levelup"));
assert(live.includes("mode==='levelup'?await startAdaptivePractice"),'Start must be server-selected');
assert(live.includes("await answerAdaptivePractice"),'Answer and progression must be server-owned');
assert(live.includes('setSelected(Math.max(0,(reply.questions?.length||1)-1))'),'Advance to new server-assigned item');
assert(live.includes("readiness?.ready"),'No start before verified 3-tier readiness');
assert(!live.includes('nextAdaptiveTier'),'Client cannot grade or pick next difficulty');
assert(route.includes('<LiveLearnerPortal initialScreen="learning"/>')&&route.includes('<LiveLearningCourse/>'),'Default learner library must use real Supabase P15 and preserve secure deep-linked courses');
assert(route.includes('<LivePracticePortal/>'),'Secure Practice link must route into server engine');
assert(read('src/production/LivePracticePortal.jsx').includes('defaultMode={requestedMode}'),'Deep link must choose real Level Up mode');
assert(read('src/pages/PracticePage.jsx').includes('mode=levelup&course='),'Quick Level Up must navigate to secure P8 course');
assert(read('src/lib/practiceModes.js').includes("icon:'TrendingUp',status:'server'"),'Level Up must be selectable but never run the demo bank');
assert(read('supabase/P8_VERIFY_READ_ONLY.sql').includes('P8_COURSE_READINESS'),'Owner-run post migration audit must be present');
assert(portal.includes('mayReadLiveCourse')&&portal.includes("['paid','manual']"),'Only authorized learning and paid/manual Practice');
assert(read('src/production/liveLearningApi.js').includes('lms_lesson_progress'),'Learner completion must be verified P2 DB records');
assert(!learning.includes("update({reading_completed:true}"),'No browser-synthesized progress');
assert(!learning.includes('localStorage'),'Live learner library must not read demo/browser progress');
console.log('PASS P8e fixed 70% of ORIGINAL tier (7/10 then 7/11), protected server-only 30-question Practice and old-session preservation contract.');
