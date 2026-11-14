import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ChevronLeft,ChevronRight,Clock3,Flag,LockKeyhole,PlayCircle,RefreshCw,ShieldCheck,Target,TriangleAlert} from 'lucide-react';
import {abandonSecurePractice,answerSecurePractice,answerAdaptivePractice,finishSecurePractice,getAdaptiveReadiness,practiceSessionKey,safeRemainingSeconds,startSecurePractice,startAdaptivePractice,startAllCoursesPractice,getAllCoursesAdaptiveReadiness} from './practiceApi';
import {requestQuestionFullscreen,isFullscreenActive,fullscreenStartError,leaveQuestionFullscreen} from '../lib/questionFullscreen';
import {useQuestionFullscreenGuard} from '../lib/useQuestionFullscreenGuard';
import LiveProtectedContent from './LiveProtectedContent';
import LiveBuildYourOwn from './LiveBuildYourOwn.jsx';
import ScientificCalculator from '../components/ScientificCalculator.jsx';
import ExamQuestionNavigator from './ExamQuestionNavigator.jsx';
import './livePractice.css';

const PRESETS=[
 {id:'quick10',title:'Quick 10',desc:'10 random questions · immediate feedback',count:10,time:0},
 {id:'timed25',title:'Timed Quiz',desc:'25 questions · 20 minutes · feedback at the end',count:25,time:1200},
 {id:'custom',title:'Build Your Own',desc:'1–100 questions · timing, difficulty, feedback and camera',count:10,time:0},
 {id:'domain',title:'Practice by Domain',desc:'Choose a verified course domain · feedback at the end',count:10,time:0},
 {id:'levelup',title:'Level Up · Adaptive',desc:'1–50 questions · balanced stages · 70% to progress',count:10,time:0}
];
const formatTime=seconds=>{
 const n=Math.max(0,Math.floor(seconds||0));
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60]
   .filter((_,i)=>i!==0||n>=3600)
   .map(value=>String(value).padStart(2,'0')).join(':');
};
const errorText=e=>e?.message||'Practice request failed';

