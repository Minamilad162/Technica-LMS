import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,ClipboardCheck,FileText,GraduationCap,Info,Layers3,Link2,ListChecks,Paperclip,Plus,Save,Target,Users} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import './qualificationTasks.css';

const types=['Written assignment','Workplace evidence','Reflective account','Professional discussion','Other'];
const steps=[[FileText,'Task Details','Title & instructions'],[Layers3,'Link to Units','Outcomes & criteria'],[Paperclip,'Evidence','Requirements'],[CheckCircle2,'Review & Save','Confirm details']];
const blank=()=>({title:'',kind:types[0],instructions:'',criteria:[],evidence:'',documents:[]});
const uid=()=>crypto.randomUUID();
const toggle=(values,ids)=>ids.every(id=>values.includes(id))?values.filter(id=>!ids.includes(id)):[...new Set([...values,...ids])];
const unitCriteria=u=>u.outcomes.flatMap(o=>o.criteria.map(c=>c.id));
const complete=s=>s.title.trim()&&s.instructions.trim().length>=10&&s.criteria.length>0&&s.evidence.trim().length>=3;
const selectedUnits=(units,spec)=>units.filter(u=>unitCriteria(u).some(id=>spec.criteria.includes(id)));
const err=e=>e?.message||'The operation could not be completed.';
function useTaskData(db,rpc,args,key){
 const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setData(null);setError('');
  portfolioRpc(db,rpc,args).then(v=>{if(alive)setData(v);}).catch(e=>{if(alive)setError(err(e));});
  return()=>{alive=false;};
 },[db,rpc,key,revision]);
 return {data,error,reload:()=>setRevision(n=>n+1)};
}
function TaskStatus({status,overdue}){
 return <span className={'qt-status '+(status==='Verified'||status==='Approved'?'qt-ok':overdue||status==='Changes requested'?'qt-warn':'')}>{status}{overdue?' · Overdue':''}</span>;
}
function TaskSummary({spec,units,version,documents,mode}){
 const linked=selectedUnits(units,spec);
 return <aside className="qt-summary"><header><Layers3 size={23}/><h3>{mode==='template'?'Template Overview':'Task Overview'}</h3><TaskStatus status="Draft"/></header>
  <dl>{[[GraduationCap,'Qualification',version.title+' · '+version.version],[Layers3,'Linked Units',linked.length?linked.map(u=>u.code).join(', '):'Not selected yet'],[Target,'Linked Criteria',spec.criteria.length||'Not selected yet'],[Paperclip,'Evidence Requirements',spec.evidence.trim()?'Specified':'Not specified'],[FileText,'Approved materials',documents.filter(d=>spec.documents.includes(d.id)).length],[Users,'Assignments',mode==='template'?'Not assigned':'Individual learner task']].map(([Icon,label,value])=><div key={label}><Icon size={21}/><span><dt>{label}</dt><dd>{value}</dd></span></div>)}</dl>
  <div className="qt-tip"><Info size={20}/><span>{mode==='template'?'Create templates even before any learner enrols. Reuse approved templates with individual deadlines.':'This task is assigned only to the selected learner. Existing portfolio assessment and verification remain in use.'}</span></div>
 </aside>;
}
function TaskBuilder({units,version,documents,initial,mode,onClose,onSave,busy,error}){
 const [spec,setSpec]=useState(()=>initial?.spec||blank()),[step,setStep]=useState(0),[unitId,setUnitId]=useState(units[0]?.id||'');
 const [enrolment,setEnrolment]=useState(version.enrolments?.length===1?version.enrolments[0].id:''),[due,setDue]=useState('');
 const id=useRef(initial?.id||uid());
 const linked=selectedUnits(units,spec),unit=units.find(u=>u.id===unitId);
 const eligible=(version.enrolments||[]).filter(e=>!e.completedAt);
 const learner=eligible.find(e=>e.id===enrolment);
 const patch=(key,value)=>setSpec(s=>({...s,[key]:value}));
 const flip=ids=>setSpec(s=>({...s,criteria:toggle(s.criteria,ids)}));
 const nextReady=step===0?!!spec.title.trim()&&spec.instructions.trim().length>=10:step===1?spec.criteria.length>0:step===2?spec.evidence.trim().length>=3:true;
 const ready=complete(spec)&&(mode==='template'||(learner&&due&&due>=learner.startOn));
 const save=approve=>onSave({id:id.current,spec,revision:initial?.revision||0,approve,enrolment,due});
 return <div className="qt-builder">
  <div className="qt-main">
   <nav className="qt-steps" aria-label="Task creation steps">{steps.map(([Icon,title,sub],i)=><button type="button" key={title} className={i===step?'active':i<step?'done':''} disabled={busy||i>step} onClick={()=>setStep(i)}><Icon size={20}/><span><strong>{i+1} {title}</strong><small>{sub}</small></span></button>)}</nav>
   <section className="qt-panel">
    <header className="qt-panel-head"><span className="qt-icon">{React.createElement(steps[step][0],{size:23})}</span><div><h3>{steps[step][1]}</h3><p>{['Define the task and how the learner should complete it.','Select official criteria across one or more Units.','Specify the evidence required and link approved resources.','Review the task before approval or assignment.'][step]}</p></div></header>
    {step===0&&<><div className="qt-fields"><label className="qc-field">Task Title *<input maxLength={160} value={spec.title} disabled={busy} onChange={e=>patch('title',e.target.value)} placeholder="Enter task title"/></label><label className="qc-field">Task Type<select disabled={busy} value={spec.kind} onChange={e=>patch('kind',e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select></label></div>
     <label className="qc-field">Instructions for the Learner *<textarea rows={8} maxLength={10000} value={spec.instructions} disabled={busy} onChange={e=>patch('instructions',e.target.value)} placeholder="Describe what the learner needs to complete…"/></label><small className="qt-count">{spec.instructions.length} / 10000</small>
     <div className="qt-tip"><Info size={18}/>{mode==='template'?'This reusable template can be assigned to learners later.':'Create a one-off task for one learner without adding a reusable template.'}</div></>}
    {step===1&&<><div className="qt-unit-strip">{units.map((u,i)=>{const ids=unitCriteria(u),count=ids.filter(id=>spec.criteria.includes(id)).length;return <button key={u.id} type="button" aria-pressed={u.id===unitId} onClick={()=>setUnitId(u.id)}><strong>Unit {String(i+1).padStart(2,'0')}</strong><small>{u.code}</small><small>{count}/{ids.length} selected</small></button>;})}</div>
     {unit&&<div className="qt-rubric"><header><div><strong>{unit.title}</strong><small>{unit.outcomes.length} Learning Outcomes · {unitCriteria(unit).length} Criteria</small></div><label><input type="checkbox" disabled={busy} checked={unitCriteria(unit).every(id=>spec.criteria.includes(id))} onChange={()=>flip(unitCriteria(unit))}/> Select all Unit criteria</label></header>
      {unit.outcomes.map(o=><details key={o.id} open><summary>{o.code} · {o.title}</summary><label className="qt-select-all"><input type="checkbox" disabled={busy} checked={o.criteria.every(c=>spec.criteria.includes(c.id))} onChange={()=>flip(o.criteria.map(c=>c.id))}/> Select all outcome criteria</label>{o.criteria.map(c=><label className="qt-criterion" key={c.id}><input type="checkbox" disabled={busy} checked={spec.criteria.includes(c.id)} onChange={()=>flip([c.id])}/><b>{c.code}</b><span>{c.title}</span></label>)}</details>)}</div>}
     <p className="qt-tip"><Link2 size={18}/> {linked.length} Units · {spec.criteria.length} criteria linked. Selection is retained when switching Units.</p></>}
    {step===2&&<><label className="qc-field">Evidence Requirements *<textarea rows={7} maxLength={4000} disabled={busy} value={spec.evidence} onChange={e=>patch('evidence',e.target.value)} placeholder="Describe the required report, workplace evidence, records or other evidence…"/></label><h4>Link approved centre materials (optional)</h4>
     {documents.length?<div className="qt-materials">{documents.map(d=><label key={d.id}><input type="checkbox" disabled={busy} checked={spec.documents.includes(d.id)} onChange={()=>patch('documents',toggle(spec.documents,[d.id]))}/><Paperclip size={16}/><span>{d.title}<small>{d.unit}</small></span></label>)}</div>:<div className="qt-tip"><Info size={18}/> No approved materials are available for this edition yet. Attachments are optional.</div>}</>}
    {step===3&&<><div className="qt-review"><h4>{spec.title||'Untitled task'}</h4><TaskStatus status={spec.kind}/><p className="qt-copy">{spec.instructions}</p><strong>Linked assessment criteria</strong>{linked.map(u=><div key={u.id}><b>{u.code} · {u.title}</b><p>{u.outcomes.flatMap(o=>o.criteria.filter(c=>spec.criteria.includes(c.id)).map(c=>c.code)).join(', ')}</p></div>)}<strong>Evidence requirements</strong><p className="qt-copy">{spec.evidence}</p></div>
     {mode==='individual'&&<div className="qt-fields"><label className="qc-field">Learner *<select value={enrolment} disabled={busy} onChange={e=>setEnrolment(e.target.value)}><option value="">Select enrolled learner</option>{eligible.map(e=><option key={e.id} value={e.id}>{e.learner}</option>)}</select></label><label className="qc-field">Deadline *<input type="date" min={learner?.startOn} disabled={busy} value={due} onChange={e=>setDue(e.target.value)}/></label>{learner&&<div className="qt-tip qt-span"><Users size={17}/> Assessor: {learner.assessor||'Not assigned'} · Verifier: {learner.verifier||'Not assigned'}</div>}</div>}
     <div className="qt-tip"><Info size={18}/> {mode==='template'?'Approval locks this template. Assignments retain the approved content.':'Assignment does not mark any criterion as met. Evidence and decisions remain in the existing portfolio.'}</div></>}
    {error&&<p role="alert" className="qc-error">{error}</p>}
    <footer className="qt-actions"><button type="button" className="qc-outline" disabled={busy} onClick={()=>{if(window.confirm('Close the task editor? Unsaved changes will be lost.'))onClose();}}>Cancel</button><span/>
     {mode==='template'&&<button type="button" className="qc-outline" disabled={busy||!spec.title.trim()} onClick={()=>save(false)}><Save size={16}/> Save Draft</button>}
     {step>0&&<button type="button" className="qc-outline" disabled={busy} onClick={()=>setStep(step-1)}><ArrowLeft size={16}/> Previous</button>}
     {step<3?<button type="button" className="qc-primary" disabled={busy||!nextReady} onClick={()=>setStep(step+1)}>Next: {steps[step+1][1]} <ArrowRight size={16}/></button>:<button type="button" className="qc-primary" disabled={busy||!ready} onClick={()=>{if(window.confirm(mode==='template'?'Approve and lock this task template?':'Assign this task to the selected learner?'))save(true);}}><CheckCircle2 size={17}/> {mode==='template'?'Approve Template':'Assign Task'}</button>}
    </footer>
   </section>
  </div><TaskSummary spec={spec} units={units} version={version} documents={documents} mode={mode}/>
 </div>;
}
function AssignTemplate({version,template,onCancel,onAssign,busy}){
 const [learner,setLearner]=useState(''),[due,setDue]=useState(''),id=useRef(uid());
 const enrolments=(version.enrolments||[]).filter(e=>!e.completedAt),selected=enrolments.find(e=>e.id===learner);
 return <section className="qt-panel qt-assign-template"><h3>Assign template · {template.spec.title}</h3><div className="qt-fields"><label className="qc-field">Learner<select value={learner} disabled={busy} onChange={e=>setLearner(e.target.value)}><option value="">Select enrolled learner</option>{enrolments.map(e=><option key={e.id} value={e.id}>{e.learner}</option>)}</select></label><label className="qc-field">Deadline<input type="date" min={selected?.startOn} value={due} disabled={busy} onChange={e=>setDue(e.target.value)}/></label></div>
 {selected&&<p className="qt-tip"><Users size={18}/> Assessor: {selected.assessor||'Not assigned'} · Verifier: {selected.verifier||'Not assigned'}</p>}
 {!version.publishedAt||!enrolments.length?<p>No active learner enrolments available. Publish and enrol a learner first.</p>:null}
 <footer className="qt-actions"><button className="qc-outline" type="button" disabled={busy} onClick={onCancel}>Cancel</button><span/><button className="qc-primary" type="button" disabled={busy||!version.publishedAt||!selected||!due||due<selected.startOn} onClick={()=>onAssign(id.current,learner,template.id,null,due)}>Assign Task</button></footer></section>;
}
function TaskManagement({db,task,reload}){
 const [action,setAction]=useState(''),[due,setDue]=useState(task.dueOn),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 const close=()=>{setAction('');setError('');setReason('');setDue(task.dueOn);};
 const ready=action==='reschedule'?due&&due!==task.dueOn&&due>=task.startOn:reason.trim().length>=3;
 const save=async()=>{if(lock.current||!ready)return;if(action==='cancel'&&!window.confirm('Cancel this task? Existing evidence and assessment decisions will be retained.'))return;
 lock.current=true;setBusy(true);setError('');
 try{await portfolioRpc(db,'task_manage',{p_task:task.id,p_revision:task.revision,p_action:action,p_due:action==='reschedule'?due:null,p_reason:reason.trim()});close();reload();}
 catch(e){setError(err(e));}finally{setBusy(false);lock.current=false;}
 };
 if(!task.canManage)return task.cancelReason?<small>Cancellation reason: {task.cancelReason}</small>:null;
 return <div className="qt-management">
 {!action?<div className="qt-manage-buttons"><button className="qc-outline" type="button" onClick={()=>setAction('reschedule')}>Change deadline</button><button className="qc-outline qt-cancel-task" type="button" onClick={()=>setAction('cancel')}>Cancel task</button></div>:<div className="qt-manage-form">
 <strong>{action==='reschedule'?'Change deadline':'Cancel assigned task'}</strong>
 {action==='reschedule'&&<label className="qc-field">New deadline<input type="date" min={task.startOn} value={due} onChange={e=>setDue(e.target.value)} disabled={busy}/></label>}
 <label className="qc-field">{action==='cancel'?'Cancellation reason *':'Note (optional)'}<textarea maxLength={1000} rows={2} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>
 <small>Existing evidence and assessment decisions are preserved.</small>
 {error&&<p role="alert" className="qc-error">{error}</p>}
 <div className="qt-manage-buttons"><button type="button" className="qc-outline" disabled={busy} onClick={close}>Back</button><button className="qc-primary" type="button" disabled={busy||!ready} onClick={save}>{busy?'Saving…':action==='reschedule'?'Save deadline':'Confirm cancellation'}</button></div>
 </div>}
 </div>;
}
export function TaskAdminWorkspace({db,version,tab}){
 const {data,error:loadError,reload}=useTaskData(db,'task_admin_workspace',{p_version:version.id},version.id);
 const [editor,setEditor]=useState(null),[assigning,setAssigning]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [query,setQuery]=useState('');const lock=useRef(false);
 const units=data?.units||[],templates=data?.templates||[],tasks=data?.tasks||[];
 const documents=(version.units||[]).flatMap(u=>(u.documents||[]).filter(d=>d.status==='approved').map(d=>({...d,unit:u.code})));
 const run=async(work,success)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await work();setEditor(null);setAssigning(null);setMessage(success);reload();}catch(e){setError(err(e));}finally{setBusy(false);lock.current=false;}};
 const assign=(id,enrolment,template,spec,due)=>run(()=>portfolioRpc(db,'task_assign',{p_id:id,p_enrolment:enrolment,p_template:template,p_spec:spec,p_due:due}),'Task assigned to the selected learner.');
 const save=payload=>editor.mode==='individual'?assign(payload.id,payload.enrolment,null,payload.spec,payload.due):run(()=>portfolioRpc(db,'task_save_template',{p_id:payload.id,p_version:version.id,p_spec:payload.spec,p_revision:payload.revision,p_approve:payload.approve}),payload.approve?'Template approved and ready to assign.':'Template draft saved.');
 const matching=list=>list.filter(t=>[t.spec.title,t.learner||''].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
 useEffect(()=>{setEditor(null);setAssigning(null);setQuery('');setError('');setMessage('');},[tab]);
 if(loadError)return <div className="qt-panel"><p role="alert">{loadError}</p><button className="qc-outline" onClick={reload}>Retry</button></div>;
 if(!data)return <div className="qt-panel" role="status">Loading real assessment tasks…</div>;
 return <div className="qt-workspace">
  <div className="qt-stats">{[[Layers3,units.length,'Units'],[Target,units.reduce((n,u)=>n+u.outcomes.length,0),'Learning Outcomes'],[CheckCircle2,units.reduce((n,u)=>n+unitCriteria(u).length,0),'Assessment Criteria'],[FileText,templates.length,'Task Templates']].map(([Icon,n,label])=><div key={label}><Icon size={22}/><strong>{n}</strong><span>{label}</span></div>)}</div>
  {message&&<p className="qc-success-message" role="status">{message}</p>}
  {!editor&&error&&<p role="alert" className="qc-error">{error}</p>}
  {editor?<TaskBuilder key={editor.key} mode={editor.mode} initial={editor.initial} version={version} units={units} documents={documents} busy={busy} error={error} onClose={()=>{setEditor(null);setError('');}} onSave={save}/>:<>
   <section className="qt-panel"><header className="qt-list-head"><div><h3>{tab==='templates'?'Task Templates':'Assigned Tasks'}</h3><p>{tab==='templates'?'Reusable plans for this qualification edition.':'Individual tasks, deadlines and assessment progress.'}</p></div><button className="qc-primary" type="button" disabled={busy||(tab!=='templates'&&(!version.publishedAt||!(version.enrolments||[]).some(e=>!e.completedAt)))} onClick={()=>{setError('');setEditor({mode:tab==='templates'?'template':'individual',key:uid()});}}><Plus size={18}/> {tab==='templates'?'Create Task Template':'Create Individual Task'}</button></header>
   <input className="qt-search" aria-label="Search tasks" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks…"/>
   {tab==='templates'?<div className="qt-list">{matching(templates).map(t=><article key={t.id}><span className="qt-icon"><FileText size={23}/></span><div><h4>{t.spec.title}</h4><small>{t.spec.kind} · {selectedUnits(units,t.spec).length} Units · {t.spec.criteria.length} Criteria</small></div><TaskStatus status={t.approvedAt?'Approved':'Draft'}/><button type="button" className="qc-outline" disabled={busy} onClick={()=>{setAssigning(null);setEditor({mode:'template',key:uid(),initial:t.approvedAt?{spec:t.spec}:t});}}>{t.approvedAt?'Copy':'Edit'}</button>{t.approvedAt&&<button className="qc-primary" disabled={busy||!version.publishedAt||!(version.enrolments||[]).some(e=>!e.completedAt)} type="button" onClick={()=>setAssigning(t)}>Assign</button>}</article>)}{!matching(templates).length&&<div className="qt-empty">No matching task templates. Create a template to get started.</div>}</div>:<div className="qt-list">{matching(tasks).map(t=><article key={t.id}><span className="qt-icon"><ClipboardCheck size={22}/></span><div><h4>{t.spec.title}</h4><small>{t.learner} · Due {t.dueOn} · Assessor: {t.assessor}</small></div><TaskStatus status={t.status} overdue={t.overdue}/><TaskManagement db={db} task={t} reload={reload}/></article>)}{!matching(tasks).length&&<div className="qt-empty">No matching assigned tasks. Assign an approved template or create an individual task.</div>}</div>}
   </section>{assigning&&<AssignTemplate key={assigning.id} version={version} template={assigning} onCancel={()=>setAssigning(null)} onAssign={assign} busy={busy}/>}
  </>}
 </div>;
}
export function PortfolioAssignedTasks({db,portfolio,onOutcome,onView}){
 const {data,error,reload}=useTaskData(db,'task_portfolio',{p_enrolment:portfolio.id},portfolio.id);
 const units=portfolio.units||[],[editor,setEditor]=useState(false),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 const documents=units.flatMap(u=>(u.centreBrief?.files||[]).map(d=>({...d,unit:u.code})));
 const version={title:portfolio.title,version:portfolio.version,enrolments:[{id:portfolio.id,learner:portfolio.learner,assessor:portfolio.assessor,verifier:portfolio.verifier,startOn:portfolio.startsOn,completedAt:portfolio.completedAt}]};
 const save=async payload=>{if(lock.current)return;lock.current=true;setBusy(true);setActionError('');setNotice('');
  try{await portfolioRpc(db,'task_assign',{p_id:payload.id,p_enrolment:portfolio.id,p_template:null,p_spec:payload.spec,p_due:payload.due});setEditor(false);setNotice('Individual task assigned.');reload();}
  catch(e){setActionError(err(e));}finally{setBusy(false);lock.current=false;}
 };
 const openFile=async d=>{setActionError('');try{const {data,error}=await db.storage.from('technica-qualification-materials').createSignedUrl(d.path,60);
  if(error||!data?.signedUrl)throw error||new Error('Approved material is unavailable.');window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }catch(e){setActionError(err(e));}};
 return <section className="qf-card qt-portfolio-tasks"><div className="qf-card-header"><h3>{portfolio.role==='learner'?'My Assigned Tasks':'Assigned Tasks'}</h3>
  {portfolio.role==='assessor'&&!portfolio.completedAt&&!editor&&<button className="qf-button qf-primary" onClick={()=>{setActionError('');setEditor(true);}}><Plus size={16}/> Create Individual Task</button>}</div>
  {notice&&<p role="status">{notice}</p>}
  {editor&&<TaskBuilder mode="individual" version={version} units={units} documents={documents} busy={busy} error={actionError} onSave={save} onClose={()=>{setEditor(false);setActionError('');}}/>}
  {!editor&&actionError&&<p role="alert" className="qf-live-error">{actionError}</p>}
  {error?<p role="alert">{error} <button className="qf-button qf-outline" onClick={reload}>Retry</button></p>:!data?<p>Loading tasks…</p>:!data.length?<p>No individual tasks assigned yet.</p>:<div className="qt-list">{data.map(t=><details key={t.id} className="qt-task-detail"><summary><div><strong>{t.spec.title}</strong><small>Due {t.dueOn} · {t.spec.kind}</small></div><TaskStatus status={t.status} overdue={t.overdue}/></summary><div className="qt-task-body"><strong>Instructions</strong><p className="qt-copy">{t.spec.instructions}</p><strong>Evidence required</strong><p className="qt-copy">{t.spec.evidence}</p>
   {units.flatMap(u=>u.outcomes.filter(o=>o.criteria.some(c=>t.spec.criteria.includes(c.id))).map(o=><div key={o.id} className="qt-outcome-link"><div><strong>{u.code} · {o.code}</strong><small>{o.criteria.filter(c=>t.spec.criteria.includes(c.id)).map(c=>c.code+' '+c.title).join(' · ')}</small></div><button className="qf-button qf-outline" onClick={()=>onOutcome(o.id)}>Open Outcome <ArrowRight size={15}/></button></div>))}
   {documents.filter(d=>t.spec.documents.includes(d.id)).map(d=><button key={d.id} type="button" className="qf-button qf-outline" onClick={()=>openFile(d)}><Paperclip size={16}/> {d.title}</button>)}
   {t.spec.documents.some(id=>!documents.some(d=>d.id===id))&&<p>Some linked materials are unavailable to this account. Contact the centre.</p>}
   <TaskManagement db={db} task={t} reload={reload}/>
   {portfolio.role==='learner'&&!t.cancelledAt&&<button type="button" className="qf-button qf-primary" onClick={()=>onView('evidence')}>Open Evidence Folder</button>}
  </div></details>)}</div>}
 </section>;
}
