import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AlertCircle,BookOpen,CheckCircle2,FileQuestion,FileSpreadsheet,Plus,RefreshCw,Search,ShieldCheck,Save,Undo2,Upload,SlidersHorizontal} from 'lucide-react';
import {importQuestionFile} from '../lib/questionImport.js';
import {importCourseBank,listCourseBank,mappedImportRows,saveCourseBankBatch,getCourseBankBatchCapabilities,inspectLessonQuizPublication,existingPracticeImportPreview,activateExistingPracticeImports} from './courseQuestionBankApi.js';
import {stagedQuestionEdit,stagedToBatch,originalQuestionValues,BANK_DIFFICULTIES} from './questionBankDraft.js';
import {liveCourseTree} from './liveAuthoringApi.js';
import {isAspCourseTitle,isOfficialAspCourse,preferredQuestionBankCourse,questionBankCatalogState} from './questionBankCourseSelection.js';
import {getMockReadiness} from './mockApi.js';
import {AdminQuestionsPanel,AdminMockPanel} from './AdminToolsPanels.jsx';
import OfficialMockBankFinalizer from './OfficialMockBankFinalizer.jsx';
import {repairExistingAspCourseId} from './aspCourseSetupApi.js';
import './courseQuestionBank.css';

const fail=e=>e?.message||'The protected Question Bank request failed.';
const initial=()=>({prompt:'',options:['','','',''],correct:0,explanation:''});
function Status({value}){const label=value==='candidate'?'Selected for Mock':value==='mock'?'Official Mock':value;
 return <span title={value==='candidate'?'Saved Mock selection automatically enters the Course Mock pool after Save All':value==='draft'?'Draft in Bank · can be published to a selected Lesson on Save':value==='approved'?'Approved question · learner visibility also requires a published Lesson Quiz link':'Reserved for official Mock · excluded from Practice'} className={'p28-status '+(value==='candidate'?'draft':value==='approved'?'approved':value==='mock'?'mock':'draft')}>{label}</span>;}

