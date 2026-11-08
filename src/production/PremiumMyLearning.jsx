import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BookOpen,BookOpenCheck,CheckCircle2,ChevronRight,Compass,
 GraduationCap,LockKeyhole,PlayCircle,Search,ShieldCheck,Sparkles,Target,
 TrendingUp,Wallet,X} from 'lucide-react';
import {CourseCover} from './CourseCover.jsx';
import {courseProgressStatus,learningSummary,loadVerifiedCourseReports,pickFeaturedCourse}
 from './premiumMyLearningApi.js';
import './premiumMyLearning.css';

const percent=x=>x===null||x===undefined?'—':Number(x).toFixed(0)+'%';
const formatCount=x=>x===null||x===undefined?'—':String(x);
function CourseProgress({result,small=false}){
 const {state,progress}=courseProgressStatus(result);
 if(state==='loading')return <div className="pml-progress pml-progress-wait" role="status">
  <span>Syncing verified learning progress…</span></div>;
 if(state==='unavailable')return <div className="pml-progress pml-progress-wait">
  <span>Learning progress unavailable</span><small>Course access is unchanged</small></div>;
 const label=progress.finished?'Completed':progress.completed===0?'Ready to start':'In progress';
 return <div className={'pml-progress'+(small?' pml-progress-compact':'')}>
  <div className="pml-progress-head"><span>{label}</span><strong>{percent(progress.percent)}</strong></div>
  <div className="pml-progress-track" role="progressbar" aria-label="Verified lesson completion"
   aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent??0}>
   <span style={{width:(progress.percent??0)+'%'}}/></div>
  <small>{progress.completed} of {progress.total} verified lessons complete</small>
 </div>;
}
function RealCourseRow({db,course,result,onOpen}){
 const {state}=courseProgressStatus(result);
 return <article className="pml-course-row">
  <button type="button" className="pml-course-image" onClick={()=>onOpen(course.id)}
   aria-label={'Open '+course.title}>
   <CourseCover db={db} course={course} variant="card"/>
   <span><PlayCircle size={15}/> Continue</span></button>
  <div className="pml-course-details">
   <div className="pml-course-top"><span className="pml-badge pml-badge-active"><ShieldCheck size={13}/> Included with subscription / Verified enrollment</span>
    {state==='completed'&&<span className="pml-badge pml-badge-finished"><CheckCircle2 size={13}/> Completed</span>}</div>
   <h3><button type="button" onClick={()=>onOpen(course.id)}>{course.title}</button></h3>
   <p>{course.summary||'Your structured learning path, ready when you are.'}</p>
   <CourseProgress result={result}/>
   <button type="button" className="pml-course-action" onClick={()=>onOpen(course.id)}>
    {state==='completed'?'Review Course':'Continue Learning'} <ArrowRight size={16}/></button>
  </div>
 </article>;
}
function DemoCourseRow({db,course,onOpen}){
 return <article className="pml-demo-row">
  <div className="pml-demo-cover"><CourseCover db={db} course={course} variant="mini"/></div>
  <div className="pml-demo-content"><span className="pml-badge pml-badge-demo"><Sparkles size={13}/> Course preview</span>
   <h3>{course.title}</h3><p>Explore introductory lessons.</p></div>
  <button type="button" className="pml-demo-action" onClick={()=>onOpen(course.id)}>
   View course <ChevronRight size={16}/></button>
 </article>;
}
export default function PremiumMyLearning({
 db,user,activeCourses=[],demoCourses=[],subscription=null,openAccess=false,onSubscribe,onOpen,onBrowse,onPractice,onHistory,refreshKey=0
}){
 const [reports,setReports]=useState({}),[isLoading,setIsLoading]=useState(false);
 const [tab,setTab]=useState('all'),[query,setQuery]=useState('');
 const ids=activeCourses.map(c=>c.id).join('|');
 useEffect(()=>{
  let alive=true;
  setReports({});setIsLoading(activeCourses.length>0);
  if(!activeCourses.length)return()=>{alive=false;};
  loadVerifiedCourseReports(db,activeCourses,{concurrency:3}).then(result=>{
   if(alive)setReports(result);
  }).finally(()=>{if(alive)setIsLoading(false);});
  return()=>{alive=false;};
 },[db,user?.id,ids,refreshKey]);
 const resolved=useMemo(()=>{
  const base={...reports};
  if(isLoading)for(const c of activeCourses)if(!base[c.id])base[c.id]={status:'loading'};
  return base;
 },[reports,isLoading,ids]);
 const summary=learningSummary(activeCourses,resolved);
 const featured=pickFeaturedCourse(activeCourses,resolved);
 const matching=q=>q.title?.toLowerCase().includes(query.trim().toLowerCase())||
  q.summary?.toLowerCase().includes(query.trim().toLowerCase());
 const showActive=tab!=='demo',showDemo=tab!=='active';
 const realShown=showActive?activeCourses.filter(matching):[];
 const demoShown=showDemo?demoCourses.filter(matching):[];
 const isEmpty=!activeCourses.length&&!demoCourses.length;
 return <div className="pml-shell" aria-label="My Learning dashboard">
  <section className="pml-hero" aria-label="Learning overview">
   <div className="pml-hero-main"><span className="pml-eyebrow"><Sparkles size={14}/> YOUR LEARNING JOURNEY</span>
    <h2>{activeCourses.length?'Keep your momentum.':'Your next chapter starts here.'}</h2>
    <p>{activeCourses.length?
     'Pick up a verified course where you left off. Your learning, progress and next steps — all in one place.':
     'Explore published courses, preview available introductions, and start building your learning path.'}</p>
    <div className="pml-hero-actions">
     {featured&&<button className="pml-hero-primary" type="button" onClick={()=>onOpen(featured.id)}>
      <PlayCircle size={17}/> Open {featured.title.length>22?'your course':featured.title} <ArrowRight size={16}/></button>}
     {!subscription&&!openAccess&&<button className="pml-hero-primary" type="button" onClick={onSubscribe}>
      <ShieldCheck size={16}/> View Subscription Plans <ArrowRight size={16}/></button>}
     <button className="pml-hero-secondary" type="button" onClick={onBrowse}>
      Browse Courses <ArrowRight size={16}/></button>
    </div>
   </div>
   <div className="pml-hero-side" aria-label="Verified learning summary">
    <div className="pml-orbit" aria-hidden="true"><i/><i/><BookOpenCheck size={38}/></div>
    <div className="pml-metric-lead"><span>Active Courses</span><strong>{activeCourses.length}</strong>
     <small><ShieldCheck size={13}/> Your learning progress</small></div>
   </div>
  </section>
  {subscription&&<div className="pml-subscription-banner" role="status">
   <ShieldCheck size={19}/><div><strong>All-Access Subscription · {subscription.plan_name_snapshot}</strong>
    <span>Every published Course, Practice and Mock is included until {new Date(subscription.ends_at).toLocaleDateString('en-GB')}.</span></div>
   <button type="button" onClick={onSubscribe}>Membership details <ArrowRight size={15}/></button>
  </div>}
  <div className="pml-stats" aria-label="Learning statistics">
   <div className="pml-stat"><span className="pml-stat-icon"><GraduationCap size={19}/></span>
    <div><small>{openAccess?'Available Courses':'Enrolled Courses'}</small><strong>{activeCourses.length}</strong></div></div>
   <div className="pml-stat"><span className="pml-stat-icon"><CheckCircle2 size={19}/></span>
    <div><small>Verified lessons complete</small>
     <strong>{formatCount(summary.completedLessons)}{summary.totalLessons!==null&&<span> / {summary.totalLessons}</span>}</strong></div></div>
   <div className="pml-stat"><span className="pml-stat-icon"><Compass size={19}/></span>
    <div><small>Course Previews</small><strong>{demoCourses.length}</strong></div></div>
  </div>
  {activeCourses.length>0&&featured&&<section className="pml-featured" aria-label="Your featured course">
   <div className="pml-featured-image"><CourseCover db={db} course={featured} variant="card"/></div>
   <div className="pml-featured-body"><span className="pml-eyebrow"><TrendingUp size={14}/> YOUR COURSE SPOTLIGHT</span>
    <h2>{featured.title}</h2><p>{featured.summary||'Continue through your structured course curriculum.'}</p>
    <CourseProgress result={resolved[featured.id]} small/>
    <button className="pml-featured-action" type="button" onClick={()=>onOpen(featured.id)}>
     Continue Learning <ArrowRight size={16}/></button>
   </div>
  </section>}
  <section className="pml-library" aria-label="My course library">
   <div className="pml-library-head"><div><span className="pml-eyebrow">YOUR LIBRARY</span>
    <h2>My courses</h2><p>All published courses covered by your membership and your verified learning progress.</p></div>
    <button type="button" className="pml-explore-btn" onClick={onBrowse}><Compass size={16}/> Explore Catalog</button>
   </div>
   <div className="pml-toolbar">
    <div className="pml-filters" role="group" aria-label="Filter learning courses">
     {[
      {id:'all',name:'All Courses',count:activeCourses.length+demoCourses.length},
      {id:'active',name:openAccess?'Available':'Enrolled',count:activeCourses.length},
      {id:'demo',name:'Course Previews',count:demoCourses.length}
     ].map(x=><button key={x.id} type="button" aria-pressed={tab===x.id}
       className={tab===x.id?'active':''} onClick={()=>setTab(x.id)}>
       {x.name}<span>{x.count}</span></button>)}
    </div>
    <label className="pml-search"><Search size={17}/>
     <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
      placeholder="Find a course…" aria-label="Search your courses"/>
     {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={16}/></button>}
    </label>
   </div>
   {!!realShown.length&&<section className="pml-real-group" aria-label="Verified enrolled courses">
    <div className="pml-group-header"><div><span className="pml-group-icon"><ShieldCheck size={17}/></span>
      <div><h3>{openAccess?'Available Courses':'Active Enrollments'}</h3><p>Continue where you left off.</p></div></div>
     <strong>{realShown.length} courses</strong></div>
    <div className="pml-real-grid">{realShown.map(c=><RealCourseRow key={c.id} db={db} course={c}
      result={resolved[c.id]} onOpen={onOpen}/>)}</div>
   </section>}
   {!!demoShown.length&&<section className="pml-demo-group" aria-label="Simulation courses">
    <div className="pml-group-header"><div><span className="pml-group-icon pml-icon-demo"><Sparkles size={17}/></span>
      <div><h3>Course Previews</h3><p>Explore introductory lessons.</p></div></div>
     <strong>{demoShown.length} previews</strong></div>
    <div className="pml-demo-grid">{demoShown.map(c=><DemoCourseRow key={c.id} db={db}
      course={c} onOpen={onOpen}/>)}</div>
   </section>}
   {!realShown.length&&!demoShown.length&&<div className="pml-empty">
    <div className="pml-empty-icon"><BookOpen size={27}/></div>
    <h3>{isEmpty?'Start with a course you love':'No courses match your filters'}</h3>
    <p>{isEmpty?'Explore our published courses to begin. Your verified enrollments will appear here.':
     'Change the selected category or search phrase to find your course.'}</p>
    {isEmpty?<button className="lj-primary" type="button" onClick={onBrowse}>Explore Courses <ArrowRight size={16}/></button>:
     <button className="lj-quiet" type="button" onClick={()=>{setTab('all');setQuery('');}}>Clear filters</button>}
   </div>}
  </section>
  <section className="pml-next" aria-label="More learning tools">
   <div><span className="pml-next-icon"><Target size={19}/></span>
    <h3>Ready for more practice?</h3><p>Strengthen your skills with verified quizzes and results from courses you've enrolled in.</p></div>
   <div><button type="button" className="lj-primary" onClick={onPractice}>
      Go to Practice <ArrowRight size={16}/></button>
    <button type="button" className="lj-quiet" onClick={onHistory}>My Practice History</button></div>
  </section>
  
 </div>;
}
