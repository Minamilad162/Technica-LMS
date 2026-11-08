import React,{useEffect,useMemo,useState} from 'react';
import {AlertCircle,BookOpen,CheckCircle2,FileQuestion,FileSpreadsheet,Plus,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {importQuestionFile} from '../lib/questionImport.js';
import {approveNonAspBankQuestion,importCourseBank,listCourseBank,mappedImportRows,reserveNonAspMockQuestion,setQuestionBankFlags,attachBankToLesson} from './courseQuestionBankApi.js';
import {liveCourseTree} from './liveAuthoringApi.js';
import {isAspCourseTitle,isOfficialAspCourse,preferredQuestionBankCourse,questionBankCatalogState} from './questionBankCourseSelection.js';
import {AdminQuestionsPanel,AdminMockPanel} from './AdminToolsPanels.jsx';
import './courseQuestionBank.css';

const fail=e=>e?.message||'The protected Question Bank request failed.';
const initial=()=>({prompt:'',options:['','','',''],correct:0,explanation:''});
function Status({value}){return <span className={'p28-status '+(value==='approved'?'approved':value==='mock'?'mock':'draft')}>{value}</span>;}

export default function AdminCourseBank({db,courses=[],asp,onUpdate,mode='bank',coursesLoading=false,coursesError='',onRefreshCourses,onGoToCourses}){
 const [courseId,setCourseId]=useState(''),[domains,setDomains]=useState([]),[domainId,setDomainId]=useState('');
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const [filterDomain,setFilterDomain]=useState(''),[difficulty,setDifficulty]=useState(''),[usage,setUsage]=useState('all');
 const [bank,setBank]=useState({total:0,items:[]}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(null),[uploadCount,setUploadCount]=useState(0);
 const [manual,setManual]=useState(null),[expanded,setExpanded]=useState(null);
 const [lessons,setLessons]=useState([]),[pickedLesson,setPickedLesson]=useState({});
 const selected=useMemo(()=>courses.find(c=>c.id===courseId),[courses,courseId]);
 const courseProblem=questionBankCatalogState(courses,coursesLoading,coursesError);
 const aspIdentityMismatch=!!selected&&isAspCourseTitle(selected)&&!isOfficialAspCourse(selected);
 useEffect(()=>{if(!courses.some(c=>c.id===courseId))setCourseId(preferredQuestionBankCourse(courses)?.id||'');},[courses,courseId]);
 useEffect(()=>{setOffset(0);setSearch('');setQuery('');setPending(null);setManual(null);setExpanded(null);
  setError('');setNotice('');setDomainId('');setFilterDomain('');setDifficulty('');setUsage('all');setDomains([]);setLessons([]);setPickedLesson({});
  if(!courseId)return;
  let live=true;
  Promise.all([
   db.from('lms_domains').select('id,slug,title').eq('course_id',courseId).order('position',{ascending:true}),
   liveCourseTree(db,courseId)
  ]).then(([result,tree])=>{
   if(!live)return;
   if(result.error)setError('Course domains unavailable.');
   else setDomains(result.data||[]);
   setLessons((tree||[]).flatMap(d=>(d.topics||[]).flatMap(t=>(t.lessons||[]).map(l=>({
    id:l.id,label:d.title+' / '+t.title+' / '+l.title
   })))));
  }).catch(e=>{if(live)setError('Course lesson list unavailable: '+fail(e));});
  return()=>{live=false;};
 },[db,courseId]);
 useEffect(()=>{
  if(!courseId)return;let live=true;setLoading(true);setError('');
  listCourseBank(db,courseId,{search:query,offset,limit:50,domainId:filterDomain||null,difficulty,usage})
   .then(data=>{if(live)setBank(data);})
   .catch(e=>{if(live){setBank({total:0,items:[]});setError('P28 Question Bank unavailable: '+fail(e));}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,courseId,query,offset,filterDomain,difficulty,usage,revision]);
 const refresh=()=>{setRevision(n=>n+1);onUpdate?.();};
 async function readFile(file){
  if(!file||!courseId||busy||aspIdentityMismatch)return;
  setError('');setNotice('');setPending(null);setUploadCount(0);
  try{
   const data=await importQuestionFile(file,courseId,domainId);
   if(!data.questions.length)throw Error('No valid questions found. Check the required columns.');
   const mapped=mappedImportRows(data.questions,domainId||null,domains);
   // Import creates Draft questions only. Admin must confirm the row count.
   setPending({courseId,filename:file.name,rows:mapped,problems:data.problems,sheets:data.sheets,unmappedLabels:[...new Set(mapped.map(q=>q.unmappedDomainLabel).filter(Boolean))]});
  }catch(e){setError(fail(e));}
 }
 async function upload(){
  if(!pending||pending.courseId!==courseId||busy||aspIdentityMismatch)return;
  if(!window.confirm('Import '+pending.rows.length+' valid questions as DRAFT into '+selected.title+'? '+pending.rows.filter(q=>!q.domainId).length+' will remain unassigned to a Domain until human review. Existing questions and Mock reservations will not be modified.'))return;
  setBusy(true);setError('');setNotice('');
  let inserted=0,skipped=0;
  try{
   for(let start=0;start<pending.rows.length;start+=50){
    const result=await importCourseBank(db,courseId,pending.rows.slice(start,start+50));
    inserted+=result.inserted||0;skipped+=result.skipped||0;setUploadCount(start+Math.min(50,pending.rows.length-start));
   }
   setNotice(inserted+' Draft questions imported · '+skipped+' duplicates skipped. Review before publication.');
   setPending(null);setOffset(0);refresh();
  }catch(e){setError('Import stopped after '+inserted+' inserted / '+skipped+' skipped. Rerun the same file safely: '+fail(e));refresh();}
  finally{setBusy(false);}
 }
 async function addManual(e){
  e.preventDefault();if(!manual||busy||aspIdentityMismatch)return;
  const values=manual.options.map(x=>x.trim()).filter(Boolean);
  if(manual.prompt.trim().length<5||values.length<2||!values[manual.correct]){setError('Provide a question, two options and a correct answer.');return;}
  setBusy(true);setError('');
  try{
   const row={prompt:manual.prompt.trim(),options:values,correctIndex:manual.correct,
    domainId:domainId||null,topic:'Manual',explanation:manual.explanation||'',
    reference:'Admin manual entry'};
   const results=mappedImportRows([{...row,correct:row.correctIndex,reference:row.reference,difficulty:'unclassified',domainLabel:''}],domainId||null,domains);
   const outcome=await importCourseBank(db,courseId,results);
   setNotice(outcome.inserted?'Manual question saved as Draft.':'Matching question already exists; nothing overwritten.');
   setManual(null);refresh();
  }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function action(q,kind){
  if(busy)return;
  const message=kind==='approve'
   ?'Confirm you have verified this non-ASP question, its correct answer and its commercial content rights. Approve it for learner Practice and Lesson Quizzes?'
   :'Reserve this DRAFT question as Mock-only? It will not appear in Practice or Lesson Quizzes. Existing quiz links must be removed first. This does not create a non-ASP Mock exam.';
  if(!window.confirm(message))return;
  setBusy(true);setError('');setNotice('');
  try{
   if(kind==='approve'){await approveNonAspBankQuestion(db,q.id);setNotice('Question approved for its course.');}
   else{await reserveNonAspMockQuestion(db,q.id);setNotice('Question marked Mock-only. No non-ASP Mock engine has been activated.');}
   refresh();
  }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function changeFlags(q,key,checked){
  if(busy||typeof q.isActive!=='boolean'||typeof q.mockCandidate!=='boolean')return;
  const newActive=key==='active'?checked:q.isActive;
  const newMock=key==='mock'?checked:(!checked?false:q.mockCandidate);
  if(key==='mock'&&checked&&!window.confirm('Mark as Mock Exam candidate? The question will be excluded from Practice and Lesson Quizzes. Official ASP Mock reservation still requires 200 independently reviewed questions.'))return;
  if(key==='active'&&!checked&&!window.confirm('Disable this question for new Practice and unpublish linked Lesson Quizzes? Any temporary Mock candidate tick will also be cleared. Existing grades stay intact.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await setQuestionBankFlags(db,q.id,newActive,newMock);
   setNotice(key==='active'?(checked?'Question enabled. Publication still requires approval.':'Question disabled; linked published Lesson quizzes were unpublished.'):
     (checked?'Selected as Mock candidate. Finalize exactly 200 from Exams & Mock.':'Removed Mock candidate selection.'));
   if(result.unpublishedLessonQuizItems)setNotice('Question disabled; '+result.unpublishedLessonQuizItems+' published Lesson Quiz entries unpublished.');
   refresh();
  }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function assignLesson(q){
  const lessonId=pickedLesson[q.id];
  if(busy||!lessonId||!q.isActive||q.mockCandidate||q.mockExclusive)return;
  setBusy(true);setError('');setNotice('');
  try{
   await attachBankToLesson(db,lessonId,q.id,q.approvalState==='approved');
   setNotice('Question added to '+(lessons.find(l=>l.id===lessonId)?.label||'Lesson')+' Quiz.'+
    (q.approvalState==='approved'?' Published.':' Draft until approval.'));
   setPickedLesson(v=>({...v,[q.id]:''}));refresh();
  }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 return <div className="p28-workspace at-stack at-animate">
  <div className="at-section-title"><div><span className="at-eyebrow">COURSE-SCOPED QUESTION BANK</span>
   <h2>{mode==='mock'?'Mock question selection':'Question Bank'}</h2>
   <p>One protected Question Bank per Course. Lesson Quiz, Assessment, Practice and Mock use the same question IDs; publication and reservations are checked by Supabase.</p></div>
   <button type="button" className="at-outline" onClick={refresh} disabled={busy}><RefreshCw size={14}/> Refresh</button></div>
  <div className="p28-top"><label>Course
   <select value={courseId} disabled={busy||coursesLoading||!!coursesError||!courses.length} onChange={e=>setCourseId(e.target.value)}>
    {!courses.length&&<option value="">No real Courses loaded</option>}
    {courses.map(c=><option key={c.id} value={c.id}>{c.title}{c.slug?' · '+c.slug:''}</option>)}
   </select></label>
   {mode==='bank'&&<label>Default domain for uploaded questions with no domain
    <select value={domainId} disabled={busy} onChange={e=>{setDomainId(e.target.value);setPending(null);}}>
     <option value="">Unassigned — classify later</option>
     {domains.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}
    </select></label>}</div>
  {courseProblem.status!=='ready'&&<div className="at-surface p28-catalog-state" role={coursesError?'alert':'status'}>
   <strong>{courseProblem.status==='loading'?'Loading Course Question Banks':courseProblem.status==='error'?'Could not load Courses':'No real database Courses found'}</strong>
   <p>{courseProblem.message}</p>
   <div className="p28-catalog-actions">
    <button type="button" className="at-outline" onClick={()=>onRefreshCourses?.()} disabled={coursesLoading}><RefreshCw size={15}/> Retry loading</button>
    <button type="button" className="at-primary" onClick={()=>onGoToCourses?.()} disabled={!onGoToCourses}>Open Courses</button>
   </div>
  </div>}
  {aspIdentityMismatch&&<p role="alert" className="at-disclaimer">
   This Course is titled ASP but its database slug is <code>{selected.slug||'(missing)'}</code>, not <code>asp</code>.
   The official ASP Review and Mock processes require the canonical Course identity. Upload/approval are blocked for this Course until its existing database record is verified; do not create a duplicate.
  </p>}
  {selected&&bank.compatibilityMode&&<p role="status" className="at-disclaimer">
    This database still has the old P28 Question Bank. File upload can work, but Domain/Difficulty filters and Active/Mock/Quiz controls need P28.2 + P29 migrations. The fallback list is unfiltered.
   </p>}
  {selected&&!bank.compatibilityMode&&bank.items.length>0&&typeof bank.items[0].isActive!=='boolean'&&<p role="status" className="at-disclaimer">
    Apply P29 to enable per-question Active, Mock Exam and Lesson Quiz controls. Questions remain unchanged until then.
   </p>}
  {selected&&<div className="p28-filters at-surface">
   <label>Domain<select aria-label="Filter bank by domain" value={filterDomain} onChange={e=>{setFilterDomain(e.target.value);setOffset(0);}}>
    <option value="">All domains</option>
    {domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
   </select></label>
   <label>Difficulty<select aria-label="Filter bank by difficulty" value={difficulty} onChange={e=>{setDifficulty(e.target.value);setOffset(0);}}>
    <option value="">Any difficulty</option><option value="unclassified">Unclassified</option>
    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
   </select></label>
   <label>Usage<select aria-label="Filter bank by usage" value={usage} onChange={e=>{setUsage(e.target.value);setOffset(0);}}>
    <option value="all">All questions</option><option value="draft">Draft / awaiting review</option>
    <option value="practice">Approved · Practice / Assessment</option>
    <option value="eligible">Eligible for Lesson Quiz</option>
    <option value="lesson">Linked to Lesson Quiz</option>
    <option value="mock">Mock-only reserved</option>
   </select></label>
  </div>}
  {!selected?null:<>
   {error&&<p role="alert" className="at-error"><AlertCircle size={15}/>{error}</p>}
   {notice&&<p role="status" className="at-success"><CheckCircle2 size={15}/>{notice}</p>}
   {mode==='bank'&&<div className="p28-import at-surface">
    <div><h3><FileSpreadsheet size={19}/> Upload Question File</h3>
     <p>Upload all ASP questions here once. Columns: Question, Option A–F, Correct Answer, Domain, Difficulty, Explanation, Reference (last four optional). Every worksheet is parsed. Imported rows remain Draft until review.</p></div>
    <label className="p28-file">Choose .xlsx or .csv file
     <input type="file" accept=".xlsx,.csv" disabled={busy||aspIdentityMismatch} onChange={e=>{void readFile(e.target.files?.[0]);e.target.value='';}}/></label>
    <button className="at-outline" type="button" disabled={busy||aspIdentityMismatch} onClick={()=>{setPending(null);setManual(initial());}}><Plus size={14}/> Add manually</button>
    {pending&&<div className="p28-preview"><b>{pending.filename} · {pending.rows.length} valid · {pending.problems.length} import notes</b>
     <span>{pending.sheets.join(', ')}</span>
     <small>{pending.rows.filter(q=>!q.domainId).length} questions currently have no mapped Domain. Map ambiguous worksheet labels below before importing, or leave them unassigned for human ASP11 review.</small>
     {!!pending.unmappedLabels.length&&<div className="p28-domain-map">
      <strong>Map spreadsheet labels to real Course Domains (optional)</strong>
      {pending.unmappedLabels.map(label=><label key={label}><span>{label}</span>
       <select aria-label={'Map source Domain '+label} value={pending.rows.find(q=>q.unmappedDomainLabel===label)?.domainId||''}
        onChange={e=>setPending(v=>({...v,rows:v.rows.map(q=>q.unmappedDomainLabel===label?{...q,domainId:e.target.value||null}:q)}))}>
        <option value="">Leave unassigned for review</option>
        {domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
       </select></label>)}
     </div>}
     {pending.rows.slice(0,3).map((q,i)=><small key={i}>{i+1}. {q.prompt} · {q.difficulty} · {q.domainId?domains.find(d=>d.id===q.domainId)?.title:'Unassigned domain'}</small>)}
     {!!pending.problems.length&&<details><summary>Import validation notes</summary>{pending.problems.slice(0,20).map((p,i)=><small key={i}>{p}</small>)}</details>}
     <button className="at-primary" type="button" disabled={busy||aspIdentityMismatch} onClick={upload}>{busy?'Importing '+uploadCount+'/'+pending.rows.length:'Confirm Draft Import'}</button></div>}
    {manual&&<form className="p28-manual" onSubmit={addManual}>
     <label>Question<textarea value={manual.prompt} onChange={e=>setManual(v=>({...v,prompt:e.target.value}))} rows={2} required/></label>
     {manual.options.map((answer,i)=><label key={i}>Option {String.fromCharCode(65+i)}
      <span><input type="radio" checked={manual.correct===i} onChange={()=>setManual(v=>({...v,correct:i}))}/>
       <input value={answer} onChange={e=>setManual(v=>({...v,options:v.options.map((s,j)=>i===j?e.target.value:s)}))}/></span></label>)}
     <label>Explanation (optional)<textarea value={manual.explanation} onChange={e=>setManual(v=>({...v,explanation:e.target.value}))} rows={2}/></label>
     <div><button type="button" className="at-outline" onClick={()=>setManual(null)}>Cancel</button><button disabled={busy} className="at-primary" type="submit">Save Draft Question</button></div>
    </form>}
   </div>}
   <div className="at-surface p28-questions">
    <div className="p28-list-title"><strong><FileQuestion size={17}/> {bank.total} questions · {selected.title}</strong>
     <form onSubmit={e=>{e.preventDefault();setQuery(search.trim());setOffset(0);}}>
      <input aria-label="Search course questions" placeholder="Search question or source ID" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="at-outline" type="submit"><Search size={14}/> Search</button>
     </form></div>
    <p className="p29-help">Active is enabled by default, but a Draft question is still hidden until reviewed. Mock Exam selects candidates; final ASP Mock reservation happens in Exams & Mock (200 questions).</p>
    {loading?<p>Loading the protected course bank…</p>:!bank.items.length?<p>No questions on this page. Upload an Excel file or adjust the search.</p>:
     <div className="p28-rows">{bank.items.map(q=><article key={q.id} className="p28-question">
      <div className="p28-row-title"><button type="button" onClick={()=>setExpanded(v=>v===q.id?null:q.id)} aria-expanded={expanded===q.id}>{q.prompt}</button>
       <Status value={q.mockExclusive?'mock':q.mockCandidate?'mock':q.approvalState}/></div>
      <div className="p28-row-meta"><span>{q.sourceId}</span>
       <span>{domains.find(d=>d.id===q.domainId)?.title||'Unassigned Domain'}</span>
       <span>{q.difficulty||'unclassified'}</span>
       <span>{q.mockExclusive?'Mock-only':q.approvalState==='approved'?'Practice / Assessment':q.approvalState}</span>
       <span>{q.linkedCount} Lesson Quiz links</span></div>
      <div className="p29-question-controls">
       <label title={typeof q.isActive!=='boolean'?'Apply P29 migration to enable this control':q.mockExclusive?'Immutable official Mock reservation':''}>
        <input type="checkbox" aria-label={'Active: '+q.prompt} checked={q.isActive===true}
         disabled={busy||typeof q.isActive!=='boolean'||q.mockExclusive}
         onChange={e=>void changeFlags(q,'active',e.target.checked)}/>
        Active
       </label>
       <label title={q.mockExclusive?'Official Mock form reserved; cannot edit':q.approvalState!=='draft'?'Only unused Draft questions can be reserved for Mock':''}>
        <input type="checkbox" aria-label={'Mock Exam: '+q.prompt}
         checked={q.mockExclusive||q.mockCandidate===true}
         disabled={busy||typeof q.mockCandidate!=='boolean'||q.mockExclusive||
          (!q.mockCandidate&&(q.approvalState!=='draft'||q.linkedCount>0||!q.isActive))}
         onChange={e=>void changeFlags(q,'mock',e.target.checked)}/>
        Mock Exam
       </label>
       {q.mockExclusive&&<small>Official reserved</small>}
       {!q.mockExclusive&&q.mockCandidate&&<small>Candidate · complete 200-item review</small>}
      </div>
      {mode==='bank'&&<div className="p29-lesson-picker">
       <label htmlFor={'p29-lesson-'+q.id}>Lesson Quiz</label>
       <select id={'p29-lesson-'+q.id} aria-label={'Assign Lesson Quiz: '+q.prompt}
        value={pickedLesson[q.id]||''} disabled={busy||!q.isActive||q.mockExclusive||q.mockCandidate||q.approvalState==='archived'}
        onChange={e=>setPickedLesson(v=>({...v,[q.id]:e.target.value}))}>
        <option value="">Select a lesson…</option>
        {lessons.map(l=><option key={l.id} value={l.id} disabled={(q.linkedLessonIds||[]).includes(l.id)}>
         {l.label}{(q.linkedLessonIds||[]).includes(l.id)?' ✓ already linked':''}
        </option>)}
       </select>
       <button type="button" className="at-outline" disabled={busy||!pickedLesson[q.id]||!q.isActive||q.mockExclusive||q.mockCandidate}
        onClick={()=>void assignLesson(q)}>Add to Quiz</button>
       {(q.linkedLessonIds||[]).length>0&&<small>Linked: {(q.linkedLessonIds||[]).map(id=>lessons.find(l=>l.id===id)?.label||'Lesson').join(' · ')}</small>}
      </div>}
      {expanded===q.id&&<div className="p28-answers">{q.options.map((answer,i)=><p key={i} className={i===q.correctIndex?'correct':''}>
       <strong>{String.fromCharCode(65+i)}.</strong> {answer}{i===q.correctIndex?' ✓':''}</p>)}</div>}
      <div className="p28-actions">
       {selected.slug!=='asp'&&q.approvalState==='draft'&&!q.mockExclusive&&<>
        {mode==='bank'&&<button disabled={busy} type="button" className="at-outline" onClick={()=>action(q,'approve')}><CheckCircle2 size={13}/> Approve for quizzes</button>}
        <button type="button" disabled={busy||q.linkedCount>0} className="at-outline" title={q.linkedCount?'Unlink from all Lesson Quizzes first':''}
         onClick={()=>action(q,'mock')}><ShieldCheck size={13}/> Mark Mock-only</button></>}
       {selected.slug==='asp'&&q.mockExclusive&&<small>Reserved by the controlled ASP Mock flow</small>}
      </div>
     </article>)}</div>}
    <div className="p28-pages"><button type="button" className="at-outline" disabled={loading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Previous</button>
     <span>{Math.floor(offset/50)+1} / {Math.max(1,Math.ceil(bank.total/50))}</span>
     <button type="button" className="at-outline" disabled={loading||offset+50>=bank.total} onClick={()=>setOffset(n=>n+50)}>Next</button></div>
   </div>
   {selected.slug==='asp'&&mode==='bank'&&<section className="p28-asp-review"><AdminQuestionsPanel db={db} asp={asp||selected} onUpdate={refresh}/></section>}
   {selected.slug==='asp'&&mode==='mock'&&<AdminMockPanel db={db} asp={asp||selected}/>}
   {selected.slug!=='asp'&&mode==='mock'&&!aspIdentityMismatch&&<p className="at-disclaimer"><ShieldCheck size={16}/> Non-ASP Mock-only marks exclude questions from learner Practice and Lesson Quizzes. Launching a Mock for this Course requires a separate versioned exam form and server-side assessment engine.</p>}
  </>}
 </div>;
}