export default function AdminCourseBank({db,courses=[],asp,onUpdate,onDirtyChange,mode='bank',coursesLoading=false,coursesError='',onRefreshCourses,onGoToCourses}){
 const [courseId,setCourseId]=useState(''),[domains,setDomains]=useState([]),[domainId,setDomainId]=useState('');
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const [filterDomain,setFilterDomain]=useState(''),[difficulty,setDifficulty]=useState(''),[usage,setUsage]=useState(mode==='mock'?'mock':'all');
 const [bank,setBank]=useState({total:0,items:[]}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(null),[uploadCount,setUploadCount]=useState(0);
 const [manual,setManual]=useState(null),[staged,setStaged]=useState({});
 const [selectedIds,setSelectedIds]=useState([]);
 const [lessons,setLessons]=useState([]);
 const [inspectLessonId,setInspectLessonId]=useState('');
 const [releaseLessonId,setReleaseLessonId]=useState('');
 const [inspectState,setInspectState]=useState({loading:false,data:null,error:''});
 const [reviewOpen,setReviewOpen]=useState(false),[repairingAsp,setRepairingAsp]=useState(false);
 const [legacyPractice,setLegacyPractice]=useState({count:0,loading:false,error:''});
 const [officialMock,setOfficialMock]=useState({loading:false,data:null,error:''});
 const reviewRef=useRef(null);
 const [batchReady,setBatchReady]=useState(false),[batchLoading,setBatchLoading]=useState(true);
 const [batchMode,setBatchMode]=useState('unverified');
 const [batchError,setBatchError]=useState('');
 const dirtyCount=Object.keys(staged).length;
 const pendingCount=dirtyCount+(releaseLessonId?1:0);
 const selected=useMemo(()=>courses.find(c=>c.id===courseId),[courses,courseId]);
 const courseProblem=questionBankCatalogState(courses,coursesLoading,coursesError);
 const aspIdentityMismatch=!!selected&&isAspCourseTitle(selected)&&!isOfficialAspCourse(selected);
 const canEdit=!!courseId&&batchReady&&!aspIdentityMismatch&&!bank.compatibilityMode
   &&(!bank.items.length||typeof bank.items[0].isActive==='boolean');
 useEffect(()=>{if(!courses.some(c=>c.id===courseId))setCourseId(preferredQuestionBankCourse(courses)?.id||'');},[courses,courseId]);
 useEffect(()=>{
  let live=true;setBatchReady(false);setBatchMode('unverified');setBatchLoading(true);setBatchError('');
  getCourseBankBatchCapabilities(db)
   .then(c=>{if(live){setBatchMode(c.mode);setBatchReady(true);}})
   .catch(e=>{if(live)setBatchError('P34 One-Save publish migration is required on this database: '+fail(e));})
   .finally(()=>{if(live)setBatchLoading(false);});
  return()=>{live=false;};
 },[db]);
 useEffect(()=>{setOffset(0);setSearch('');setQuery('');setPending(null);setManual(null);
  setError('');setNotice('');setDomainId('');setFilterDomain('');setDifficulty('');setUsage(mode==='mock'?'mock':'all');setDomains([]);setLessons([]);setSelectedIds([]);
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
 // P32: make published vs linked-but-hidden states visible to the Admin.
 useEffect(()=>{
  const valid=lessons.some(l=>l.id===inspectLessonId);
  if(!valid)setInspectLessonId(lessons[0]?.id||'');
 },[lessons,inspectLessonId]);
 useEffect(()=>{
  if(!inspectLessonId){setInspectState({loading:false,data:null,error:''});return;}
  let live=true;
  setInspectState({loading:true,data:null,error:''});
  inspectLessonQuizPublication(db,inspectLessonId)
   .then(data=>{if(live)setInspectState({loading:false,data,error:''});})
   .catch(e=>{if(live)setInspectState({loading:false,data:null,error:fail(e)});});
  return()=>{live=false;};
 },[db,inspectLessonId,revision]);
 useEffect(()=>{
  if(!courseId)return;let live=true;setLoading(true);setError('');
  listCourseBank(db,courseId,{search:query,offset,limit:50,domainId:filterDomain||null,difficulty,usage})
   .then(data=>{if(live)setBank(data);})
   .catch(e=>{if(live){setBank({total:0,items:[]});setError('P28 Question Bank unavailable: '+fail(e));}})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,courseId,query,offset,filterDomain,difficulty,usage,revision]);
 // P77 read-only preview. No existing business data changes on page load.
 useEffect(()=>{
  if(!courseId||mode!=='bank'){setLegacyPractice({count:0,loading:false,error:''});return;}
  let live=true;setLegacyPractice({count:0,loading:true,error:''});
  existingPracticeImportPreview(db,courseId)
   .then(v=>{if(live)setLegacyPractice({count:v.count,loading:false,error:''});})
   .catch(e=>{if(live)setLegacyPractice({count:0,loading:false,error:fail(e)});});
  return()=>{live=false;};
 },[db,courseId,mode,revision]);
 // Count-only verification of permanent P9B/P10 fixed 200-question ASP form.
 useEffect(()=>{
  if(!courseId||selected?.slug!=='asp'){setOfficialMock({loading:false,data:null,error:''});return;}
  let live=true;setOfficialMock({loading:true,data:null,error:''});
  getMockReadiness(db,courseId).then(data=>{
   if(live)setOfficialMock({loading:false,data,error:''});
  }).catch(e=>{if(live)setOfficialMock({loading:false,data:null,error:fail(e)});});
  return()=>{live=false;};
 },[db,courseId,selected?.slug,revision]);
 const refresh=(force=false)=>{
  if(!force&&pendingCount&&!window.confirm('Discard '+pendingCount+' pending changes and reload?'))return;
  if(!force){setStaged({});setReleaseLessonId('');}
  setRevision(n=>n+1);onUpdate?.();
 };
 useEffect(()=>{onDirtyChange?.(pendingCount>0);},[pendingCount,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);
 useEffect(()=>{
  if(!pendingCount)return;
  const warn=e=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[pendingCount]);
 useEffect(()=>{setSelectedIds([]);},[courseId,offset,query,filterDomain,difficulty,usage]);
 const moveCourse=id=>{
  if(id===courseId)return;
  if(pendingCount&&!window.confirm('Discard unsaved Question Bank actions before changing Course?'))return;
  setStaged({});setReleaseLessonId('');setSelectedIds([]);setCourseId(id);
 };
 const stage=(q,field,value)=>{
  setError('');setNotice('');
  try{
   if(!canEdit)throw Error(batchError||'Install P34 One-Save publishing on Supabase before editing.');
   const next=stagedQuestionEdit(q,staged[q.id],field,value);
   setStaged(prev=>{const result={...prev};if(next)result[q.id]=next;else delete result[q.id];return result;});
  }catch(e){setError(fail(e));}
 };
 const batchStage=(field,value)=>{
  if(!selectedIds.length||!canEdit)return;
  const rows=bank.items.filter(q=>selectedIds.includes(q.id));
  const changed={...staged};let accepted=0,skipped=0;
  for(const q of rows){
   try{
    const next=stagedQuestionEdit(q,changed[q.id],field,value);
    if(next)changed[q.id]=next;else delete changed[q.id];
    accepted++;
   }catch(e){skipped++;}
  }
  setStaged(changed);setNotice(accepted+' question(s) staged, not saved.'+
   (skipped?' '+skipped+' protected/ineligible question(s) skipped.':''));
 };
 async function saveAll(){
  if(!pendingCount||busy||!selected||!canEdit)return;
  setError('');setNotice('');setBusy(true);
  try{
   const payload=stagedToBatch(staged);
   if(payload.length>500)throw Error('Maximum 500 staged questions in one save.');
   const result=await saveCourseBankBatch(db,courseId,payload,releaseLessonId||null,batchMode);
   setStaged({});setReleaseLessonId('');setSelectedIds([]);
   setNotice(batchMode==='p34'
    ?'Saved in one transaction: '+result.saved+' question setting(s), '+
      (result.published||0)+' Lesson Quiz question(s) published'+
      (result.linked?' · '+result.linked+' new Lesson link(s)':'')+
      (result.unpublished?' · '+result.unpublished+' disabled quiz item(s) unpublished':'')+
      '. Saved Mock question flags automatically feed this Course Mock pool; 200 eligible questions are required for the fixed exam.'
    :'Saved '+result.saved+' question settings using legacy P30. Draft Lesson links are NOT learner-published, and Mock candidate flags do NOT activate the fixed official 200-question Mock. Install P34A/P34B to enable Lesson Quiz one-save publishing.');
   refresh(true);
  }catch(e){setError('No partial changes saved. Your pending selections are retained. '+fail(e));}
  finally{setBusy(false);}
 }
 const fixExistingAsp=async()=>{
  if(repairingAsp||busy||pendingCount||!aspIdentityMismatch)return;
  if(!window.confirm('Link this EXISTING ASP Course to the official Mock? Only the internal slug changes to "asp". Course and question IDs stay the same. Publishing and final reservation are separate actions.'))return;
  setRepairingAsp(true);setError('');setNotice('');
  try{
   const result=await repairExistingAspCourseId(db,selected.id,'USE EXISTING ASP COURSE');
   setNotice('Linked existing ASP Course: '+result.title+'. No questions were moved or approved.');
   onRefreshCourses?.();refresh(true);
  }catch(e){setError(fail(e));}
  finally{setRepairingAsp(false);}
 };
 const activateOldPractice=async()=>{
  if(!selected||!legacyPractice.count||busy||pendingCount)return;
  const expected=legacyPractice.count;
  if(!window.confirm('Activate '+expected+' previously imported Draft questions for Practice in '+selected.title+'? Only active, unused, non-Mock file-imported questions will be Approved. Mock selections and old attempts remain unchanged.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await activateExistingPracticeImports(db,selected.id,expected);
   setNotice(result.activated+' existing imported questions are now Approved for Practice.');
   setUsage('practice');setOffset(0);refresh(true);
  }catch(e){setError('No partial activation saved: '+fail(e));refresh(true);}
  finally{setBusy(false);}
 };
 const discard=()=>{
  if(pendingCount&&window.confirm('Discard all '+pendingCount+' unsaved actions?')){
   setStaged({});setReleaseLessonId('');setNotice('Unsaved actions discarded.');setError('');
  }
 };
 const visibleIds=bank.items.map(q=>q.id);
 const allVisibleSelected=!!visibleIds.length&&visibleIds.every(id=>selectedIds.includes(id));
 const toggleSelectAll=checked=>setSelectedIds(checked?visibleIds:[]);
 const toggleSelect=(id,checked)=>setSelectedIds(v=>checked?[...new Set([...v,id])]:v.filter(x=>x!==id));
 async function readFile(file){
  if(!file||!courseId||busy||aspIdentityMismatch||dirtyCount){if(dirtyCount)setError('Save or discard pending edits before importing a new file.');return;}
  setError('');setNotice('');setPending(null);setUploadCount(0);
  try{
   const data=await importQuestionFile(file,courseId,domainId);
   if(!data.questions.length)throw Error('No valid questions found. Check the required columns.');
   const mapped=mappedImportRows(data.questions,domainId||null,domains);
   // P77: validated imported questions become Active + Approved after Admin confirms count.
   setPending({courseId,filename:file.name,rows:mapped,problems:data.problems,sheets:data.sheets,unmappedLabels:[...new Set(mapped.map(q=>q.unmappedDomainLabel).filter(Boolean))]});
  }catch(e){setError(fail(e));}
 }
 async function upload(){
  if(!pending||pending.courseId!==courseId||busy||aspIdentityMismatch||dirtyCount)return;
  if(!window.confirm('Import '+pending.rows.length+' validated questions as Active + Approved for Practice in '+selected.title+'? '+pending.rows.filter(q=>!q.domainId).length+' lack a Domain, so Domain Practice and Level Up still need classification. Existing questions and Mock reservations will not change.'))return;
  setBusy(true);setError('');setNotice('');
  let inserted=0,skipped=0;
  try{
   for(let start=0;start<pending.rows.length;start+=50){
    const result=await importCourseBank(db,courseId,pending.rows.slice(start,start+50));
    inserted+=result.inserted||0;skipped+=result.skipped||0;setUploadCount(start+Math.min(50,pending.rows.length-start));
   }
   setNotice(inserted+' Active + Approved Practice questions imported · '+skipped+' duplicates skipped. An unused question can later be selected for Mock and saved separately.');
   setPending(null);setOffset(0);refresh();
  }catch(e){setError('Import stopped after '+inserted+' inserted / '+skipped+' skipped. Rerun the same file safely: '+fail(e));refresh();}
  finally{setBusy(false);}
 }
 async function addManual(e){
  e.preventDefault();if(!manual||busy||aspIdentityMismatch||dirtyCount)return;
  const values=manual.options.map(x=>x.trim()).filter(Boolean);
  if(manual.prompt.trim().length<5||values.length<2||!values[manual.correct]){setError('Provide a question, two options and a correct answer.');return;}
  setBusy(true);setError('');
  try{
   const row={prompt:manual.prompt.trim(),options:values,correctIndex:manual.correct,
    domainId:domainId||null,topic:'Manual',explanation:manual.explanation||'',
    reference:'Admin manual entry'};
   const results=mappedImportRows([{...row,correct:row.correctIndex,reference:row.reference,difficulty:'unclassified',domainLabel:''}],domainId||null,domains);
   const outcome=await importCourseBank(db,courseId,results);
   setNotice(outcome.inserted?'Manual question is Active + Approved for Practice.':'Matching question already exists; nothing overwritten.');
   setManual(null);refresh();
  }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 return <div className="p28-workspace p30-bank at-stack at-animate">
  <div className="p30-toolbar at-surface">
   <div className="p30-toolbar-main">
    <label className="p30-course-select">Course
     <select aria-label="Question Bank Course" value={courseId}
      disabled={busy||coursesLoading||!!coursesError||!courses.length} onChange={e=>moveCourse(e.target.value)}>
      {!courses.length&&<option value="">No Courses loaded</option>}
      {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
     </select>
    </label>
    {mode==='bank'&&<>
     <label className="p30-upload-btn"><Upload size={16}/> Upload Excel / CSV
      <input aria-label="Upload Excel or CSV questions" type="file" accept=".xlsx,.csv" disabled={busy||dirtyCount>0||aspIdentityMismatch}
       onChange={e=>{void readFile(e.target.files?.[0]);e.target.value='';}}/>
     </label>
     <button className="at-outline p30-add" type="button" disabled={busy||dirtyCount>0||aspIdentityMismatch}
      onClick={()=>{setPending(null);setManual(initial());}}><Plus size={16}/> Add Question</button>
    </>}
    <form className="p30-search" onSubmit={e=>{e.preventDefault();setQuery(search.trim());setOffset(0);}}>
     <Search size={17}/><input aria-label="Search questions" placeholder="Search questions…" value={search}
      onChange={e=>setSearch(e.target.value)}/>
     <button type="submit" aria-label="Apply question search">Search</button>
    </form>
   </div>
   {mode==='bank'&&<p className="p30-toolbar-hint">Imported questions become Active + Approved for Practice immediately. Mark an unused question Mock and Save All Changes to move it out of Practice.</p>}
   <div className="p30-filter-line">
    <label>Domain <select value={filterDomain} aria-label="Filter bank by domain" onChange={e=>{setFilterDomain(e.target.value);setOffset(0);}}>
     <option value="">All Domains</option>{domains.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}
    </select></label>
    <label>Difficulty <select value={difficulty} aria-label="Filter bank by difficulty" onChange={e=>{setDifficulty(e.target.value);setOffset(0);}}>
     <option value="">All</option>{BANK_DIFFICULTIES.map(d=><option value={d} key={d}>{d==='unclassified'?'Unclassified':d==='low'?'Easy':d==='medium'?'Medium':'Hard'}</option>)}
    </select></label>
    <label>Usage <select value={usage} aria-label="Filter bank by usage" onChange={e=>{setUsage(e.target.value);setOffset(0);}}>
     <option value="all">All</option><option value="draft">Draft</option><option value="practice">Practice / Assessment</option>
     <option value="eligible">Lesson eligible</option><option value="lesson">Linked to Lessons</option><option value="mock">Mock Exam</option>
    </select></label>
    <button className="at-outline p30-refresh" type="button" disabled={busy} onClick={()=>refresh()}><RefreshCw size={15}/> Refresh</button>
   </div>
   <div className="p30-stats" aria-label="Question Bank summary; active, mock, draft and linked counts reflect current page">
    <div><FileQuestion size={21}/><span><small>Matching Questions</small><strong>{bank.total}</strong></span></div>
    <div><CheckCircle2 size={21}/><span><small>Active · this page</small><strong>{bank.items.filter(q=>(staged[q.id]?.next.isActive??q.isActive)===true).length}</strong></span></div>
    <div><ShieldCheck size={21}/><span><small>Mock · this page</small><strong>{bank.items.filter(q=>q.mockExclusive||(staged[q.id]?.next.mockCandidate??q.mockCandidate)).length}</strong></span></div>
    <div><FileSpreadsheet size={21}/><span><small>Draft · this page</small><strong>{bank.items.filter(q=>q.approvalState==='draft').length}</strong></span></div>
    <div><BookOpen size={21}/><span><small>Lesson linked · this page</small><strong>{bank.items.filter(q=>q.linkedCount>0).length}</strong></span></div>
   </div>
  </div>
  {courseProblem.status!=='ready'&&<div className="at-surface p28-catalog-state" role={coursesError?'alert':'status'}>
   <strong>{courseProblem.status==='loading'?'Loading Courses':courseProblem.status==='error'?'Could not load Courses':'No database Courses found'}</strong>
   <p>{courseProblem.message}</p>
   <div className="p28-catalog-actions"><button className="at-outline" onClick={()=>onRefreshCourses?.()} type="button" disabled={coursesLoading}>Retry</button>
    <button className="at-primary" onClick={()=>onGoToCourses?.()} type="button">Open Courses</button></div>
  </div>}
  {aspIdentityMismatch&&<div className="at-disclaimer p42-asp-repair" role="alert">
   <strong>Existing ASP Course needs its internal identifier linked.</strong>
   <p>This Course is saved as <code>{selected?.slug||'(missing)'}</code> instead of <code>asp</code>.
    Your existing questions and Course ID will remain unchanged.</p>
   <button type="button" className="at-primary" disabled={repairingAsp||busy||pendingCount}
    onClick={()=>void fixExistingAsp()}>{repairingAsp?'Verifying existing Course…':'Link existing ASP Course to Mock'}</button>
   <small>Admin-only action. This does not publish courses, approve questions or reserve the Mock.</small>
  </div>}
  {selected?.slug==='asp'&&mode==='bank'&&<div className="p39-official-mock-status" role="status">
   <ShieldCheck size={18}/>
   <div><strong>Official ASP Mock · {officialMock.loading?'Checking…':officialMock.data
    ?officialMock.data.verifiedReserved+'/200 reserved':'Status unavailable'}</strong>
    <p>{officialMock.data?.ready
     ?'The exact 200-question official form is ready and locked. New Mock candidates do not rewrite it.'
     :officialMock.error?'Official Mock readiness unavailable: '+officialMock.error:
      'Save All preserves your selected Mock choices. Exactly 200 reviewed choices must then be finalized in the protected official reservation to appear in the learner Mock.'}</p>
   </div>
  </div>}
  {selected&&mode==='bank'&&!officialMock.data?.ready&&
   <OfficialMockBankFinalizer db={db} course={selected}
    disabled={pendingCount>0||busy||aspIdentityMismatch||repairingAsp}
    revision={revision} onReserved={()=>refresh(true)}/>}
  {selected?.slug==='asp'&&selected.publication_state!=='published'&&<div className="at-disclaimer p42-asp-repair" role="status">
   <strong>Publish the ASP Course before learners can take this Mock.</strong>
   <p>Reserved questions remain unchanged. This Course is currently {selected.publication_state} and is not in the learner catalogue.</p>
   <button type="button" className="at-outline" onClick={()=>onGoToCourses?.()}>Open Courses</button>
  </div>}
  {selected&&batchReady&&batchMode==='p30'&&<p role="status" className="at-disclaimer">
   P34A/P34B are not both installed on this Supabase database. Existing P30 Question Bank editing remains available.
   <strong> Legacy saves do not publish Draft Lesson Quiz questions; Mock candidate flags alone cannot activate the fixed official exam.</strong>
   Apply the two P34 migrations to enable one-save publication.
  </p>}
  {selected&&!batchLoading&&!batchReady&&<p role="status" className="at-disclaimer">
   {batchError||'This database requires P34 One-Save publish before inline controls are enabled.'}
   The Question Bank list remains visible, but unsaved inline edits cannot be saved yet.
  </p>}
  {selected&&bank.compatibilityMode&&<p role="status" className="at-disclaimer">
   The installed Question Bank is the older P28 version. Apply P28.2 and P29 before changing question settings; this list may not apply advanced filters.
  </p>}
  {selected&&!bank.compatibilityMode&&bank.items.length>0&&typeof bank.items[0].isActive!=='boolean'&&<p role="status" className="at-disclaimer">
   Active/Mock settings require the guarded P29 schema. No edits will be sent to Supabase until it is installed.
  </p>}
  {selected&&mode==='bank'&&legacyPractice.count>0&&<div className="at-disclaimer p77-practice-activation" role="status">
    <BookOpen size={18}/><span><strong>{legacyPractice.count} previously imported Draft questions</strong> can be activated for Practice in {selected.title}. This does not change the selected Mock questions.</span>
    <button type="button" className="at-primary" disabled={busy||pendingCount>0||legacyPractice.loading}
     onClick={()=>void activateOldPractice()}>Activate existing for Practice</button>
   </div>}
   {selected&&error&&<p role="alert" className="at-error"><AlertCircle size={16}/>{error}</p>}
  {selected&&notice&&<p role="status" className="at-success"><CheckCircle2 size={16}/>{notice}</p>}
  {selected&&pending&&<div className="p30-upload-preview at-surface">
   <h3>Import preview · {pending.filename}</h3>
   <p>{pending.rows.length} valid questions · {pending.problems.length} import note(s) · {pending.rows.filter(q=>!q.domainId).length} without mapped Domain</p>
   {!!pending.unmappedLabels.length&&<div className="p28-domain-map"><strong>Map spreadsheet Domains before importing</strong>
    {pending.unmappedLabels.map(label=><label key={label}>{label}
     <select aria-label={'Map source Domain '+label} value={pending.rows.find(q=>q.unmappedDomainLabel===label)?.domainId||''}
      onChange={e=>setPending(v=>({...v,rows:v.rows.map(q=>q.unmappedDomainLabel===label?{...q,domainId:e.target.value||null}:q)}))}>
      <option value="">Unassigned for review</option>{domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
     </select></label>)}</div>}
   {pending.rows.slice(0,3).map((q,i)=><div key={i} className="p30-import-sample">{i+1}. {q.prompt}</div>)}
   {!!pending.problems.length&&<details><summary>Import validation notes</summary>{pending.problems.slice(0,20).map((p,i)=><p key={i}>{p}</p>)}</details>}
   <div className="p30-import-actions"><button type="button" className="at-outline" disabled={busy} onClick={()=>setPending(null)}>Cancel Import</button>
    <button type="button" className="at-primary" disabled={busy||aspIdentityMismatch} onClick={upload}>
     {busy?'Importing '+uploadCount+'/'+pending.rows.length:'Import '+pending.rows.length+' to Practice'}</button></div>
  </div>}
  {selected&&manual&&<form className="p28-manual at-surface" onSubmit={addManual}>
   <h3>Add a new Practice question</h3>
   <label>Question<textarea value={manual.prompt} onChange={e=>setManual(v=>({...v,prompt:e.target.value}))} rows={2} required/></label>
   {manual.options.map((answer,i)=><label key={i}>Option {String.fromCharCode(65+i)}
    <span><input type="radio" checked={manual.correct===i} onChange={()=>setManual(v=>({...v,correct:i}))}/>
     <input value={answer} onChange={e=>setManual(v=>({...v,options:v.options.map((x,j)=>i===j?e.target.value:x)}))}/></span>
   </label>)}
   <label>Explanation (optional)<textarea value={manual.explanation} onChange={e=>setManual(v=>({...v,explanation:e.target.value}))} rows={2}/></label>
   <div className="p30-import-actions"><button type="button" className="at-outline" onClick={()=>setManual(null)}>Cancel</button>
    <button type="submit" className="at-primary" disabled={busy}>Create Practice Question</button></div>
  </form>}
  {selected&&<>
   <p className="p31-lesson-publish-note">
    <BookOpen size={16}/> Assigning a question to a Lesson Quiz links it to that Lesson.
    {batchMode==='p34'?<><strong> Active, non-Mock questions publish immediately to the selected Lesson Quiz on Save All Changes</strong> — including imported Drafts. Saved Mock marks automatically feed the selected Course's Mock pool; exactly 200 eligible questions are needed to start.</>:<>
     <strong> Legacy P30 mode:</strong> editing is available, but Drafts cannot publish until P34A/P34B are installed.</>}
   </p>
   {!!lessons.length&&<div className="p32-publication-status at-surface" aria-label="Saved Lesson Quiz publication status">
    <div className="p32-publication-select">
     <BookOpen size={17}/>
     <label htmlFor="p32-lesson-picker">Check learner quiz for</label>
     <select id="p32-lesson-picker" value={inspectLessonId}
      onChange={e=>setInspectLessonId(e.target.value)}>
      {lessons.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
     </select>
    </div>
    {inspectState.loading?<span role="status">Checking actual saved quiz…</span>:
     inspectState.error?<span className="p32-publication-warning" role="alert">{inspectState.error}</span>:
     inspectState.data&&<div className="p32-publication-summary" role="status">
      <strong>{inspectState.data.published} Published</strong>
      <span>{inspectState.data.pending} Not published</span>
      {inspectState.data.total===0?<small>No saved questions are linked to this Lesson. Select it in a question row and click Save All Changes.</small>:
       inspectState.data.published===0?<small>Questions are saved but not published. Tick Publish saved Lesson questions below, then click Save All Changes — no Review Draft step.</small>:
       <small>These published questions should appear to an authorized learner in this Lesson's Quiz.</small>}
     </div>}
    {mode==='bank'&&inspectState.data?.pending>0&&<div className="p33-next-steps">
     <label className="p34-release-option">
      <input type="checkbox" aria-label="Publish saved Lesson questions on Save All Changes"
       checked={releaseLessonId===inspectLessonId} disabled={!canEdit||busy||batchMode!=='p34'}
       onChange={e=>setReleaseLessonId(e.target.checked?inspectLessonId:'')}/>
      Publish {inspectState.data.pending} saved Lesson question(s) on Save All Changes
     </label>
     <small>One Save publishes these eligible linked questions to the learner Quiz. No separate Review Draft step.</small>
    </div>}
    <a className="at-outline p32-open-lesson" href={'/builder?courseId='+encodeURIComponent(courseId)+'&lessonId='+encodeURIComponent(inspectLessonId)}
     target="_blank" rel="noopener noreferrer" aria-label="Open the selected Lesson Quiz editor">
     Open Lesson Quiz <span aria-hidden="true">↗</span></a>
   </div>}
   <div className="p30-table-card at-surface">
    <div className="p30-table-top">
     <strong>{selected.title} <span>· {bank.total} results</span></strong>
     <p>Only question text is shown. Save a Mock Exam switch to include this question in the Course Mock pool automatically. The fixed exam needs 200 saved questions.</p>
    </div>
    {loading?<div className="at-empty">Loading protected questions…</div>:!bank.items.length?<div className="at-empty">No questions match this filter. Change the filters or import a file.</div>:
    <div className="p30-table-scroll"><table className="p30-table">
     <thead><tr><th className="p30-select"><input type="checkbox" aria-label="Select all visible questions"
      checked={allVisibleSelected} onChange={e=>toggleSelectAll(e.target.checked)}/></th>
      <th>Question</th><th>Domain</th><th>Difficulty</th><th>Active</th><th>Mock Exam</th><th>Lesson Quiz</th><th>Status</th>
     </tr></thead>
     <tbody>{bank.items.map(q=>{
      const v={...originalQuestionValues(q),...(staged[q.id]?.next||{})};
      const protectedRow=busy||!canEdit||q.mockExclusive||q.approvalState==='archived';
      const mockDisabled=protectedRow||(!v.mockCandidate&&(!['draft','approved'].includes(q.approvalState)||q.linkedCount>0||!v.isActive));
      const lessonDisabled=protectedRow||!v.isActive||v.mockCandidate;
      const lessonNames=(q.linkedLessonIds||[]).map(id=>lessons.find(l=>l.id===id)?.label?.split(' / ').pop()||'Lesson');
      return <tr key={q.id} className={(staged[q.id]?'p30-edited ':'')+(selectedIds.includes(q.id)?'p30-selected':'')}>
       <td data-label="Select"><input type="checkbox" checked={selectedIds.includes(q.id)} aria-label={'Select question '+q.prompt}
        onChange={e=>toggleSelect(q.id,e.target.checked)}/></td>
       <td data-label="Question" className="p30-question-cell"><span title={q.prompt}>{q.prompt}</span>
        {staged[q.id]&&<small>Unsaved change</small>}</td>
       <td data-label="Domain"><span className="p30-domain-pill">{domains.find(d=>d.id===q.domainId)?.title||'Unassigned'}</span></td>
       <td data-label="Difficulty"><select aria-label={'Difficulty: '+q.prompt} value={v.difficulty}
        className={'p30-difficulty '+v.difficulty}
        title={q.approvalState!=='draft'?'Approved difficulty needs a new independent review':'Select Difficulty; save changes together'}
        disabled={protectedRow||q.approvalState!=='draft'}
        onChange={e=>stage(q,'difficulty',e.target.value)}>
        <option value="unclassified">Unclassified</option><option value="low">Easy</option>
        <option value="medium">Medium</option><option value="high">Hard</option>
       </select></td>
       <td data-label="Active"><label className="p30-switch">
        <input type="checkbox" aria-label={'Active: '+q.prompt} checked={v.isActive}
         disabled={protectedRow} onChange={e=>stage(q,'isActive',e.target.checked)}/>
        <span aria-hidden="true"/></label></td>
       <td data-label="Mock Exam"><label className="p30-switch p30-mock-switch">
        <input type="checkbox" aria-label={'Mock Exam: '+q.prompt} checked={q.mockExclusive||v.mockCandidate}
         disabled={mockDisabled} title={q.mockExclusive?'Official Mock reservation is immutable':'Only unused, unlinked Practice questions may become Mock; server blocks questions already served'}
         onChange={e=>stage(q,'mockCandidate',e.target.checked)}/>
        <span aria-hidden="true"/></label></td>
       <td data-label="Lesson Quiz">
        <select aria-label={'Assign Lesson Quiz: '+q.prompt} value={v.addLessonId||''} disabled={lessonDisabled}
         title="Add this question to another Lesson Quiz without deleting existing links"
         onChange={e=>stage(q,'addLessonId',e.target.value)}>
         <option value="">{lessonNames.length?lessonNames[0]+(lessonNames.length>1?' +'+(lessonNames.length-1):''):'Select lesson…'}</option>
         {lessons.filter(l=>!(q.linkedLessonIds||[]).includes(l.id)).map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
       </td>
       <td data-label="Status"><Status value={q.mockExclusive?'mock':q.mockCandidate?'candidate':q.approvalState}/></td>
      </tr>;
     })}</tbody>
    </table></div>}
    <div className="p30-table-pages">
     <span>Showing {bank.total?offset+1:0}–{Math.min(offset+50,bank.total)} of {bank.total}</span>
     <button type="button" className="at-outline" disabled={loading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Previous</button>
     <b>{Math.floor(offset/50)+1} / {Math.max(1,Math.ceil(bank.total/50))}</b>
     <button type="button" className="at-outline" disabled={loading||offset+50>=bank.total} onClick={()=>setOffset(n=>n+50)}>Next</button>
    </div>
   </div>
   <div className="p30-bulk-bar at-surface">
    <div className="p30-selected-count"><input type="checkbox" aria-label="Select all questions on current page"
     checked={allVisibleSelected} onChange={e=>toggleSelectAll(e.target.checked)}/>
     <b>{selectedIds.length}</b> selected <small>on this page</small>
    </div>
    <div className="p30-bulk-actions">
     <button type="button" className="at-outline" disabled={!selectedIds.length||busy||!canEdit}
      onClick={()=>batchStage('isActive',true)}><CheckCircle2 size={15}/> Activate</button>
     <button type="button" className="at-outline" disabled={!selectedIds.length||busy||!canEdit}
      onClick={()=>batchStage('isActive',false)}>Disable</button>
     <button type="button" className="at-outline" disabled={!selectedIds.length||busy||!canEdit}
      onClick={()=>batchStage('mockCandidate',true)}><ShieldCheck size={15}/> Mock Exam</button>
     <button type="button" className="at-outline" disabled={!selectedIds.length||busy||!canEdit}
      onClick={()=>batchStage('mockCandidate',false)}>Not Mock</button>
     <select aria-label="Bulk change Difficulty" defaultValue="" disabled={!selectedIds.length||busy||!canEdit}
      onChange={e=>{if(e.target.value)batchStage('difficulty',e.target.value);e.target.value='';}}>
      <option value="">Change Difficulty…</option><option value="low">Easy</option><option value="medium">Medium</option>
      <option value="high">Hard</option><option value="unclassified">Unclassified</option>
     </select>
     <select aria-label="Bulk assign Lesson Quiz" defaultValue="" disabled={!selectedIds.length||busy||!canEdit}
      onChange={e=>{if(e.target.value)batchStage('addLessonId',e.target.value);e.target.value='';}}>
      <option value="">Assign Lesson…</option>{lessons.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
     </select>
    </div>
    <div className="p30-save-actions" role="status" aria-live="polite">
     <span className={pendingCount?'p30-unsaved':''}>{pendingCount} unsaved action{pendingCount===1?'':'s'}</span>
     <button type="button" className="at-outline" onClick={discard} disabled={!pendingCount||busy}><Undo2 size={15}/> Discard</button>
     <button type="button" className="at-primary p30-save-all" onClick={()=>void saveAll()}
      disabled={!pendingCount||busy||!canEdit||dirtyCount>500}><Save size={16}/>
      {busy?'Saving…':batchMode==='p30'?'Save Settings (P30 Legacy)':'Save All Changes'}</button>
    </div>
   </div>
   {dirtyCount>500&&<p role="alert" className="at-error">Maximum 500 edits per atomic save. Discard or reduce the staged changes before saving.</p>}
   {selected.slug==='asp'&&mode==='bank'&&<div ref={reviewRef} className="p30-advanced-review">
    <button type="button" className="at-outline" onClick={()=>setReviewOpen(v=>!v)}>
     {reviewOpen?'Hide':'Open'} ASP rights review for Practice and official Mock reservation</button>
    {reviewOpen&&<section className="p28-asp-review"><AdminQuestionsPanel db={db} asp={asp||selected} onUpdate={()=>refresh()}/></section>}
   </div>}
   {selected.slug==='asp'&&mode==='mock'&&<details className="p30-advanced-review">
     <summary>Legacy ASP reserved Mock tools (not required for Course Mock)</summary>
     <AdminMockPanel db={db} asp={asp||selected}/>
    </details>}
   {mode==='mock'&&!aspIdentityMismatch&&
     <p className="at-disclaimer" role="status">Saved selections for {selected.title}: {bank.total} Mock question(s) shown automatically. The fixed Course Mock opens with exactly 200 eligible questions; no additional reservation is needed.</p>}
  </>}
 </div>;
}
