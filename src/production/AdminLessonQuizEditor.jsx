import React,{useEffect,useState} from 'react';
import {AlertCircle,CheckCircle2,FileQuestion,Plus,Save,Trash2} from 'lucide-react';

const blank=()=>({prompt:'',options:['','','',''],correct_index:0,is_published:false});
const isValid=q=>q.prompt.trim().length>=8&&q.prompt.trim().length<=1000
 &&q.options.length>=2&&q.options.length<=6
 &&q.options.every(x=>x.trim().length>0)
 &&Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<q.options.length;

export default function AdminLessonQuizEditor({db,lessonId}){
 const [items,setItems]=useState([]),[editing,setEditing]=useState(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const reload=async()=>{
  const {data,error}=await db.from('lms_p22_lesson_quiz_questions')
   .select('id,lesson_id,prompt,options,correct_index,is_published,position')
   .eq('lesson_id',lessonId).order('position',{ascending:true});
  if(error)throw Error('P22 quiz editor requires its Staging migration and verified LMS Admin permission.');
  setItems(data||[]);
 };
 useEffect(()=>{
  let active=true;
  setEditing(null);setLoading(true);setError('');setNotice('');
  reload().catch(e=>{if(active)setError(e.message);})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,lessonId]);
 const save=async e=>{
  e.preventDefault();if(!editing||saving||!isValid(editing))return;
  setSaving(true);setError('');setNotice('');
  try{
   const payload={lesson_id:lessonId,prompt:editing.prompt.trim(),
    options:editing.options.map(v=>v.trim()),correct_index:editing.correct_index,
    is_published:!!editing.is_published,position:editing.position??items.length};
   const action=editing.id?db.from('lms_p22_lesson_quiz_questions')
    .update(payload).eq('id',editing.id):db.from('lms_p22_lesson_quiz_questions').insert(payload);
   const {data,error}=await action.select('id').single();
   if(error||!data?.id)throw Error('Could not save this question. Verify your Admin role and P22 installation.');
   await reload();setEditing(null);setNotice('Knowledge Check question saved.');
  }catch(err){setError(err.message||'Quiz question was not saved.');}
  finally{setSaving(false);}
 };
 const remove=async q=>{
  if(saving||!window.confirm('Delete this Knowledge Check question?'))return;
  setSaving(true);setError('');
  try{
   const {error}=await db.from('lms_p22_lesson_quiz_questions')
    .delete().eq('id',q.id).eq('lesson_id',lessonId);
   if(error)throw Error('Question deletion denied. Check Admin permissions.');
   await reload();setEditing(null);
  }catch(err){setError(err.message);}
  finally{setSaving(false);}
 };
 return <section className="p22-admin-quiz">
  <div className="p22-admin-quiz-head"><div><strong><FileQuestion size={16}/> Lesson Knowledge Check</strong>
   <small>{items.length} questions · Learners must answer every published question</small></div>
   <button type="button" className="btn btn-secondary" onClick={()=>setEditing(blank())} disabled={saving||loading}><Plus size={14}/> Add question</button></div>
  {error&&<p className="live-authoring-alert" role="alert"><AlertCircle size={15}/>{error}</p>}
  {notice&&<p className="live-authoring-success" role="status"><CheckCircle2 size={15}/>{notice}</p>}
  {loading?<p>Loading quiz questions…</p>:items.length?<div className="p22-admin-quiz-rows">
   {items.map((q,i)=><div key={q.id}>
    <div><b>{i+1}. {q.prompt}</b><small>{q.is_published?'Published · visible in learner quiz':'Draft · not visible to learners'}</small></div>
    <button type="button" disabled={saving} onClick={()=>setEditing({...q,options:[...q.options]})}>Edit</button>
    <button type="button" disabled={saving} aria-label={'Delete '+q.prompt} onClick={()=>remove(q)}><Trash2 size={14}/></button>
   </div>)}</div>:<p>No quiz questions yet. You can add and publish them here.</p>}
  {editing&&<form className="p22-admin-quiz-form" onSubmit={save}>
   <label>Question<textarea rows={3} maxLength={1000} value={editing.prompt}
    onChange={e=>setEditing(x=>({...x,prompt:e.target.value}))}/></label>
   <div className="p22-admin-quiz-options">
    {editing.options.map((v,i)=><label key={i}>
     <input type="radio" name={'p22-correct-'+lessonId} checked={editing.correct_index===i}
      onChange={()=>setEditing(x=>({...x,correct_index:i}))} title="Correct answer"/>
     <span>Option {i+1}</span><input value={v} maxLength={400} onChange={e=>setEditing(x=>({...x,
      options:x.options.map((s,j)=>j===i?e.target.value:s)}))}/></label>)}
   </div>
   <div className="p22-admin-quiz-form-foot">
    <label><input type="checkbox" checked={!!editing.is_published}
     onChange={e=>setEditing(x=>({...x,is_published:e.target.checked}))}/> Publish question</label>
    <div><button type="button" className="btn btn-secondary" onClick={()=>setEditing(null)} disabled={saving}>Cancel</button>
     <button type="submit" className="btn" disabled={!isValid(editing)||saving}><Save size={14}/>{saving?'Saving…':'Save question'}</button></div>
   </div>
  </form>}
 </section>;
}
