import React,{useState,useEffect}from'react';
import{useNavigate}from'react-router-dom';
import{Bookmark,BookOpen,Layers3,Flag,ArrowRight,ArrowLeft,Check,Clock3,List,FileText,AlertCircle,AlertTriangle,X}from'lucide-react';
import{useDemo,timeString}from'../lib/store';
import{assessmentQuestions}from'../data/mock';
import{getUnansweredQuestionIds,getSkippedQuestionIds}from'../lib/quizNavigation';
import{Modal,MiniProgress}from'../components/UI';

export default function QuizPage({kind='assessment'}){
 const isPractice=kind==='practice';
 const{state,answer,jump,flag,saveQuestion,submit,notify}=useDemo();
 const navigate=useNavigate();
 const session=isPractice?state.practiceSession:state.assessmentSession;
 const questions=session?.questionSet||(isPractice?assessmentQuestions.slice(0,25):assessmentQuestions);
 const count=questions.length;
 const[showReview,setShowReview]=useState(false);
 const[showNav,setShowNav]=useState(false);
 const[showAllUnanswered,setShowAllUnanswered]=useState(false);
 const[remaining,setRemaining]=useState(null);
 const current=Math.min(session?.current||1,count);
 const q=questions[current-1];
 const selected=session?.answers?.[current];
 const unansweredIds=getUnansweredQuestionIds(count,session?.answers);
 const unansweredSet=new Set(unansweredIds);
 const skippedIds=getSkippedQuestionIds(count,session?.answers,session?.visitedQuestions);
 const attentionIds=new Set(showAllUnanswered?unansweredIds:skippedIds);
 const answered=count-unansweredIds.length;
 const flags=session?.flags||[];
 const duration=session?.durationSeconds;
 const timerMode=session?.timerMode||(isPractice?state.timerMode:'whole');

 useEffect(()=>{
  if(!session)return;
  if(duration===null||duration===undefined){setRemaining(null);return}
  function tick(){setRemaining(Math.max(0,duration-Math.floor((Date.now()-(timerMode==='per'?(session.questionStartedAt||session.startedAt):session.startedAt))/1000)))}
  tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
 },[session?.startedAt,session?.questionStartedAt,duration,timerMode]);

 useEffect(()=>{
  if(remaining===0&&session&&!session.submitted){
   // Time expiry is an automatic submission; learner-driven submission always receives the warning first.
   if(timerMode==='per'&&current<count){setRemaining(null);jump(kind,current+1)}
   else{submit(kind);navigate('/results')}
  }
 },[remaining,session?.current,timerMode]);

 if(!session||session.submitted)return <div className="empty-state"><h2>No active session</h2><p>Start a new {isPractice?'practice test':'assessment'} to answer questions.</p><button className="btn" onClick={()=>navigate(isPractice?'/practice':'/assessments')}>Go to setup <ArrowRight size={17}/></button></div>;

 function openReview(){
  if(unansweredIds.length)setShowAllUnanswered(true);
  setShowReview(true);setShowNav(false);
 }
 function doSubmit(){submit(kind);setShowReview(false);navigate('/results')}
 function next(){if(current===count)openReview();else jump(kind,current+1)}
 function goToQuestion(id){jump(kind,id);setShowNav(false)}
 function reviewMissing(id=unansweredIds[0]){if(id)goToQuestion(id);setShowReview(false)}

 return <div className="quiz-page page-enter">
  <div className="quiz-status"><div className="status-top"><strong>{session.courseName||'ASP Course'} · {isPractice?'Practice':'Assessment'} · Question {current} of {count}</strong><div className="quiz-progress"><MiniProgress value={Math.round(answered/count*100)}/></div><span className="status-detail">{answered} answered <span className="status-sep"/> {Math.round(answered/count*100)}% complete</span><span className={`timer-badge ${remaining!==null&&remaining<300?'urgent':''}`}><Clock3 size={18}/>{remaining===null?'Untimed':`${timeString(remaining)} remaining`}</span><button className={`mobile-question-nav ${attentionIds.size?'has-unanswered':''}`} onClick={()=>setShowNav(true)}><List size={17}/>Questions{attentionIds.size>0&&<span className="nav-alert-counter" aria-label={`${attentionIds.size} unanswered questions need attention`}>{attentionIds.size}</span>}</button></div></div>
  <div className="quiz-columns"><div className="question-panel"><div className="question-tags" key={`tags-${current}`}><span className="pill pill-mint"><BookOpen size={17}/>{q.topic}</span><span className="pill pill-grey"><Layers3 size={16}/>Single answer</span></div><h1 key={`prompt-${current}`}>{q.prompt}</h1><div className="answer-options" key={`answers-${current}`}>{q.options.map((option,i)=><button className={`answer-option ${selected===i?'selected':''}`} key={`${current}-${i}`} onClick={()=>answer(kind,current,i)}><span className="radio-indicator">{selected===i&&<span/>}</span><span className="answer-letter">{'ABCD'[i]}</span><span className="answer-text">{option}</span></button>)}</div>{(session.feedbackMode||'end')==='each'&&selected!==undefined&&<div className={`instant-feedback ${selected===q.correct?'correct':'incorrect'}`}><Check size={16}/>{selected===q.correct?'Correct! ':'Not quite. '}{q.explanation}</div>}
  <div className="question-tools"><button className={state.savedQuestions.includes(q.bankId||q.id)?'tool-active':''} onClick={()=>{saveQuestion(q.bankId||q.id);notify(state.savedQuestions.includes(q.bankId||q.id)?'Question removed from saved':'Question saved for later')}}><Bookmark size={18} fill={state.savedQuestions.includes(q.bankId||q.id)?'currentColor':'none'}/>{state.savedQuestions.includes(q.bankId||q.id)?'Saved question':'Save question'}</button><button className={flags.includes(current)?'flag-active':''} onClick={()=>flag(kind,current)}><Flag size={18} fill={flags.includes(current)?'currentColor':'none'}/>{flags.includes(current)?'Flagged for review':'Flag for review'}</button></div>
  {showAllUnanswered&&unansweredIds.length>0&&<div className="quiz-unanswered-inline" role="status"><AlertCircle size={17}/><span><strong>{unansweredIds.length} unanswered.</strong> Select the marked numbers in Question navigator to answer them.</span><button onClick={()=>setShowNav(true)}>View questions <ArrowRight size={15}/></button></div>}
  <div className="quiz-action-row"><button className="btn btn-secondary" disabled={current===1} onClick={()=>jump(kind,current-1)}><ArrowLeft size={19}/>Previous</button><button className="btn" onClick={next}>{current===count?'Review and submit':'Next question'}<ArrowRight size={19}/></button></div></div>
  <aside className={`navigator-panel ${showNav?'nav-visible':''}`}><div className="navigator-head"><h3>Question navigator</h3><button className="only-mobile icon-btn" onClick={()=>setShowNav(false)} aria-label="Close questions"><X size={20}/></button></div>
  {attentionIds.size>0&&<div className="navigator-attention" role="status"><AlertCircle size={15}/>{attentionIds.size} unanswered {attentionIds.size===1?'question needs':'questions need'} your attention</div>}
  <div className="question-numbers">{questions.map((question,i)=>{const id=i+1;const needsAnswer=unansweredSet.has(id)&&attentionIds.has(id);const isAnswered=!unansweredSet.has(id);return <button key={id} type="button" aria-label={`Question ${id}: ${isAnswered?'answered':needsAnswer?'unanswered — needs attention':'not answered yet'}${flags.includes(id)?', flagged':''}`} aria-current={id===current?'step':undefined} className={`${isAnswered?'answered':''} ${id===current?'current':''} ${needsAnswer?'needs-answer':''}`} onClick={()=>goToQuestion(id)}><span>{id}</span>{needsAnswer&&<AlertCircle size={13} strokeWidth={2.7} className="unanswered-mark" aria-hidden="true"/>}{flags.includes(id)&&<Flag size={11} fill="currentColor" className="tiny-flag" aria-hidden="true"/>}</button>})}</div>
  <div className="nav-legend"><div><span className="legend-dot answered"/>Answered <strong>{answered}</strong></div><div><span className="legend-dot current"/>Current <strong>1</strong></div><div><Flag size={13} color="#e94148"/>Flagged <strong>{flags.length}</strong></div><div><span className="legend-dot needs-answer"/>Needs answer <strong>{attentionIds.size}</strong></div><div><span className="legend-dot unanswered"/>Not answered yet <strong>{Math.max(0,unansweredIds.length-attentionIds.size)}</strong></div></div><button className="btn btn-secondary nav-submit" onClick={openReview}><FileText size={18}/>Review and submit <ArrowRight size={17}/></button></aside></div>
  {showNav&&<div className="mobile-overlay" onClick={()=>setShowNav(false)}/>}
  {showReview&&<Modal title={unansweredIds.length?'Unanswered questions':'Review your answers'} onClose={()=>setShowReview(false)}><div className="review-modal-stats"><div><b>{answered}</b><small>Answered</small></div><div className={unansweredIds.length?'review-stat-warning':''}><b>{unansweredIds.length}</b><small>Unanswered</small></div><div><b>{flags.length}</b><small>Flagged</small></div></div>
   {unansweredIds.length>0?<><div className="review-warning" role="alert"><AlertTriangle size={22}/><div><strong>You still have {unansweredIds.length} unanswered {unansweredIds.length===1?'question':'questions'}.</strong><p>They are highlighted in the Question navigator. Go back to complete them, or choose to submit with those questions left blank.</p></div></div><div className="review-unanswered-list"><span>Go directly to an unanswered question:</span><div>{unansweredIds.map(id=><button type="button" key={id} onClick={()=>reviewMissing(id)} aria-label={`Go to unanswered question ${id}`}>{id}<AlertCircle size={12}/></button>)}</div></div></>:<p>All questions have answers. Once submitted, you won't be able to change them. Your results and explanations will be available immediately.</p>}
   <div className="modal-actions"><button className="btn btn-secondary" onClick={()=>unansweredIds.length?reviewMissing():setShowReview(false)}>{unansweredIds.length?'Review unanswered':'Return to questions'}</button><button className={`btn ${unansweredIds.length?'btn-submit-incomplete':''}`} onClick={doSubmit}>{unansweredIds.length?'Submit with unanswered':`Submit ${isPractice?'practice':'assessment'}`} <ArrowRight size={18}/></button></div></Modal>}
 </div>;
}
