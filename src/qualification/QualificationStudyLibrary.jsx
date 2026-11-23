import React,{useMemo} from 'react';
import {ArrowRight,BookOpen,BookOpenCheck,ClipboardCheck,ExternalLink,FileText,FolderOpen,GraduationCap,Layers3} from 'lucide-react';
import './qualificationExperience.css';
const criteriaCount=unit=>(unit?.outcomes||[]).reduce((n,o)=>n+(o.criteria||[]).length,0);
export default function QualificationStudyLibrary({portfolio,source,selectedUnitIndex=0,onUnit,onOutcome,children}){
 const units=portfolio?.units||source?.units||[];
 const unit=units[selectedUnitIndex]||units[0];
 const material=source?.units?.find(x=>x.code===unit?.code)||(!portfolio?unit:null);
 const outcomes=unit?.outcomes||[];
 const resources=useMemo(()=>{
  const map=new Map();
  if(source?.source_url)map.set(source.source_url,{title:source.title+' · specification',url:source.source_url,label:'Awarding-body specification'});
  for(const o of outcomes)for(const r of o.resources||[])if(r.url&&/^https:\/\//.test(r.url))
   map.set(r.url,{title:r.title||'Unit resource',url:r.url,label:'Unit resource'});
  return [...map.values()];
 },[source,outcomes]);
 return <div className="qxp-library">
  <div className="qxp-section-head"><div><span className="qxp-eyebrow">QUALIFICATION RESOURCES</span><h2>Study Library</h2>
   <p>Imported Unit aims, indicative topics and available source materials for the selected programme.</p></div></div>
  <div className="qxp-library-grid">
   <div className="qxp-library-main">
    <section className="qxp-panel qxp-library-spec">
     <div><FileText size={20}/><span><strong>Qualification Specification</strong>
      <small>{source?source.version+' · '+(source.reference_number||'Official source'):'No official source edition linked to this portfolio'}</small></span></div>
     {source?.source_url?<a href={source.source_url} target="_blank" rel="noopener noreferrer" className="qxp-secondary">
       <ExternalLink size={16}/> View specification</a>:<span className="qxp-muted">Source unavailable</span>}
    </section>
    <div className="qxp-library-selector"><label htmlFor="qxp-study-unit">Select Unit</label>
     <select id="qxp-study-unit" value={selectedUnitIndex} onChange={e=>onUnit(Number(e.target.value))}>
      {units.map((u,i)=><option key={u.id||u.code||i} value={i}>{String(i+1).padStart(2,'0')} · {u.code} · {u.title}</option>)}
     </select></div>
    <section className="qxp-panel"><div className="qxp-panel-heading"><BookOpenCheck size={20}/><h3>Unit Aim</h3></div>
     <p>{material?.aim||'No Unit aim has been imported for this specification edition.'}</p></section>
    <div className="qxp-library-pair">
     <section className="qxp-panel"><div className="qxp-panel-heading"><Layers3 size={20}/><h3>Indicative Study Topics</h3></div>
      {material?.indicativeTopics?.length?<ul className="qxp-topic-list">{material.indicativeTopics.map((topic,i)=><li key={i}>{topic}</li>)}</ul>:
       <p>No indicative study topics are available for this Unit.</p>}
     </section>
     <section className="qxp-panel"><div className="qxp-panel-heading"><GraduationCap size={20}/><h3>Learning Outcomes</h3></div>
      {outcomes.length?<div className="qxp-outcome-links">{outcomes.map((o,i)=><button key={o.id||o.code||i} type="button" onClick={()=>onOutcome(o,i)}>
       <b>{o.code}</b><span>{o.title}<small>{o.criteria?.length||0} Assessment Criteria</small></span><ArrowRight size={16}/>
      </button>)}</div>:<p>No Outcomes are available for this Unit in the imported version.</p>}
     </section>
    </div>
    <section className="qxp-panel"><div className="qxp-panel-heading"><FolderOpen size={20}/><h3>Source Materials</h3></div>
     {resources.length?<div className="qxp-library-files">{resources.map(r=><a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">
      <FileText size={20}/><span><strong>{r.title}</strong><small>{r.label}</small></span><span>Open <ExternalLink size={15}/></span>
     </a>)}</div>:<p>No accessible source links have been recorded for this Unit.</p>}
     {children}
    </section>
   </div>
   <aside className="qxp-library-side">
    <section className="qxp-panel"><div className="qxp-panel-heading"><BookOpen size={18}/><h3>Unit reference</h3></div>
     <dl><div><dt>Unit</dt><dd>{unit?.code||'—'}</dd></div>
      <div><dt>Learning Outcomes</dt><dd>{outcomes.length}</dd></div>
      <div><dt>Assessment Criteria</dt><dd>{criteriaCount(unit)}</dd></div>
      {source&&<div><dt>Edition</dt><dd>{source.version}</dd></div>}</dl>
    </section>
    <section className="qxp-panel"><div className="qxp-panel-heading"><ClipboardCheck size={18}/><h3>Study guidance</h3></div>
      <ol className="qxp-guidance"><li>Review this Unit’s aim and Learning Outcomes</li>
       <li>Use the indicative topics where available</li><li>Read the available source materials</li>
       <li>Check the Assessment Criteria before preparing Evidence</li></ol>
      <small>Guidance only, not recorded learner completion.</small>
    </section>
   </aside>
  </div>
 </div>;
}
