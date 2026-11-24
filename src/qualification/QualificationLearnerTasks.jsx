import React,{useEffect,useState} from 'react';
import {ArrowRight,BookOpen,CalendarDays,CheckCircle2,ClipboardCheck,Clock3,FileText,Filter,FolderOpen,Info,Layers3,Link2,MessageSquare,PenLine,Send,Target,Upload,RotateCcw,Grid3X3} from 'lucide-react';
import {portfolioRpc,claimLabels} from './qualificationPortfolioApi.js';
import {taskDetails,taskCounts,matchesTask,editableStates} from './learnerTaskModel.js';
import './qualificationLearnerTasks.css';

const formatDate=value=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value)):'Not set';
const statusLabel=t=>t.status==='Verified'?'Completed':t.status==='Awaiting review'?'Submitted':t.status;
const statusTone=t=>t.status==='Verified'?'green':t.status==='Changes requested'?'red':t.status==='Awaiting review'?'purple':t.status==='Cancelled'?'muted':'blue';
const Badge=({task})=><span className={'qlt-badge '+statusTone(task)}>{statusLabel(task)}</span>;
function Panel({icon:Icon,title,children,extra}){return <section className="qlt-panel"><header><Icon size={21}/><h3>{title}</h3>{extra}</header>{children}</section>;}
export default function QualificationLearnerTasks({db,portfolio,progress,selectedId,onSelect,onView,onOutcome,onUnit,onEvidence,busy}){
 const [tasks,setTasks]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [filter,setFilter]=useState('all'),[page,setPage]=useState(0),[showFilters,setShowFilters]=useState(false),[showSubmit,setShowSubmit]=useState(false);
 const [fileError,setFileError]=useState('');
 useEffect(()=>{let alive=true;setTasks(null);setError('');
  portfolioRpc(db,'task_portfolio',{p_enrolment:portfolio.id}).then(rows=>{if(alive)setTasks(Array.isArray(rows)?rows:[]);}).catch(e=>{if(alive)setError(e?.message||'Unable to load assigned tasks.');});
  return()=>{alive=false;};
 },[db,portfolio.id,retry]);
 const counts=taskCounts(tasks||[]),matching=(tasks||[]).filter(t=>matchesTask(t,filter));
 const pageSize=5,last=Math.max(0,Math.ceil(matching.length/pageSize)-1),visible=matching.slice(Math.min(page,last)*pageSize,(Math.min(page,last)+1)*pageSize);
 const selected=matching.find(t=>t.id===selectedId)||visible[0];
 const detail=taskDetails(selected,portfolio);
 const overall=progress.total?Math.round(progress.verified*100/progress.total):0;
 const canWork=!!selected&&selected.status!=='Cancelled'&&selected.status!=='Verified'&&portfolio.canEdit&&detail.active.length>0;
 const next=detail.active.find(o=>!o.allCovered)||detail.active[0];
 const step=detail.active.length===0?2:detail.mapped===0?0:detail.mapped<detail.criteria.length||detail.active.some(o=>!o.allCovered)?1:2;
 const select=t=>{onSelect(t.id);setShowSubmit(false);setFileError('');};
 const chooseFilter=f=>{setFilter(f);setPage(0);setShowSubmit(false);};
 const openMaterial=async doc=>{setFileError('');try{const {data,error}=await db.storage.from('technica-qualification-materials').createSignedUrl(doc.path,60);if(error||!data?.signedUrl)throw error||new Error('Material unavailable.');window.open(data.signedUrl,'_blank','noopener,noreferrer');}catch(e){setFileError(e.message||'Material unavailable.');}};
 const documents=portfolio.units.flatMap(u=>u.centreBrief?.files||[]).filter(d=>selected?.spec.documents.includes(d.id));
 const stats=[[ClipboardCheck,'Total tasks',counts.total,'blue'],[ClipboardCheck,'Submitted',counts.submitted,'blue'],[RotateCcw,'Changes requested',counts.changes,'pink'],[Clock3,'In progress',counts.inProgress,'yellow'],[CheckCircle2,'Completed',counts.completed,'green']];
 return <div className="qlt-workspace">
  <section className="qlt-progress" aria-label="Qualification progress and task counts">
   <div className="qlt-progress-overall"><div><strong>My Progress</strong><small>Verified required outcomes</small></div><div className="qlt-ring" style={{'--qlt-percent':overall+'%'}} aria-label={overall+' percent verified'}><span>{overall}%</span></div></div>
   {stats.map(([Icon,label,value,tone])=><div key={label} className="qlt-stat"><span className={'qlt-stat-icon '+tone}><Icon size={23}/></span><div><strong>{tasks?value:'—'}</strong><small>{label}</small></div></div>)}
  </section>
  {error?<div className="qlt-empty" role="alert">{error}<button className="qf-button qf-outline" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:!tasks?<div className="qlt-empty" role="status">Loading assigned tasks…</div>:<div className="qlt-columns">
   <aside className="qlt-list-card"><header><h2>My Tasks ({tasks.length})</h2><button type="button" className="qlt-icon-button" aria-label="More task filters" aria-expanded={showFilters} onClick={()=>setShowFilters(s=>!s)}><Filter size={19}/></button></header>
    <div className="qlt-filters">{[['all','All',tasks.length],['active','Active',counts.active],['overdue','Overdue',counts.overdue]].map(([id,label,count])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>chooseFilter(id)}>{label} ({count})</button>)}</div>
    {showFilters&&<div className="qlt-filters qlt-more-filters">{[['submitted','Submitted'],['changes','Changes requested'],['completed','Completed'],['cancelled','Cancelled']].map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>chooseFilter(id)}>{label}</button>)}</div>}
    <div className="qlt-list">{visible.map(t=>{const d=taskDetails(t,portfolio);return <button type="button" key={t.id} className={'qlt-task '+(selected?.id===t.id?'selected':'')} aria-pressed={selected?.id===t.id} onClick={()=>select(t)}><span className="qlt-file-icon"><FileText size={24}/></span><span className="qlt-task-text"><strong>{t.spec.title}</strong><small>{d.groups.map(g=>'Unit '+String(g.index+1).padStart(2,'0')).join(', ')} · {d.criteria.length} criteria</small><small><CalendarDays size={13}/> Due: {formatDate(t.dueOn)}</small><small>{d.verified}/{t.spec.criteria.length} verified {t.overdue?' · Overdue':''}</small></span><Badge task={t}/></button>;})}</div>
    {!matching.length&&<div className="qlt-empty"><FolderOpen size={30}/><strong>{tasks.length?'No tasks match this filter':'No assigned tasks yet'}</strong><span>{tasks.length?'Select another filter.':'Tasks will appear when your assessment team assigns them.'}</span></div>}
    {last>0&&<div className="qlt-pagination"><button disabled={page===0} onClick={()=>{setPage(p=>p-1);setShowSubmit(false);}}>Previous</button><span>{Math.min(page,last)+1} / {last+1}</span><button disabled={page>=last} onClick={()=>{setPage(p=>p+1);setShowSubmit(false);}}>Next</button></div>}
   </aside>
   <main className="qlt-detail-card">{!selected?<div className="qlt-empty qlt-no-task"><ClipboardCheck size={42}/><h2>Your assessment workspace</h2><p>Select a task to view its instructions, linked criteria and reviewer feedback. You can still access the programme and evidence folder.</p><button className="qf-button qf-outline" onClick={()=>onView('programme')}>View Units</button><button className="qf-button qf-primary" onClick={()=>onView('evidence')}>Evidence Folder</button></div>:<>
    <header className="qlt-detail-head"><span className="qlt-file-icon"><FileText size={30}/></span><div><h2>{selected.spec.title} <Badge task={selected}/></h2><p>{detail.groups.map(g=>'Unit '+String(g.index+1).padStart(2,'0')+' – '+g.unit.title).join(' · ')}</p></div><div className="qlt-due"><CalendarDays size={19}/><span><small>Due date</small><strong>{formatDate(selected.dueOn)}</strong></span></div></header>
    <div className="qlt-steps" aria-label="Evidence journey">{[[FileText,'Prepare Evidence'],[Layers3,'Map to Criteria'],[Send,'Submit for Assessment']].map(([Icon,label],i)=><button type="button" key={label} aria-current={step===i?'step':undefined} className={step===i?'current':step>i?'done':''} disabled={busy||!canWork} onClick={()=>{if(i===0)onEvidence('upload');else if(i===1)onView('matrix');else setShowSubmit(s=>!s);}}><Icon size={21}/><b>{i+1}</b>{label}</button>)}</div>
    <div className="qlt-detail-grid">
     <Panel icon={Target} title="Task Instructions"><p className="qlt-copy">{selected.spec.instructions}</p><small>{selected.spec.kind}</small></Panel>
     <Panel icon={Link2} title="Linked Learning Outcomes & Assessment Criteria" extra={<span className="qlt-coverage">{detail.verified}/{selected.spec.criteria.length} verified</span>}>
      <div className="qlt-coverage-bar"><span style={{width:detail.percent+'%'}}/></div>
      {detail.groups.map(g=><details key={g.unit.id} open><summary>Unit {String(g.index+1).padStart(2,'0')} · {g.unit.title}</summary>{g.outcomes.map(o=><div key={o.outcome.id} className="qlt-criteria-outcome"><button type="button" className="qlt-outcome" onClick={()=>onOutcome(o.outcome.id)}>{o.outcome.code} · {o.outcome.title}<ArrowRight size={13}/></button>{o.criteria.map(c=><div key={c.id} className="qlt-criterion"><span className={'qlt-check '+(c.verified?'verified':c.linked?'linked':'')}>{c.verified||c.linked?<CheckCircle2 size={15}/>:<span/>}</span><b>AC {c.code}</b><span>{c.title}<small>{c.verified?'Verified':c.linked?'Evidence linked':'Not mapped'}</small></span></div>)}</div>)}</details>)}
      {!!detail.missing&&<p role="alert">Some linked criteria could not be loaded. Refresh before submitting.</p>}
     </Panel>
     <Panel icon={Link2} title="Evidence Requirements"><div className="qlt-evidence-copy"><div className="qlt-file-types" aria-label="Supported upload file types">{[['PDF','pdf'],['W','word'],['X','excel'],['IMG','image']].map(([label,tone])=><span key={label} className={tone}><FileText size={20}/>{label}</span>)}</div><p className="qlt-copy">{selected.spec.evidence}</p></div>
      <p className="qlt-small">{detail.mapped}/{selected.spec.criteria.length} task criteria have evidence linked. One evidence item can cover multiple Units.</p>
      {documents.map(d=><button key={d.id} type="button" className="qf-button qf-outline" onClick={()=>openMaterial(d)}><FileText size={15}/>{d.title}</button>)}{fileError&&<p role="alert">{fileError}</p>}
     </Panel>
     <Panel icon={MessageSquare} title="Reviewer Feedback">{!detail.feedback.length?<div className="qlt-info"><Info size={20}/> No feedback yet.</div>:<div className="qlt-feedback">{detail.feedback.map((f,i)=><article key={f.outcomeId+':'+f.revision+':'+i}><strong>{f.stage==='assessor'?'Assessor':'Verifier'} · {f.unit} / {f.outcome}</strong><small>{formatDate(f.createdAt)} · Revision {f.revision}</small><p className="qlt-copy">{f.feedback}</p><button className="qlt-outcome" onClick={()=>onOutcome(f.outcomeId)}>Open Outcome <ArrowRight size={14}/></button></article>)}</div>}</Panel>
    </div>
    {selected.cancelledAt&&<div className="qlt-info"><Info size={18}/> Task cancelled. {selected.cancelReason||''} Existing evidence and decisions remain in the portfolio.</div>}
    {showSubmit&&<Panel icon={Send} title="Review before submission"><p>Submit each linked Outcome through its existing competence claim. All criteria in that Outcome must be covered, even if this task links only some of them.</p>{!portfolio.declarationAt&&<p>Accept your learner declaration in <button className="qlt-outcome" onClick={()=>onView('registration')}>Registration</button> before submission.</p>}{!portfolio.assessorAssigned&&<p>An active assessor must be assigned.</p>}{detail.outcomes.map(o=><div key={o.outcome.id} className="qlt-submit-row"><div><strong>{o.outcome.code} · {o.outcome.title}</strong><small>{claimLabels[o.state]} · {o.allCovered?'All Outcome criteria mapped':'Some Outcome criteria need evidence'}</small></div><button className="qf-button qf-outline" onClick={()=>onOutcome(o.outcome.id)}>{editableStates.includes(o.state)?o.state==='changes_requested'?'Review & resubmit':'Review & submit':'View record'}</button></div>)}</Panel>}
    <footer className="qlt-actions"><button type="button" className="qf-button qf-outline" disabled={busy||!detail.groups.length} onClick={()=>onUnit(detail.groups[0].index)}><BookOpen size={17}/> View Unit Brief</button><button type="button" className="qf-button qf-outline" disabled={busy} onClick={()=>onView('matrix')}><Grid3X3 size={17}/> Open Matrix</button><button type="button" className="qf-button qf-primary" disabled={busy||!canWork} onClick={()=>onEvidence('upload')}><Upload size={18}/> Upload Evidence</button><button type="button" className="qf-button qf-outline" disabled={busy||!canWork} onClick={()=>onEvidence('write')}><PenLine size={17}/> Write Evidence</button><button type="button" className="qf-button qf-primary" disabled={busy||!canWork} onClick={()=>setShowSubmit(s=>!s)}><Send size={18}/> Submit for Assessment</button></footer>
   </>}</main>
  </div>}
 </div>;
}
