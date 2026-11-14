import React,{useId,useState} from 'react';
import {ChevronDown,Flag,LayoutGrid} from 'lucide-react';
import './examQuestionNavigator.css';

/**
 * A reusable, compact question map. It only displays already delivered question
 * metadata; it never sends answer data or bypasses exam progression rules.
 */
export default function ExamQuestionNavigator({
 questions=[],total=questions.length,currentIndex=0,onJump,
 isFlagged=()=>false,getOutcome=()=>null,canVisit=()=>true,disabled=false,title='Questions'
}){
 const [open,setOpen]=useState(false);
 const gridId=useId();
 const hasPositions=questions.some(q=>Number.isInteger(q?.position));
 const slots=Array.from({length:total},(_,i)=>hasPositions
  ?questions.find(q=>q?.position===i+1)||null
  :questions[i]||null);
 const answered=slots.filter(q=>q&&q.selectedIndex!==null&&q.selectedIndex!==undefined).length;
 const flagged=slots.filter(q=>q&&isFlagged(q)).length;
 return <aside className="tc-exam-map" aria-label="Question navigator">
  <div className="tc-exam-map-head"><div><span className="tc-exam-map-kicker">QUESTION NAVIGATOR</span><h4>{title}</h4></div>
   <span className="tc-exam-map-count">{total}</span></div>
  <div className="tc-exam-map-progress"><span>{answered} answered</span><b>{flagged} flagged</b></div>
  <div className="tc-exam-map-track" role="progressbar" aria-label="Questions answered"
   aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
   <span style={{width:(total?100*answered/total:0)+'%'}}/></div>
  <button className="tc-exam-map-toggle" type="button" aria-expanded={open} aria-controls={gridId}
   onClick={()=>setOpen(v=>!v)}><LayoutGrid size={17}/> Question map <ChevronDown className={open?'is-open':''} size={17}/></button>
  <div className={'tc-exam-map-grid '+(open?'is-open':'')} id={gridId} role="navigation" aria-label="Jump to question">
   {slots.map((q,i)=>{
    const active=currentIndex===i;
    const flaggedQuestion=!!q&&isFlagged(q);
    const answeredQuestion=!!q&&q.selectedIndex!==null&&q.selectedIndex!==undefined;
    // Only use grading information actually returned by the server.
    // 'At the end' never reveals correctness before a finished attempt.
    const outcome=answeredQuestion?getOutcome(q):null;
    const visibleOutcome=outcome==='correct'||outcome==='incorrect'?outcome:null;
    const visitable=!!q&&canVisit(q,i)&&!disabled;
    const status=flaggedQuestion?'flagged':visibleOutcome||(answeredQuestion?'answered':'unanswered');
    return <button type="button" key={q?.id||i} disabled={!visitable}
     aria-current={active?'step':undefined}
     aria-label={'Question '+(i+1)+(answeredQuestion?', answered':'')+
      (visibleOutcome?', '+visibleOutcome:'')+(flaggedQuestion?', flagged':'')}
     className={'tc-exam-map-number '+status+(active?' current':'')}
     onClick={()=>{onJump?.(i);setOpen(false);}}>{i+1}{flaggedQuestion&&<Flag size={9} aria-hidden="true"/>}</button>;
   })}
  </div>
  <div className="tc-exam-map-legend"><span><i className="current"/>Current</span>
   <span><i className="answered"/>Answered</span>
   <span><i className="correct"/>Correct</span>
   <span><i className="incorrect"/>Incorrect</span>
   <span><i className="flagged"/>Flagged</span></div>
 </aside>;
}
