import React,{useState} from 'react';
import {ArrowLeft,BookOpen,CheckCircle2,ChevronDown,ExternalLink,FileText,GraduationCap,Info,Layers3,LibraryBig,LockKeyhole,ShieldCheck} from 'lucide-react';
import UnitMaterialPanel from './UnitMaterialPanel.jsx';
import {getUnitSourceMaterial} from './qualificationUnitMaterial.js';
import './qualificationSourcePreview.css';

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

function CriterionDetails({outcome,index}){
 return <details className="qsrc-outcome" open={index===0}>
  <summary><span className="qsrc-outcome-number">{String(index+1).padStart(2,'0')}</span>
    <span className="qsrc-outcome-head"><strong>{outcome.code} · {outcome.title}</strong>
      <small>{outcome.criteria.length} Assessment Criteria</small></span><ChevronDown size={18}/></summary>
  <div className="qsrc-outcome-body">
    {outcome.guidance&&<p className="qsrc-outcome-guidance">{outcome.guidance}</p>}
    <ol className="qsrc-criteria-list">{outcome.criteria.map(criterion=><li key={criterion.code}>
      <span>{criterion.code}</span><p>{criterion.title}</p></li>)}</ol>
  </div>
 </details>;
}

export default function QualificationSourcePreview({item,references=[],onBack}) {
 const sources=getQualificationSources(item,references);
 const [sourceKey,setSourceKey]=useState(sources[0]?.catalog_key||'');
 const [unitIndex,setUnitIndex]=useState(0);
 const source=sources.find(s=>s.catalog_key===sourceKey)||sources[0];
 const unit=source?.units?.[Math.min(unitIndex,Math.max(0,(source?.units?.length||1)-1))];
 if(!source)return <div className="qsrc-page"><button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={16}/> Qualifications</button>
   <div className="qsrc-empty"><Info size={22}/><div><h2>Qualification source not available</h2>
     <p>The centre has not imported this awarding-body version into the reference database. No demo content will be substituted.</p></div></div></div>;
 const fullCount=source.units.reduce((n,u)=>n+u.outcomes.length,0);
 const acCount=source.units.reduce((n,u)=>n+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0);
 const isReference=source.status!=='centre_published';
 return <div className="qsrc-page">
  <button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={17}/> All qualifications</button>
  <header className={'qf-live-feature qsrc-hero qf-course-theme-'+item.color}>
    <img src={item.heroImage} alt="" aria-hidden="true"/><div className="qf-live-feature-shade"/>
    <div className="qf-live-feature-content"><span className="qf-live-eyebrow">{item.body} · AWARDING-BODY SYLLABUS</span>
      <h1>{source.title}</h1><div className="qf-live-feature-meta">
        <span><GraduationCap size={16}/> Level {item.level}</span>
        <span><Layers3 size={16}/> {source.units.length} mandatory Units</span>
        <span>{source.reference_number}</span></div></div>
  </header>
  <div className="qsrc-overview">
    <div><span className="qsrc-icon"><BookOpen size={19}/></span><strong>{source.units.length}</strong><small>Official Units</small></div>
    <div><span className="qsrc-icon"><LibraryBig size={19}/></span><strong>{fullCount||'—'}</strong><small>Imported Learning Outcomes</small></div>
    <div><span className="qsrc-icon"><CheckCircle2 size={19}/></span><strong>{acCount||'—'}</strong><small>Imported Assessment Criteria</small></div>
  </div>
  <div className="qsrc-edition-row">
    <div><span className="qf-overline">QUALIFICATION VERSION</span><h2>Official syllabus</h2></div>
    {sources.length>1&&<label className="qsrc-edition-picker">Specification edition
      <select value={source.catalog_key} onChange={e=>{setSourceKey(e.target.value);setUnitIndex(0);}}>
        {sources.map(s=><option value={s.catalog_key} key={s.catalog_key}>{s.version} · {s.reference_number}</option>)}
      </select></label>}
    {sources.length===1&&<span className="qsrc-edition-single">{source.version}</span>}
  </div>
  <div className="qsrc-source-note"><Info size={18}/><div>
    <strong>{isReference ? 'Verified source reference — not a learner enrolment' : 'Centre-published syllabus'}</strong>
    <p>{source.version==='November 2026'
      ? 'The November 2026 OTHM Level 6 specification has new Unit codes and qualification number. The official seven-unit structure is imported; detailed outcome and criterion text is not yet loaded, so do not use the previous 2023 criteria for this edition.'
      : 'This syllabus uses real Unit titles, Learning Outcomes and Assessment Criteria imported from the supplied awarding-body specification. It is not a demo. Centre approval is still required before using this version for live grading.'}</p>
  </div></div>
  <div className="qsrc-structure">
    <nav aria-label="Official qualification units" className="qsrc-unit-list">
      {source.units.map((u,index)=><button key={u.code} type="button" className={unitIndex===index?'active':''}
        aria-current={unitIndex===index?'true':undefined} onClick={()=>setUnitIndex(index)}>
        <span className="qsrc-unit-index">{String(index+1).padStart(2,'0')}</span>
        <span><strong>{u.title}</strong><small>{u.code}</small></span>
      </button>)}
    </nav>
    <div className="qsrc-unit-content">
      <header className="qsrc-unit-heading"><span className="qf-overline">UNIT {String(unitIndex+1).padStart(2,'0')} · {unit.code}</span><h2>{unit.title}</h2>
        <div className="qsrc-unit-meta"><span>{unit.outcomes.length} Learning Outcomes</span><span>{unit.outcomes.reduce((n,o)=>n+o.criteria.length,0)} Assessment Criteria</span></div>
      </header>
      {unit.outcomes.length ? <section className="qsrc-outcomes">
        <div className="qsrc-section-heading"><ShieldCheck size={19}/><h3>Learning Outcomes &amp; Assessment Criteria</h3></div>
        {unit.outcomes.map((outcome,index)=><CriterionDetails key={outcome.code} outcome={outcome} index={index}/>)}
      </section> : <div className="qsrc-awaiting"><Info size={22}/><div><h3>Current specification detail pending centre verification</h3>
        <p>The new 2026 Unit name and code are verified. Open the November 2026 source PDF for its complete current outcomes and criteria. Older standards are intentionally not shown as though they apply to this new Unit.</p>
        {source.source_url&&<a href={source.source_url} target="_blank" rel="noopener noreferrer">View official 2026 specification <ExternalLink size={15}/></a>}</div></div>}
      {getUnitSourceMaterial(unit.code)&&<section className="qsrc-materials"><div className="qsrc-section-heading">
        <BookOpen size={19}/><h3>Unit aim, study topics and source notes</h3></div><UnitMaterialPanel key={unit.code} unitCode={unit.code}/></section>}
    </div>
    <aside className="qsrc-aside"><SourceDocument source={source}/>
      <section className="qsrc-source-card"><div className="qsrc-source-card-heading"><LockKeyhole size={19}/><h3>Assessment access</h3></div>
        <p>This is a reference syllabus. Evidence submissions, assessor decisions and certificate recording require a centre-published version and a genuine learner enrolment.</p>
      </section></aside>
  </div>
 </div>;
}
