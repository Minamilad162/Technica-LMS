import HDImage from '../components/HDImage';
import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{ArrowRight,ArrowLeft,BarChart3,Clock3,Target,FileText,Check,LockKeyhole,ShieldCheck}from'lucide-react';
import{assets,topics,questionPool}from'../data/mock';
import{courses,findCourse,courseQuestionCount}from'../data/courseCatalog';
import{assessmentSettings}from'../lib/courseAssessment';
import{useDemo}from'../lib/store';
import{Breadcrumb}from'../components/UI';
export default function AssessmentOverview(){
 const navigate=useNavigate();const{beginAssessment,notify,state,update}=useDemo();
 const[accepted,setAccepted]=useState(false);
 const course=findCourse(state.assessmentCourseId)||courses[0];
 const settings=assessmentSettings(course.id,state.courseAssessmentSettings);
 const size=courseQuestionCount(course,[...questionPool,...state.addedQuestions]);
 const attempts=state.assessmentAttempts?.[course.id]||0;
 const ready=!!size&&settings.enabled&&settings.domainIds.length>0&&size>=settings.questionCount;
 const allowed=ready&&attempts<settings.maxAttempts&&state.role!=='admin';
 const domains=topics.filter(t=>settings.domainIds.includes(t.id));
 function start(){if(!ready){notify(`${course.name} is not ready for assessment.`);return}if(!accepted){notify('Please read and accept the assessment instructions');return}if(beginAssessment(course.id))navigate('/assessments/take')}
 return <div className="assessment-overview page-enter">
  <Breadcrumb items={['Assessments','Choose course']}/><h1>Course assessments</h1><p className="page-subtitle">Select the course you want to be assessed on. The number of questions, time limit and pass mark are fixed by the admin — you cannot change them here.</p>
  <section className="white-panel assessment-config-panel" aria-label="Choose assessment course"><div className="assessment-config-heading"><div><h3>Choose your course</h3><p>Only courses with a published question bank can be started.</p></div><span className="assessment-random-badge"><ShieldCheck size={15}/> Admin-configured exam</span></div>
   <div className="course-choice-grid">{courses.map(c=>{const n=courseQuestionCount(c,[...questionPool,...state.addedQuestions]);return <button key={c.id} type="button" aria-pressed={c.id===course.id} className={`course-choice ${course.id===c.id?'active':''}`} onClick={()=>{update({assessmentCourseId:c.id});setAccepted(false)}}><HDImage src={assets[c.art]} alt="" sizes="180px"/><span className="course-choice-copy"><strong>{c.name}</strong><small>{c.subtitle}</small><span className="course-choice-meta">{n?`${n.toLocaleString()} questions · ${c.domainIds.length} domains`:'Coming soon · No question bank'}</span></span><span className="course-choice-indicator">{n?<Check size={17}/>:<LockKeyhole size={17}/>}</span></button>})}</div>
  </section>
  <div className="assessment-banner"><div className="orb"/><div><small>{size?'Ready for assessment':'Upcoming course'}</small><h2>{course.name}</h2><p>{ready?`${settings.questionCount} questions · ${settings.durationMinutes} min · ${settings.passMark}% pass mark`:'Question bank not available yet'}</p></div><HDImage src={assets.plant} alt="Oil and gas process safety equipment" sizes="(max-width: 740px) 52vw, 650px" priority/></div>
  {size>0?<>
   <div className="assessment-stat-grid"><div className="assessment-stat mint"><span className="stat-icon"><BarChart3/></span><div><strong>{settings.questionCount}</strong><small>Fixed questions</small></div></div><div className="assessment-stat coral"><span className="stat-icon"><Clock3/></span><div><strong>{settings.durationMinutes} min</strong><small>Fixed time limit</small></div></div><div className="assessment-stat lilac"><span className="stat-icon"><Target/></span><div><strong>{settings.passMark}%</strong><small>Pass mark</small></div></div><div className="assessment-stat blue"><span className="stat-icon"><FileText/></span><div><strong>{Math.max(0,settings.maxAttempts-attempts)} of {settings.maxAttempts}</strong><small>Attempts remaining (demo)</small></div></div></div>
   <div className="assessment-content-grid"><section className="white-panel before-panel"><h3>Before you start</h3><p>This is a timed assessment. Review the instructions.</p><div className="instructions">{[['One correct answer per question.','You may flag and revisit unanswered questions.'],['Your time limit is fixed.','The countdown begins when the assessment starts.'],['Course rules are set by your admin.','Question count and pass mark cannot be customised.'],['Answers save within this demo.','Results and explanations appear after submission.']].map(([a,b],i)=><div className="instruction" key={a}><span>{i+1}</span><div><b>{a}</b><small>{b}</small></div></div>)}</div></section><section className="white-panel assessment-content-panel"><h3>{course.name} content</h3><p>Assessment questions come from these imported course domains:</p><div className="material-list">{domains.map(t=><div key={t.id} className={`material ${t.theme}`}><HDImage src={assets[t.art]} alt="" sizes="100px"/><b>{t.name}</b><small>{t.questions} in bank</small></div>)}</div><label className="checkbox-line"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I have read the assessment instructions.</span></label><div className="assessment-actions"><button className="btn btn-secondary" onClick={()=>navigate('/home')}><ArrowLeft size={17}/>Back</button><button className="btn" disabled={!allowed||!accepted} onClick={start}>{attempts>=settings.maxAttempts?'No attempts left':'Start assessment'} <ArrowRight size={17}/></button></div></section></div>
  </>:<section className="white-panel course-empty-panel"><LockKeyhole size={32}/><h3>{course.name} — Coming soon</h3><p>No questions have been uploaded for this course. Its assessment cannot be started yet. Select ASP Course to try an available assessment.</p><button className="btn btn-secondary" onClick={()=>update({assessmentCourseId:'asp'})}>View ASP Course <ArrowRight size={16}/></button></section>}
 </div>
}
