/**
 * Reference-inspired Practice Center quick modes; original Technica UI.
 * This demo has no difficulty-tagged bank or admin-reserved Mock pool yet.
 * Inactive modes MUST never silently run an unrelated generic practice quiz.
 */
export const PRACTICE_MODES=Object.freeze([
 {id:'quick10',name:'Quick 10',caption:'10 questions · untimed',description:'A short warm-up with feedback after every answer.',icon:'Zap',status:'ready'},
 {id:'timed',name:'Timed Quiz',caption:'25 questions · 20 minutes',description:'Practice against the clock with results at the end.',icon:'Timer',status:'ready'},
 {id:'domain',name:'Practice by Domain',caption:'Focus on one domain',description:'Choose a course domain and target 25 questions.',icon:'Layers',status:'ready'},
 {id:'weakest',name:'Weakest Subject',caption:'From your last attempt',description:'Focus on the domain with your lowest recorded accuracy.',icon:'Target',status:'history'},
 {id:'missed',name:'Missed Questions',caption:'Review your mistakes',description:'Retry incorrect answers from your latest completed attempt.',icon:'RotateCcw',status:'history'},
 {id:'custom',name:'Build Your Own',caption:'Fully customizable',description:'Choose your domains, question count, timing and feedback.',icon:'SlidersHorizontal',status:'ready'},
 {id:'levelup',name:'Level Up',caption:'Adaptive · 70% to advance',description:'Requires reviewed Low, Medium and High question labels.',icon:'TrendingUp',status:'planned'},
 {id:'mock',name:'Mock Exam',caption:'200 questions · 5 hours',description:'Requires a separate admin-reserved, locked mock exam.',icon:'GraduationCap',status:'planned'}
]);
export function getLastAttemptInsights(result,courseId,domainIds=[]){
 if(!result||result.courseId!==courseId||!Array.isArray(result.questions))return {wrongIds:[],weakestDomain:null,attempted:0};
 const allowed=new Set(domainIds);
 const byDomain=new Map();
 const wrongIds=[];
 let attempted=0;
 for(const q of result.questions){
  if(!allowed.has(q.domainId))continue;
  const selected=result.answers?.[q.id];
  if(selected===null||selected===undefined)continue;
  attempted++;
  const stats=byDomain.get(q.domainId)||{count:0,correct:0,wrong:0};
  stats.count++;
  if(selected===q.correct)stats.correct++;
  else {stats.wrong++;wrongIds.push(q.bankId||q.id)}
  byDomain.set(q.domainId,stats);
 }
 const weakest=[...byDomain.entries()].filter(([,stats])=>stats.wrong>0)
  .sort((a,b)=>a[1].correct/a[1].count-b[1].correct/b[1].count||b[1].count-a[1].count)[0];
 return {wrongIds:[...new Set(wrongIds)],weakestDomain:weakest?.[0]||null,attempted};
}
export function presetPracticeSettings(id,{courseId,domainIds,domainId,insights}){
 const base={practiceCourseId:courseId,selectedTopics:domainIds,pool:'all',feedbackMode:'end'};
 if(id==='quick10')return {...base,questionCount:10,timerMode:'none',feedbackMode:'each',practiceMode:'quick10',practiceModeLabel:'Quick 10'};
 if(id==='timed')return {...base,questionCount:25,timerMode:'whole',customMinutes:20,practiceMode:'timed',practiceModeLabel:'Timed Quiz'};
 if(id==='domain'){
  if(!domainIds.includes(domainId))return null;
  return {...base,selectedTopics:[domainId],questionCount:25,timerMode:'none',practiceMode:'domain',practiceModeLabel:'Practice by Domain'};
 }
 if(id==='weakest'){
  if(!insights?.weakestDomain||!domainIds.includes(insights.weakestDomain))return null;
  return {...base,selectedTopics:[insights.weakestDomain],questionCount:15,timerMode:'none',practiceMode:'weakest',practiceModeLabel:'Weakest Subject'};
 }
 if(id==='missed'){
  if(!insights?.wrongIds?.length)return null;
  return {...base,questionCount:Math.min(25,insights.wrongIds.length),pool:'mistakes',
    wrongIds:insights.wrongIds,timerMode:'none',practiceMode:'missed',practiceModeLabel:'Missed Questions'};
 }
 return null;
}
