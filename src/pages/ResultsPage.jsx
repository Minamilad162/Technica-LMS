import ProtectedContent from '../components/ProtectedContent';
import React,{useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Check,X,Minus,Target,Clock3,ArrowLeft,ArrowRight,BookOpen,FileText,Play,ChevronRight,ChevronDown,Flag,RotateCcw,ClipboardCheck,CalendarDays,LockKeyhole,Layers3} from 'lucide-react';
import HDImage from '../components/HDImage';
import {assets,questionPool} from '../data/mock';
import {courses} from '../data/courseCatalog';
import {getCourse} from '../lib/courseWorkspace';
import {getAuthSession} from '../lib/demoAuth';
import {assessmentHistoryForUser,groupAssessmentHistory,DEMO_LEARNER_ID} from '../lib/assessmentHistory';
import {useDemo,calculateResult} from '../lib/store';
import {Breadcrumb} from '../components/UI';

const filters=[['all','All'],['incorrect','Incorrect'],['unanswered','Unanswered'],['flagged','Flagged']];
const prettyDate=date=>{
 const ms=Date.parse(date||'');
 return Number.isNaN(ms)?'Earlier assessment':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));
};

function AttemptDetails({attempt,state,notify,beginPractice,update,navigate}){
 const result=useMemo(()=>calculateResult(attempt),[attempt]);
 const [filter,setFilter]=useState('all');
 const [current,setCurrent]=useState(result.questions[0]?.id);
 const filtered=useMemo(()=>result.questions.filter(q=>{
   const answer=result.answers?.[q.id];
   if(filter==='incorrect')return answer!==undefined&&answer!==q.correct;
   if(filter==='unanswered')return answer===undefined;
   if(filter==='flagged')return result.flags.includes(q.id);
   return true;
 }),[filter,result]);
 const chosen=filtered.find(q=>q.id===current)||filtered[0];
 function chooseFilter(value){
  setFilter(value);
  setCurrent(result.questions.find(q=>value==='incorrect'?(result.answers[q.id]!==undefined&&result.answers[q.id]!==q.correct):value==='unanswered'?result.answers[q.id]===undefined:value==='flagged'?result.flags.includes(q.id):true)?.id);
 }
 function startMistakes(){
  const wrong=result.questions.filter(q=>result.answers[q.id]!==undefined&&result.answers[q.id]!==q.correct);
  if(!wrong.length){notify('No incorrect answers in this attempt — great work!');return}
  const domainIds=[...new Set(wrong.map(q=>q.domainId).filter(Boolean))];
  const config={pool:'mistakes',practiceCourseId:result.courseId,questionCount:Math.min(50,wrong.length),selectedTopics:domainIds,
    wrongIds:wrong.map(q=>q.bankId||q.id)};
  update({pool:'mistakes',practiceCourseId:result.courseId,selectedTopics:domainIds,questionCount:Math.min(50,wrong.length)});
  if(beginPractice(config))navigate('/practice/session');
 }
 const qIndex=filtered.findIndex(q=>q.id===chosen?.id);
 return <div className="course-attempt-details">
  <div className="review-attempt-heading"><div><h3>Assessment details</h3><p>{prettyDate(attempt.submittedAt)} · Attempt {attempt.attempt||1}</p></div><span className={`pass-label ${result.passed?'':'failed'}`}>{result.passed?<Check size={15}/>:<X size={15}/>} {result.passed?'Passed':'Not passed'}</span></div>
  <div className="result-stats"><div className="result-main-card"><div className="score-ring" style={{'--score':`${result.score}%`}}><div><strong>{result.score}%</strong></div></div><div className="result-summary"><b>{result.correct} correct out of {result.total}</b><p>{result.courseName} · Assessment</p><div className="result-meta"><span><Target size={18}/><small>Pass mark <b>{result.passMark}%</b></small></span><span><Clock3 size={18}/><small>Time taken <b>{result.timeTaken||'—'}</b></small></span></div></div></div>
   <div className="result-tile mint"><span><Check size={22}/></span><b>{result.correct}</b><small>Correct</small></div><div className="result-tile coral"><span><X size={22}/></span><b>{result.incorrect}</b><small>Incorrect</small></div><div className="result-tile lilac"><span><Minus size={22}/></span><b>{result.unanswered}</b><small>Unanswered</small></div></div>
  <div className="results-detail-grid"><section className="white-panel review-list-panel"><h3>Review answers</h3><p>Pick any question from this assessment attempt to inspect your response.</p><div className="result-filters">{filters.map(([v,label])=><button type="button" key={v} className={filter===v?'active':''} aria-pressed={filter===v} onClick={()=>chooseFilter(v)}>{v==='flagged'&&<Flag size={13}/>} {label}<span>{v==='all'?result.total:v==='incorrect'?result.incorrect:v==='unanswered'?result.unanswered:result.flags.length}</span></button>)}</div><div className="review-questions">{filtered.map(q=>{
   const answer=result.answers[q.id];const correct=answer===q.correct;
   return <button type="button" className={`review-question ${chosen?.id===q.id?'chosen':''}`} aria-pressed={chosen?.id===q.id} key={q.id} onClick={()=>setCurrent(q.id)}><span className={`review-mark ${answer===undefined?'empty':correct?'ok':'bad'}`}>{answer===undefined?<Minus size={18}/>:correct?<Check size={18}/>:<X size={18}/>}</span><span className="review-question-text"><b>Question {q.id}</b><small>{q.prompt}</small><em><BookOpen size={13}/>{q.topic}</em></span><span className={`review-status ${correct?'ok':answer===undefined?'empty':'bad'}`}>{answer===undefined?'Unanswered':correct?'Correct':'Incorrect'}</span><ChevronRight size={17}/></button>})}{!filtered.length&&<div className="empty-state">No questions match this filter.</div>}</div></section>
   <ProtectedContent as="section" className="white-panel answer-review-panel" kind="answer-review">{chosen?<><div className="review-answer-head"><b>Question {chosen.id}</b><span>· {chosen.topic}</span><div className="review-arrows"><button type="button" disabled={qIndex<=0} onClick={()=>setCurrent(filtered[qIndex-1]?.id)} aria-label="Previous reviewed question"><ArrowLeft size={16}/></button><button type="button" disabled={qIndex>=filtered.length-1} onClick={()=>setCurrent(filtered[qIndex+1]?.id)} aria-label="Next reviewed question"><ArrowRight size={16}/></button></div></div><p className="review-prompt">{chosen.prompt}</p><div className="review-option-list">{chosen.options.map((option,i)=><div key={i} className={`review-opt ${i===chosen.correct?'right':''} ${i===result.answers[chosen.id]&&i!==chosen.correct?'wrong':''}`}><span className="answer-letter">{'ABCD'[i]}</span><span>{option}</span>{i===chosen.correct&&<small>Correct answer</small>}{i===result.answers[chosen.id]&&i!==chosen.correct&&<small>Your answer</small>}</div>)}</div>{result.answers[chosen.id]===undefined&&<p className="review-no-answer">You left this question unanswered.</p>}<div className="explanation"><div className="expl-title"><BookOpen size={18}/>Explanation</div><p>{chosen.explanation}</p></div><div className="source-reference"><FileText size={17}/><div><strong>Reference: {chosen.reference}</strong><small>Source: supplied ASP Excel question bank.</small></div></div><div className="review-footer"><button className="btn" onClick={startMistakes}><Play size={17}/>Practice mistakes <ArrowRight size={18}/></button></div></>:<div className="empty-state">Select a question to inspect its answer and explanation.</div>}</ProtectedContent>
  </div>
 </div>;
}

