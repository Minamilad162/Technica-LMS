// P11: PRIVATE learner-owned read-only analytics. No score computations or
// question-answer snapshots are trusted from the browser.
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const percent=n=>n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const dateOrNull=x=>x===null||(typeof x==='string'&&Number.isFinite(Date.parse(x)));
function validateSummary(s,{lessons=false,mock=false}={}){
 if(!s||typeof s!=='object')throw Error('Invalid learner analytics response');
 const counts=lessons?['totalLessons','completedLessons','readingCompleted','videoCompleted','quizzesPassed']:
  ['attempts','assignedQuestions','answeredQuestions','correctAnswers'];
 if(!counts.every(k=>integer(s[k])))throw Error('Invalid learner metrics');
 if(lessons){
  if(s.completedLessons>s.totalLessons||!percent(s.completionPercent)
    ||(s.totalLessons===0)!==(s.completionPercent===null))
   throw Error('Invalid course completion count');
 }else{
  if(s.answeredQuestions>s.assignedQuestions||s.correctAnswers>s.answeredQuestions
   ||!percent(s.answerAccuracyPercent)||!percent(s.scoredPercent)
   ||(s.answeredQuestions===0)!==(s.answerAccuracyPercent===null)
   ||(s.assignedQuestions===0)!==(s.scoredPercent===null)
   ||!dateOrNull(s.lastFinishedAt))throw Error('Invalid assessment metrics');
  if(mock&&s.assignedQuestions!==s.attempts*200)
   throw Error('Mock attempts must use exactly 200 assigned questions');
  if(!mock&&(!integer(s.levelUpAttempts)||s.levelUpAttempts>s.attempts))
   throw Error('Invalid Level Up session count');
 }
}
export function validateLearnerProgress(value,expectedCourseId){
 if(!value||value.version!=='p11-v1'||!uuid.test(value.courseId||'')
  ||(expectedCourseId&&value.courseId!==expectedCourseId)
  ||typeof value.courseTitle!=='string'
  ||!Number.isFinite(Date.parse(value.generatedAt||'')))
  throw Error('Unverified learner progress response');
 validateSummary(value.learning,{lessons:true});
 validateSummary(value.practice);
 validateSummary(value.mock,{mock:true});
 if(!Array.isArray(value.domains)||!Array.isArray(value.recentAttempts)
  ||value.recentAttempts.length>10)
  throw Error('Invalid domain and attempt collections');
 const domainIds=new Set(),topicIds=new Set();
 let courseLessons=0,completedLessons=0;
 for(const d of value.domains){
  if(!uuid.test(d?.id||'')||domainIds.has(d.id)||!integer(d.position)
    ||typeof d.title!=='string'||!integer(d.topicCount)
    ||!integer(d.totalLessons)||!integer(d.completedLessons)
    ||d.completedLessons>d.totalLessons
    ||!percent(d.completionPercent)||!percent(d.answerAccuracyPercent)
    ||!integer(d.answeredQuestions)||!integer(d.correctAnswers)
    ||d.correctAnswers>d.answeredQuestions
    ||!integer(d.practiceAnswered)||!integer(d.mockAnswered)
    ||d.practiceAnswered+d.mockAnswered!==d.answeredQuestions
    ||!Array.isArray(d.topics)||d.topics.length!==d.topicCount)
   throw Error('Invalid domain progress statistics');
  domainIds.add(d.id);courseLessons+=d.totalLessons;completedLessons+=d.completedLessons;
  let tCount=0,tCompleted=0;
  for(const t of d.topics){
   if(!uuid.test(t?.id||'')||topicIds.has(t.id)
    ||typeof t.title!=='string'||!integer(t.position)
    ||!integer(t.totalLessons)||!integer(t.completedLessons)
    ||!integer(t.quizzesPassed)||t.completedLessons>t.totalLessons
    ||!percent(t.completionPercent)||t.questionAccuracyPercent!==null)
    throw Error('Invalid topic learning statistics');
   topicIds.add(t.id);tCount+=t.totalLessons;tCompleted+=t.completedLessons;
  }
  if(tCount!==d.totalLessons||tCompleted!==d.completedLessons)
   throw Error('Domain lesson totals are inconsistent');
 }
 if(courseLessons!==value.learning.totalLessons||completedLessons!==value.learning.completedLessons)
  throw Error('Course/Domain completed lesson counts disagree');
 for(const item of value.recentAttempts){
  if(!item||!['quick10','timed25','custom','domain','levelup','asp_mock_200'].includes(item.mode)
    ||!['submitted','expired'].includes(item.state)
    ||!integer(item.questionCount)||!integer(item.correctCount)
    ||item.correctCount>item.questionCount||!percent(item.scorePercent)
    ||typeof item.scorePercent!=='number'
    ||!Number.isFinite(Date.parse(item.startedAt||''))
    ||!Number.isFinite(Date.parse(item.submittedAt||'')))
   throw Error('Invalid recent assessment metric');
 }
 return value;
}
export async function getLearnerProgress(db,courseId){
 if(!db||typeof db.rpc!=='function'||!uuid.test(courseId||''))
  throw Error('Authenticated course and connection required');
 const {data,error}=await db.rpc('lms_p11_my_progress',{p_course_id:courseId});
 if(error)throw Error(error.message||'Verified learner progress unavailable');
 return validateLearnerProgress(data,courseId);
}
