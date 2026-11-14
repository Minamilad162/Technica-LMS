import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Calculator,ArrowRight,Camera,Check,ChevronLeft,ChevronRight,Clock3,Eye,Flag,LockKeyhole,PlayCircle,ShieldCheck,Target,TriangleAlert} from 'lucide-react';
import BuildYourOwnSettings from './BuildYourOwnSettings.jsx';
import ScientificCalculator from '../components/ScientificCalculator.jsx';
import ExamQuestionNavigator from './ExamQuestionNavigator.jsx';
import {practiceQuestionOutcome} from './practiceQuestionReview.js';
import {DEFAULT_BUILD_YOUR_OWN,prepareBuildYourOwn,remainingQuestionSeconds} from './buildYourOwnConfig.js';
import {abandonSecurePractice,answerConfiguredPractice,finishSecurePractice,
 nextConfiguredPractice,practiceSessionKey,safeRemainingSeconds,startConfiguredPractice,startAllCoursesConfiguredPractice} from './practiceApi.js';
import {fullscreenStartError,leaveQuestionFullscreen} from '../lib/questionFullscreen.js';
import {isPracticePresentationActive,startPracticePresentation} from '../lib/practicePresentation.js';
import {useQuestionFullscreenGuard} from '../lib/useQuestionFullscreenGuard.js';
import LiveProtectedContent from './LiveProtectedContent.jsx';
import './liveBuildYourOwn.css';

const formatTime=seconds=>{
 const n=Math.max(0,Math.floor(seconds||0));
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60]
  .filter((_,i)=>i!==0||n>=3600)
  .map(v=>String(v).padStart(2,'0')).join(':');
};
const message=e=>e?.message||'Unable to complete your practice request.';

