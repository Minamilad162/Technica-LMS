import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {AlertTriangle,ArrowLeft,BookOpen,Eye,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import {useLiveAdminAuthoring} from './useLiveAdminAuthoring.js';
import {ADMIN_PREVIEW_MODES,buildAdminPreviewOutline,countAdminPreviewLessons,
 readAdminCoursePreview} from './adminCoursePreviewApi.js';
import {CourseDetailHero} from './LearnerCourseCard.jsx';
import CourseLessonExplorer from './CourseLessonExplorer.jsx';
import './adminCoursePreview.css';

export default function AdminCoursePreview(){
 const {courseId}=useParams(),navigate=useNavigate();
 const [params,setParams]=useSearchParams();
 const {db,status,message,retry}=useLiveAdminAuthoring();
 const [data,setData]=useState(null),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[reload,setReload]=useState(0),[notice,setNotice]=useState('');
 const mode=ADMIN_PREVIEW_MODES.includes(params.get('view'))?params.get('view'):'draft';
 const lessonId=params.get('lesson')||'';
 useEffect(()=>{
  if(status!=='ready'||!db){setLoading(status==='checking');return;}
  let live=true;setLoading(true);setError('');
  readAdminCoursePreview(db,courseId).then(result=>{if(live)setData(result);})
   .catch(err=>{if(live){setData(null);setError(err?.message||'Admin Course preview is unavailable.');}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[status,db,courseId,reload]);
 const course=data?.course;
 const outline=useMemo(()=>buildAdminPreviewOutline(data?.tree||[],mode,
  data?.introEnabled===true&&course?.publication_state==='published'),[
   data,mode,course?.publication_state
  ]);
 const lessonCount=countAdminPreviewLessons(outline);
 const validInitial=outline.some(d=>d.topics.some(t=>t.lessons.some(l=>l.id===lessonId)))?lessonId:'';
 const changeMode=value=>{
  setNotice('');
  const next=new URLSearchParams(params);
  next.set('view',value);
  next.delete('lesson');
  setParams(next);
 };
 if(status!=='ready')return <div className="acp-access" role="status">
  <LockKeyhole size={30}/><h2>Admin Course Preview</h2>
  <p>{status==='checking'?'Verifying your real LMS Admin permissions…':message||'Admin access required.'}</p>
  {status==='error'&&<button type="button" onClick={retry}>Retry</button>}
 </div>;
 if(loading)return <div className="acp-access" role="status"><RefreshCw size={26}/>Loading the latest saved Course…</div>;
 if(error||!course)return <div className="acp-access" role="alert"><AlertTriangle size={27}/>
  <h2>Preview unavailable</h2><p>{error||'Course not found.'}</p>
  <button type="button" onClick={()=>setReload(n=>n+1)}>Try again</button></div>;
 return <div className="acp-shell">
  <header className="acp-toolbar">
   <div><span className="acp-eyebrow"><ShieldCheck size={15}/> VERIFIED ADMIN · READ-ONLY</span>
    <h1>Course preview</h1>
    <p>Inspect exactly how your course layout looks before publishing, including video, material and Knowledge Check.</p></div>
   <div className="acp-toolbar-actions">
    <button type="button" onClick={()=>navigate('/admin-tools?tab=courses')}>
     <ArrowLeft size={16}/> Course Builder</button>
    <button type="button" onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/> Refresh changes</button>
   </div>
  </header>
  <div className="acp-modebar">
   <div className="acp-mode-label"><Eye size={17}/><b>View as</b></div>
   <div role="group" aria-label="Select Course preview mode" className="acp-mode-options">
    {[
     {id:'draft',label:'Working Draft'},
     {id:'visitor',label:'Visitor'},
     {id:'subscriber',label:'Subscriber'}
    ].map(x=><button type="button" key={x.id} className={mode===x.id?'selected':''}
     aria-pressed={mode===x.id} onClick={()=>changeMode(x.id)}>{x.label}</button>)}
   </div>
   <span className={'acp-status acp-status-'+course.publication_state}>
    {course.publication_state==='published'?'Published Course':'Not published'}</span>
  </div>
  <div className="acp-description" role="note">
   <ShieldCheck size={18}/>
   <p>{mode==='draft'?
    'Working Draft shows all saved lessons and draft questions. This is visible only to verified Admins; it does not publish content.':
    mode==='visitor'?
    'Visitor simulation: only published lessons appear, with a locked course except the approved free Intro. This is not an actual learner login.':
    'Subscriber simulation: published lessons appear unlocked. The preview does not grant any real subscription or modify learner records.'}
    {data.introEnabled===null&&mode==='visitor'?' Intro availability could not be verified; free access is shown as locked.':''}
   </p>
  </div>
  {course.publication_state!=='published'&&mode!=='draft'&&
   <div className="acp-unpublished" role="note">
    <AlertTriangle size={17}/> This Course is still Draft. Learners cannot discover it in the published catalog.
   </div>}
  <CourseDetailHero db={db} course={course} status={mode==='visitor'?'available':'real'}
   adminPreview={mode==='draft'} onEnroll={()=>setNotice('A real visitor is directed to Subscription Plans.')}
   onContinue={()=>document.getElementById('acp-syllabus')?.scrollIntoView({behavior:'smooth',block:'start'})}/>
  {notice&&<div className="acp-notice" role="status">{notice}</div>}
  <div className="acp-syllabus" id="acp-syllabus">
   <div className="acp-syllabus-heading"><div><span>LEARNER COURSE LAYOUT</span><h2><BookOpen size={22}/> Course content</h2></div>
    <small>{lessonCount} {lessonCount===1?'lesson':'lessons'} in this view</small></div>
   {!outline.length?<div className="acp-access">No {mode==='draft'?'saved':'published'} lessons yet.
    {mode!=='draft'&&' Switch to Working Draft to inspect unpublished lessons.'}</div>:
    <CourseLessonExplorer key={course.id+'-'+mode+'-'+reload} db={db}
     courseId={course.id} courseTitle={course.title} outline={outline}
     adminPreview full={mode!=='visitor'} demo={false} initialLessonId={validInitial}
     onSubscribe={()=>setNotice('In the real learner journey this opens Subscription Plans.')}/>}
  </div>
  <p className="acp-footer"><LockKeyhole size={15}/> Preview is Admin-only and read-only.
   It never grants course access, submits exams or records progress. Actual student permission checks remain on Supabase.</p>
 </div>;
}
