import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILD_COUNTS,BUILD_DIFFICULTIES,BUILD_TIMER_MODES,
 DEFAULT_BUILD_YOUR_OWN,prepareBuildYourOwn,remainingQuestionSeconds}
 from '../src/production/buildYourOwnConfig.js';
import {startConfiguredPractice,answerConfiguredPractice,nextConfiguredPractice,practiceErrorMessage}
 from '../src/production/practiceApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.deepEqual(BUILD_COUNTS,[10,25,50,100]);
assert.deepEqual(BUILD_TIMER_MODES,['none','whole','question','both']);
assert.deepEqual(BUILD_DIFFICULTIES,['mixed','low','medium','high','adaptive']);
assert.equal(prepareBuildYourOwn({count:100}).count,100);
assert.equal(prepareBuildYourOwn({count:1}).count,1);
assert.throws(()=>prepareBuildYourOwn({count:101}),/1 to 100/);
assert.throws(()=>prepareBuildYourOwn({count:0}),/1 to 100/);
assert.throws(()=>prepareBuildYourOwn({count:4.5}),/1 to 100/);
assert.throws(()=>prepareBuildYourOwn({count:'abc'}),/1 to 100/);
assert.throws(()=>prepareBuildYourOwn({difficulty:'unclassified'}),/difficulty/);
assert.throws(()=>prepareBuildYourOwn({timerMode:'invalid'}),/timing/);
assert.throws(()=>prepareBuildYourOwn({feedbackTiming:'always'}),/answers/);
assert.throws(()=>prepareBuildYourOwn({camera:'yes'}),/[Cc]amera/);
assert.deepEqual(prepareBuildYourOwn({count:100,timerMode:'both',totalMinutes:180,
 secondsPerQuestion:90,difficulty:'adaptive',feedbackTiming:'each',camera:true,domainId:'d'}),
 {count:100,durationSeconds:10800,perQuestionSeconds:90,difficulty:'adaptive',
  feedbackTiming:'each',camera:true,domainId:'d'});
for(const [timerMode,total,per] of [
 ['none',0,0],['whole',120,0],['question',0,90],['both',120,90]]){
 const cfg=prepareBuildYourOwn({timerMode,totalMinutes:2,secondsPerQuestion:90});
 assert.equal(cfg.durationSeconds,total);
 assert.equal(cfg.perQuestionSeconds,per);
}
for(const x of [9,601])assert.throws(()=>prepareBuildYourOwn({
 timerMode:'question',secondsPerQuestion:x
}),/10 to 600/);
for(const x of [0,301])assert.throws(()=>prepareBuildYourOwn({
 timerMode:'whole',totalMinutes:x
}),/1 and 300/);
const now=Date.parse('2026-11-09T09:30:00Z');
assert.equal(remainingQuestionSeconds({serverNow:'2026-11-09T09:30:00Z',
 questionDeadlineAt:'2026-11-09T09:31:30Z',observedAtEpoch:now},now+1000),89);
assert.equal(remainingQuestionSeconds({serverNow:'2026-11-09T09:30:00Z',
 questionDeadlineAt:'2026-11-09T09:31:30Z',observedAtEpoch:now},now+91000),0);
assert.equal(remainingQuestionSeconds({},now),null);
const calls=[];
const db={rpc:async(name,args)=>{calls.push({name,args});return {data:{attemptId:'id'},error:null};}};
await startConfiguredPractice(db,{courseId:'course',count:100,requestId:'req',
 durationSeconds:18000,perQuestionSeconds:60,difficulty:'high',feedbackTiming:'end',
 camera:true,domainId:null});
await answerConfiguredPractice(db,'id','q',2);
await nextConfiguredPractice(db,'id');
assert.deepEqual(calls.map(c=>c.name),[
 'lms_p44_start_custom','lms_p44_answer','lms_p44_next'
]);
assert.deepEqual(calls[0].args,{
 p_course_id:'course',p_count:100,p_request_id:'req',p_duration_seconds:18000,
 p_per_question_seconds:60,p_difficulty:'high',p_feedback:'end',p_camera:true,p_domain_id:null
});
assert.equal(calls[1].args.p_selected_index,2);

