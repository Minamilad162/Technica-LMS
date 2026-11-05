import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,ClipboardCheck,FileQuestion,GraduationCap,Layers,LockKeyhole,Plus,RefreshCw,Search,ShieldCheck,Target,Users,Wallet} from 'lucide-react';
import {liveCourses,liveCourseTree,addDraftCourse,addAuthoringNode,updateAuthoringTitle,addReadingParagraph} from './liveAuthoringApi.js';
import {fetchAspReviewDomains} from './questionReviewApi.js';
import {getAdminOverview,getAdminUsers,getAdminUserDetail,getAdminMockCandidates,getMockBankSummary,preflightAdminMock,reserveAdminMock} from './adminToolsApi.js';
import {getMockReadiness} from './mockApi.js';
import AdminQuestionReview from './AdminQuestionReview.jsx';

const pct=n=>n===null||n===undefined?'—':Number(n).toFixed(1).replace(/\.0$/,'')+'%';
const day=s=>s?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not set';
const num=v=>typeof v==='number'?v.toLocaleString():'—';
const err=e=>e?.message||'Authenticated request failed.';
const empty=<div className="at-empty">No verified records yet. The dashboard never uses Demo statistics.</div>;
export function TrendChart({trend=[],kind='registrations'}){
 const max=Math.max(1,...trend.map(x=>x[kind]||0));
 const w=620,h=172,p=24;
 const pts=trend.map((x,i)=>[p+(i*(w-2*p)/Math.max(1,trend.length-1)),
  h-p-(x[kind]||0)/max*(h-2*p)]);
 const line=pts.map(v=>v.join(',')).join(' ');
 const fill=pts.length>1?'M '+pts[0].join(' ')+' L '+pts.slice(1).map(v=>v.join(' ')).join(' L ')+
  ' L '+pts.at(-1)[0]+' '+(h-p)+' L '+pts[0][0]+' '+(h-p)+' Z':'';
 return <div className="at-chart" aria-label={kind+' monthly actuals'}>
  <svg viewBox={'0 0 '+w+' '+h} role="img">
   <defs><linearGradient id={'at-grad-'+kind} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1d9d9a" stopOpacity=".20"/><stop offset="1" stopColor="#1d9d9a" stopOpacity=".01"/></linearGradient></defs>
   {[0,.25,.5,.75,1].map(a=><g key={a}><line x1={p} x2={w-p} y1={h-p-(h-2*p)*a} y2={h-p-(h-2*p)*a} stroke="#e8eff0"/>
   <text x={p-6} y={h-p-(h-2*p)*a+3} textAnchor="end" fontSize="10" fill="#789098">{Math.round(max*a)}</text></g>)}
   {fill&&<path d={fill} fill={'url(#at-grad-'+kind+')'}/>}
   <polyline points={line} fill="none" stroke="#0f8f87" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
   {pts.map(([x,y],i)=><circle cx={x} cy={y} r="4" key={i} fill="#0c8b83" stroke="#fff" strokeWidth="1.8">
    <title>{trend[i].month+': '+trend[i][kind]}</title></circle>)}
  </svg>
  <div className="at-chart-labels">{trend.map(t=><span key={t.month}>{t.month.slice(5)}</span>)}</div>
 </div>;
}
export function AdminDashboardPanel({db,onNavigate}){
 const [report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0),[metric,setMetric]=useState('registrations');
 useEffect(()=>{let live=true;setLoading(true);setError('');
  getAdminOverview(db).then(x=>{if(live)setReport(x);}).catch(e=>{if(live)setError(err(e));})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,refresh]);
 if(loading)return <div className="at-empty">Loading real Supabase KPIs…</div>;
 if(error)return <div className="at-alert"><AlertTriangle size={18}/><div><b>Dynamic analytics unavailable</b><p>{error} These figures need P13 installed on an approved environment.</p></div></div>;
 if(!report)return empty;
 const stats=[
  ['Registered accounts',report.kpis.users,Users],
  ['Active accounts',report.kpis.activeAccounts,ShieldCheck],
  ['Learners engaged · 30 days',report.kpis.engaged30Days,Activity],
  ['Active enrollments',report.kpis.activeEnrollments,GraduationCap],
  ['Courses / published',report.kpis.courses+' / '+report.kpis.publishedCourses,BookOpen],
  ['Approved Practice questions',report.kpis.practiceApproved,CheckCircle2],
  ['Exclusive Mock questions',report.kpis.mockReserved,LockKeyhole],
  ['Practice / Mock completed',report.kpis.practiceCompleted+' / '+report.kpis.mockCompleted,ClipboardCheck]
 ];
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">SYSTEM PERFORMANCE</span><h2>Real-time overview</h2><p>Counts and trends generated from your authenticated Supabase records.</p></div><button className="at-outline" onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15}/> Refresh</button></div>
  <div className="at-kpis">{stats.map(([label,value,Icon])=><article className="at-kpi" key={label}>
   <span className="at-kpi-icon"><Icon size={18}/></span><small>{label}</small><strong>{num(value)}</strong></article>)}</div>
  <div className="at-grid-two">
   <section className="at-surface"><div className="at-section-title"><div><h3>Growth & activity</h3><p>Six-month trend · actual records</p></div>
    <select aria-label="Select trend metric" value={metric} onChange={e=>setMetric(e.target.value)}>
     <option value="registrations">New accounts</option><option value="practice">Practice completions</option><option value="mock">Mock completions</option>
    </select></div>
    <TrendChart trend={report.trend} kind={metric}/></section>
   <section className="at-surface"><div className="at-section-title"><div><h3>Course performance</h3><p>Enrollment by real course</p></div><button className="at-text-button" onClick={()=>onNavigate('courses')}>Manage <ArrowRight size={14}/></button></div>
    <div className="at-course-bars">{report.courses.map(c=><div className="at-course-bar" key={c.id}>
      <div><b>{c.title}</b><span>{c.enrollments} enrolled · {c.questions} questions</span></div>
      <div className="at-track"><span style={{width:(c.enrollments/(Math.max(1,...report.courses.map(x=>x.enrollments))))*100+'%'}}/></div>
     </div>)}{!report.courses.length&&empty}</div>
   </section>
  </div>
  <div className="at-disclaimer"><Wallet size={17}/> Verified revenue: <b>Not tracked</b>. Paid entitlement is not proof of money received; no billing ledger exists in P1.</div>
  <div className="at-footnote">Updated {day(report.generatedAt)} · Read-only reporting · Live Supabase Admin JWT required</div>
 </div>;
}
const formDefaults={kind:'',parentId:'',title:'',summary:'',position:0};
export function AdminCoursesPanel({db}){
 const [courses,setCourses]=useState([]),[course,setCourse]=useState(''),[tree,setTree]=useState([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[open,setOpen]=useState({});
 useEffect(()=>{let live=true;setLoading(true);setError('');
  liveCourses(db).then(list=>{if(live){setCourses(list);setCourse(current=>list.some(x=>x.id===current)?current:list[0]?.id||'');}})
   .catch(e=>{if(live)setError(err(e));}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,revision]);
 useEffect(()=>{if(!course){setTree([]);return;}let live=true;
  liveCourseTree(db,course).then(list=>{if(live)setTree(list);})
  .catch(e=>{if(live)setError(err(e));});return()=>{live=false;};
 },[db,course,revision]);
 const chosen=courses.find(x=>x.id===course);
 const start=(kind,parentId='',initial='')=>{setEditing({kind,parentId,title:initial,summary:'',position:0});setError('');setNotice('');};
 async function submit(e){
  e.preventDefault();if(busy||!editing?.title.trim())return;
  setBusy(true);setError('');setNotice('');
  try{
   const f=editing;
   if(f.kind==='course')await addDraftCourse(db,f.title,f.summary,courses);
   else if(f.kind==='rename')await updateAuthoringTitle(db,f.parentId.split(':')[0],f.parentId.split(':')[1],f.title);
   else if(f.kind==='reading')await addReadingParagraph(db,f.parentId,f.title,f.position||0);
   else{
    const kind=f.kind;
    let editor={kind,title:f.title};
    if(kind==='domain')editor.courseId=course;
    if(kind==='topic')editor.domainId=f.parentId;
    if(kind==='lesson')editor.topicId=f.parentId;
    const peers=kind==='domain'?tree:kind==='topic'?tree.flatMap(d=>d.topics||[]).filter(t=>t.domain_id===f.parentId):
      tree.flatMap(d=>d.topics||[]).find(t=>t.id===f.parentId)?.lessons||[];
    await addAuthoringNode(db,editor,peers);
   }
   setNotice('Saved securely in Supabase. Course changes remain Draft unless separately published.');
   setEditing(null);setRevision(n=>n+1);
  }catch(x){setError(err(x));}finally{setBusy(false);}
 }
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">COURSE MANAGEMENT</span><h2>Course Builder</h2><p>Course → Domain → Topic → Lesson · Authorized changes only</p></div>
   <button className="at-primary" onClick={()=>start('course')}><Plus size={16}/> New course</button></div>
  {notice&&<p className="at-success" role="status">{notice}</p>}
  {error&&<p className="at-error" role="alert">{error}</p>}
  <div className="at-course-layout">
   <div className="at-surface at-course-picker"><h3>Courses <span>{courses.length}</span></h3>
    {loading?<p>Loading…</p>:courses.map(c=><button key={c.id} className={'at-course-choice '+(course===c.id?'active':'')}
     onClick={()=>setCourse(c.id)}><BookOpen size={18}/><span><b>{c.title}</b><small>{c.publication_state}</small></span><ChevronRight size={15}/></button>)}
    {!courses.length&&empty}
   </div>
   <section className="at-surface at-hierarchy">
    {!chosen?empty:<><div className="at-section-title"><div><span className="at-eyebrow">{chosen.publication_state}</span><h3>{chosen.title}</h3><p>{chosen.summary||'No summary yet.'}</p></div>
     <button className="at-outline" onClick={()=>start('domain')}><Plus size={15}/> Domain</button></div>
     {tree.map(d=><div className="at-tree" key={d.id}><div className="at-tree-item">
       <button aria-expanded={open[d.id]!==false} onClick={()=>setOpen(v=>({...v,[d.id]:v[d.id]===false?true:false}))}><Layers size={17}/><b>{d.title}</b><ChevronDown size={15}/></button>
       <button className="at-icon" title="Rename domain" aria-label={'Rename '+d.title} onClick={()=>start('rename','lms_domains:'+d.id,d.title)}>Edit</button>
       <button className="at-outline tiny" onClick={()=>start('topic',d.id)}><Plus size={14}/> Topic</button></div>
       {open[d.id]!==false&&(d.topics||[]).map(t=><div className="at-topic" key={t.id}><div className="at-tree-item">
        <button onClick={()=>setOpen(v=>({...v,[t.id]:v[t.id]===false?true:false}))}><ChevronRight size={15}/><b>{t.title}</b></button>
        <button className="at-icon" onClick={()=>start('rename','lms_topics:'+t.id,t.title)}>Edit</button>
        <button className="at-outline tiny" onClick={()=>start('lesson',t.id)}><Plus size={14}/> Lesson</button></div>
        {open[t.id]!==false&&(t.lessons||[]).map(l=><div className="at-lesson" key={l.id}><span><BookOpen size={14}/>{l.title}</span><span className="at-lesson-actions"><button onClick={()=>start('rename','lms_lessons:'+l.id,l.title)}>Rename</button><button onClick={()=>start('reading',l.id)}>+ Text</button></span></div>)}
       </div>)}
      </div>)}
     {!tree.length&&<p className="at-empty">Start with a Domain, then Topics and Lessons.</p>}
    </>}
   </section>
  </div>
  {editing&&<div className="at-modal-shade" onClick={()=>!busy&&setEditing(null)}>
   <form className="at-modal" onClick={e=>e.stopPropagation()} onSubmit={submit} role="dialog" aria-modal="true" aria-label="Edit course structure">
    <h3>{editing.kind==='rename'?'Rename':editing.kind==='reading'?'New reading paragraph':'Add '+editing.kind}</h3>
    <label>{editing.kind==='reading'?'Lesson text':'Title'}{editing.kind==='reading'?
     <textarea required maxLength={20000} rows={5} value={editing.title} onChange={e=>setEditing(v=>({...v,title:e.target.value}))}/>:
     <input autoFocus required maxLength={180} value={editing.title} onChange={e=>setEditing(v=>({...v,title:e.target.value}))}/>}</label>
    {editing.kind==='course'&&<label>Summary<textarea rows={3} maxLength={2000} value={editing.summary} onChange={e=>setEditing(v=>({...v,summary:e.target.value}))}/></label>}
    <p>Changes use real Admin permissions. Nothing is auto-published.</p>
    {error&&<p role="alert" className="at-error">{error}</p>}
    <div><button type="button" className="at-outline" disabled={busy} onClick={()=>setEditing(null)}>Cancel</button><button className="at-primary" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button></div>
   </form></div>}
 </div>;
}
export function AdminQuestionsPanel({db,asp,onUpdate}){
 const [domains,setDomains]=useState([]),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{if(!asp?.id){setDomains([]);return;}let active=true;
  fetchAspReviewDomains(db,asp.id).then(x=>{if(active)setDomains(x);})
   .catch(e=>{if(active)setError(err(e));});
  return()=>{active=false;};
 },[db,asp?.id,reload]);
 if(!asp)return <div className="at-empty">Create the actual ASP course before classifying questions.</div>;
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">PROTECTED QUESTION BANK</span><h2>Question Review &amp; Classification</h2><p>Rights, answers, official ASP11 Domain and difficulty · P6A workflow</p></div></div>
  {error&&<p className="at-error">{error}</p>}
  <AdminQuestionReview db={db} course={asp} domains={domains} onDomainsSeeded={async()=>{setReload(n=>n+1);onUpdate?.();}}/>
 </div>;
}
export function AdminMockPanel({db,asp}){
 const [pool,setPool]=useState({total:0,items:[]}),[offset,setOffset]=useState(0);
 const [selected,setSelected]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [inventory,setInventory]=useState(null),[readiness,setReadiness]=useState(null),[preview,setPreview]=useState(null);
 const [phrase,setPhrase]=useState(''),[processing,setProcessing]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{if(!asp?.id)return;let live=true;setLoading(true);setError('');
  Promise.allSettled([getAdminMockCandidates(db,asp.id,{offset,limit:25}),getMockBankSummary(db,asp.id),getMockReadiness(db,asp.id)])
   .then(rs=>{if(!live)return;const [p,b,m]=rs;
    if(p.status==='fulfilled')setPool(p.value);else setError(err(p.reason));
    if(b.status==='fulfilled')setInventory(b.value);
    if(m.status==='fulfilled')setReadiness(m.value);else setReadiness(null);
   }).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,asp?.id,offset,revision]);
 const toggle=id=>{setPreview(null);setPhrase('');setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<200?[...old,id]:old);};
 async function check(){
  if(!asp||selected.length!==200)return;
  setError('');setNotice('');setProcessing(true);
  try{const r=await preflightAdminMock(db,asp.id,selected);setPreview(r);
   if(!r.ready)setError('Server rejected this selection. Check review, rights, answer, previous use and exclusive flags.');}
  catch(e){setError(err(e));}finally{setProcessing(false);}
 }
 async function reserve(){
  if(!preview?.ready||phrase!=='RESERVE 200 ASP MOCK QUESTIONS'||processing)return;
  if(!window.confirm('Permanently reserve these EXACT 200 selected reviewed questions for the exclusive ASP Mock Form v1? They cannot enter Practice. This action is audited and cannot be undone from Admin Tools.'))return;
  setProcessing(true);setError('');
  try{
   await reserveAdminMock(db,asp.id,selected,phrase);
   setNotice('Exactly 200 reviewed questions reserved by protected P9B transaction. They are excluded from Practice.');
   setSelected([]);setPreview(null);setPhrase('');setOffset(0);setRevision(n=>n+1);
  }catch(e){setError(err(e));}finally{setProcessing(false);}
 }
 if(!asp)return <div className="at-empty">The real ASP course must exist before managing the Mock.</div>;
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">EXAM MANAGEMENT</span><h2>Mock Exam · Exclusive Bank</h2><p>Select 200 reviewed Draft questions, verify them, then reserve Form v1 atomically.</p></div></div>
  <div className="at-mock-metrics"><div><b>{num(inventory?.approved)}</b><span>Practice approved</span></div>
   <div><b>{num(inventory?.readyToReview)}</b><span>Reviewed Draft</span></div>
   <div><b>{num(inventory?.mockReserved)}</b><span>Mock-exclusive</span></div>
   <div><b>{readiness?.ready?'Ready':'Not ready'}</b><span>Server Mock gate</span></div></div>
  <div className="at-disclaimer"><ShieldCheck size={17}/> Exam form: exactly 200 selected UUIDs. A protected server transaction excludes reserved questions from Practice; no bulk auto-picker or client-side bypass.</div>
  <div className="at-surface"><div className="at-section-title"><div><h3>Reviewed candidates</h3><p>Only human-verified Ready Draft items are presented · {pool.total} in current queue</p></div>
   <span className="at-selection-count">{selected.length} / 200 selected</span></div>
   {loading?<p className="at-empty">Loading protected ASP candidate list…</p>:
    <div className="at-candidate-list">{pool.items.map(q=><label className="at-candidate" key={q.id}>
     <input type="checkbox" checked={selected.includes(q.id)} disabled={processing||(!selected.includes(q.id)&&selected.length===200)}
       onChange={()=>toggle(q.id)}/><span><b>{q.sourceId}</b><span>{q.prompt}</span></span>
     <em>{q.difficulty}</em></label>)}
     {!pool.items.length&&empty}</div>}
   <div className="at-paging"><button className="at-outline" disabled={offset===0||loading} onClick={()=>setOffset(n=>Math.max(0,n-25))}>Previous</button>
    <span>Page {Math.floor(offset/25)+1} of {Math.max(1,Math.ceil(pool.total/25))}</span>
    <button className="at-outline" disabled={loading||offset+25>=pool.total} onClick={()=>setOffset(n=>n+25)}>Next</button></div>
  </div>
  <div className="at-surface at-mock-actions"><div><b>Step 1 · Validate the 200 selected questions</b><p>Preflight is read-only and double-checks official domains, rights, answer, Draft and prior usage.</p></div>
   <button className="at-primary" disabled={processing||selected.length!==200} onClick={check}>Run secure preflight <ArrowRight size={15}/></button>
   {preview&&<p role="status" className={preview.ready?'at-success':'at-error'}>Verified eligible {preview.verifiedEligible} / 200 · {preview.ready?'Selection valid':'Selection blocked'}</p>}
   {preview?.ready&&<div className="at-reserve-confirm"><b>Step 2 · Explicit irreversible reservation</b>
    <label>Type <code>RESERVE 200 ASP MOCK QUESTIONS</code>
     <input autoComplete="off" value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="Type confirmation phrase exactly"/></label>
    <button type="button" className="at-danger" disabled={processing||phrase!=='RESERVE 200 ASP MOCK QUESTIONS'} onClick={reserve}>
     <LockKeyhole size={16}/> Reserve &amp; exclude from Practice</button>
   </div>}
   {error&&<p role="alert" className="at-error">{error}</p>}
   {notice&&<p role="status" className="at-success">{notice}</p>}
  </div>
 </div>;
}
export function AdminUsersPanel({db}){
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 const [data,setData]=useState(null),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[detailError,setDetailError]=useState('');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  getAdminUsers(db,{search:query,limit:15,offset:page*15}).then(x=>{if(active)setData(x);})
   .catch(e=>{if(active)setError(err(e));}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,query,page,refresh]);
 useEffect(()=>{if(!selected)return;let active=true;setDetail(null);setDetailError('');
  getAdminUserDetail(db,selected.id).then(x=>{if(active)setDetail(x);})
   .catch(e=>{if(active)setDetailError(err(e));});
  return()=>{active=false;};
 },[db,selected?.id,refresh]);
 return <div className="at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">LEARNERS &amp; SUBSCRIPTIONS</span><h2>User Directory</h2>
   <p>Real account status, enrolled plans, completion and assessments · no sample learners.</p></div>
   <button className="at-outline" onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15}/> Refresh</button></div>
  <form className="at-user-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search.trim());}}>
   <Search size={18}/><input value={search} maxLength={80} placeholder="Find learners by name" onChange={e=>setSearch(e.target.value)}/>
   <button className="at-primary">Search</button></form>
  {error&&<p role="alert" className="at-error">{error}</p>}
  <div className="at-user-layout">
   <div className="at-surface"><div className="at-user-list-head"><b>{num(data?.total)} registered profiles</b><span>Page {page+1}</span></div>
    {loading?<p className="at-empty">Loading protected learner directory…</p>:
     (data?.users||[]).map(u=><button type="button" className={'at-user-row '+(selected?.id===u.id?'active':'')}
       key={u.id} onClick={()=>setSelected(u)}><span className="at-user-avatar">{(u.name||'?').slice(0,1).toUpperCase()}</span>
       <span className="at-user-info"><b>{u.name||'Unnamed learner'}</b><small>{u.activePlans} active plan(s) · {u.lessonsCompleted} lessons</small></span>
       <span className={'at-user-state '+u.status}>{u.status}</span><ChevronRight size={15}/></button>)}
    {!loading&&!(data?.users||[]).length&&empty}
    <div className="at-paging"><button className="at-outline" disabled={page===0||loading} onClick={()=>setPage(n=>n-1)}>Previous</button>
     <span>{data?Math.min(data.total,(page+1)*15):'—'} / {num(data?.total)}</span>
     <button className="at-outline" disabled={loading||!data||data.total<=(page+1)*15} onClick={()=>setPage(n=>n+1)}>Next</button></div>
   </div>
   <section className="at-surface at-user-detail">
    {!selected?<div className="at-empty"><Users size={24}/> Select a learner to view their subscriptions, progress and exam results.</div>:
     detailError?<p className="at-error">{detailError}</p>:
     !detail?<p className="at-empty">Loading this user's authorized record…</p>:<>
      <div className="at-section-title"><div><span className="at-eyebrow">MEMBER PROFILE</span><h3>{detail.profile.name}</h3>
       <p>Joined {day(detail.profile.joinedAt)} · {detail.profile.status}</p></div></div>
      <h4>Plans &amp; enrollment</h4>
      {detail.entitlements.map((e,i)=><div className="at-plan" key={e.courseId+i}>
       <div><b>{e.courseTitle}</b><span>{e.type} · {e.status}</span></div>
       <dl><div><dt>Started</dt><dd>{day(e.startsAt)}</dd></div><div><dt>Ends</dt><dd>{e.endsAt?day(e.endsAt):'No recorded end'}</dd></div>
        <div><dt>Amount paid</dt><dd>Not recorded</dd></div></dl></div>)}
      {!detail.entitlements.length&&<p className="at-empty">No enrollment records found.</p>}
      <h4>Learning by course</h4>
      <div className="at-progress-cards">{detail.courseProgress.map(c=><div key={c.courseId}>
       <b>{c.courseTitle}</b><span>{c.lessonsCompleted} lessons · {c.practiceCompleted} Practice · {c.mockCompleted} Mock</span></div>)}
       {!detail.courseProgress.length&&<p>No enrolled course progress yet.</p>}</div>
      <div className="at-user-assessments"><div><Target size={17}/><b>{detail.practice.completed}</b><span>Practice · last {pct(detail.practice.lastScore)}</span></div>
       <div><ClipboardCheck size={17}/><b>{detail.mock.completed}</b><span>Mock · last {pct(detail.mock.lastScore)}</span></div></div>
      <p className="at-disclaimer"><Wallet size={15}/> No transaction ledger is installed, so amount paid, currency and payment status cannot be verified from entitlements alone.</p>
     </>}
   </section>
  </div>
 </div>;
}
