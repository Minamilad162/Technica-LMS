import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Bookmark,BookOpen,FileQuestion,ArrowRight,Search,Layers3,ChevronLeft,ChevronRight,ChevronDown,CheckCircle2,FileText,GraduationCap,ShieldCheck} from 'lucide-react';
import {useDemo} from '../lib/store';
import {questionPool,topics} from '../data/mock';
import {allAdminCourses,courseStatus} from '../lib/adminCourses';
import {getCourseBank} from '../lib/courseWorkspace';

const PAGE_SIZE=20;
export default function SavedPage({questionBank=false}) {
 const {state,saveQuestion}=useDemo();const navigate=useNavigate();const[params,setParams]=useSearchParams();
 const[search,setSearch]=useState('');
 const[course,setCourse]=useState(()=>params.get('course')||'all');
 const[domain,setDomain]=useState(()=>topics.some(t=>t.id===params.get('domain'))?params.get('domain'):'all');
 const[page,setPage]=useState(1),[expanded,setExpanded]=useState(null);
 useEffect(()=>{if(questionBank){setCourse(params.get('course')||'all');}else{setDomain(topics.some(t=>t.id===params.get('domain'))?params.get('domain'):'all');}},[questionBank,params]);
 // One source of truth: ASP's original imported questions, PSEE's explicitly labeled
 // demo fixtures, and questions added/imported in each course's own Builder.
 const courseBanks=useMemo(()=>allAdminCourses(state).map(c=>({
  ...c,status:courseStatus(c),bank:getCourseBank(state,c.id,questionPool)
 })),[state]);
 const validCourse=course==='all'||courseBanks.some(c=>c.id===course)?course:'all';
 const totalBank=courseBanks.reduce((total,c)=>total+c.bank.length,0);
 const all=useMemo(()=>questionBank
  ?courseBanks.filter(c=>validCourse==='all'||c.id===validCourse)
     .flatMap(c=>c.bank.map(q=>({...q,courseId:c.id,courseName:c.name})))
  :courseBanks.flatMap(c=>c.bank).filter(q=>state.savedQuestions.includes(q.bankId||q.id))
 , [questionBank,courseBanks,validCourse,state.addedQuestions,state.savedQuestions]);
 const list=useMemo(()=>all.filter(q=>(questionBank||domain==='all'||q.domainId===domain)
  && [q.prompt,...(q.options||[]),q.topic||'',q.bankId||''].some(text=>String(text).toLowerCase().includes(search.toLowerCase().trim()))),[all,questionBank,domain,search]);
 const maxPage=Math.max(1,Math.ceil(list.length/PAGE_SIZE));const activePage=Math.min(page,maxPage);
 const shown=list.slice((activePage-1)*PAGE_SIZE,activePage*PAGE_SIZE);
 const setCourseFilter=id=>{setCourse(id);setParams(id==='all'?{}:{course:id});setPage(1);setExpanded(null)};
 const setDomainFilter=id=>{setDomain(id);setParams(id==='all'?{}:{domain:id});setPage(1);setExpanded(null)};
 const openBuilder=()=>navigate(`/builder?courseId=${validCourse==='all'?'asp':encodeURIComponent(validCourse)}`);
 return <div className="page-enter question-library">
  <div className="library-heading"><div><h1>{questionBank?'Question bank':'Saved questions'}</h1>
   <p className="page-subtitle">{questionBank?'Admin workspace · Browse questions by course. ASP is imported content; PSEE contains sample questions for the client demonstration.':'Questions you bookmarked during Practice or Assessment.'}</p>
  </div><span className="bank-count">{questionBank?<ShieldCheck size={18}/>:<BookOpen size={18}/>}{(questionBank?totalBank:all.length).toLocaleString()} questions</span></div>
  {questionBank?
   <section className="bank-course-area" aria-label="Filter the question bank by course">
    <div className="bank-course-head"><strong>Courses</strong><span>Select a course to inspect its questions</span></div>
    <div className="bank-course-selector">
     <button type="button" className={`bank-course-option ${validCourse==='all'?'active':''}`} aria-pressed={validCourse==='all'} onClick={()=>setCourseFilter('all')}><span className="bank-course-icon"><GraduationCap size={19}/></span><span className="bank-course-detail"><b>All courses</b><small>All question banks</small></span><strong className="bank-course-total">{totalBank.toLocaleString()}</strong></button>
     {courseBanks.map(c=><button key={c.id} type="button" className={`bank-course-option ${validCourse===c.id?'active':''}`} aria-pressed={validCourse===c.id} onClick={()=>setCourseFilter(c.id)}><span className="bank-course-icon"><BookOpen size={19}/></span><span className="bank-course-detail"><b>{c.name}</b><small>{c.id==='psee'?'Demo questions · Draft':c.status==='published'?'Published':c.status==='scheduled'?'Scheduled':'Draft'}</small></span><strong className="bank-course-total">{c.bank.length.toLocaleString()}</strong></button>)}
    </div>
    {validCourse==='psee'&&<p className="bank-demo-disclaimer" role="note">PSEE questions are fictional demo content for previewing this feature—not a validated learner assessment or part of the ASP Excel workbook.</p>}
   </section>
   :<div className="domain-filters" aria-label="Filter saved questions by ASP domain"><button className={domain==='all'?'active':''} onClick={()=>setDomainFilter('all')}>All saved <small>{all.length}</small></button>{topics.map(t=><button key={t.id} className={domain===t.id?'active':''} onClick={()=>setDomainFilter(t.id)}>{t.name}</button>)}</div>}
  <div className="saved-head"><div className="table-search"><Search size={17}/><input placeholder={questionBank?'Search questions, answers or topics...':'Search bookmarked questions...'} aria-label="Search questions" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div>{questionBank&&<button className="btn btn-secondary" onClick={openBuilder}>Open Course Builder <ArrowRight size={16}/></button>}</div>
  <div className="bank-list-meta">Showing {list.length?((activePage-1)*PAGE_SIZE)+1:0}–{Math.min(activePage*PAGE_SIZE,list.length)} of {list.length.toLocaleString()} matching questions</div>
  <div className="saved-list">{shown.map(q=>{const key=q.bankId||q.id;const isOpen=expanded===key;const saved=state.savedQuestions.includes(key);return <section className={`saved-row bank-entry ${isOpen?'bank-open':''}`} key={`${q.courseId||'asp'}:${key}`}><span className="saved-icon"><FileQuestion size={21}/></span><div className="bank-entry-body"><div className="bank-meta">{questionBank&&<span className="bank-origin">{q.courseName}</span>}<span><Layers3 size={13}/>{q.domain||q.topic||'General questions'}</span>{q.sample&&<span className="bank-sample-chip">Demo sample</span>}<span>{key}</span></div><button className="bank-prompt" onClick={()=>setExpanded(isOpen?null:key)} aria-expanded={isOpen}>{q.prompt}<ChevronDown className={isOpen?'rotate':''} size={18}/></button>{isOpen&&<div className="bank-answer-details"><div className="bank-choices">{(q.options||[]).map((answer,i)=><div key={i} className={i===q.correct?'correct':''}><b>{'ABCD'[i]}</b><span>{answer}</span>{i===q.correct&&<CheckCircle2 size={17}/>}</div>)}</div><div className="bank-explanation"><strong><BookOpen size={16}/> Explanation</strong><p>{q.explanation||'No explanation has been added.'}</p><small><FileText size={14}/>{q.reference||'Instructor-authored question'}</small></div></div>}</div><button className={`bank-save ${saved?'saved':''}`} aria-label={saved?'Remove bookmark':'Bookmark question'} title={saved?'Remove bookmark':'Save for later'} onClick={()=>saveQuestion(key)}><Bookmark size={19} fill={saved?'currentColor':'none'}/></button></section>})}
   {!list.length&&<div className="empty-state"><Bookmark size={30}/><h3>{questionBank?'No matching questions':'No saved questions yet'}</h3><p>{questionBank?'Select a different course, clear your search or add questions in Course Builder.':'Bookmark any question during a practice test to see it here.'}</p><button className="btn" onClick={()=>navigate(questionBank?'/builder':'/practice')}>{questionBank?'Go to Course Builder':'Go to practice'} <ArrowRight size={17}/></button></div>}</div>
  {maxPage>1&&<div className="bank-pagination"><span>Page {activePage} of {maxPage}</span><button disabled={activePage===1} onClick={()=>{setPage(p=>Math.max(1,p-1));setExpanded(null)}}><ChevronLeft size={16}/>Previous</button><button disabled={activePage>=maxPage} onClick={()=>{setPage(p=>Math.min(maxPage,p+1));setExpanded(null)}}>Next <ChevronRight size={16}/></button></div>}
 </div>;
}
