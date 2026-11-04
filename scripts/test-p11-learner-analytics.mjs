import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getLearnerProgress,validateLearnerProgress} from '../src/production/learnerProgressApi.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const date='2026-11-05T10:00:00Z';
const payload={
 version:'p11-v1',courseId:id(1),courseTitle:'ASP',generatedAt:date,
 learning:{totalLessons:2,completedLessons:1,readingCompleted:1,videoCompleted:0,
  quizzesPassed:1,completionPercent:50},
 practice:{attempts:2,assignedQuestions:20,answeredQuestions:10,correctAnswers:7,
  levelUpAttempts:1,answerAccuracyPercent:70,scoredPercent:35,lastFinishedAt:date},
 mock:{attempts:1,assignedQuestions:200,answeredQuestions:100,correctAnswers:60,
  answerAccuracyPercent:60,scoredPercent:30,lastFinishedAt:date},
 domains:[{
  id:id(2),title:'ASP Domain',position:0,topicCount:1,totalLessons:2,completedLessons:1,
  completionPercent:50,answeredQuestions:110,correctAnswers:67,
  practiceAnswered:10,mockAnswered:100,answerAccuracyPercent:60.91,
  topics:[{id:id(3),title:'Topic A',position:0,totalLessons:2,completedLessons:1,
   quizzesPassed:1,completionPercent:50,questionAccuracyPercent:null}]
 }],
 recentAttempts:[
  {mode:'asp_mock_200',state:'submitted',questionCount:200,correctCount:60,
   scorePercent:30,startedAt:date,submittedAt:date},
  {mode:'quick10',state:'submitted',questionCount:10,correctCount:7,
   scorePercent:70,startedAt:date,submittedAt:date}
 ]
};
assert.deepEqual(validateLearnerProgress(payload,id(1)),payload);
const empty={...payload,learning:{totalLessons:0,completedLessons:0,readingCompleted:0,
 videoCompleted:0,quizzesPassed:0,completionPercent:null},
 practice:{attempts:0,assignedQuestions:0,answeredQuestions:0,correctAnswers:0,
 levelUpAttempts:0,answerAccuracyPercent:null,scoredPercent:null,lastFinishedAt:null},
 mock:{attempts:0,assignedQuestions:0,answeredQuestions:0,correctAnswers:0,
 answerAccuracyPercent:null,scoredPercent:null,lastFinishedAt:null},
 domains:[],recentAttempts:[]};
assert.equal(validateLearnerProgress(empty,id(1)).learning.completionPercent,null);
for(const bad of [
 {...payload,courseId:id(8)},
 {...payload,learning:{...payload.learning,totalLessons:0}},
 {...payload,practice:{...payload.practice,levelUpAttempts:9}},
 {...payload,practice:{...payload.practice,answeredQuestions:0,answerAccuracyPercent:70}},
 {...payload,mock:{...payload.mock,assignedQuestions:199}},
 {...payload,mock:{...payload.mock,correctAnswers:201}},
 {...payload,domains:[{...payload.domains[0],correctAnswers:111}]},
 {...payload,domains:[{...payload.domains[0],totalLessons:3}]},
 {...payload,domains:[{...payload.domains[0],topics:[{...payload.domains[0].topics[0],questionAccuracyPercent:80}]}]},
 {...payload,recentAttempts:[{...payload.recentAttempts[0],scorePercent:120}]},
 {...payload,recentAttempts:[{...payload.recentAttempts[0],state:'in_progress'}]},
 {...payload,version:'demo'}
])assert.throws(()=>validateLearnerProgress(bad,id(1)),/Invalid|Unverified|inconsistent|disagree/i);
const calls=[];
const db={rpc:async(name,args)=>{calls.push({name,args});return {data:payload,error:null}}};
assert.equal((await getLearnerProgress(db,id(1))).learning.completedLessons,1);
assert.deepEqual(calls,[{name:'lms_p11_my_progress',args:{p_course_id:id(1)}}]);
await assert.rejects(()=>getLearnerProgress(db,'demo'),/Authenticated course/);
await assert.rejects(()=>getLearnerProgress({rpc:async()=>({data:null,error:{message:'P11 migration missing'}})},id(1)),/P11 migration/);
const sql=read('supabase/migrations/202611050002_p11_learner_progress_analytics.sql');
for(const marker of [
 'CREATE FUNCTION public.lms_p11_my_progress(p_course_id uuid)',
 "STABLE SECURITY DEFINER SET search_path='' AS $$",
 "a.user_id=v_user AND a.course_id=p_course_id",
 "p.user_id=v_user",
 "public.lms_p1_can_view_lesson(l.id)",
 'public.lms_p1_can_view_structure(p_course_id)',
 "a.state IN ('submitted','expired')",
 "i.selected_index=i.correct_index_snapshot",
 'lms_p10_mock_answers',
 'r.reviewed_domain_id',
 'questionAccuracyPercent',
 "'recentAttempts'",
 'LIMIT 10',
 'REVOKE ALL ON FUNCTION public.lms_p11_my_progress(uuid) FROM PUBLIC,anon,authenticated',
 'GRANT EXECUTE ON FUNCTION public.lms_p11_my_progress(uuid) TO authenticated,service_role'
])assert(sql.includes(marker),'Missing secure P11 contract: '+marker);
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.lms_p8_'));
assert(!sql.includes('INSERT INTO public.lms_lesson_progress'));
assert(!sql.includes('UPDATE public.lms_questions'));
const app=read('src/App.jsx'),nav=read('src/components/Layout.jsx');
assert(app.includes('path="/my-progress"')&&app.includes('<LiveLearnerProgress/>'));
assert(nav.includes("['/my-progress','My Progress'"));
const ui=read('src/production/LiveLearnerProgress.jsx');
assert(ui.includes('fetchLiveLearningCatalog')&&ui.includes('getLearnerProgress'));
assert(ui.includes('No demo percentages')&&ui.includes('questionAccuracyPercent')===false);
assert(ui.includes('Question accuracy by Topic is not available'));
assert(!ui.includes("from '../data/mock'"));
const workflow=read('.github/workflows/ci-security.yml');
assert(workflow.includes('npm run test:p11'));
assert(workflow.includes('bash scripts/test-p11-postgres-smoke.sh'));
const blueprint=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');
assert(blueprint.includes('## 65. P11 — Real learner progress and assessment analytics'));
assert(read('docs/current/LOGIC_REGISTRY.md').includes('LMS-033'));
console.log('PASS P11 learner-owned read-only progress/analytics contract, Domain/Topic granularity, no fake accuracy, correct Practice+Mock denominators, Auth route and CI wiring.');
