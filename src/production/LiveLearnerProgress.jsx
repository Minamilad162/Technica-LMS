import PremiumLoading from '../components/PremiumLoading.jsx';
import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertTriangle,ArrowLeft,BarChart3,BookOpen,CheckCircle2,ChevronDown,ChevronRight,Clock3,GraduationCap,LockKeyhole,RefreshCw,ShieldCheck,Target} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog,mayReadLiveCourse} from './liveLearningApi.js';
import {getLearnerProgress} from './learnerProgressApi.js';
import './liveLearning.css';
import './learnerProgress.css';

const pct=n=>n===null||n===undefined?'—':`${Number(n).toFixed(1).replace(/\.0$/,'')}%`;
const fmtDate=d=>{if(!d)return '—';const x=new Date(d);return Number.isNaN(x.getTime())?'—':x.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
const modes={quick10:'Quick 10',timed25:'Timed Quiz',custom:'Custom Practice',domain:'Domain Practice',levelup:'Level Up',asp_mock_200:'ASP Mock'};
function Stat({icon:Icon,title,value,detail}){
 return <div className="p11-stat"><span className="p11-stat-icon"><Icon size={19}/></span><span className="p11-stat-title">{title}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function ProgressBar({value,label}){
 return <div className="p11-meter" aria-label={label}>
  <div className="p11-meter-track"><span style={{width:`${value??0}%`}}/></div>
  <b>{pct(value)}</b>
 </div>;
}
export default function LiveLearnerProgress(){
 const nav=useNavigate();
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState({loading:true,error:'',catalog:null,db:null});
 const [courseId,setCourseId]=useState('');
 const [report,setReport]=useState(null);
 const [reportLoading,setReportLoading]=useState(false);
 const [reportError,setReportError]=useState('');
 const [expanded,setExpanded]=useState({});
 useEffect(()=>{
  let active=true,db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,error:e.message||'Supabase configuration required',catalog:null,db:null});return;}
  setState({loading:true,error:'',catalog:null,db});
  fetchLiveLearningCatalog(db).then(catalog=>{
   if(!active)return;
   setState({loading:false,error:'',catalog,db});
   setCourseId(previous=>{
    const allowed=catalog.courses.filter(c=>mayReadLiveCourse(catalog,c));
    return allowed.some(c=>c.id===previous)?previous:allowed[0]?.id||'';
   });
  }).catch(e=>{if(active)setState({loading:false,error:e.message||'Unable to verify your course access',catalog:null,db});});
  return()=>{active=false;};
 },[revision]);
 const {catalog,db,loading,error}=state;
 const courses=useMemo(()=>(catalog?.courses||[]).filter(c=>mayReadLiveCourse(catalog,c)),[catalog]);
 const chosen=courses.find(c=>c.id===courseId);
 useEffect(()=>{
  if(!db||!chosen){setReport(null);setReportError('');return;}
  let active=true;
  setReport(null);setReportError('');setReportLoading(true);
  getLearnerProgress(db,chosen.id).then(data=>{if(active)setReport(data);})
   .catch(e=>{if(active)setReportError(e.message||'Progress statistics unavailable');})
   .finally(()=>{if(active)setReportLoading(false);});
  return()=>{active=false;};
 },[db,chosen?.id,revision]);
 return <main className="live-learning p11-page page-enter">
  <div className="live-learning-breadcrumb">
   <button type="button" onClick={()=>nav('/home')}><ArrowLeft size={16}/> Home</button>
   <ChevronRight size={15}/> My Progress
  </div>
  <header className="live-learning-header">
   <span className="eyebrow">LEARNER PROGRESS · SECURE SUPABASE</span>
   <h1>My Progress &amp; Analytics</h1>
   <p>Verified learning completion, Practice performance, and Mock Exam history for your own enrolled course.</p>
  </header>
  <div className="live-learning-security"><ShieldCheck size={16}/>
   Your own server-verified metrics only · No demo percentages, other learner records, or hidden answer keys.
  </div>
  {loading?<PremiumLoading variant="page"/>:
   error?<div className="live-learning-empty" role="alert"><AlertTriangle size={21}/><b>Progress unavailable</b><p>{error}</p><button className="btn" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/> Retry</button></div>:
   !courses.length?<div className="live-learning-empty"><LockKeyhole size={22}/><b>No accessible courses</b><p>Progress appears when you have an active, authorized course.</p></div>:<>
    <div className="p11-toolbar">
     <label htmlFor="p11-course">Course</label>
     <select id="p11-course" value={courseId} onChange={e=>{setCourseId(e.target.value);setExpanded({});}}>
      {courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}
     </select>
     <button type="button" className="btn btn-secondary" onClick={()=>setRevision(n=>n+1)}>
      <RefreshCw size={16}/> Refresh
     </button>
    </div>
    {reportLoading?<PremiumLoading variant="compact"/>:
     reportError?<div className="live-learning-empty" role="alert"><AlertTriangle size={22}/><b>Analytics not ready</b>
       <p>{reportError}</p><small>P11 requires its separately approved Supabase migration. No demo values will be shown.</small>
      </div>:
     report?<div className="p11-content">
      <section aria-label="Your verified KPIs" className="p11-kpis">
       <Stat icon={GraduationCap} title="Lessons completed" value={`${report.learning.completedLessons} / ${report.learning.totalLessons}`}
        detail={`Course progress: ${pct(report.learning.completionPercent)}`}/>
       <Stat icon={Target} title="Practice answer accuracy" value={pct(report.practice.answerAccuracyPercent)}
        detail={`${report.practice.correctAnswers} correct of ${report.practice.answeredQuestions} answered`}/>
       <Stat icon={BarChart3} title="Mock score" value={pct(report.mock.scoredPercent)}
        detail={`${report.mock.attempts} completed or expired mock exams`}/>
       <Stat icon={BookOpen} title="Practice sessions" value={report.practice.attempts}
        detail={`${report.practice.levelUpAttempts} Level Up sessions`}/>
      </section>
      <section className="p11-panels">
       <article className="p11-panel">
        <div className="p11-panel-head"><h2>Learning completion</h2><span><BookOpen size={17}/> Verified P2 records</span></div>
        <ProgressBar value={report.learning.completionPercent} label="Course completion percentage"/>
        <div className="p11-mini-stats"><span><b>{report.learning.readingCompleted}</b> Reading complete</span>
         <span><b>{report.learning.videoCompleted}</b> Videos complete</span>
         <span><b>{report.learning.quizzesPassed}</b> Lesson quizzes passed</span></div>
        <p className="p11-help">A lesson counts as complete only when the server has recorded its completion. Viewing a lesson alone does not count.</p>
       </article>
       <article className="p11-panel">
        <div className="p11-panel-head"><h2>Assessment performance</h2><span><Target size={17}/> Server grading</span></div>
        <div className="p11-performance"><div><strong>Practice</strong><b>{pct(report.practice.scoredPercent)}</b><small>Score / assigned questions</small></div>
         <div><strong>Mock Exam</strong><b>{pct(report.mock.scoredPercent)}</b><small>Score / 200 per completed exam</small></div></div>
        <p className="p11-help">Answer accuracy uses answered questions; scored percentage includes unanswered assigned questions. Abandoned and active attempts are excluded.</p>
       </article>
      </section>
      <section className="p11-panel" aria-label="Domain and Topic progress">
       <div className="p11-panel-head"><div><h2>Domains &amp; Topics</h2><p>Course → Domain → Topic → Lesson</p></div><span><ShieldCheck size={17}/> Verified progress</span></div>
       {!report.domains.length?<p className="p11-help">No authorized domains are available for this course yet.</p>:
        <div className="p11-domains">{report.domains.map(d=><article className="p11-domain" key={d.id}>
         <button type="button" className="p11-domain-trigger" aria-expanded={expanded[d.id]===true}
          onClick={()=>setExpanded(x=>({...x,[d.id]:!x[d.id]}))}>
          <span className="p11-domain-copy"><strong>{d.title}</strong>
           <small>{d.completedLessons} / {d.totalLessons} lessons complete · {d.topicCount} topics</small></span>
          <span className="p11-domain-metrics"><span>Answer accuracy: <b>{pct(d.answerAccuracyPercent)}</b>
            <small>{d.answeredQuestions} answered</small></span>
           <span>Learning: <b>{pct(d.completionPercent)}</b></span>
           {expanded[d.id]?<ChevronDown size={18}/>:<ChevronRight size={18}/>}</span>
         </button>
         {expanded[d.id]&&<div className="p11-topic-list">
          {!d.topics.length?<p className="p11-help">No topics have been published.</p>:
           d.topics.map(t=><div className="p11-topic" key={t.id}>
            <div><b>{t.title}</b><small>{t.completedLessons} / {t.totalLessons} verified lessons · {t.quizzesPassed} quizzes passed</small></div>
            <ProgressBar value={t.completionPercent} label={`Topic ${t.title} completion`}/>
           </div>)}
          <p className="p11-help">Question accuracy by Topic is not available: the current question bank has Domain-level mapping only. No estimated Topic scores are shown.</p>
         </div>}
        </article>)}</div>}
      </section>
      <section className="p11-panel" aria-label="Recent assessment history">
       <div className="p11-panel-head"><h2>Recent completed assessments</h2><span><Clock3 size={17}/> Latest 10</span></div>
       {!report.recentAttempts.length?<p className="p11-help">No graded Practice or Mock attempts have been recorded yet.</p>:
        <div className="p11-history-wrap"><table className="p11-history"><thead><tr><th>Assessment</th><th>Date</th><th>Result</th><th>Score</th><th>Status</th></tr></thead>
         <tbody>{report.recentAttempts.map((a,i)=><tr key={i}><td>{modes[a.mode]||a.mode}</td>
          <td>{fmtDate(a.submittedAt)}</td><td>{a.correctCount} / {a.questionCount}</td>
          <td><b>{pct(a.scorePercent)}</b></td><td>{a.state==='expired'?'Time expired':'Submitted'}</td></tr>)}</tbody>
        </table></div>}
      </section>
      <div className="p11-footer"><button className="btn btn-secondary" onClick={()=>nav('/my-learning')}>
       <BookOpen size={16}/> Back to learning
      </button><button className="btn" onClick={()=>nav('/practice/live')}>Continue Practice <ChevronRight size={16}/></button></div>
      <p className="p11-help">Last verified report: {fmtDate(report.generatedAt)}. These are your own server-stored records; progress does not imply certification or an official BCSP result.</p>
     </div>:null}
   </>}
 </main>;
}
