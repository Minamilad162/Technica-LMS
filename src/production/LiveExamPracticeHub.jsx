import React,{useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {BookOpenCheck,CalendarClock,CheckCircle2,Clock3,GraduationCap,
 LockKeyhole,RefreshCw,ShieldCheck,SlidersHorizontal,Target,TriangleAlert} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {loadStructure} from './lmsApi.js';
import {hasPlatformAccess} from './subscriptionApi.js';
import {aspMissingReason} from './questionBankCourseSelection.js';
import LivePractice from './LivePractice.jsx';
import LiveMockExam from './LiveMockExam.jsx';
import './liveLearning.css';
import './liveAuthoring.css';
import './livePractice.css';
import './liveMock.css';
import './liveExamPracticeHub.css';

// P39: two actual engines in one learner destination. Never use the old
// browser-demo AssessmentOverview, variable-size P34B Selected Mock, or
// unverified local question pools for the fixed official ASP Mock.
const TAB_IDS=['practice','mock'];
export function examPracticeTab(value){
 return TAB_IDS.includes(value)?value:'practice';
}
const accessTo=(catalog,course)=>!!catalog&&!!course&&mayReadLiveCourse(catalog,course)&&(
 catalog.identity?.isAdmin===true||
 catalog.openAccess===true||
 hasPlatformAccess(catalog.subscription)||
 catalog.entitlements?.some(e=>e.course_id===course.id&&e.status==='active'&&
 ['paid','manual'].includes(e.entitlement_type))===true
);
export default function LiveExamPracticeHub(){
 const navigate=useNavigate(),[params,setParams]=useSearchParams();
 const tab=examPracticeTab(params.get('tab'));
 const [state,setState]=useState({loading:true,catalog:null,db:null,error:''});
 const [courseId,setCourseId]=useState('');
 const [domains,setDomains]=useState([]),[domainLoading,setDomainLoading]=useState(false);
 const [domainError,setDomainError]=useState('');
 const [revision,setRevision]=useState(0);
 const activate=next=>{
  if(next===tab)return;
  const nextParams=new URLSearchParams(params);
  if(next==='practice')nextParams.delete('tab');else nextParams.set('tab','mock');
  setParams(nextParams,{replace:false});
 };
 useEffect(()=>{
  let alive=true,db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,catalog:null,db:null,
   error:e?.message||'A real Supabase connection is required.'});return;}
  setState({loading:true,catalog:null,db,error:''});
  fetchLiveLearningCatalog(db)
   .then(catalog=>{
    if(!alive)return;
    setState({loading:false,catalog,db,error:''});
    setCourseId(old=>catalog.courses.some(c=>c.id===old)?old:
      (catalog.courses.find(c=>c.slug==='asp')||catalog.courses[0])?.id||'');
   })
   .catch(e=>{if(alive)setState({loading:false,catalog:null,db,
    error:e?.message||'Unable to verify your learning catalog.'});});
  return()=>{alive=false;};
 },[revision]);
 const {db,catalog,loading,error}=state;
 const course=catalog?.courses.find(c=>c.id===courseId)||null;
 const officialAsp=catalog?.courses.find(c=>c.slug==='asp')||null;
 const practiceAccess=accessTo(catalog,course);
 const mockAccess=accessTo(catalog,officialAsp);
 useEffect(()=>{
  if(tab!=='practice'||!db||!course||!practiceAccess){
   setDomains([]);setDomainError('');return;
  }
  let live=true;setDomains([]);setDomainError('');setDomainLoading(true);
  loadStructure(db,course.id).then(rows=>{if(live)setDomains(rows);})
   .catch(e=>{if(live)setDomainError(e?.message||'Course domains unavailable.');})
   .finally(()=>{if(live)setDomainLoading(false);});
  return()=>{live=false;};
 },[db,tab,course?.id,practiceAccess]);
 return <main className="live-learning lep-page page-enter" aria-label="Mock Exam and Practice">
  <header className="lep-hero">
   <div className="lep-hero-copy">
    <span className="lep-eyebrow"><GraduationCap size={17}/> TECHNICA EXAM PREPARATION</span>
    <h1>Mock Exam <em>&amp; Practice</em></h1>
    <p>Train your way, or test your readiness with the official timed ASP Mock Exam.
     One place for both learning experiences.</p>
    <div className="lep-hero-tags">
     <span><SlidersHorizontal size={15}/> Custom Practice</span>
     <span><ShieldCheck size={15}/> Server-graded Questions</span>
     <span><Clock3 size={15}/> Fixed 5-hour Mock</span>
    </div>
   </div>
   <div className="lep-hero-decoration" aria-hidden="true">
    <span className="lep-float lep-float-one"><Target size={31}/></span>
    <span className="lep-float lep-float-two"><CalendarClock size={31}/></span>
    <div className="lep-hero-icon"><BookOpenCheck size={68}/></div>
   </div>
  </header>
  <div className="lep-tabs" role="tablist" aria-label="Exam preparation mode">
   <button type="button" role="tab" id="lep-tab-practice" aria-controls="lep-panel-practice"
    aria-selected={tab==='practice'} className={tab==='practice'?'lep-tab-active':''}
    onClick={()=>activate('practice')}>
    <Target size={23}/><span><strong>Practice</strong><small>Customize questions &amp; time</small></span>
   </button>
   <button type="button" role="tab" id="lep-tab-mock" aria-controls="lep-panel-mock"
    aria-selected={tab==='mock'} className={tab==='mock'?'lep-tab-active':''}
    onClick={()=>activate('mock')}>
    <GraduationCap size={24}/><span><strong>Mock Exam</strong><small>200 questions · 5 hours · fixed</small></span>
   </button>
  </div>
  <section className="lep-content" role="tabpanel"
   id={'lep-panel-'+tab} aria-labelledby={'lep-tab-'+tab}>
   <div className="lep-section-heading">
    <div><span className="lep-section-kicker">{tab==='practice'?'YOUR PRACTICE, YOUR RULES':'OFFICIAL ASP MOCK EXAM'}</span>
     <h2>{tab==='practice'?'Build your practice session':'Fixed exam. Real preparation.'}</h2>
     <p>{tab==='practice'
      ?'Choose your course, question count, practice mode and time limit in the same secure Practice you used before.'
      :'The official ASP Mock always has exactly 200 reserved questions and 300 minutes. No question-count or duration settings.'}</p>
    </div>
    <span className="lep-section-mark">{tab==='practice'?<SlidersHorizontal size={26}/>:<ShieldCheck size={26}/>}</span>
   </div>
   {loading?<div className="live-learning-empty" role="status">Verifying your account and courses…</div>:
    error?<div className="live-learning-empty" role="alert"><TriangleAlert size={24}/>
     <b>Exam preparation unavailable</b><p>{error}</p>
     <button type="button" className="btn" onClick={()=>setRevision(v=>v+1)}>
      <RefreshCw size={16}/> Retry</button></div>:
    tab==='practice'?<>
     {!catalog.courses.length?<div className="live-learning-empty">
      <BookOpenCheck size={24}/><b>No courses available</b><p>Published courses will appear here when available.</p>
     </div>:<>
      <div className="lep-course-selector">
       <label htmlFor="lep-practice-course"><BookOpenCheck size={19}/> Practice course</label>
       <select id="lep-practice-course" value={course?.id||''}
        onChange={e=>setCourseId(e.target.value)}>
        {catalog.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
       </select>
       <span><CheckCircle2 size={15}/> Practice modes and difficulty logic preserved</span>
      </div>
      {!course||!practiceAccess?<div className="live-learning-empty"><LockKeyhole size={24}/>
       <b>Course Practice is locked</b>
       <p>Course access is not available yet. Refresh the page or contact the LMS administrator.</p>
       <button type="button" className="btn" onClick={()=>navigate('/subscription-plans')}>View Subscription Plans</button>
      </div>:<>
       {domainLoading&&<p className="live-learning-note" role="status">Loading course domains…</p>}
       {domainError&&<p className="live-learning-note" role="alert">Some domain options are unavailable: {domainError}</p>}
       <LivePractice key={catalog.user.id+course.id} db={db} user={catalog.user}
        course={course} domains={domains} access={practiceAccess} defaultMode="quick10"/>
      </>}
     </>}
    </>:!officialAsp?<div className="live-learning-empty"><LockKeyhole size={25}/>
     <b>ASP Mock setup is incomplete</b>
     <p>{aspMissingReason(catalog.courses)}</p>
    </div>:!mockAccess?<div className="live-learning-empty"><LockKeyhole size={24}/>
     <b>Mock Exam requires active access</b>
     <p>Course access settings are unavailable. Refresh or contact the LMS administrator.</p>
     <button type="button" className="btn" onClick={()=>navigate('/subscription-plans')}>View Subscription Plans</button>
    </div>:<>
     <div className="lep-mock-promise">
      <div><BookOpenCheck size={19}/><strong>ASP Question Bank</strong><span>200 officially reserved questions</span></div>
      <div><Clock3 size={19}/><strong>05:00 hours</strong><span>Fixed server-controlled exam timer</span></div>
      <div><ShieldCheck size={19}/><strong>No customization</strong><span>Private answers and server grading</span></div>
     </div>
     <LiveMockExam key={catalog.user.id+officialAsp.id} db={db} user={catalog.user}
      course={officialAsp} access={mockAccess}/>
    </>}
  </section>
 </main>;
}
