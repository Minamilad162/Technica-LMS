import React,{useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookOpenCheck,CheckCircle2,ChevronDown,ChevronRight,
 ClipboardCheck,GraduationCap,Layers3,LockKeyhole,LogOut,PlayCircle,RefreshCw,
 ShieldCheck,ShoppingBag,Target,X} from 'lucide-react';
import {getLearnerProgress} from './learnerProgressApi.js';
import {SecureLessonContent} from './SecureLessonMedia.jsx';
import LivePractice from './LivePractice.jsx';
import {fetchP15Catalog,fetchP15Outline,hasLocalDemoCheckout,
 isFullCourseEnrolled,localCheckoutEnabled,recordLocalDemoCheckout} from './learnerJourneyApi.js';
import {loadStructure} from './lmsApi.js';
import './liveLearnerJourney.css';

const nav=[
 {id:'courses',label:'Courses',icon:BookOpen,group:'Learning'},
 {id:'learning',label:'My Learning',icon:BookOpenCheck,group:'Learning'},
 {id:'practice',label:'Practice',icon:Target,group:'Exam Preparation'},
 {id:'history',label:'My Practice',icon:ClipboardCheck,group:'Exam Preparation'}
];
const formatDate=d=>d&&Number.isFinite(Date.parse(d))?new Date(d).toLocaleDateString('en-GB'):'—';
const modeLabel={quick10:'Quick 10',timed25:'Timed Quiz',custom:'Custom',domain:'Domain Practice',
 levelup:'Level Up',asp_mock_200:'ASP Mock'};
