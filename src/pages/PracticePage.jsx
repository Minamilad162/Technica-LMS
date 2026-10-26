import HDImage from '../components/HDImage';
import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Layers3,Check,Clock3,MessageSquare,Database,FileQuestion,Play,ArrowRight,BookOpen,Save,LockKeyhole,SlidersHorizontal} from 'lucide-react';
import {topics,assets,questionPool} from '../data/mock';
import {courses} from '../data/courseCatalog';
import {getCourse,getCourseBank,learnerCourses} from '../lib/courseWorkspace';
import {useDemo} from '../lib/store';
import {SelectButtons} from '../components/UI';

export default function PracticePage(){
 const navigate=useNavigate();const{state,update,beginPractice,notify}=useDemo();
 const availableCourses=learnerCourses(state);const course=getCourse(state,state.practiceCourseId)||availableCourses[0]||courses[0];
 const [custom,setCustom]=useState('50');
 const choiceTopics=course.id==='asp'?topics.filter(t=>course.domainIds.includes(t.id)):[{id:course.domainIds[0],name:'General questions',questions:getCourseBank(state,course.id,questionPool).length,art:'plant',theme:'mint'}];
 const selected=choiceTopics.filter(t=>state.selectedTopics.includes(t.id));
 const available=getCourseBank(state,course.id,questionPool).length;
 const count=state.questionCount==='custom'?Math.max(1,Math.min(50,Number(custom)||50)):Number(state.questionCount)||50;
 const minutes=Math.max(1,Math.min(180,Number(state.customMinutes)||30));
 function setCourse(id){const next=getCourse(state,id);if(!next)return;update({practiceCourseId:id,selectedTopics:[...next.domainIds]})}
 function toggle(id){update({selectedTopics:state.selectedTopics.includes(id)?state.selectedTopics.filter(x=>x!==id):[...state.selectedTopics,id]})}
 function begin(){
  if(!available){notify(`${course.name} has no questions yet.`);return}
  if(!selected.length){notify('Select at least one domain in this course.');return}
  if(beginPractice({practiceCourseId:course.id,selectedTopics:selected.map(t=>t.id),questionCount:count}))navigate('/practice/session');
 }
 return <div className="practice-page page-enter">
  <h1>Practice your way</h1><p className="page-subtitle">Choose a course, select ASP domains, and customise your practice questions and time. Assessment settings are separate and controlled by the admin.</p>
  <div className="steps"><div className="step current"><span>1</span><b>Select course</b></div><div className="step-line"/><div className="step"><span>2</span><b>Customize</b></div><div className="step-line"/><div className="step"><span>3</span><b>Practice</b></div></div>
  <div className="practice-layout"><div className="practice-main">
   <h3 className="step-label">1. Choose your course</h3>
   <div className="course-choice-grid" role="group" aria-label="Choose practice course">{availableCourses.map(c=>{const size=getCourseBank(state,c.id,questionPool).length;return <button key={c.id} type="button" aria-pressed={course.id===c.id} className={`course-choice ${course.id===c.id?'active':''}`} onClick={()=>setCourse(c.id)}><HDImage src={assets[c.art||'plant']} alt="" sizes="180px"/><span className="course-choice-copy"><strong>{c.name}</strong><small>{c.subtitle||c.category||'Course'}</small><span className="course-choice-meta">{size?`${size.toLocaleString()} course questions`:'No questions yet'}</span></span><span className="course-choice-indicator">{size?<Check size={17}/>:<LockKeyhole size={17}/>}</span></button>})}</div>
   {available>0?<><h3 className="step-label">2. Choose domains within {course.name} <small>(one or more)</small></h3>
   <div className="practice-topics">{choiceTopics.map(t=><button key={t.id} type="button" aria-pressed={state.selectedTopics.includes(t.id)} className={`topic-option ${t.theme} ${state.selectedTopics.includes(t.id)?'checked':''}`} onClick={()=>toggle(t.id)}><HDImage src={assets[t.art]} alt="" sizes="(max-width: 740px) 90px, 140px"/><div><b>{t.name}</b><small>{course.id==='asp'?`${t.questions} imported questions`:`${t.questions} course questions`}</small></div><span className="topic-check">{state.selectedTopics.includes(t.id)&&<Check size={13}/>}</span></button>)}</div>
   <h3 className="step-label options-title">3. Customize practice <small>(learner controlled)</small></h3>
   <div className="option-list"><div className="option-row"><label><FileQuestion size={17}/>Number of questions</label><div className="option-control"><SelectButtons values={[{value:10,label:'10'},{value:25,label:'25'},{value:50,label:'50'},{value:'custom',label:'Custom'}]} value={state.questionCount} onChange={n=>update({questionCount:n})}/>{state.questionCount==='custom'&&<input className="custom-field" aria-label="Custom practice question count" type="number" min="1" max="50" value={custom} onChange={e=>setCustom(e.target.value)}/>}</div></div>
   <div className="option-row"><label><Clock3 size={17}/>Timing</label><div className="option-control"><SelectButtons values={[{value:'none',label:'No timer'},{value:'whole',label:'Whole test'},{value:'per',label:'60 sec / question'}]} value={state.timerMode} onChange={n=>update({timerMode:n})}/>{state.timerMode==='whole'&&<label className="practice-time-control">Total minutes <input aria-label="Practice duration in minutes" type="number" min="1" max="180" value={state.customMinutes} onChange={e=>update({customMinutes:e.target.value})}/></label>}</div></div>
   <div className="option-row"><label><MessageSquare size={17}/>Answer feedback</label><div className="option-control"><SelectButtons values={[{value:'each',label:'After each question'},{value:'end',label:'At the end'}]} value={state.feedbackMode} onChange={n=>update({feedbackMode:n})}/></div></div>
   <div className="option-row"><label><Database size={17}/>Question pool</label><div className="option-control"><SelectButtons values={[{value:'all',label:'All questions'},{value:'unseen',label:'Unseen'},{value:'mistakes',label:'Previous mistakes'}]} value={state.pool} onChange={n=>update({pool:n})}/></div></div></div></>:<div className="course-empty-panel"><LockKeyhole size={28}/><h3>{course.name} — Coming soon</h3><p>There are no questions in this course yet. You can browse it now; practice will unlock after the admin imports its bank.</p></div>}
  </div><aside className="practice-summary"><h2>Your practice</h2><p>Settings you control, unlike an assessment.</p><HDImage className="practice-summary-image" sizes="(max-width: 740px) 92vw, 390px" src={assets.practice} alt="Industrial process safety training"/><div className="summary-row"><Layers3 size={18}/><span>Course</span><strong>{course.name}</strong></div><div className="summary-row"><BookOpen size={18}/><span>Domains</span><strong>{selected.length} selected<small>{selected.map(t=>t.name).join(', ')||'Select a domain'}</small></strong></div><div className="summary-row"><FileQuestion size={18}/><span>Questions</span><strong>{count}</strong></div><div className="summary-row"><Clock3 size={18}/><span>Time</span><strong>{state.timerMode==='none'?'Untimed':state.timerMode==='per'?'60 sec / question':`${minutes} min total`}</strong></div><div className="summary-row"><SlidersHorizontal size={18}/><span>Mode</span><strong>Customizable practice</strong></div><button className="btn start-practice" disabled={!available||!selected.length} onClick={begin}><Play size={17} fill="currentColor"/> Start practice <ArrowRight size={17}/></button><div className="summary-note"><Save size={18}/><span><b>Practice settings stay editable</b><small>For official assessments, the administrator sets questions and duration.</small></span></div></aside></div>
 </div>
}
