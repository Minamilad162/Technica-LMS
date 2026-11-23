import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,BarChart3,BookOpen,CheckCircle2,ExternalLink,FileText,FolderOpen,GraduationCap,Info,Layers3,LibraryBig,LockKeyhole,MessageSquare,ShieldCheck} from 'lucide-react';


import './qualificationSourcePreview.css';
import QualificationEvidenceTemplates from './QualificationEvidenceTemplates.jsx';
import QualificationInternalNav from './QualificationInternalNav.jsx';
import QualificationUnitNavigation from './QualificationUnitNavigation.jsx';
import QualificationOutcome, {ReadOnlyOutcomeDetails} from './QualificationOutcome.jsx';

const keys={othm6:['technica-source-othm6-2026','technica-source-othm6-2023'],
  othm7:['technica-source-othm7-2023'],nvq6:['technica-source-nvq6-2018']};

export function getQualificationSources(item,references=[]){
 const ids=keys[item?.id]||[];
 return ids.map(key=>references.find(source=>source.catalog_key===key)).filter(Boolean);
}

function SourceDocument({source}){
 return <section className="qsrc-source-card">
  <div className="qsrc-source-card-heading"><FileText size={19}/><div><h3>Source specification</h3>
    <small>{source.version} · Qualification {source.reference_number}</small></div></div>
  <p>{source.status==='centre_published'
    ? 'This programme is published by the centre. Always check the approved specification and assigned version.'
    : 'Awarding-body reference content. Centre publication, learner enrolment and assessor assignment are separate steps.'}</p>
  {source.source_url&&<a href={source.source_url} target="_blank" rel="noopener noreferrer" className="qsrc-source-link">
    Open the original specification <ExternalLink size={16}/></a>}
 </section>;
}

