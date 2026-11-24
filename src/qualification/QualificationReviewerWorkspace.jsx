import React,{useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,ClipboardCheck,Clock3,FileText,Filter,GraduationCap,Info,Layers3,Search,ShieldCheck,Users,RotateCcw} from 'lucide-react';
import {canReview,claimLabels,claimState,portfolioRpc} from './qualificationPortfolioApi.js';
import './qualificationReviewerWorkspace.css';

const norm=s=>String(s||'').toLowerCase().trim();
const day=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not set';
export const reviewerCounts=rows=>({learners:new Set(rows.filter(r=>!r.completedAt).map(r=>r.learner)).size,portfolios:rows.filter(r=>!r.completedAt).length,pending:rows.reduce((n,r)=>n+Number(r.pending||0),0),returned:rows.reduce((n,r)=>n+Number(r.returned||0),0),criteria:rows.reduce((n,r)=>n+Number(r.pendingCriteria||0),0),overdue:rows.reduce((n,r)=>n+Number(r.overdueTasks||0),0)});
export const reviewOutcomeRows=portfolio=>(portfolio.units||[]).flatMap((u,i)=>u.outcomes.filter(o=>o.submissions?.length).map(o=>({id:o.id,unit:u.code,unitIndex:i,unitTitle:u.title,title:o.title,code:o.code,state:claimState(o),revision:o.submissions[0].revision,submittedAt:o.submissions[0].submittedAt,criteria:o.submissions[0].snapshot?.criteria?.length||0,actionable:!portfolio.completedAt&&canReview(portfolio.role,claimState(o)),blocked:o.independentBlocked})));
const matches=(o,f)=>f==='all'||f==='pending'&&o.actionable||f==='returned'&&['changes_requested','verification_returned'].includes(o.state)||f==='verified'&&o.state==='verified';
function Status({row}){return <span className={'qr-status '+(row.blocked&&row.actionable?'warn':row.state==='verified'?'ok':row.state==='changes_requested'||row.state==='verification_returned'?'warn':'')}>{row.blocked&&row.actionable?'Independent reviewer needed':claimLabels[row.state]||'Submitted record'}</span>;}
function OutcomeRow({row,onClick,selected=false}){return <button type="button" className={'qr-outcome '+(selected?'selected':'')} onClick={onClick}><span className="qr-icon"><FileText size={21}/></span><span className="qr-outcome-copy"><strong>{row.code} · {row.title}</strong><small>{row.unit} · {row.criteria} criteria · Rev {row.revision}</small><small>Submitted {day(row.submittedAt)}</small></span><Status row={row}/><ArrowRight size={16}/></button>;}
function Filters({value,onChange,items}){return <div className="qr-filters">{items.map(([id,label,count])=><button type="button" key={id} aria-pressed={id===value} onClick={()=>onChange(id)}>{label}{count!=null?' ('+count+')':''}</button>)}</div>;}
function Stats({items}){return <section className="qr-stats" aria-label="Reviewer workload">{items.map(([Icon,title,count])=><div key={title}><span className="qr-stat-icon"><Icon size={23}/></span><span><strong>{count}</strong><small>{title}</small></span></div>)}</section>;}
export function ReviewerQueue({rows,role,onOpen}){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[selected,setSelected]=useState('');
 const counts=reviewerCounts(rows);
 const eligible=rows.filter(r=>(filter==='all'||filter==='pending'&&r.pending>0||filter==='returned'&&r.returned>0||filter==='overdue'&&r.overdueTasks>0||filter==='completed'&&r.completedAt)&&norm([r.learner,r.title,r.version].join(' ')).includes(norm(search)));
 const row=eligible.find(r=>r.id===selected)||eligible[0];
 const assessor=role==='assessor';
 return <div className="qr-workspace">
 <header className="qr-hero"><span><ShieldCheck size={30}/></span><div><h2>{assessor?'Assessor Workspace':'Internal Verifier Workspace'}</h2><p>{assessor?'Review learner submissions and make criterion-level decisions.':'Review accepted assessment decisions and verify independently.'}</p></div></header>
 <Stats items={[[Users,'Active portfolios',counts.portfolios],[ClipboardCheck,'Awaiting review · outcomes',counts.pending],[Layers3,'Pending criteria',counts.criteria],[RotateCcw,'Returned outcomes',counts.returned],[Clock3,'Overdue tasks',counts.overdue]]}/>
 <div className="qr-columns"><aside className="qr-panel"><header><h3>Assigned Learners ({rows.length})</h3><Users size={20}/></header><div className="qr-search"><Search size={17}/><input aria-label="Search learners and qualifications" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search learner or qualification…"/></div>
 <Filters value={filter} onChange={setFilter} items={ [['all','All'],['pending','Pending'],['returned','Returned'],['overdue','Overdue'],['completed','Completed']] }/>
 <div className="qr-list">{eligible.map(r=><button className={'qr-person '+(row?.id===r.id?'selected':'')} type="button" key={r.id} onClick={()=>setSelected(r.id)}><span className="qr-avatar">{String(r.learner||'Learner').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span><span><strong>{r.learner}</strong><small>{r.title}</small><small>{r.pending} awaiting review · {r.verified}/{r.required} verified</small></span><ArrowRight size={16}/></button>)}</div>{!eligible.length&&<div className="qr-empty">No matching assigned learners.</div>}</aside>
 <section className="qr-panel qr-details"><header><span className="qr-icon"><GraduationCap size={25}/></span><div><h3>{row?.learner||'Review queue'}</h3><p>{row?row.title+' · '+row.version:'Select a learner to view submitted outcomes.'}</p></div>{row&&<button type="button" className="qf-button qf-outline" onClick={()=>onOpen(row.id,{reviewRole:role})}>Open Portfolio <ArrowRight size={16}/></button>}</header>
 {row&&<><div className="qr-summary"><span><b>{row.pending}</b> Pending review</span><span><b>{row.returned}</b> Returned</span><span><b>{row.overdueTasks}</b> Overdue tasks</span><span><b>{row.verified}/{row.required}</b> Verified outcomes</span></div>
 <h4>Submitted Outcomes</h4><div className="qr-list">{(row.outcomes||[]).filter(o=>filter==='pending'?o.actionable:filter==='returned'?['changes_requested','verification_returned'].includes(o.state):true).map(o=><OutcomeRow key={o.id} row={o} onClick={()=>onOpen(row.id,{reviewRole:role,outcomeId:o.id})}/>)}</div>{!(row.outcomes||[]).some(o=>filter==='pending'?o.actionable:filter==='returned'?['changes_requested','verification_returned'].includes(o.state):true)&&<div className="qr-empty"><ClipboardCheck size={28}/> No submitted outcomes in this view.</div>}</>}
 </section></div></div>;
}
export function ReviewerPortfolioWorkspace({db,portfolio,selectedId,onSelect,renderReview,onOpenTasks,onOpenUnit,busy}){
 const [filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[tasks,setTasks]=useState(null),[taskError,setTaskError]=useState('');
 useEffect(()=>{let live=true;setTasks(null);setTaskError('');portfolioRpc(db,'task_portfolio',{p_enrolment:portfolio.id}).then(r=>{if(live)setTasks(r||[]);}).catch(e=>{if(live)setTaskError(e.message||'Unable to load tasks.');});return()=>{live=false;};},[db,portfolio]);
 const rows=reviewOutcomeRows(portfolio),pending=rows.filter(r=>r.actionable),returned=rows.filter(r=>['changes_requested','verification_returned'].includes(r.state));
 const visible=rows.filter(r=>matches(r,filter)&&norm([r.code,r.title,r.unit,r.unitTitle].join(' ')).includes(norm(search)));
 const chosen=visible.find(r=>r.id===selectedId)||visible.find(r=>r.actionable)||visible[0];
 const assessor=portfolio.role==='assessor';
 return <div className="qr-workspace">
 <Stats items={[[ClipboardCheck,'Awaiting review',pending.length],[Layers3,'Pending criteria',pending.reduce((n,r)=>n+r.criteria,0)],[RotateCcw,'Returned outcomes',returned.length],[Clock3,'Overdue tasks',tasks?tasks.filter(t=>t.overdue&&t.status!=='Cancelled').length:'—'],[CheckCircle2,'Verified outcomes',rows.filter(r=>r.state==='verified').length]]}/>
 <div className="qr-columns"><aside className="qr-panel"><header><h3>Submitted Outcomes ({rows.length})</h3><Filter size={19}/></header><div className="qr-search"><Search size={16}/><input aria-label="Search submitted outcomes" placeholder="Search unit or outcome…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <Filters value={filter} onChange={setFilter} items={ [['all','All'],['pending','Pending',pending.length],['returned','Returned'],['verified','Verified']] }/>
 <div className="qr-list">{visible.map(r=><OutcomeRow row={r} key={r.id} selected={r.id===chosen?.id} onClick={()=>onSelect(r.id)}/>)}</div>{!visible.length&&<div className="qr-empty">No submitted outcomes in this view.</div>}
 <button className="qf-button qf-outline qr-full" type="button" disabled={busy} onClick={onOpenTasks}><ClipboardCheck size={17}/> {assessor?'Manage Assigned Tasks':'View Assigned Tasks'}</button>{taskError&&<small role="alert">{taskError}</small>}</aside>
 <section className="qr-panel qr-details"><header><span className="qr-icon"><FileText size={24}/></span><div><h3>{chosen?.title||'Review workspace'}</h3><p>{chosen?chosen.unit+' · '+chosen.code+' · Revision '+chosen.revision:'Submitted evidence will appear here.'}</p></div>{chosen&&<Status row={chosen}/>}</header>
 {chosen?<><div className="qr-review-bar"><span>{portfolio.learner} · Submitted {day(chosen.submittedAt)}</span><button className="qf-button qf-outline" disabled={busy} onClick={()=>onOpenUnit(chosen.id)}>Open full Outcome <ArrowRight size={15}/></button></div>{renderReview(chosen.id)}</>:<div className="qr-empty"><Info size={28}/> No submission available for review. Learner drafts remain private.</div>}</section>
 </div></div>;
}
