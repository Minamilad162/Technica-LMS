import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookOpenCheck,Bot,Check,ChevronRight,GraduationCap,
 HelpCircle,LifeBuoy,MessageCircle,Minimize2,Search,Send,ShieldCheck,Sparkles,X} from 'lucide-react';
import {TECHNICA_FAQ_CATEGORIES,searchTechnicaFaqs,suggestTechnicaFaqs,visibleTechnicaFaqs} from './technicaHelpFaq.js';
import './technicaAssistant.css';

const categoryIcon={Account:ShieldCheck,Subscriptions:Sparkles,'Courses & Lessons':BookOpen,
 'Exams & Practice':GraduationCap,Admin:BookOpenCheck};
function BotAvatar({small=false}){return <span className={'ta-bot-avatar'+(small?' ta-bot-avatar-small':'')} aria-hidden="true"><Bot size={small?19:29} strokeWidth={1.8}/></span>}
export default function TechnicaAssistant({open,onOpenChange,isAdmin=false,onNavigate}){
 const [category,setCategory]=useState('All');
 const [filter,setFilter]=useState('');
 const [questionId,setQuestionId]=useState(null);
 const [typed,setTyped]=useState('');
 const [unmatched,setUnmatched]=useState('');
 const [feedback,setFeedback]=useState('');
 const inputRef=useRef(null),triggerRef=useRef(null),lastOpen=useRef(false);
 const all=useMemo(()=>visibleTechnicaFaqs(isAdmin),[isAdmin]);
 const categories=useMemo(()=>TECHNICA_FAQ_CATEGORIES.filter(c=>c!=='Admin'||isAdmin),[isAdmin]);
 const results=useMemo(()=>searchTechnicaFaqs(all,filter,category),[all,filter,category]);
 const answer=all.find(f=>f.id===questionId)||null;
 const suggestions=useMemo(()=>unmatched?suggestTechnicaFaqs(all,unmatched):[],[all,unmatched]);
 useEffect(()=>{
  if(open&&!lastOpen.current)inputRef.current?.focus();
  if(!open&&lastOpen.current)triggerRef.current?.focus();
  lastOpen.current=open;
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const escape=e=>{if(e.key==='Escape'){e.stopPropagation();onOpenChange(false);}};
  document.addEventListener('keydown',escape);
  return()=>document.removeEventListener('keydown',escape);
 },[open,onOpenChange]);
 useEffect(()=>{
  if(questionId&&!all.some(f=>f.id===questionId))setQuestionId(null);
 },[all,questionId]);
 const close=()=>onOpenChange(false);
 const choose=faq=>{setQuestionId(faq.id);setUnmatched('');setFeedback('');setTyped('');};
 const goBack=()=>{setQuestionId(null);setUnmatched('');setFeedback('');};
 const submit=e=>{
  e.preventDefault();const text=typed.trim();if(!text)return;
  const matches=suggestTechnicaFaqs(all,text);
  setTyped('');
  if(matches.length&&matches[0].question.toLowerCase()===text.toLowerCase()){
   choose(matches[0]);return;
  }
  setQuestionId(null);setCategory('All');setFilter(text);
  if(matches.length===1){choose(matches[0]);return;}
  setUnmatched(text);
 };
 const openLink=path=>{onNavigate(path);onOpenChange(false)};
 return <div className="ta-root" data-feature="technica-help-assistant">
  {open&&<div className="ta-mobile-shade" aria-hidden="true" onClick={close}/>}
  {!open&&<button ref={triggerRef} className="ta-fab" type="button" onClick={()=>onOpenChange(true)}
   aria-label="Open Technica Assistant" title="Need help? Ask Technica Assistant" aria-expanded={false} aria-controls="technica-assistant-panel">
   <MessageCircle size={25} strokeWidth={2.1}/><span className="ta-fab-pulse" aria-hidden="true"/>
  </button>}
  {open&&<section id="technica-assistant-panel" role="dialog" aria-modal="false"
   aria-labelledby="technica-assistant-title" className="ta-panel">
    <header className="ta-header">
     <BotAvatar/>
     <div className="ta-header-titles"><h2 id="technica-assistant-title">Technica Assistant</h2>
      <span><span className="ta-status-dot"/> Instant self-service help</span></div>
     <button className="ta-header-close" type="button" onClick={close} aria-label="Close assistant"><X size={19}/></button>
    </header>
    <div className="ta-main">
     {!answer&&!unmatched&&<div className="ta-intro"><span>👋</span><strong>Hi! I'm the Technica Assistant.</strong>
      <p>Find quick answers about your learning, courses and account. Choose a question below or search our help topics.</p></div>}
     {answer?<div className="ta-answer-view" key={answer.id}>
      <button type="button" className="ta-back" onClick={goBack}><ArrowLeft size={15}/> All questions</button>
      <div className="ta-user-message">{answer.question}</div>
      <article className="ta-assistant-answer">
       <div className="ta-answer-caption"><BotAvatar small/><span>Technica Assistant</span></div>
       <h3>{answer.question}</h3>
       <p>{answer.answer}</p>
       {answer.action&&<button type="button" className="ta-destination" onClick={()=>openLink(answer.action.path)}>
        {answer.action.label}<ArrowRight size={17}/></button>}
       <div className="ta-answer-feedback"><span>Was this helpful?</span>
        <button type="button" onClick={()=>setFeedback('yes')} aria-label="Yes, this answer was helpful"
         aria-pressed={feedback==='yes'}><Check size={16}/></button>
        <button type="button" onClick={goBack} aria-label="Explore other questions"><HelpCircle size={16}/></button>
       </div>{feedback==='yes'&&<small className="ta-feedback-note">Glad it helped!</small>}
      </article>
     </div>:unmatched?<div className="ta-no-match" role="status">
      <button type="button" className="ta-back" onClick={goBack}><ArrowLeft size={15}/> Back to FAQ</button>
      <div className="ta-user-message">{unmatched}</div>
      <div className="ta-assistant-answer"><div className="ta-answer-caption"><BotAvatar small/><span>Technica Assistant</span></div>
       <h3>Let's find the right answer</h3>
       <p>This assistant uses a verified FAQ library rather than live AI chat. Please choose a suggested topic or browse the questions below.</p>
       {suggestions.length>0&&<div className="ta-suggestions">{suggestions.map(f=><button type="button" key={f.id} onClick={()=>choose(f)}>{f.question}<ChevronRight size={15}/></button>)}</div>}
       <button type="button" className="ta-destination" onClick={goBack}>Browse all help topics<ArrowRight size={17}/></button>
      </div>
     </div>:<div className="ta-questions">
      <label className="ta-search"><Search size={18} aria-hidden="true"/><input ref={inputRef} type="search"
       autoComplete="off" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search a question…"
       aria-label="Search frequently asked questions"/>{filter&&<button type="button" aria-label="Clear search" onClick={()=>setFilter('')}><X size={15}/></button>}</label>
      <div className="ta-category-scroller" role="group" aria-label="Help topic filters">
       {categories.map(c=><button key={c} type="button" className={category===c?'selected':''}
        aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}
      </div>
      <div className="ta-faq-list-title"><span><Sparkles size={16}/> Frequently asked questions</span><small>{results.length} / {all.length}</small></div>
      <div className="ta-questions-list">{results.map(f=>{
       const Icon=categoryIcon[f.category]||HelpCircle;
       return <button className="ta-question-row" key={f.id} type="button" onClick={()=>choose(f)}>
        <span className="ta-question-icon"><Icon size={16}/></span><span>{f.question}</span><ChevronRight size={17}/>
       </button>;
      })}
      {!results.length&&<div className="ta-empty">
       <Search size={24}/><strong>No matching questions</strong><p>Try another keyword or choose All topics.</p>
       <button type="button" onClick={()=>{setCategory('All');setFilter('')}}>Show all FAQs</button>
      </div>}
      </div>
     </div>}
    </div>
    <footer className="ta-footer">
     <form onSubmit={submit}><MessageCircle size={18} aria-hidden="true"/>
      <input type="text" maxLength={220} value={typed} onChange={e=>setTyped(e.target.value)}
       placeholder="Ask about Technica LMS…" aria-label="Ask a question from the FAQ library"/>
      <button type="submit" disabled={!typed.trim()} aria-label="Find answer"><Send size={18}/></button>
     </form>
     <small><LifeBuoy size={12}/> Answers from Technica's help library · No AI account access</small>
    </footer>
   </section>}
 </div>;
}
