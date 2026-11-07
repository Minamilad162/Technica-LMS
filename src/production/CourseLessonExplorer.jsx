import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,FileText,Layers3,LockKeyhole,Paperclip,PlayCircle,ShieldCheck,Video} from 'lucide-react';
import {loadLessonContent} from './lessonMediaApi.js';
import './courseLessonExplorer.css';

const ProtectedLessonViewer=React.lazy(()=>import('./ProtectedLessonViewer.jsx'));
const noProgress={};
const completed=p=>Boolean(p?.lesson_completed_at);
const percent=(done,total)=>total?Math.round(done*100/total):0;
const allLessons=outline=>outline.flatMap(d=>d.topics.flatMap(t=>t.lessons));
const hasAccess=(l,full,demo)=>Boolean(full||l.isFreeIntro||demo);

function Meter({done,total}){
 return <span className="cle-meter" aria-label={done+' of '+total+' lessons completed'}>
  <span className="cle-meter-track"><i style={{width:percent(done,total)+'%'}}/></span>
  <b>{percent(done,total)}%</b>
 </span>;
}
function Status({done}){return done?<CheckCircle2 className="cle-success" size={17} aria-label="Completed"/>:<span className="cle-pending" aria-label="Not completed"/>;}

export default function CourseLessonExplorer({db,userId,courseId,courseTitle,outline,full,demo=false,onSubscribe}){
 const lessons=useMemo(()=>allLessons(outline),[outline]);
 const [active,setActive]=useState(null),[tab,setTab]=useState('video');
 const [progress,setProgress]=useState(noProgress),[quizProgress,setQuizProgress]=useState({});
 const [statusError,setStatusError]=useState(''),[saving,setSaving]=useState('');
 const [blocks,setBlocks]=useState([]),[questions,setQuestions]=useState([]),[answers,setAnswers]=useState({});
 const [lessonLoading,setLessonLoading]=useState(false),[lessonError,setLessonError]=useState('');
 const [quizResult,setQuizResult]=useState(null),[openDomains,setOpenDomains]=useState({});
 const selected=lessons.find(l=>l.id===active);
 const previewOnly=Boolean(selected&&demo&&!full&&!selected.isFreeIntro);
 const accessible=selected&&(full||selected.isFreeIntro)&&!previewOnly;
 const fetchProgress=async()=>{
  if(!userId||!lessons.length)return;
  const {data,error}=await db.from('lms_lesson_progress')
   .select('lesson_id,reading_completed,video_completed,quiz_passed,lesson_completed_at')
   .eq('user_id',userId).in('lesson_id',lessons.map(l=>l.id));
  if(error)throw Error('Verified learning progress is temporarily unavailable.');
  setProgress(Object.fromEntries((data||[]).map(p=>[p.lesson_id,p])));
  const x=await db.rpc('lms_p22_my_steps',{p_course_id:courseId});
  if(!x.error&&Array.isArray(x.data))
   setQuizProgress(Object.fromEntries(x.data.map(row=>[row.lesson_id,row.quiz_completed===true])));
 };
 useEffect(()=>{
  let live=true;
  (async()=>{try{await fetchProgress();if(live)setStatusError('');}catch(e){if(live)setStatusError(e.message);}})();
  return()=>{live=false;};
 },[db,userId,courseId,lessons.length]);
 useEffect(()=>{
  if(!active||!accessible){setBlocks([]);setQuestions([]);return;}
  let live=true;setLessonLoading(true);setLessonError('');setQuizResult(null);setAnswers({});
  Promise.all([
   loadLessonContent(db,active),
   db.rpc('lms_p22_get_lesson_quiz',{p_lesson_id:active})
  ]).then(([content,result])=>{
   if(!live)return;
   setBlocks(content);
   if(result.error){setQuestions([]);setLessonError('Knowledge Check is not available until the P22 backend is installed.');}
   else setQuestions(Array.isArray(result.data)?result.data:[]);
   const first=content.some(b=>b.block_type==='video')?'video':
    content.some(b=>['text','heading'].includes(b.block_type))?'reading':
    (Array.isArray(result.data)&&result.data.length)?'quiz':'attachments';
   setTab(first);
  }).catch(e=>{if(live){setBlocks([]);setQuestions([]);setLessonError(e.message||'Could not load this lesson.');}})
   .finally(()=>{if(live)setLessonLoading(false);});
  return()=>{live=false;};
 },[db,active,accessible]);
 const section={video:blocks.filter(b=>b.block_type==='video'),
  reading:blocks.filter(b=>['text','heading'].includes(b.block_type)),
  attachments:blocks.filter(b=>b.block_type==='pdf')};
 const stepDone=(lesson,kind)=>kind==='video'?!!progress[lesson]?.video_completed:
  kind==='reading'?!!progress[lesson]?.reading_completed:!!quizProgress[lesson];
 const saveStep=async step=>{
  if(!selected||saving||stepDone(selected.id,step))return;
  setSaving(step);setStatusError('');
  try{
   const {data,error}=await db.rpc('lms_p22_complete_lesson_step',{
    p_lesson_id:selected.id,p_step:step
   });
   if(error||!data?.lesson_id)throw Error('Step completion could not be verified by Supabase.');
   setProgress(prev=>({...prev,[selected.id]:data}));
   await fetchProgress();
  }catch(e){setStatusError(e.message||'Your progress could not be saved. Please retry.');}
  finally{setSaving('');}
 };
 const submitQuiz=async()=>{
  if(!selected||saving||questions.length===0||
   questions.some(q=>!Number.isInteger(answers[q.id])))return;
  setSaving('quiz');setStatusError('');
  try{
   const responses=questions.map(q=>({id:q.id,selectedIndex:answers[q.id]}));
   const {data,error}=await db.rpc('lms_p22_submit_lesson_quiz',{
    p_lesson_id:selected.id,p_answers:responses
   });
   if(error||typeof data?.scorePercent!=='number')
    throw Error('Quiz could not be submitted securely. Please try again.');
   setQuizResult(data);
   setQuizProgress(old=>({...old,[selected.id]:true}));
   await fetchProgress();
  }catch(e){setStatusError(e.message||'Quiz submission failed.');}
  finally{setSaving('');}
 };
 const totals=lessons.length,finished=lessons.filter(l=>completed(progress[l.id])).length;
 const selectLesson=l=>{
  if(!hasAccess(l,full,demo)){onSubscribe?.();return;}
  setActive(l.id);
  setTab('video');
 };
 const tabInfo=[['video','Video',Video],['reading','Reading',BookOpen],['quiz','Knowledge Check',CheckCircle2],['attachments','Resources',Paperclip]];
 const selectedIndex=lessons.findIndex(l=>l.id===active);
 return <div className="cle-root">
  {!selected?<div className="cle-browser">
   <div className="cle-browser-head">
    <div><span className="cle-overline"><Layers3 size={14}/> YOUR LEARNING PATH</span>
     <h2>Choose a lesson</h2><p>Explore the lessons in {courseTitle}. Your progress is saved to your account.</p></div>
    <Meter done={finished} total={totals}/>
   </div>
   {statusError&&<p className="cle-error" role="alert">{statusError}</p>}
   {outline.map((d,di)=>{const dLessons=allLessons([d]),dDone=dLessons.filter(l=>completed(progress[l.id])).length;
    return <section className="cle-domain-section" key={d.id}>
     <header><div><span>DOMAIN {String(di+1).padStart(2,'0')}</span><h3>{d.title}</h3></div>
      <Meter done={dDone} total={dLessons.length}/></header>
     {d.topics.map((t,ti)=><div className="cle-topic-section" key={t.id}>
      <div className="cle-topic-title"><b>{String(di+1).padStart(2,'0')}.{String(ti+1).padStart(2,'0')} {t.title}</b>
       <small>{t.lessons.filter(l=>completed(progress[l.id])).length}/{t.lessons.length} completed</small></div>
      <div className="cle-grid">{t.lessons.map((l,li)=>{
       const unlocked=hasAccess(l,full,demo),done=completed(progress[l.id]);
       return <button type="button" key={l.id} className={'cle-card'+(done?' is-done':'')+(unlocked?'':' is-locked')}
        onClick={()=>selectLesson(l)} aria-label={(unlocked?'Open ':'Subscribe to unlock ')+l.title}>
        <span className="cle-card-art"><span>{done?<CheckCircle2 size={27}/>:unlocked?<BookOpen size={27}/>:<LockKeyhole size={24}/>}</span></span>
        <span className="cle-card-body"><small>LESSON {String(li+1).padStart(2,'0')}{l.isFreeIntro?' · FREE INTRO':''}</small>
         <strong>{l.title}</strong><span>{done?'Completed':unlocked?'Open lesson':'Subscription required'}
          {unlocked?<ArrowRight size={15}/>:<LockKeyhole size={14}/>}</span></span>
       </button>;})}</div>
     </div>)}
    </section>;})}
  </div>:<div className="cle-player">
   <div className="cle-player-head">
    <button className="cle-back" type="button" onClick={()=>setActive(null)}><ArrowLeft size={17}/> All lessons</button>
    <div><span>LEARNING JOURNEY</span><h2>{selected.title}</h2></div>
    <Meter done={finished} total={totals}/>
   </div>
   <div className="cle-player-layout">
    <aside className="cle-lesson-sidebar" aria-label="Lessons in this course">
     <div className="cle-outline-head"><BookOpen size={17}/><b>Course contents</b><small>{finished}/{totals}</small></div>
     {outline.map((d,di)=><section key={d.id}>
      <button className="cle-outline-domain" type="button"
       onClick={()=>setOpenDomains(prev=>({...prev,[d.id]:!prev[d.id]}))}>
       <Layers3 size={15}/><span>Domain {di+1} · {d.title}</span>
       {openDomains[d.id]?<ChevronRight size={15}/>:<ChevronDown size={15}/>}</button>
      {!openDomains[d.id]&&d.topics.map((t,ti)=><div key={t.id}>
       <div className="cle-outline-topic">Topic {di+1}.{ti+1} · {t.title}</div>
       {t.lessons.map(l=><button type="button" key={l.id}
        className={'cle-outline-lesson'+(l.id===active?' current':'')} aria-current={l.id===active?'step':undefined}
        onClick={()=>selectLesson(l)}>
        {completed(progress[l.id])?<CheckCircle2 size={16} className="cle-success"/>:
         hasAccess(l,full,demo)?<span className="cle-small-dot"/>:<LockKeyhole size={15}/>}
        <span>{l.title}</span>{l.id===active&&<ChevronRight size={15}/>}</button>)}
      </div>)}
     </section>)}
    </aside>
    <main className="cle-lesson-main">
     {previewOnly?<div className="lj-demo-banner" role="status">This is a local preview of the lesson outline. Video, PDF and Knowledge Check remain protected until your platform subscription is active.</div>:<>
     <div className="cle-steps" role="tablist" aria-label="Lesson activities">
      {tabInfo.map(([key,name,Icon])=><button type="button" role="tab" key={key}
       aria-selected={tab===key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>
       {key!=='attachments'&&stepDone(selected.id,key)?<CheckCircle2 className="cle-success" size={16}/>:<Icon size={16}/>}
       {name}</button>)}
     </div>
     {statusError&&<p className="cle-error" role="alert">{statusError}</p>}
     {lessonLoading?<div className="cle-notice" role="status">Loading your protected lesson…</div>:
      tab==='video'?<div className="cle-activity">
       <div className="cle-activity-title"><h3>Watch & learn</h3><small>{stepDone(selected.id,'video')?'Completed ✓':'Watch each video until the end'}</small></div>
       {section.video.length?<React.Suspense fallback={<div className="cle-notice">Opening protected player…</div>}>
        {section.video.map(b=><ProtectedLessonViewer key={b.id} db={db} lessonId={selected.id}
         block={b} viewerId={userId.slice(0,8)} onWatched={()=>saveStep('video')}/>)}
       </React.Suspense>:<div className="cle-notice"><Video size={22}/> No video has been published for this lesson.</div>}
      </div>:tab==='reading'?<div className="cle-activity">
       <div className="cle-activity-title"><h3>Study material</h3><small>{stepDone(selected.id,'reading')?'Completed ✓':'Scroll through the content to complete this step'}</small></div>
       {section.reading.length?<div className="cle-reading" key={selected.id}
        onScroll={e=>{const el=e.currentTarget;if(el.scrollTop>15&&el.scrollTop+el.clientHeight>=el.scrollHeight-15)saveStep('reading');}}
        tabIndex={0} aria-label="Scrollable reading material">
        {section.reading.map(b=>b.block_type==='heading'?<h3 key={b.id}>{b.payload?.body||b.payload?.text||''}</h3>:
         <p key={b.id}>{b.payload?.body||b.payload?.text||''}</p>)}
        <div className="cle-reading-end"><CheckCircle2 size={16}/> End of reading</div>
       </div>:<div className="cle-notice"><FileText size={22}/> No reading material has been published yet.</div>}
      </div>:tab==='quiz'?<div className="cle-activity">
       <div className="cle-activity-title"><h3>Knowledge Check</h3><small>Answer every question to finish. Incorrect answers still count as completing the activity.</small></div>
       {lessonError&&<p className="cle-error" role="alert">{lessonError}</p>}
       {!questions.length?<div className="cle-notice"><CheckCircle2 size={22}/> No Knowledge Check has been published for this lesson.</div>:
       quizResult?<div className="cle-quiz-result"><CheckCircle2 size={30}/><h3>Knowledge Check completed</h3>
        <p>You answered all {questions.length} questions. Your score is {quizResult.scorePercent}%.</p>
        <button type="button" onClick={()=>{setAnswers({});setQuizResult(null);}}>Try again</button></div>:
       <div className="cle-quiz-list">{questions.map((q,i)=><fieldset key={q.id} className="cle-question">
        <legend><span>QUESTION {i+1} OF {questions.length}</span><strong>{q.prompt}</strong></legend>
        {q.options.map((choice,idx)=><label key={idx} className={answers[q.id]===idx?'chosen':''}>
         <input type="radio" name={'q-'+q.id} checked={answers[q.id]===idx} onChange={()=>setAnswers(prev=>({...prev,[q.id]:idx}))}/>
         {choice}</label>)}
       </fieldset>)}
       <button className="cle-submit" type="button" disabled={!!saving||questions.some(q=>!Number.isInteger(answers[q.id]))}
        onClick={submitQuiz}>Submit all answers <ArrowRight size={16}/></button></div>}
      </div>:<div className="cle-activity"><div className="cle-activity-title"><h3>Lesson resources</h3><small>Optional attachments</small></div>
       {section.attachments.length?<React.Suspense fallback={<div className="cle-notice">Loading protected resources…</div>}>
        {section.attachments.map(b=><div key={b.id} className="cle-resource">
         <strong><Paperclip size={16}/>{b.payload?.title||'Protected PDF'}</strong>
         <ProtectedLessonViewer db={db} lessonId={selected.id} block={b} viewerId={userId.slice(0,8)}/>
        </div>)}</React.Suspense>:
        <div className="cle-notice"><Paperclip size={22}/> No attachments for this lesson.</div>}
      </div>}
     </>}
     <footer className="cle-player-footer">
      <span><ShieldCheck size={15}/> Only server-confirmed progress receives a green check.</span>
      <div><button type="button" disabled={selectedIndex<=0} onClick={()=>selectLesson(lessons[selectedIndex-1])}><ArrowLeft size={15}/> Previous</button>
       <button type="button" disabled={selectedIndex>=lessons.length-1} onClick={()=>selectLesson(lessons[selectedIndex+1])}>
        Next lesson <ArrowRight size={15}/></button></div>
     </footer>
    </main>
   </div>
  </div>}
 </div>;
}
