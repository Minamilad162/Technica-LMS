import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft,LockKeyhole,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {hasPlatformAccess} from './subscriptionApi.js';
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
 const course=catalog?.courses?.find(c=>c.slug==='asp');
 const entitled=!!catalog&&!!course&&mayReadLiveCourse(catalog,course)&&
  (catalog.identity?.isAdmin===true||hasPlatformAccess(catalog.subscription)||catalog.entitlements?.some(e=>
    e.course_id===course.id&&['paid','manual'].includes(e.entitlement_type))===true);
 return <main className="live-learning page-enter">
  <div className="live-learning-breadcrumb">
   <button type="button" onClick={()=>navigate('/assessments')}><ArrowLeft size={16}/> Assessments</button>
  </div>
  <header className="live-learning-header"><span className="eyebrow">OFFICIAL ASP EXAM · LIVE SUPABASE</span>
   <h1>ASP Mock Exam</h1><p>200 questions. Five hours. Authenticated learner only. Your exam and grade are owned by the server.</p></header>
  <div className="live-learning-security"><ShieldCheck size={17}/>
   The Mock uses an exclusive 200-question reserved bank, never Practice question bundles.
  </div>
  {loading?<div className="live-learning-empty" role="status">Verifying exam entitlement and private Mock form…</div>:
   error?<div className="live-learning-empty" role="alert"><TriangleAlert size={21}/><b>Mock unavailable</b>
     <p>{error}</p><button type="button" className="btn" onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/> Retry</button>
    </div>:
   !course?<div className="live-learning-empty"><LockKeyhole size={21}/>
    ASP must be created in the real course catalog before the Mock is available.</div>:
   !entitled?<div className="live-learning-empty"><LockKeyhole size={21}/>
    <b>Active platform subscription required</b>
    <p>Choose a subscription plan to unlock official Mock exams across the platform.</p></div>:
   <LiveMockExam key={catalog.user.id+course.id} db={db}
    user={catalog.user} course={course} access={entitled}/>}
 </main>;
}
