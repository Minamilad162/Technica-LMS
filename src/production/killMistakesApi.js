// P58: learner-only, graded on Supabase. Never trust browser-supplied answer keys.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const safeCount=n=>Number.isSafeInteger(n)&&n>=0;
export function validateMistakesFeed(data){
 if(!data||!safeCount(data.openCount)||!safeCount(data.resolvedCount)||
  !Array.isArray(data.items)||data.items.length>100||
  !safeCount(data.offset)||!safeCount(data.limit)||data.limit<1||data.limit>100
  )throw Error('Invalid verified Kill Mistakes response.');
 const seen=new Set();
 for(const q of data.items){
  if(!q||!uuid.test(q.id||'')||seen.has(q.id)||
   !uuid.test(q.courseId||'')||typeof q.courseTitle!=='string'||
   typeof q.prompt!=='string'||!Array.isArray(q.options)||
   q.options.length<2||q.options.length>12||
   q.options.some(x=>typeof x!=='string')||
   !safeCount(q.wrongCount)||q.wrongCount===0||!safeCount(q.reviewCount)||
   typeof q.lastSource!=='string'||!Number.isFinite(Date.parse(q.lastWrongAt))||
   !['bank','lesson'].includes(q.sourceKind)||
   ['correctIndex','correct_index','correct_index_snapshot','explanation','reference','selectedIndex'].some(k=>Object.hasOwn(q,k))
  )throw Error('Mistake question data is incomplete or contains an answer key.');
  seen.add(q.id);
 }
 return data;
}
export async function fetchKillMistakes(db,{limit=40,offset=0,courseId=null}={}){
 if(!db?.rpc||!Number.isInteger(limit)||limit<1||limit>100||
 !Number.isInteger(offset)||offset<0||offset>50000||
 (courseId!==null&&!uuid.test(courseId)))throw Error('Invalid Kill Mistakes request.');
 const {data,error}=await db.rpc('lms_p58_list',{p_limit:limit,p_offset:offset,p_course_id:courseId});
 if(error)throw Error(error.message||'Could not load verified mistakes.');
 return validateMistakesFeed(data);
}
export async function submitKillMistakeAnswer(db,mistakeId,selectedIndex){
 if(!db?.rpc||!uuid.test(mistakeId||'')||
 !Number.isInteger(selectedIndex)||selectedIndex<0||selectedIndex>20)
 throw Error('Select a valid answer to continue.');
 const {data,error}=await db.rpc('lms_p58_answer',{
  p_mistake_id:mistakeId,p_selected_index:selectedIndex});
 if(error)throw Error(error.message||'Could not save your answer.');
 if(!data||data.id!==mistakeId||typeof data.correct!=='boolean'||
 typeof data.resolved!=='boolean'||data.resolved!==data.correct||
 typeof data.alreadyResolved!=='boolean'||
 (data.correct&&(!Number.isInteger(data.correctIndex)||
 typeof data.explanation!=='string'||typeof data.reference!=='string'))||
 (!data.correct&&['correctIndex','explanation','reference'].some(k=>Object.hasOwn(data,k))))
 throw Error('Invalid grading response from Kill Mistakes.');
 return data;
}
export const mistakeSourceLabel=value=>({
 quick10:'Quick 10',timed25:'Timed Quiz',custom:'Build Your Own',domain:'Domain Practice',
 levelup:'Level Up',official_mock:'Official Mock Exam',selected_mock:'Selected Mock Exam',
 lesson_quiz:'Lesson Quiz'
}[value]||'Practice');
