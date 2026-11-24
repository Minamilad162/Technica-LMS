import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowRight,CheckCircle2,ChevronDown,ClipboardCheck,GraduationCap,Info,Search,ShieldCheck,UserPlus,Users,UserRound,CalendarDays,Pencil,X} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import './qualificationEnrolments.css';

const labelOf=p=>p?.name||p?.email||'Account';
const clean=s=>String(s||'').toLowerCase().trim();
const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const roleLabel={learner:'Learner',assessor:'Assessor',verifier:'Internal Verifier'};

export function AccountSelect({db,role='learner',value,onChange,disabled,revision=0,exclude=[],label=roleLabel[role],onSelection,compact=false}){
 const id=useId(),root=useRef(null),input=useRef(null);
 const [query,setQuery]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
  const timer=setTimeout(()=>{portfolioRpc(db,'admin_directory',{p_search:query.trim(),p_role:role,p_selected:value||null})
   .then(r=>{if(alive){const data=Array.isArray(r)?r:[];setRows(data);onSelection?.(data.find(p=>p.id===value)||null);}})
   .catch(e=>{if(alive){setRows([]);setError(e?.message||'Unable to load accounts.');onSelection?.(null);}})
   .finally(()=>{if(alive)setLoading(false);});},180);
  return()=>{alive=false;clearTimeout(timer);};
 },[db,role,query,value,revision]);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target)){setOpen(false);setQuery('');setActive(-1);}};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 const current=rows.find(r=>r.id===value);
 const allowed=p=>!exclude.includes(p.id)&&(p.eligible||(role!=='learner'&&p.isAdmin&&p.active!==false));
 const options=rows.filter(p=>!query.trim()||[p.name,p.email].some(s=>clean(s).includes(clean(query))));
 const display=p=>[p?.name,p?.email].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
 const choose=p=>{if(!p||!allowed(p))return;onChange(p.id);onSelection?.(p);setOpen(false);setQuery('');setActive(-1);input.current?.blur();};
 const clear=()=>{onChange('');onSelection?.(null);setQuery('');setOpen(false);};
 const navigate=e=>{
  if(e.key==='Escape'){setOpen(false);setQuery('');setActive(-1);return;}
  if(e.key==='Tab'){setOpen(false);setQuery('');return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);const step=e.key==='ArrowDown'?1:-1;let n=active;
   for(let k=0;k<options.length;k++){n=(n+step+options.length)%options.length;if(options[n]&&allowed(options[n])){setActive(n);break;}}
  }else if(e.key==='Enter'&&open){e.preventDefault();choose(options[active]||options.find(allowed));}
 };
 return <div className="qe-account qe-combo" ref={root}>
  <label htmlFor={id} className="qe-label">{label}{compact&&<span className="qe-required"> *</span>}</label>
  <div className="qe-combo-control">
   {role==='learner'?<Search size={16}/>:<UserRound size={16}/>}
   <input id={id} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-options'} aria-activedescendant={open&&active>=0?id+'-'+active:undefined}
    autoComplete="off" value={open?query:display(current)} maxLength={open?80:undefined} disabled={disabled}
    placeholder={value&&!current?'Loading selected account…':'Search and select '+label.toLowerCase()+'…'}
    onFocus={()=>{setQuery('');setOpen(true);}} onClick={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(-1);}} onKeyDown={navigate}/>
   {value&&<button type="button" aria-label={'Clear '+label} disabled={disabled} onClick={clear}><X size={15}/></button>}
   <button type="button" aria-label={'Open '+label+' list'} disabled={disabled} onClick={()=>{if(open){setOpen(false);setQuery('');}else{setOpen(true);input.current?.focus();}}}><ChevronDown size={17}/></button>
  </div>
  {open&&<div className="qe-options" id={id+'-options'} role="listbox" aria-label={label}>
   {loading&&<div className="qe-option-message">Searching accounts…</div>}
   {!loading&&!options.length&&<div className="qe-option-message">{error||'No accounts match this search.'}</div>}
   {!loading&&options.map((p,k)=><button type="button" role="option" aria-selected={p.id===value} aria-disabled={!allowed(p)} id={id+'-'+k} key={p.id}
    disabled={!allowed(p)} className={active===k?'qe-option-active':''} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(p)}>
    <span className="qe-avatar">{labelOf(p).slice(0,2).toUpperCase()}</span><span><strong>{labelOf(p)}</strong>{p.email&&p.email!==p.name&&<small>{p.email}</small>}</span>{p.id===value&&<CheckCircle2 size={15}/>}</button>)}
   {!loading&&rows.length>=50&&<div className="qe-option-message">Search by name or email to find more accounts.</div>}
  </div>}
  {error&&!open&&<small role="alert" className="qe-error">{error}</small>}
  {!compact&&role!=='learner'&&current&&<small>{current.eligible?'Active role authorisation':'Role authorisation required'}</small>}
 </div>;
}
export const enrolmentRows=versions=>versions.flatMap(v=>(v.enrolments||[]).map(e=>({...e,versionId:v.id,title:v.title,edition:v.version,live:!!v.publishedAt})));
export function AssignmentWorkspace({db,versions,staff,busy,initialVersionId,initialLearnerId='',onAssign,onReassign}){
 const live=versions.filter(v=>v.publishedAt);
 const [versionId,setVersionId]=useState(()=>live.some(v=>v.id===initialVersionId)?initialVersionId:live[0]?.id||'');
 const [learner,setLearner]=useState(initialLearnerId),[assessor,setAssessor]=useState(''),[verifier,setVerifier]=useState('');
 const [start,setStart]=useState(dateToday),[target,setTarget]=useState(''),[note,setNote]=useState('');
 const [learnerAccount,setLearnerAccount]=useState(null),[assessorAccount,setAssessorAccount]=useState(null),[verifierAccount,setVerifierAccount]=useState(null),[editAssessorAccount,setEditAssessorAccount]=useState(null),[editVerifierAccount,setEditVerifierAccount]=useState(null);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[status,setStatus]=useState('all');
 const [editing,setEditing]=useState(null),[editAssessor,setEditAssessor]=useState(''),[editVerifier,setEditVerifier]=useState(''),[reason,setReason]=useState('');
 const revision=staff.length;
 const editRef=useRef(null);
 useEffect(()=>{if(editing)editRef.current?.scrollIntoView({block:'start'});},[editing]);
 const rows=useMemo(()=>enrolmentRows(versions),[versions]);
 const matching=rows.filter(e=>(filter==='all'||filter===e.versionId)&&(status==='all'||(status==='completed'?!!e.completedAt:!e.completedAt))&&[e.learner,e.learnerEmail,e.assessor,e.assessorEmail,e.verifier,e.verifierEmail,e.title,e.edition].some(s=>clean(s).includes(clean(query))));
 const duplicate=rows.some(e=>e.versionId===versionId&&e.learnerId===learner);
 const validTeam=(l,a,v)=>!!l&&!!a&&!!v&&l!==a&&l!==v;
 const selected=(p,id,role)=>p?.id===id&&(p.eligible||(role!=='learner'&&p.isAdmin&&p.active!==false));
 const ready=live.some(v=>v.id===versionId)&&validTeam(learner,assessor,verifier)&&selected(learnerAccount,learner,'learner')&&selected(assessorAccount,assessor,'assessor')&&selected(verifierAccount,verifier,'verifier')&&!!start&&(!target||target>=start)&&!duplicate;
 const editReady=editing&&validTeam(editing.learnerId,editAssessor,editVerifier)&&selected(editAssessorAccount,editAssessor,'assessor')&&selected(editVerifierAccount,editVerifier,'verifier')&&(editing.assessorId!==editAssessor||editing.verifierId!==editVerifier);
 const startEdit=e=>{setEditing(e);setEditAssessor(e.assessorId||'');setEditVerifier(e.verifierId||'');setReason('');setEditAssessorAccount(null);setEditVerifierAccount(null);};
 useEffect(()=>{if(!live.some(v=>v.id===versionId))setVersionId(live[0]?.id||'');},[versions,versionId]);
 return <div className="qe-workspace">
  <section className="qc-card qe-assign">
   <header><span className="qe-heading-icon"><UserPlus size={25}/></span><div><h3>Assign Qualification</h3><p>Assign a qualification to a learner and select their assessor and verifier.</p></div></header>
   {!live.length&&<div className="qc-notice"><Info size={18}/> Publish a qualification before enrolling learners. No learners are required for publication.</div>}
   <div className="qe-fields">
    <AccountSelect db={db} compact role="learner" value={learner} onChange={setLearner} onSelection={setLearnerAccount} disabled={busy||!live.length} revision={revision} exclude={[assessor,verifier]}/>
    <label className="qc-field">Qualification <span className="qe-required">*</span><select value={versionId} disabled={busy||!live.length} onChange={e=>setVersionId(e.target.value)}>
     <option value="">Select Live qualification</option>{live.map(v=><option value={v.id} key={v.id}>{v.title} · {v.version}</option>)}</select></label>
    <AccountSelect db={db} compact role="assessor" value={assessor} onChange={setAssessor} onSelection={setAssessorAccount} disabled={busy||!live.length} revision={revision} exclude={[learner]}/>
    <AccountSelect db={db} compact role="verifier" label="Verifier" value={verifier} onChange={setVerifier} onSelection={setVerifierAccount} disabled={busy||!live.length} revision={revision} exclude={[learner]}/>
    <div className="qe-team-note"><Info size={16}/> The same account may be assigned both roles. Independent verification of its own decisions remains required.</div>
    <label className="qc-field">Start date <span className="qe-required">*</span><input type="date" value={start} disabled={busy||!live.length} onChange={e=>setStart(e.target.value)}/></label>
    <label className="qc-field">Target date <span className="qe-optional">Optional</span><input type="date" value={target} min={start} disabled={busy||!live.length} onChange={e=>setTarget(e.target.value)}/></label>
    <label className="qc-field qe-note">Note <span className="qe-optional">Optional</span><textarea rows={2} maxLength={1500} value={note} disabled={busy||!live.length} onChange={e=>setNote(e.target.value)} placeholder="Add a note, special arrangement or additional information…"/></label>
   </div>
   {duplicate&&<p role="status" className="qe-error">This learner is already enrolled in this edition. Use Edit reviewers in the enrolment table.</p>}
   <div className="qe-footer"><span><ShieldCheck size={16}/> By assigning, you confirm the selected reviewers are competent and authorised by the centre. The learner must be a separate account.</span>
    <button type="button" className="qc-primary" disabled={busy||!ready} onClick={async()=>{if(await onAssign({p_version:versionId,p_learner:learner,p_assessor:assessor,p_verifier:verifier,p_start:start,p_target:target||null,p_note:note.trim(),p_attest:true})){setLearner('');setAssessor('');setVerifier('');setNote('');}}}><CheckCircle2 size={19}/> Assign Qualification</button></div>
  </section>
  <section className="qc-card qe-table-card"><header><span className="qe-heading-icon"><Users size={24}/></span><div><h3>Assigned Enrolments</h3><p>All official editions · {matching.length} of {rows.length} enrolments</p></div></header>
   <div className="qe-filters"><div className="qe-search"><Search size={16}/><input aria-label="Search enrolments" placeholder="Search learner, qualification or reviewer…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <select aria-label="Filter qualification" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All qualifications</option>{versions.map(v=><option key={v.id} value={v.id}>{v.title} · {v.version}</option>)}</select>
    <select aria-label="Filter enrolment status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">In progress</option><option value="completed">Completed</option></select>
   </div>
   <div className="qe-scroll"><table><thead><tr>{['Learner','Qualification','Assessor','Internal Verifier','Dates','Status','Action'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>
    {matching.map(e=><tr key={e.id}><td><div className="qe-person"><span className="qe-avatar">{String(e.learner||"?").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</span><span><strong>{e.learner}</strong><small>{e.learnerEmail}</small></span></div></td><td>{e.title}<small>{e.edition}</small>{e.note&&<small title={e.note}>Note: {e.note}</small>}</td><td>{e.assessor||'Not assigned'}<small>{e.assessorEmail}</small></td><td>{e.verifier||'Not assigned'}<small>{e.verifierEmail}</small>{e.assessorId===e.verifierId&&<small>Shared assignment · independent review required</small>}</td><td>{e.startOn}<small>{e.targetOn?'Target '+e.targetOn:'No target date'}</small></td><td><span className={'qe-status '+(e.completedAt?'done':'active')}>{e.completedAt?'Completed':'In progress'}</span></td><td><button className="qc-outline" type="button" disabled={busy||!e.live||!!e.completedAt} onClick={()=>startEdit(e)}><Pencil size={14}/> Edit</button></td></tr>)}
   </tbody></table></div>
   {!matching.length&&<div className="qe-empty"><Users size={25}/><strong>{rows.length?'No matching enrolments':'No learners enrolled yet'}</strong><span>{rows.length?'Change the filters to see other records.':'Assign a learner when ready. A live qualification can have zero enrolments.'}</span></div>}
  </section>
  {editing&&<section ref={editRef} className="qc-card qe-edit" aria-label="Edit reviewers"><header><ClipboardCheck size={20}/><div><h3>Edit reviewers</h3><p>{editing.learner} · {editing.title} · {editing.edition}</p></div><button type="button" className="qc-outline" disabled={busy} onClick={()=>setEditing(null)} aria-label="Close reviewer editor"><X size={17}/></button></header>
    <div className="qe-fields"><AccountSelect db={db} compact role="assessor" label="Assessor" value={editAssessor} onChange={setEditAssessor} onSelection={setEditAssessorAccount} disabled={busy} revision={revision} exclude={[editing.learnerId]}/>
    <AccountSelect db={db} compact role="verifier" label="Verifier" value={editVerifier} onChange={setEditVerifier} onSelection={setEditVerifierAccount} disabled={busy} revision={revision} exclude={[editing.learnerId]}/></div>
    <label className="qc-field">Note <span className="qe-optional">Optional</span><textarea rows={3} value={reason} disabled={busy} maxLength={1500} onChange={e=>setReason(e.target.value)} placeholder="Add an optional reassignment note…"/></label>
    <div className="qe-footer"><span><ShieldCheck size={16}/> By saving, you confirm reviewer competence and authority. Previous decisions cannot be self-verified.</span><button className="qc-primary" type="button" disabled={busy||!editReady} onClick={async()=>{if(await onReassign({p_enrolment:editing.id,p_assessor:editAssessor,p_verifier:editVerifier,p_note:reason.trim(),p_attest:true}))setEditing(null);}}>Save changes</button></div>
   </section>}
 </div>;
}
