import React from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,BookOpenCheck,CheckCircle2,Clock3,
 GraduationCap,LockKeyhole,PlayCircle,ShieldCheck,Sparkles} from 'lucide-react';
import {CourseCover} from './CourseCover.jsx';
import './liveCourseCards.css';

function AccessStatus({status,compact=false}){
 const value=status==='real'?'Enrolled':status==='demo'?'Demo Access':'Explore Course';
 const icon=status==='real'?<CheckCircle2 size={13}/>:
  status==='demo'?<ShieldCheck size={13}/>:<Sparkles size={13}/>;
 return <span className={'lcc-access-status lcc-status-'+status+(compact?' lcc-status-small':'')}>{icon}{value}</span>;
}
export function LearnerCourseCard({db,course,status='available',onOpen,onEnroll}){
 const demo=status==='demo',real=status==='real';
 return <article className="lcc-course-card">
  <button className="lcc-card-cover-button" type="button"
   aria-label={'View '+course.title+' course'} onClick={onOpen}>
   <CourseCover course={course} db={db} variant="card"/>
   <span className="lcc-open-mark"><ArrowUpRight size={17}/></span>
  </button>
  <div className="lcc-card-inner">
   <div className="lcc-card-tagrow"><AccessStatus status={status} compact/>
    <span className="lcc-card-meta"><BookOpen size={13}/> Guided lessons</span></div>
   <h2><button type="button" onClick={onOpen}>{course.title}</button></h2>
   <p className="lcc-card-summary">{course.summary||'Explore the syllabus, discover what you will learn, and start at your own pace.'}</p>
   <div className="lcc-card-details">
    <span><PlayCircle size={14}/> Intro preview when available</span>
    <span><GraduationCap size={14}/> Self-paced</span>
   </div>
   {demo&&<p className="lcc-demo-explainer">Demo checkout completed · no real payment or protected content access.</p>}
   <div className="lcc-card-cta">
    <button className="lj-quiet" type="button" onClick={onOpen}>
     {real?'Continue Learning':demo?'Explore Demo':'View Course'} <ArrowRight size={15}/></button>
    {!real&&!demo&&<button className="lj-primary" type="button" onClick={onEnroll}>Enroll Now <ArrowRight size={15}/></button>}
   </div>
  </div>
 </article>;
}
export function CourseDetailHero({db,course,status,onEnroll,onContinue}){
 return <section className="lcc-detail-hero" aria-label="Course overview">
  <div className="lcc-detail-media"><CourseCover db={db} course={course} variant="hero"/></div>
  <div className="lcc-detail-copy">
   <div className="lcc-hero-badges"><AccessStatus status={status}/><span className="lcc-detail-chip"><BookOpen size={13}/> Self-paced course</span></div>
   <h2>{course.title}</h2>
   <p>{course.summary||'A structured learning journey organized into domains, topics and lessons.'}</p>
   <div className="lcc-detail-features">
    <span><BookOpenCheck size={16}/> Course → Domain → Topic → Lesson</span>
    <span><ShieldCheck size={16}/> Protected learning materials</span>
   </div>
   {status==='demo'&&<p className="lcc-hero-demo">Demo Access is only a preview of the learning journey. Real lesson content remains locked.</p>}
   <div className="lcc-detail-actions">
    {status==='available'?<button className="lj-primary" type="button" onClick={onEnroll}>
     Enroll Now <ArrowRight size={17}/></button>:
     <button className="lj-primary" type="button" onClick={onContinue}>
      {status==='real'?'Your lessons':'Browse Demo Lessons'} <ArrowRight size={17}/></button>}
    {status==='available'&&<span className="lcc-detail-fineprint">
     Preview a free Intro if enabled by the instructor.</span>}
   </div>
  </div>
 </section>;
}
