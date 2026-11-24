import React,{useEffect,useId,useMemo,useState} from 'react';
import {ArrowRight,CheckCircle2,ClipboardCheck,GraduationCap,Info,Search,ShieldCheck,UserPlus,Users,X} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import './qualificationEnrolments.css';

const labelOf=p=>p?.name||p?.email||'Account';
const clean=s=>String(s||'').toLowerCase().trim();
const dateToday=()=>new Date().toLocaleDateString('en-CA');
const roleLabel={learner:'Learner',assessor:'Assessor',verifier:'Internal Verifier'};
const validRef=s=>s.trim().length>=12&&s.trim().length<=220&&!/(placeholder|sandbox|demo|test|pending)/i.test(s);
const authorized=(staff,id,role)=>staff.some(s=>s.userId===id&&s.role===role);
const distinct=(...ids)=>ids.every(Boolean)&&new Set(ids).size===ids.length;

export function AccountSelect({db,role='learner',value,onChange,disabled,revision=0,exclude=[],label=roleLabel[role],staff=[],onAuthorise}){
 const id=useId();
 const [query,setQuery]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [authOpen,setAuthOpen]=useState(false),[reference,setReference]=useState(''),[attest,setAttest]=useState(false);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
  const timer=setTimeout(()=>{portfolioRpc(db,'admin_directory',{p_search:query.trim(),p_role:role,p_selected:value||null})
   .then(r=>{if(alive)setRows(Array.isArray(r)?r:[]);})
   .catch(e=>{if(alive){setRows([]);setError(e?.message||'Unable to load accounts.');}})
   .finally(()=>{if(alive)setLoading(false);});},180);
  return()=>{alive=false;clearTimeout(timer);};
 },[db,role,query,value,revision]);
 useEffect(()=>{setAuthOpen(false);setReference('');setAttest(false);},[value,role]);
 const current=rows.find(r=>r.id===value);
 const eligible=role==='learner'?current?.eligible:current?.eligible&&authorized(staff,value,role);
 return <div className="qe-account">
  <label htmlFor={id+'-search'} className="qe-label">{label}</label>
  <div className="qe-search"><Search size={15}/><input id={id+'-search'} value={query} maxLength={80} disabled={disabled}
    placeholder={'Search '+(role==='learner'?'registered accounts':'admin / reviewer accounts')+'…'} onChange={e=>setQuery(e.target.value)}/></div>
  <select aria-label={label} value={value} disabled={disabled||loading} onChange={e=>{onChange(e.target.value);setQuery('');}}>
   <option value="">{loading?'Loading accounts…':'Select '+label.toLowerCase()}</option>
   {value&&!current&&<option value={value}>Selected account (refreshing…)</option>}
   {rows.map(p=><option key={p.id} value={p.id} disabled={exclude.includes(p.id)||(!p.eligible&&!p.isAdmin)}>
    {labelOf(p)}{p.email?' · '+p.email:''}{role!=='learner'?(p.eligible?' · Authorised':p.isAdmin?' · Admin — authorisation required':' · Unavailable'):''}
   </option>)}
  </select>
  {error&&<small role="alert" className="qe-error">{error}</small>}
  {!loading&&!error&&!rows.length&&<small>No accounts match this search.</small>}
  {rows.length>=50&&<small>Showing up to 50 accounts. Search by name or email for more.</small>}
  {role!=='learner'&&value&&current&&<div className={'qe-eligibility '+(eligible?'ok':'pending')}>
   {eligible?<><CheckCircle2 size={14}/> Active {label.toLowerCase()} authorisation</>:<><Info size={14}/> Role authorisation required</>}
  </div>}
  {role!=='learner'&&value&&current?.isAdmin&&!eligible&&onAuthorise&&
   <><button type="button" className="qc-outline" disabled={disabled} onClick={()=>setAuthOpen(v=>!v)}><ShieldCheck size={15}/> Authorise {label}</button>
    {authOpen&&<div className="qe-authorise">
     <label className="qc-field">Documented competence reference<input value={reference} maxLength={220} disabled={disabled} onChange={e=>{setReference(e.target.value);setAttest(false);}} placeholder="Actual centre competence record"/></label>
     <label className="qc-confirm"><input type="checkbox" checked={attest} disabled={disabled} onChange={e=>setAttest(e.target.checked)}/><span>I confirm the centre has verified this person's competence and authority for this role.</span></label>
     <button className="qc-primary" type="button" disabled={disabled||!attest||!validRef(reference)} onClick={async()=>{if(await onAuthorise(value,role,reference.trim())){setAuthOpen(false);setAttest(false);}}}>Confirm authorisation</button>
    </div>}</>}
 </div>;
}
export const enrolmentRows=versions=>versions.flatMap(v=>(v.enrolments||[]).map(e=>({...e,versionId:v.id,title:v.title,edition:v.version,live:!!v.publishedAt})));
export function AssignmentWorkspace({db,versions,staff,busy,initialVersionId,initialLearnerId='',onAssign,onReassign,onAuthorise}){
 const live=versions.filter(v=>v.publishedAt);
 const [versionId,setVersionId]=useState(()=>live.some(v=>v.id===initialVersionId)?initialVersionId:live[0]?.id||'');
 const [learner,setLearner]=useState(initialLearnerId),[assessor,setAssessor]=useState(''),[verifier,setVerifier]=useState('');
 const [start,setStart]=useState(dateToday),[target,setTarget]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[status,setStatus]=useState('all');
 const [editing,setEditing]=useState(null),[editAssessor,setEditAssessor]=useState(''),[editVerifier,setEditVerifier]=useState(''),[reason,setReason]=useState('');
 const [revision,setRevision]=useState(0);
 const rows=useMemo(()=>enrolmentRows(versions),[versions]);
 const matching=rows.filter(e=>(filter==='all'||filter===e.versionId)&&(status==='all'||(status==='completed'?!!e.completedAt:!e.completedAt))&&[e.learner,e.assessor,e.verifier,e.title,e.edition].some(s=>clean(s).includes(clean(query))));
 const duplicate=rows.some(e=>e.versionId===versionId&&e.learnerId===learner);
 const ready=live.some(v=>v.id===versionId)&&distinct(learner,assessor,verifier)&&authorized(staff,assessor,'assessor')&&authorized(staff,verifier,'verifier')&&!!start&&(!target||target>=start)&&!duplicate;
 const editReady=editing&&distinct(editing.learnerId,editAssessor,editVerifier)&&authorized(staff,editAssessor,'assessor')&&authorized(staff,editVerifier,'verifier')&&(editing.assessorId!==editAssessor||editing.verifierId!==editVerifier)&&reason.trim().length>=15;
 const authorize=async(id,role,ref)=>{const ok=await onAuthorise(id,role,ref);if(ok)setRevision(v=>v+1);return ok;};
 const startEdit=e=>{setEditing(e);setEditAssessor(e.assessorId||'');setEditVerifier(e.verifierId||'');setReason('');};
 useEffect(()=>{if(!live.some(v=>v.id===versionId))setVersionId(live[0]?.id||'');},[versions,versionId]);
 return <div className="qe-workspace">
  <div className="qe-stats">
   {[[Users,'Total enrolments',rows.length],[GraduationCap,'In progress',rows.filter(e=>!e.completedAt).length],[CheckCircle2,'Completed',rows.filter(e=>e.completedAt).length],[ShieldCheck,'Live editions',live.length]].map(([Icon,title,count])=><div key={title} className="qe-stat"><span><Icon size={21}/></span><div><small>{title}</small><strong>{count}</strong></div></div>)}
  </div>
  <section className="qc-card qe-assign">
   <header><UserPlus size={21}/><div><h3>Assign Qualification</h3><p>Link one learner to one live edition and their own assessment team.</p></div></header>
   {!live.length&&<div className="qc-notice"><Info size={18}/> Publish a qualification before enrolling learners. No learners are required for publication.</div>}
   <div className="qe-fields">
    <AccountSelect db={db} role="learner" value={learner} onChange={setLearner} disabled={busy||!live.length} revision={revision} exclude={[assessor,verifier]}/>
    <label className="qc-field">Qualification edition<select value={versionId} disabled={busy||!live.length} onChange={e=>setVersionId(e.target.value)}>
     <option value="">Select Live qualification</option>{live.map(v=><option value={v.id} key={v.id}>{v.title} · {v.version}</option>)}</select></label>
    <AccountSelect db={db} role="assessor" value={assessor} onChange={setAssessor} staff={staff} onAuthorise={authorize} disabled={busy||!live.length} revision={revision} exclude={[learner,verifier]}/>
    <AccountSelect db={db} role="verifier" value={verifier} onChange={setVerifier} staff={staff} onAuthorise={authorize} disabled={busy||!live.length} revision={revision} exclude={[learner,assessor]}/>
    <label className="qc-field">Start date<input type="date" value={start} disabled={busy||!live.length} onChange={e=>setStart(e.target.value)}/></label>
    <label className="qc-field">Target date (optional)<input type="date" value={target} min={start} disabled={busy||!live.length} onChange={e=>setTarget(e.target.value)}/></label>
   </div>
   {duplicate&&<p role="status" className="qe-error">This learner is already enrolled in this edition. Use Edit reviewers in the enrolment table.</p>}
   <div className="qe-footer"><span><ShieldCheck size={16}/> Learner, Assessor and Verifier must be different accounts. Reviewer authorisation is required.</span>
    <button type="button" className="qc-primary" disabled={busy||!ready} onClick={async()=>{if(await onAssign({p_version:versionId,p_learner:learner,p_assessor:assessor,p_verifier:verifier,p_start:start,p_target:target||null})){setLearner('');setAssessor('');setVerifier('');}}}><GraduationCap size={17}/> Assign Qualification <ArrowRight size={16}/></button></div>
  </section>
  <section className="qc-card qe-table-card"><header><Users size={20}/><div><h3>Learners &amp; Enrolments</h3><p>All official editions · {matching.length} of {rows.length} enrolments</p></div></header>
   <div className="qe-filters"><div className="qe-search"><Search size={16}/><input aria-label="Search enrolments" placeholder="Search learner, qualification or reviewer…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <select aria-label="Filter qualification" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All qualifications</option>{versions.map(v=><option key={v.id} value={v.id}>{v.title} · {v.version}</option>)}</select>
    <select aria-label="Filter enrolment status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">In progress</option><option value="completed">Completed</option></select>
   </div>
   <div className="qe-scroll"><table><thead><tr>{['Learner','Qualification','Assessor','Internal Verifier','Dates','Status','Action'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>
    {matching.map(e=><tr key={e.id}><td><strong>{e.learner}</strong></td><td>{e.title}<small>{e.edition}</small></td><td>{e.assessor||'Not assigned'}</td><td>{e.verifier||'Not assigned'}</td><td>{e.startOn}<small>{e.targetOn?'Target '+e.targetOn:'No target date'}</small></td><td><span className={'qe-status '+(e.completedAt?'done':'active')}>{e.completedAt?'Completed':'In progress'}</span></td><td><button className="qc-outline" type="button" disabled={busy||!e.live||!!e.completedAt} onClick={()=>startEdit(e)}>Edit reviewers</button></td></tr>)}
   </tbody></table></div>
   {!matching.length&&<div className="qe-empty"><Users size={25}/><strong>{rows.length?'No matching enrolments':'No learners enrolled yet'}</strong><span>{rows.length?'Change the filters to see other records.':'Assign a learner when ready. A live qualification can have zero enrolments.'}</span></div>}
  </section>
  {editing&&<section className="qc-card qe-edit" aria-label="Edit reviewers"><header><ClipboardCheck size={20}/><div><h3>Edit reviewers</h3><p>{editing.learner} · {editing.title} · {editing.edition}</p></div><button type="button" className="qc-outline" disabled={busy} onClick={()=>setEditing(null)} aria-label="Close reviewer editor"><X size={17}/></button></header>
    <div className="qe-fields"><AccountSelect db={db} role="assessor" label="Assessor" value={editAssessor} onChange={setEditAssessor} disabled={busy} revision={revision} exclude={[editing.learnerId,editVerifier]} staff={staff} onAuthorise={authorize}/>
    <AccountSelect db={db} role="verifier" label="Internal Verifier" value={editVerifier} onChange={setEditVerifier} disabled={busy} revision={revision} exclude={[editing.learnerId,editAssessor]} staff={staff} onAuthorise={authorize}/></div>
    <label className="qc-field">Reason for reassignment<textarea rows={3} value={reason} disabled={busy} maxLength={1500} onChange={e=>setReason(e.target.value)} placeholder="Explain the reviewer change (at least 15 characters)"/></label>
    <div className="qe-footer"><span><ShieldCheck size={16}/> Prior evidence and decisions are preserved. Previous assessor decisions cannot be self-verified.</span><button className="qc-primary" type="button" disabled={busy||!editReady} onClick={async()=>{if(await onReassign({p_enrolment:editing.id,p_assessor:editAssessor,p_verifier:editVerifier,p_reason:reason.trim()}))setEditing(null);}}>Save changes</button></div>
   </section>}
 </div>;
}
