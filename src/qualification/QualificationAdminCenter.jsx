import React,{useState} from 'react';
import {ArrowRight,BookOpen,CheckCircle2,ClipboardCheck,Eye,FileText,FolderOpen,GraduationCap,Grid2X2,LayoutDashboard,Layers3,List,Search,Settings,ShieldCheck,Users,Award,CalendarDays,ChevronRight} from 'lucide-react';
import {qualificationReadiness} from './qualificationReadiness.js';
import {qualificationFor} from './QualificationCatalogue.jsx';
import './qualificationAdminCenter.css';

export const adminSections=[
 ['overview','Overview',LayoutDashboard],['qualifications','All Qualifications',GraduationCap],
 ['enrolments','Enrolments',Users],['staff','Assessors & Verifiers',ShieldCheck],
 ['plans','Assessment Plans',ClipboardCheck],['updates','Programme Updates',CalendarDays],
 ['certificates','Certificates',Award]
];
export const setupTabs=[['summary','Overview',LayoutDashboard],['units','Units',Layers3],['materials','Materials',FolderOpen],['plans','Assessment Plans',ClipboardCheck],['release','Settings',Settings]];
const unitsOf=v=>v?.units||[];
const learnersOf=v=>v?.enrolments||[];
const materialsOf=v=>unitsOf(v).flatMap(u=>u.documents||[]);
const activeCount=v=>learnersOf(v).filter(e=>!e.completedAt).length;
const approvedCount=v=>unitsOf(v).filter(u=>u.brief?.status==='approved'&&u.brief?.approvedAt).length;
const pct=(n,d)=>d?Math.round(n*100/d):0;
const details=(v,refs)=>refs.find(r=>r.catalog_key===v?.catalogKey);
function Mark({version}){
 const item=qualificationFor(version?.title);
 return <span className={'qac-mark qac-mark-'+(item?.color||'blue')}><span>{item?.body||'Qualification'}</span></span>;
}
function State({version}){return <span className={'qac-state '+(version.publishedAt?'active':'setup')}>{version.publishedAt?'Live':'Draft'}</span>;}
function Stat({label,value,detail,Icon,tone,onClick}){
 return <button type="button" className={'qac-stat qac-'+tone} onClick={onClick}><span className="qac-stat-icon"><Icon size={23}/></span>
  <span><strong>{value}</strong><b>{label}</b><small>{detail}</small></span></button>;
}
function Workflow({version,staff,onTab}){
 const r=qualificationReadiness(version,staff), documents=materialsOf(version);
 const stages=[
  ['Qualification Details','Official edition and reference',!!version?.catalogKey,'summary'],
  ['Units & Structure','Learning Outcomes and Assessment Criteria',r.units>0&&!r.incompleteRubric.length,'units'],
  ['Learning Materials',documents.length?documents.filter(d=>d.status==='approved').length+' approved files':'Optional centre resources',documents.length>0&&documents.every(d=>d.status==='approved'),'materials'],
  ['Assessment Plans',r.approvedBriefs+' / '+r.units+' Unit briefs approved',r.units>0&&!r.pendingUnits.length,'plans'],
  ['Publish Qualification','Centre sign-off and publication',r.published,'release']
 ];
 return <aside className="qac-workflow"><h2>Qualification Setup Workflow</h2><ol>{stages.map(([name,desc,done,tab],i)=><li key={tab}>
  <button type="button" onClick={()=>onTab(tab)}><span className={'qac-step '+(done?'done':'')}>{done?<CheckCircle2 size={22}/>:i+1}</span><span><strong>{name}</strong><small>{desc}</small></span><ChevronRight size={14}/></button>
 </li>)}</ol></aside>;
}
export function AdminQualificationNavigation({section,onSection}){
 return <nav className="qac-navigation" aria-label="Qualification management sections">{adminSections.map(([id,label,Icon])=><button key={id} type="button" aria-current={section===id?'page':undefined} onClick={()=>onSection(id)}><Icon size={17}/>{label}</button>)}</nav>;
}
export function AdminQualificationCatalog({versions,version,staff,references,onSelect,onTab,onSection,saving}){
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[layout,setLayout]=useState('grid');
 const released=versions.filter(v=>v.publishedAt).length;
 const shown=versions.filter(v=>(filter==='all'||(filter==='active'?!!v.publishedAt:!v.publishedAt))&&
  [v.title,v.version,v.catalogKey].some(value=>String(value||'').toLowerCase().includes(query.toLowerCase().trim())));
 return <>
  <section className="qac-stats" aria-label="Live qualification management statistics">
   <Stat label="Qualification editions" value={versions.length} detail="Official editions" Icon={GraduationCap} tone="blue" onClick={()=>setFilter('all')}/>
   <Stat label="Live" value={released} detail="Released for enrolment" Icon={CheckCircle2} tone="green" onClick={()=>setFilter('active')}/>
   <Stat label="Draft" value={versions.length-released} detail="Being prepared" Icon={Layers3} tone="violet" onClick={()=>setFilter('setup')}/>
   <Stat label="Enrolments" value={versions.reduce((n,v)=>n+learnersOf(v).length,0)} detail="Across all editions" Icon={Users} tone="blue" onClick={()=>onSection('enrolments')}/>
   <Stat label="Approved Unit briefs" value={versions.reduce((n,v)=>n+approvedCount(v),0)} detail="Centre-approved plans" Icon={ClipboardCheck} tone="orange" onClick={()=>onSection('plans')}/>
  </section>
  <div className="qac-catalog-grid">
   <section className="qac-catalog"><h2>My Qualifications</h2>
    <div className="qac-controls"><div className="qac-filters" role="group" aria-label="Edition status">{[['all','All',versions.length],['active','Live',released],['setup','Draft',versions.length-released]].map(([id,label,n])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label} ({n})</button>)}</div>
     <div className="qac-search"><button type="button" aria-label="Grid view" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}><Grid2X2 size={16}/></button><button type="button" aria-label="List view" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><List size={16}/></button><label><Search size={16}/><input aria-label="Search qualifications" placeholder="Search qualifications..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div></div>
    <div className={'qac-cards '+(layout==='list'?'qac-list':'')}>{shown.map(v=>{
     const item=qualificationFor(v.title), approved=approvedCount(v),count=unitsOf(v).length;
     return <button type="button" key={v.id} disabled={saving} aria-pressed={v.id===version?.id} className="qac-edition" onClick={()=>onSelect(v)}>
      <div className="qac-edition-top"><Mark version={v}/><State version={v}/></div>
      <div><h3>{item?.short||v.title}</h3><p>{v.title}</p><small className="qac-edition-version">{v.version}</small></div>
      <div className="qac-edition-meta"><span><Layers3 size={14}/>{count} Units</span><span><Users size={14}/>{learnersOf(v).length} Enrolled</span><span><ClipboardCheck size={14}/>{activeCount(v)} Active enrolments</span></div>
      <div className="qac-progress-label"><span>{v.publishedAt?'Setup complete':'Unit brief approval'}</span><b>{v.publishedAt?100:pct(approved,count)}%</b></div>
      <progress className={v.publishedAt?'released':''} max={100} value={v.publishedAt?100:pct(approved,count)}/>
      {v.publishedAt&&!learnersOf(v).length&&<small className="qac-zero">Ready for enrolment · No learners yet</small>}
     </button>;
    })}{!shown.length&&<div className="qac-empty">No qualification editions match this filter.</div>}</div>
   </section>
   {version&&<Workflow version={version} staff={staff} onTab={onTab}/>}
  </div>
 </>;
}
export function AdminQualificationDetail({version,references,staff,tab,onTab,onPreview,onEnrol,saving}){
 if(!version)return null;
 const r=qualificationReadiness(version,staff),source=details(version,references),item=qualificationFor(version.title);
 const approved=approvedCount(version),total=unitsOf(version).length,documents=materialsOf(version);
 const progress=version.publishedAt?100:pct(approved,total);
 return <section className="qac-detail">
  <header className="qac-detail-head"><Mark version={version}/><div><h2>{item?.short||version.title} <State version={version}/></h2><p>{version.title} · {version.version}</p></div>
   <button type="button" className="qc-outline" disabled={saving} onClick={onPreview}><Eye size={16}/> Preview</button><button type="button" className="qc-outline" onClick={()=>onTab(version.publishedAt?'materials':'units')}><Settings size={16}/> Manage qualification</button></header>
  <nav className="qac-detail-tabs" aria-label="Selected qualification setup">{setupTabs.map(([id,label,Icon])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>onTab(id)}><Icon size={16}/>{label}{id==='units'?' ('+total+')':id==='materials'?' ('+documents.length+')':id==='plans'?' ('+approved+')':''}</button>)}</nav>
  {tab==='summary'&&<div className="qac-summary-grid">
   <section className="qac-summary-panel"><h3>Qualification Summary</h3><dl>{[['Awarding Body',item?.body||'Not recorded'],['Qualification Number',source?.reference_number||'Not recorded'],['Specification',version.version],['Total Units',total],['Learning Outcomes',unitsOf(version).reduce((n,u)=>n+Number(u.outcomes||0),0)],['Assessment Criteria',unitsOf(version).reduce((n,u)=>n+Number(u.criteria||0),0)],['Status',version.publishedAt?'Live':'Draft']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
   <section className="qac-summary-panel"><h3>{version.publishedAt?'Setup Completion':'Unit Brief Approval'}</h3><div className="qac-completion"><div className={'qac-ring '+(version.publishedAt?'released':'')} style={{'--qac-progress':progress+'%'}}><strong>{progress}%</strong></div><ul>{[['Qualification details',!!version.catalogKey],['Units & structure',total>0&&!r.incompleteRubric.length],['Approved Unit briefs ('+approved+'/'+total+')',total>0&&approved===total],['Published & ready for enrolment',r.published]].map(([label,done])=><li key={label} className={done?'done':''}><CheckCircle2 size={16}/>{label}</li>)}</ul></div></section>
   <aside className="qac-ready-panel"><div className={r.published?'qac-ready':'qac-pending'}><CheckCircle2 size={25}/><div><strong>{r.published?'Ready for Enrolment':'Qualification draft'}</strong><p>{r.published?'This qualification is live. '+(!r.enrolments?'No learners enrolled yet.':'Manage learner enrolments when needed.'):r.next}</p></div></div>
    <button className="qc-primary" type="button" onClick={r.published?onEnrol:()=>onTab(r.pendingUnits.length?'plans':'release')}><Users size={17}/>{r.published?'Enrol Learners':'Continue Setup'}<ArrowRight size={16}/></button>
   </aside>
  </div>}
 </section>;
}
