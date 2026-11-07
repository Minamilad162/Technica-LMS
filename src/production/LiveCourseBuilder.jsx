import React,{useCallback,useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {AlertCircle,ArrowLeft,BookOpen,CheckCircle2,ChevronDown,ChevronRight,Database,FileText,Layers3,Pencil,Plus,RefreshCw,ShieldCheck} from 'lucide-react';
import {Modal} from '../components/UI';
import {useLiveAdminAuthoring} from './useLiveAdminAuthoring';
import {addAuthoringNode,addReadingParagraph,liveCourses,liveCourseTree,liveLessonText,updateAuthoringTitle,updateAuthoringCourse} from './liveAuthoringApi';
import '../courseHierarchy.css';
import './liveAuthoring.css';
const AdminLessonQuizEditor=React.lazy(()=>import('./AdminLessonQuizEditor.jsx'));

const childrenOf=(node,key)=>node?.[key]||[];
const countTree=tree=>({
 domains:tree.length,
 topics:tree.reduce((n,d)=>n+childrenOf(d,'topics').length,0),
 lessons:tree.reduce((n,d)=>n+childrenOf(d,'topics').reduce((m,t)=>m+childrenOf(t,'lessons').length,0),0)
});
export default function LiveCourseBuilder(){
 const navigate=useNavigate(),[params,setParams]=useSearchParams();
 const {db,status,message,retry}=useLiveAdminAuthoring();
 const [courses,setCourses]=useState([]),[tree,setTree]=useState([]),[revision,setRevision]=useState(0);
 const [loading,setLoading]=useState(true),[loadingTree,setLoadingTree]=useState(false);
 const [loadedCourse,setLoadedCourse]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [opened,setOpened]=useState({}),[lessonId,setLessonId]=useState(null),[blocks,setBlocks]=useState([]),[blocksLoading,setBlocksLoading]=useState(false);
 const [editor,setEditor]=useState(null),[saving,setSaving]=useState(false);
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 const requested=params.get('courseId');
 const course=courses.find(c=>c.id===requested||c.slug===requested)||(!requested?courses[0]:null);
 const courseId=course?.id||null;
 useEffect(()=>{
  if(status!=='ready'||!db)return;
  let active=true;setLoading(true);setError('');
  liveCourses(db).then(rows=>{if(active)setCourses(rows);})
   .catch(e=>{if(active)setError(e.message||'Live catalog could not load.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,status,revision]);
 useEffect(()=>{
  if(status!=='ready'||!courseId){setTree([]);setLoadedCourse(null);setLessonId(null);return;}
  let active=true;setLoadingTree(true);setLoadedCourse(null);setError('');setLessonId(null);
  liveCourseTree(db,courseId).then(rows=>{if(active){setTree(rows);setLoadedCourse(courseId);}})
   .catch(e=>{if(active){setTree([]);setError(e.message||'Cannot read this course hierarchy.');}})
   .finally(()=>{if(active)setLoadingTree(false);});
  return()=>{active=false;};
 },[db,status,courseId,revision]);
 useEffect(()=>{
  if(!lessonId||status!=='ready'){setBlocks([]);return;}
  let active=true;setBlocksLoading(true);
  liveLessonText(db,lessonId).then(rows=>{if(active)setBlocks(rows);})
   .catch(e=>{if(active){setError(e.message||'Cannot read lesson text.');setBlocks([]);}})
   .finally(()=>{if(active)setBlocksLoading(false);});
  return()=>{active=false;};
 },[db,lessonId,status,revision]);
 const toggle=id=>setOpened(v=>({...v,[id]:!(v[id]??true)}));
 const openNode=(kind,extra={})=>setEditor({kind,title:'',summary:'',...extra});
 const openRename=(table,row)=>setEditor({kind:'rename',table,id:row.id,title:row.title});
 const openDetails=()=>setEditor({kind:'details',title:course.title,summary:course.summary||''});
 const save=async event=>{
  event.preventDefault();if(saving||!course)return;
  setSaving(true);setError('');setNotice('');
  try{
   if(editor.kind==='details')await updateAuthoringCourse(db,course.id,editor.title,editor.summary);
   else if(editor.kind==='rename')await updateAuthoringTitle(db,editor.table,editor.id,editor.title);
   else if(editor.kind==='text')await addReadingParagraph(db,editor.lessonId,editor.title,blocks.length);
   else{
    const domain=tree.find(d=>d.id===editor.domainId);
    const topic=domain?.topics.find(t=>t.id===editor.topicId);
    await addAuthoringNode(db,{...editor,courseId:course.id},editor.kind==='domain'?tree:editor.kind==='topic'?childrenOf(domain,'topics'):childrenOf(topic,'lessons'));
   }
   setNotice('Saved successfully in the actual Supabase database.');setEditor(null);refresh();
  }catch(e){setError(e.message||'Supabase rejected the operation. No local fallback was used.');}
  finally{setSaving(false);}
 };
 if(status!=='ready')return <div className="live-authoring-container"><div className="live-authoring-state" role={status==='error'?'alert':'status'}>
  <Database size={27}/><h2>{status==='checking'?'Verifying Supabase Admin…':'Verified Admin access required'}</h2>
  <p>{message||'Checking your active role and database access.'}</p>
  {status==='error'&&<button className="btn" onClick={retry}><RefreshCw size={16}/> Retry</button>}
 </div></div>;
 const counts=countTree(tree);
 return <div className="page-enter builder-page live-authoring-container">
  <div className="breadcrumb"><button type="button" className="inline-breadcrumb" onClick={()=>navigate('/courses')}>Courses</button><ChevronRight size={14}/>{course?.title||'Select a course'}</div>
  <div className="builder-header live-authoring-builder-header"><div className="live-authoring-builder-icon"><Layers3 size={26}/></div>
   <div className="builder-name"><span className="eyebrow">LIVE COURSE BUILDER · SUPABASE</span><h1>{course?.title||'Course Builder'}</h1>
    <p className="page-subtitle">Course → Domain → Topic → Lesson, stored with stable IDs in your real database.</p></div>
   <div className="builder-head-actions"><span className="draft-tag"><FileText size={14}/>{course?.publication_state||'No course'}</span>
    <button className="btn btn-secondary" type="button" onClick={refresh} disabled={loading||loadingTree}><RefreshCw size={15}/> Refresh</button>
    {course&&<button className="btn btn-secondary" onClick={openDetails}><Pencil size={15}/> Edit course</button>}</div>
  </div>
  <div className="live-authoring-banner"><ShieldCheck size={17}/><span>Connected to real Supabase tables · No automatic migration from Demo · No delete or publish in this phase</span></div>
  <div className="live-authoring-course-selector">
   <label htmlFor="live-builder-course">Select a database course</label>
   <select id="live-builder-course" disabled={loading} value={courseId||''} onChange={e=>setParams({courseId:e.target.value})}>
    {!courseId&&<option value="">Choose a live course</option>}
    {courses.map(c=><option key={c.id} value={c.id}>{c.title} ({c.publication_state})</option>)}
   </select>
   <button className="btn btn-secondary" type="button" onClick={()=>navigate('/courses')}><Plus size={15}/> Manage courses</button>
  </div>
  {error&&!editor&&<div className="live-authoring-alert" role="alert"><AlertCircle size={17}/>{error}</div>}
  {notice&&<div className="live-authoring-success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
  {loading?<div className="white-panel admin-empty" role="status">Loading real course catalog…</div>:
   !course?<div className="white-panel admin-empty"><h3>{requested?'Requested course not found in Supabase.':'No live courses exist yet.'}</h3>
    <p>The older Demo course selection does not create a database course. Create a draft in Live Courses first.</p>
    <button className="btn" onClick={()=>navigate('/courses')}><ArrowLeft size={16}/> Open Live Courses</button>
   </div>:
   <div className="hierarchy-editor">
    <div className="hierarchy-heading"><div><h3><Layers3 size={21}/> Learning structure</h3>
     <p>Real Supabase records with server-enforced Admin RLS. Creating or renaming is saved immediately after confirmation.</p></div>
     <button type="button" className="btn" disabled={loadingTree||loadedCourse!==courseId||saving} onClick={()=>openNode('domain')}><Plus size={17}/> Add domain</button>
    </div>
    <div className="hierarchy-counts"><span>{counts.domains} domains</span><span>{counts.topics} topics</span><span>{counts.lessons} lessons</span></div>
    {loadingTree||loadedCourse!==courseId?<div className="hierarchy-empty" role="status">Loading course structure from Supabase…</div>:
     !tree.length?<div className="hierarchy-empty"><BookOpen size={25}/><strong>No domains yet</strong><p>Create a Domain, add Topics and Lessons inside it. No Demo records will be copied automatically.</p></div>:null}
    {loadedCourse===courseId&&<div className="hierarchy-list">{tree.map((domain,di)=><article className="hierarchy-domain" key={domain.id}>
     <div className="hierarchy-domain-head">
      <button type="button" className="hierarchy-disclosure" aria-label={`Toggle domain ${domain.title}`} aria-expanded={opened[domain.id]??true} onClick={()=>toggle(domain.id)}>{opened[domain.id]??true?<ChevronDown size={18}/>:<ChevronRight size={18}/>}</button>
      <div className="hierarchy-title"><small>DOMAIN {di+1}</small><strong>{domain.title}</strong></div>
      <div className="hierarchy-actions"><button type="button" aria-label="Rename domain" onClick={()=>openRename('lms_domains',domain)}><Pencil size={16}/></button></div>
     </div>
     {(opened[domain.id]??true)&&<div className="hierarchy-domain-body">
      {domain.topics.map((topic,ti)=><div className="hierarchy-topic" key={topic.id}>
       <div className="hierarchy-topic-head">
        <button type="button" className="hierarchy-disclosure" aria-label={`Toggle topic ${topic.title}`} aria-expanded={opened[topic.id]??true} onClick={()=>toggle(topic.id)}>{opened[topic.id]??true?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
        <div className="hierarchy-title"><small>TOPIC {di+1}.{ti+1}</small><strong>{topic.title}</strong><small>{topic.lessons.length} lessons</small></div>
        <div className="hierarchy-actions"><button type="button" aria-label="Rename topic" onClick={()=>openRename('lms_topics',topic)}><Pencil size={16}/></button></div>
       </div>
       {(opened[topic.id]??true)&&<div className="hierarchy-lessons">
        {topic.lessons.map((lesson,li)=><section className="hierarchy-lesson live-authoring-lesson" key={lesson.id}>
         <div className="hierarchy-lesson-mark"><FileText size={16}/></div>
         <button className="live-authoring-lesson-title hierarchy-title" type="button" aria-expanded={lessonId===lesson.id} onClick={()=>setLessonId(v=>v===lesson.id?null:lesson.id)}>
          <small>LESSON {di+1}.{ti+1}.{li+1} · {lesson.publication_state}</small><strong>{lesson.title}</strong>
         </button>
         <div className="hierarchy-actions"><button type="button" aria-label="Rename lesson" onClick={()=>openRename('lms_lessons',lesson)}><Pencil size={16}/></button></div>
         {lessonId===lesson.id&&<div className="live-authoring-reading">
          <div className="live-authoring-reading-top"><b>Reading text</b><button className="btn btn-secondary" type="button" onClick={()=>openNode('text',{lessonId:lesson.id})}><Plus size={15}/> Add paragraph</button></div>
          {blocksLoading?<p>Loading reading text…</p>:blocks.length?blocks.map(b=><p key={b.id}>{String(b.payload?.body||b.payload?.text||'')}</p>):<p>No reading text blocks added yet.</p>}
          <React.Suspense fallback={<p>Opening Knowledge Check tools…</p>}><AdminLessonQuizEditor db={db} lessonId={lesson.id}/></React.Suspense>
         </div>}
        </section>)}
        <button type="button" className="hierarchy-add" onClick={()=>openNode('lesson',{domainId:domain.id,topicId:topic.id})}><Plus size={16}/> Add lesson</button>
       </div>}
      </div>)}
      <button type="button" className="hierarchy-add" onClick={()=>openNode('topic',{domainId:domain.id})}><Plus size={16}/> Add topic to {domain.title}</button>
     </div>}
    </article>)}</div>}
    <p className="hierarchy-note">Only actual saved Supabase objects are displayed here. No automatic sync of the previous 5 demo ASP domains, PDF/video browser files, lesson quizzes or question bank occurs.</p>
   </div>}
  <div className="live-authoring-secondary"><p>Previously accepted local-only authoring tools remain available as an explicitly labeled preview, not a Supabase save operation.</p><button className="btn btn-secondary" type="button" onClick={()=>navigate('/builder?courseId=asp&legacyPreview=1')}>Open legacy Builder demo preview</button></div>
  {editor&&<Modal title={editor.kind==='details'?'Edit real course details':editor.kind==='rename'?'Rename '+editor.table.replace('lms_','').slice(0,-1):editor.kind==='text'?'Add lesson reading text':'Add '+editor.kind} onClose={()=>{if(!saving)setEditor(null);}}>
    <form className="simple-fields" onSubmit={save}>
     <label>{editor.kind==='text'?'Reading paragraph':editor.kind==='details'?'Course title':'Title'}
      {editor.kind==='text'?<textarea autoFocus required maxLength={20000} rows={6} value={editor.title} onChange={e=>setEditor(v=>({...v,title:e.target.value}))}/>:
       <input autoFocus required maxLength={180} value={editor.title} onChange={e=>setEditor(v=>({...v,title:e.target.value}))}/>}</label>
     {editor.kind==='details'&&<label>Summary<textarea rows={3} maxLength={2000} value={editor.summary||''} onChange={e=>setEditor(v=>({...v,summary:e.target.value}))}/></label>}
     <small>The change will be saved to Supabase only when you click Save. No publication state is changed.</small>
     {error&&<p className="live-authoring-alert" role="alert">{error}</p>}
     <div className="modal-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={()=>setEditor(null)}>Cancel</button><button type="submit" className="btn" disabled={saving}>{saving?'Saving…':'Save to Supabase'}</button></div>
    </form>
   </Modal>}
 </div>;
}
