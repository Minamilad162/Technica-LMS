import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,FileText,FolderOpen,Info,Layers3,Link2,LockKeyhole,Search} from 'lucide-react';
import QualificationMultiUnitEvidence from './QualificationMultiUnitEvidence.jsx';
import './qualificationExperience.css';

export default function QualificationEvidenceMatrix({portfolio,source,selectedUnitIndex=0,onUnit,onMapSave,onOpenOutcome,busy=false}){
 const [search,setSearch]=useState('');
 const [evidenceId,setEvidenceId]=useState('');
 const [showMapping,setShowMapping]=useState(false);
 const editorRef=useRef(null);
 useEffect(()=>{
  if(showMapping)editorRef.current?.scrollIntoView({block:'start',behavior:'smooth'});
 },[showMapping]);
 const units=portfolio?.units||source?.units||[];
 const unit=units[selectedUnitIndex]||units[0];
 const learner=portfolio?.role==='learner';
 const evidence=portfolio?.evidence||[];
 const criteria=unit?.outcomes?.flatMap(o=>(o.criteria||[]).map(c=>({...c,outcome:o})))||[];
 const links=useMemo(()=>{
  const map=new Map();
  for(const o of unit?.outcomes||[]){
   // Reviewer access is limited to submitted snapshots, never an unsubmitted learner draft.
   const mapping=learner?(o.claim?.mapping||o.submissions?.[0]?.snapshot?.mapping||{}):
    (o.submissions?.[0]?.snapshot?.mapping||{});
   for(const c of o.criteria||[])map.set(c.id,new Set(Array.isArray(mapping?.[c.id])?mapping[c.id]:[]));
  }
  return map;
 },[unit,learner]);
 const filtered=evidence.filter(item=>(!evidenceId||item.id===evidenceId)&&
  (!search.trim()||[item.title,item.kind,item.filename].some(value=>String(value||'').toLowerCase().includes(search.trim().toLowerCase()))));
 const linked=evidence.filter(item=>criteria.some(c=>links.get(c.id)?.has(item.id))).length;
 const mappedCriteria=criteria.filter(c=>evidence.some(item=>links.get(c.id)?.has(item.id))).length;
 const beginMapping=id=>{setEvidenceId(id||evidence[0]?.id||'');setShowMapping(true);};
 return <div className="qxp-matrix">
  <div className="qxp-section-head"><div><span className="qxp-eyebrow">EVIDENCE FOLDER</span><h2>Evidence Mapping Matrix</h2>
   <p>Cross-reference evidence to the actual Assessment Criteria. A green check means linked, not assessor-approved.</p></div>
   {learner&&portfolio.canEdit&&<button type="button" className="qxp-primary" disabled={busy||!evidence.length} onClick={()=>beginMapping('')}>
    <Link2 size={17}/> Link Evidence</button>}
  </div>
  <div className="qxp-matrix-filters">
   <label>Unit<select value={selectedUnitIndex} onChange={e=>onUnit(Number(e.target.value))}>
    {units.map((u,i)=><option key={u.id||u.code||i} value={i}>{String(i+1).padStart(2,'0')} · {u.code} · {u.title}</option>)}
   </select></label>
   <label>Evidence<select value={evidenceId} onChange={e=>setEvidenceId(e.target.value)}>
    <option value="">All evidence ({evidence.length})</option>{evidence.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
   </select></label>
   <label>Search evidence<span className="qxp-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search file or title"/></span></label>
  </div>
  <div className="qxp-matrix-grid">
   <div className="qxp-matrix-main">
    {criteria.length>0?<div className="qxp-matrix-scroller" tabIndex={0} role="region" aria-label="Evidence to Assessment Criteria matrix">
     <table><thead><tr><th scope="col" rowSpan={2} className="qxp-matrix-item">Evidence item</th>
      {(unit?.outcomes||[]).filter(o=>o.criteria?.length).map(o=><th key={o.id||o.code} scope="colgroup" colSpan={o.criteria.length}>
       <span>{o.code}</span><small>{o.title}</small></th>)}
     </tr><tr>{criteria.map(c=><th key={c.id||c.code} scope="col" title={c.title||c.code}>{c.code}</th>)}</tr></thead>
     <tbody>{filtered.map(item=>{
      const matches=criteria.filter(c=>links.get(c.id)?.has(item.id)).length;
      return <tr key={item.id}><th scope="row" className="qxp-matrix-item">
       <span className="qxp-file"><FileText size={20}/><span><strong dir="auto">{item.title}</strong>
        <small>{item.kind||'Evidence'} · {matches} of {criteria.length} criteria linked</small></span></span>
       </th>{criteria.map(c=><td key={c.id||c.code}>
        {links.get(c.id)?.has(item.id)?<span className="qxp-cell linked" aria-label={'Linked to '+c.code}><Check size={18}/></span>:
        <span className="qxp-cell" aria-label={'Not linked to '+c.code}>—</span>}</td>)}</tr>;
     })}</tbody></table>
    </div>:<div className="qxp-empty"><Info size={20}/> No imported Assessment Criteria for this Unit.</div>}
    {!evidence.length&&<div className="qxp-empty"><FolderOpen size={19}/>
     {portfolio?'No evidence is available for this portfolio view. Upload evidence before mapping.':'This official syllabus has no learner evidence. Open an enrolled qualification to map files.'}</div>}
    {!!evidence.length&&!filtered.length&&<p className="qxp-empty">No evidence matches the selected filters.</p>}
    <div className="qxp-matrix-legend"><span><Check size={16}/> Linked to criterion</span><span>— Not mapped</span>
      <span><LockKeyhole size={14}/> Submitted and verified Outcome mappings are read-only</span></div>
   </div>
   <aside className="qxp-matrix-side">
    <section className="qxp-panel"><div className="qxp-panel-heading"><Layers3 size={18}/><h3>Selected Unit</h3></div>
      <strong>{unit?.title||'No Unit selected'}</strong>
      <span className="qxp-side-number">{mappedCriteria} / {criteria.length} criteria mapped</span>
      <progress max={criteria.length||1} value={mappedCriteria} aria-label="Criteria linked to evidence"/>
    </section>
    <section className="qxp-panel"><div className="qxp-panel-heading"><FileText size={18}/><h3>Evidence summary</h3></div>
     <dl><div><dt>Available evidence</dt><dd>{evidence.length}</dd></div>
      <div><dt>Linked in selected Unit</dt><dd>{linked}</dd></div>
      <div><dt>Unlinked in selected Unit</dt><dd>{evidence.length-linked}</dd></div></dl>
    </section>
    {learner&&portfolio.canEdit&&<button type="button" className="qxp-primary qxp-full" disabled={busy||!evidence.length} onClick={()=>beginMapping(evidenceId)}>
      <Link2 size={16}/> Edit cross-Unit links</button>}
   </aside>
  </div>
  {showMapping&&learner&&portfolio?.canEdit&&<section ref={editorRef} className="qxp-mapping-editor">
    <div className="qxp-section-head"><h3>Map one Evidence item across Units</h3>
     <button className="qxp-secondary" type="button" onClick={()=>setShowMapping(false)}>Close mapping</button></div>
    <QualificationMultiUnitEvidence portfolio={portfolio} busy={busy} targetEvidence={evidenceId?{id:evidenceId}:null}
     onSave={onMapSave} onOpenOutcome={onOpenOutcome}/>
   </section>}
 </div>;
}
