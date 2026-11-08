import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookOpenCheck,CheckCircle2,ChevronDown,ChevronRight,
 ClipboardCheck,GraduationCap,Layers3,LockKeyhole,LogOut,PlayCircle,RefreshCw,
 ShieldCheck,ShoppingBag,Target,X} from 'lucide-react';
import {getLearnerProgress} from './learnerProgressApi.js';
const CourseLessonExplorer=React.lazy(()=>import('./CourseLessonExplorer.jsx'));
const LivePractice=React.lazy(()=>import('./LivePractice.jsx'));
const LiveMockExam=React.lazy(()=>import('./LiveMockExam.jsx'));
import {fetchP15Catalog,fetchP15Outline,hasLocalDemoCheckout,
 isFullCourseEnrolled,localCheckoutEnabled,recordLocalDemoCheckout} from './learnerJourneyApi.js';
import {loadStructure} from './lmsApi.js';
import {hasSimulatedEnrollment} from './checkoutSimulationApi.js';
const SubscriptionPlans=React.lazy(()=>import('./SubscriptionPlans.jsx'));
import {LearnerCourseCard,CourseDetailHero} from './LearnerCourseCard.jsx';
const PremiumMyLearning=React.lazy(()=>import('./PremiumMyLearning.jsx'));
const QualificationsWorkspace=React.lazy(()=>import('../qualification/QualificationsWorkspace.jsx'));
import './liveLearnerJourney.css';
import './liveExamPracticeHub.css';
import SubscriptionCountdown from './SubscriptionCountdown.jsx';
import {aspMissingReason} from './questionBankCourseSelection.js';

const nav=[
 {id:'courses',label:'Courses',icon:BookOpen,group:'Learning'},
 {id:'learning',label:'My Learning',icon:BookOpenCheck,group:'Learning'},
 {id:'qualifications',label:'Qualifications',icon:GraduationCap,group:'Learning'},
 {id:'subscription',label:'Subscription',icon:ShoppingBag,group:'Learning'},
 {id:'practice',label:'Mock Exam & Practice',icon:Target,group:'Exam Preparation'},
 {id:'history',label:'My Practice',icon:ClipboardCheck,group:'Exam Preparation'}
];
const formatDate=d=>d&&Number.isFinite(Date.parse(d))?new Date(d).toLocaleDateString('en-GB'):'—';
const modeLabel={quick10:'Quick 10',timed25:'Timed Quiz',custom:'Custom',domain:'Domain Practice',
 levelup:'Level Up',asp_mock_200:'ASP Mock'};
