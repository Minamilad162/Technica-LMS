import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ChevronLeft,ChevronRight,Clock3,Flag,LockKeyhole,PlayCircle,RefreshCw,ShieldCheck,Target,TriangleAlert} from 'lucide-react';
import {answerSecurePractice,finishSecurePractice,getSecurePractice,practiceSessionKey,safeRemainingSeconds,startSecurePractice} from './practiceApi';
import './livePractice.css';

const PRESETS=[
 {id:'quick10',title:'Quick 10',desc:'10 random questions · immediate feedback',count:10,time:0},
 {id:'timed25',title:'Timed Quiz',desc:'25 questions · 20 minutes · feedback at the end',count:25,time:1200},
 {id:'custom',title:'Build Your Own',desc:'Choose 1–50 questions · optional total timer',count:10,time:0},
 {id:'domain',title:'Practice by Domain',desc:'Choose a verified course domain · feedback at the end',count:10,time:0}
];
const formatTime=seconds=>{
 const n=Math.max(0,Math.floor(seconds||0));
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60]
   .filter((_,i)=>i!==0||n>=3600)
   .map(value=>String(value).padStart(2,'0')).join(':');
};
const errorText=e=>e?.message||'Practice request failed';

export default function LivePractice({db,user,course,domains=[],access}) {
 const [mode,setMode]=useState('quick10'),[count,setCount]=useState(10),[minutes,setMinutes]=useState(0),[domainId,setDomainId]=useState('');
 const [attempt,setAttempt]=useState(null),[selected,setSelected]=useState(0),[feedback,setFeedback]=useState({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[clock,setClock]=useState(Date.now());
 const processing=useRef(false);
 const storageKey=useMemo(()=>practiceSessionKey(user.id,course.id),[user.id,course.id]);
 const current=attempt?.questions?.[selected]||null;
 const finished=attempt?.state!=='in_progress'&&!!attempt;
 const remaining=safeRemainingSeconds(attempt,clock);
 const preset=PRESETS.find(p=>p.id===mode);
 const eligible=access;

 useEffect(()=>{
  setAttempt(null);setSelected(0);setFeedback({});setError('');setNotice('');
  if(!eligible)return;
  let active=true;
  let saved;
  try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  if(saved?.attemptId){
   getSecurePractice(db,saved.attemptId).then(data=>{
    if(active){setAttempt({...data,observedAtEpoch:Date.now()});setSelected(0);}
   }).catch(()=>{if(active){localStorage.removeItem(storageKey);setAttempt(null);}});
  }
  return()=>{active=false;};
 },[db,storageKey,eligible]);

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
   setAttempt({...next,observedAtEpoch:Date.now()});
   setNotice('The score was calculated and saved securely in the database.');
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
  const total=chosen.id==='custom'||chosen.id==='domain'?Number(count):chosen.count;
  const time=chosen.id==='custom'?Number(minutes)*60:chosen.time;
  if(!Number.isInteger(total)||total<1||total>50||!Number.isInteger(time)||time<0||time>10800){
   setError('Choose 1–50 questions and a valid total timer of 0–180 minutes.');setBusy(false);processing.current=false;return;
  }
  if(mode==='domain'&&!domainId){
   setError('Select a course domain first.');setBusy(false);processing.current=false;return;
  }
  try{
   // Keep the same request UUID across retries, so a transient network failure
   // cannot accidentally start a duplicate attempt.
   const pendingKey=storageKey+':pending';
   let requestId=localStorage.getItem(pendingKey);
   if(!requestId){requestId=crypto.randomUUID();localStorage.setItem(pendingKey,requestId);}
   const next=await startSecurePractice(db,{
     courseId:course.id,mode,count:total,durationSeconds:time,
     domainId:mode==='domain'?domainId:null,requestId
   });
   localStorage.setItem(storageKey,JSON.stringify({attemptId:next.attemptId}));
   localStorage.removeItem(pendingKey);
   setAttempt({...next,observedAtEpoch:Date.now()});setSelected(0);setFeedback({});
  }catch(e){setError(errorText(e));}
  finally{setBusy(false);processing.current=false;}
 };

 const answer=async(optionIndex)=>{
  if(!current||finished||busy||processing.current||remaining===0)return;
  if(attempt.mode==='quick10'&&feedback[current.id])return;
  processing.current=true;setBusy(true);setError('');
  try{
   const reply=await answerSecurePractice(db,attempt.attemptId,current.id,optionIndex);
   setAttempt(previous=>({
     ...previous,
     questions:previous.questions.map(q=>q.id===current.id?{...q,selectedIndex:optionIndex}:q)
   }));
   if(reply.correctIndex!==undefined)
    setFeedback(old=>({...old,[current.id]:{correctIndex:reply.correctIndex,explanation:reply.explanation}}));
  }catch(e){setError(errorText(e));}
  finally{setBusy(false);processing.current=false;}
 };
 const startOver=()=>{
  localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+':pending');
  setAttempt(null);setSelected(0);setFeedback({});setError('');setNotice('');
 };
 const answered=attempt?.questions?.filter(q=>q.selectedIndex!==null&&q.selectedIndex!==undefined).length||0;
 const revealed=finished?current:feedback[current?.id];
 return <div className="live-practice" aria-label="Secure practice engine">
  <div className="live-practice-top"><div><span className="live-eyebrow">P4 · SERVER-GRADED PRACTICE</span><h3><ShieldCheck size={21}/> Secure Practice Center</h3><p>Questions are selected and scored in Supabase; correct answers are not sent before feedback or final submission.</p></div></div>
  {!eligible?<div className="live-empty"><LockKeyhole size={22}/><b>Practice requires paid or manually granted course access</b><p>Trial lesson access alone does not unlock the full question bank.</p></div>:!attempt?<>
   <div className="live-mode-grid">{PRESETS.map(p=><button key={p.id} className={'live-mode-card '+(mode===p.id?'chosen':'')} onClick={()=>setMode(p.id)} type="button"><strong>{p.title}</strong><span>{p.desc}</span>{mode===p.id&&<Check size={17}/>}</button>)}</div>
   {['custom','domain'].includes(mode)&&<div className="live-practice-controls">
      <label>Number of questions<input type="number" min={1} max={50} value={count} onChange={e=>setCount(e.target.value)}/></label>
      {mode==='custom'&&<label>Time limit (minutes; 0 = untimed)<input type="number" min={0} max={180} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
      {mode==='domain'&&<label>Domain<select value={domainId} onChange={e=>setDomainId(e.target.value)}><option value="">Choose domain</option>{domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
   </div>}
   <p className="live-practice-note"><TriangleAlert size={16}/> Mock Exam and Level Up are intentionally unavailable until approved reserved questions and difficulty classifications exist.</p>
   <button className="live-primary" disabled={busy||!eligible} onClick={begin} type="button"><PlayCircle size={17}/>{busy?'Preparing your questions…':'Start practice'}</button>
  </>:<>
   <div className="live-attempt-bar"><b>{finished?'Review your result':(attempt.mode==='quick10'?'Quick 10':attempt.mode==='timed25'?'Timed Quiz':'Custom Practice')}</b>
     <span><Target size={16}/>{answered} / {attempt.questionCount} answered</span>
     {remaining!==null&&<span><Clock3 size={16}/>{formatTime(remaining)} remaining</span>}
     {finished&&<strong>{attempt.scorePercent}% · {attempt.correctCount}/{attempt.questionCount} correct</strong>}
   </div>
   {current&&<div className="live-question">
     <div className="live-question-label">QUESTION {selected+1} OF {attempt.questions.length}</div>
     <h4>{current.prompt}</h4>
     <div className="live-answer-list">{current.options.map((option,index)=>{
       const chosen=current.selectedIndex===index;
       const correct=typeof revealed?.correctIndex==='number'&&revealed.correctIndex===index;
       const incorrect=chosen&&typeof revealed?.correctIndex==='number'&&!correct;
       return <button type="button" key={index} disabled={finished||busy||remaining===0||(attempt.mode==='quick10'&&!!feedback[current.id])}
         onClick={()=>answer(index)} className={'live-answer '+(chosen?'chosen ':'')+(correct?'correct ':'')+(incorrect?'incorrect':'')}>
         <b>{String.fromCharCode(65+index)}</b><span>{String(option)}</span>{correct&&<Check size={17}/>}
       </button>;
     })}</div>
     {typeof revealed?.correctIndex==='number'&&<div className="live-practice-feedback"><b>{current.selectedIndex===revealed.correctIndex?'Correct answer':'Answer review'}</b><p>{revealed.explanation||'No explanation provided.'}</p></div>}
   </div>}
   <div className="live-question-nav">
     <button type="button" className="live-secondary" disabled={selected===0} onClick={()=>setSelected(v=>Math.max(0,v-1))}><ChevronLeft size={16}/> Previous</button>
     <div className="live-dots">{attempt.questions.map((q,i)=><button type="button" key={q.id} aria-label={'Question '+(i+1)} className={(selected===i?'active ':'')+(q.selectedIndex!==null&&q.selectedIndex!==undefined?'answered':'')} onClick={()=>setSelected(i)}>{i+1}</button>)}</div>
     <button type="button" className="live-secondary" disabled={selected>=attempt.questions.length-1} onClick={()=>setSelected(v=>Math.min(attempt.questions.length-1,v+1))}>Next <ChevronRight size={16}/></button>
   </div>
   {finished?<button className="live-primary" onClick={startOver}>New practice session</button>:<button className="live-primary" type="button" disabled={busy} onClick={finish}>Finish & calculate score</button>}
  </>}
  {error&&<p className="live-error" role="alert"><TriangleAlert size={17}/>{error}</p>}
  {notice&&<p className="live-notice" role="status">{notice}</p>}
 </div>;
}
