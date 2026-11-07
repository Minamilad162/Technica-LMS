import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,FileText,Layers3,LockKeyhole,Paperclip,PlayCircle,ShieldCheck,Video} from 'lucide-react';
import {loadLessonContent} from './lessonMediaApi.js';
import './courseLessonExplorer.css';

const ProtectedLessonViewer=React.lazy(()=>import('./ProtectedLessonViewer.jsx'));
const noProgress={};
const completed=p=>Boolean(p?.lesson_completed_at);
const percent=(done,total)=>total?Math.round(done*100/total):0;
const allLessons=outline=>outline.flatMap(d=>d.topics.flatMap(t=>t.lessons));
const hasAccess=(l,full,demo)=>Boolean(full||l.isFreeIntro||demo);

function Meter({done,total,preview=false}){
 if(preview)return <span className="cle-meter cle-meter-preview" aria-label={total+' lessons in Admin preview'}>
  <b>Preview · {total} lessons</b></span>;
 return <span className="cle-meter" aria-label={done+' of '+total+' lessons completed'}>
  <span className="cle-meter-track"><i style={{width:percent(done,total)+'%'}}/></span>
  <b>{percent(done,total)}%</b>
 </span>;
}
function Status({done}){return done?<CheckCircle2 className="cle-success" size={17} aria-label="Completed"/>:<span className="cle-pending" aria-label="Not completed"/>;}

