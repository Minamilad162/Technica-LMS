import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookOpenCheck,CheckCircle2,ChevronDown,ChevronRight,
 ClipboardCheck,GraduationCap,Layers3,LockKeyhole,LogOut,PlayCircle,RefreshCw,
 ShieldCheck,ShoppingBag,Target,X} from 'lucide-react';
import {getLearnerProgress} from './learnerProgressApi.js';
import {SecureLessonContent} from './SecureLessonMedia.jsx';
import LivePractice from './LivePractice.jsx';
import {fetchP15Catalog,fetchP15Outline,hasLocalDemoCheckout,
 isFullCourseEnrolled,localCheckoutEnabled,recordLocalDemoCheckout} from './learnerJourneyApi.js';
import {loadStructure} from './lmsApi.js';
import {hasSimulatedEnrollment} from './checkoutSimulationApi.js';
import LiveCheckout from './LiveCheckout.jsx';
import {LearnerCourseCard,CourseDetailHero} from './LearnerCourseCard.jsx';
import PremiumMyLearning from './PremiumMyLearning.jsx';
import QualificationsWorkspace from '../qualification/QualificationsWorkspace.jsx';
import './liveLearnerJourney.css';

const nav=[
 {id:'courses',label:'Courses',icon:BookOpen,group:'Learning'},
 {id:'learning',label:'My Learning',icon:BookOpenCheck,group:'Learning'},
 {id:'qualifications',label:'Qualifications',icon:GraduationCap,group:'Learning'},
 {id:'practice',label:'Practice',icon:Target,group:'Exam Preparation'},
 {id:'history',label:'My Practice',icon:ClipboardCheck,group:'Exam Preparation'}
];
const formatDate=d=>d&&Number.isFinite(Date.parse(d))?new Date(d).toLocaleDateString('en-GB'):'—';
const modeLabel={quick10:'Quick 10',timed25:'Timed Quiz',custom:'Custom',domain:'Domain Practice',
 levelup:'Level Up',asp_mock_200:'ASP Mock'};
