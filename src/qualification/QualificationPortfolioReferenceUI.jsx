import React from 'react';
import {CalendarDays,CheckCircle2,ClipboardList,FileText,ShieldCheck,TrendingUp,Users} from 'lucide-react';
import {claimState} from './qualificationPortfolioApi.js';

const formatDate=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value)):'Not set';
const pct=(value,total)=>total>0?Math.round(value/total*100):0;
const clamp=(number,min,max)=>Math.min(max,Math.max(min,number));
function expectedProgress(startsOn,targetOn){
 if(!startsOn||!targetOn)return null;
 const start=Date.parse(startsOn),end=Date.parse(targetOn),now=Date.now();
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 return Math.round(clamp((now-start)/(end-start),0,1)*100);
}
function ProgressItem({title,rate,caption,variant}){
 return <div className={'qf-ref-progress-block qf-ref-'+variant}>
   <div className="qf-ref-progress-heading"><span>{title}</span><strong>{rate===null?'—':rate+'%'}</strong></div>
   <progress max="100" value={rate??0} aria-label={title+' progress'}/>
   <small>{caption}</small>
 </div>;
}

export function PortfolioStatusRibbon({portfolio,progress,onRegistration}){
 const started=pct(progress.started,progress.total);
 const completed=pct(progress.verified,progress.total);
 const expected=expectedProgress(portfolio.startsOn,portfolio.targetOn);
 return <section className="qf-ref-ribbon" aria-label="Programme assessment progress and assigned reviewers">
   <div className="qf-ref-ribbon-top">
     <div><span className="qf-ref-eyebrow">LIVE ASSESSMENT PORTFOLIO</span>
       <strong>{portfolio.title}</strong><small>{portfolio.version} · {portfolio.units.length} Units</small>
     </div>
     <button type="button" onClick={onRegistration} className="qf-ref-declaration">
       <ClipboardList size={16}/> {portfolio.declarationAt?'Declaration accepted':'View declaration'}
     </button>
   </div>
   <div className="qf-ref-ribbon-grid">
     <ProgressItem title="Started" rate={started} variant="started" caption={progress.started+' of '+progress.total+' required Outcomes started'}/>
     <ProgressItem title="Completed" rate={completed} variant="completed" caption={progress.verified+' Outcomes verified'}/>
     <ProgressItem title="Expected" rate={expected} variant="expected" caption={expected===null?'No valid target timeline': 'Elapsed time across the programme timeline'}/>
     <div className="qf-ref-reviewer">
       <div><Users size={16}/><span>Assessor</span></div>
       <strong>{portfolio.assessor||'Not yet assigned'}</strong>
       <small>Assessment decisions</small>
     </div>
     <div className="qf-ref-reviewer">
       <div><ShieldCheck size={16}/><span>Internal Verifier</span></div>
       <strong>{portfolio.verifier||'Not yet assigned'}</strong>
       <small>Verification decisions</small>
     </div>
   </div>
   <div className="qf-ref-ribbon-footer">
     <span><CalendarDays size={14}/> Official start: <strong>{formatDate(portfolio.startsOn)}</strong></span>
     <span><CalendarDays size={14}/> Target end: <strong>{formatDate(portfolio.targetOn)}</strong></span>
     {portfolio.completedAt&&<span><CheckCircle2 size={14}/> Completed: <strong>{formatDate(portfolio.completedAt)}</strong></span>}
   </div>
 </section>;
}

// Only values derivable from real portfolio records are displayed as metrics.
// OJT/Off-job hours in the reference platform have no equivalent saved records yet.
export function PortfolioMetrics({portfolio,progress,onOutcome}){
 const outcomes=progress.outcomes;
 const submissions=outcomes.flatMap(o=>o.submissions||[]);
 const reviews=submissions.flatMap(s=>s.reviews||[]);
 const mappedCriteria=outcomes.reduce((sum,outcome)=>{
   const mapping=outcome.claim?.mapping||outcome.submissions?.[0]?.snapshot?.mapping||{};
   return sum+outcome.criteria.filter(c=>Array.isArray(mapping[c.id])&&mapping[c.id].length>0).length;
 },0);
 const allCriteria=outcomes.reduce((sum,outcome)=>sum+outcome.criteria.length,0);
 const counts=[
   {label:'Evidence files & records',value:portfolio.evidence.length,icon:FileText},
   {label:'Criteria with evidence linked',value:mappedCriteria+' / '+allCriteria,icon:ClipboardList},
   {label:'Submitted assessment revisions',value:submissions.length,icon:TrendingUp},
   {label:'Recorded assessor/verifier reviews',value:reviews.length,icon:ShieldCheck},
 ];
 return <div className="qf-ref-metrics">
   <div className="qf-live-section-heading"><div><span className="qf-overline">ASSESSMENT ANALYTICS</span><h2>Portfolio metrics</h2></div><span>Live records only</span></div>
   <div className="qf-ref-metrics-stats">{counts.map(item=>{
     const Icon=item.icon;
     return <div key={item.label}><Icon size={19}/><strong>{item.value}</strong><span>{item.label}</span></div>;
   })}</div>
   <section className="qf-card qf-ref-metrics-unit">
     <div className="qf-card-header"><h3>Unit progress</h3><span>{progress.verified}/{progress.total} required Outcomes verified</span></div>
     <div className="qf-ref-unit-metrics">{portfolio.units.map((unit,index)=>{
       const required=unit.outcomes.filter(o=>o.required);
       const verified=required.filter(o=>claimState(o)==='verified');
       return <div key={unit.id} className="qf-ref-unit-metric">
         <div><span>Unit {String(index+1).padStart(2,'0')} · {unit.title}</span><strong>{verified.length}/{required.length}</strong></div>
         <progress aria-label={'Unit '+(index+1)+' completion'} max="100" value={pct(verified.length,required.length)}/>
         {unit.outcomes.some(o=>claimState(o)==='changes_requested')&&<small>Assessment changes requested</small>}
         {unit.outcomes.filter(o=>['submitted','awaiting_verification','verification_returned'].includes(claimState(o))).map(o=>
           <button type="button" key={o.id} onClick={()=>onOutcome(o.id)}>{o.code}: {claimState(o).replaceAll('_',' ')}</button>)}
       </div>;
     })}</div>
   </section>
   <section className="qf-card qf-ref-hours">
     <div className="qf-card-header"><h3>On-the-job / Off-the-job training</h3></div>
     <p>Training-hour entries are not yet recorded by this assessment portfolio. No hours are inferred from uploads, logins or Outcome activity.</p>
     <div><span>On-the-job training <strong>Not recorded</strong></span><span>Off-the-job training <strong>Not recorded</strong></span></div>
   </section>
 </div>;
}
