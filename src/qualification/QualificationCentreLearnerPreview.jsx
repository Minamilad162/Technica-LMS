import React,{useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ClipboardList,FileText,FolderOpen,GraduationCap,
 LockKeyhole,MessageSquare,BarChart3,ShieldCheck} from 'lucide-react';
import QualificationUnitNavigation from './QualificationUnitNavigation.jsx';
import QualificationOutcome, {ReadOnlyOutcomeDetails} from './QualificationOutcome.jsx';

// Design-only preview. It does not create enrolments, issue evidence, or call the backend.
// All Unit, Outcome and Criterion text comes from the authenticated source catalogue.
export default function QualificationCentreLearnerPreview({version,references,onBack}){
 const [tab,setTab]=useState('course');
 const [unitIndex,setUnitIndex]=useState(0);
 const [outcomeIndex,setOutcomeIndex]=useState(null);
 useEffect(()=>{setTab('course');setUnitIndex(0);setOutcomeIndex(null);},[version?.id]);
 const jumpTo=(nextUnit,nextOutcome=null)=>{
   setUnitIndex(nextUnit);
   setOutcomeIndex(nextOutcome);
 };
 const source=references.find(item=>item.catalog_key===version?.catalogKey);
 const units=source?.units||[];
 const unit=units[unitIndex] || units[0];
 const outcome=unit?.outcomes[outcomeIndex];
 const tabs=[['course','Course',BookOpen],['evidence','Evidence',FolderOpen],
  ['registration','Registration',GraduationCap],['contact','Contact',MessageSquare],
  ['metrics','Metrics',BarChart3]];
 return <div className="qf-ref-preview-shell">
   <div className="qf-ref-preview-banner"><div><LockKeyhole size={19}/>
     <div><strong>Administrator preview · Read only</strong>
       <span>No real learner, assessment decision, evidence record, or enrolment is created.</span></div></div>
     <button type="button" onClick={onBack}><ArrowLeft size={16}/> Back to Centre Admin</button>
   </div>
   <header className="qf-ref-preview-hero">
     <div><span>TECHNICA CONSULT · QUALIFICATION WORKSPACE PREVIEW</span>
       <h1>{version?.title||'Qualification Programme'}</h1>
       <p>{version?.version||'Reference edition'} · {units.length} official Units</p></div>
     <ShieldCheck size={34}/>
   </header>
   <div className="qf-ref-ribbon">
     <div className="qf-ref-ribbon-top"><div><span className="qf-ref-eyebrow">SOURCE-ONLY PROGRAMME PREVIEW</span>
       <strong>Assessment starts only after published approval and real learner enrolment.</strong>
     </div></div>
     <div className="qf-ref-ribbon-grid">
       {['Started','Completed','Expected'].map(label=><div key={label} className="qf-ref-progress-block">
         <div className="qf-ref-progress-heading"><span>{label}</span><strong>—</strong></div><progress max="100" value="0"/>
         <small>Not available before enrolment</small></div>)}
       {['Assessor','Internal Verifier'].map(role=><div key={role} className="qf-ref-reviewer">
         <div><ShieldCheck size={16}/><span>{role}</span></div><strong>Not yet assigned</strong>
         <small>Assignment required</small></div>)}
     </div>
     <div className="qf-ref-ribbon-footer"><span><CalendarDays size={14}/> Official start:
       <strong>Not assigned</strong></span><span>Target end: <strong>Not assigned</strong></span></div>
   </div>
   <nav className="qf-ref-preview-tabs" aria-label="Preview programme sections">
     {tabs.map(([key,label,Icon])=><button type="button" key={key} aria-pressed={tab===key}
       onClick={()=>{setTab(key);setOutcomeIndex(null);}}><Icon size={16}/>{label}</button>)}
   </nav>
   {tab==='course'&&<section className="qf-ref-preview-course">
     {outcome ? <QualificationOutcome units={units} unitIndex={unitIndex} outcomeIndex={outcomeIndex}
       onJump={jumpTo} onBack={()=>setOutcomeIndex(null)} aim={unit.aim}
       sourceUrl={source?.source_url} status="Preview · No learner enrolment">
       <ReadOnlyOutcomeDetails unit={unit} outcome={outcome}/>
     </QualificationOutcome> : units.length===0?<div className="qf-card"><p>The official source Units are not yet available for preview.</p></div>:<>
       <QualificationUnitNavigation units={units} selectedIndex={unitIndex} onSelect={setUnitIndex}/>
       <div className="qf-unit-heading"><div><span className="qf-overline">{unit.code}</span>
         <h2>{unit.title}</h2></div></div>
       {unit.aim&&<section className="qf-card"><div className="qf-card-header"><h3>Unit aim</h3></div>
         <p>{unit.aim}</p></section>}
       <div className="qf-ref-preview-columns">
         <section className="qf-card"><div className="qf-card-header"><h3>Activity · Learning Outcomes</h3></div>
           <div className="qf-live-list">{(unit.outcomes||[]).map((o,index)=><button type="button" key={o.code} onClick={()=>jumpTo(unitIndex,index)}>
             <span><strong>{o.code} · {o.title}</strong></span>
             <ArrowRight size={15}/></button>)}</div></section>
         <section className="qf-card"><div className="qf-card-header"><h3>Gap Analysis · Assessment Criteria</h3></div>
           <div className="qf-live-gaps">{(unit.outcomes||[]).map(o=><details key={o.code}>
             <summary>{o.code} · {o.title}</summary>
             <ul>{(o.criteria||[]).map(c=><li key={c.code}>{c.code} · {c.title}<small>Not mapped</small></li>)}</ul>
           </details>)}</div></section>
       </div>
       {source?.source_url?.startsWith('https://')&&<a className="qf-ref-preview-source"
         href={source.source_url} rel="noopener noreferrer" target="_blank">
         <FileText size={16}/> Official source specification</a>}
     </>}
   </section>}
   {tab==='evidence'&&<section className="qf-card qf-ref-preview-empty"><FolderOpen size={26}/>
      <h3>Evidence Folder</h3><p>No learner evidence exists in source preview. After enrolment, learners can upload files, write evidence,
      map it to Assessment Criteria and download their showcase.</p></section>}
   {tab==='registration'&&<section className="qf-card qf-ref-preview-empty"><GraduationCap size={26}/>
      <h3>Candidate Registration Form</h3>
      <p>Registered learners complete a private form and accept the centre's declaration.</p>
      <div className="qf-ref-preview-reg">{['Personal','Professional','Certificate','General','Funding'].map(label=>
        <div key={label}><ClipboardList size={16}/>{label}<LockKeyhole size={14}/></div>)}</div></section>}
   {tab==='contact'&&<section className="qf-card qf-ref-preview-empty"><MessageSquare size={26}/>
      <h3>Contact Diary</h3><p>No enrolled learner or assigned Assessor/Verifier yet.
      Real portfolios include private messages, meeting notes and assessment decisions.</p></section>}
   {tab==='metrics'&&<section className="qf-card qf-ref-preview-empty"><BarChart3 size={26}/>
      <h3>Metrics · Training &amp; Assessment Progress</h3><p>No learner data, submissions or training hours are recorded in this preview.
       Live reports show verified Outcomes and explicitly learner-reported On/Off-job time.</p></section>}
 </div>;
}