// P47: a published frontend cannot install the separately governed P44 migration.
// Missing RPC and empty approved Practice bank must have different user-facing guidance.
const missingP44={code:'PGRST202',message:'Could not find the function public.lms_p44_start_custom(p_camera, p_count, p_course_id, p_difficulty, p_domain_id, p_duration_seconds, p_feedback, p_per_question_seconds, p_request_id) in the schema cache'};
assert.match(practiceErrorMessage('lms_p44_start_custom',missingP44),/P44 server setup/);
assert(!practiceErrorMessage('lms_p44_start_custom',missingP44).includes('public.lms_p44_start_custom('));
assert.match(practiceErrorMessage('lms_p44_start_custom',{code:'42883',message:'undefined function'}),/P44 server setup/);
assert.match(practiceErrorMessage('lms_p4_start_practice',
 {message:'Not enough approved non-mock questions: 0 eligible, 10 requested'}),/0 approved Practice questions/);
assert.match(practiceErrorMessage('lms_p44_start_custom',
 {message:'Not enough approved Practice questions: 0 available, 100 requested'}),/0 approved Practice questions/);
assert.match(practiceErrorMessage('lms_p44_start_custom',
 {message:'Not enough approved questions at selected difficulty: 7 available, 25 requested'}),/Only 7 approved Practice questions/);
assert.equal(practiceErrorMessage('lms_p44_start_custom',
 {message:'Session expired'}),'Session expired');
await assert.rejects(()=>startConfiguredPractice(
 {rpc:async()=>({data:null,error:missingP44})},
 {courseId:'course',count:10,requestId:'req'}
),/P44 server setup/);

const config=read('src/production/BuildYourOwnSettings.jsx');
const practice=read('src/production/LivePractice.jsx');
const live=read('src/production/LiveBuildYourOwn.jsx');
const sql=read('supabase/migrations/202611090001_p44_configured_build_your_own.sql');
const mock=read('src/production/LiveMockExam.jsx');
for(const t of ['Number of Questions','After each question','At the end (summary)',
 'No timer','Total time','Per question','Both','Mixed','Easy','Medium','Hard',
 'Adaptive','Camera preview','not recorded']){
 assert(config.includes(t),'Build settings missing '+t);
}
assert(practice.includes("mode==='custom'?<LiveBuildYourOwn"));
assert(practice.includes("setMode(p.id);setError('');setNotice('')"),'Switching Practice modes must clear stale Quick 10 errors');
assert(live.includes("setSettings(next);setError('');setNotice('')"),'Changing custom settings must clear stale backend errors');
assert(live.includes('useQuestionFullscreenGuard'));
assert(live.includes('requestQuestionFullscreen(rootRef.current)'));
assert(live.includes('abandonSecurePractice(db,target)'));
assert(live.includes('getUserMedia'));
assert(live.includes('track.stop()'));
assert(live.includes('startConfiguredPractice(db,'));
assert(live.includes('answerConfiguredPractice(db,'));
assert(live.includes('nextConfiguredPractice(db,'));
assert(live.includes('finishSecurePractice(db,'));
assert(live.includes('setFeedback(old=>')&&live.includes('feedback[current?.id]'),
 'Per-question server feedback must remain usable without an explanatory note');
assert(!live.includes('correct_index_snapshot'),'Answer keys must be delivered only by server payload/RPC');
assert(!live.includes('../data/'),'No bundled/demo question bank');
assert(sql.includes('BETWEEN 1 AND CASE WHEN mode=\'custom\' THEN 100 ELSE 50 END'));
assert(sql.includes('position BETWEEN 1 AND 100'));
assert(sql.includes("p_difficulty='adaptive'"));
assert(sql.includes("v_correct*10>=v_needed*7"));
assert(sql.includes("AND NOT q.mock_exclusive AND NOT q.mock_candidate"));
assert(sql.includes('AND NOT x.mock_exclusive AND NOT x.mock_candidate'));
assert(sql.includes("feedback_timing IN ('each','end')"));
assert(sql.includes("IF s.feedback_timing='each'"));
assert(sql.includes("p4_can_practice"));
assert(sql.includes("question_deadline_at"));
assert(sql.includes("Configured Practice requires its protected P44 answer endpoint"));
assert(sql.includes("REVOKE ALL ON public.lms_p44_custom_config FROM PUBLIC,anon,authenticated"));
assert(sql.includes("CREATE FUNCTION public.lms_p44_start_custom"));
assert(sql.includes("CREATE FUNCTION public.lms_p44_answer"));
assert(sql.includes("CREATE FUNCTION public.lms_p44_next"));
assert(sql.includes("i.position<>s.current_position"));
assert(sql.includes('i.selected_index=i.correct_index_snapshot'));
assert(sql.includes('p_selected_index=i.correct_index_snapshot')===false);
assert(mock.includes('200 fixed questions · 300 minutes'));
console.log('PASS P44: custom 1..100, four timer modes, after-each/end, fixed/mixed/adaptive difficulty, optional local camera and protected server RPC.');
