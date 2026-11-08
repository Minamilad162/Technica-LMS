import React,{useState} from 'react';
import {BookOpen,ChevronDown,FileText,ExternalLink,Layers3,Info,CheckCircle2} from 'lucide-react';
import {getUnitSourceMaterial} from './qualificationUnitMaterial.js';
import './qualificationUnitMaterial.css';

// The source is a qualification SPECIFICATION or NVQ HANDBOOK, not approved centre lesson files.
// Reuse for learner and Admin to guarantee the same per-unit indexing and provenance.
export default function UnitMaterialPanel({unitCode,compact=false}){
 const material=getUnitSourceMaterial(unitCode);
 const [expanded,setExpanded]=useState(false);
 if(!material)return <section className="qmat-panel"><div className="qmat-heading"><BookOpen size={19}/><h3>Unit Material</h3></div><p>Material has not been mapped to this Unit yet.</p></section>;
 const outcomes=material.learningOutcomes||[];
 const topics=material.indicativeTopics||[];
 const displayed=expanded?topics:topics.slice(0,5);
 const isNvq=material.qualification==='nvq6';
 return <article className={'qmat-panel'+(compact?' qmat-compact':'')} aria-label={'Study material for Unit '+material.unitNumber}>
  <div className="qmat-head">
   <div className="qmat-heading"><BookOpen size={19}/><div><h3>Unit Material</h3><small>From the {isNvq?'qualification handbook':'qualification specification'}</small></div></div>
   <span className="qmat-edition">{material.sourceVersion}</span>
  </div>
  {material.aim&&<div className="qmat-aim"><span className="qmat-label">Unit aim</span><p>{material.aim}</p></div>}
  <section className="qmat-block"><div className="qmat-subheading"><Layers3 size={16}/><h4>{isNvq?'Competence outcomes':'Learning outcomes'}</h4><span>{outcomes.length}</span></div>
   <ol className="qmat-outcomes">{outcomes.map(lo=><li key={lo.number}><b>{lo.number.toString().padStart(2,'0')}</b><span>{lo.title}</span></li>)}</ol>
  </section>
  {topics.length>0?<section className="qmat-block"><div className="qmat-subheading"><CheckCircle2 size={16}/><h4>Indicative study topics</h4><span>{topics.length}</span></div>
    <ul className="qmat-topics">{displayed.map((topic,i)=><li key={i}>{topic}</li>)}</ul>
    {topics.length>5&&<button className="qmat-more" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>
      {expanded?'Show fewer topics':'View all '+topics.length+' topics'} <ChevronDown size={15} className={expanded?'up':''}/></button>}
   </section>:<div className="qmat-footnote"><Info size={15}/> This NVQ handbook contains competence outcomes and assessment criteria, not separate teaching lessons. Approved centre learning files can be added per Unit.</div>}
  <div className="qmat-source">
   <div><FileText size={17}/><span>{material.sourceLabel}<small>Source: {material.sourceVersion} · Review against current approved version before publication</small></span></div>
   <a href={material.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={'Open source PDF for Unit '+material.unitNumber+' in new tab'}>
    Source PDF <ExternalLink size={15}/></a>
  </div>
 </article>;
}
