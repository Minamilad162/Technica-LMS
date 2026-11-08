import React,{useEffect,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,BookOpen,CheckCircle2,ClipboardCheck,FileQuestion,GraduationCap,Layers,LockKeyhole,RefreshCw,ShieldCheck,Users} from 'lucide-react';
import {verifiedLiveAdmin,liveCourses} from './liveAuthoringApi.js';
import {checkReleaseReadiness,summarizeReleaseReadiness} from './releaseReadiness.js';
import StagingQaEvidencePanel from './StagingQaEvidencePanel.jsx';
import {AdminDashboardPanel,AdminCoursesPanel,AdminQuestionsPanel,AdminMockPanel,AdminUsersPanel} from './AdminToolsPanels.jsx';
import './supabaseApp.css';
import './adminTools.css';
import AdminCourseBank from './AdminCourseBank.jsx';
const QualificationsWorkspace=React.lazy(()=>import('../qualification/QualificationsWorkspace.jsx'));
const AdminSubscriptionsPanel=React.lazy(()=>import('./AdminSubscriptionsPanel.jsx'));

export const ADMIN_TOOLS_TABS=[
 {id:'overview',label:'Dashboard',icon:Activity},
 {id:'courses',label:'Courses',icon:BookOpen},
 {id:'qualifications',label:'Qualifications',icon:GraduationCap},
 {id:'questions',label:'Question Bank',icon:FileQuestion},
 {id:'exams',label:'Exams & Mock',icon:ClipboardCheck},
 {id:'users',label:'Users',icon:Users},
 {id:'subscriptions',label:'Subscriptions',icon:GraduationCap},
 {id:'system',label:'System Tools',icon:ShieldCheck}
];
const ids=new Set(ADMIN_TOOLS_TABS.map(x=>x.id));
export function AdminSystemPanel({db}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError('');
  checkReleaseReadiness(db).then(r=>{if(live)setRows(r);}).catch(()=>{if(live)setError('Read-only system checks unavailable.');})
   .finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
 },[db,revision]);
 const stats=summarizeReleaseReadiness(rows);
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">SECURITY &amp; RELEASE</span><h2>System Tools</h2>
   <p>Verified Supabase checks, staging evidence and outstanding launch gates.</p></div>
   <button className="at-outline" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={15}/> Recheck</button></div>
  <div className="at-disclaimer"><LockKeyhole size={17}/> Production decision: <b>NO-GO</b>. Passing code checks do not replace content reviews, device QA, financial reconciliation or explicit release approval.</div>
  {loading?<div className="at-empty">Checking runtime capabilities…</div>:
   error?<div className="at-error">{error}</div>:
   <div className="at-surface"><div className="at-system-stats">
    <span><b>{stats.passed}</b> passed</span><span><b>{stats.blocked}</b> blocked</span><span><b>{stats.pending}</b> pending</span></div>
    <div className="at-system-checks">{rows.map(x=><div key={x.id} className="at-system-check">
     {x.status==='pass'?<CheckCircle2 size={16} color="#12957b"/>:
       x.status==='pending'?<Layers size={16} color="#bd9241"/>:<AlertTriangle size={16} color="#bd5b4c"/>}
     <div><b>{x.title}</b><span>{x.detail}</span></div>
     <em className={'at-system-state '+x.status}>{x.status}</em>
    </div>)}</div>
   </div>}
  {rows.some(x=>x.id==='admin'&&x.status==='pass')&&<StagingQaEvidencePanel/>}
 </div>;
}
export default function AdminToolsWorkspace({db,initialTab='overview',onExit,onTabChange}){
 const [tab,setTab]=useState(ids.has(initialTab)?initialTab:'overview');
 const [state,setState]=useState('checking'),[error,setError]=useState('');
 const [courses,setCourses]=useState([]),[revision,setRevision]=useState(0);
 const [coursesLoading,setCoursesLoading]=useState(true),[coursesError,setCoursesError]=useState('');
 const [catalogRevision,setCatalogRevision]=useState(0);
 useEffect(()=>{setTab(ids.has(initialTab)?initialTab:'overview');},[initialTab]);
 useEffect(()=>{let live=true;setState('checking');setError('');
  verifiedLiveAdmin(db).then(()=>{if(live)setState('ready');})
   .catch(e=>{if(live){setState('blocked');setError(e?.message||'Active LMS Admin required.');}});
  return()=>{live=false;};
 },[db,revision]);
 useEffect(()=>{
  if(state!=='ready')return;
  let live=true;setCoursesLoading(true);setCoursesError('');
  liveCourses(db).then(c=>{
   if(!live)return;
   if(!Array.isArray(c))throw Error('Unexpected Supabase Course catalog response.');
   setCourses(c);
  }).catch(e=>{
   if(live)setCoursesError(e?.message||'Course catalog unavailable from Supabase.');
  }).finally(()=>{if(live)setCoursesLoading(false);});
  return()=>{live=false;};
 },[db,state,catalogRevision]);
 const change=id=>{if(!ids.has(id))return;setTab(id);onTabChange?.(id);};
 const asp=courses.find(c=>c.slug==='asp');
 if(state!=='ready')return <section className="at-access-state"><LockKeyhole size={34}/>
  <h2>{state==='checking'?'Verifying your Admin account…':'Admin Tools access restricted'}</h2>
  <p>{state==='blocked'?error:'Checking your live Supabase JWT, active LMS profile and assigned Admin role.'}</p>
  {state==='blocked'&&<button className="at-primary" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/> Retry verification</button>}
 </section>;
 return <div className="admin-tools-workspace">
  <header className="at-hero">
   <div className="at-hero-content">
    <div className="at-eyebrow"><ShieldCheck size={15}/> VERIFIED ADMIN WORKSPACE</div>
    <h1>Admin <span>Tools</span></h1>
    <p>One place to manage learning, questions, exams, people and the system. Every action is permission-checked by Supabase.</p>
    <div className="at-hero-pills"><span>Live database</span><span>Protected question bank</span><span>Release controls</span></div>
   </div>
   <div className="at-hero-art" aria-hidden="true"><div className="at-orbit at-orbit-one"/><div className="at-orbit at-orbit-two"/><GraduationCap size={45}/></div>
   {onExit&&<button type="button" className="at-back" onClick={onExit}><ArrowLeft size={16}/> Back to courses</button>}
  </header>
  <nav className="at-tabs" role="tablist" aria-label="Admin Tools sections">
   {ADMIN_TOOLS_TABS.map(x=><button key={x.id} type="button" role="tab" id={'at-tab-'+x.id}
    aria-controls={'at-panel-'+x.id} aria-selected={tab===x.id}
    className={'at-tab '+(tab===x.id?'active':'')} onClick={()=>change(x.id)}>
    <x.icon size={17}/><span>{x.label}</span></button>)}
  </nav>
  <section id={'at-panel-'+tab} role="tabpanel" aria-labelledby={'at-tab-'+tab} className="at-panel">
   {tab==='overview'&&<AdminDashboardPanel db={db} onNavigate={change}/>}
   {tab==='courses'&&<AdminCoursesPanel db={db}/>}
   {tab==='qualifications'&&<React.Suspense fallback={<div className="at-empty">Loading qualifications…</div>}><QualificationsWorkspace admin/></React.Suspense>}
   {tab==='questions'&&<AdminCourseBank db={db} courses={courses} asp={asp} mode="bank"
     coursesLoading={coursesLoading} coursesError={coursesError}
     onRefreshCourses={()=>setCatalogRevision(v=>v+1)} onGoToCourses={()=>change('courses')}/>}
   {tab==='exams'&&<AdminCourseBank db={db} courses={courses} asp={asp} mode="mock"
     coursesLoading={coursesLoading} coursesError={coursesError}
     onRefreshCourses={()=>setCatalogRevision(v=>v+1)} onGoToCourses={()=>change('courses')}/>} 
   {tab==='users'&&<AdminUsersPanel db={db}/>}
   {tab==='subscriptions'&&<React.Suspense fallback={<div className="at-empty">Loading subscription management…</div>}><AdminSubscriptionsPanel db={db}/></React.Suspense>}
   {tab==='system'&&<AdminSystemPanel db={db}/>}
  </section>
  <footer className="at-footer">Technica Consult LMS · Admin Tools · Actual Supabase records only · No demo data or fabricated payment amounts</footer>
 </div>;
}
