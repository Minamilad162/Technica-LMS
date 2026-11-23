import React from 'react';
import {Award,CalendarDays,Check,CheckCircle2,ClipboardCheck,ExternalLink,ShieldCheck} from 'lucide-react';
import './qualificationExperience.css';

const formatDate=value=>{
 if(!value)return 'Not recorded';
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'Not recorded':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d);
};
export function QualificationIdentity({portfolio,source,heroImage,body,level}){
 const title=portfolio?.title||source?.title||'Qualification';
 const version=portfolio?.version||source?.version;
 const published=source?.status==='centre_published';
 const complete=Boolean(portfolio?.completedAt);
 return <header className="qxp-identity">
  <div className="qxp-identity-mark">{heroImage?<img src={heroImage} alt="" aria-hidden="true"/>:<Award size={28}/>}</div>
  <div className="qxp-identity-content">
   <span className="qxp-eyebrow">{body||'TECHNICA'} · {portfolio?'ENROLLED QUALIFICATION':'OFFICIAL SYLLABUS'}</span>
   <h1>{title}</h1>
   <div className="qxp-identity-meta">{level&&<span>Level {level}</span>}
    {source?.reference_number&&<span>Ref {source.reference_number}</span>}
    {version&&<span>Version {version}</span>}
    <span>{(portfolio?.units||source?.units||[]).length} Units</span>
   </div>
  </div>
  <span className={'qxp-state '+(portfolio?(complete?'done':'active'):(published?'done':'reference'))}>
   {portfolio?(complete?'Completed':'In progress'):(published?'Centre-published':'Reference syllabus')}
  </span>
 </header>;
}
const stageTone=(done,active)=>done?'done':active?'current':'waiting';
const Stage=({label,detail,done,active})=><li className={'qxp-step '+stageTone(done,active)}>
 <span className="qxp-step-dot" aria-hidden="true">{done?<Check size={15}/>:null}</span>
 <div><strong>{label}</strong><small>{detail}</small></div>
 <span className="qxp-step-state">{done?'Complete':active?'In progress':'Pending'}</span>
</li>;
export function QualificationRegistrationSummary({portfolio,source,progress}){
 const enrolled=Boolean(portfolio),published=source?.status==='centre_published';
 const declared=Boolean(portfolio?.declarationAt),verified=Boolean(enrolled&&progress?.ready);
 const finished=Boolean(portfolio?.completedAt),hasCertificate=Boolean(portfolio?.certificate);
 const stages=enrolled?[
  {label:'Enrolment',done:true,detail:'Enrolled programme record'},
  {label:'Learner declaration',done:declared,active:!declared,detail:declared?'Accepted '+formatDate(portfolio.declarationAt):'Declaration not yet accepted'},
  {label:'Assessment & verification',done:verified,active:declared&&!verified,detail:verified?'All required Outcomes verified':String(progress?.verified??0)+' / '+String(progress?.total??0)+' required Outcomes verified'},
  {label:'Programme completion',done:finished,active:verified&&!finished,detail:finished?'Completed '+formatDate(portfolio.completedAt):'Pending programme completion'},
  {label:'Certificate record',done:hasCertificate,active:finished&&!hasCertificate,detail:hasCertificate?'Issued certificate reference recorded':'Certificate not recorded'},
 ]:[
  {label:'Centre publication',done:published,active:!published,detail:published?'Published by centre':'Reference syllabus only'},
  {label:'Learner enrolment',done:false,detail:'Not part of the reference view'},
  {label:'Declaration',done:false,detail:'Requires enrolment'},
  {label:'Assessment & verification',done:false,detail:'Requires a submitted portfolio'},
  {label:'Certificate record',done:false,detail:'Requires authorised completion'},
 ];
 const facts=enrolled?[
  ['Programme',portfolio.title],['Specification',portfolio.version],
  ['Learner',portfolio.learner||'Not available'],['Assessor',portfolio.assessor||'Not assigned'],
  ['Internal Verifier',portfolio.verifier||'Not assigned'],
  ['Official start',formatDate(portfolio.startsOn)],['Target completion',formatDate(portfolio.targetOn)],
  ['Declaration',declared?'Accepted '+formatDate(portfolio.declarationAt):'Not accepted'],
  ['Required Outcomes',String(progress?.verified??0)+' / '+String(progress?.total??0)+' verified'],
 ]:[
  ['Programme',source?.title||'—'],['Qualification number',source?.reference_number||'—'],
  ['Specification',source?.version||'—'],['Centre publication',published?'Published':'Reference only'],
  ['Learner enrolment','Not applicable to this source view'],
  ['Assessor','Not assigned in this source view'],
  ['Internal Verifier','Not assigned in this source view'],
 ];
 return <div className="qxp-registration">
  <div className="qxp-section-head"><div><span className="qxp-eyebrow">QUALIFICATIONS</span><h2>Registration</h2><p>Recorded programme facts and completion stages.</p></div></div>
  <div className="qxp-stage-strip" role="list" aria-label="Registration stages">
   {stages.map(step=><span key={step.label} role="listitem" className={'qxp-stage '+stageTone(step.done,step.active)}>
    {step.done?<CheckCircle2 size={17}/>:<span className="qxp-stage-ring"/>}<span>{step.label}</span></span>)}
  </div>
  <div className="qxp-registration-grid">
   <section className="qxp-panel qxp-facts"><div className="qxp-panel-heading"><ClipboardCheck size={19}/><h3>Registration details</h3></div>
    <dl>{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
   </section>
   <section className="qxp-panel"><div className="qxp-panel-heading"><CalendarDays size={19}/><h3>Registration progress</h3></div>
    <ol className="qxp-steps">{stages.map(step=><Stage key={step.label} {...step}/>)}</ol>
   </section>
   <aside className="qxp-reg-side">
    <section className="qxp-panel"><div className="qxp-panel-heading"><ShieldCheck size={19}/><h3>Centre &amp; access</h3></div>
     <p>{enrolled?'Learner and assigned reviewer permissions control this enrolment.':'An awarding-body source reference does not create a learner enrolment.'}</p>
     {source&&<div className="qxp-ref-facts"><span>Source edition</span><strong>{source.version}</strong><span>Centre publication</span><strong>{published?'Published':'Reference only'}</strong></div>}
     {source?.source_url?.startsWith('https://')&&<a href={source.source_url} target="_blank" rel="noopener noreferrer" className="qxp-inline-action">Original specification <ExternalLink size={15}/></a>}
    </section>
    <section className="qxp-panel"><div className="qxp-panel-heading"><Award size={19}/><h3>Certificate record</h3></div>
     <div className={'qxp-certificate-'+(hasCertificate?'done':'pending')}><Award size={20}/><strong>{hasCertificate?'Recorded':finished?'Awaiting issued certificate':'Not ready'}</strong></div>
     {hasCertificate?<p>Certificate ref: <strong dir="auto">{portfolio.certificate}</strong><br/>Recorded: {formatDate(portfolio.certificateDate)}</p>:
      <p>{enrolled?'Certificate steps remain controlled by authorised staff and completion checks.':'Certificate details appear only inside an enrolled qualification.'}</p>}
    </section>
   </aside>
  </div>
 </div>;
}
