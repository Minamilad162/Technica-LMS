import React,{useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {AlertCircle,ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,FileText,GraduationCap,Layers3,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {loadStructure,loadTextBlocks} from './lmsApi.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse,progressForLesson} from './liveLearningApi.js';
import './liveLearning.css';

// P8 read-only learner portal. Actual course visibility, trial lesson access
// and draft privacy remain enforced by Supabase P1/P2 RLS, not local flags.
function useLiveLearningCatalog(){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState({loading:true,data:null,error:''});
 useEffect(()=>{
  let active=true;setState(s=>({...s,loading:true,error:''}));
  let db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,data:null,error:e.message||'Supabase config unavailable.'});return;}
  fetchLiveLearningCatalog(db).then(data=>{if(active)setState({loading:false,data,error:''});})
   .catch(e=>{if(active)setState({loading:false,data:null,error:e.message||'Unable to fetch the real course catalog.'});});
  return()=>{active=false;};
 },[revision]);
 return {...state,refresh:()=>setRevision(x=>x+1)};
}
const getCounts=tree=>({domains:tree.length,topics:tree.reduce((n,d)=>n+d.topics.length,0),lessons:tree.reduce((n,d)=>n+d.topics.reduce((a,t)=>a+t.lessons.length,0),0)});
function Loading({loading,error,refresh}){
 if(loading)return <div className="live-learning-empty" role="status">Checking your Supabase course access…</div>;
 if(error)return <div className="live-learning-empty" role="alert"><AlertCircle size={23}/><b>Learning library unavailable</b><p>{error}</p><button className="btn" onClick={refresh}><RefreshCw size={16}/> Retry</button></div>;
 return null;
}
export function LiveLearningLibrary(){
 const navigate=useNavigate();
 const {loading,data,error,refresh}=useLiveLearningCatalog();
 return <main className="live-learning page-enter">
  <header className="live-learning-header"><span className="eyebrow">LEARNING CENTER · SUPABASE</span><h1>My learning</h1><p>Published courses and your real enrollments, retrieved from your Technica LMS database.</p></header>
  <Loading loading={loading} error={error} refresh={refresh}/>
  {!loading&&data&&<><div className="live-learning-security"><ShieldCheck size={17}/> Read-only verified learning catalog · No Demo course mixing or simulated progress</div>
   {data.progressError&&<p className="live-learning-note">{data.progressError}</p>}
   <section className="live-learning-grid" aria-label="Available courses">
    {data.courses.map(course=>{
     const access=mayReadLiveCourse(data,course);
     return <article className="live-learning-card" key={course.id}>
      <div className="live-learning-card-icon"><BookOpen size={23}/></div>
      <div><span className="live-learning-card-state">{course.publication_state==='published'?'PUBLISHED':'DRAFT · ADMIN ONLY'}</span><h2>{course.title}</h2><p>{course.summary||'A Technica Consult learning course.'}</p><small>Course ID: {course.slug}</small></div>
      <div className="live-learning-card-footer">
       <span>{access?<><CheckCircle2 size={16}/> Enrolled / Admin</>:<><LockKeyhole size={16}/> Enrollment required</>}</span>
       <button type="button" className="btn" onClick={()=>navigate('/learning/course/'+encodeURIComponent(course.id))}>{access?'Open course':'View course'} <ArrowRight size={16}/></button>
      </div>
     </article>;
    })}
    {!data.courses.length&&<div className="live-learning-empty"><GraduationCap size={25}/><b>No published courses available</b><p>The Admin can create Draft courses, then publish approved content in a separate controlled release step.</p></div>}
   </section>
   <div className="live-learning-footer"><span>Legacy learning demonstration is preserved separately.</span><button className="btn btn-secondary" onClick={()=>navigate('/my-learning?legacyPreview=1')}>Open old Demo preview</button></div>
  </>}
 </main>;
}
export function LiveLearningCourse(){
 const navigate=useNavigate(),{courseId}=useParams();
 const {loading,data,error,refresh}=useLiveLearningCatalog();
 const [tree,setTree]=useState([]),[treeLoading,setTreeLoading]=useState(false),[treeError,setTreeError]=useState('');
 const [lessonId,setLessonId]=useState(null),[blocks,setBlocks]=useState([]),[blockError,setBlockError]=useState('');
 const course=data?.courses.find(c=>c.id===courseId||c.slug===courseId);
 const access=mayReadLiveCourse(data,course);
 useEffect(()=>{
  if(!data||!course||!access){setTree([]);setLessonId(null);return;}
  let alive=true;setTreeLoading(true);setTreeError('');
  const db=getSupabaseClient({secureReviewEntry:true});
  loadStructure(db,course.id).then(rows=>{if(alive)setTree(rows);})
   .catch(e=>{if(alive)setTreeError(e.message||'Could not load course structure.');})
   .finally(()=>{if(alive)setTreeLoading(false);});
  return()=>{alive=false;};
 },[data,course?.id,access]);
 useEffect(()=>{
  if(!lessonId){setBlocks([]);setBlockError('');return;}
  let alive=true;setBlocks([]);setBlockError('');
  const db=getSupabaseClient({secureReviewEntry:true});
  loadTextBlocks(db,lessonId).then(rows=>{if(alive)setBlocks(rows);})
   .catch(e=>{if(alive)setBlockError(e.message||'Unable to load authorized lesson content.');});
  return()=>{alive=false;};
 },[lessonId]);
 const counts=getCounts(tree);
 const completed=tree.reduce((n,d)=>n+d.topics.reduce((a,t)=>a+t.lessons.filter(l=>Boolean(progressForLesson(data?.progress,l.id)?.lesson_completed_at)).length,0),0);
 return <main className="live-learning page-enter">
  <div className="live-learning-breadcrumb"><button type="button" onClick={()=>navigate('/my-learning')}><ArrowLeft size={16}/> My learning</button><ChevronRight size={15}/>{course?.title||'Course'}</div>
  <Loading loading={loading} error={error} refresh={refresh}/>
  {!loading&&data&&!course&&<div className="live-learning-empty" role="alert"><LockKeyhole size={23}/><b>Course not available</b><p>This course is not visible to your authenticated account.</p></div>}
  {!loading&&course&&<><header className="live-learning-header"><span className="eyebrow">COURSE · SUPABASE</span><h1>{course.title}</h1><p>{course.summary||'Course details will be published by your instructor.'}</p></header>
   {!access?<div className="live-learning-empty"><LockKeyhole size={23}/><b>Course enrollment required</b><p>This course cannot reveal its lessons without an active course entitlement. Contact your LMS administrator.</p></div>:
    <><div className="live-learning-metrics"><span><Layers3 size={17}/> {counts.domains} domains</span><span>{counts.topics} topics</span><span>{counts.lessons} lessons</span><span><CheckCircle2 size={17}/> {completed} verified completed</span></div>
    {data.progressError&&<p className="live-learning-note">{data.progressError}</p>}
    <div className="live-learning-note">Learning progress is read from verified server records only. Opening a lesson does not mark it complete; write-side progress validation is a separate P2 integration stage.</div>
    {treeLoading?<div className="live-learning-empty" role="status">Loading authorized course structure…</div>:treeError?<div className="live-learning-empty" role="alert">{treeError}</div>:
     !tree.length?<div className="live-learning-empty">No published learning structure is accessible yet.</div>:
     <div className="live-learning-domains">{tree.map((domain,di)=><section className="live-learning-domain" key={domain.id}>
      <h2>Domain {di+1}: {domain.title}</h2>{domain.topics.map((topic,ti)=><div key={topic.id} className="live-learning-topic">
       <h3>Topic {di+1}.{ti+1}: {topic.title}</h3>
       {topic.lessons.map((lesson,li)=>{
        const current=lessonId===lesson.id,done=Boolean(progressForLesson(data.progress,lesson.id)?.lesson_completed_at);
        return <div className="live-learning-lesson" key={lesson.id}>
         <button type="button" aria-expanded={current} onClick={()=>setLessonId(v=>v===lesson.id?null:lesson.id)}>
          {done?<CheckCircle2 size={18}/>:<FileText size={18}/>}<span>{di+1}.{ti+1}.{li+1} · {lesson.title}</span>{current?<ChevronDown size={17}/>:<ChevronRight size={17}/>}
         </button>
         {current&&<div className="live-learning-lesson-text">
           {blockError&&<p role="alert">{blockError}</p>}
           {blocks.length?blocks.map(b=><p key={b.id}>{String(b.payload?.body||b.payload?.text||'')}</p>):!blockError&&<p>No authorized reading text available for this lesson yet.</p>}
           <small>{done?'Verified completed in database':'Reading only · completion requires the server-side progress workflow'}</small>
         </div>}
        </div>;
       })}
       {!topic.lessons.length&&<p className="live-learning-note">No visible lessons yet.</p>}
      </div>)}
     </section>)}</div>}
    </>}
  </>}
 </main>;
}
