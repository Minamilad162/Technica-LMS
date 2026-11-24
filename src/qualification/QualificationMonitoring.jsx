import React,{useEffect,useMemo,useState} from 'react';
import {Activity,Award,Bell,CheckCircle2,ClipboardCheck,Clock3,Download,FileText,Filter,Info,Monitor,RefreshCw,Search,ShieldCheck,Users} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import {qualificationFor} from './QualificationCatalogue.jsx';
import './qualificationMonitoring.css';

const clean=s=>String(s||'').toLowerCase().trim();
const date=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Cairo'}):'—';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const daysAgo=n=>{const d=new Date();d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
const eventLabel=k=>({enrolment_assigned:'Qualification assigned',reviewers_reassigned:'Reviewers reassigned',outcome_submitted:'Outcome submitted',assessor_accept:'Assessment accepted',assessor_return:'Changes requested',verifier_accept:'Outcome verified',verifier_return:'Verification returned',task_assigned:'Task assigned',task_rescheduled:'Deadline changed',task_cancelled:'Task cancelled',task_deadline:'Task due / overdue',qualification_completed:'Qualification completed',certificate_recorded:'External certificate recorded'}[k]||String(k).replaceAll('_',' '));
const errorText=e=>e?.message||'Unable to load qualification records.';
function useRead(db,name,args,key){
 const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setData(null);setError('');portfolioRpc(db,name,args).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(errorText(e));});return()=>{alive=false;};},[db,name,key,revision]);
 return {data,error,reload:()=>setRevision(n=>n+1)};
}
function Panel({icon:Icon,title,description,children,extra}){return <section className="qm-panel"><header><span className="qm-icon"><Icon size={23}/></span><div><h3>{title}</h3>{description&&<p>{description}</p>}</div>{extra}</header>{children}</section>;}
function Empty({icon:Icon=Info,children}){return <div className="qm-empty"><Icon size={28}/><span>{children}</span></div>;}
function Table({heads,children}){return <div className="qm-scroll"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;}
function exportCsv(name,heads,rows){
 const cell=x=>{let s=String(x??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const blob=new Blob(['\ufeff'+[heads,...rows].map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function monitorCounts(rows,tasks){
 const active=rows.filter(r=>!r.completedAt),ids=new Set(active.map(r=>r.id));
 return {active:active.length,assessment:active.reduce((n,r)=>n+Number(r.assessment||0),0),verification:active.reduce((n,r)=>n+Number(r.verification||0),0),overdue:tasks.filter(t=>ids.has(t.enrolmentId)&&t.overdue).length,completed:rows.filter(r=>r.completedAt).length};
}
export function workload(rows,staff,role){
 const map=new Map();
 for(const s of staff.filter(s=>s.role===role))map.set(s.userId,{id:s.userId,name:s.name||s.userId,assigned:0,pending:0,blocked:0,active:true});
 for(const r of rows.filter(r=>!r.completedAt)){
  const id=r[role+'Id']||'unassigned',w=map.get(id)||{id,name:r[role]||'Unassigned',assigned:0,pending:0,blocked:0,active:false};
  w.assigned++;w.pending+=Number(r[role==='assessor'?'assessment':'verification']||0);
  if(role==='verifier')w.blocked+=Number(r.independenceBlocked||0);
  if(!r[role+'Active'])w.active=false;map.set(id,w);
 }
 return [...map.values()].sort((a,b)=>b.pending-a.pending||b.assigned-a.assigned||a.name.localeCompare(b.name));
}
export function QualificationNotifications({db,versionId='',compact=false}){
 const {data,error,reload}=useRead(db,'notifications',undefined,'notifications');
 const [busy,setBusy]=useState(''),[actionError,setActionError]=useState(''),[unreadOnly,setUnreadOnly]=useState(false);
 const items=(data?.items||[]).filter(n=>(!versionId||n.versionId===versionId)&&(!unreadOnly||!n.read));
 const mark=async id=>{setBusy(id);setActionError('');try{await portfolioRpc(db,'notification_read',{p_key:id});reload();}catch(e){setActionError(errorText(e));}finally{setBusy('');}};
 return <Panel icon={Bell} title={compact?'Qualification Notifications':'Notifications'} description="Your accessible qualification events. Up to 100 most recent events." extra={<button className="qc-outline" type="button" onClick={reload}><RefreshCw size={15}/> Refresh</button>}>
  {error?<p role="alert">{error}</p>:!data?<p role="status">Loading notifications…</p>:<>
   <div className="qm-notify-controls"><strong>{data.unread} unread across your accessible qualifications</strong><label><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/> Unread only</label></div>
   {actionError&&<p role="alert">{actionError}</p>}
   {items.map(n=><article className={'qm-event '+(!n.read?'unread':'')} key={n.id}><span className="qm-icon"><Bell size={17}/></span><div><strong>{eventLabel(n.kind)}</strong><small>{n.learner} · {n.title}</small><small>{date(n.createdAt)}</small></div>{!n.read&&<button className="qc-outline" type="button" disabled={!!busy} onClick={()=>mark(n.id)}>Mark read</button>}</article>)}
   {!items.length&&<Empty icon={Bell}>No matching notifications.</Empty>}
  </>}
 </Panel>;
}
function Reports({db,versionId,rows,staff}){
 const [from,setFrom]=useState(()=>daysAgo(30)),[to,setTo]=useState(today),[learner,setLearner]=useState(''),[actor,setActor]=useState(''),[status,setStatus]=useState('all');
 const [request,setRequest]=useState(null),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{setData(null);setRequest(null);setLearner('');},[versionId]);
 useEffect(()=>{if(!request)return;let alive=true;setLoading(true);setError('');setData(null);portfolioRpc(db,'monitor_audit',request).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(errorText(e));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[db,request]);
 const items=(data?.items||[]).filter(r=>status==='all'||r.kind===status);
 return <Panel icon={FileText} title="Reports & Audit" description="Recorded actions only. Export the filtered audit rows; no private evidence content is included.">
 <div className="qm-report-fields"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><label>Learner / enrolment<select value={learner} onChange={e=>setLearner(e.target.value)}><option value="">All</option>{rows.map(r=><option key={r.id} value={r.id}>{r.learner} · {r.edition}</option>)}</select></label><label>Reviewer / actor<select value={actor} onChange={e=>setActor(e.target.value)}><option value="">All</option>{[...new Map(staff.map(s=>[s.userId,s])).values()].map(s=><option value={s.userId} key={s.userId}>{s.name||s.userId}</option>)}</select></label><button className="qc-primary" disabled={loading||!from||!to||to<from} onClick={()=>{setStatus('all');setRequest({p_version:versionId||null,p_from:from,p_to:to,p_enrolment:learner||null,p_actor:actor||null});}}>Run report</button></div>
 {error&&<p role="alert">{error}</p>}{loading&&<p role="status">Loading audit records…</p>}
 {data&&<><div className="qm-report-bar"><span>{items.length} displayed · {data.total} matching recorded events{data.total>1000?' · newest 1,000 loaded; narrow date range':''}</span><select aria-label="Filter event type" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All event types</option>{[...new Set(data.items.map(r=>r.kind))].map(k=><option key={k} value={k}>{eventLabel(k)}</option>)}</select><button className="qc-outline" disabled={!items.length} onClick={()=>exportCsv('qualification-audit.csv',['Date','Event','Qualification','Learner','Actor'],items.map(r=>[r.createdAt,eventLabel(r.kind),r.title,r.learner,r.actor]))}><Download size={16}/> Export CSV</button></div>
 <Table heads={['Date','Event','Qualification','Learner','Actor']}>{items.map(r=><tr key={r.id}><td>{date(r.createdAt)}</td><td>{eventLabel(r.kind)}</td><td>{r.title}</td><td>{r.learner||'—'}</td><td>{r.actor||'—'}</td></tr>)}</Table>{!items.length&&<Empty>No recorded events match the selected filters.</Empty>}</>}
 </Panel>;
}
export default function QualificationMonitoring({db,versions,staff,onEnrolments,onTasks,onCertificates,onStaff}){
 const {data,error,reload}=useRead(db,'monitoring',undefined,'monitoring');
 const [tab,setTab]=useState('monitor'),[versionId,setVersionId]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[role,setRole]=useState('assessor');
 const [expanded,setExpanded]=useState('');
 const editionRows=(data?.enrolments||[]).filter(r=>!versionId||r.versionId===versionId);
 const rows=editionRows.filter(r=>[r.learner,r.assessor,r.verifier,r.title].some(s=>clean(s).includes(clean(query)))&&(status==='all'||status==='active'&&!r.completedAt||status==='completed'&&!!r.completedAt||status==='assessment'&&!r.completedAt&&r.assessment>0||status==='verification'&&!r.completedAt&&r.verification>0||status==='overdue'&&!r.completedAt&&data.tasks.some(t=>t.enrolmentId===r.id&&t.overdue)));
 const ids=new Set(rows.map(r=>r.id)),tasks=(data?.tasks||[]).filter(t=>ids.has(t.enrolmentId));
 const counts=monitorCounts(rows,tasks),reviewers=workload(rows,staff,role);
 const overdue=tasks.filter(t=>t.overdue&&rows.some(r=>r.id===t.enrolmentId&&!r.completedAt));
 const ready=rows.filter(r=>!r.completedAt&&r.declarationAt&&r.required>0&&r.required===r.verified),certs=rows.filter(r=>r.certificateRecordedAt).length;
 const hero=qualificationFor(versions.find(v=>v.id===versionId)?.title||versions[0]?.title)?.heroImage;
 const metrics=[[Users,'Active enrolments','active',counts.active],[ClipboardCheck,'Awaiting assessment · outcomes','assessment',counts.assessment],[ShieldCheck,'Awaiting verification · outcomes','verification',counts.verification],[Clock3,'Overdue tasks','overdue',counts.overdue],[CheckCircle2,'Completed enrolments','completed',counts.completed]];
 return <div className="qm-workspace">
 <header className="qm-hero" style={hero?{'--qm-hero':'url("'+hero+'")'}:undefined}><span><Monitor size={32}/></span><div><h2>Qualification Monitoring</h2><p>Monitor learner progress, reviewer activity and qualification completion.</p></div></header>
 <nav className="qm-tabs" aria-label="Monitoring sections">{[[Monitor,'monitor','Monitoring'],[Bell,'notifications','Notifications'],[FileText,'reports','Reports & Audit']].map(([Icon,id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={20}/>{label}</button>)}</nav>
 <div className="qm-controls"><label><Filter size={17}/><select aria-label="Qualification edition" value={versionId} onChange={e=>{setVersionId(e.target.value);setExpanded('');}}><option value="">All official editions</option>{versions.map(v=><option key={v.id} value={v.id}>{v.title} · {v.version}</option>)}</select></label>
 {tab==='monitor'&&<><label><Search size={18}/><input aria-label="Search learner or reviewer" placeholder="Search learner or reviewer…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label><Filter size={17}/><select aria-label="Enrolment status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{metrics.map(([,label,id])=><option key={id} value={id}>{label}</option>)}</select></label></>}
 <button type="button" className="qc-outline" onClick={reload}><RefreshCw size={17}/> Refresh</button></div>
 {tab==='notifications'?<QualificationNotifications db={db} versionId={versionId}/>:tab==='reports'?<Reports db={db} versionId={versionId} rows={editionRows} staff={staff}/>:error?<p role="alert">{error}</p>:!data?<Empty>Loading live qualification monitoring…</Empty>:<>
 <section className="qm-kpis" aria-label="Live monitoring statistics">{metrics.map(([Icon,label,id,n])=><button type="button" key={id} aria-pressed={status===id} onClick={()=>setStatus(s=>s===id?'all':id)}><span className={'qm-kpi-icon '+id}><Icon size={24}/></span><span><small>{label}</small><strong>{n}</strong></span></button>)}</section>
 <div className="qm-upper">
 <Panel icon={Users} title="Learner Progress" description="Verified required Outcomes and current review workload." extra={<button className="qc-outline" disabled={!rows.length} onClick={()=>exportCsv('learner-progress.csv',['Learner','Qualification','Edition','Assessor','Verifier','Verified outcomes','Required outcomes','Awaiting assessment','Awaiting verification','Completed'],rows.map(r=>[r.learner,r.title,r.edition,r.assessor,r.verifier,r.verified,r.required,r.assessment,r.verification,r.completedAt||'']))}><Download size={16}/> Export</button>}>
 <Table heads={['Learner','Qualification','Verified Outcomes','Pending Assessment','Pending Verification','Status']}>{rows.map(r=><React.Fragment key={r.id}><tr><td><button className="qm-link" onClick={()=>setExpanded(s=>s===r.id?'':r.id)}>{r.learner||'Learner'}</button></td><td>{r.title}<small>{r.edition}</small></td><td><strong>{r.verified}/{r.required}</strong><progress max={Math.max(1,r.required)} value={r.verified}/></td><td>{r.assessment}</td><td>{r.verification}{r.independenceBlocked>0&&<small>Independent reviewer needed</small>}</td><td><span className={'qm-status '+(r.completedAt?'ok':'')}>{r.completedAt?'Completed':'Active'}</span></td></tr>{expanded===r.id&&<tr><td colSpan={6}><div className="qm-drill"><span>Assessor: {r.assessor||'Unassigned'} {r.assessorActive?'':'(inactive)'}</span><span>Verifier: {r.verifier||'Unassigned'} {r.verifierActive?'':'(inactive)'}</span><span>Target: {date(r.targetOn)}</span><span>Declaration: {r.declarationAt?'Accepted':'Pending'}</span><button className="qc-outline" onClick={()=>onEnrolments(r.versionId)}>Manage enrolments</button></div></td></tr>}</React.Fragment>)}</Table>{!rows.length&&<Empty icon={Users}>No enrolments match the current filters.</Empty>}
 </Panel>
 <Panel icon={ClipboardCheck} title="Reviewer Workload" description="Assignments and outstanding Outcomes by role.">
 <div className="qm-tabs qm-role">{['assessor','verifier'].map(r=><button key={r} aria-pressed={role===r} onClick={()=>setRole(r)}>{r==='assessor'?'Assessor':'Verifier'}</button>)}</div>
 {reviewers.map(r=><div key={r.id} className="qm-reviewer"><div><strong>{r.name}</strong><small>{r.assigned} active enrolments{!r.active?' · Authorisation required':''}{r.blocked?' · '+r.blocked+' independent review required':''}</small></div><span><b>{r.pending}</b><small>Pending</small></span></div>)}{!reviewers.length&&<Empty icon={ClipboardCheck}>No reviewer assignments.</Empty>}<button type="button" className="qc-outline" onClick={onStaff}>Manage reviewers</button>
 </Panel></div>
 <div className="qm-lower"><Panel icon={Clock3} title="Overdue Tasks" description="Tasks past their due date that still require learner action.">
 {overdue.length?<Table heads={['Task','Learner','Due date','Action']}>{overdue.map(t=><tr key={t.id}><td>{t.title}</td><td>{rows.find(r=>r.id===t.enrolmentId)?.learner}</td><td>{date(t.dueOn)}</td><td><button className="qm-link" onClick={()=>onTasks(t.versionId)}>Manage</button></td></tr>)}</Table>:<Empty icon={Clock3}>No overdue tasks in this view.</Empty>}
 </Panel><Panel icon={Award} title="Completion & Certificates" description="Completion readiness and external certificate records.">
 <div className="qm-completion-stats"><span><b>{ready.length}</b> Ready for final review</span><span><b>{counts.completed}</b> Completed enrolments</span><span><b>{certs}</b> Recorded certificates</span></div>
 <div className="qm-note"><CheckCircle2 size={18}/> Completion requires all required Outcomes to be verified and an accepted learner declaration.</div>
 <div className="qm-note"><FileText size={18}/> Certificate recording requires actual awarding-body issuer authority and an externally issued reference.</div>
 <button className="qc-outline" onClick={()=>onCertificates(versionId)}>Manage certificates</button>
 </Panel></div>
 <small className="qm-footnote">All figures reflect the selected filters and official published qualification editions only. Counts are enrolments, Outcomes or tasks as labelled, not unique people.</small>
 </>}
 </div>;
}
