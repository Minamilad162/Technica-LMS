import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,Check,CheckCircle2,FileCheck2,FolderOpen,Info,Layers3,Link2,LockKeyhole,Search} from 'lucide-react';
import './qualificationMultiUnitEvidence.css';

// The evidence item belongs to ONE real enrolment; its identity is reused across
// multiple official Units, Outcomes and Criteria. Submitted claims stay immutable.
const editableState=state=>!state||['draft','changes_requested'].includes(state);
const linksForEvidence=(portfolio,evidenceId)=>{
 const ids=[];
 for(const unit of portfolio.units)for(const outcome of unit.outcomes){
  const data=outcome.claim?.mapping||outcome.submissions?.[0]?.snapshot?.mapping||{};
  for(const criterion of outcome.criteria){
   if(Array.isArray(data[criterion.id])&&data[criterion.id].includes(evidenceId))ids.push(criterion.id);
  }
 }
 return ids;
};
const countLinked=(unit,ids)=>{
 const set=new Set(ids);
 return unit.outcomes.reduce((n,o)=>n+o.criteria.filter(c=>set.has(c.id)).length,0);
};

export default function QualificationMultiUnitEvidence({portfolio,busy=false,onSave,onOpenOutcome,targetEvidence}){
 const [evidenceId,setEvidenceId]=useState(portfolio.evidence[0]?.id||'');
 const [selected,setSelected]=useState([]);
 const [filter,setFilter]=useState('');
 const [pending,setPending]=useState(false);
 const [expanded,setExpanded]=useState({});
 const resolvedId=portfolio.evidence.some(item=>item.id===evidenceId)?evidenceId:portfolio.evidence[0]?.id||'';
 const evidence=portfolio.evidence.find(x=>x.id===resolvedId);
 const locked=useMemo(()=>new Set(portfolio.units.flatMap(u=>u.outcomes.filter(o=>!editableState(o.claim?.state))
  .flatMap(o=>o.criteria.map(c=>c.id)))),[portfolio]);
 useEffect(()=>{
  if(targetEvidence)setEvidenceId(targetEvidence.id);
 },[targetEvidence]);
 useEffect(()=>{
  setSelected(linksForEvidence(portfolio,resolvedId));setPending(false);
 },[portfolio,resolvedId]);
 const baseline=useMemo(()=>linksForEvidence(portfolio,resolvedId),[portfolio,resolvedId]);
 const selectedSet=useMemo(()=>new Set(selected),[selected]);
 const changes=selected.filter(id=>!baseline.includes(id)).length+
   baseline.filter(id=>!selectedSet.has(id)).length;
 const editableLinked=selected.filter(id=>!locked.has(id)).length;
 const unitCount=portfolio.units.filter(unit=>countLinked(unit,selected)>0).length;
 const choose=criterion=>{
  if(locked.has(criterion.id)||busy||!portfolio.canEdit)return;
  setSelected(prev=>prev.includes(criterion.id)?prev.filter(id=>id!==criterion.id):[...prev,criterion.id]);
  setPending(true);
 };
 const setUnit=(unit,checked)=>{
  const ids=unit.outcomes.filter(o=>editableState(o.claim?.state)).flatMap(o=>o.criteria.map(c=>c.id));
  setSelected(prev=>checked?[...new Set([...prev,...ids])]:prev.filter(id=>!ids.includes(id)));
  setPending(true);
 };
 const doSave=async()=>{
  const ok=await onSave(resolvedId,selected);
  if(ok!==false)setPending(false);
 };
 if(!portfolio.canEdit)return null;
 return <section id="qualification-multi-unit-mapper" className="qmu-card" aria-label="Map one evidence file across multiple qualification units">
  <div className="qmu-head"><div className="qmu-logo"><Link2 size={23}/></div>
   <div><span className="qf-overline">EVIDENCE BANK · UNIT MAPPING</span>
    <h2>Link one evidence to multiple Units</h2>
    <p>Choose a document you uploaded once. Link it to relevant Learning Outcomes and
      Assessment Criteria across this enrolled qualification. Drafts are saved without submitting them.</p>
   </div></div>
  <div className="qmu-steps"><span><CheckCircle2 size={15}/> 1 · Upload evidence</span>
   <span><Link2 size={15}/> 2 · Map to Units &amp; Criteria</span>
   <span><FileCheck2 size={15}/> 3 · Submit each Outcome for review</span></div>
  {!portfolio.evidence.length?<div className="qmu-empty"><FolderOpen size={22}/><div>
     <strong>Start by uploading evidence above</strong>
     <p>Open Evidence Wizard and choose “Upload a file”. The same saved file will become
        available here for every Unit in this qualification.</p>
    </div></div>:<>
    <div className="qmu-toolbar">
     <label>Evidence document<select aria-label="Choose uploaded evidence to link" value={resolvedId}
       disabled={busy} onChange={e=>setEvidenceId(e.target.value)}>
       {portfolio.evidence.map(item=><option key={item.id} value={item.id}>
        {item.title} · {item.id.slice(0,8).toUpperCase()}</option>)}
      </select></label>
     <label>Find Unit or criterion<input type="search" value={filter}
       placeholder="Search title or code" onChange={e=>setFilter(e.target.value)}/></label>
    </div>
    {evidence&&<div className="qmu-selected-document">
     <FileCheck2 size={19}/><div><strong>{evidence.title}</strong><small>Evidence ref {evidence.id.slice(0,8).toUpperCase()} · {evidence.kind}</small></div>
     <span>{selected.length} criteria · {unitCount} units</span></div>}
    <div className="qmu-unit-grid">
      {portfolio.units.map((unit,i)=>{
        const search=filter.toLowerCase().trim();
        const unitMatch=!search||[unit.code,unit.title].some(s=>s.toLowerCase().includes(search));
        const outcomes=unit.outcomes.filter(o=>unitMatch||[o.code,o.title,...o.criteria.flatMap(c=>[c.code,c.title])]
          .some(s=>String(s).toLowerCase().includes(search)));
        if(!outcomes.length)return null;
        const links=countLinked(unit,selected);
        const editable=unit.outcomes.filter(o=>editableState(o.claim?.state)).flatMap(o=>o.criteria);
        const allEditable=editable.length>0&&editable.every(c=>selectedSet.has(c.id));
        return <details key={unit.id} className="qmu-unit" open={filter?true:expanded[unit.id]===true}
          onToggle={event=>{
           if(filter)return;
           const open=event.currentTarget.open;
           setExpanded(old=>old[unit.id]===open?old:{...old,[unit.id]:open});
         }}>
         <summary><span className="qmu-unit-num">{String(i+1).padStart(2,'0')}</span>
           <span className="qmu-unit-title"><strong>{unit.title}</strong><small>{unit.code} · {links} linked criteria</small></span>
           {links>0&&<span className="qmu-linked"><Check size={14}/> {links}</span>}
           <span className="qmu-chevron" aria-hidden="true">⌄</span></summary>
         <div className="qmu-unit-body">
          {editable.length>0&&<label className="qmu-select-all"><input type="checkbox" checked={allEditable}
            disabled={busy} onChange={e=>setUnit(unit,e.target.checked)}/> Link evidence to all editable criteria in this Unit</label>}
          {outcomes.map(o=>{
           const canEdit=editableState(o.claim?.state);
           return <div className="qmu-outcome" key={o.id}>
             <div className="qmu-outcome-head"><strong>{o.code} · {o.title}</strong>
               <span>{canEdit?'Draft mapping':<><LockKeyhole size={13}/> In assessment / verified</>}</span></div>
             <div className="qmu-criteria">{o.criteria.filter(c=>unitMatch||[c.code,c.title].some(s=>s.toLowerCase().includes(search))).map(c=>
               <label className={'qmu-criterion'+(selectedSet.has(c.id)?' selected':'')+(canEdit?'':' locked')} key={c.id}>
                 <input type="checkbox" checked={selectedSet.has(c.id)} disabled={busy||!canEdit}
                   onChange={()=>choose(c)}/>
                 <span className="qmu-criterion-code">{c.code}</span>
                 <span>{c.title}</span>
               </label>)}</div>
             {!canEdit&&<button type="button" className="qmu-open-outcome" onClick={()=>onOpenOutcome(o.id)}>
                View assessment status <ArrowRight size={14}/></button>}
           </div>;
          })}
         </div>
        </details>;
      })}
    </div>
    <div className="qmu-save">
      <p><Info size={17}/> One evidence file can support several Units. Links in submitted or
       verified Outcomes are locked; no assessment is submitted by this action.</p>
      <button type="button" disabled={busy||!pending||changes===0||!evidenceId} onClick={doSave}>
       <Link2 size={17}/> Save mapping across Units {changes?('('+changes+' changes)'):''}</button>
    </div>
  </>}
 </section>;
}