export default function LiveLearnerWorkspace({db,user,onSignOut,embedded=false,
 initialScreen='courses',initialCourseId='',onCheckoutRoute=null,onCourseRoute=null,onLearningRoute=null,
 onPracticeRoute=null,onHistoryRoute=null}){
 const syllabusRef=useRef(null);
 const [screen,setScreen]=useState(initialScreen),[catalog,setCatalog]=useState(null),
  [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),
  [selectedId,setSelectedId]=useState(initialCourseId),[outline,setOutline]=useState([]),
  [outlineLoading,setOutlineLoading]=useState(false),[outlineError,setOutlineError]=useState(''),
  [activeLesson,setActiveLesson]=useState(null),
  [demoRevision,setDemoRevision]=useState(0),[practiceId,setPracticeId]=useState(''),[historyId,setHistoryId]=useState(''),
  [practiceTree,setPracticeTree]=useState([]),[practiceError,setPracticeError]=useState(''),
  [report,setReport]=useState(null),[reportError,setReportError]=useState(''),[reportLoading,setReportLoading]=useState(false);
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  let live=true;setLoading(true);setError('');
  fetchP15Catalog(db,user).then(x=>{if(live){setCatalog(x);
    setSelectedId(old=>x.courses.some(c=>c.id===old)?old:'');
    setPracticeId(old=>x.courses.some(c=>c.id===old&&isFullCourseEnrolled(x.entitlements,c.id))?
     old:(x.courses.find(c=>isFullCourseEnrolled(x.entitlements,c.id))?.id||''));
    setHistoryId(old=>x.courses.some(c=>c.id===old&&isFullCourseEnrolled(x.entitlements,c.id))?
     old:(x.courses.find(c=>isFullCourseEnrolled(x.entitlements,c.id))?.id||''));}})
   .catch(e=>{if(live){setCatalog(null);setError(e.message||'Course catalog unavailable.');}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,user.id,revision]);
 const enrolled=catalog?.courses.filter(c=>isFullCourseEnrolled(catalog.entitlements,c.id))||[];
 const demoCourses=catalog?.courses.filter(c=>!isFullCourseEnrolled(catalog.entitlements,c.id)&&(
  hasSimulatedEnrollment(user.id,c.id)||(localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,c.id))))||[];
 const courseStatus=c=>isFullCourseEnrolled(catalog?.entitlements,c.id)?'real':
  demoCourses.some(d=>d.id===c.id)?'demo':'available';
 const chosen=catalog?.courses.find(c=>c.id===selectedId);
 const full=chosen&&isFullCourseEnrolled(catalog?.entitlements,chosen.id);
 const demoChosen=chosen&&!full&&(hasSimulatedEnrollment(user.id,chosen.id)||
  (localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,chosen.id)));
 const allowedLesson=lesson=>!!full||lesson.isFreeIntro||!!demoChosen;
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
  if(screen!=='history'||!enrolled.some(c=>c.id===historyId)){setReport(null);setReportError('');return;}
  let live=true;setReportLoading(true);setReport(null);setReportError('');
  getLearnerProgress(db,historyId).then(x=>{if(live)setReport(x);})
   .catch(()=>{if(live)setReportError('Verified Practice history requires the P11 backend. No demo scores are shown.');})
   .finally(()=>{if(live)setReportLoading(false);});
  return()=>{live=false;};
 },[screen,db,historyId,enrolled.length,revision]);
 const openCourse=id=>{
  if(embedded&&onCourseRoute){onCourseRoute(id);return;}
  setSelectedId(id);setActiveLesson(null);setScreen('course');
 };
 const startCheckout=id=>{
  if(!catalog?.courses.some(c=>c.id===id))return;
  if(embedded&&onCheckoutRoute){onCheckoutRoute(id);return;}
  setSelectedId(id);setActiveLesson(null);setScreen('checkout');
 };
 const openLearning=()=>{
  if(embedded&&onLearningRoute){onLearningRoute();return;}
  go('learning');
 };
 const go=page=>{setScreen(page);setActiveLesson(null);if(page!=='course'&&page!=='checkout')setSelectedId('');};
 const checkoutCompleted=()=>setDemoRevision(v=>v+1);
 const openPractice=()=>{
  if(embedded&&onPracticeRoute){onPracticeRoute();return;}go('practice');
 };
 const openHistory=()=>{
  if(embedded&&onHistoryRoute){onHistoryRoute();return;}go('history');
 };
 const screenTitle=screen==='courses'?'Explore Courses':screen==='learning'?'My Learning':
  screen==='qualifications'?'My Qualifications':
  screen==='checkout'?'Course Checkout':
  screen==='course'?'Course Overview':
  screen==='practice'?'Practice Center':'My Practice';
 return <div className={"lj-shell"+(embedded?" lj-embedded":"")+(screen==="qualifications"?" lj-qualification-mode":"")}>
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
  <main className="lj-main">{screen!=="qualifications"&&<div className="lj-heading">
   <div><span className="lj-eyebrow">TECHNICA LEARNING PLATFORM</span>
    <h1>{screenTitle}</h1><p>{screen==='courses'?'Browse published courses. Preview the first lesson before enrolling.':
      screen==='learning'?'Your active enrollments and demo checkout previews are clearly separated.':
      screen==='course'?'Course → Domain → Topic → Lesson. Locked lessons require enrollment.':
      screen==='checkout'?'Secure checkout journey · currently a clearly labeled demonstration, not a real payment.':
      screen==='practice'?'Train with protected questions and difficulty modes.':
      'Your own verified practice and Mock results.'}</p></div>
   <button type="button" className="lj-quiet" disabled={loading} onClick={refresh}><RefreshCw size={16}/> Refresh</button>
  </div>}
  {error&&<p className="lj-error" role="alert">{error}</p>}
  {screen==="qualifications"?<QualificationsWorkspace/>:loading?<div className="lj-empty" role="status">Loading your published learning catalog…</div>:
   !catalog?<div className="lj-empty">Course catalog is unavailable. Check your LMS session.</div>:
   screen==='courses'?<section className="lj-grid" aria-label="Published courses">
    {catalog.courses.map(c=><LearnerCourseCard key={c.id} course={c} db={db}
     status={courseStatus(c)} onOpen={()=>openCourse(c.id)} onEnroll={()=>startCheckout(c.id)}/>)}
    {!catalog.courses.length&&<div className="lj-empty"><BookOpen size={28}/>
     <b>No published courses yet</b><p>Once an Admin publishes a Course, it appears here automatically.</p></div>}
   </section>:
   screen==='learning'?<PremiumMyLearning db={db} user={user}
    activeCourses={enrolled} demoCourses={demoCourses} refreshKey={revision}
    onOpen={openCourse} onBrowse={()=>go('courses')}
    onPractice={openPractice} onHistory={openHistory}/>:
   screen==='checkout'? !chosen?<div className="lj-empty">Course unavailable. Please select a published course.</div>:
    <LiveCheckout key={chosen.id} course={chosen} user={user}
     onBack={()=>openCourse(chosen.id)} onSuccess={checkoutCompleted}
     onOpenCourse={()=>openCourse(chosen.id)} onMyLearning={openLearning}/>:
   screen==='course'? !chosen?<div className="lj-empty">Choose a published course from Courses.</div>:
   <div className="lj-course">
    <div className="lj-course-actions"><button className="lj-quiet" type="button" onClick={()=>go('courses')}>
     <ArrowLeft size={16}/> All Courses</button>
     {full?<span className="lj-enrolled"><CheckCircle2 size={16}/> Verified enrollment</span>:
      demoChosen?<span className="lcc-access-status lcc-status-demo"><ShieldCheck size={15}/> Demo Access · No Charge</span>:
      <span className="lcc-access-status lcc-status-available"><LockKeyhole size={15}/> Not enrolled</span>}
    </div>
    <CourseDetailHero db={db} course={chosen} status={full?'real':demoChosen?'demo':'available'}
     onEnroll={()=>startCheckout(chosen.id)}
     onContinue={()=>syllabusRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}/>
    <section className="lcc-syllabus" ref={syllabusRef}>
     <div className="lcc-syllabus-head"><h2>Course Syllabus</h2>
      {!outlineLoading&&!outlineError&&<span>{outline.reduce((n,d)=>n+d.topics.reduce((m,t)=>m+t.lessons.length,0),0)} published lessons</span>}</div>
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
         <button type="button" aria-expanded={expanded} aria-label={unlocked?'Open '+l.title:
          'Enroll in '+chosen.title+' to unlock '+l.title}
          onClick={()=>{if(unlocked)setActiveLesson(v=>v===l.id?'':l.id);else startCheckout(chosen.id);}}>
          {unlocked?<PlayCircle size={18}/>:<LockKeyhole size={18}/>}
          <span><strong>{di+1}.{ti+1}.{li+1} · {l.title}</strong>
           <small>{l.isFreeIntro?'FREE INTRO':unlocked?(demoChosen?'LOCAL DEMO PREVIEW':'AVAILABLE'):'LOCKED · ENROLL TO VIEW'}</small></span>
          {unlocked?(expanded?<ChevronDown size={17}/>:<ChevronRight size={17}/>):null}</button>
         {expanded&&unlocked&&<div className="lj-lesson-content">
          {full||l.isFreeIntro?<SecureLessonContent
           db={db} lessonId={l.id} viewerId={user.id.slice(0,8)}/>:
           <div className="lj-demo-banner" role="status">
            Local checkout simulation: lesson navigation is unlocked here, but the actual PDF/video and content are NOT fetched.
            Real signed-in paid/manual enrollment is required to access protected lessons.
           </div>}
          <small>Lesson completion is recorded by the verified P2 workflow, not simply by opening a video.</small>
         </div>}
        </div>;
       })}
      </div>)}
     </section>)}</div>}
    </section>
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
    {!!enrolled.length&&<label className="lj-picker">Course<select value={historyId} onChange={e=>setHistoryId(e.target.value)}>
      {enrolled.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>}
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
 </div>;
}
