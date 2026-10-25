import HDImage from '../components/HDImage';
import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowRight,ArrowLeft,BarChart3,Clock3,Target,Check,LockKeyhole,ShieldCheck,PlayCircle} from 'lucide-react';
import {assets,questionPool} from '../data/mock';
import {courses,findCourse,courseQuestionCount} from '../data/courseCatalog';
import {assessmentSettings} from '../lib/courseAssessment';
import {useDemo} from '../lib/store';
import {Breadcrumb} from '../components/UI';

export default function AssessmentOverview(){
 const navigate=useNavigate();
 const {beginAssessment,notify,state,update}=useDemo();
 const [accepted,setAccepted]=useState(false);
 const course=findCourse(state.assessmentCourseId)||courses[0];
 const settings=assessmentSettings(course.id,state.courseAssessmentSettings);
 const size=courseQuestionCount(course,[...questionPool,...state.addedQuestions]);
 const ready=!!size&&settings.enabled&&settings.domainIds.length>0&&size>=settings.questionCount;
 // Assessment starts are unlimited. The number and time are still administered per course.
 const allowed=ready&&state.role!=='admin';
 function start(){
  if(!ready){notify(`${course.name} is not ready for assessment.`);return}
  if(!accepted){notify('Please read and accept the assessment instructions');return}
  if(beginAssessment(course.id))navigate('/assessments/take');
 }
 return <div className="assessment-overview page-enter">
  <Breadcrumb items={['Assessments','Choose course']}/>
  <h1>Course assessments</h1>
  <p className="page-subtitle">Select the course you want to be assessed on. The question count, duration and pass mark are set by the admin. You can retake the assessment whenever you need.</p>
  <section className="white-panel assessment-config-panel" aria-label="Choose assessment course">
   <div className="assessment-config-heading"><div><h3>Choose your course</h3><p>Only courses with a published question bank can be started.</p></div><span className="assessment-random-badge"><ShieldCheck size={15}/> Admin-configured exam</span></div>
   <div className="course-choice-grid">{courses.map(c=>{
    const n=courseQuestionCount(c,[...questionPool,...state.addedQuestions]);
    return <button key={c.id} type="button" aria-pressed={c.id===course.id} className={`course-choice ${course.id===c.id?'active':''}`} onClick={()=>{update({assessmentCourseId:c.id});setAccepted(false)}}>
     <HDImage src={assets[c.art]} alt="" sizes="180px"/><span className="course-choice-copy"><strong>{c.name}</strong><small>{c.subtitle}</small><span className="course-choice-meta">{n?`${n.toLocaleString()} questions · ${c.domainIds.length} domains`:'Coming soon · No question bank'}</span></span><span className="course-choice-indicator">{n?<Check size={17}/>:<LockKeyhole size={17}/>}</span>
    </button>;
   })}</div>
  </section>
  <div className="assessment-banner"><div className="orb"/><div><small>{size?'Ready for assessment':'Upcoming course'}</small><h2>{course.name}</h2><p>{ready?`${settings.questionCount} questions · ${settings.durationMinutes} min · ${settings.passMark}% pass mark`:'Question bank not available yet'}</p></div><HDImage src={assets.plant} alt="Oil and gas process safety equipment" sizes="(max-width: 740px) 52vw, 650px" priority/></div>
  {size>0?<>
   <div className="assessment-stat-grid">
    <div className="assessment-stat mint"><span className="stat-icon"><BarChart3/></span><div><strong>{settings.questionCount}</strong><small>Fixed questions</small></div></div>
    <div className="assessment-stat coral"><span className="stat-icon"><Clock3/></span><div><strong>{settings.durationMinutes} min</strong><small>Fixed time limit</small></div></div>
    <div className="assessment-stat lilac"><span className="stat-icon"><Target/></span><div><strong>{settings.passMark}%</strong><small>Pass mark</small></div></div>
   </div>
   <div className="assessment-content-grid assessment-start-layout">
    <section className="white-panel assessment-start-panel" aria-label="Start assessment">
     <span className="assessment-start-icon"><PlayCircle size={28}/></span>
     <h3>Ready to begin?</h3>
     <p>Start the {course.name} assessment when you are ready. You can take it again without an attempt limit.</p>
     <div className="assessment-start-summary"><span><BarChart3 size={16}/>{settings.questionCount} questions</span><span><Clock3 size={16}/>{settings.durationMinutes} minutes</span></div>
     <button className="btn assessment-start-button" disabled={!allowed||!accepted} onClick={start}>Start assessment <ArrowRight size={18}/></button>
     {!ready&&<small className="assessment-start-hint" role="status">The course has not been fully configured yet.</small>}
     {!accepted&&<small className="assessment-start-hint">Accept the instructions to enable Start assessment.</small>}
     <button type="button" className="assessment-back-link" onClick={()=>navigate('/home')}><ArrowLeft size={16}/>Back to home</button>
    </section>
    <section className="white-panel before-panel"><h3>Before you start</h3><p>This is a timed assessment. Review the instructions.</p>
     <div className="instructions">{[
      ['One correct answer per question.','You may flag and revisit unanswered questions.'],
      ['Your time limit is fixed.','The countdown begins when the assessment starts.'],
      ['Course rules are set by your admin.','Question count and pass mark cannot be customised.'],
      ['Review before submission.','Unanswered questions are marked when you choose Review and submit.']
     ].map(([a,b],i)=><div className="instruction" key={a}><span>{i+1}</span><div><b>{a}</b><small>{b}</small></div></div>)}</div>
     <label className="checkbox-line"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I have read the assessment instructions.</span></label>
    </section>
   </div>
  </>:<section className="white-panel course-empty-panel"><LockKeyhole size={32}/><h3>{course.name} — Coming soon</h3><p>No questions have been uploaded for this course. Its assessment cannot be started yet. Select ASP Course to try an available assessment.</p><button className="btn btn-secondary" onClick={()=>update({assessmentCourseId:'asp'})}>View ASP Course <ArrowRight size={16}/></button></section>}
 </div>;
}
