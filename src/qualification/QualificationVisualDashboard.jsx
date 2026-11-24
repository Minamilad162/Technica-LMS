import React,{useState} from 'react';
import {ArrowRight,Award,BookOpenCheck,Check,CheckCircle2,ClipboardCheck,Clock3,FileText,FolderOpen,Layers3,ShieldCheck,UserRound} from 'lucide-react';
import {canReview,claimLabels,claimState} from './qualificationPortfolioApi.js';
import QualificationNextStep from './QualificationNextStep.jsx';
import './qualificationVisualDashboard.css';

const activeReviewStates=['submitted','awaiting_verification','verification_returned'];
const formatDate=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(value)):'—';
const percent=(done,total)=>total?Math.round(100*done/total):0;
const required=unit=>unit.outcomes.filter(outcome=>outcome.required);
const unitVerified=unit=>{
 const items=required(unit);
 return items.length>0&&items.every(outcome=>claimState(outcome)==='verified');
};
function statusOf(unit){
 const states=required(unit).map(claimState);
 if(!states.length)return {label:'No required outcomes',tone:'muted'};
 if(states.every(state=>state==='verified'))return {label:'Verified',tone:'success'};
 if(states.includes('changes_requested'))return {label:'Changes requested',tone:'warning'};
 if(states.includes('verification_returned'))return {label:'Assessment follow-up',tone:'warning'};
 if(states.includes('awaiting_verification'))return {label:'Awaiting verification',tone:'info'};
 if(states.includes('submitted'))return {label:'Awaiting assessment',tone:'info'};
 if(states.some(state=>state!=='not_started'))return {label:'In progress',tone:'accent'};
 return {label:'Not started',tone:'muted'};
}
function evidenceIds(unit){
 const ids=new Set();
 for(const outcome of unit.outcomes){
  const mappings=[outcome.claim?.mapping,...(outcome.submissions||[]).map(s=>s.snapshot?.mapping)];
  for(const mapping of mappings)for(const list of Object.values(mapping||{})){
   for(const id of Array.isArray(list)?list:[])ids.add(id);
  }
 }
 return ids;
}
function lastActivity(unit){
 const dates=unit.outcomes.flatMap(outcome=>(outcome.submissions||[]).flatMap(submission=>
  [submission.submittedAt,...(submission.reviews||[]).map(review=>review.createdAt)]));
 const valid=dates.map(d=>Date.parse(d)).filter(Number.isFinite);
 return valid.length?new Date(Math.max(...valid)).toISOString():null;
}
const status=(label,tone)=> <span className={'qfd-status qfd-status-'+tone}>{label}</span>;
export function QualificationTopStats({portfolio,visiblePortfolio}){
 const done=portfolio.units.filter(unitVerified).length;
 const pending=portfolio.units.flatMap(unit=>unit.outcomes).filter(outcome=>
  ['submitted','verification_returned'].includes(claimState(outcome))).length;
 const stats=[
  {label:'Active qualification',value:portfolio.completedAt?'Completed':'1',Icon:Award,tone:'purple'},
  {label:'Units completed',value:done+' / '+portfolio.units.length,Icon:Layers3,tone:'green'},
  {label:'Pending assessment',value:pending,Icon:ClipboardCheck,tone:'orange'},
  {label:'Evidence items',value:(visiblePortfolio?.evidence||[]).length,Icon:FileText,tone:'blue'},
 ];
 return <section className="qfd-stats" aria-label="Live qualification statistics">
  {stats.map(({label,value,Icon,tone})=><article key={label} className={'qfd-stat qfd-stat-'+tone}>
   <span className="qfd-stat-icon"><Icon size={24} aria-hidden="true"/></span>
   <div><span>{label}</span><strong>{value}</strong></div>
  </article>)}
 </section>;
}
function Milestone({title,detail,complete,current}){
 return <li className={'qfd-step'+(complete?' complete':'')+(current?' current':'')}>
  <span className="qfd-step-dot" aria-hidden="true">{complete?<Check size={15}/>:null}</span>
  <div><strong>{title}</strong><p>{detail}</p></div>
  {status(complete?'Completed':current?'In progress':'Pending',complete?'success':current?'accent':'muted')}
 </li>;
}
function ReviewerSnapshot({unit,onOutcome}){
 const items=unit.outcomes.filter(outcome=>(outcome.submissions||[]).length>0);
 if(!items.length)return <section className="qfd-review-card"><h3>No submitted work in this Unit yet</h3><p>Submitted work and real reviewer decisions will appear here after a learner submits an Outcome.</p></section>;
 return <div className="qfd-review-stack">
  {items.map(outcome=>{
   const submission=outcome.submissions[0];
   const reviews=submission?.reviews||[];
   const assessment=[...reviews].reverse().find(review=>review.stage==='assessor');
   const verification=[...reviews].reverse().find(review=>review.stage==='verifier');
   const attachments=Object.values(submission?.snapshot?.evidence||{});
   return <article className="qfd-review-card" key={outcome.id}>
    <div className="qfd-review-head"><div><span className="qfd-eyebrow">{outcome.code}</span><h3>{outcome.title}</h3></div>{status(claimLabels[claimState(outcome)]||claimState(outcome),'info')}</div>
    <div className="qfd-review-columns">
     <section><div className="qfd-mini-heading"><UserRound size={18}/> Learner submission</div>
      <small>Revision {submission.revision} · {formatDate(submission.submittedAt)}</small>
      <ul className="qfd-file-list">{attachments.map(item=><li key={item.id}><FileText size={15}/><span dir="auto">{item.title}</span></li>)}</ul>
      {!attachments.length&&<p>No linked files in this revision.</p>}
     </section>
     <section><div className="qfd-mini-heading"><ClipboardCheck size={18}/> Assessor review</div>
      {assessment?<><small>{assessment.decision==='accept'?'Accepted':'Returned'} · {formatDate(assessment.createdAt)}</small><p dir="auto">{assessment.feedback||'No written feedback.'}</p></>:<p>Awaiting assessor decision</p>}
     </section>
     <section><div className="qfd-mini-heading"><ShieldCheck size={18}/> Internal verification</div>
      {verification?<><small>{verification.decision==='accept'?'Accepted':'Returned'} · {formatDate(verification.createdAt)}</small><p dir="auto">{verification.feedback||'No written feedback.'}</p></>:<p>Awaiting verification</p>}
     </section>
    </div>
    <button type="button" className="qfd-action qfd-secondary" onClick={()=>onOutcome(outcome.id)}>Open Outcome &amp; decisions <ArrowRight size={16}/></button>
   </article>;
  })}
 </div>;
}
export default function QualificationVisualDashboard({portfolio,progress,selectedUnitIndex,onUnit,onOutcome,onEvidence,onRegistration,nextStep,onNextStep,busy}){
 const [surface,setSurface]=useState('overview');
 const total=portfolio.units.length;
 const completed=portfolio.units.filter(unitVerified).length;
 const allOutcomes=portfolio.units.flatMap(unit=>unit.outcomes);
 const reviewed=allOutcomes.some(o=>['awaiting_verification','verification_returned','verified'].includes(claimState(o)));
 const submitted=allOutcomes.some(o=>activeReviewStates.includes(claimState(o))||claimState(o)==='verified');
 const verified=allOutcomes.some(o=>claimState(o)==='verified');
 const hasEvidence=(portfolio.evidence||[]).length>0||portfolio.units.some(u=>evidenceIds(u).size>0);
 const selectedUnit=portfolio.units[selectedUnitIndex]||portfolio.units[0];
 const next=allOutcomes.find(o=>portfolio.role==='learner'?['not_started','draft','changes_requested'].includes(claimState(o)):canReview(portfolio.role,claimState(o)));
 const percentDone=percent(completed,total);
 return <div className="qfd-dashboard">
  <div className="qfd-view-switch" role="group" aria-label="Qualification overview panels">
   <button type="button" aria-pressed={surface==='overview'} onClick={()=>setSurface('overview')}><Layers3 size={17}/> Overview</button>
   <button type="button" aria-pressed={surface==='review'} onClick={()=>setSurface('review')}><ClipboardCheck size={17}/> Assessment &amp; Verification</button>
  </div>
  {surface==='overview'?<div className="qfd-main-grid">
   <div className="qfd-main-column">
    <section className="qfd-qualification-card">
     <div className="qfd-qualification-title"><div className="qfd-title-icon"><Award size={25}/></div>
      <div><span className="qfd-eyebrow">VERIFIED QUALIFICATION PROGRESS</span><h2>Overall progress</h2></div>
      {status(portfolio.completedAt?'Completed':'In progress',portfolio.completedAt?'success':'accent')}</div>
     <div className="qfd-progress-head"><strong>Overall Unit progress</strong><b>{percentDone}% ({completed} of {total} Units)</b></div>
     <progress value={completed} max={total||1} aria-label="Verified Units"/>
     <div className="qfd-people">
      <div><UserRound size={20}/><span>Learner<strong dir="auto">{portfolio.learner||'Not available'}</strong></span></div>
      <div><BookOpenCheck size={20}/><span>Assessor<strong dir="auto">{portfolio.assessor||'Not assigned'}</strong></span></div>
      <div><ShieldCheck size={20}/><span>Verifier<strong dir="auto">{portfolio.verifier||'Not assigned'}</strong></span></div>
      {!nextStep&&<div><Clock3 size={20}/><span>Next action<strong>{next?next.code+' · '+(claimLabels[claimState(next)]||'Open'):(portfolio.completedAt?'Qualification completed':'No pending action')}</strong></span></div>}
     </div>
     {nextStep&&<QualificationNextStep step={nextStep} onAction={onNextStep} busy={busy}/>}
    </section>
    <section className="qfd-unit-card">
     <div className="qfd-card-head"><h2>Units</h2><span>{total} Units · {progress.verified} / {progress.total} required Outcomes verified</span></div>
     <div className="qfd-table-scroller" role="region" aria-label="Qualification Unit progress" tabIndex={0}>
      <table><thead><tr><th scope="col">Unit</th><th scope="col">Status</th><th scope="col">Outcomes verified</th><th scope="col">Evidence linked</th><th scope="col">Last updated</th><th scope="col">Action</th></tr></thead>
       <tbody>{portfolio.units.map((unit,index)=>{
        const req=required(unit);const done=req.filter(o=>claimState(o)==='verified').length;
        const state=statusOf(unit);const action=unit.outcomes.find(o=>canReview(portfolio.role,claimState(o)));
        return <tr key={unit.id} className={selectedUnitIndex===index?'qfd-selected-unit':''}>
         <th scope="row"><span>Unit {String(index+1).padStart(2,'0')} · {unit.code}</span><strong>{unit.title}</strong></th>
         <td>{status(state.label,state.tone)}</td><td>{done} / {req.length}</td><td><FolderOpen size={15} aria-hidden="true"/> {evidenceIds(unit).size}</td>
         <td>{formatDate(lastActivity(unit))}</td>
         <td><button type="button" className="qfd-action qfd-secondary" onClick={()=>action?onOutcome(action.id):onUnit(index)}>{action?'Review':'View'} <ArrowRight size={15}/></button></td>
        </tr>;
       })}</tbody>
      </table>
     </div>
    </section>
   </div>
   <aside className="qfd-aside" aria-label="Qualification timeline">
    <h2><ShieldCheck size={21}/> Qualification timeline</h2>
    <p>Milestones calculated from this portfolio’s recorded evidence and assessment decisions.</p>
    <ol className="qfd-timeline">
     <Milestone title="Evidence prepared" detail={hasEvidence?'Evidence records are available':'Upload evidence to begin'} complete={hasEvidence} current={!hasEvidence}/>
     <Milestone title="Submitted for assessment" detail={submitted?'A Competence Claim has been submitted':'Submit each Outcome after mapping its criteria'} complete={submitted} current={hasEvidence&&!submitted}/>
     <Milestone title="Assessor review" detail={reviewed?'Assessor decision recorded on at least one Outcome':'Awaiting assessment decisions'} complete={reviewed} current={submitted&&!reviewed}/>
     <Milestone title="Internal verification" detail={verified?'At least one Outcome verified':'Awaiting verifier decisions'} complete={verified} current={reviewed&&!verified}/>
     <Milestone title="Qualification completed" detail={portfolio.completedAt?'Programme completed':'All required Outcomes and completion checks must be satisfied'} complete={!!portfolio.completedAt} current={verified&&!portfolio.completedAt}/>
    </ol>
    <button type="button" className="qfd-action qfd-primary" onClick={onEvidence}><FolderOpen size={17}/> Open Evidence Folder <ArrowRight size={16}/></button>
    <button type="button" className="qfd-action qfd-secondary" onClick={onRegistration}><Award size={17}/> Registration &amp; certificate</button>
   </aside>
  </div>:<section className="qfd-assessment-area">
   <div className="qfd-card-head"><div><h2>Assessment &amp; Verification</h2><p>Real submissions, assessor feedback and verifier decisions for the selected Unit.</p></div>
    <span>Unit {String(selectedUnitIndex+1).padStart(2,'0')} · {selectedUnit?.code}</span></div>
   {selectedUnit?<ReviewerSnapshot unit={selectedUnit} onOutcome={onOutcome}/>:<p>No Units have been assigned.</p>}
  </section>}
 </div>;
}
