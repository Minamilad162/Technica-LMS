import PremiumLoading from '../components/PremiumLoading.jsx';
import React,{useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {BookOpenCheck,CalendarClock,CheckCircle2,Clock3,GraduationCap,
 LockKeyhole,RefreshCw,ShieldCheck,SlidersHorizontal,Target,TriangleAlert,History} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {loadStructure} from './lmsApi.js';
import {hasPlatformAccess} from './subscriptionApi.js';
import {aspMissingReason} from './questionBankCourseSelection.js';
import LivePractice from './LivePractice.jsx';
import LiveSelectedMockExam from './LiveSelectedMockExam.jsx';
// Reuse verified P11 My Practice history; never recreate scores from browser state.
const LiveLearnerWorkspace=React.lazy(()=>import('./LiveLearnerWorkspace.jsx'));
import './liveLearning.css';
import './liveAuthoring.css';
import './livePractice.css';
import './liveMock.css';
import './liveExamPracticeHub.css';

// P39: two actual engines in one learner destination. Never use the old
// browser-demo AssessmentOverview, variable-size P34B Selected Mock, or
// unverified local question pools for the fixed official ASP Mock.
const TAB_IDS=['practice','mock','history'];
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
 const [courseId,setCourseId]=useState(''),[mockCourseId,setMockCourseId]=useState('');
 const [domains,setDomains]=useState([]),[domainLoading,setDomainLoading]=useState(false);
 const [domainError,setDomainError]=useState('');
 const [revision,setRevision]=useState(0);
 const activate=next=>{
  if(next===tab)return;
  const nextParams=new URLSearchParams(params);
  if(next==='practice')nextParams.delete('tab');else nextParams.set('tab',next);
  setParams(nextParams,{replace:false});
 };
 useEffect(()=>{
  let alive=true,db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,catalog:null,db:null,
   error:e?.message||'Unable to connect. Please try again.'});return;}
  setState({loading:true,catalog:null,db,error:''});
  fetchLiveLearningCatalog(db)
   .then(catalog=>{
    if(!alive)return;
    setState({loading:false,catalog,db,error:''});
    setCourseId(old=>catalog.courses.some(c=>c.id===old)?old:catalog.courses[0]?.id||'');
    setMockCourseId(old=>catalog.courses.some(c=>c.id===old)?old:
     catalog.courses.find(c=>accessTo(catalog,c))?.id||catalog.courses[0]?.id||'');
   })
   .catch(e=>{if(alive)setState({loading:false,catalog:null,db,
    error:e?.message||'Unable to verify your learning catalog.'});});
  return()=>{alive=false;};
 },[revision]);
 const {db,catalog,loading,error}=state;
 const allowedCourses=catalog?.courses.filter(c=>accessTo(catalog,c))||[];
 const course=courseId==='all'?{id:'all',title:'All Courses',publication_state:'published'}:
  catalog?.courses.find(c=>c.id===courseId)||null;
 const mockCourse=catalog?.courses.find(c=>c.id===mockCourseId)||null;
 const practiceAccess=courseId==='all'?allowedCourses.length>0:accessTo(catalog,course);
 const mockAccess=accessTo(catalog,mockCourse);
 useEffect(()=>{
  if(tab!=='practice'||!db||!course||!practiceAccess||course.id==='all'){
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
    <p>Train your way, or take your Course's timed Mock Exam using saved Question Bank selections.
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
   <button type="button" role="tab" id="lep-tab-history" aria-controls="lep-panel-history"
    aria-selected={tab==='history'} className={tab==='history'?'lep-tab-active':''}
    onClick={()=>activate('history')}>
    <History size={23}/><span><strong>My Practice</strong><small>Previous sessions &amp; results</small></span>
   </button>
  </div>
  <section className="lep-content" role="tabpanel"
   id={'lep-panel-'+tab} aria-labelledby={'lep-tab-'+tab}>
   <div className="lep-section-heading">
    <div><span className="lep-section-kicker">{tab==='practice'?'YOUR PRACTICE, YOUR RULES':tab==='history'?'YOUR VERIFIED RESULTS':'COURSE MOCK EXAM'}</span>
     <h2>{tab==='practice'?'Build your practice session':tab==='history'?'Your practice history':'Fixed exam. Real preparation.'}</h2>
     <p>{tab==='practice'
      ?'Choose your course, question count, practice mode and time limit in the same secure Practice you used before.'
      :tab==='history'?'Review your own completed sessions, scores and adaptive progress.'
      :'Mock Exam uses the questions saved as Mock in the selected Course. Exactly 200 are required for the fixed 300-minute exam; no additional reservation step.'}</p>
    </div>
    <span className="lep-section-mark">{tab==='practice'?<SlidersHorizontal size={26}/>:tab==='history'?<History size={26}/>:<ShieldCheck size={26}/>}</span>
   </div>
   {loading?<PremiumLoading variant="page"/>:
    error?<div className="live-learning-empty" role="alert"><TriangleAlert size={24}/>
     <b>Exam preparation unavailable</b><p>{error}</p>
     <button type="button" className="btn" onClick={()=>setRevision(v=>v+1)}>
      <RefreshCw size={16}/> Retry</button></div>:
    tab==='history'?<React.Suspense fallback={<PremiumLoading variant="compact"/>}>
     <LiveLearnerWorkspace db={db} user={catalog.user} embedded initialScreen="history"/>
    </React.Suspense>:
    tab==='practice'?<>
     {!catalog.courses.length?<div className="live-learning-empty">
      <BookOpenCheck size={24}/><b>No courses available</b><p>Published courses will appear here when available.</p>
     </div>:<>
      <div className="lep-course-selector">
       <label htmlFor="lep-practice-course"><BookOpenCheck size={19}/> Practice course</label>
       <select id="lep-practice-course" value={courseId}
        onChange={e=>setCourseId(e.target.value)}>
        {allowedCourses.length>0&&<option value="all">All Courses · {allowedCourses.length} accessible</option>}
        {catalog.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
       </select>
       <span><CheckCircle2 size={15}/> {courseId==='all'?'Practice across your courses':'Choose your preferred practice mode'}</span>
      </div>
      {!course||!practiceAccess?<div className="live-learning-empty"><LockKeyhole size={24}/>
       <b>Course Practice is locked</b>
       <p>Course access is not available yet. Refresh the page or contact the LMS administrator.</p>
       <button type="button" className="btn" onClick={()=>navigate('/subscription-plans')}>View Subscription Plans</button>
      </div>:<>
       {domainLoading&&<PremiumLoading variant="compact"/>}
       {domainError&&<p className="live-learning-note" role="alert">Some domain options are unavailable: {domainError}</p>}
       <LivePractice key={catalog.user.id+course.id} db={db} user={catalog.user}
        course={course} domains={domains} access={practiceAccess} defaultMode="quick10"/>
      </>}
     </>}
    </>:!mockCourse?<div className="live-learning-empty"><LockKeyhole size={24}/>
     <b>No Mock Exam available</b><p>There is no available Mock Exam for this course.</p>
    </div>:<>
     <div className="lep-course-selector">
      <label htmlFor="lep-mock-course"><BookOpenCheck size={19}/> Mock Exam course</label>
      <select id="lep-mock-course" value={mockCourseId} onChange={e=>setMockCourseId(e.target.value)}>
       {catalog.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      
     </div>
     {mockCourse.publication_state!=='published'?<div className="live-learning-empty"><LockKeyhole size={24}/>
       <b>Course not published</b><p>The saved Mock questions remain in Question Bank. Publish this Course to enable its exam.</p>
       {catalog.identity?.isAdmin&&<button type="button" className="btn" onClick={()=>navigate('/admin-tools?tab=courses')}>Open Admin Courses</button>}
      </div>:!mockAccess?<div className="live-learning-empty"><LockKeyhole size={24}/>
       <b>Mock Exam requires active access</b><p>Subscribe or contact your instructor to access this Course's Mock Exam.</p>
       <button type="button" className="btn" onClick={()=>navigate('/subscription-plans')}>View Subscription Plans</button>
      </div>:<>
       {/* Live readiness and fixed duration render once in the secure Mock module. */}
       <LiveSelectedMockExam key={catalog.user.id+mockCourse.id} db={db} user={catalog.user} course={mockCourse} access={mockAccess}/>
      </>}
    </>}
  </section>
 </main>;
}
