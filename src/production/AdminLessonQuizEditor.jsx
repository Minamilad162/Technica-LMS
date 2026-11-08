import React,{useEffect,useState} from 'react';
import {AlertCircle,CheckCircle2,FileQuestion,Plus,Save,Trash2} from 'lucide-react';
import {attachBankToLesson,listCourseBank} from './courseQuestionBankApi.js';
import './adminLessonQuiz.css';

const blank=()=>({prompt:'',options:['','','',''],correct_index:0,is_published:false});
const isValid=q=>q.prompt.trim().length>=8&&q.prompt.trim().length<=1000
 &&q.options.length>=2&&q.options.length<=6
 &&q.options.every(x=>x.trim().length>0)
 &&Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<q.options.length;

export default function AdminLessonQuizEditor({db,lessonId,courseId}){
 const [items,setItems]=useState([]),[editing,setEditing]=useState(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [picker,setPicker]=useState(false),[search,setSearch]=useState(''),[query,setQuery]=useState('');
 const [page,setPage]=useState(0),[bank,setBank]=useState({items:[],total:0}),[bankLoading,setBankLoading]=useState(false);
 const [domains,setDomains]=useState([]),[domainFilter,setDomainFilter]=useState(''),[difficulty,setDifficulty]=useState('');
 const publishedCount=items.filter(q=>q.is_published).length;
 const pendingCount=items.length-publishedCount;
 const reload=async()=>{
  const {data,error}=await db.from('lms_p22_lesson_quiz_questions')
   .select('*').eq('lesson_id',lessonId).order('position',{ascending:true});
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
 useEffect(()=>{setPicker(false);setSearch('');setQuery('');setPage(0);setDomainFilter('');setDifficulty('');},[courseId,lessonId]);
 useEffect(()=>{
  if(!courseId)return;
  let active=true;
  db.from('lms_domains').select('id,title').eq('course_id',courseId).order('position')
   .then(({data,error})=>{if(active)setDomains(error?[]:data||[]);});
  return()=>{active=false;};
 },[db,courseId]);
 useEffect(()=>{
  if(!picker||!courseId)return;
  let active=true;setBankLoading(true);
  listCourseBank(db,courseId,{search:query,offset:page,limit:50,domainId:domainFilter||null,difficulty,usage:'eligible'})
   .then(data=>{if(active)setBank(data);})
   .catch(e=>{if(active)setError('Course Question Bank unavailable: '+(e.message||'Check P28'));})
   .finally(()=>{if(active)setBankLoading(false);});
  return()=>{active=false;};
 },[db,courseId,picker,query,page,domainFilter,difficulty]);
 const addFromBank=async q=>{
  if(saving||q.mockExclusive||q.mockCandidate||!q.isActive||q.approvalState==='archived')return;
  setSaving(true);setError('');setNotice('');
  try{
   await attachBankToLesson(db,lessonId,q.id,q.approvalState==='approved');
   await reload();setPicker(false);setNotice('Selected Course Bank question linked to this Lesson Quiz.');
  }catch(e){setError(e.message||'Could not link the selected question.');}
  finally{setSaving(false);}
 };
 const publishLinked=async q=>{
  if(saving)return;setSaving(true);setError('');setNotice('');
  try{
   const {error}=await db.from('lms_p22_lesson_quiz_questions')
    .update({is_published:!q.is_published}).eq('id',q.id).eq('lesson_id',lessonId);
   if(error)throw Error(error.message);
   await reload();setNotice(q.is_published?'Bank question unpublished.':'Bank question published to eligible learners.');
  }catch(e){setError(e.message||'Only approved non-Mock questions can be published.');}
  finally{setSaving(false);}
 };
 const save=async e=>{
  e.preventDefault();if(!editing?.id||saving||!isValid(editing))return;
  setSaving(true);setError('');setNotice('');
  try{
   const payload={lesson_id:lessonId,prompt:editing.prompt.trim(),
    options:editing.options.map(v=>v.trim()),correct_index:editing.correct_index,
    is_published:!!editing.is_published,position:editing.position??items.length};
   const action=db.from('lms_p22_lesson_quiz_questions').update(payload).eq('id',editing.id);
   const {data,error}=await action.select('id').single();
   if(error||!data?.id)throw Error('Could not save this question. Verify Admin permissions and P22 installation.');
   await reload();setEditing(null);setNotice('Lesson Quiz question saved.');
  }catch(err){setError(err.message||'Quiz question was not saved.');}
  finally{setSaving(false);}
 };
 const remove=async q=>{
  if(saving||!window.confirm('Remove this question from the Lesson Quiz? The Course Bank original is retained.'))return;
  setSaving(true);setError('');setNotice('');
  try{
   const {error}=await db.from('lms_p22_lesson_quiz_questions')
    .delete().eq('id',q.id).eq('lesson_id',lessonId);
   if(error)throw Error(error.message||'Question unlink denied.');
   await reload();setEditing(null);setNotice('Question removed from Lesson Quiz. Original Course Bank question remains intact.');
  }catch(err){setError(err.message);}
  finally{setSaving(false);}
 };
 return <section className="p22-admin-quiz">
  <div className="p22-admin-quiz-head"><div><strong><FileQuestion size={16}/> Lesson Quiz</strong>
   <small>{publishedCount} published to learners · {pendingCount} not published · {items.length} saved in this Lesson</small></div>
   <div className="p28-quiz-head-actions">
    {courseId&&<button type="button" className="btn" onClick={()=>{setPicker(v=>!v);setEditing(null);}} disabled={saving||loading}><FileQuestion size={14}/> Choose from Course Bank</button>}

   </div></div>
  {error&&<p className="live-authoring-alert" role="alert"><AlertCircle size={15}/>{error}</p>}
  {notice&&<p className="live-authoring-success" role="status"><CheckCircle2 size={15}/>{notice}</p>}
  {items.length>0&&publishedCount===0&&<p className="live-authoring-alert" role="status">
   This Lesson has saved Quiz questions, but none are published. Learners will see 0 questions until you approve the Drafts and publish the eligible Quiz entries.
   Review the question in the Course Bank, then click Publish below. Reopen the Learner Quiz to check.
  </p>}
  {picker&&<section className="p28-quiz-picker">
   <form onSubmit={e=>{e.preventDefault();setQuery(search.trim());setPage(0);}}>
    <input placeholder="Search your Course Question Bank" aria-label="Search Course Bank" value={search} onChange={e=>setSearch(e.target.value)}/>
    <button className="btn btn-secondary" type="submit">Search</button></form>
   <div className="p28-quiz-bank-filters">
    <label>Domain<select aria-label="Filter Lesson Quiz by domain" value={domainFilter} onChange={e=>{setDomainFilter(e.target.value);setPage(0);}}>
     <option value="">All course domains</option>
     {domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
    </select></label>
    <label>Difficulty<select aria-label="Filter Lesson Quiz by difficulty" value={difficulty} onChange={e=>{setDifficulty(e.target.value);setPage(0);}}>
     <option value="">Any difficulty</option><option value="unclassified">Unclassified</option><option value="low">Low</option>
     <option value="medium">Medium</option><option value="high">High</option>
    </select></label>
   </div>
   <small>Choose existing questions from this Course Question Bank. Approved questions publish immediately; Drafts remain hidden. Mock-only questions are excluded.</small>
   {bankLoading?<p>Loading questions…</p>:<div className="p28-quiz-choices">
    {bank.items.filter(q=>!q.mockExclusive&&!q.mockCandidate&&q.isActive&&q.approvalState!=='archived').map(q=><div key={q.id}>
     <span><b>{q.prompt}</b><small>{q.approvalState} · {q.sourceId}</small></span>
     <button type="button" className="btn btn-secondary"
      disabled={saving||items.some(item=>item.bank_question_id===q.id)}
      onClick={()=>addFromBank(q)}>{items.some(item=>item.bank_question_id===q.id)?'Linked':'Add to Quiz'}</button>
    </div>)}
    {!bank.items.length&&<p>No matching Course Bank questions.</p>}
   </div>}
   <div className="p28-quiz-pagination"><button type="button" className="btn btn-secondary" disabled={bankLoading||page===0} onClick={()=>setPage(n=>Math.max(0,n-50))}>Previous</button>
    <span>{Math.floor(page/50)+1} / {Math.max(1,Math.ceil(bank.total/50))}</span>
    <button type="button" className="btn btn-secondary" disabled={bankLoading||page+50>=bank.total} onClick={()=>setPage(n=>n+50)}>Next</button></div>
  </section>}
  {loading?<p>Loading quiz questions…</p>:items.length?<div className="p22-admin-quiz-rows">
   {items.map((q,i)=><div key={q.id}>
    <div><b>{i+1}. {q.prompt}</b><small>{q.bank_question_id?'Course Bank · ':''}{q.is_published?'Published · visible in learner Quiz':'Not published · learner cannot see it yet'}</small></div>
    {q.bank_question_id?<button type="button" disabled={saving} onClick={()=>publishLinked(q)}>{q.is_published?'Unpublish':'Publish'}</button>:
     <button type="button" disabled={saving} onClick={()=>setEditing({...q,options:[...q.options]})}>Edit</button>}
    <button type="button" disabled={saving} aria-label={'Remove '+q.prompt} onClick={()=>remove(q)}><Trash2 size={14}/></button>
   </div>)}</div>:<p>No quiz questions yet. Select questions from the ASP / Course Question Bank; questions are authored only in the Bank.</p>}
  {editing?.id&&!editing.bank_question_id&&<form className="p22-admin-quiz-form" onSubmit={save}>
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
