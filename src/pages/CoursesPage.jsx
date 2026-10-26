import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpen,CalendarClock,ChevronDown,ChevronRight,CheckCircle2,Clock3,FileText,Film,Layers3,Plus,Pencil,ArrowRight,Archive,CalendarDays} from 'lucide-react';
import {useDemo} from '../lib/store';
import {allAdminCourses,courseMediaFor,courseStatus,validateCourse} from '../lib/adminCourses';
import {questionPool} from '../data/mock';
import {Modal} from '../components/UI';

const EMPTY={name:'',category:'Engineering',description:'',status:'draft',publishAt:''};
const prettyDate=date=>date?new Date(date).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not scheduled';
const localDate=date=>{
  if(!date)return '';
  const d=new Date(date);if(!Number.isFinite(d.getTime()))return '';
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
};

export default function CoursesPage(){
  const {state,createAdminCourse,editAdminCourse,notify}=useDemo();
  const navigate=useNavigate();
  const [filter,setFilter]=useState('all'),[expanded,setExpanded]=useState(null);
  const [editing,setEditing]=useState(null),[form,setForm]=useState(EMPTY),[error,setError]=useState('');
  // Update status when a scheduled course crosses its local-time publication date.
  const [clock,setClock]=useState(Date.now());
  React.useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer)},[]);
  const all=allAdminCourses(state);
  const visible=all.filter(c=>filter==='all'||courseStatus(c,clock)===filter);
  const openForm=(course=null)=>{
    setEditing(course?.id||'new');
    setForm(course?{name:course.name,category:course.category||'',description:course.description||'',status:course.status||'draft',publishAt:localDate(course.publishAt)}:EMPTY);
    setError('');
  };
  function submit(e){
    e.preventDefault();
    const rawDate=new Date(form.publishAt||'');
    const values={...form,publishAt:form.status==='scheduled'&&Number.isFinite(rawDate.getTime())?rawDate.toISOString():null};
    const issue=validateCourse(values,all,editing==='new'?null:editing);
    if(issue){setError(issue);return}
    const id=editing==='new'?createAdminCourse(values):editAdminCourse(editing,values);
    if(id){setExpanded(id);setEditing(null)}
  }
  const changeStatus=(c,status)=>{
    editAdminCourse(c.id,{status,publishAt:null});
    notify(status==='published'?`${c.name} published in this demo`:`${c.name} moved to drafts`);
  };
  return <div className="page-enter admin-courses-page">
    <div className="admin-page-heading"><div><span className="eyebrow">COURSE MANAGEMENT</span><h1>Courses</h1><p className="page-subtitle">Browse, edit, schedule and publish your courses. Changes are saved in this browser's demo workspace.</p></div><button className="btn" onClick={()=>openForm()}><Plus size={17}/>Create course</button></div>
    <div className="admin-course-filters" role="group" aria-label="Filter courses by publication status">{[['all','All courses'],['published','Published'],['draft','Drafts'],['scheduled','Scheduled']].map(([v,label])=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{label} <span>{v==='all'?all.length:all.filter(c=>courseStatus(c,clock)===v).length}</span></button>)}</div>
    <div className="admin-course-list">
    {visible.map(course=>{
      const status=courseStatus(course,clock),open=expanded===course.id;
      const questions=questionPool.filter(q=>course.domainIds?.includes(q.domainId)).length;
      const materials=courseMediaFor(state,course.id);
      return <section key={course.id} className={`admin-course-card ${open?'is-open':''}`}>
        <button type="button" className="admin-course-main" aria-expanded={open} onClick={()=>setExpanded(open?null:course.id)}>
          <div className="admin-course-icon"><BookOpen size={22}/></div>
          <div className="admin-course-title"><strong>{course.name}</strong><small>{course.category||course.subtitle||'General course'}</small></div>
          <span className={`admin-status status-${status}`}>{status==='published'?'Published':status==='scheduled'?'Scheduled':'Draft'}</span>
          <span className="admin-course-count">{questions} questions</span>
          {open?<ChevronDown size={20}/>:<ChevronRight size={20}/>}
        </button>
        {open&&<div className="admin-course-detail">
          <p>{course.description||'No course description yet.'}</p>
          <div className="admin-course-mini-grid"><div><Layers3 size={18}/><strong>{course.domainIds?.length||0}</strong><span>Domains</span></div><div><FileText size={18}/><strong>{materials.filter(m=>m.kind==='pdf').length}</strong><span>PDF resources</span></div><div><Film size={18}/><strong>{materials.filter(m=>m.kind==='video').length}</strong><span>Videos</span></div><div><CalendarClock size={18}/><strong>{status==='scheduled'?'Scheduled':status==='published'?'Live':'Not published'}</strong><span>{status==='scheduled'?prettyDate(course.publishAt):'Publication'}</span></div></div>
          <div className="admin-course-actions"><button className="btn btn-secondary" onClick={()=>openForm(course)}><Pencil size={16}/>Edit details</button><button className="btn" onClick={()=>navigate(`/builder?courseId=${encodeURIComponent(course.id)}`)}><Layers3 size={16}/>Open Course Builder <ArrowRight size={16}/></button><button className="btn btn-secondary" onClick={()=>changeStatus(course,status==='published'?'draft':'published')}>{status==='published'?<Archive size={16}/>:<CheckCircle2 size={16}/>} {status==='published'?'Move to draft':'Publish now'}</button></div>
          {status==='scheduled'&&<small className="admin-schedule-note"><CalendarDays size={14}/>Scheduled for {prettyDate(course.publishAt)} (local browser time). Actual server scheduling will require backend integration.</small>}
          {!questions&&<small className="admin-schedule-note">No question bank attached yet. This course cannot launch Practice or Assessment until questions are added.</small>}
        </div>}
      </section>
    })}
    {!visible.length&&<div className="white-panel admin-empty">No courses in this status. Use Create course to add one.</div>}
    </div>
    {editing&&<Modal title={editing==='new'?'Create course':'Edit course'} onClose={()=>setEditing(null)}><form className="simple-fields" onSubmit={submit}>
      <label>Course name<input required minLength={3} value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} placeholder="e.g. PSM Leadership"/></label>
      <label>Category<input value={form.category} onChange={e=>setForm(s=>({...s,category:e.target.value}))}/></label>
      <label>Description<textarea value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))}/></label>
      <label>Publication status<select value={form.status} onChange={e=>setForm(s=>({...s,status:e.target.value}))}><option value="draft">Save as draft</option><option value="scheduled">Schedule publication</option><option value="published">Publish now</option></select></label>
      {form.status==='scheduled'&&<label>Publish date and time<input required type="datetime-local" value={form.publishAt} onChange={e=>setForm(s=>({...s,publishAt:e.target.value}))}/></label>}
      {error&&<p className="admin-form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="btn btn-secondary" type="button" onClick={()=>setEditing(null)}>Cancel</button><button className="btn" type="submit">{editing==='new'?'Create course':'Save changes'}</button></div>
    </form></Modal>}
  </div>
}
