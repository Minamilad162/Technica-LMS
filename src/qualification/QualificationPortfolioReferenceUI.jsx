import React,{useEffect,useState} from 'react';
import {CalendarDays,CheckCircle2,ClipboardList,FileText,ShieldCheck,TrendingUp,Users} from 'lucide-react';
import {claimState,portfolioRpc} from './qualificationPortfolioApi.js';

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
export function PortfolioMetrics({db,portfolio,progress,onOutcome}){
 const [training,setTraining]=useState(null);
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const [category,setCategory]=useState('on_job');
 const [minutes,setMinutes]=useState('60');
 const [date,setDate]=useState(()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10));
 const [description,setDescription]=useState('');
 const canReport=portfolio.role==='learner'&&portfolio.canEdit;
 useEffect(()=>{
   let alive=true;
   portfolioRpc(db,'training_list',{p_enrolment:portfolio.id})
    .then(result=>{if(alive){setTraining(Array.isArray(result)?result:[]);setError('');}})
    .catch(e=>{if(alive)setError(e?.message||'Unable to load training records.');});
   return ()=>{alive=false;};
 },[db,portfolio.id,refresh]);
 const saveTraining=async e=>{
   e.preventDefault();
   if(saving||!canReport||!description.trim())return;
   setSaving(true);setError('');
   try{
     await portfolioRpc(db,'training_add',{
       p_enrolment:portfolio.id,p_date:date,p_category:category,
       p_minutes:Number(minutes),p_description:description.trim()
     });
     setDescription('');setTraining(null);setRefresh(old=>old+1);
   }catch(e){setError(e?.message||'Unable to record training activity.');}
   finally{setSaving(false);}
 };
 const logged=Array.isArray(training)?training:[];
 const totals={on_job:0,off_job:0};
 for(const item of logged){if(Object.hasOwn(totals,item.category))totals[item.category]+=item.minutes;}
 const hours=minutes=>(minutes/60).toLocaleString(undefined,{maximumFractionDigits:2})+' h';
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
     <div className="qf-card-header"><h3>On-the-job / Off-the-job training</h3><span>Learner-reported activity</span></div>
     <p>Record professional training activity here. Entries are not automatically accepted as Assessment Evidence or verified study hours.</p>
     {error&&<p className="qf-live-error" role="alert">{error} <button type="button" className="qf-live-link" onClick={()=>setRefresh(old=>old+1)}>Retry</button></p>}
     <div className="qf-ref-hours-total">
       <span>On-the-job training <strong>{logged.length?hours(totals.on_job):'Not recorded'}</strong></span>
       <span>Off-the-job training <strong>{logged.length?hours(totals.off_job):'Not recorded'}</strong></span>
     </div>
     {canReport&&<form className="qf-ref-hours-form" onSubmit={saveTraining}>
       <label className="qf-field">Date<input type="date" required min={portfolio.startsOn}
         max={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}
         value={date} disabled={saving} onChange={e=>setDate(e.target.value)}/></label>
       <label className="qf-field">Training type<select value={category} disabled={saving}
         onChange={e=>setCategory(e.target.value)}><option value="on_job">On the job</option>
         <option value="off_job">Off the job</option></select></label>
       <label className="qf-field">Duration (minutes)<input type="number" required min={1} max={1440}
         value={minutes} disabled={saving} onChange={e=>setMinutes(e.target.value)}/></label>
       <label className="qf-field qf-ref-hours-description">Activity description<textarea required
         rows={3} maxLength={1000} minLength={5} value={description} disabled={saving}
         onChange={e=>setDescription(e.target.value)} placeholder="Describe the activity actually completed..."/></label>
       <button type="submit" disabled={saving||description.trim().length<5} className="qf-button qf-primary">
         {saving?'Saving activity...':'Record training activity'}</button>
     </form>}
     {training===null&&!error&&<p>Loading training activity...</p>}
     {training?.length===0&&<p>No training activities have been recorded yet.</p>}
     {!!training?.length&&<div className="qf-ref-hours-list" role="region" aria-label="Recorded training activity">
       <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Duration</th></tr></thead>
       <tbody>{training.map(item=><tr key={item.id}><td>{formatDate(item.date)}</td>
        <td>{item.category==='on_job'?'On the job':'Off the job'}</td><td dir="auto">{item.description}</td>
        <td>{hours(item.minutes)}</td></tr>)}</tbody></table>
     </div>}
   </section>
 </div>;
}
