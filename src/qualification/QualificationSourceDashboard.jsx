import React from 'react';
import {ArrowRight,BookOpen,CheckCircle2,ExternalLink,FileText,FolderOpen,GraduationCap,Info,Layers3,LibraryBig,ShieldCheck} from 'lucide-react';
import './qualificationSourceDashboard.css';

// Reference catalogue is not an enrolment. These are genuine syllabus counts,
// never fictitious learner completions, submissions or assessor decisions.
export function QualificationSourceStats({source}){
 const units=source.units||[];
 const outcomes=units.reduce((n,unit)=>n+(unit.outcomes||[]).length,0);
 const criteria=units.reduce((n,unit)=>n+(unit.outcomes||[]).reduce((m,entry)=>m+(entry.criteria||[]).length,0),0);
 const stats=[
  {title:'Official Units',value:units.length,Icon:Layers3,theme:'blue'},
  {title:'Learning Outcomes',value:outcomes,Icon:BookOpen,theme:'green'},
  {title:'Assessment Criteria',value:criteria,Icon:CheckCircle2,theme:'violet'},
 ];
 return <section className="qsrd-stats" aria-label="Imported official specification totals">
  {stats.map(({title,value,Icon,theme})=><article className={'qsrd-stat qsrd-'+theme} key={title}>
   <span className="qsrd-stat-icon"><Icon size={21} aria-hidden="true"/></span>
   <span><small>{title}</small><strong>{value}</strong></span>
  </article>)}
 </section>;
}
export default function QualificationSourceDashboard({source, onUnit, onEvidence, onLibrary, onRegistration}) {
 const units=source.units||[];
 const published=source.status==='centre_published';
 return <div className="qsrd-workspace">
  <div className="qsrd-grid">
   <div className="qsrd-main">
    <section className="qsrd-programme" aria-label="Official qualification details">
     <div className="qsrd-programme-title"><span className="qsrd-programme-logo"><GraduationCap size={25}/></span>
      <div><span className="qf-overline">OFFICIAL QUALIFICATION · {source.version}</span>
       <h2>{source.title}</h2><small>Qualification ref: {source.reference_number||'Not provided'}</small>
      </div>
      <span className={'qsrd-chip '+(published?'qsrd-published':'qsrd-reference')}>{published?'Centre-published':'Reference syllabus'}</span>
     </div>
     <p className="qsrd-programme-intro">This view contains the imported awarding-body syllabus. Learner progress, Evidence decisions and certificates appear only inside an enrolled portfolio.</p>
    </section>
    <section className="qsrd-table-card">
     <div className="qsrd-section-heading"><div><h2>Units</h2><small>Select a Unit to see its Learning Outcomes and Assessment Criteria.</small></div><span>{units.length} Units</span></div>
     <div className="qsrd-table-scroll" role="region" tabIndex={0} aria-label="Official qualification Units">
      <table>
       <thead><tr><th scope="col">Unit</th><th scope="col">Learning Outcomes</th><th scope="col">Assessment Criteria</th><th scope="col">Source detail</th><th scope="col">Action</th></tr></thead>
       <tbody>{units.map((unit,index)=>{
        const unitOutcomes=(unit.outcomes||[]).length;
        const unitCriteria=(unit.outcomes||[]).reduce((n,outcome)=>n+(outcome.criteria||[]).length,0);
        return <tr key={unit.id||unit.code||index}><th scope="row"><span>Unit {String(index+1).padStart(2,'0')} · {unit.code}</span><strong>{unit.title}</strong></th>
         <td>{unitOutcomes||'—'}</td><td>{unitCriteria||'—'}</td>
         <td><span className={'qsrd-chip '+(unitOutcomes?'qsrd-imported':'qsrd-pending')}>{unitOutcomes?'Imported':'Unit title available'}</span></td>
         <td><button type="button" className="qsrd-small-action" onClick={()=>onUnit(index)}>View <ArrowRight size={15}/></button></td>
        </tr>;
       })}</tbody>
      </table>
     </div>
    </section>
   </div>
   <aside className="qsrd-side" aria-label="Qualification source and access">
    <div className="qsrd-side-title"><FileText size={19}/><h2>Specification</h2></div>
    <div className="qsrd-source-facts">
     <div><span>Version</span><strong>{source.version}</strong></div>
     <div><span>Reference</span><strong>{source.reference_number||'—'}</strong></div>
     <div><span>Centre status</span><strong>{published?'Published':'Reference only'}</strong></div>
    </div>
    {source.source_url&&<a className="qsrd-primary-action" href={source.source_url} target="_blank" rel="noopener noreferrer">Original specification <ExternalLink size={15}/></a>}
    <div className="qsrd-side-divider"/>
    <h3><FolderOpen size={17}/> Evidence &amp; assessment</h3>
    <p>Use your enrolled portfolio to submit Evidence, receive assessor feedback and track verification. A syllabus reference alone cannot accept submissions.</p>
    <button className="qsrd-secondary-action" type="button" onClick={onEvidence}>Evidence access <ArrowRight size={15}/></button>
    <button className="qsrd-text-action" type="button" onClick={onLibrary}><LibraryBig size={15}/> Study Library</button>
    <button className="qsrd-text-action" type="button" onClick={onRegistration}><ShieldCheck size={15}/> Registration details</button>
   </aside>
  </div>
 </div>;
}
