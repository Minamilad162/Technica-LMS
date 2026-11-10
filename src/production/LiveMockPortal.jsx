import PremiumLoading from '../components/PremiumLoading.jsx';
import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft,LockKeyhole,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {hasPlatformAccess} from './subscriptionApi.js';
import {aspMissingReason} from './questionBankCourseSelection.js';
import LiveMockExam from './LiveMockExam.jsx';
import './liveLearning.css';
import './liveAuthoring.css';
import './liveMock.css';

// Official Mock uses verified Auth/JWT, NEVER local Demo assessment data.
export default function LiveMockPortal(){
 const navigate=useNavigate();
 const [state,setState]=useState({loading:true,error:'',catalog:null,db:null});
 const [reload,setReload]=useState(0);
 useEffect(()=>{
  let alive=true;let db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,error:e.message,catalog:null,db:null});return;}
  setState({loading:true,error:'',catalog:null,db});
  fetchLiveLearningCatalog(db).then(catalog=>{
   if(alive)setState({loading:false,error:'',catalog,db});
  }).catch(e=>{if(alive)setState({loading:false,error:e.message||'Course verification failed.',catalog:null,db});});
  return()=>{alive=false;};
 },[reload]);
 const {catalog,db,loading,error}=state;
 const officialCourse=catalog?.courses?.find(c=>c.slug==='asp')||null;
 const viewingCourse=officialCourse;
 const entitled=!!catalog&&!!viewingCourse&&mayReadLiveCourse(catalog,viewingCourse)&&
  (catalog.identity?.isAdmin===true||catalog.openAccess===true||hasPlatformAccess(catalog.subscription)||
   catalog.entitlements?.some(e=>e.course_id===viewingCourse.id&&
    ['paid','manual'].includes(e.entitlement_type))===true);
 return <main className="live-learning page-enter">
  <div className="live-learning-breadcrumb">
   <button type="button" onClick={()=>navigate('/assessments?tab=mock')}><ArrowLeft size={16}/> Mock Exam &amp; Practice</button>
  </div>
  <header className="live-learning-header">
   <span className="eyebrow">ASP MOCK EXAM</span>
   <h1>ASP Official Mock Exam</h1>
   <p>Exactly 200 questions selected and officially reserved from the ASP Question Bank, with a fixed 5-hour limit.</p>
  </header>
  <div className="live-learning-security"><ShieldCheck size={17}/> The official reserved 200-question ASP form is fixed and excluded from regular Practice. Timer and grading stay on the server.</div>
  {loading?<PremiumLoading variant="page"/>:
   error?<div className="live-learning-empty" role="alert"><TriangleAlert size={21}/><b>Mock unavailable</b>
     <p>{error}</p><button type="button" className="btn" onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/> Retry</button>
    </div>:
   !viewingCourse?<div className="live-learning-empty"><LockKeyhole size={21}/>
    <div><b>ASP Mock setup is incomplete</b><p>{aspMissingReason(catalog.courses)}</p>
     {catalog.identity?.isAdmin&&<button type="button" className="btn"
      onClick={()=>navigate('/admin-tools?tab=questions')}>Open ASP Question Bank</button>}</div></div>:
   viewingCourse.publication_state!=='published'?<div className="live-learning-empty"><LockKeyhole size={21}/>
    <b>ASP Course is not published</b><p>Publish the existing ASP Course and finalize its 200 saved, reviewed Mock questions to open the exam.</p>
    {catalog.identity?.isAdmin&&<button type="button" className="btn"
     onClick={()=>navigate('/admin-tools?tab=courses')}>Open Courses</button>}
   </div>:
   !entitled?<div className="live-learning-empty"><LockKeyhole size={21}/>
    <b>Mock access unavailable</b>
    <p>Course access is not ready yet. Refresh or contact your LMS administrator.</p></div>:
   <LiveMockExam key={catalog.user.id+viewingCourse.id} db={db}
    user={catalog.user} course={viewingCourse} access={entitled}/>}
 </main>;
}