export default function QualificationSourcePreview({item,references=[],onBack,embedded=false}) {
 const sources=getQualificationSources(item,references);
 const [sourceKey,setSourceKey]=useState(sources[0]?.catalog_key||'');
 const [unitIndex,setUnitIndex]=useState(0);
 const [outcomeIndex,setOutcomeIndex]=useState(null);
 const jumpTo=(nextUnit,nextOutcome=null)=>{
   setUnitIndex(nextUnit);
   setOutcomeIndex(nextOutcome);
 };
 const changeSection=nextSection=>{
   setSection(nextSection);
   setOutcomeIndex(null);
 };
 const [section,setSection]=useState('course');
 const source=sources.find(s=>s.catalog_key===sourceKey)||sources[0];
 const unit=source?.units?.[unitIndex];
 const outcome=unit?.outcomes[outcomeIndex];
 if(!source)return <div className="qsrc-page"><button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={16}/> Qualifications</button>
   <div className="qsrc-empty"><Info size={22}/><div><h2>Qualification source not available</h2>
     <p>The centre has not imported this awarding-body version into the reference database. No demo content will be substituted.</p></div></div></div>;
 const fullCount=source.units.reduce((n,u)=>n+u.outcomes.length,0);
 const acCount=source.units.reduce((n,u)=>n+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0);
 const isReference=source.status!=='centre_published';
 return <div className={'qsrc-page'+(embedded?' qsrc-embedded':'')}>
  {!embedded&&<button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={17}/> All qualifications</button>}
  {!embedded&&<header className={'qf-live-feature qsrc-hero qf-course-theme-'+item.color}>
    <img src={item.heroImage} alt="" aria-hidden="true"/><div className="qf-live-feature-shade"/>
    <div className="qf-live-feature-content"><span className="qf-live-eyebrow">{item.body} · AWARDING-BODY SYLLABUS</span>
      <h1>{source.title}</h1><div className="qf-live-feature-meta">
        <span><GraduationCap size={16}/> Level {item.level}</span>
        <span><Layers3 size={16}/> {source.units.length} mandatory Units</span>
        <span>{source.reference_number}</span></div></div>
  </header>}
  {!embedded&&<QualificationInternalNav active={section} onChange={changeSection}
    ariaLabel="Qualification course, evidence, registration, contact, metrics and library"
    readOnly={source.status!=='centre_published'}/>}
  <div className="qsrc-overview">
    <div><span className="qsrc-icon"><BookOpen size={19}/></span><strong>{source.units.length}</strong><small>Official Units</small></div>
    <div><span className="qsrc-icon"><LibraryBig size={19}/></span><strong>{fullCount||'—'}</strong><small>Imported Learning Outcomes</small></div>
    <div><span className="qsrc-icon"><CheckCircle2 size={19}/></span><strong>{acCount||'—'}</strong><small>Imported Assessment Criteria</small></div>
  </div>
  <div className="qsrc-edition-row">
    <div><span className="qf-overline">QUALIFICATION VERSION</span><h2>Official syllabus</h2></div>
    {sources.length>1&&<label className="qsrc-edition-picker">Specification edition
      <select value={source.catalog_key} onChange={e=>{setSourceKey(e.target.value);jumpTo(0);}}>
        {sources.map(s=><option value={s.catalog_key} key={s.catalog_key}>{s.version} · {s.reference_number}</option>)}
      </select></label>}
    {sources.length===1&&<span className="qsrc-edition-single">{source.version}</span>}
  </div>
  <div className="qsrc-source-note"><Info size={18}/><div>
    <strong>{isReference ? 'Verified source reference — not a learner enrolment' : 'Centre-published syllabus'}</strong>
    <p>{source.version==='November 2026'
      ? 'The November 2026 OTHM Level 6 specification has a new qualification number and revised Units, Learning Outcomes and Assessment Criteria. All official content shown here is source-backed; the former 2023 standards do not apply to this edition. Centre approval is required before live assessment.'
      : 'This syllabus uses real Unit titles, Learning Outcomes and Assessment Criteria imported from the supplied awarding-body specification. It is not a demo. Centre approval is still required before using this version for live grading.'}</p>
  </div></div>
  {(embedded||section==='course')&&!unit&&<div className="qsrc-empty"><Info size={19}/><p>No units are available for this edition.</p></div>}
  {(embedded||section==='course')&&outcome&&<QualificationOutcome units={source.units}
    unitIndex={unitIndex} outcomeIndex={outcomeIndex} onJump={jumpTo} onBack={()=>setOutcomeIndex(null)}
    aim={unit.aim} sourceUrl={source.source_url} status="Reference view">
    <ReadOnlyOutcomeDetails unit={unit} outcome={outcome}/>
  </QualificationOutcome>}
  {(embedded||section==='course')&&unit&&!outcome&&<section className="qsrc-course">
    <QualificationUnitNavigation units={source.units} selectedIndex={unitIndex} onSelect={setUnitIndex}/>
    <div className="qsrc-structure">
    <div className="qsrc-unit-content" key={unit.code}>
      <header className="qsrc-unit-heading"><span className="qf-overline">UNIT {String(unitIndex+1).padStart(2,'0')} · {unit.code}</span><h2>{unit.title}</h2>
        <div className="qsrc-unit-meta"><span>{unit.outcomes.length} Learning Outcomes</span><span>{unit.outcomes.reduce((n,o)=>n+o.criteria.length,0)} Assessment Criteria</span></div>
        <div className="qsrc-unit-paging" aria-label="Navigate qualification units">
          <button type="button" disabled={unitIndex===0} onClick={()=>setUnitIndex(Math.max(0,unitIndex-1))}>
            <ArrowLeft size={16}/> Previous Unit</button>
          <label>Jump to Unit
            <select value={unitIndex} onChange={e=>setUnitIndex(Number(e.target.value))}>
              {source.units.map((u,index)=><option key={u.code} value={index}>
                {String(index+1).padStart(2,'0')} · {u.title}
              </option>)}
            </select>
          </label>
          <button type="button" disabled={unitIndex>=source.units.length-1}
            onClick={()=>setUnitIndex(Math.min(source.units.length-1,unitIndex+1))}>
            Next Unit <ArrowRight size={16}/></button>
        </div>
      </header>
      {unit.aim && <section className="qsrc-unit-aim">
        <div className="qsrc-section-heading"><BookOpen size={19}/><h3>Unit aim</h3></div>
        <p>{unit.aim}</p>
      </section>}
      {unit.outcomes.length ? <section className="qsrc-outcomes">
        <div className="qsrc-section-heading"><ShieldCheck size={19}/><h3>Learning Outcomes &amp; Assessment Criteria</h3></div>
        <div className="qf-live-list">{unit.outcomes.map((entry,index)=><button className="qsrc-outcome" type="button"
          key={entry.code} onClick={()=>jumpTo(unitIndex,index)}>
          <span><strong>{entry.code} · {entry.title}</strong><small>{entry.criteria.length} Assessment Criteria</small></span>
          <ArrowRight size={17}/>
        </button>)}</div>
      </section> : <div className="qsrc-awaiting"><Info size={22}/><div><h3>Current specification detail pending centre verification</h3>
        <p>The new 2026 Unit name and code are verified. Open the November 2026 source PDF for its complete current outcomes and criteria. Older standards are intentionally not shown as though they apply to this new Unit.</p>
        {source.source_url&&<a href={source.source_url} target="_blank" rel="noopener noreferrer">View official 2026 specification <ExternalLink size={15}/></a>}</div></div>}
      {unit.indicativeTopics?.length>0 && <section className="qsrc-materials">
        <div className="qsrc-section-heading"><BookOpen size={19}/><h3>Indicative study topics from source specification</h3></div>
        <ul className="qsrc-study-topics">{unit.indicativeTopics.map((topic,index)=><li key={unit.code+':'+index}>{topic}</li>)}</ul>
        <p className="qsrc-material-note">These topics are from the referenced awarding-body specification, not an uploaded centre-issued lesson pack.</p>
      </section>}
      {unit.assessmentNote && <section className="qsrc-source-assessment">
        <div className="qsrc-section-heading"><ShieldCheck size={18}/><h3>Assessment information from source</h3></div>
        <p>{unit.assessmentNote}</p>
      </section>}
    </div>
    <aside className="qsrc-aside"><SourceDocument source={source}/>
      <section className="qsrc-source-card"><div className="qsrc-source-card-heading"><LockKeyhole size={19}/><h3>Assessment access</h3></div>
        <p>This is a reference syllabus. Evidence submissions, assessor decisions and certificate recording require a centre-published version and a genuine learner enrolment.</p>
      </section></aside>
    </div>
  </section>}
  {!embedded&&section==='overview'&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <span className="qf-overline">QUALIFICATION OVERVIEW</span>
      <h2>Professional qualification structure</h2>
      <p>This is the awarding-body syllabus selected above. The actual Unit names, Learning Outcomes,
        Assessment Criteria and original specification are available for inspection. This is a
        reference view, not a record of learner registration or assessment.</p>
      <div className="qsrc-overview-unit-list">
        {source.units.map((u,index)=><button type="button" key={u.code} onClick={()=>{setUnitIndex(index);setSection('course');}}>
          <span>{String(index+1).padStart(2,'0')}</span><strong>{u.title}</strong><ArrowRight size={17}/>
        </button>)}
      </div>
    </section>
    <aside className="qsrc-aside"><SourceDocument source={source}/></aside>
  </div>}
  {!embedded&&section==='evidence'&&unit&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <h2>Evidence working forms</h2>
      <QualificationUnitNavigation units={source.units} selectedIndex={unitIndex} onSelect={setUnitIndex}/>
      <div className="qsrc-evidence-heading"><FileText size={17}/>
        <span>{unit.code} · {unit.title} · {unit.outcomes.reduce((n,o)=>n+o.criteria.length,0)} source criteria</span></div>
      {unit.outcomes.length>0?<QualificationEvidenceTemplates key={unit.code} unit={unit} compact/>:
        <div className="qsrc-empty"><Info size={19}/><p>Assessment criteria for this edition have not been imported. No forms can be generated.</p></div>}
    </section>
    <aside className="qsrc-aside"><div className="qsrc-source-card">
      <div className="qsrc-source-card-heading"><FolderOpen size={19}/><h3>Evidence Bank · Upload &amp; Multi-Unit Mapping</h3></div>
      <p>Requires actual centre-approved learner enrolment. From your enrolled portfolio, open Evidence
        to upload a file, write evidence, or link a record across Units.</p>
      <button type="button" className="qsrc-source-link" onClick={()=>setSection('course')}>View Unit criteria <ArrowRight size={16}/></button>
    </div></aside>
  </div>}
  {!embedded&&section==='registration'&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <span className="qf-overline">REGISTRATION</span><h2>Qualification registration</h2>
      <div className="qsrc-fact-rows">
        <div><span>Programme</span><strong>{source.title}</strong></div>
        <div><span>Qualification number</span><strong>{source.reference_number}</strong></div>
        <div><span>Specification</span><strong>{source.version}</strong></div>
        <div><span>Reference status</span><strong>{isReference?'Not yet published by centre':'Centre-published'}</strong></div>
        <div><span>Learner registration</span><strong>Not enrolled in this preview</strong></div>
        <div><span>Certificate</span><strong>No certificate associated with this preview</strong></div>
      </div>
      <p>Real registration, learner declarations, assigned Assessor and Verifier, target dates,
        and certificate references remain available only in a genuine enrolled portfolio.</p>
    </section><aside className="qsrc-aside"><SourceDocument source={source}/></aside>
  </div>}
  {!embedded&&section==='contact'&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <span className="qf-overline">COMMUNICATIONS</span><h2>Contact Diary</h2>
      <div className="qsrc-empty"><MessageSquare size={21}/><div><h3>No learner correspondence in a syllabus preview</h3>
        <p>Contact Diary records, Assessor feedback, requests for amendments, Verifier decisions and
        resubmission history are private to a genuine learner enrolment. This reference view does not
        invent messages or display another learner’s records.</p></div></div>
    </section><aside className="qsrc-aside"><div className="qsrc-source-card">
      <div className="qsrc-source-card-heading"><MessageSquare size={19}/><h3>Contact the centre</h3></div>
      <p>For enrollment and assessment arrangements, use the centre’s normal support channels.</p>
    </div></aside>
  </div>}
  {!embedded&&section==='metrics'&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <span className="qf-overline">SOURCE COVERAGE</span><h2>Qualification metrics</h2>
      <p>These figures count published-source curriculum items, not learner progress or assessor results.</p>
      <div className="qsrc-metric-list">{source.units.map((u,index)=>{
        const count=u.outcomes.reduce((n,o)=>n+o.criteria.length,0);
        const max=Math.max(1,...source.units.map(x=>x.outcomes.reduce((n,o)=>n+o.criteria.length,0)));
        return <button key={u.code} type="button" className="qsrc-metric-unit" onClick={()=>{setUnitIndex(index);setSection('course');}}>
          <span><strong>{String(index+1).padStart(2,'0')} · {u.title}</strong><small>{u.outcomes.length} outcomes · {count} criteria</small></span>
          <span className="qsrc-metric-track"><span style={{width:(100*count/max)+'%'}}/></span>
        </button>;
      })}</div>
    </section><aside className="qsrc-aside"><SourceDocument source={source}/></aside>
  </div>}
  {!embedded&&section==='library'&&unit&&<div className="qsrc-section-layout">
    <section className="qsrc-information-card">
      <span className="qf-overline">STUDY LIBRARY</span><h2>Original source material</h2>
      <p>Read the imported Unit aims and indicative topics alongside the original awarding-body
        specification. Centre-authored Assignment Briefs and private uploaded files are
        separate from this reference library.</p>
      <label className="qsrc-unit-select">Unit
        <select value={unitIndex} onChange={e=>setUnitIndex(Number(e.target.value))}>
          {source.units.map((u,index)=><option key={u.code} value={index}>{String(index+1).padStart(2,'0')} · {u.title}</option>)}
        </select>
      </label>
      <div className="qsrc-source-unit-brief">
        <span className="qf-overline">{unit.code}</span><h3>{unit.title}</h3>
        {unit.aim?<p>{unit.aim}</p>:<p>The source did not provide an imported Unit aim for this edition.</p>}
        {unit.indicativeTopics?.length>0&&<>
          <h4>Indicative study topics</h4>
          <ul>{unit.indicativeTopics.map((topic,index)=><li key={index}>{topic}</li>)}</ul>
        </>}
        {unit.assessmentNote&&<p className="qsrc-material-note">{unit.assessmentNote}</p>}
      </div>
    </section><aside className="qsrc-aside"><SourceDocument source={source}/></aside>
  </div>}
 </div>;
}
