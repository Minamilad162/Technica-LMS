import PremiumLoading from '../components/PremiumLoading.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronLeft,ChevronRight,
 CircleHelp,Flame,RefreshCw,RotateCcw,ShieldCheck,Sparkles,Target,TriangleAlert} from 'lucide-react';
import {Link} from 'react-router-dom';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchKillMistakes,submitKillMistakeAnswer,mistakeSourceLabel} from './killMistakesApi.js';
import './killMistakes.css';
const PAGE_SIZE=40;
const date=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export default function KillMistakesPage(){
 const [feed,setFeed]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[page,setPage]=useState(0),[current,setCurrent]=useState(0);
 const [choice,setChoice]=useState(null),[feedback,setFeedback]=useState(null),[revision,setRevision]=useState(0);
 const questionRef=useRef(null);
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');setChoice(null);setFeedback(null);
  let db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setError(e.message||'A verified LMS connection is required.');setLoading(false);return;}
  fetchKillMistakes(db,{limit:PAGE_SIZE,offset:page*PAGE_SIZE})
   .then(x=>{if(alive){setFeed(x);setCurrent(0);
    if(!x.items.length&&x.openCount>0&&page>0)setPage(p=>Math.max(0,p-1));}})
   .catch(e=>{if(alive)setError(e?.message||'Unable to load mistakes.');})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[page,revision]);
 const questions=feed?.items||[],item=questions[current]||null;
 const changeQuestion=next=>{setCurrent(next);setChoice(null);setFeedback(null);questionRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
 const refresh=()=>setRevision(n=>n+1);
 const submit=async()=>{
  if(!item||busy||choice===null||feedback?.correct)return;
  setBusy(true);setError('');setNotice('');
  try{
   const db=getSupabaseClient({secureReviewEntry:true});
   const graded=await submitKillMistakeAnswer(db,item.id,choice);
   if(graded.correct){
    setFeedback({correct:true,explanation:graded.explanation,reference:graded.reference});
    setNotice('Excellent! You cleared this mistake. Keep going.');
    // The server has already resolved the item. Refresh makes the removal visible.
    setPage(0);refresh();
   }else{
    setFeedback({correct:false});
    setNotice('Not quite. Your answer is saved; this question stays in Kill Mistakes until you get it right.');
   }
  }catch(e){setError(e?.message||'Could not grade your answer.');}
  finally{setBusy(false);}
 };
 const retry=()=>{setChoice(null);setFeedback(null);setNotice('');};
 const reset=()=>{setPage(0);refresh();};
 const isLast=feed?feed.offset+questions.length>=feed.openCount:true;
 const remaining=feed?.openCount||0,cleared=feed?.resolvedCount||0;
 return <main className="km-page page-enter" data-feature="kill-mistakes">
  <header className="km-hero">
   <div className="km-heading"><span className="km-mark"><Flame size={26}/></span>
    <div><div className="km-overline">LEARN • RETRY • MASTER</div><h1>Kill Mistakes</h1>
     <p>Every missed question becomes another chance to improve. Correct it here to clear it from your list.</p></div></div>
   <div className="km-stats">
    <div><span>To conquer</span><strong>{feed?remaining:'—'}</strong><small>Questions to revisit</small></div>
    <div><span>Mistakes cleared</span><strong>{feed?cleared:'—'}</strong><small>Correctly answered here</small></div>
    <button type="button" disabled={loading||busy} onClick={reset}><RefreshCw size={17}/> Refresh</button>
   </div>
  </header>
  <div className="km-context"><span><ShieldCheck size={16}/> Verified grading • Your own mistakes only</span>
   <Link to="/assessments?tab=practice"><BookOpen size={16}/> Back to Practice <ArrowRight size={14}/></Link></div>
  {error&&<div className="km-alert km-alert-error" role="alert"><TriangleAlert size={18}/>{error}<button onClick={refresh}>Retry</button></div>}
  {loading&&<PremiumLoading variant="page"/>}
  {!loading&&feed&&remaining===0&&<div className="km-empty km-empty-win">
   <span className="km-empty-icon"><Sparkles size={34}/></span>
   <h2>All clear. Great work!</h2>
   <p>You don't have any outstanding mistakes yet. Questions answered incorrectly in completed exams will appear here automatically.</p>
   <Link to="/assessments?tab=practice" className="km-primary-link">Start a Practice <ArrowRight size={17}/></Link></div>}
  {!loading&&item&&<section className="km-workspace" ref={questionRef} aria-label="Kill Mistakes question">
   <div className="km-question-head">
    <div className="km-progress"><span><Target size={17}/> Question {feed.offset+current+1} of {remaining}</span>
     <div className="km-progress-track"><span style={{width:(remaining?Math.min(100,100*(feed.offset+current+1)/remaining):0)+'%'}}/></div></div>
    <span className="km-source"><BookOpen size={15}/>{item.courseTitle||'Course'}</span>
   </div>
   <div className="km-question-body">
    <div className="km-metadata"><span>{mistakeSourceLabel(item.lastSource)}</span><span>{item.wrongCount} previous mistake{item.wrongCount===1?'':'s'}</span><span>Last missed {date(item.lastWrongAt)}</span></div>
    <h2>{item.prompt}</h2>
    <p className="km-instruction"><CircleHelp size={16}/> Choose one answer. A correct answer clears this mistake from your active list.</p>
    <div className="km-choices" role="group" aria-label="Answer options">
     {item.options.map((option,index)=><button type="button" key={index}
      aria-pressed={choice===index} className={'km-choice '+(choice===index?'selected':'')+(feedback?.correct===false&&choice===index?' wrong':'')}
      disabled={busy||feedback?.correct===true||feedback?.correct===false}
      onClick={()=>{setChoice(index);setFeedback(null);setNotice('');}}>
       <span>{String.fromCharCode(65+index)}</span><b>{option}</b>
       {choice===index&&<CheckCircle2 size={18}/>}
      </button>)}
    </div>
    {feedback?.correct===false&&<div className="km-alert km-alert-warning" role="status"><RotateCcw size={18}/> Not quite — try again. We won't reveal the answer before you master it.</div>}
    {feedback?.correct===true&&<div className="km-alert km-alert-success" role="status"><CheckCircle2 size={20}/>
     <span><b>Great work — cleared!</b>{feedback.explanation&&<p>{feedback.explanation}</p>}{feedback.reference&&<small>Reference: {feedback.reference}</small>}</span></div>}
    {notice&&!feedback?.correct&&<p className="km-status" role="status">{notice}</p>}
    <div className="km-actions">
     {feedback?.correct===false?<button type="button" className="km-submit" onClick={retry}><RotateCcw size={17}/> Try again</button>:
      <button type="button" className="km-submit" disabled={choice===null||busy||feedback?.correct===true} onClick={submit}>
       {busy?'Checking…':'Check answer'} <ArrowRight size={17}/></button>}
     <span>{item.reviewCount} review attempt{item.reviewCount===1?'':'s'} so far</span>
    </div>
   </div>
   <div className="km-nav">
    <button type="button" disabled={busy||current===0} onClick={()=>changeQuestion(current-1)}><ChevronLeft size={18}/> Previous</button>
    <span>Page {page+1} · {questions.length} questions</span>
    <button type="button" disabled={busy||current===questions.length-1} onClick={()=>changeQuestion(current+1)}>Next <ChevronRight size={18}/></button>
   </div>
  </section>}
  {!loading&&feed&&remaining>0&&<div className="km-pagination">
   <button type="button" disabled={busy||page===0} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={17}/> Previous page</button>
   <span>{feed.offset+1}–{Math.min(feed.offset+questions.length,remaining)} of {remaining}</span>
   <button type="button" disabled={busy||isLast} onClick={()=>setPage(x=>x+1)}>Next page <ChevronRight size={17}/></button>
  </div>}
  <p className="km-footnote">Your previous results stay saved. A mistake disappears only when you answer it correctly in Kill Mistakes; a future wrong answer can add it again.</p>
 </main>;
}
