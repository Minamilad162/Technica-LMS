import HDImage from "../components/HDImage";
import React,{useState}from'react';import{useNavigate}from'react-router-dom';import{ArrowLeft,ArrowRight,BarChart3,Clock3,Target,FileText,Check,BookOpen,Info,AlertCircle}from'lucide-react';import{assets,topics}from'../data/mock';import{useDemo}from'../lib/store';import{Breadcrumb,MiniProgress,SelectButtons}from'../components/UI';

export default function AssessmentOverview(){
 const navigate=useNavigate();
 const {beginAssessment,notify,state,update}=useDemo();
 const[accepted,setAccepted]=useState(false);
 const [countPreset,setCountPreset]=useState([10,25,50].includes(state.assessmentQuestionCount)?String(state.assessmentQuestionCount):'custom');
 const domain=state.assessmentDomain||'domain1';
 const selected=topics.find(t=>t.id===domain);
 const questionCount=Math.max(1,Math.min(50,Number(state.assessmentQuestionCount)||50));
 const material=(domain==='all'?topics:selected?[selected]:[topics[0]]).map(t=>[t.name,domain==='all'?Math.floor(questionCount/5):questionCount,t.art,t.theme]);
 const timerMode=state.assessmentTimerMode||'whole';
 const durationLabel=timerMode==='none'?'No timer':timerMode==='per'?'60 sec / question':`${Math.max(1,Number(state.assessmentDurationMinutes)||60)} min`;
 function start(){if(!accepted){notify('Please read and accept the assessment instructions');return}if(beginAssessment({assessmentQuestionCount:questionCount}))navigate('/assessments/take')}
 function setCount(value){setCountPreset(value);update({assessmentQuestionCount:value==='custom'?Math.max(1,Math.min(50,Number(state.assessmentCustomCount)||35)):Number(value)})}
 return <div className="assessment-overview page-enter"><Breadcrumb items={['Assessments','ASP Question Bank']}/><h1>ASP Domain Assessment</h1><p className="page-subtitle">50 randomly selected questions from your chosen domain. Customize your assessment below.</p><div className="assessment-banner"><div className="orb"/><div><small>Assessment</small><h2>Ready to assess<br/>your knowledge?</h2><p>{questionCount} random questions <span>·</span> {durationLabel}</p></div><HDImage src={assets.plant} alt="Process safety industrial installation" sizes="(max-width: 740px) 52vw, 650px" priority/></div>
 <div className="assessment-stat-grid"><div className="assessment-stat mint"><span className="stat-icon"><BarChart3/></span><div><strong>{questionCount}</strong><small>Questions</small></div></div><div className="assessment-stat coral"><span className="stat-icon"><Clock3/></span><div><strong>{durationLabel}</strong><small>Duration</small></div></div><div className="assessment-stat lilac"><span className="stat-icon"><Target/></span><div><strong>70%</strong><small>Pass mark</small></div></div><div className="assessment-stat blue"><span className="stat-icon"><FileText/></span><div><strong>Attempt 1 of 3</strong><small>You have 2 attempts left</small></div></div></div>
 <section className="white-panel assessment-config-panel" aria-label="Customize assessment">
  <div className="assessment-config-heading"><div><h3>Build your assessment</h3><p>Choose a domain, then get a fresh random set on every attempt.</p></div><span className="assessment-random-badge">↻ Random, no repeats</span></div>
  <div className="assessment-config-grid">
   <label className="assessment-field"><span>Domain</span><select aria-label="Assessment domain" value={domain} onChange={e=>update({assessmentDomain:e.target.value,assessmentPool:'all'})}>
    {topics.map(t=><option key={t.id} value={t.id}>{t.name} · {t.questions} in question bank</option>)}
    <option value="all">All 5 domains · balanced mix</option>
   </select><small>{selected?`${selected.questions} available in ${selected.name}`:'1,625 questions across five domains'}</small></label>
   <div className="assessment-field"><span>Number of questions</span><SelectButtons values={[{value:'10',label:'10'},{value:'25',label:'25'},{value:'50',label:'50'},{value:'custom',label:'Custom'}]} value={countPreset} onChange={setCount}/>
    {countPreset==='custom'&&<input aria-label="Custom assessment question count" className="assessment-number-input" type="number" min="1" max="50" value={state.assessmentQuestionCount} onChange={e=>update({assessmentQuestionCount:e.target.value,assessmentCustomCount:e.target.value})}/>}
   </div>
  </div>
  <details className="assessment-more-options"><summary>More options <span>Timing · feedback · question pool</span></summary><div className="assessment-advanced-grid">
   <div className="assessment-field"><span>Timing</span><SelectButtons values={[{value:'none',label:'No timer'},{value:'whole',label:'Whole test'},{value:'per',label:'Per question'}]} value={timerMode} onChange={v=>update({assessmentTimerMode:v})}/>
    {timerMode==='whole'&&<label className="assessment-minutes-label">Minutes <input aria-label="Assessment timer minutes" type="number" min="1" max="180" value={state.assessmentDurationMinutes} onChange={e=>update({assessmentDurationMinutes:Math.min(180,Math.max(1,Number(e.target.value)||1))})}/></label>}</div>
   <div className="assessment-field"><span>Answer feedback</span><SelectButtons values={[{value:'end',label:'At the end'},{value:'each',label:'After each question'}]} value={state.assessmentFeedbackMode||'end'} onChange={v=>update({assessmentFeedbackMode:v})}/></div>
   <div className="assessment-field"><span>Question pool</span><SelectButtons values={[{value:'all',label:'All questions'},{value:'unseen',label:'Unseen'},{value:'mistakes',label:'Past mistakes'}]} value={state.assessmentPool||'all'} onChange={v=>update({assessmentPool:v})}/></div>
  </div></details>
 </section>
 <div className="assessment-content-grid"><section className="white-panel before-panel"><h3>Before you start</h3><p>Please read the following information.</p><div className="instructions">{[['Choose one answer per question.','Each question has a single correct answer.'],['You can flag questions and return to them.','Marked questions are easy to find.'],['The timer continues if you disconnect.','Your assessment will keep running.'],['Answers are saved automatically.','Your progress is always protected.']].map(([a,b],i)=><div className="instruction" key={a}><span>{i+1}</span><div><b>{a}</b><small>{b}</small></div></div>)}</div><div className="reference-note"><FileText size={20}/><div><strong>Results and references appear after submission.</strong><small>You’ll see your score and topic breakdown, with links to relevant resources.</small></div></div></section>
 <section className="white-panel assessment-content-panel"><h3>Assessment content</h3><p>{domain==='all'?'A balanced random selection across all five domains.':`Randomly selected from ${selected?.name||'the selected domain'} only.`}</p><div className="material-list">{material.map(([title,count,art,theme])=><div key={title} className={`material ${theme}`}><HDImage src={assets[art]} alt="" sizes="100px"/><b>{title}</b><small>{domain==='all'&&questionCount%5?`~${count}–${count+1}`:`${count}`} questions</small></div>)}</div><label className="checkbox-line"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I have read the assessment instructions.</span></label><div className="assessment-actions"><button className="btn btn-secondary" onClick={()=>navigate('/home')}><ArrowLeft size={17}/>Back to assessments</button><button className="btn" onClick={start}>Start assessment <ArrowRight size={17}/></button></div></section></div>
 </div>
}