export default function ResultsPage(){
 const navigate=useNavigate();const {state,notify,beginPractice,update}=useDemo();
 const learnerId=getAuthSession()?.id||DEMO_LEARNER_ID;
 const records=assessmentHistoryForUser(state,learnerId,[...questionPool,...state.addedQuestions]);
 const groups=groupAssessmentHistory(records);
 const recentCourseId=state.lastResult?.kind==='assessment' && (state.lastResult.learnerId||DEMO_LEARNER_ID)===learnerId?state.lastResult.courseId:null;
 const [openCourseId,setOpenCourseId]=useState(recentCourseId||null);
 const [selectedAttemptByCourse,setSelectedAttemptByCourse]=useState({});
 function practiceAgain(courseId){
  const course=getCourse(state,courseId);
  update({practiceCourseId:courseId,selectedTopics:course?.domainIds||[],pool:'all'});
  navigate('/practice');
 }
 function assessmentAgain(courseId){update({assessmentCourseId:courseId});navigate('/assessments')}
 return <div className="results-page review-by-course page-enter"><Breadcrumb items={['Assessments','Review']}/><h1>Assessment review</h1><p className="page-subtitle">Choose a course to see its assessment attempts, results, questions and explanations. Everything opens here without leaving the page.</p>
  <div className="review-course-intro"><span><ClipboardCheck size={19}/></span><div><strong>Your assessment history</strong><small>Only completed assessments are listed. Practice sessions are kept separate.</small></div><b>{groups.length} {groups.length===1?'course':'courses'} · {records.length} {records.length===1?'attempt':'attempts'}</b></div>
  {groups.length===0?<section className="review-empty white-panel"><ClipboardCheck size={32}/><h2>No assessments completed yet</h2><p>When you finish an assessment, its course will appear here. You'll be able to expand it to review all previous attempts and answers.</p><button className="btn" type="button" onClick={()=>navigate('/assessments')}>Choose an assessment <ArrowRight size={17}/></button></section>:<div className="review-course-list">
   {groups.map(group=>{
    const course=getCourse(state,group.courseId);const latest=group.attempts[0];const latestScore=calculateResult(latest);
    const expanded=openCourseId===group.courseId;
    const active=group.attempts.find(a=>a.id===selectedAttemptByCourse[group.courseId])||latest;
    const bodyId=`review-course-${group.courseId}`;
    return <section key={group.courseId} className={`review-course-card ${expanded?'is-open':''}`}>
     <button type="button" className="review-course-trigger" aria-expanded={expanded} aria-controls={bodyId} onClick={()=>setOpenCourseId(expanded?null:group.courseId)}><HDImage src={assets[course?.art||'refinery']} alt="" sizes="90px"/><span className="review-course-text"><strong>{course?.name||group.courseName}</strong><small>{course?.subtitle||'Course assessment history'}</small><em>{group.attempts.length} completed {group.attempts.length===1?'assessment':'assessments'} · Latest {prettyDate(latest.submittedAt)}</em></span><span className="review-course-score"><b>{latestScore.score}%</b><small>Latest score</small></span><ChevronDown size={22} className="review-course-chevron"/></button>
     {<div id={bodyId} className="review-course-body" hidden={!expanded}>{expanded&&<><div className="review-course-actions"><div><h3>{course?.name||group.courseName} · Assessment history</h3><p>Choose an attempt to review all its questions and feedback.</p></div><div className="review-course-action-buttons"><button type="button" className="btn btn-secondary" onClick={()=>practiceAgain(group.courseId)}><BookOpen size={17}/> Practice this course</button><button type="button" className="btn" onClick={()=>assessmentAgain(group.courseId)}><RotateCcw size={17}/> Retake assessment</button></div></div>
      <div className="review-attempt-list" role="group" aria-label={`${course?.name||group.courseName} previous assessment attempts`}>{group.attempts.map((attempt,index)=>{const r=calculateResult(attempt);return <button type="button" key={attempt.id} className={`review-attempt-pill ${attempt.id===active.id?'selected':''}`} aria-pressed={attempt.id===active.id} onClick={()=>setSelectedAttemptByCourse(s=>({...s,[group.courseId]:attempt.id}))}><span className="review-attempt-number">Attempt {attempt.attempt||group.attempts.length-index}</span><span className="review-attempt-date"><CalendarDays size={13}/>{prettyDate(attempt.submittedAt)}</span><strong>{r.score}%</strong><span className={`review-attempt-state ${r.passed?'passed':'failed'}`}>{r.passed?'Passed':'Not passed'}</span></button>})}</div>
      <AttemptDetails key={active.id} attempt={active} state={state} notify={notify} beginPractice={beginPractice} update={update} navigate={navigate}/>
     </>}</div>}
    </section>;
   })}
  </div>}
 </div>;
}
