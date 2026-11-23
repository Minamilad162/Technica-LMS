import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,BarChart3,BookOpen,CheckCircle2,ExternalLink,FileText,FolderOpen,GraduationCap,Info,Layers3,LibraryBig,LockKeyhole,MessageSquare,ShieldCheck,Upload} from 'lucide-react';


import './qualificationSourcePreview.css';
import QualificationEvidenceTemplates from './QualificationEvidenceTemplates.jsx';
import QualificationInternalNav from './QualificationInternalNav.jsx';
import QualificationUnitNavigation from './QualificationUnitNavigation.jsx';
import {QualificationIdentity,QualificationRegistrationSummary} from './QualificationRegistrationExperience.jsx';
import QualificationEvidenceMatrix from './QualificationEvidenceMatrix.jsx';
import QualificationStudyLibrary from './QualificationStudyLibrary.jsx';
import QualificationSourceDashboard from './QualificationSourceDashboard.jsx';
import QualificationOutcome, {ReadOnlyOutcomeDetails} from './QualificationOutcome.jsx';
import {EvidenceUnitMaterials} from './QualificationLearningResources.jsx';

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

export default function QualificationSourcePreview({item,references=[],onBack,embedded=false,learnerPortfolios=[],practicePortfolio,onOpenEvidence}) {
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
 const [section,setSection]=useState(embedded?'course':'overview');
 const source=sources.find(s=>s.catalog_key===sourceKey)||sources[0];
 const unit=source?.units?.[unitIndex];
 const outcome=unit?.outcomes[outcomeIndex];
 if(!source)return <div className="qsrc-page"><button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={16}/> Qualifications</button>
   <div className="qsrc-empty"><Info size={22}/><div><h2>Qualification source not available</h2>
     <p>The centre has not imported this awarding-body version into the reference database. No demo content will be substituted.</p></div></div></div>;
 const fullCount=source.units.reduce((n,u)=>n+u.outcomes.length,0);
 const acCount=source.units.reduce((n,u)=>n+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0);
 const isReference=source.status!=='centre_published';
 const enrolled = learnerPortfolios.filter(portfolio => portfolio.catalogKey === source.catalog_key);
 const needsUploadRoute = !embedded && section === 'evidence';
 return <div className={'qsrc-page'+(embedded?' qsrc-embedded':'')}>
  {!embedded&&<button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={17}/> All qualifications</button>}
  {!embedded&&<QualificationIdentity source={source} heroImage={item.heroImage} body={item.body} level={item.level}/>}
   <div className="qsrc-edition-row">
    <div><span className="qf-overline">QUALIFICATION VERSION</span><h2>Official syllabus</h2></div>
    {sources.length>1&&<label className="qsrc-edition-picker">Specification edition
      <select value={source.catalog_key} onChange={e=>{setSourceKey(e.target.value);jumpTo(0);}}>
        {sources.map(s=><option value={s.catalog_key} key={s.catalog_key}>{s.version} · {s.reference_number}</option>)}
      </select></label>}
    {sources.length===1&&<span className="qsrc-edition-single">{source.version}</span>}
  </div>
  {unit && <QualificationUnitNavigation units={source.units} selectedIndex={unitIndex} onSelect={index => {jumpTo(index);if(section==='overview')setSection('course');}}/>}
  {!embedded&&<QualificationInternalNav active={section} onChange={changeSection}
    ariaLabel="Unit sections" unitContext readOnly={isReference}/>}
  {section==='course' && !embedded && isReference && <p className="qsrc-compact-reference-note"><Info size={14}/> Source reference · Enrolment and assessment remain separate.</p>}
  {(embedded||section==='course')&&!unit&&<div className="qsrc-empty"><Info size={19}/><p>No units are available for this edition.</p></div>}
  {(embedded||section==='course')&&outcome&&<QualificationOutcome units={source.units}
    unitIndex={unitIndex} outcomeIndex={outcomeIndex} onJump={jumpTo} onBack={()=>setOutcomeIndex(null)}
    aim={unit.aim} sourceUrl={source.source_url} status="Reference view">
    <ReadOnlyOutcomeDetails unit={unit} outcome={outcome}/>
  </QualificationOutcome>}
  {(embedded||section==='course')&&unit&&!outcome&&<section className="qsrc-course">
    <div className="qsrc-structure">
    <div className="qsrc-unit-content" key={unit.code}>
      <header className="qsrc-unit-heading">
        <div className="qsrc-compact-unit-title"><div><span className="qf-overline">Unit {String(unitIndex+1).padStart(2,'0')} · {unit.code}</span>
          <h2>{unit.title}</h2></div>
          <div className="qsrc-unit-meta"><span>{unit.outcomes.length} Learning Outcomes</span><span>{unit.outcomes.reduce((n,o)=>n+o.criteria.length,0)} Assessment Criteria</span></div>
        </div>
        <div className="qsrc-unit-paging" aria-label="Navigate qualification units">
          <button type="button" disabled={unitIndex===0} onClick={()=>setUnitIndex(Math.max(0,unitIndex-1))}>
            <ArrowLeft size={16}/> Previous Unit</button>
          <label>Jump to Unit / Outcome
            <select value={String(unitIndex)} onChange={event => {
              const [targetUnit, targetOutcome] = event.target.value.split(':');
              jumpTo(Number(targetUnit), targetOutcome === undefined ? null : Number(targetOutcome));
            }}>
              {source.units.map((entry,index)=><optgroup key={entry.code} label={entry.title}>
                <option value={index}>{String(index+1).padStart(2,'0')} · Unit overview</option>
                {entry.outcomes.map((outcome,indexInUnit) => <option key={outcome.code} value={index + ':' + indexInUnit}>
                  {outcome.code} · {outcome.title}
                </option>)}
              </optgroup>)}
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
        <div className="qsrc-section-heading"><ShieldCheck size={19}/><h3>Activity · Learning Outcomes</h3></div>
        <p>Learner progress and deadlines are available in an enrolled portfolio.</p>
        <div className="qf-live-list">{unit.outcomes.map((entry,index)=><button className="qsrc-outcome" type="button"
          key={entry.code} onClick={()=>jumpTo(unitIndex,index)}>
          <span><strong>{entry.code} · {entry.title}</strong><small>{entry.criteria.length} Assessment Criteria</small></span>
          <ArrowRight size={17}/>
        </button>)}</div>
      </section> : <div className="qsrc-awaiting"><Info size={22}/><div><h3>Current specification detail pending centre verification</h3>
        <p>The new 2026 Unit name and code are verified. Open the November 2026 source PDF for its complete current outcomes and criteria. Older standards are intentionally not shown as though they apply to this new Unit.</p>
        {source.source_url&&<a href={source.source_url} target="_blank" rel="noopener noreferrer">View official 2026 specification <ExternalLink size={15}/></a>}</div></div>}
      {!embedded && <div className="qsrc-quick-actions">
        <button type="button" onClick={() => changeSection('evidence')}><FolderOpen size={16}/> Evidence materials <ArrowRight size={15}/></button>
        <button type="button" onClick={() => changeSection('contact')}><MessageSquare size={16}/> Contact Diary <ArrowRight size={15}/></button>
      </div>}
      {!!unit.outcomes.length && <section className="qsrc-outcomes">
        <div className="qsrc-section-heading"><ShieldCheck size={19}/><h3>Gap Analysis · Assessment Criteria</h3></div>
        <div className="qf-live-gaps">{unit.outcomes.map(entry => <details key={entry.code}>
          <summary>{entry.code} · {entry.title}</summary>
          <ul>{entry.criteria.map(criterion => <li key={criterion.code}>{criterion.code} · {criterion.title}</li>)}</ul>
        </details>)}</div>
      </section>}
      
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
      <details className="qsrc-access-disclosure"><summary>Assessment access requirements</summary>
        <p>This is a reference syllabus. Evidence submissions, assessor decisions and certificate recording require a centre-published version and a genuine learner enrolment.</p>
      </details></aside>
    </div>
  </section>}
  {!embedded&&section==='overview'&&<QualificationSourceDashboard source={source}
    onUnit={index=>{jumpTo(index);setSection('course');}}
    onEvidence={()=>changeSection('evidence')}
    onLibrary={()=>changeSection('library')}
    onRegistration={()=>changeSection('registration')}/>}
  {needsUploadRoute && unit && <div className="qsrc-evidence-page qf-evidence-experience">
    <section className="qsrc-evidence-access" aria-label="Evidence upload access">
      <span className="qsrc-evidence-access-icon"><Upload size={21} aria-hidden="true"/></span>
      <div>
        <h3>{enrolled.length ? 'Upload evidence' : 'Evidence upload'}</h3>
        {enrolled.length > 0 ? <p>Open your enrolled portfolio for this edition.</p> :
          <p>{isReference ? 'This edition is pending centre approval. Uploads for this qualification require an enrolment after publication.' :
            'Your account has no learner enrolment for this edition.'}</p>}

      </div>
      <div className="qsrc-evidence-access-actions">
        {enrolled.map(portfolio => <button key={portfolio.id} type="button" className="qf-button qf-primary"
          onClick={() => onOpenEvidence(portfolio.id, unit.code)}>
          <Upload size={16}/> {enrolled.length === 1 ? 'Upload evidence' : portfolio.title}
        </button>)}

        {!enrolled.length && <button type="button" className="qf-button qf-outline" onClick={onBack}>
          My qualifications <ArrowRight size={16}/>
        </button>}
      </div>
    </section>
    <EvidenceUnitMaterials key={unit.code + ':materials'} unit={unit} source={source}
      onOutcome={(_, index) => {setSection('course');jumpTo(unitIndex,index);}}/>
    {unit.outcomes.length > 0 && <details key={unit.code} className="qlearn-evidence-disclosure qsrc-evidence-templates">
      <summary>Technica working templates</summary>
      <QualificationEvidenceTemplates unit={unit} compact/>
    </details>}
  </div>}
  {!embedded&&section==='registration'&&<QualificationRegistrationSummary source={source}/>}
   {!embedded&&section==='matrix'&&<QualificationEvidenceMatrix source={source} selectedUnitIndex={unitIndex} onUnit={index=>jumpTo(index)}/>}
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
  {!embedded&&section==='library'&&<QualificationStudyLibrary source={source} selectedUnitIndex={unitIndex}
     onUnit={index=>jumpTo(index)}
     onOutcome={(_,index)=>{jumpTo(unitIndex,index);setSection('course');}}/>}
   </div>;
}
