import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Calculator,AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Clock3,Flag,LockKeyhole,PlayCircle,RefreshCw,Send,ShieldCheck} from 'lucide-react';
import {abandonOfficialMock,getMockReadiness,getOfficialMock,officialMockSecondsLeft,
 saveOfficialMock,startOfficialMock,submitOfficialMock} from './mockApi.js';
import {requestQuestionFullscreen,isFullscreenActive,fullscreenStartError,leaveQuestionFullscreen} from '../lib/questionFullscreen';
import {useQuestionFullscreenGuard} from '../lib/useQuestionFullscreenGuard';
import LiveProtectedContent from './LiveProtectedContent';
import ScientificCalculator from '../components/ScientificCalculator.jsx';
import ExamQuestionNavigator from './ExamQuestionNavigator.jsx';
import './livePractice.css';
import './liveMock.css';

const countdown=seconds=>{
 const n=Math.max(0,Math.ceil(seconds||0));
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');
};
const errorMessage=e=>e?.message||'ASP Mock Exam request failed.';

export default function LiveMockExam({db,user,course,access}){
 const [readiness,setReadiness]=useState(null),[readyError,setReadyError]=useState('');
 const [attempt,setAttempt]=useState(null),[at,setAt]=useState(0),[now,setNow]=useState(Date.now());
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [accepted,setAccepted]=useState(false);
 const activeCall=useRef(false),closing=useRef(false),ref=useRef(null);
 const sessionKey=useMemo(()=>`technica-p10-mock:${user.id}:${course.id}`,[user.id,course.id]);
 const leaveAttempt=async id=>{
  closing.current=true;setAttempt(null);setAt(0);
  localStorage.removeItem(sessionKey);localStorage.removeItem(sessionKey+':pending');
  if(!id)return;
  localStorage.setItem(sessionKey+':closing',id);
  try{
   await abandonOfficialMock(db,id);
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
  getMockReadiness(db,course.id).then(x=>{if(alive)setReadiness(x);})
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
   void abandonOfficialMock(db,id)
    .then(()=>{localStorage.removeItem(sessionKey+':closing');})
    .catch(()=>setMessage('Prior Mock questions remain hidden; server closure is pending.'));
  }
 },[db,sessionKey]);
 useEffect(()=>{
  if(attempt?.state!=='in_progress')return;
  const id=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(id);
 },[attempt?.attemptId,attempt?.state]);
 const left=attempt?.state==='in_progress'?officialMockSecondsLeft(attempt,now):0;
 useEffect(()=>{
  if(!attempt||attempt.state!=='in_progress'||left!==0||activeCall.current)return;
  activeCall.current=true;
  getOfficialMock(db,attempt.attemptId).then(next=>{
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
   const payload=await startOfficialMock(db,course.id,requestId);
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
   await saveOfficialMock(db,attempt.attemptId,q.id,selectedIndex,flagged);
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
  if(!window.confirm(`Submit the ASP Mock? ${200-attempt.answeredCount} questions are unanswered. This cannot be undone.`))return;
  activeCall.current=true;setBusy(true);setError('');
  try{
   const outcome=await submitOfficialMock(db,attempt.attemptId);
   if(!closing.current){localStorage.removeItem(sessionKey);localStorage.removeItem(sessionKey+':pending');setAttempt(outcome);
    await leaveIntentionally();}
  }catch(e){setError(errorMessage(e));}
  finally{setBusy(false);activeCall.current=false;}
 };
 const active=attempt?.state==='in_progress';
 const q=active?attempt.questions?.[at]:null;
 const pending=access&&!readiness&&!readyError;
 return <section ref={ref} className="live-practice live-mock" aria-label="Official ASP Mock Exam">
  <header className="live-practice-top">
   <div><span className="live-eyebrow">P10 · OFFICIAL ASP MOCK EXAM</span>
    <h3><ShieldCheck size={21}/> ASP Mock Exam</h3>
    <p>200 fixed questions · 300 minutes · server-owned answers and grading · no Practice question mixing.</p>
   </div>
   {active&&<button type="button" className="live-secondary" disabled={busy}
    onClick={()=>{void leaveAttempt(attempt.attemptId);void leaveIntentionally();}}>
    <LockKeyhole size={16}/> Exit &amp; close exam
   </button>}
  </header>
  {!access?<div className="live-practice-note"><LockKeyhole size={18}/> Paid/manual ASP enrollment or verified Admin access is required.</div>:
   !attempt?<div className="live-mock-setup">
    <div className="live-mock-stats"><div><b>200</b><span>Questions</span></div>
     <div><b>05:00</b><span>Hours</span></div>
     <div><b>Server</b><span>Grading &amp; timer</span></div></div>
    <p className="live-practice-note"><AlertTriangle size={17}/>
     {pending?'Checking private Mock form and secure exam engine…':
      readyError?'Not available: '+readyError:
      readiness?.ready?'The exclusive 200-question ASP form is verified and ready for a timed Mock.':
      `Mock is locked until exactly 200 reviewed questions are reserved in the private form. Verified: ${readiness?.verifiedReserved||0}/200.`}
    </p>
    <label className="live-mock-accept"><input type="checkbox" checked={accepted}
     onChange={e=>setAccepted(e.target.checked)}/>
     I understand the exam is 300 minutes, my answers are autosaved on the server,
     and leaving fullscreen or hiding the tab closes this attempt.</label>
    <button type="button" className="live-primary" disabled={busy||!accepted||!readiness?.ready}
     onClick={begin}><PlayCircle size={18}/> {busy?'Starting…':'Start official 5-hour Mock'}</button>
    {message&&<p className="live-practice-note" role="status">{message}</p>}
   </div>:
   attempt.state!=='in_progress'?<div className="live-mock-result" role="status">
    <CheckCircle2 size={32}/><h3>{attempt.state==='expired'?'Time expired':'Mock completed'}</h3>
    <p>{attempt.state==='abandoned'?'This attempt was closed without a grade.':
     `Your result: ${attempt.correctCount} / 200 correct · ${attempt.scorePercent}%.`}</p>
    <p>Question content and answer keys remain private after submission.</p>
    <button type="button" className="live-secondary" onClick={()=>{setAttempt(null);setAt(0);setAccepted(false);setMessage('');setReadiness(null);
      getMockReadiness(db,course.id).then(setReadiness).catch(e=>setReadyError(errorMessage(e)));}}>
     <RefreshCw size={16}/> Return to exam setup
    </button>
   </div>:<LiveProtectedContent kind="mock-exam-surface" identity={{id:user.id}}>
    <div className="live-attempt-bar"><b>ASP Official Mock</b>
     <span><Clock3 size={16}/>{countdown(left)} remaining</span>
     <span>{attempt.answeredCount} / 200 answered</span>
    <button type="button" className="tc-exam-calc-trigger"
     onClick={()=>window.dispatchEvent(new Event('technica:calculator-open'))}
     aria-label="Open floating scientific calculator"><Calculator size={17}/> Calculator</button>
     <span>{attempt.flaggedCount} flagged</span>
     {message&&<small role="status">{message}</small>}
    </div>
    <div className="tc-exam-workbench"><div className="tc-exam-workbench-main">
    {q&&<div className="live-question">
     <div className="live-question-label">QUESTION {at+1} OF 200</div>
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
    </div>}
    <div className="live-question-nav">
     <button type="button" className="live-secondary" disabled={busy||at===0}
      onClick={()=>setAt(n=>n-1)}><ArrowLeft size={16}/> Previous</button>
     <button type="button" className="live-secondary" disabled={busy||at===199}
      onClick={()=>setAt(n=>n+1)}>Next <ArrowRight size={16}/></button>
    </div>
    </div>
    <ExamQuestionNavigator questions={attempt.questions} total={attempt.questionCount}
      currentIndex={at} isFlagged={item=>!!item.flagged} disabled={busy||left===0}
      onJump={setAt}/>
   </div>
    <button type="button" className="live-primary live-mock-submit" disabled={busy}
     onClick={submit}><Send size={17}/> Review &amp; submit exam</button>
    <ScientificCalculator context="ASP Mock Exam" inline
    currentQuestion={at+1} questionCount={attempt.questionCount}
    canPrevious={at>0} onPrevious={()=>setAt(i=>Math.max(0,i-1))}
    onNext={()=>setAt(i=>Math.min(attempt.questionCount-1,i+1))}/>
   </LiveProtectedContent>}
  {error&&<p className="live-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
 </section>;
}
