import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptiveCheckpoint,adaptivePasses,nextAdaptiveTier} from '../src/production/adaptivePolicy.js';
import {progressForLesson,mayReadLiveCourse} from '../src/production/liveLearningApi.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const [size,checkpoint] of [[1,1],[2,2],[5,3],[10,3],[15,3],[20,4],[25,5],[30,6],[50,10]]){
 assert.equal(adaptiveCheckpoint(size),checkpoint,'Proportional checkpoint for '+size);
}
assert.throws(()=>adaptiveCheckpoint(0));
assert.throws(()=>adaptiveCheckpoint(51));
for(const size of [10,25,50]){
 const check=adaptiveCheckpoint(size),pass=Math.ceil(check*0.7);
 assert.equal(nextAdaptiveTier('low',pass,check,size),'medium','Low promotes at 70%');
 assert.equal(nextAdaptiveTier('medium',pass,check,size),'high','Medium promotes at 70%');
 assert.equal(nextAdaptiveTier('high',check,check,size),'high','High never exceeds High');
 assert.equal(nextAdaptiveTier('low',pass-1,check,size),'low','Below 70% remains Low');
 assert.equal(nextAdaptiveTier('low',pass,check-1,size),'low','Cannot promote before proportional checkpoint');
}
assert.equal(nextAdaptiveTier('low',6,10,25),'low');
assert.equal(nextAdaptiveTier('low',7,10,25),'medium');
assert.equal(nextAdaptiveTier('low',21,30,50),'medium','Cumulative recovery after mistakes must allow promotion');
assert.equal(nextAdaptiveTier('low',20,30,50),'low');
assert.equal(adaptivePasses(0,0,3),false);
assert.equal(adaptivePasses(10,9,3),false);
assert.throws(()=>nextAdaptiveTier('superhard',1,1,10));

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
assert(api.includes("lms_p8_levelup_readiness")&&api.includes("lms_p8_start_levelup")&&api.includes("lms_p8_answer_levelup"));
assert(live.includes("mode==='levelup'?await startAdaptivePractice"),'Start must be server-selected');
assert(live.includes("await answerAdaptivePractice"),'Answer and progression must be server-owned');
assert(live.includes('setSelected(Math.max(0,(reply.questions?.length||1)-1))'),'Advance to new server-assigned item');
assert(live.includes("readiness?.ready"),'No start before verified 3-tier readiness');
assert(!live.includes('nextAdaptiveTier'),'Client cannot grade or pick next difficulty');
assert(route.includes('<LiveLearningLibrary/>')&&route.includes('<LiveLearningCourse/>'),'Default learning must be real Supabase');
assert(route.includes('<LivePracticePortal/>'),'Secure Practice link must route into server engine');
assert(portal.includes('mayReadLiveCourse')&&portal.includes("['paid','manual']"),'Only authorized learning and paid/manual Practice');
assert(read('src/production/liveLearningApi.js').includes('lms_lesson_progress'),'Learner completion must be verified P2 DB records');
assert(!learning.includes("update({reading_completed:true}"),'No browser-synthesized progress');
assert(!learning.includes('localStorage'),'Live learner library must not read demo/browser progress');
console.log('PASS P8 proportional adaptive 10/25/50 checkpoints and 70% monotone tiers; secured next-question RPC contract; real, RLS-gated learner library.');