export default function LivePractice({db,user,course,domains=[],access,defaultMode='quick10'}) {
 const [mode,setMode]=useState(defaultMode),[count,setCount]=useState(10),[minutes,setMinutes]=useState(0),[domainId,setDomainId]=useState('');
 const [attempt,setAttempt]=useState(null),[selected,setSelected]=useState(0),[feedback,setFeedback]=useState({});
 const [flaggedQuestions,setFlaggedQuestions]=useState({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[clock,setClock]=useState(Date.now());
 const [readiness,setReadiness]=useState(null),[readinessBusy,setReadinessBusy]=useState(false),[readinessError,setReadinessError]=useState('');
 const processing=useRef(false);
 const containerRef=useRef(null);
 const closingRef=useRef(false);
 const storageKey=useMemo(()=>practiceSessionKey(user.id,course.id),[user.id,course.id]);
 const sealAttempt=async id=>{
  closingRef.current=true;
  setAttempt(null);
  setFeedback({});
  setSelected(0);setFlaggedQuestions({});
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageKey+':pending');
  if(!id)return;
  const closingKey=storageKey+':closing';
  localStorage.setItem(closingKey,id);
  try{
   await abandonSecurePractice(db,id);
   localStorage.removeItem(closingKey);
  }catch{
   // Never restore questions simply because the network failed.
   // Retry closure on next connection; server cannot prove OS fullscreen.
   setNotice('Questions are closed. Server closure is pending connection recovery.');
  }
 };
 const {leaveIntentionally}=useQuestionFullscreenGuard({
  active:!!attempt,
  targetRef:containerRef,
  onUnexpectedExit:()=>{
   const id=attempt?.attemptId;
   void sealAttempt(id);
   void leaveQuestionFullscreen(document);
   setNotice('Fullscreen exited. You have been returned to the practice setup.');
  }
 });
 const current=attempt?.questions?.[selected]||null;
 const finished=attempt?.state!=='in_progress'&&!!attempt;
 const remaining=safeRemainingSeconds(attempt,clock);
 const preset=PRESETS.find(p=>p.id===mode);
 const eligible=access;
 const allCourses=course.id==='all';
 const readyForCurrent=Boolean(readiness?.ready&&readiness.requestedCount===Number(count)&&readiness.requestedDomainId===(domainId||null));

 useEffect(()=>{
  setAttempt(null);setSelected(0);setFeedback({});setFlaggedQuestions({});setError('');setNotice('');closingRef.current=false;
  if(!eligible)return;
  let saved;
  try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  const closingKey=storageKey+':closing';
  const unfinished=localStorage.getItem(closingKey)||saved?.attemptId;
  if(unfinished){
   // Reloading a fullscreen exam implicitly exits fullscreen. Do NOT resume
   // its questions without new permission; seal it instead.
   localStorage.removeItem(storageKey);
   localStorage.removeItem(storageKey+':pending');
   localStorage.setItem(closingKey,unfinished);
   setNotice('Previous question session closed after leaving fullscreen or reloading the page.');
   void abandonSecurePractice(db,unfinished).then(()=>localStorage.removeItem(closingKey))
     .catch(()=>setNotice('Questions closed locally. Server closure will retry when connected.'));
  }
 },[db,storageKey,eligible]);

 useEffect(()=>{
  // Never guess protected bank readiness using bundled question assets.
  if(mode!=='levelup'||!eligible||attempt){setReadiness(null);setReadinessError('');setReadinessBusy(false);return;}
  const desired=Number(count);
  if(!Number.isInteger(desired)||desired<1||desired>50){setReadiness(null);return;}
  let active=true;setReadiness(null);setReadinessError('');setReadinessBusy(true);
  const timer=setTimeout(()=>{
   (allCourses?getAllCoursesAdaptiveReadiness(db,desired):getAdaptiveReadiness(db,course.id,desired,domainId||null))
    .then(value=>{if(active)setReadiness({...value,requestedCount:desired,requestedDomainId:domainId||null});})
    .catch(e=>{if(active)setReadinessError(errorText(e));})
    .finally(()=>{if(active)setReadinessBusy(false);});
  },200);
  return()=>{active=false;clearTimeout(timer);};
 },[db,course.id,mode,count,domainId,eligible,attempt?.attemptId,allCourses]);
 useEffect(()=>{
  if(!attempt||finished||remaining===null)return;
  const ticker=setInterval(()=>setClock(Date.now()),1000);
  return()=>clearInterval(ticker);
 },[attempt?.attemptId,finished,remaining===null]);

 const finish=async()=>{
  if(!attempt||processing.current)return;
  processing.current=true;setBusy(true);setError('');
  try{
   const next=await finishSecurePractice(db,attempt.attemptId);
   if(!closingRef.current&&isFullscreenActive(document,containerRef.current)){
    setAttempt({...next,observedAtEpoch:Date.now()});
    setNotice('Your result has been saved.');
   }
  }catch(e){setError(errorText(e));}
  finally{processing.current=false;setBusy(false);}
 };
 useEffect(()=>{
  if(!finished&&attempt&&remaining===0&&!processing.current)void finish();
 },[attempt?.attemptId,remaining,finished]);

 const begin=async()=>{
  if(processing.current)return;
  processing.current=true;setBusy(true);setError('');setNotice('');
  const chosen=PRESETS.find(p=>p.id===mode);
  const total=['domain','levelup'].includes(chosen.id)?Number(count):chosen.count;
  const time=chosen.id==='levelup'?Number(minutes)*60:chosen.time;
  if(!Number.isInteger(total)||total<1||total>50||!Number.isInteger(time)||time<0||time>10800){
   setError('Choose 1–50 questions and a valid total timer of 0–180 minutes.');setBusy(false);processing.current=false;return;
  }
  if(mode==='levelup'&&!readyForCurrent){setError(readinessError||'This practice mode is currently unavailable. Choose a different length or course.');setBusy(false);processing.current=false;return;}
  if(mode==='domain'&&!domainId){
   setError('Select a course domain first.');setBusy(false);processing.current=false;return;
  }
  try{
   if(mode==='custom')throw Error('Build Your Own uses the configured Practice session.');
   const full=await requestQuestionFullscreen(containerRef.current);
   if(!full.ok){setError(fullscreenStartError(full));return;}
   closingRef.current=false;
   // Keep the same request UUID across retries, so a transient network failure
   // cannot accidentally start a duplicate attempt.
   const pendingKey=storageKey+':pending';
   let requestId=localStorage.getItem(pendingKey);
   if(!requestId){requestId=crypto.randomUUID();localStorage.setItem(pendingKey,requestId);}
   const request={courseId:course.id,mode,count:total,durationSeconds:time,
     domainId:mode==='domain'||mode==='levelup'?(domainId||null):null,requestId};
   const next=allCourses?await startAllCoursesPractice(db,request):
     mode==='levelup'?await startAdaptivePractice(db,request):
     await startSecurePractice(db,request);
   if(!isFullscreenActive(document,containerRef.current)){
    void sealAttempt(next.attemptId);
    setNotice('Fullscreen was closed while preparing questions. Returned to setup.');
    return;
   }
   if(next.state==='abandoned'){
    localStorage.removeItem(pendingKey);
    setError('This attempt was already closed after fullscreen exit. Start a new practice session.');
    void leaveQuestionFullscreen(document);
    return;
   }
   localStorage.setItem(storageKey,JSON.stringify({attemptId:next.attemptId}));
   localStorage.removeItem(pendingKey);
   setAttempt({...next,observedAtEpoch:Date.now()});setSelected(0);setFeedback({});setFlaggedQuestions({});
  }catch(e){setError(errorText(e));void leaveQuestionFullscreen(document);}
  finally{setBusy(false);processing.current=false;}
 };

 const answer=async(optionIndex)=>{
  if(!current||finished||busy||processing.current||remaining===0)return;
  if(attempt.mode==='quick10'&&feedback[current.id])return;
  if(attempt.mode==='levelup'&&current.selectedIndex!==null&&current.selectedIndex!==undefined)return;
  processing.current=true;setBusy(true);setError('');
  try{
   const reply=attempt.mode==='levelup'
    ?await answerAdaptivePractice(db,attempt.attemptId,current.id,optionIndex)
    :await answerSecurePractice(db,attempt.attemptId,current.id,optionIndex);
   if(closingRef.current||!isFullscreenActive(document,containerRef.current))return;
   if(attempt.mode==='levelup'){
    // Only the server grades, determines tier and assigns the next question.
    // Never show correctIndex, explanation or live tier before submission.
    setAttempt({...reply,observedAtEpoch:Date.now()});
    setSelected(Math.max(0,(reply.questions?.length||1)-1));
   }else{
    setAttempt(previous=>previous?({
     ...previous,
     questions:previous.questions.map(q=>q.id===current.id?{...q,selectedIndex:optionIndex}:q)
    }):null);
    if(reply.correctIndex!==undefined)
     setFeedback(old=>({...old,[current.id]:{correctIndex:reply.correctIndex,explanation:reply.explanation}}));
   }
  }catch(e){setError(errorText(e));}
  finally{setBusy(false);processing.current=false;}
 };
 const startOver=()=>{
  void leaveIntentionally();
  closingRef.current=true;
  localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
  setAttempt(null);setSelected(0);setFeedback({});setFlaggedQuestions({});setError('');setNotice('');
 };
 const answered=attempt?.questions?.filter(q=>q.selectedIndex!==null&&q.selectedIndex!==undefined).length||0;
 const revealed=finished?current:feedback[current?.id];
 return <div ref={containerRef} className="live-practice" aria-label="Secure practice engine">
  <div className="live-practice-top"><div><span className="live-eyebrow">SECURE PRACTICE</span><h3><ShieldCheck size={21}/> Practice Center</h3></div>{attempt&&<button type="button" className="live-secondary" onClick={()=>{void sealAttempt(attempt.attemptId);void leaveIntentionally();}}>Leave questions</button>}</div>
  {!eligible?<div className="live-empty"><LockKeyhole size={22}/><b>Practice is not available</b><p>This course needs an active learning access policy and approved questions.</p></div>:!attempt?<>
   <div className="live-mode-grid">{PRESETS.filter(p=>!allCourses||p.id!=='domain').map(p=><button key={p.id} className={'live-mode-card '+(mode===p.id?'chosen':'')} onClick={()=>{setMode(p.id);setError('');setNotice('');}} type="button"><strong>{p.title}</strong><span>{p.desc}</span>{mode===p.id&&<Check size={17}/>}</button>)}</div>
   {mode==='custom'?<LiveBuildYourOwn key={course.id+'-'+user.id} db={db} user={user} course={course}
     domains={domains} access={eligible}/>:<>
   {['domain','levelup'].includes(mode)&&<div className="live-practice-controls">
      <label>Number of questions<input type="number" min={1} max={50} value={count} onChange={e=>setCount(e.target.value)}/></label>
      {['levelup'].includes(mode)&&<label>Time limit (minutes; 0 = untimed)<input type="number" min={0} max={180} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
      {['domain','levelup'].includes(mode)&&<label>Domain<select value={domainId} onChange={e=>setDomainId(e.target.value)}><option value="">{mode==='levelup'?'All course domains':'Choose domain'}</option>{domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
   </div>}
   {mode==='levelup'&&<div className="live-adaptive-count-picks" role="group" aria-label="Adaptive session length">
    <span>Quick session length</span>
    {[10,25,30,50].map(n=><button type="button" key={n} onClick={()=>setCount(n)} aria-pressed={Number(count)===n} className={Number(count)===n?'selected':''}>
      {n} questions
      {readiness&&!readinessBusy&&<small>{[readiness.low,readiness.medium,readiness.high].every(v=>Number(v)>=n)?'Available':'Unavailable'}</small>}
    </button>)}
   </div>}
   {mode==='levelup'?<div className="live-practice-note" role="status"><Target size={16}/>
    {readinessBusy?'Checking availability…':
     readinessError?'Adaptive mode unavailable: '+readinessError:
     !readiness?'Choose your practice length.':
     readiness.ready?'Your session is ready. Questions will adapt as you progress.':
      'Not enough questions are available for this session. Try a different length or course.'}
   </div>:null}
   <button className="live-primary" disabled={busy||!eligible||(mode==='levelup'&&(!readyForCurrent||readinessBusy))} onClick={begin} type="button"><PlayCircle size={17}/>{busy?'Preparing your questions…':'Start practice'}</button>
   </>}
  </>:<>
   <div className="live-attempt-bar"><b>{finished?'Review your result':(attempt.mode==='quick10'?'Quick 10':attempt.mode==='timed25'?'Timed Quiz':attempt.mode==='levelup'?'Level Up · Adaptive':'Custom Practice')}</b>
     <span><Target size={16}/>{answered} / {attempt.questionCount} answered</span>
     {remaining!==null&&<span><Clock3 size={16}/>{formatTime(remaining)} remaining</span>}
     {finished&&<strong>{attempt.scorePercent}% · {attempt.correctCount}/{attempt.questionCount} correct</strong>}
   </div>
   <ScientificCalculator context="Practice" portalTarget={containerRef.current}
     currentQuestion={selected+1} questionCount={attempt.questionCount}
     canPrevious={selected>0} onPrevious={()=>setSelected(i=>Math.max(0,i-1))}
     onNext={()=>setSelected(i=>Math.min(attempt.questions.length-1,i+1))}/>
   <div className="tc-exam-workbench"><div className="tc-exam-workbench-main">
   {current&&<LiveProtectedContent as="div" className="live-question" kind="exam-question" identity={{id:user.id}}>
     <div className="live-question-label">QUESTION {selected+1} OF {attempt.questionCount}</div>
     <h4>{current.prompt}</h4>
     <div className="live-answer-list">{current.options.map((option,index)=>{
       const chosen=current.selectedIndex===index;
       const correct=typeof revealed?.correctIndex==='number'&&revealed.correctIndex===index;
       const incorrect=chosen&&typeof revealed?.correctIndex==='number'&&!correct;
       return <button type="button" key={index} disabled={finished||busy||remaining===0||(attempt.mode==='quick10'&&!!feedback[current.id])||(attempt.mode==='levelup'&&current.selectedIndex!==null&&current.selectedIndex!==undefined)}
         onClick={()=>answer(index)} className={'live-answer '+(chosen?'chosen ':'')+(correct?'correct ':'')+(incorrect?'incorrect':'')}>
         <b>{String.fromCharCode(65+index)}</b><span>{String(option)}</span>{correct&&<Check size={17}/>}
       </button>;
     })}</div>
     {typeof revealed?.correctIndex==='number'&&<div className="live-practice-feedback"><b>{current.selectedIndex===revealed.correctIndex?'Correct answer':'Answer review'}</b><p>{revealed.explanation||'No explanation provided.'}</p></div>}
   </LiveProtectedContent>}
   {current&&!finished&&<div className="tc-exam-question-tools">
    <button type="button" className={"tc-exam-flag "+(flaggedQuestions[current.id]?"is-flagged":"")}
     aria-pressed={!!flaggedQuestions[current.id]}
     onClick={()=>setFlaggedQuestions(flags=>({...flags,[current.id]:!flags[current.id]}))}>
     <Flag size={17}/>{flaggedQuestions[current.id]?"Flagged for review":"Flag for review"}
    </button></div>}
   <div className="live-question-nav">
     <button type="button" className="live-secondary" disabled={selected===0} onClick={()=>setSelected(v=>Math.max(0,v-1))}><ChevronLeft size={16}/> Previous</button>
     <button type="button" className="live-secondary" disabled={selected>=attempt.questions.length-1} onClick={()=>setSelected(v=>Math.min(attempt.questions.length-1,v+1))}>Next <ChevronRight size={16}/></button>
   </div></div>
   <ExamQuestionNavigator questions={attempt.questions} total={attempt.questionCount}
    currentIndex={selected} isFlagged={q=>!!flaggedQuestions[q.id]}
    onJump={setSelected} disabled={busy}/>
   </div>
   {finished?<button className="live-primary" onClick={startOver}>New practice session</button>:<button className="live-primary" type="button" disabled={busy||(attempt.mode==='levelup'&&answered<attempt.questionCount&&remaining!==0)} onClick={finish}>{attempt.mode==='levelup'&&answered<attempt.questionCount?'Answer all adaptive questions to finish':'Finish & calculate score'}</button>}
  </>}
  {error&&<p className="live-error" role="alert"><TriangleAlert size={17}/>{error}</p>}
  {notice&&<p className="live-notice" role="status">{notice}</p>}
 </div>;
}
