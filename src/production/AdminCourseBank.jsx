import React,{useEffect,useMemo,useState} from 'react';
import {AlertCircle,BookOpen,CheckCircle2,FileQuestion,FileSpreadsheet,Plus,RefreshCw,Search,ShieldCheck,Save,Undo2,Upload,SlidersHorizontal} from 'lucide-react';
import {importQuestionFile} from '../lib/questionImport.js';
import {importCourseBank,listCourseBank,mappedImportRows,saveCourseBankBatch,getCourseBankBatchCapabilities} from './courseQuestionBankApi.js';
import {stagedQuestionEdit,stagedToBatch,originalQuestionValues,BANK_DIFFICULTIES} from './questionBankDraft.js';
import {liveCourseTree} from './liveAuthoringApi.js';
import {isAspCourseTitle,isOfficialAspCourse,preferredQuestionBankCourse,questionBankCatalogState} from './questionBankCourseSelection.js';
import {AdminQuestionsPanel,AdminMockPanel} from './AdminToolsPanels.jsx';
import './courseQuestionBank.css';

const fail=e=>e?.message||'The protected Question Bank request failed.';
const initial=()=>({prompt:'',options:['','','',''],correct:0,explanation:''});
function Status({value}){return <span className={'p28-status '+(value==='approved'?'approved':value==='mock'?'mock':'draft')}>{value}</span>;}