function DemoCheckout({course,onClose,onSuccess}){
 const [digits,setDigits]=useState(''),[error,setError]=useState('');
 const submit=e=>{
  e.preventDefault();setError('');
  try{onSuccess(digits);}catch(ex){setError(ex.message||'Local demo failed.');}
 };
 return <div className="lj-shade" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <form className="lj-checkout" role="dialog" aria-modal="true" aria-label="Local demo checkout" onSubmit={submit}>
   <div className="lj-checkout-head"><div><small>LOCAL QA DEMO · NO REAL PAYMENT</small><h2>Try the enrollment flow</h2></div>
    <button type="button" aria-label="Close" onClick={onClose}><X size={19}/></button></div>
   <p><strong>{course.title}</strong> · This is a browser-local UI simulation, not a purchase or a real Supabase enrollment.</p>
   <p className="lj-security">Use fake digits only. No payment processor is called. Your digits are discarded immediately and never stored or sent. Protected video/PDF, Practice and Mock remain server-locked until real enrollment.</p>
   <label>Fake test number<input autoFocus autoComplete="off" inputMode="numeric"
    type="text" maxLength={19} pattern="[0-9]{8,19}" placeholder="1234567890123456"
    required value={digits} onChange={e=>setDigits(e.target.value.replace(/[^0-9]/g,''))}/></label>
   {error&&<p className="lj-error" role="alert">{error}</p>}
   <div className="lj-checkout-actions"><button className="lj-quiet" type="button" onClick={onClose}>Cancel</button>
    <button className="lj-primary" type="submit">Simulate only <ArrowRight size={17}/></button></div>
  </form></div>;
}
export default function LiveLearnerWorkspace({db,user,onSignOut}){
 const [screen,setScreen]=useState('courses'),[catalog,setCatalog]=useState(null),
  [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),
  [selectedId,setSelectedId]=useState(''),[outline,setOutline]=useState([]),
  [outlineLoading,setOutlineLoading]=useState(false),[outlineError,setOutlineError]=useState(''),
  [activeLesson,setActiveLesson]=useState(null),[checkout,setCheckout]=useState(null),
  [demoRevision,setDemoRevision]=useState(0),[practiceId,setPracticeId]=useState(''),
  [practiceTree,setPracticeTree]=useState([]),[practiceError,setPracticeError]=useState(''),
  [report,setReport]=useState(null),[reportError,setReportError]=useState(''),[reportLoading,setReportLoading]=useState(false);
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  let live=true;setLoading(true);setError('');
  fetchP15Catalog(db,user).then(x=>{if(live){setCatalog(x);
    setSelectedId(old=>x.courses.some(c=>c.id===old)?old:'');
    setPracticeId(old=>x.courses.some(c=>c.id===old&&isFullCourseEnrolled(x.entitlements,c.id))?
     old:(x.courses.find(c=>isFullCourseEnrolled(x.entitlements,c.id))?.id||''));}})
   .catch(e=>{if(live){setCatalog(null);setError(e.message||'Course catalog unavailable.');}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,user.id,revision]);
 const enrolled=catalog?.courses.filter(c=>isFullCourseEnrolled(catalog.entitlements,c.id))||[];
 const inMyLearning=c=>isFullCourseEnrolled(catalog?.entitlements,c.id)||
  (localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,c.id));
 const chosen=catalog?.courses.find(c=>c.id===selectedId);
 const full=chosen&&isFullCourseEnrolled(catalog?.entitlements,chosen.id);
 const demoChosen=chosen&&localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,chosen.id)&&!full;
 const allowedLesson=lesson=>!!full||lesson.isFreeIntro;
 useEffect(()=>{
  if(!chosen){setOutline([]);setActiveLesson(null);setOutlineError('');return;}
  let live=true;setOutlineLoading(true);setOutline([]);setActiveLesson(null);setOutlineError('');
  fetchP15Outline(db,chosen.id).then(x=>{if(live)setOutline(x);})
   .catch(e=>{if(live)setOutlineError(e.message||'Course outline unavailable.');})
   .finally(()=>{if(live)setOutlineLoading(false);});
  return()=>{live=false;};
 },[db,chosen?.id,revision]);
 useEffect(()=>{
  if(screen!=='practice'||!practiceId||!catalog){setPracticeTree([]);return;}
  let live=true;setPracticeTree([]);setPracticeError('');
  loadStructure(db,practiceId).then(x=>{if(live)setPracticeTree(x);})
   .catch(()=>{if(live)setPracticeError('Verified Practice domains unavailable.');});
  return()=>{live=false;};
 },[screen,db,practiceId,revision]);
 useEffect(()=>{
  if(screen!=='history'||!enrolled[0]){setReport(null);setReportError('');return;}
  let live=true;setReportLoading(true);setReport(null);setReportError('');
  getLearnerProgress(db,enrolled[0].id).then(x=>{if(live)setReport(x);})
   .catch(()=>{if(live)setReportError('Verified Practice history requires the P11 backend. No demo scores are shown.');})
   .finally(()=>{if(live)setReportLoading(false);});
  return()=>{live=false;};
 },[screen,db,enrolled[0]?.id,revision]);
 const openCourse=id=>{setSelectedId(id);setActiveLesson(null);setScreen('course');};
 const go=page=>{setScreen(page);setActiveLesson(null);if(page!=='course')setSelectedId('');};
 const onDemoCheckout=digits=>{
  recordLocalDemoCheckout(user.id,checkout.id,digits);
  setDemoRevision(v=>v+1);setCheckout(null);go('learning');
 };
 const screenTitle=screen==='courses'?'Explore Courses':screen==='learning'?'My Learning':
  screen==='course'?(chosen?.title||'Course Outline'):
  screen==='practice'?'Practice Center':'My Practice';
 return <div className="lj-shell">
  <header className="lj-top"><div className="lj-logo"><img alt="Technica Consult" src="/images/technica-logo.webp"/>
   <b>TECHNICA CONSULT <span>LMS</span></b></div><div className="lj-account">
    <span><ShieldCheck size={14}/> Secure learning</span><small>{user.email}</small>
    <button type="button" onClick={onSignOut}><LogOut size={16}/> Sign out</button></div></header>
  <div className="lj-layout"><aside className="lj-nav" aria-label="Learner navigation">
   <small className="lj-nav-label">LEARNING</small>
   {nav.filter(x=>x.group==='Learning').map(({id,label,icon:Icon})=>
    <button key={id} type="button" aria-current={screen===id||screen==='course'&&id==='courses'?'page':undefined}
     className={(screen===id||screen==='course'&&id==='courses')?'active':''} onClick={()=>go(id)}>
     <Icon size={18}/><span>{label}</span></button>)}
   <small className="lj-nav-label">EXAM PREPARATION</small>
   {nav.filter(x=>x.group==='Exam Preparation').map(({id,label,icon:Icon})=>
    <button key={id} type="button" className={screen===id?'active':''}
     aria-current={screen===id?'page':undefined} onClick={()=>go(id)}>
     <Icon size={18}/><span>{label}</span></button>)}
   <div className="lj-nav-note"><ShieldCheck size={17}/> Course access and exam scores are verified by Supabase, not browser flags.</div>
  </aside>
  <main className="lj-main"><div className="lj-heading">
   <div><span className="lj-eyebrow">TECHNICA LEARNING PLATFORM</span>
    <h1>{screenTitle}</h1><p>{screen==='courses'?'Browse published courses. Preview the first lesson before enrolling.':
      screen==='learning'?'Your actual enrolled courses, organized in one place.':
      screen==='course'?'Course → Domain → Topic → Lesson. Locked lessons require enrollment.':
      screen==='practice'?'Train with protected questions and difficulty modes.':
      'Your own verified practice and Mock results.'}</p></div>
   <button type="button" className="lj-quiet" disabled={loading} onClick={refresh}><RefreshCw size={16}/> Refresh</button>
  </div>
  {error&&<p className="lj-error" role="alert">{error}</p>}
  {loading?<div className="lj-empty" role="status">Loading your published learning catalog…</div>:
   !catalog?<div className="lj-empty">Course catalog is unavailable. Check your LMS session.</div>:
   screen==='courses'||screen==='learning'?<section className="lj-grid" aria-label={screen==='courses'?'Published courses':'Enrolled courses'}>
    {(screen==='courses'?catalog.courses:catalog.courses.filter(inMyLearning)).map(c=>{
     const paid=isFullCourseEnrolled(catalog.entitlements,c.id),demo=localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,c.id)&&!paid;
     return <article className="lj-card" key={c.id}><div className="lj-card-symbol"><GraduationCap size={25}/></div>
      <div><span className="lj-kicker">{paid?'ENROLLED':demo?'LOCAL DEMO ONLY':'PUBLISHED COURSE'}</span>
       <h2>{c.title}</h2><p>{c.summary||'Explore the syllabus and start with an introductory lesson.'}</p></div>
      <div className="lj-card-foot"><span>{paid?<><CheckCircle2 size={15}/> Full access</>:
       demo?<><ShieldCheck size={15}/> UI preview only</>:<><LockKeyhole size={15}/> Free Intro available if enabled</>}</span>
       <button type="button" className="lj-primary" onClick={()=>openCourse(c.id)}>{paid?'Continue':'View course'} <ArrowRight size={16}/></button></div>
     </article>;
    })}
    {!(screen==='courses'?catalog.courses:catalog.courses.filter(inMyLearning)).length&&<div className="lj-empty">
     <BookOpen size={27}/><b>{screen==='courses'?'No published courses yet':'No enrollments yet'}</b>
     <p>{screen==='courses'?'Courses appear here after the Admin publishes them.':
      'Courses enter My Learning only after a real paid/manual entitlement (or a labeled local-only demo).'}
     </p>{screen==='learning'&&<button type="button" className="lj-primary" onClick={()=>go('courses')}>Explore courses <ArrowRight size={16}/></button>}</div>}
   </section>:
   screen==='course'? !chosen?<div className="lj-empty">Choose a published course from Courses.</div>:
   <div className="lj-course">
    <div className="lj-course-actions"><button className="lj-quiet" type="button" onClick={()=>go('courses')}><ArrowLeft size={16}/> All Courses</button>
     {full?<span className="lj-enrolled"><CheckCircle2 size={16}/> Full access</span>:
      <div className="lj-course-lock"><LockKeyhole size={17}/> Full course locked
       {localCheckoutEnabled()?<button type="button" className="lj-primary" onClick={()=>setCheckout(chosen)}>Try local checkout</button>:
        <span>Payment integration coming soon · Contact your Admin for enrollment</span>}</div>}
    </div>
    {demoChosen&&<p className="lj-demo-banner">Local demo confirmed · This preview does not unlock protected course media, exam questions or Supabase enrollment.</p>}
    {outlineLoading?<div className="lj-empty" role="status">Loading published course outline…</div>:
     outlineError?<div className="lj-empty" role="alert"><LockKeyhole size={20}/>{outlineError}</div>:
     !outline.length?<div className="lj-empty">No published lessons are available in this course yet.</div>:
     <div className="lj-domains">{outline.map((d,di)=><section className="lj-domain" key={d.id}>
      <h2><Layers3 size={18}/> Domain {di+1} · {d.title}</h2>
      {d.topics.map((t,ti)=><div className="lj-topic" key={t.id}>
       <h3>Topic {di+1}.{ti+1} · {t.title}</h3>
       {t.lessons.map((l,li)=>{
        const unlocked=allowedLesson(l),expanded=activeLesson===l.id;
        return <div key={l.id} className={'lj-lesson'+(unlocked?'':' locked')}>
         <button type="button" aria-expanded={expanded} onClick={()=>{if(unlocked)setActiveLesson(v=>v===l.id?'':l.id);else setActiveLesson(null);}}>
          {unlocked?<PlayCircle size={18}/>:<LockKeyhole size={18}/>}
          <span><strong>{di+1}.{ti+1}.{li+1} · {l.title}</strong>
           <small>{l.isFreeIntro?'FREE INTRO':unlocked?'AVAILABLE':'LOCKED · ENROLL TO VIEW'}</small></span>
          {unlocked?(expanded?<ChevronDown size={17}/>:<ChevronRight size={17}/>):null}</button>
         {expanded&&unlocked&&<div className="lj-lesson-content"><SecureLessonContent
          db={db} lessonId={l.id} viewerId={user.id.slice(0,8)}/>
          <small>Lesson completion is recorded by the verified P2 workflow, not simply by opening a video.</small>
         </div>}
        </div>;
       })}
      </div>)}
     </section>)}</div>}
   </div>:
   screen==='practice'?<div className="lj-practice">
    <div className="lj-section-head"><h2>Choose your course</h2><p>Quick 10, Timed Quiz, Build Your Own, Domain Practice and adaptive Level Up are available in the secure engine.</p></div>
    {!enrolled.length?<div className="lj-empty"><LockKeyhole size={24}/><b>Practice requires enrollment</b><p>Preview lessons do not unlock paid question banks.</p><button className="lj-primary" onClick={()=>go('courses')}>Explore Courses <ArrowRight size={16}/></button></div>:
     <><label className="lj-picker">Enrolled course<select value={practiceId} onChange={e=>setPracticeId(e.target.value)}>
      {enrolled.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      {practiceError&&<p className="lj-error">{practiceError}</p>}
      {enrolled.find(c=>c.id===practiceId)&&<LivePractice key={user.id+'-'+practiceId}
       db={db} user={user} course={enrolled.find(c=>c.id===practiceId)}
       domains={practiceTree} access={true} defaultMode="quick10"/>}
     </>}
   </div>:
   <div className="lj-history"><h2>My Practice History</h2>
    {!enrolled.length?<div className="lj-empty">Your practice history appears here after real enrollment and graded sessions.</div>:
     reportLoading?<div className="lj-empty" role="status">Loading your verified results…</div>:
     reportError?<div className="lj-empty" role="alert">{reportError}</div>:
     report?<><div className="lj-history-stats"><div><small>Completed practice sessions</small><strong>{report.practice.attempts}</strong></div>
      <div><small>Answer accuracy</small><strong>{report.practice.answerAccuracyPercent===null?'—':report.practice.answerAccuracyPercent+'%'}</strong></div>
      <div><small>Level Up sessions</small><strong>{report.practice.levelUpAttempts}</strong></div></div>
      <div className="lj-history-list">{report.recentAttempts.map((a,i)=><div key={i}>
       <b>{modeLabel[a.mode]||a.mode}</b><span>{formatDate(a.submittedAt)}</span>
       <strong>{a.correctCount} / {a.questionCount} · {a.scorePercent}%</strong></div>)}
       {!report.recentAttempts.length&&<p>No graded Practice or Mock attempts yet.</p>}</div>
      <p className="lj-muted">History is read from your own protected P11 report. No estimated scores or browser-local grade records.</p>
     </>:<div className="lj-empty">Choose an enrolled course to see verified history.</div>}
   </div>}
  </main></div>
  {checkout&&localCheckoutEnabled()&&<DemoCheckout course={checkout}
   onClose={()=>setCheckout(null)} onSuccess={onDemoCheckout}/>}
 </div>;
}
