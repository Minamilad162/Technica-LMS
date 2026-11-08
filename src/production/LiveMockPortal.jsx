import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft,LockKeyhole,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {hasPlatformAccess} from './subscriptionApi.js';
import LiveMockExam from './LiveMockExam.jsx';
import LiveSelectedMockExam from './LiveSelectedMockExam.jsx';
import './liveLearning.css';
import './liveAuthoring.css';
import './liveMock.css';

// Official Mock uses verified Auth/JWT, NEVER local Demo assessment data.
export default function LiveMockPortal(){
 const navigate=useNavigate();
 const [state,setState]=useState({loading:true,error:'',catalog:null,db:null});
 const [reload,setReload]=useState(0);
 const [mockMode,setMockMode]=useState('selected'),[selectedCourseId,setSelectedCourseId]=useState('');
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
 const course=catalog?.courses?.find(c=>c.id===selectedCourseId)||
  officialCourse||catalog?.courses?.[0]||null;
 const selected=mockMode==='selected';
 const viewingCourse=selected?course:officialCourse;
 const entitled=!!catalog&&!!viewingCourse&&mayReadLiveCourse(catalog,viewingCourse)&&
  (catalog.identity?.isAdmin===true||hasPlatformAccess(catalog.subscription)||
   catalog.entitlements?.some(e=>e.course_id===viewingCourse.id&&
    ['paid','manual'].includes(e.entitlement_type))===true);
 return <main className="live-learning page-enter">
  <div className="live-learning-breadcrumb">
   <button type="button" onClick={()=>navigate('/assessments')}><ArrowLeft size={16}/> Assessments</button>
  </div>
  <header className="live-learning-header">
   <span className="eyebrow">{selected?'ADMIN-SELECTED MOCK · LIVE SUPABASE':'OFFICIAL ASP EXAM · LIVE SUPABASE'}</span>
   <h1>{selected?'Selected Mock Test':'ASP Official Mock Exam'}</h1>
   <p>{selected?'Uses the questions your instructor checked as Mock Exam in the Course Question Bank. Save makes them available immediately.':'The separate official ASP form remains 200 immutable questions with a 5-hour timer.'}</p>
  </header>
  <div className="p34-mock-mode" role="group" aria-label="Mock Test type">
   <button type="button" className={selected?'selected':''} aria-pressed={selected} onClick={()=>setMockMode('selected')}>
    Selected Mock Test</button>
   <button type="button" className={!selected?'selected':''} aria-pressed={!selected} onClick={()=>setMockMode('official')}>
    Official ASP 200</button>
   {selected&&!!catalog?.courses?.length&&<label>Course
    <select aria-label="Select Mock Course" value={course?.id||''} onChange={e=>setSelectedCourseId(e.target.value)}>
     {catalog.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
    </select></label>}
  </div>
  <div className="live-learning-security"><ShieldCheck size={17}/>
   {selected?'Questions ticked Mock Exam and saved by an Admin are used exclusively here. The existing official 200-question form is not modified.':
    'The official Mock uses its separate permanent 200-question reserved Bank and never the selected pool.'}
  </div>
  {loading?<div className="live-learning-empty" role="status">Verifying exam entitlement and private Mock form…</div>:
   error?<div className="live-learning-empty" role="alert"><TriangleAlert size={21}/><b>Mock unavailable</b>
     <p>{error}</p><button type="button" className="btn" onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/> Retry</button>
    </div>:
   !viewingCourse?<div className="live-learning-empty"><LockKeyhole size={21}/>
    No suitable real Course is available for this Mock Test.</div>:
   !entitled?<div className="live-learning-empty"><LockKeyhole size={21}/>
    <b>Active platform subscription required</b>
    <p>Choose a subscription plan to unlock official Mock exams across the platform.</p></div>:
   selected?<LiveSelectedMockExam key={catalog.user.id+viewingCourse.id} db={db}
    user={catalog.user} course={viewingCourse} access={entitled}/>:
   <LiveMockExam key={catalog.user.id+viewingCourse.id} db={db}
    user={catalog.user} course={viewingCourse} access={entitled}/>}
 </main>;
}