export default function LiveBuildYourOwn({db,user,course,domains=[],access}){
 const [settings,setSettings]=useState(()=>({...DEFAULT_BUILD_YOUR_OWN}));
 const [attempt,setAttempt]=useState(null),[feedback,setFeedback]=useState({});
 const [reviewIndex,setReviewIndex]=useState(0),[busy,setBusy]=useState(false);
 const [inspectedPosition,setInspectedPosition]=useState(null),[flaggedQuestions,setFlaggedQuestions]=useState({});
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[clock,setClock]=useState(Date.now());
 const processing=useRef(false),closing=useRef(false),rootRef=useRef(null);
 const streamRef=useRef(null),attemptRef=useRef(null);
 const storageKey=useMemo(()=>practiceSessionKey(user.id,course.id)+':configured',[user.id,course.id]);
 const stopCamera=()=>{
  const stream=streamRef.current;
  streamRef.current=null;
  stream?.getTracks()?.forEach(track=>track.stop());
 };
 const close=async id=>{
  if(closing.current)return;
  closing.current=true;
  const target=id||attemptRef.current?.attemptId;
  setAttempt(null);attemptRef.current=null;setFeedback({});setReviewIndex(0);setInspectedPosition(null);setFlaggedQuestions({});
  stopCamera();
  localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
  if(!target)return;
  const key=storageKey+':closing';
  localStorage.setItem(key,target);
  try{await abandonSecurePractice(db,target);localStorage.removeItem(key);}
  catch{setNotice('Session closed locally. Server closure will retry when your connection returns.');}
 };
 const presentation=useRef(null);
 const {leaveIntentionally}=useQuestionFullscreenGuard({
  active:!!attempt&&attempt.state==='in_progress',
  requireFullscreen:presentation.current!=='focused',
  targetRef:rootRef,
  onUnexpectedExit:()=>{
   const id=attemptRef.current?.attemptId;
   void close(id);
   void leaveQuestionFullscreen(document);
   setNotice('Your practice session has been closed.');
  }
 });
 useEffect(()=>{
  let alive=true;
  const key=storageKey+':closing';
  let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  const id=localStorage.getItem(key)||saved?.attemptId;
  if(id&&access){
   localStorage.removeItem(storageKey);
   localStorage.setItem(key,id);
   void abandonSecurePractice(db,id).then(()=>{if(alive)localStorage.removeItem(key);})
    .catch(()=>{if(alive)setNotice('Previous question session was closed on this device. Server closure will retry.');});
  }
  return()=>{
   alive=false;
   streamRef.current?.getTracks()?.forEach(track=>track.stop());
   if(attemptRef.current?.state==='in_progress')
    void abandonSecurePractice(db,attemptRef.current.attemptId).catch(()=>{});
  };
 },[db,storageKey,access]);
 const attachCameraPreview=useCallback(video=>{
  if(video&&streamRef.current){
   video.srcObject=streamRef.current;
   void video.play().catch(()=>{});
  }
 },[]);
 const finished=!!attempt&&attempt.state!=='in_progress';
 const currentPosition=attempt?.currentPosition||1;
 const displayPosition=finished?reviewIndex+1:(inspectedPosition||currentPosition);
 const isCurrentQuestion=finished||displayPosition===currentPosition;
 const current=finished?attempt?.questions?.[reviewIndex]||null:
  attempt?.questions?.find(q=>q.position===displayPosition)||null;
 const totalRemaining=safeRemainingSeconds(attempt,clock);
 const perQuestionRemaining=remainingQuestionSeconds(attempt,clock);
 const answered=attempt?.questions?.filter(q=>q.selectedIndex!==null&&q.selectedIndex!==undefined).length||0;
 const marked=attempt?.feedbackTiming==='each'?feedback[current?.id]:null;
 const revealed=finished?current:marked;
 const wasAnswered=current?.selectedIndex!==null&&current?.selectedIndex!==undefined;
 const deliveredPositions=attempt?.questions?.filter(q=>Number.isInteger(q?.position)&&typeof q.prompt==='string'&&q.prompt.length>0)
  .map(q=>q.position).sort((a,b)=>a-b)||[];
 const previousPosition=[...deliveredPositions].reverse().find(n=>n<displayPosition);
 const nextVisitedPosition=deliveredPositions.find(n=>n>displayPosition);
 const goPrevious=()=>{
  if(finished){setReviewIndex(i=>Math.max(0,i-1));return;}
  if(previousPosition!==undefined)setInspectedPosition(previousPosition);
 };
 const goNext=()=>{
  if(finished){setReviewIndex(i=>Math.min((attempt?.questions?.length||1)-1,i+1));return;}
  if(!isCurrentQuestion){setInspectedPosition(nextVisitedPosition===currentPosition||nextVisitedPosition===undefined?null:nextVisitedPosition);return;}
  void advance();
 };
 useEffect(()=>{
  if(!attempt||finished||(!attempt.deadlineAt&&!attempt.questionDeadlineAt))return;
  const tick=setInterval(()=>setClock(Date.now()),1000);
  return()=>clearInterval(tick);
 },[attempt?.attemptId,attempt?.deadlineAt,attempt?.questionDeadlineAt,finished]);
 const start=async()=>{
  if(processing.current||!access)return;
  let config;
  try{config=prepareBuildYourOwn(settings);}
  catch(e){setError(message(e));return;}
  processing.current=true;setBusy(true);setError('');setNotice('');
  try{
   const fullscreen=await startPracticePresentation(rootRef.current);
   if(!fullscreen.ok)throw Error(fullscreenStartError(fullscreen));
   presentation.current=fullscreen.mode;
   if(config.camera){
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Your browser cannot access a camera. Turn off Camera preview to continue.');
    try{streamRef.current=await navigator.mediaDevices.getUserMedia({
     audio:false,video:{facingMode:'user'}
    });}catch{throw Error('Camera permission was denied or the camera is unavailable. Turn off Camera preview to continue.');}
   }
   let requestId=localStorage.getItem(storageKey+':pending');
   if(!requestId){requestId=crypto.randomUUID();localStorage.setItem(storageKey+':pending',requestId);}
   closing.current=false;
   const next=course.id==='all'?await startAllCoursesConfiguredPractice(db,{requestId,...config}):
    await startConfiguredPractice(db,{courseId:course.id,requestId,...config});
   if(!isPracticePresentationActive(rootRef.current,presentation.current)){
    void close(next.attemptId);throw Error('Practice was interrupted while preparing questions. Session closed.');
   }
   if(next.state!=='in_progress')throw Error('This practice session is no longer active. Start a new one.');
   localStorage.setItem(storageKey,JSON.stringify({attemptId:next.attemptId}));
   localStorage.removeItem(storageKey+':pending');
   const fresh={...next,observedAtEpoch:Date.now()};
   attemptRef.current=fresh;setAttempt(fresh);setReviewIndex(0);setInspectedPosition(null);setFlaggedQuestions({});setFeedback({});
  }catch(e){
   setError(message(e));stopCamera();void leaveQuestionFullscreen(document);
  }finally{processing.current=false;setBusy(false);}
 };
 const finish=async(early=false)=>{
  const original=attemptRef.current;
  if(!original||processing.current)return;
  if(early&&!window.confirm('Finish this practice now? Unanswered questions will count as incorrect.'))return;
  processing.current=true;setBusy(true);setError('');
  try{
   const result=await finishSecurePractice(db,original.attemptId);
   if(closing.current)return;
   stopCamera();
   const next={...result,observedAtEpoch:Date.now()};
   attemptRef.current=next;setAttempt(next);setReviewIndex(0);
   localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
   setNotice('Your answers have been scored and saved securely.');
  }catch(e){setError(message(e));}
  finally{processing.current=false;setBusy(false);}
 };
 const answer=async(index)=>{
  if(!attempt||finished||!current||!isCurrentQuestion||busy||processing.current||wasAnswered||
   totalRemaining===0||perQuestionRemaining===0)return;
  processing.current=true;setBusy(true);setError('');
  try{
   const result=await answerConfiguredPractice(db,attempt.attemptId,current.id,index);
   if(closing.current||!isPracticePresentationActive(rootRef.current,presentation.current))return;
   const next={...result,observedAtEpoch:Date.now()};
   attemptRef.current=next;setAttempt(next);
   if(result.feedback?.questionId===current.id)
    setFeedback(old=>({...old,[current.id]:result.feedback}));
  }catch(e){setError(message(e));}
  finally{processing.current=false;setBusy(false);}
 };
 const advance=async()=>{
  if(!attempt||finished||busy||processing.current||totalRemaining===0)return;
  processing.current=true;setBusy(true);setError('');
  try{
   const result=await nextConfiguredPractice(db,attempt.attemptId);
   if(closing.current||!isPracticePresentationActive(rootRef.current,presentation.current))return;
   const next={...result,observedAtEpoch:Date.now()};
   attemptRef.current=next;setAttempt(next);setInspectedPosition(null);
   if(next.state!=='in_progress'){
    stopCamera();setReviewIndex(0);
    localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
    setNotice('Your practice result is ready.');
   }
  }catch(e){setError(message(e));}
  finally{processing.current=false;setBusy(false);}
 };
 useEffect(()=>{
  if(!attempt||finished||processing.current||busy)return;
  if(totalRemaining===0){void finish();return;}
  if(perQuestionRemaining===0){void advance();}
 },[attempt?.attemptId,attempt?.currentPosition,totalRemaining,perQuestionRemaining,finished,busy]);
 const restart=()=>{
  stopCamera();
  void leaveIntentionally();
  closing.current=false;attemptRef.current=null;setAttempt(null);
  setFeedback({});setReviewIndex(0);setInspectedPosition(null);setFlaggedQuestions({});setError('');setNotice('');
  localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
 };
 return <section ref={rootRef} className="byo-session" data-practice-presentation={attempt?presentation.current:undefined} aria-label="Build Your Own secured Practice">
  {!access?<div className="live-empty"><LockKeyhole size={23}/>Practice access is unavailable.</div>:
  !attempt?<div className="byo-setup">
   <BuildYourOwnSettings value={settings}
     onChange={next=>{setSettings(next);setError('');setNotice('');}} domains={domains}
    onStart={()=>void start()} busy={busy} access={access}/>
  </div>:<LiveProtectedContent key={finished?"review":attempt.attemptId}
   kind="practice-session-surface" requireFullscreen={!finished&&presentation.current!=='focused'} identity={{id:user.id}}>
   <header className="byo-session-bar">
    <div className="byo-progress-group"><span className="byo-session-kicker">BUILD YOUR OWN</span>
     <strong>{finished?'Practice complete':'Question '+currentPosition+' of '+attempt.questionCount}</strong>
     <small>{answered}/{attempt.questionCount} answered</small>
    </div>
    <button type="button" className="tc-exam-calc-trigger"
     onClick={()=>window.dispatchEvent(new Event('technica:calculator-open'))}
     aria-label="Open floating scientific calculator"><Calculator size={17}/> Calculator</button>
    <div className="byo-clocks">
     {totalRemaining!==null&&!finished&&<span><Clock3 size={17}/><b>{formatTime(totalRemaining)}</b><small>Test remaining</small></span>}
     {perQuestionRemaining!==null&&!finished&&<span className={perQuestionRemaining<=10?'urgent':''}>
      <Clock3 size={17}/><b>{formatTime(perQuestionRemaining)}</b><small>Question remaining</small></span>}
     {finished&&<span className="byo-score"><Target size={17}/>
      <b>{attempt.scorePercent}%</b><small>{attempt.correctCount}/{attempt.questionCount} correct</small></span>}
    </div>
    <button type="button" className="live-secondary" onClick={()=>{
     if(finished)restart();else if(window.confirm('Leave Practice? This session will close and cannot resume.')){
      void close(attempt.attemptId);void leaveIntentionally();
     }
    }}>{finished?'Close review':'Leave session'}</button>
   </header>
   {attempt.cameraEnabled&&!finished&&<div className="byo-camera-preview">
    <Camera size={15}/><span>Local camera preview · not recorded</span>
    <video ref={attachCameraPreview} autoPlay muted playsInline aria-label="Your optional camera preview"/>
   </div>}
   <ScientificCalculator context="Build Your Own Practice" inline
    currentQuestion={displayPosition} questionCount={attempt.questionCount}/>
   <div className="tc-exam-workbench"><div className="tc-exam-workbench-main">
   {current&&<div className="live-question byo-question">
    <span className="live-question-label">QUESTION {displayPosition} OF {attempt.questionCount}</span>
    <h4>{current.prompt}</h4>
    <div className="live-answer-list">{current.options.map((option,index)=>{
     const chosen=current.selectedIndex===index;
     const correct=typeof revealed?.correctIndex==='number'&&revealed.correctIndex===index;
     const incorrect=chosen&&typeof revealed?.correctIndex==='number'&&!correct;
     return <button type="button" key={index}
      disabled={finished||busy||!isCurrentQuestion||wasAnswered||totalRemaining===0||perQuestionRemaining===0}
      onClick={()=>void answer(index)}
      className={'live-answer '+(chosen?'chosen ':'')+(correct?'correct ':'')+(incorrect?'incorrect':'')}>
      <b>{String.fromCharCode(65+index)}</b><span>{String(option)}</span>{correct&&<Check size={17}/>}
     </button>;
    })}</div>
    {typeof revealed?.correctIndex==='number'&&
     <div className="live-practice-feedback">
      <b>{current.selectedIndex===revealed.correctIndex?'Correct answer':'Answer review'}</b>
      <p>{revealed.explanation||'No explanation available for this question.'}</p>
     </div>}
   </div>}
   {current&&!finished&&<div className="tc-exam-question-tools">
    <button type="button" className={"tc-exam-flag "+(flaggedQuestions[current.id]?"is-flagged":"")}
     aria-pressed={!!flaggedQuestions[current.id]}
     onClick={()=>setFlaggedQuestions(flags=>({...flags,[current.id]:!flags[current.id]}))}>
     <Flag size={17}/>{flaggedQuestions[current.id]?"Flagged for review":"Flag for review"}
    </button>
   </div>}
   {finished?<div className="byo-finish-area">
    <div className="byo-result">
     <h3>Your practice results</h3>
     <p>{attempt.correctCount} correct of {attempt.questionCount} requested questions · {attempt.scorePercent}%</p>
    </div>
    <nav className="byo-navigation" aria-label="Review questions">
     <button type="button" className="live-secondary" disabled={reviewIndex===0}
      onClick={()=>setReviewIndex(n=>Math.max(0,n-1))}><ChevronLeft size={16}/> Previous</button>
     <span>{reviewIndex+1} / {attempt.questions.length}</span>
     <button type="button" className="live-secondary" disabled={reviewIndex>=attempt.questions.length-1}
      onClick={()=>setReviewIndex(n=>Math.min(attempt.questions.length-1,n+1))}>Next <ChevronRight size={16}/></button>
    </nav>
    <button type="button" className="live-primary" onClick={restart}>Build another practice</button>
   </div>:<nav className="byo-navigation byo-question-nav" aria-label="Practice question navigation">
    <button className="live-secondary" type="button" disabled={busy||previousPosition===undefined}
     onClick={goPrevious}><ChevronLeft size={16}/> Previous</button>
    <span>{displayPosition} of {attempt.questionCount}</span>
    <button className="live-primary" type="button" disabled={busy||totalRemaining===0}
     onClick={goNext}>{!isCurrentQuestion?'Next':currentPosition>=attempt.questionCount?'Finish & review':
       wasAnswered?'Next question':'Skip question'} <ChevronRight size={16}/></button>
    <button className="live-secondary byo-finish-early" type="button" disabled={busy}
     onClick={()=>void finish(true)}>Finish early</button>
   </nav>}
   </div>
   <ExamQuestionNavigator questions={attempt.questions} total={attempt.questionCount}
    currentIndex={displayPosition-1} isFlagged={q=>!!flaggedQuestions[q.id]}
    showOutcomes={finished||attempt.feedbackTiming==='each'}
    getOutcome={q=>practiceQuestionOutcome({question:q,feedback:feedback[q.id],
     feedbackTiming:attempt.feedbackTiming,finished})}
    canVisit={(q,i)=>finished||(i+1<=currentPosition&&typeof q.prompt==='string'&&q.prompt.length>0)}
    onJump={i=>finished?setReviewIndex(i):setInspectedPosition(i+1===currentPosition?null:i+1)}
    disabled={busy}/>
   </div>
  </LiveProtectedContent>}
  {error&&<p className="live-error" role="alert"><TriangleAlert size={17}/>{error}</p>}
  {notice&&<p className="live-notice" role="status">{notice}</p>}
 </section>;
}