export default function LiveLearnerWorkspace({db,user,onSignOut,embedded=false,
 initialScreen='courses',initialCourseId='',onCheckoutRoute=null,onCourseRoute=null,onLearningRoute=null,
 onPracticeRoute=null,onHistoryRoute=null,onSubscriptionRoute=null}){
 const syllabusRef=useRef(null);
 const [screen,setScreen]=useState(initialScreen),[catalog,setCatalog]=useState(null),
  [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),
  [selectedId,setSelectedId]=useState(initialCourseId),[outline,setOutline]=useState([]),
  [outlineLoading,setOutlineLoading]=useState(false),[outlineError,setOutlineError]=useState(''),
  [activeLesson,setActiveLesson]=useState(null),
  [demoRevision,setDemoRevision]=useState(0),[practiceId,setPracticeId]=useState(''),[historyId,setHistoryId]=useState(''),
  [practiceTree,setPracticeTree]=useState([]),[practiceError,setPracticeError]=useState(''),
  [report,setReport]=useState(null),[reportError,setReportError]=useState(''),[reportLoading,setReportLoading]=useState(false),
  [preparationTab,setPreparationTab]=useState('practice');
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  let live=true;setLoading(true);setError('');
  fetchP15Catalog(db,user).then(x=>{if(live){setCatalog(x);
    setSelectedId(old=>x.courses.some(c=>c.id===old)?old:'');
    setPracticeId(old=>x.courses.some(c=>c.id===old&&(x.openAccess||isFullCourseEnrolled(x.entitlements,c.id,x.subscription)))?
     old:(x.courses.find(c=>x.openAccess||isFullCourseEnrolled(x.entitlements,c.id,x.subscription))?.id||''));
    setHistoryId(old=>x.courses.some(c=>c.id===old&&isFullCourseEnrolled(x.entitlements,c.id,x.subscription))?
     old:(x.courses.find(c=>x.openAccess||isFullCourseEnrolled(x.entitlements,c.id,x.subscription))?.id||''));}})
   .catch(e=>{if(live){setCatalog(null);setError(e.message||'Course catalog unavailable.');}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,user.id,revision]);
 const enrolled=catalog?.courses.filter(c=>catalog.openAccess||isFullCourseEnrolled(catalog.entitlements,c.id,catalog.subscription))||[];
 const demoCourses=catalog?.openAccess?[]:catalog?.courses.filter(c=>!isFullCourseEnrolled(catalog.entitlements,c.id,catalog.subscription)&&(
  hasSimulatedEnrollment(user.id,c.id)||(localCheckoutEnabled()&&hasLocalDemoCheckout(user.id,c.id))))||[];
 const courseStatus=c=>catalog?.openAccess||isFullCourseEnrolled(catalog?.entitlements,c.id,catalog?.subscription)?'real':
  demoCourses.some(d=>d.id===c.id)?'demo':'available';
 const chosen=catalog?.courses.find(c=>c.id===selectedId);
 const officialAsp=catalog?.courses.find(c=>c.slug==='asp')||null;
 const full=chosen&&(catalog?.openAccess||isFullCourseEnrolled(catalog?.entitlements,chosen.id,catalog?.subscription));
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
   .catch(()=>{if(live)setReportError('Your practice results are temporarily unavailable.');})
   .finally(()=>{if(live)setReportLoading(false);});
  return()=>{live=false;};
 },[screen,db,historyId,enrolled.length,revision]);
 const openCourse=id=>{
  if(embedded&&onCourseRoute){onCourseRoute(id);return;}
  setSelectedId(id);setActiveLesson(null);setScreen('course');
 };
 const startCheckout=id=>{
  if(!catalog?.courses.some(c=>c.id===id))return;
  if(embedded&&onSubscriptionRoute){onSubscriptionRoute();return;}
  if(embedded&&onCheckoutRoute){onCheckoutRoute(id);return;}
  setSelectedId(id);setActiveLesson(null);setScreen('subscription');
 };
 const openLearning=()=>{
  if(embedded&&onLearningRoute){onLearningRoute();return;}
  go('learning');
 };
 const go=page=>{
  if(page==='subscription'&&embedded&&onSubscriptionRoute){onSubscriptionRoute();return;}
  setScreen(page);setActiveLesson(null);
  if(page!=='course'&&page!=='checkout')setSelectedId('');
 };
 const checkoutCompleted=()=>setDemoRevision(v=>v+1);
 const openPractice=()=>{
  if(embedded&&onPracticeRoute){onPracticeRoute();return;}setPreparationTab('practice');go('practice');
 };
 const openHistory=()=>{
  if(embedded&&onHistoryRoute){onHistoryRoute();return;}go('history');
 };
 const screenTitle=screen==='courses'?'Explore Courses':screen==='learning'?'My Learning':
  screen==='qualifications'?'My Qualifications':
  screen==='subscription'||screen==='checkout'?'Subscription Plans':
  screen==='course'?'Course Overview':
  screen==='practice'?'Mock Exam & Practice':'My Practice';
 return <div className={"lj-shell"+(embedded?" lj-embedded":"")+(screen==="qualifications"?" lj-qualification-mode":"")}>
  <header className="lj-top"><div className="lj-logo"><img alt="Technica Consult" src="/images/technica-logo.webp"/>
   <b>TECHNICA CONSULT <span>LMS</span></b></div><SubscriptionCountdown subscription={catalog?.subscription} openAccess={catalog?.openAccess===true} loading={loading} error={catalog?.subscriptionError||(!loading&&!catalog?'Subscription status unavailable':'')} onOpenPlans={()=>go('subscription')}/><div className="lj-account">
    <span><ShieldCheck size={14}/> {catalog?.openAccess?'Learning access':catalog?.subscription?'Platform Subscriber':'Secure learning'}</span><small>{user.email}</small>
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
     aria-current={screen===id?'page':undefined} onClick={()=>id==='practice'?openPractice():go(id)}>
     <Icon size={18}/><span>{label}</span></button>)}
   
  </aside>
  <main className="lj-main">{screen!=="qualifications"&&<div className="lj-heading">
   <div><span className="lj-eyebrow">TECHNICA LEARNING PLATFORM</span>
    <h1>{screenTitle}</h1><p>{screen==='courses'?'Explore published courses and start learning.':
      screen==='learning'?'Your courses, progress and next lessons in one place.':
      screen==='course'?'Your course content, organized for focused learning.':
      screen==='subscription'||screen==='checkout'?'Discover our learning plans.':
      screen==='practice'?'Customize your Practice, or take the fixed 200-question, 5-hour ASP Mock.':
      'Your own verified practice and Mock results.'}</p></div>
   <button type="button" className="lj-quiet" disabled={loading} onClick={refresh}><RefreshCw size={16}/> Refresh</button>
  </div>}
  {error&&<p className="lj-error" role="alert">{error}</p>}
  <React.Suspense fallback={<div className="lj-empty" role="status">Preparing this section…</div>}>
  {screen==="qualifications"?<QualificationsWorkspace/>:loading?<div className="lj-empty" role="status">Loading your published learning catalog…</div>:
   !catalog?<div className="lj-empty">Course catalog is unavailable. Check your LMS session.</div>:
   screen==='courses'?<section className="lj-grid" aria-label="Published courses">
    {catalog.courses.map(c=><LearnerCourseCard key={c.id} course={c} db={db}
     status={courseStatus(c)} openAccess={catalog?.openAccess===true} onOpen={()=>openCourse(c.id)} onEnroll={()=>startCheckout(c.id)}/>)}
    {!catalog.courses.length&&<div className="lj-empty"><BookOpen size={28}/>
     <b>No published courses yet</b><p>Once an Admin publishes a Course, it appears here automatically.</p></div>}
   </section>:
   screen==='learning'?<PremiumMyLearning db={db} user={user}
    activeCourses={enrolled} demoCourses={demoCourses} subscription={catalog?.subscription} openAccess={catalog?.openAccess===true}
    refreshKey={revision} onSubscribe={()=>go('subscription')}
    onOpen={openCourse} onBrowse={()=>go('courses')}
    onPractice={openPractice} onHistory={openHistory}/>:
   screen==='subscription'||screen==='checkout'?<SubscriptionPlans
    db={db} user={user} subscription={catalog?.subscription}
    subscriptionError={catalog?.subscriptionError||''} openAccess={catalog?.openAccess===true}
    onBack={()=>go('courses')} onRefresh={refresh} onMyLearning={openLearning}/>:
   screen==='course'? !chosen?<div className="lj-empty">Choose a published course from Courses.</div>:
   <div className="lj-course">
    <div className="lj-course-actions"><button className="lj-quiet" type="button" onClick={()=>go('courses')}>
     <ArrowLeft size={16}/> All Courses</button>
     {full?<span className="lj-enrolled"><CheckCircle2 size={16}/> {catalog?.openAccess?'Course available':'Verified enrollment'}</span>:
      demoChosen?<span className="lcc-access-status lcc-status-demo"><ShieldCheck size={15}/> Demo Access · No Charge</span>:
      <span className="lcc-access-status lcc-status-available"><LockKeyhole size={15}/> Subscription required</span>}
    </div>
    <CourseDetailHero db={db} course={chosen} status={full?'real':demoChosen?'demo':'available'} openAccess={catalog?.openAccess===true}
     onEnroll={()=>startCheckout(chosen.id)}
     onContinue={()=>syllabusRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}/>
    <div className="lcc-syllabus" ref={syllabusRef}>
     {outlineLoading?<div className="lj-empty" role="status">Loading published lessons…</div>:
      outlineError?<div className="lj-empty" role="alert"><LockKeyhole size={20}/>{outlineError}</div>:
      !outline.length?<div className="lj-empty">No published lessons are available in this course yet.</div>:
      <CourseLessonExplorer db={db} userId={user.id} courseId={chosen.id}
       courseTitle={chosen.title} outline={outline} full={Boolean(full)} demo={Boolean(demoChosen)}
       onSubscribe={()=>startCheckout(chosen.id)}/>}
    </div>
   </div>:
   screen==='practice'?<div className="lj-practice">
    <div className="lep-tabs" role="tablist" aria-label="Exam preparation mode">
     <button type="button" role="tab" id="lj-prep-practice" aria-controls="lj-prep-panel"
      aria-selected={preparationTab==='practice'} className={preparationTab==='practice'?'lep-tab-active':''}
      onClick={()=>setPreparationTab('practice')}><Target size={21}/><span><strong>Practice</strong><small>Custom questions and time</small></span></button>
     <button type="button" role="tab" id="lj-prep-mock" aria-controls="lj-prep-panel"
      aria-selected={preparationTab==='mock'} className={preparationTab==='mock'?'lep-tab-active':''}
      onClick={()=>setPreparationTab('mock')}><GraduationCap size={23}/><span><strong>Mock Exam</strong><small>200 questions · 5 hours</small></span></button>
    </div>
    <div id="lj-prep-panel" role="tabpanel" aria-labelledby={'lj-prep-'+preparationTab}>
    {preparationTab==='practice'?<>
    <div className="lj-section-head"><h2>Choose your course</h2><p>Quick 10, Timed Quiz, Build Your Own, Domain Practice and adaptive Level Up are available in the secure engine.</p></div>
    {!enrolled.length?<div className="lj-empty"><LockKeyhole size={24}/><b>Practice is not available yet</b><p>No accessible courses are published. Contact the LMS administrator.</p><button className="lj-primary" onClick={()=>go('courses')}>Explore Courses <ArrowRight size={16}/></button></div>:
     <><label className="lj-picker">Course<select value={practiceId} onChange={e=>setPracticeId(e.target.value)}>
      {enrolled.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      {practiceError&&<p className="lj-error">{practiceError}</p>}
      {enrolled.find(c=>c.id===practiceId)&&<LivePractice key={user.id+'-'+practiceId}
       db={db} user={user} course={enrolled.find(c=>c.id===practiceId)}
       domains={practiceTree} access={true} defaultMode="quick10"/>}
     </>}</>:
      !officialAsp?<div className="lj-empty"><LockKeyhole size={24}/><b>Official ASP Mock unavailable</b>
       <p>{aspMissingReason(catalog.courses)}</p></div>:
      <LiveMockExam key={user.id+'-'+officialAsp.id} db={db} user={user} course={officialAsp}
       access={!!catalog.identity?.isAdmin||catalog.openAccess===true||isFullCourseEnrolled(catalog.entitlements,officialAsp.id,catalog.subscription)}/>}
    </div>
   </div>:
   <div className="lj-history"><h2>My Practice History</h2>
    {!!enrolled.length&&<label className="lj-picker">Course<select value={historyId} onChange={e=>setHistoryId(e.target.value)}>
      {enrolled.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>}
    {!enrolled.length?<div className="lj-empty">Your practice history will appear after your first completed session.</div>:
     reportLoading?<div className="lj-empty" role="status">Loading your verified results…</div>:
     reportError?<div className="lj-empty" role="alert">{reportError}</div>:
     report?<><div className="lj-history-stats"><div><small>Completed practice sessions</small><strong>{report.practice.attempts}</strong></div>
      <div><small>Answer accuracy</small><strong>{report.practice.answerAccuracyPercent===null?'—':report.practice.answerAccuracyPercent+'%'}</strong></div>
      <div><small>Level Up sessions</small><strong>{report.practice.levelUpAttempts}</strong></div></div>
      <div className="lj-history-list">{report.recentAttempts.map((a,i)=><div key={i}>
       <b>{modeLabel[a.mode]||a.mode}</b><span>{formatDate(a.submittedAt)}</span>
       <strong>{a.correctCount} / {a.questionCount} · {a.scorePercent}%</strong></div>)}
       {!report.recentAttempts.length&&<p>No graded Practice or Mock attempts yet.</p>}</div>
      
     </>:<div className="lj-empty">Choose an enrolled course to see verified history.</div>}
   </div>}
  </React.Suspense>
  </main></div>
 </div>;
}