export default function AdminCourseBank({db,courses=[],asp,onUpdate,onDirtyChange,mode='bank',coursesLoading=false,coursesError='',onRefreshCourses,onGoToCourses}){
 const [courseId,setCourseId]=useState(''),[domains,setDomains]=useState([]),[domainId,setDomainId]=useState('');
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const [filterDomain,setFilterDomain]=useState(''),[difficulty,setDifficulty]=useState(''),[usage,setUsage]=useState('all');
 const [bank,setBank]=useState({total:0,items:[]}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(null),[uploadCount,setUploadCount]=useState(0);
 const [manual,setManual]=useState(null),[staged,setStaged]=useState({});
 const [selectedIds,setSelectedIds]=useState([]);
 const [lessons,setLessons]=useState([]);
 const [reviewOpen,setReviewOpen]=useState(false);
 const [batchReady,setBatchReady]=useState(false),[batchLoading,setBatchLoading]=useState(true);
 const [batchError,setBatchError]=useState('');
 const dirtyCount=Object.keys(staged).length;
 const selected=useMemo(()=>courses.find(c=>c.id===courseId),[courses,courseId]);
 const courseProblem=questionBankCatalogState(courses,coursesLoading,coursesError);
 const aspIdentityMismatch=!!selected&&isAspCourseTitle(selected)&&!isOfficialAspCourse(selected);
 const canEdit=!!courseId&&batchReady&&!aspIdentityMismatch&&!bank.compatibilityMode
   &&(!bank.items.length||typeof bank.items[0].isActive==='boolean');
 useEffect(()=>{if(!courses.some(c=>c.id===courseId))setCourseId(preferredQuestionBankCourse(courses)?.id||'');},[courses,courseId]);
 useEffect(()=>{
  let live=true;setBatchReady(false);setBatchLoading(true);setBatchError('');
  getCourseBankBatchCapabilities(db)
   .then(()=>{if(live)setBatchReady(true);})
   .catch(e=>{if(live)setBatchError('P30 batch editor has not been verified on this database: '+fail(e));})
   .finally(()=>{if(live)setBatchLoading(false);});
  return()=>{live=false;};
 },[db]);
 useEffect(()=>{setOffset(0);setSearch('');setQuery('');setPending(null);setManual(null);
  setError('');setNotice('');setDomainId('');setFilterDomain('');setDifficulty('');setUsage('all');setDomains([]);setLessons([]);setSelectedIds([]);
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
 const refresh=(force=false)=>{
  if(!force&&dirtyCount&&!window.confirm('Discard '+dirtyCount+' unsaved question edits and reload?'))return;
  if(!force)setStaged({});
  setRevision(n=>n+1);onUpdate?.();
 };
 useEffect(()=>{onDirtyChange?.(dirtyCount>0);},[dirtyCount,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);
 useEffect(()=>{
  if(!dirtyCount)return;
  const warn=e=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[dirtyCount]);
 useEffect(()=>{setSelectedIds([]);},[courseId,offset,query,filterDomain,difficulty,usage]);
 const moveCourse=id=>{
  if(id===courseId)return;
  if(dirtyCount&&!window.confirm('Discard unsaved Question Bank edits before changing Course?'))return;
  setStaged({});setSelectedIds([]);setCourseId(id);
 };
 const stage=(q,field,value)=>{
  setError('');setNotice('');
  try{
   if(!canEdit)throw Error(batchError||'Install the P30 batch editor migration first.');
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
  if(!dirtyCount||busy||!selected||!canEdit)return;
  setError('');setNotice('');setBusy(true);
  try{
   const payload=stagedToBatch(staged);
   if(payload.length>500)throw Error('Save no more than 500 staged questions in one batch.');
   const result=await saveCourseBankBatch(db,courseId,payload);
   setStaged({});setSelectedIds([]);
   setNotice('Saved '+result.saved+' question(s) in one transaction'+
    (result.linked?' · '+result.linked+' Lesson Quiz links added':'')+
    (result.unpublished?' · '+result.unpublished+' quiz entries unpublished':'')+'.');
   refresh(true);
  }catch(e){setError('Nothing was partially saved; your edits are still staged. '+fail(e));}
  finally{setBusy(false);}
 }
 const discard=()=>{
  if(dirtyCount&&window.confirm('Discard all '+dirtyCount+' unsaved edits?')){
   setStaged({});setNotice('Unsaved edits discarded.');setError('');
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
   // Import creates Draft questions only. Admin must confirm the row count.
   setPending({courseId,filename:file.name,rows:mapped,problems:data.problems,sheets:data.sheets,unmappedLabels:[...new Set(mapped.map(q=>q.unmappedDomainLabel).filter(Boolean))]});
  }catch(e){setError(fail(e));}
 }
 async function upload(){
  if(!pending||pending.courseId!==courseId||busy||aspIdentityMismatch||dirtyCount)return;
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
   setNotice(outcome.inserted?'Manual question saved as Draft.':'Matching question already exists; nothing overwritten.');
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
   {mode==='bank'&&<p className="p30-toolbar-hint">Upload to the selected Course. Question settings can be edited in the table and saved together.</p>}
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
  {aspIdentityMismatch&&<p className="at-disclaimer" role="alert">
   This ASP Course has slug <code>{selected?.slug||'(missing)'}</code> rather than <code>asp</code>.
   Verify the original Course ID before uploading or changing questions; do not create a duplicate Course.
  </p>}
  {selected&&!batchLoading&&!batchReady&&<p role="status" className="at-disclaimer">
   {batchError||'This database requires the P30 atomic batch-editor migration before inline controls are enabled.'}
   The Question Bank list remains visible, but unsaved inline edits cannot be saved yet.
  </p>}
  {selected&&bank.compatibilityMode&&<p role="status" className="at-disclaimer">
   The installed Question Bank is the older P28 version. Apply P28.2 and P29 before changing question settings; this list may not apply advanced filters.
  </p>}
  {selected&&!bank.compatibilityMode&&bank.items.length>0&&typeof bank.items[0].isActive!=='boolean'&&<p role="status" className="at-disclaimer">
   Active/Mock settings require the guarded P29 schema. No edits will be sent to Supabase until it is installed.
  </p>}
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
     {busy?'Importing '+uploadCount+'/'+pending.rows.length:'Import '+pending.rows.length+' as Draft'}</button></div>
  </div>}
  {selected&&manual&&<form className="p28-manual at-surface" onSubmit={addManual}>
   <h3>Add a new Draft question</h3>
   <label>Question<textarea value={manual.prompt} onChange={e=>setManual(v=>({...v,prompt:e.target.value}))} rows={2} required/></label>
   {manual.options.map((answer,i)=><label key={i}>Option {String.fromCharCode(65+i)}
    <span><input type="radio" checked={manual.correct===i} onChange={()=>setManual(v=>({...v,correct:i}))}/>
     <input value={answer} onChange={e=>setManual(v=>({...v,options:v.options.map((x,j)=>i===j?e.target.value:x)}))}/></span>
   </label>)}
   <label>Explanation (optional)<textarea value={manual.explanation} onChange={e=>setManual(v=>({...v,explanation:e.target.value}))} rows={2}/></label>
   <div className="p30-import-actions"><button type="button" className="at-outline" onClick={()=>setManual(null)}>Cancel</button>
    <button type="submit" className="at-primary" disabled={busy}>Create Draft Question</button></div>
  </form>}
  {selected&&<>
   <div className="p30-table-card at-surface">
    <div className="p30-table-top">
     <strong>{selected.title} <span>· {bank.total} results</span></strong>
     <p>Only question text is shown here. Difficulty, Active, Mock Exam and Lesson assignment are editable; nothing saves until Save All Changes.</p>
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
      const mockDisabled=protectedRow||(!v.mockCandidate&&(q.approvalState!=='draft'||q.linkedCount>0||!v.isActive));
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
         disabled={mockDisabled} title={q.mockExclusive?'Official Mock reservation is immutable':'Only unused Drafts may become Mock candidates'}
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
       <td data-label="Status"><Status value={q.mockExclusive?'mock':q.mockCandidate?'mock':q.approvalState}/></td>
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
     <span className={dirtyCount?'p30-unsaved':''}>{dirtyCount} unsaved</span>
     <button type="button" className="at-outline" onClick={discard} disabled={!dirtyCount||busy}><Undo2 size={15}/> Discard</button>
     <button type="button" className="at-primary p30-save-all" onClick={()=>void saveAll()}
      disabled={!dirtyCount||busy||!canEdit||dirtyCount>500}><Save size={16}/>
      {busy?'Saving…':'Save All Changes'}</button>
    </div>
   </div>
   {dirtyCount>500&&<p role="alert" className="at-error">Maximum 500 edits per atomic save. Discard or reduce the staged changes before saving.</p>}
   {selected.slug==='asp'&&mode==='bank'&&<div className="p30-advanced-review">
    <button type="button" className="at-outline" onClick={()=>setReviewOpen(v=>!v)}>
     {reviewOpen?'Hide':'Open'} ASP rights & independent approval workbench</button>
    {reviewOpen&&<section className="p28-asp-review"><AdminQuestionsPanel db={db} asp={asp||selected} onUpdate={()=>refresh()}/></section>}
   </div>}
   {selected.slug==='asp'&&mode==='mock'&&<AdminMockPanel db={db} asp={asp||selected}/>}
   {selected.slug!=='asp'&&mode==='mock'&&!aspIdentityMismatch&&
    <p className="at-disclaimer">Non-ASP Mock selection does not create an official assessment engine; it only reserves eligible questions from regular Practice.</p>}
  </>}
 </div>;
}
