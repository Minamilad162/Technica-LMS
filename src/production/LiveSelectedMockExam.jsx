import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,Clock3,Flag,LayoutGrid,LockKeyhole,PlayCircle,Send,ShieldCheck} from 'lucide-react';
import {abandonSelectedMock,getSelectedMockReadiness,getSelectedMock,selectedMockSecondsLeft,
 saveSelectedMock,startSelectedMock,submitSelectedMock} from './selectedMockApi.js';
import {requestQuestionFullscreen,isFullscreenActive,fullscreenStartError,leaveQuestionFullscreen} from '../lib/questionFullscreen';
import {useQuestionFullscreenGuard} from '../lib/useQuestionFullscreenGuard';
import LiveProtectedContent from './LiveProtectedContent';
import './livePractice.css';
import './liveMock.css';

const countdown=seconds=>{
 const n=Math.max(0,Math.ceil(seconds||0));
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');
};
const errorMessage=e=>e?.message||'Mock Exam request failed.';

export default function LiveSelectedMockExam({db,user,course,access}){
 const [readiness,setReadiness]=useState(null),[readyError,setReadyError]=useState('');
 const [attempt,setAttempt]=useState(null),[at,setAt]=useState(0),[now,setNow]=useState(Date.now());
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [accepted,setAccepted]=useState(false),[navigatorOpen,setNavigatorOpen]=useState(false);
 const activeCall=useRef(false),closing=useRef(false),ref=useRef(null);
 const sessionKey=useMemo(()=>`technica-p34-selected-mock:${user.id}:${course.id}`,[user.id,course.id]);
 const leaveAttempt=async id=>{
  closing.current=true;setAttempt(null);setAt(0);
  localStorage.removeItem(sessionKey);localStorage.removeItem(sessionKey+':pending');
  if(!id)return;
  localStorage.setItem(sessionKey+':closing',id);
  try{
   await abandonSelectedMock(db,id);
   localStorage.removeItem(sessionKey+':closing');
  }catch{
   setMessage('Exam questions hidden. Server closure needs a connection to complete.');
  }
 };
 const {leaveIntentionally}=useQuestionFullscreenGuard({
  active:attempt?.state==='in_progress',targetRef:ref,
  onUnexpectedExit:()=>{
   const id=attempt?.attemptId;
   void leaveAttempt(id);
   void leaveQuestionFullscreen(document);
   setMessage('Fullscreen or tab access was lost. This Mock has been closed.');
  }
 });
 // P72: The bank is always server-sourced. Re-check when the learner returns
 // to this tab/window, without a manual refresh button or demo placeholders.
 useEffect(()=>{
  let alive=true,inFlight=false;
  setReadiness(null);setReadyError('');
  if(!access)return;
  const reload=()=>{
   if(document.visibilityState==='hidden'||inFlight||activeCall.current)return;
   inFlight=true;
   getSelectedMockReadiness(db,course.id)
    .then(value=>{if(alive){setReadiness(value);setReadyError('');}})
    .catch(e=>{if(alive)setReadyError(errorMessage(e));})
    .finally(()=>{inFlight=false;});
  };
  const visible=()=>{if(document.visibilityState==='visible')reload();};
  reload();
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('focus',visible);
  return()=>{
   alive=false;
   document.removeEventListener('visibilitychange',visible);
   window.removeEventListener('focus',visible);
  };
 },[db,course.id,access]);
 useEffect(()=>{
  setAttempt(null);setAt(0);setAccepted(false);setError('');setMessage('');
  closing.current=false;
  // Reload exits native fullscreen. Never restore question snapshots from
  // browser storage. Retry idempotent server closure if network was lost.
  const id=localStorage.getItem(sessionKey+':closing')||
   localStorage.getItem(sessionKey);
  if(id){
   localStorage.setItem(sessionKey+':closing',id);
   localStorage.removeItem(sessionKey);
   void abandonSelectedMock(db,id)
    .then(()=>{localStorage.removeItem(sessionKey+':closing');})
    .catch(()=>setMessage('Prior Mock questions remain hidden; server closure is pending.'));
  }
 },[db,sessionKey]);
 useEffect(()=>{
  if(attempt?.state!=='in_progress')return;
  const id=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(id);
 },[attempt?.attemptId,attempt?.state]);
 const left=attempt?.state==='in_progress'?selectedMockSecondsLeft(attempt,now):0;
 useEffect(()=>{
  if(!attempt||attempt.state!=='in_progress'||left!==0||activeCall.current)return;
  activeCall.current=true;
  getSelectedMock(db,attempt.attemptId).then(next=>{
   if(!closing.current){
    setAttempt({...next,observedAtEpoch:Date.now()});
    if(next.state!=='in_progress')void leaveIntentionally();
   }
  }).catch(e=>{setError('Time expired. Score finalization requires a connection: '+errorMessage(e));setAttempt(null);})
   .finally(()=>{activeCall.current=false;});
 },[attempt?.attemptId,left,attempt?.state]);
  const begin=async()=>{
  if(activeCall.current||busy||!access||!readiness?.ready||!accepted)return;
  activeCall.current=true;setBusy(true);setError('');setMessage('');
  try{
   // User gesture starts native fullscreen BEFORE any backend request.
   const fullscreen=await requestQuestionFullscreen(ref.current);
   if(!fullscreen.ok){setError(fullscreenStartError(fullscreen));return;}
   closing.current=false;
   const pendingKey=sessionKey+':pending';
   let requestId=localStorage.getItem(pendingKey);
   if(!requestId){requestId=crypto.randomUUID();localStorage.setItem(pendingKey,requestId);}
   const payload=await startSelectedMock(db,course.id,requestId);
   if(!isFullscreenActive(document,ref.current)){
    void leaveAttempt(payload.attemptId);
    setMessage('Fullscreen exited. Mock questions remain closed.');
    return;
   }
   localStorage.setItem(sessionKey,payload.attemptId);
   localStorage.removeItem(pendingKey);
   if(payload.state!=='in_progress'){setAttempt(payload);void leaveIntentionally();return;}
   setAttempt({...payload,observedAtEpoch:Date.now()});setAt(0);setNavigatorOpen(false);
  }catch(e){setError(errorMessage(e));void leaveQuestionFullscreen(document);}
  finally{setBusy(false);activeCall.current=false;}
 };
 const save=async(index,flag)=>{
  const q=attempt?.questions?.[at];
  if(!q||busy||activeCall.current||left<=0||!isFullscreenActive(document,ref.current))return;
  activeCall.current=true;setBusy(true);setError('');
  const selectedIndex=index,flagged=flag;
  try{
   await saveSelectedMock(db,attempt.attemptId,q.id,selectedIndex,flagged);
   if(!closing.current&&isFullscreenActive(document,ref.current)){
    setAttempt(old=>{
     if(!old||old.state!=='in_progress')return old;
     const questions=old.questions.map(item=>item.id===q.id
      ?{...item,selectedIndex,flagged}:item);
     return {...old,questions,
      answeredCount:questions.filter(item=>item.selectedIndex!==null).length,
      flaggedCount:questions.filter(item=>item.flagged).length};
    });
    setMessage('Answer/flag saved securely.');
   }
  }catch(e){setError(errorMessage(e));}
  finally{activeCall.current=false;setBusy(false);}
 };
 const submit=async()=>{
  if(!attempt||attempt.state!=='in_progress'||busy||activeCall.current)return;
  if(!window.confirm(`Submit your Mock Exam? ${attempt.questionCount-attempt.answeredCount} questions are unanswered. This cannot be undone.`))return;
  activeCall.current=true;setBusy(true);setError('');
  try{
   const outcome=await submitSelectedMock(db,attempt.attemptId);
   if(!closing.current){localStorage.removeItem(sessionKey);localStorage.removeItem(sessionKey+':pending');setAttempt(outcome);
    await leaveIntentionally();}
  }catch(e){setError(errorMessage(e));}
  finally{setBusy(false);activeCall.current=false;}
 };
 const active=attempt?.state==='in_progress';
 const q=active?attempt.questions?.[at]:null;
 const pending=access&&!readiness&&!readyError;
 const selectedCount=readiness?.selectedCount??0;
 const questionTarget=readiness?.requiredCount??200;
 const isReady=readiness?.ready===true;
 const completion=Math.min(100,Math.round(100*selectedCount/questionTarget));
 const statusText=pending?'Preparing exam…':
  readyError?'Unable to prepare the exam: '+readyError:
  readiness?.engineUpgradePending?'Course Mock activation is not yet available.':
  isReady?'Your exam is ready. Enter secure fullscreen to begin.':
  !selectedCount?'This exam is not available yet.':
  selectedCount>questionTarget?'This exam needs an update. Contact your instructor.':
  `${questionTarget-selectedCount} more saved Mock questions are needed to enable this exam.`;
 return <section ref={ref} className="live-practice live-mock" aria-label="Course Mock Exam">
  <header className="live-practice-top">
   <div><span className="live-eyebrow">YOUR VERIFIED COURSE ASSESSMENT</span>
    <h3><ShieldCheck size={21}/> Mock Exam · {course.title}</h3>
    <p>200 questions · 5-hour time limit · secure fullscreen exam.</p>
   </div>
   {active&&<button type="button" className="live-secondary" disabled={busy}
    onClick={()=>{void leaveAttempt(attempt.attemptId);void leaveIntentionally();}}>
    <LockKeyhole size={16}/> Exit &amp; close exam
   </button>}
  </header>
  {!access?<div className="live-practice-note"><LockKeyhole size={18}/> An active subscription is required to take this exam.</div>:
   !attempt?<div className="live-mock-setup">
    <div className={'live-mock-readiness '+(isReady?'is-ready':readyError?'is-error':'is-pending')}
     role="status" aria-live="polite">
     <div className="live-mock-readiness-main">
      <div className="live-mock-readiness-icon" aria-hidden="true">
       {isReady?<CheckCircle2 size={24}/>:readyError?<AlertTriangle size={24}/>:<ShieldCheck size={24}/>}
      </div>
      <div className="live-mock-readiness-copy">
       <span className="live-mock-readiness-eyebrow">EXAM STATUS</span>
       <strong>{pending?'Checking questions…':selectedCount+' / '+questionTarget+' questions selected'}</strong>
       <p>{statusText}</p>
      </div>
     </div>
     <div className="live-mock-readiness-duration" aria-label="Five-hour exam duration">
      <Clock3 size={19}/><strong>5 hours</strong><span>Fixed duration</span>
     </div>
     <div className="live-mock-readiness-track" aria-hidden="true">
      <span style={{width:completion+'%'}}/>
     </div>
    </div>
    <label className="live-mock-accept"><input type="checkbox" checked={accepted}
     onChange={e=>setAccepted(e.target.checked)}/>
     <span>I understand this exam lasts 5 hours. Answers are saved securely, and leaving fullscreen or hiding this tab closes the attempt.</span>
    </label>
    <button type="button" className="live-mock-start" disabled={busy||!access||!accepted||!isReady}
     onClick={begin} aria-label={busy?'Preparing Mock Exam':'Start Mock Exam'}>
     <span className="live-mock-start-icon"><PlayCircle size={23}/></span>
     <span className="live-mock-start-label">
      <strong>{busy?'Preparing your exam…':'Start Mock Exam'}</strong>
      <small>200 questions <span aria-hidden="true">·</span> 5 hours <span aria-hidden="true">·</span> Secure fullscreen</small>
     </span>
     <ArrowRight size={20} className="live-mock-start-arrow"/>
    </button>
    {message&&<p className="live-mock-session-notice" role="status">
     <AlertTriangle size={16}/>{message}</p>}
   </div>:
   attempt.state!=='in_progress'?<div className="live-mock-result" role="status">
    <CheckCircle2 size={32}/><h3>{attempt.state==='expired'?'Time expired':'Mock completed'}</h3>
    <p>{attempt.state==='abandoned'?'This attempt was closed without a grade.':
     `Your result: ${attempt.correctCount} / ${attempt.questionCount} correct · ${attempt.scorePercent}%.`}</p>
    <p>Question content and answer keys remain private after submission.</p>
    <button type="button" className="live-secondary" onClick={()=>{setAttempt(null);setAt(0);setAccepted(false);setMessage('');setReadiness(null);
      getSelectedMockReadiness(db,course.id).then(setReadiness).catch(e=>setReadyError(errorMessage(e)));}}>
     <ArrowLeft size={16}/> Return to exam setup
    </button>
   </div>:<LiveProtectedContent as="div" className="live-mock-protected-surface"
    kind="mock-exam-surface" identity={{id:user.id}}>
    <div className="live-attempt-bar"><b>Mock Exam</b>
     <span><Clock3 size={16}/>{countdown(left)} remaining</span>
     <span>{attempt.answeredCount} / {attempt.questionCount} answered</span>
     <span>{attempt.flaggedCount} flagged</span>
     {message&&<small role="status">{message}</small>}
    </div>
    <div className="live-mock-exam-layout">
     <div className="live-mock-exam-main">
      {q&&<div className="live-question">
       <div className="live-question-label">QUESTION {at+1} OF {attempt.questionCount}</div>
       <h4>{q.prompt}</h4>
       <div className="live-answer-list">
        {q.options.map((option,i)=><button type="button" key={i}
         className={`live-answer ${q.selectedIndex===i?'chosen':''}`}
         aria-pressed={q.selectedIndex===i} disabled={busy||left===0}
         onClick={()=>save(i,q.flagged)}><b>{String.fromCharCode(65+i)}</b>
          <span>{option}</span>{q.selectedIndex===i&&<CheckCircle2 size={18}/>}
         </button>)}
       </div>
       <div className="live-mock-actions">
        <button type="button" className={`live-mock-action-flag ${q.flagged?'is-flagged':''}`}
         aria-pressed={q.flagged} disabled={busy||left===0}
         onClick={()=>save(q.selectedIndex,!q.flagged)}>
         <Flag size={16}/>{q.flagged?'Flagged for review':'Flag for review'}
        </button>
        <button type="button" className="live-mock-action-clear"
         disabled={busy||left===0||q.selectedIndex===null}
         onClick={()=>save(null,q.flagged)}>Clear answer</button>
       </div>
      </div>}
      <div className="live-question-nav">
       <button type="button" className="live-mock-step live-mock-step-previous"
        disabled={busy||at===0} onClick={()=>setAt(n=>n-1)}>
        <ArrowLeft size={17}/> Previous
       </button>
       <span className="live-mock-step-position">{at+1} <span>of</span> {attempt.questionCount}</span>
       <button type="button" className="live-mock-step live-mock-step-next"
        disabled={busy||at===attempt.questionCount-1}
        onClick={()=>setAt(n=>n+1)}>Next question <ArrowRight size={17}/></button>
      </div>
     </div>
     <aside className="live-mock-sidebar" aria-label="Mock Exam question navigator">
      <div className="live-mock-sidebar-head">
       <div><span className="live-mock-sidebar-kicker">EXAM NAVIGATOR</span>
        <h4>Questions</h4></div>
       <span className="live-mock-sidebar-count">{attempt.questionCount}</span>
      </div>
      <div className="live-mock-sidebar-progress">
       <div><span>Completed</span><b>{attempt.answeredCount} / {attempt.questionCount}</b></div>
       <div className="live-mock-sidebar-track" role="progressbar" aria-label="Mock Exam questions answered"
        aria-valuemin={0} aria-valuemax={attempt.questionCount} aria-valuenow={attempt.answeredCount}>
        <span style={{width:100*attempt.answeredCount/attempt.questionCount+'%'}}/>
       </div>
      </div>
      <button type="button" className="live-mock-navigator-toggle"
       aria-expanded={navigatorOpen} aria-controls="live-mock-question-grid"
       onClick={()=>setNavigatorOpen(open=>!open)}>
       <LayoutGrid size={16}/> Jump to question <ChevronDown size={16} className={navigatorOpen?'is-open':''}/>
      </button>
      <div id="live-mock-question-grid"
       className={`live-mock-dots ${navigatorOpen?'is-open':''}`}
       role="navigation" aria-label="Choose Mock question">
       {attempt.questions.map((item,index)=><button type="button" key={item.id}
        aria-label={`Question ${index+1}${item.selectedIndex!==null?', answered':''}${item.flagged?', flagged':''}`}
        aria-current={at===index?'step':undefined}
        className={`${at===index?'current ':''}${item.selectedIndex!==null?'answered ':''}${item.flagged?'flagged':''}`}
        disabled={busy||left===0} onClick={()=>{setAt(index);setNavigatorOpen(false);}}>
        {index+1}</button>)}
      </div>
      <div className="live-mock-sidebar-legend" aria-label="Question status legend">
       <span><i className="current"/>Current</span>
       <span><i className="answered"/>Answered</span>
       <span><i className="flagged"/>Flagged</span>
      </div>
      <button type="button" className="live-mock-submit" disabled={busy||left===0}
       onClick={submit}>
       <span className="live-mock-submit-icon"><Send size={18}/></span>
       <span><strong>{busy?'Please wait…':'Submit Mock Exam'}</strong>
        <small>Review and confirm submission</small></span>
       <ArrowRight size={18}/>
      </button>
     </aside>
    </div>
   </LiveProtectedContent>}
  {error&&<p className="live-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
 </section>;
}