export default function CourseLessonExplorer({db,userId='',courseId,courseTitle,outline,full,demo=false,onSubscribe,adminPreview=false,initialLessonId=''}){
 const lessons=useMemo(()=>allLessons(outline),[outline]);
 const [active,setActive]=useState(initialLessonId||null),[currentSection,setCurrentSection]=useState('video');
 const [progress,setProgress]=useState(noProgress),[quizProgress,setQuizProgress]=useState({});
 const [statusError,setStatusError]=useState(''),[saving,setSaving]=useState('');
 const [blocks,setBlocks]=useState([]),[questions,setQuestions]=useState([]),[answers,setAnswers]=useState({});
 const [lessonLoading,setLessonLoading]=useState(false),[lessonError,setLessonError]=useState('');
 const playerHeadingRef=useRef(null),videoSectionRef=useRef(null),materialSectionRef=useRef(null),quizSectionRef=useRef(null);
 const readingEnd=useRef(null),watchedVideos=useRef(new Set());
 const [quizResult,setQuizResult]=useState(null),[openDomains,setOpenDomains]=useState({});
 const selected=lessons.find(l=>l.id===active);
 const previewOnly=Boolean(selected&&demo&&!full&&!selected.isFreeIntro);
 const accessible=selected&&(full||selected.isFreeIntro)&&!previewOnly;
 const fetchProgress=async()=>{
  if(adminPreview||!userId||!lessons.length)return;
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
  if(adminPreview)return;
  let live=true;
  (async()=>{try{await fetchProgress();if(live)setStatusError('');}catch(e){if(live)setStatusError(e.message);}})();
  return()=>{live=false;};
 },[db,userId,courseId,lessons.length,adminPreview]);
 useEffect(()=>{
  if(!active||!accessible){setBlocks([]);setQuestions([]);return;}
  watchedVideos.current=new Set();
  let live=true;setLessonLoading(true);setLessonError('');setQuizResult(null);setAnswers({});
  Promise.all([
   loadLessonContent(db,active),
   adminPreview?db.from('lms_p22_lesson_quiz_questions')
     .select('id,prompt,options,is_published,position').eq('lesson_id',active)
     .order('position',{ascending:true}):
     db.rpc('lms_p22_get_lesson_quiz',{p_lesson_id:active})
  ]).then(([content,result])=>{
   if(!live)return;
   setBlocks(content);
   if(result.error){setQuestions([]);setLessonError(adminPreview?'Admin quiz preview unavailable. Verify P22 Admin read permission.':'Knowledge Check is not available until the P22 backend is installed.');}
   else setQuestions(Array.isArray(result.data)?result.data:[]);
  }).catch(e=>{if(live){setBlocks([]);setQuestions([]);setLessonError(e.message||'Could not load this lesson.');}})
   .finally(()=>{if(live)setLessonLoading(false);});
  return()=>{live=false;};
 },[db,active,accessible,adminPreview]);
 const section={video:blocks.filter(b=>b.block_type==='video'),
  reading:blocks.filter(b=>['text','heading'].includes(b.block_type)),
  attachments:blocks.filter(b=>b.block_type==='pdf')};
 const stepDone=(lesson,kind)=>kind==='video'?!!progress[lesson]?.video_completed:
  kind==='reading'?!!progress[lesson]?.reading_completed:!!quizProgress[lesson];
 const saveStep=async step=>{
  if(adminPreview||!selected||saving||stepDone(selected.id,step))return;
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
 // Reading is in the ordinary page flow, not an internally scrolling tab.
 // The short dwell confirms the end of the material was actually visible.
 useEffect(()=>{
  if(adminPreview||!selected||!accessible||lessonLoading||saving||
    stepDone(selected.id,'reading')||!section.reading.length)return;
  const end=readingEnd.current;
  if(!end||typeof IntersectionObserver==='undefined')return;
  let dwell=null;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    if(dwell===null)dwell=setTimeout(()=>{void saveStep('reading');},3000);
   }else if(dwell!==null){clearTimeout(dwell);dwell=null;}
  },{root:null,rootMargin:'0px 0px -32px 0px',threshold:.8});
  observer.observe(end);
  return()=>{observer.disconnect();if(dwell!==null)clearTimeout(dwell);};
 },[selected?.id,accessible,lessonLoading,section.reading.length,saving,
     progress[selected?.id]?.reading_completed]);

 // Follow the actual page scroll and highlight the closest section in the
 // sticky jump navigation; scrolling must never hide other learning material.
 useEffect(()=>{
  if(!selected||!accessible||lessonLoading)return;
  const nodes=[['video',videoSectionRef.current],['material',materialSectionRef.current],
    ['quiz',quizSectionRef.current]];
  const sync=()=>{
   let nearest='video';
   for(const [name,node] of nodes){
    if(node&&node.getBoundingClientRect().top<=180)nearest=name;
   }
   setCurrentSection(previous=>previous===nearest?previous:nearest);
  };
  sync();
  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync);
  return()=>{window.removeEventListener('scroll',sync);
    window.removeEventListener('resize',sync);};
 },[selected?.id,accessible,lessonLoading]);

 useEffect(()=>{
  if(!active)return;
  const frame=requestAnimationFrame(()=>playerHeadingRef.current?.scrollIntoView({
   behavior:'auto',block:'start'
  }));
  return()=>cancelAnimationFrame(frame);
 },[active]);
 const jumpToSection=key=>{
  const target={video:videoSectionRef.current,material:materialSectionRef.current,
   quiz:quizSectionRef.current}[key];
  if(!target)return;
  setCurrentSection(key);
  target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?
   'auto':'smooth',block:'start'});
 };
 const submitQuiz=async()=>{
  if(adminPreview||!selected||saving||questions.length===0||
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
  setCurrentSection('video');
 };
 const tabInfo=[['video','Video',Video,'video'],['material','Study Material',BookOpen,'reading'],['quiz','Knowledge Check',CheckCircle2,'quiz']];
 const selectedIndex=lessons.findIndex(l=>l.id===active);
 return <div className="cle-root">
  {!selected?<div className="cle-browser">
   <div className="cle-browser-head">
    <div><span className="cle-overline"><Layers3 size={14}/> YOUR LEARNING PATH</span>
     <h2>Choose a lesson</h2><p>{adminPreview?'Preview the complete course, including draft lessons. This session never saves learner progress.':'Explore the lessons in '+courseTitle+'. Your progress is saved to your account.'}</p></div>
    <Meter done={finished} total={totals} preview={adminPreview}/>
   </div>
   {statusError&&<p className="cle-error" role="alert">{statusError}</p>}
   {outline.map((d,di)=>{const dLessons=allLessons([d]),dDone=dLessons.filter(l=>completed(progress[l.id])).length;
    return <section className="cle-domain-section" key={d.id}>
     <header><div><span>DOMAIN {String(di+1).padStart(2,'0')}</span><h3>{d.title}</h3></div>
      <Meter done={dDone} total={dLessons.length} preview={adminPreview}/></header>
     {d.topics.map((t,ti)=><div className="cle-topic-section" key={t.id}>
      <div className="cle-topic-title"><b>{String(di+1).padStart(2,'0')}.{String(ti+1).padStart(2,'0')} {t.title}</b>
       <small>{adminPreview?t.lessons.length+' lessons':t.lessons.filter(l=>completed(progress[l.id])).length+'/'+t.lessons.length+' completed'}</small></div>
      <div className="cle-grid">{t.lessons.map((l,li)=>{
       const unlocked=hasAccess(l,full,demo),done=completed(progress[l.id]);
       return <button type="button" key={l.id} className={'cle-card'+(done?' is-done':'')+(unlocked?'':' is-locked')}
        onClick={()=>selectLesson(l)} aria-label={(unlocked?'Open ':'Subscribe to unlock ')+l.title}>
        <span className="cle-card-art"><span>{done?<CheckCircle2 size={27}/>:unlocked?<BookOpen size={27}/>:<LockKeyhole size={24}/>}</span></span>
        <span className="cle-card-body"><small>LESSON {String(li+1).padStart(2,'0')}{l.isFreeIntro?' · FREE INTRO':''}{adminPreview&&l.publication_state==='draft'?' · DRAFT':''}</small>
         <strong>{l.title}</strong><span>{adminPreview?'Preview lesson':done?'Completed':unlocked?'Open lesson':'Subscription required'}
          {unlocked?<ArrowRight size={15}/>:<LockKeyhole size={14}/>}</span></span>
       </button>;})}</div>
     </div>)}
    </section>;})}
  </div>:<div className="cle-player">
   <div className="cle-player-head" ref={playerHeadingRef}>
    <button className="cle-back" type="button" onClick={()=>setActive(null)}><ArrowLeft size={17}/> All lessons</button>
    <div><span>{adminPreview?'ADMIN COURSE PREVIEW':'LEARNING JOURNEY'}</span><h2>{selected.title}</h2></div>
    <Meter done={finished} total={totals} preview={adminPreview}/>
   </div>
   <div className="cle-player-layout">
    <aside className="cle-lesson-sidebar" aria-label="Lessons in this course">
     <div className="cle-outline-head"><BookOpen size={17}/><b>Course contents</b><small>{adminPreview?totals+' lessons':finished+'/'+totals}</small></div>
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
     <nav className="cle-steps" aria-label="Jump to lesson section">
      {tabInfo.map(([key,name,Icon,step])=><button type="button" key={key}
       aria-current={currentSection===key?'location':undefined}
       aria-controls={'cle-'+key+'-'+selected.id}
       className={currentSection===key?'selected':''} onClick={()=>jumpToSection(key)}>
       {stepDone(selected.id,step)?<CheckCircle2 className="cle-success" size={16}/>:<Icon size={16}/>}
       {name}</button>)}
     </nav>
     {statusError&&<p className="cle-error" role="alert">{statusError}</p>}
     {lessonLoading?<div className="cle-notice" role="status">Loading your protected lesson…</div>:
      <div className="cle-single-page">
       <section id={'cle-video-'+selected.id} ref={videoSectionRef} className="cle-activity cle-activity-section" aria-labelledby={'cle-video-title-'+selected.id}>
        <div className="cle-activity-title"><h3 id={'cle-video-title-'+selected.id}>Watch &amp; learn</h3><small>{adminPreview?'Admin preview · playback does not save progress':stepDone(selected.id,'video')?'Completed ✓':'Watch each video until the end'}</small></div>
        {section.video.length?<React.Suspense fallback={<div className="cle-notice">Opening protected player…</div>}>
         {section.video.map(b=><ProtectedLessonViewer key={b.id} db={db} lessonId={selected.id}
          block={b} viewerId={adminPreview?'ADMIN PREVIEW':userId.slice(0,8)} onWatched={()=>{
           if(adminPreview)return;
           watchedVideos.current.add(b.id);
           if(section.video.every(v=>watchedVideos.current.has(v.id)))void saveStep('video');
          }}/>)}
        </React.Suspense>:<div className="cle-notice cle-notice-compact"><Video size={20}/> No video has been published for this lesson.</div>}
       </section>
       <section id={'cle-material-'+selected.id} ref={materialSectionRef} className="cle-activity cle-activity-section" aria-labelledby={'cle-material-title-'+selected.id}>
        <div className="cle-activity-title"><h3 id={'cle-material-title-'+selected.id}>Study Material</h3><small>{adminPreview?'Admin preview · reading progress is disabled':stepDone(selected.id,'reading')?'Completed ✓':'Read the material down to the end'}</small></div>
        {section.reading.length?<div className="cle-reading" key={selected.id}>
         {section.reading.map(b=>b.block_type==='heading'?<h3 key={b.id}>{b.payload?.body||b.payload?.text||''}</h3>:
          <p key={b.id}>{b.payload?.body||b.payload?.text||''}</p>)}
         <div className="cle-reading-end" ref={readingEnd}><CheckCircle2 size={16}/> End of reading</div>
        </div>:<div className="cle-notice cle-notice-compact"><FileText size={20}/> No reading material has been published yet.</div>}
        {section.attachments.length>0&&<div className="cle-material-attachments" aria-label="Lesson attachments">
         <div className="cle-activity-title cle-attachments-title"><h4><Paperclip size={18}/> Lesson Attachments</h4><small>Optional protected resources</small></div>
         <React.Suspense fallback={<div className="cle-notice">Loading protected attachments…</div>}>
          {section.attachments.map(b=><div key={b.id} className="cle-resource">
           <strong><Paperclip size={16}/>{b.payload?.title||'Protected PDF'}</strong>
           <ProtectedLessonViewer db={db} lessonId={selected.id} block={b} viewerId={adminPreview?'ADMIN PREVIEW':userId.slice(0,8)}/>
          </div>)}
         </React.Suspense>
        </div>}
       </section>
       <section id={'cle-quiz-'+selected.id} ref={quizSectionRef} className="cle-activity cle-activity-section" aria-labelledby={'cle-quiz-title-'+selected.id}>
        <div className="cle-activity-title"><h3 id={'cle-quiz-title-'+selected.id}>Knowledge Check</h3><small>{adminPreview?'Admin preview · no answers or scores are submitted':'Answer every question to finish. Incorrect answers still count as completing the activity.'}</small></div>
        {lessonError&&<p className="cle-error" role="alert">{lessonError}</p>}
        {!questions.length?<div className="cle-notice cle-notice-compact"><CheckCircle2 size={20}/> No Knowledge Check has been published for this lesson.</div>:
        quizResult?<div className="cle-quiz-result"><CheckCircle2 size={30}/><h3>Knowledge Check completed</h3>
         <p>You answered all {questions.length} questions. Your score is {quizResult.scorePercent}%.</p>
         <button type="button" onClick={()=>{setAnswers({});setQuizResult(null);}}>Try again</button></div>:
        <div className="cle-quiz-list">{questions.map((q,i)=><fieldset key={q.id} className="cle-question">
         <legend><span>QUESTION {i+1} OF {questions.length}{adminPreview&&q.is_published===false?' · DRAFT':''}</span><strong>{q.prompt}</strong></legend>
         {q.options.map((choice,idx)=><label key={idx} className={answers[q.id]===idx?'chosen':''}>
          <input type="radio" name={'q-'+q.id} checked={answers[q.id]===idx} onChange={()=>setAnswers(prev=>({...prev,[q.id]:idx}))}/>
          {choice}</label>)}
        </fieldset>)}
        {adminPreview?<div className="cle-notice cle-notice-compact" role="note">
          Preview only · Quiz submission and learner progress are disabled.</div>:
         <button className="cle-submit" type="button" disabled={!!saving||questions.some(q=>!Number.isInteger(answers[q.id]))}
          onClick={submitQuiz}>Submit all answers <ArrowRight size={16}/></button>}</div>}
       </section>
      </div>}
     </>}
     <footer className="cle-player-footer">
      <span><ShieldCheck size={15}/> {adminPreview?'Admin-only preview · No progress, grading or publication changes.':'Only server-confirmed progress receives a green check.'}</span>
      <div><button type="button" disabled={selectedIndex<=0} onClick={()=>selectLesson(lessons[selectedIndex-1])}><ArrowLeft size={15}/> Previous</button>
       <button type="button" disabled={selectedIndex>=lessons.length-1} onClick={()=>selectLesson(lessons[selectedIndex+1])}>
        Next lesson <ArrowRight size={15}/></button></div>
     </footer>
    </main>
   </div>
  </div>}
 </div>;
}
