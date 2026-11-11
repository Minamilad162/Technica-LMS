import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Clock3,Flag,LockKeyhole,PlayCircle,RefreshCw,Send,ShieldCheck} from 'lucide-react';
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
 const [accepted,setAccepted]=useState(false);
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
 useEffect(()=>{
  let alive=true;
  setReadiness(null);setReadyError('');
  if(!access)return;
  getSelectedMockReadiness(db,course.id).then(x=>{if(alive)setReadiness(x);})
   .catch(e=>{if(alive)setReadyError(errorMessage(e));});
  return()=>{alive=false;};
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
 const refreshReadiness=()=>{
  setReadiness(null);setReadyError('');
  getSelectedMockReadiness(db,course.id).then(setReadiness).catch(e=>setReadyError(errorMessage(e)));
 };
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
   setAttempt({...payload,observedAtEpoch:Date.now()});setAt(0);
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
 return <section ref={ref} className="live-practice live-mock" aria-label="Course Mock Exam">
  <header className="live-practice-top">
   <div><span className="live-eyebrow">SAVED COURSE QUESTION BANK · FIXED MOCK</span>
    <h3><ShieldCheck size={21}/> Mock Exam · {course.title}</h3>
    <p>Exactly 200 saved Mock questions · fixed 300 minutes · secure grading · excluded from Practice.</p>
   </div>
   {active&&<button type="button" className="live-secondary" disabled={busy}
    onClick={()=>{void leaveAttempt(attempt.attemptId);void leaveIntentionally();}}>
    <LockKeyhole size={16}/> Exit &amp; close exam
   </button>}
  </header>
  {!access?<div className="live-practice-note"><LockKeyhole size={18}/> Paid/manual ASP enrollment or verified Admin access is required.</div>:
   !attempt?<div className="live-mock-setup">
    <div className="live-mock-stats"><div><b>{readiness?.selectedCount??'–'} / 200</b><span>Saved Mock questions</span></div>
     <div><b>05:00</b><span>Hours</span></div>
     <div><b>Server</b><span>Grading &amp; timer</span></div></div>
    <p className="live-practice-note"><AlertTriangle size={17}/>
     {pending?'Reading saved Mock selections for this Course…':
      readyError?'Not available: '+readyError:
      readiness?.ready?'Exactly 200 saved Mock questions are ready for the 5-hour exam.':
      !readiness?.selectedCount?'No saved Mock questions for this Course yet.':
      readiness.selectedCount>200
       ?`Too many Mock questions: uncheck ${readiness.selectedCount-200} and save in the Question Bank.`
       :`${readiness.selectedCount} of 200 Mock questions selected. ${200-readiness.selectedCount} more needed before the exam can start.`}
    </p>
    {readiness?.engineUpgradePending&&<p className="live-practice-note" role="status">
      Saved selections are visible, but the fixed-200 server gate still needs activation. This exam cannot start until it is installed.</p>}
    <button type="button" className="live-secondary" disabled={busy||pending} onClick={refreshReadiness}>
     <RefreshCw size={15}/> Refresh Mock questions</button>
    <label className="live-mock-accept"><input type="checkbox" checked={accepted}
     onChange={e=>setAccepted(e.target.checked)}/>
     I understand the exam is 300 minutes, my answers are autosaved on the server,
     and leaving fullscreen or hiding the tab closes this attempt.</label>
    <button type="button" className="live-primary" disabled={busy||!accepted||!readiness?.ready}
     onClick={begin}><PlayCircle size={18}/> {busy?'Starting…':'Start Mock Exam'}</button>
    {message&&<p className="live-practice-note" role="status">{message}</p>}
   </div>:
   attempt.state!=='in_progress'?<div className="live-mock-result" role="status">
    <CheckCircle2 size={32}/><h3>{attempt.state==='expired'?'Time expired':'Mock completed'}</h3>
    <p>{attempt.state==='abandoned'?'This attempt was closed without a grade.':
     `Your result: ${attempt.correctCount} / ${attempt.questionCount} correct · ${attempt.scorePercent}%.`}</p>
    <p>Question content and answer keys remain private after submission.</p>
    <button type="button" className="live-secondary" onClick={()=>{setAttempt(null);setAt(0);setAccepted(false);setMessage('');setReadiness(null);
      getSelectedMockReadiness(db,course.id).then(setReadiness).catch(e=>setReadyError(errorMessage(e)));}}>
     <RefreshCw size={16}/> Return to exam setup
    </button>
   </div>:<>
    <div className="live-attempt-bar"><b>Mock Exam</b>
     <span><Clock3 size={16}/>{countdown(left)} remaining</span>
     <span>{attempt.answeredCount} / {attempt.questionCount} answered</span>
     <span>{attempt.flaggedCount} flagged</span>
     {message&&<small role="status">{message}</small>}
    </div>
    {q&&<LiveProtectedContent as="div" className="live-question" kind="exam-question"
     identity={{id:user.id}}>
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
      <button type="button" className="live-secondary" disabled={busy||left===0}
       onClick={()=>save(q.selectedIndex,!q.flagged)}><Flag size={17}/>
        {q.flagged?'Unflag question':'Flag for review'}
       </button>
      <button type="button" className="live-secondary" disabled={busy||left===0||q.selectedIndex===null}
       onClick={()=>save(null,q.flagged)}>Clear answer</button>
     </div>
    </LiveProtectedContent>}
    <div className="live-question-nav">
     <button type="button" className="live-secondary" disabled={busy||at===0}
      onClick={()=>setAt(n=>n-1)}><ArrowLeft size={16}/> Previous</button>
     <button type="button" className="live-secondary" disabled={busy||at===attempt.questionCount-1}
      onClick={()=>setAt(n=>n+1)}>Next <ArrowRight size={16}/></button>
    </div>
    <div className="live-mock-dots" role="navigation" aria-label="Choose Mock question">
     {attempt.questions.map((item,index)=><button type="button" key={item.id}
      aria-label={`Question ${index+1}${item.flagged?', flagged':''}`}
      aria-current={at===index?'step':undefined}
      className={`${at===index?'current ':''}${item.selectedIndex!==null?'answered ':''}${item.flagged?'flagged':''}`}
      onClick={()=>setAt(index)}>{index+1}</button>)}
    </div>
    <button type="button" className="live-primary live-mock-submit" disabled={busy}
     onClick={submit}><Send size={17}/> Review &amp; submit exam</button>
   </>}
  {error&&<p className="live-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
 </section>;
}
