import React,{useCallback,useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertCircle,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,Database,Layers3,Plus,RefreshCw,Pencil,ShieldCheck} from 'lucide-react';
import {Modal} from '../components/UI';
import {useLiveAdminAuthoring} from './useLiveAdminAuthoring';
import {addDraftCourse,liveCourses,liveCourseTree,updateAuthoringCourse} from './liveAuthoringApi';
import './liveAuthoring.css';

const emptyForm={title:'',summary:''};
export default function LiveCoursesPage(){
 const navigate=useNavigate();
 const {db,status,message,retry}=useLiveAdminAuthoring();
 const [courses,setCourses]=useState([]),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState('all');
 const [expanded,setExpanded]=useState(null),[counts,setCounts]=useState(null);
 const [editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm),[saving,setSaving]=useState(false);
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
  if(status!=='ready'||!db)return;
  let active=true;setLoading(true);setError('');
  liveCourses(db).then(rows=>{if(active)setCourses(rows);})
   .catch(err=>{if(active)setError(err.message||'Failed to load live courses.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[status,db,revision]);
 useEffect(()=>{
  if(!expanded||status!=='ready')return;
  let active=true;setCounts(null);
  liveCourseTree(db,expanded).then(tree=>{if(active)setCounts({
   courseId:expanded,domains:tree.length,
   topics:tree.reduce((a,d)=>a+d.topics.length,0),
   lessons:tree.reduce((a,d)=>a+d.topics.reduce((b,t)=>b+t.lessons.length,0),0)
  });}).catch(err=>{if(active)setCounts({courseId:expanded,error:err.message});});
  return()=>{active=false;};
 },[db,expanded,status,revision]);
 const openEdit=course=>{setEditing(course||'new');setForm(course?{title:course.title,summary:course.summary||''}:emptyForm);setError('');};
 const save=async e=>{
  e.preventDefault();if(saving)return;
  setSaving(true);setError('');setNotice('');
  try{
   const item=editing==='new'?await addDraftCourse(db,form.title,form.summary,courses):
    await updateAuthoringCourse(db,editing.id,form.title,form.summary);
   setNotice(editing==='new'?'Draft course created in Supabase.':'Course details saved in Supabase.');
   if(editing==='new')setExpanded(item.id);
   setEditing(null);refresh();
  }catch(err){setError(err.message||'The change could not be saved.');}
  finally{setSaving(false);}
 };
 if(status!=='ready')return <div className="live-authoring-container"><div className="live-authoring-state" role={status==='error'?'alert':'status'}>
  <Database size={27}/><h2>{status==='checking'?'Verifying live Admin access…':'Supabase Admin connection required'}</h2>
  <p>{message||'Checking your authenticated profile and server-issued Admin role.'}</p>
  {status==='error'&&<button className="btn" onClick={retry}><RefreshCw size={16}/> Retry verification</button>}
 </div></div>;
 const visible=courses.filter(c=>filter==='all'||c.publication_state===filter);
 return <div className="page-enter admin-courses-page live-authoring-container">
  <div className="admin-page-heading"><div><span className="eyebrow">COURSE MANAGEMENT</span><h1>Courses</h1>
   <p className="page-subtitle">Your course catalog. New courses stay <b>Draft</b> until a separate publication review.</p>
  </div><div className="live-authoring-heading-actions"><button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="btn" onClick={()=>openEdit(null)}><Plus size={17}/> Create course</button></div></div>
  <div className="live-authoring-banner"><ShieldCheck size={17}/><span>Manage your course content and publication status.</span></div>
  {error&&!editing&&<div className="live-authoring-alert" role="alert"><AlertCircle size={16}/>{error}</div>}
  {notice&&<div className="live-authoring-success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
  <div className="admin-course-filters" role="group" aria-label="Filter live courses">{[['all','All courses'],['draft','Drafts'],['published','Published'],['archived','Archived']].map(([id,label])=>
   <button type="button" className={id===filter?'active':''} onClick={()=>setFilter(id)} key={id}>{label} <span>{id==='all'?courses.length:courses.filter(c=>c.publication_state===id).length}</span></button>)}</div>
  {loading?<div className="white-panel admin-empty" role="status">Loading courses from Supabase…</div>:
   <div className="admin-course-list">{visible.map(course=>{
    const isOpen=expanded===course.id;
    const detail=counts?.courseId===course.id?counts:null;
    return <section className={`admin-course-card ${isOpen?'is-open':''}`} key={course.id}>
     <button className="admin-course-main" aria-expanded={isOpen} onClick={()=>setExpanded(isOpen?null:course.id)} type="button">
      <div className="admin-course-icon"><BookOpen size={22}/></div>
      <div className="admin-course-title"><strong>{course.title}</strong><small>{course.slug}</small></div>
      <span className={`admin-status status-${course.publication_state}`}>{course.publication_state}</span>
      <span className="admin-course-count">Supabase</span>
      {isOpen?<ChevronDown size={19}/>:<ChevronRight size={19}/>}
     </button>
     {isOpen&&<div className="admin-course-detail">
      <p>{course.summary||'No course description added yet.'}</p>
      {detail?.error&&<p role="alert" className="live-authoring-alert">{detail.error}</p>}
      <div className="admin-course-mini-grid">
       <div><Layers3 size={18}/><strong>{detail?.domains??'–'}</strong><span>Domains</span></div>
       <div><Layers3 size={18}/><strong>{detail?.topics??'–'}</strong><span>Topics</span></div>
       <div><BookOpen size={18}/><strong>{detail?.lessons??'–'}</strong><span>Lessons</span></div>
      </div>
      <div className="admin-course-actions">
       <button className="btn btn-secondary" onClick={()=>openEdit(course)}><Pencil size={16}/> Edit details</button>
       <button className="btn" onClick={()=>navigate('/builder?courseId='+encodeURIComponent(course.id))}><Layers3 size={17}/> Open Course Builder <ArrowRight size={16}/></button>
      </div>
      <small className="live-authoring-footnote">Publication, scheduling, protected media and question-bank approval are separate release steps. No delete is available in this phase.</small>
     </div>}
    </section>;
   })}
   {!visible.length&&<div className="white-panel admin-empty">{courses.length?'No courses match the selected status.':'No live courses yet. Create the first Draft course using the button above.'}</div>}
   </div>}
  {editing&&<Modal title={editing==='new'?'Create Supabase Draft course':'Edit Supabase course details'} onClose={()=>{if(!saving)setEditing(null);}}>
   <form className="simple-fields" onSubmit={save}>
    <label>Course title<input autoFocus required maxLength={180} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label>
    <label>Course description<textarea rows={4} maxLength={2000} value={form.summary} onChange={e=>setForm(v=>({...v,summary:e.target.value}))}/></label>
    <small>{editing==='new'?'The course will be created as Draft in the real database.':'Existing course publishing status will not be changed.'}</small>
    {error&&<p role="alert" className="live-authoring-alert">{error}</p>}
    <div className="modal-actions"><button className="btn btn-secondary" disabled={saving} type="button" onClick={()=>setEditing(null)}>Cancel</button><button className="btn" type="submit" disabled={saving}>{saving?'Saving…':editing==='new'?'Create draft':'Save changes'}</button></div>
   </form>
  </Modal>}
 </div>;
}
