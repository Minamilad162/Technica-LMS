import React,{useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,BookOpen,LockKeyhole,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {loadStructure} from './lmsApi.js';
import LivePractice from './LivePractice';
import './liveLearning.css';
import './liveAuthoring.css';
import './livePractice.css';

// Transitional secure Practice access for the DEFAULT Technica LMS app.
// Preserves historical demo practice/assessment/calculator routes untouched.
export default function LivePracticePortal(){
 const navigate=useNavigate(),[params]=useSearchParams();
 const requestedCourse=params.get('course');
 const requestedMode=params.get('mode')==='levelup'?'levelup':'quick10';
 const [state,setState]=useState({loading:true,error:'',catalog:null,db:null});
 const [courseId,setCourseId]=useState('');
 const [domains,setDomains]=useState([]),[domainLoading,setDomainLoading]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let alive=true;
  let db;try{db=getSupabaseClient({secureReviewEntry:true});}catch(e){setState({loading:false,error:e.message,catalog:null,db:null});return;}
  setState({loading:true,error:'',catalog:null,db});
  fetchLiveLearningCatalog(db).then(catalog=>{
   if(alive){setState({loading:false,error:'',catalog,db});setCourseId(old=>{
    const requested=catalog.courses.find(c=>c.id===requestedCourse||c.slug===requestedCourse);
    if(requested)return requested.id;
    if(catalog.courses.some(c=>c.id===old))return old;
    const enrolled=catalog.courses.find(c=>mayReadLiveCourse(catalog,c)&&(
     catalog.identity.isAdmin||catalog.entitlements.some(e=>e.course_id===c.id&&['paid','manual'].includes(e.entitlement_type))));
    return enrolled?.id||catalog.courses[0]?.id||'';
   });}
  }).catch(e=>{if(alive)setState({loading:false,error:e.message||'Unable to verify course access.',catalog:null,db});});
  return()=>{alive=false;};
 },[revision,requestedCourse]);
 const {db,catalog,loading,error}=state;
 const course=catalog?.courses.find(c=>c.id===courseId);
 const access=mayReadLiveCourse(catalog,course)&&
  (catalog?.identity.isAdmin===true||catalog.entitlements.some(e=>e.course_id===courseId&&['paid','manual'].includes(e.entitlement_type)));
 useEffect(()=>{
  if(!db||!courseId||!access){setDomains([]);return;}
  let active=true;setDomainLoading(true);setDomains([]);
  loadStructure(db,courseId).then(rows=>{if(active)setDomains(rows);})
   .catch(()=>{if(active)setDomains([]);})
   .finally(()=>{if(active)setDomainLoading(false);});
  return()=>{active=false;};
 },[db,courseId,access]);
 return <main className="live-learning page-enter">
  <div className="live-learning-breadcrumb"><button type="button" onClick={()=>navigate('/practice')}><ArrowLeft size={16}/> Practice Center</button></div>
  <header className="live-learning-header"><span className="eyebrow">SUPABASE · SECURE PRACTICE</span><h1>Live Practice &amp; Level Up</h1><p>Real authorized questions are selected and graded on the server. Adaptive difficulty follows your correct answers proportionally to the session length.</p></header>
  <div className="live-learning-security"><ShieldCheck size={16}/> P4/P5 protected practice · P8 Level Up activates only after reviewed bank and owner-approved migration</div>
  {loading?<div className="live-learning-empty" role="status">Checking verified Supabase courses…</div>:
   error?<div className="live-learning-empty" role="alert"><TriangleAlert size={23}/><b>Secure Practice unavailable</b><p>{error}</p><button className="btn" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/> Retry</button></div>:
   !catalog.courses.length?<div className="live-learning-empty">No authorized courses are visible in the live database yet.</div>:
   <><div className="live-authoring-course-selector"><label htmlFor="secure-practice-course">Course</label>
    <select id="secure-practice-course" value={courseId} onChange={e=>setCourseId(e.target.value)}>
     {catalog.courses.map(c=><option key={c.id} value={c.id}>{c.title} · {c.publication_state}</option>)}
    </select></div>
    {!access?<div className="live-learning-empty"><LockKeyhole size={22}/><b>Course practice locked</b><p>Only an approved paid/manual enrollment, or a verified Admin, may access the protected bank. Trial-only access does not unlock it.</p></div>:
      <>{domainLoading&&<p role="status" className="live-learning-note">Loading verified course domains…</p>}
       <LivePractice key={catalog.user.id+course.id+requestedMode} db={db} user={catalog.user} course={course} domains={domains} access={access} defaultMode={requestedMode}/></>}
   </>}
 </main>;
}
