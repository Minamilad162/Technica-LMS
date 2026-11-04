import React,{useEffect,useMemo,useState} from 'react';
import {BookOpenCheck,CheckCircle2,ChevronLeft,ChevronRight,ClipboardCheck,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import {ASP11_PREFIX,REVIEW_FILTERS,REVIEW_PAGE_SIZE,fetchAspReviewPage,fetchAspReviewSummary,prepareAsp11Domains,saveAspReview} from './questionReviewApi';
import AdminAdaptiveReadiness from './AdminAdaptiveReadiness.jsx';
import './questionReview.css';

const errorText=e=>e?.message||'Review request failed.';
const blank=()=>({domainId:'',difficulty:'unclassified',answerChecked:false,rightsChecked:false,notes:''});
const letter=i=>String.fromCharCode(65+i);

export default function AdminQuestionReview({db,course,domains=[],onDomainsSeeded}){
 const [filter,setFilter]=useState('unreviewed'),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
 const [summary,setSummary]=useState(null),[result,setResult]=useState({total:0,items:[]});
 const [selectedId,setSelectedId]=useState(null),[form,setForm]=useState(blank);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const official=useMemo(()=>domains.filter(d=>ASP11_PREFIX.test(d.slug)).sort((a,b)=>a.slug.localeCompare(b.slug)),[domains]);
 const selected=(result.items||[]).find(q=>q.id===selectedId);
 const reload=()=>setRevision(n=>n+1);
 useEffect(()=>{
  if(!course?.id)return;
  let active=true;setLoading(true);setError('');
  Promise.all([
   fetchAspReviewPage(db,course.id,{filter,limit:REVIEW_PAGE_SIZE,offset:page*REVIEW_PAGE_SIZE}),
   fetchAspReviewSummary(db,course.id)
  ]).then(([rows,counts])=>{
   if(!active)return;
   setResult(rows||{total:0,items:[]});setSummary(counts||null);
   setSelectedId(old=>(rows?.items||[]).some(q=>q.id===old)?old:null);
  }).catch(e=>{if(active)setError(errorText(e));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,course?.id,page,filter,revision]);
 useEffect(()=>{setSelectedId(null);setPage(0);setResult({total:0,items:[]});setSummary(null);setNotice('');},[course?.id]);
 useEffect(()=>{
  if(!selected){setForm(blank());return;}
  setForm({
   domainId:selected.reviewed_domain_id||'',difficulty:selected.difficulty||'unclassified',
   answerChecked:selected.answer_checked===true,rightsChecked:selected.rights_checked===true,
   notes:selected.review_notes||''
  });
 },[selected?.id,selected?.reviewed_at]);
 const save=async e=>{
  e.preventDefault();
  if(!selected||selected.approval_state!=='draft'||selected.mock_exclusive)return;
  setError('');setNotice('');setSaving(true);
  try{
   const r=await saveAspReview(db,{questionId:selected.id,domainId:form.domainId||null,
    difficulty:form.difficulty,answerChecked:form.answerChecked,rightsChecked:form.rightsChecked,notes:form.notes});
   setNotice(r.reviewState==='ready'
    ?'Review recorded. This question remains DRAFT and hidden from learners pending a separate release gate.'
    :'Review saved as needs revision. Question remains DRAFT.');
   setSelectedId(null);reload();
  }catch(e){setError(errorText(e));}finally{setSaving(false);}
 };
 const prepare=async()=>{
  if(!course?.id||official.length===9)return;
  if(!window.confirm('Add the official nine ASP11 domains? Existing domains and source question groups will NOT be remapped.'))return;
  setError('');setNotice('');setSaving(true);
  try{
   const r=await prepareAsp11Domains(db,course.id);
   setNotice('Official ASP11 domain catalog ready ('+r.asp11Domains+'/9). No question was mapped automatically.');
   await onDomainsSeeded?.();reload();
  }catch(e){setError(errorText(e));}finally{setSaving(false);}
 };
 if(course?.slug!=='asp')return null;
 return <section className="live-review-workspace" aria-label="ASP question review workbench">
  <div className="live-review-head"><div><span className="live-eyebrow">ADMIN ONLY · ASP11</span>
   <h2><BookOpenCheck size={22}/> Question bank review</h2>
   <p>Human classification and rights verification. This stage never publishes or approves questions.</p></div>
   <button type="button" className="live-secondary" onClick={reload} disabled={loading}><RefreshCw size={16}/> Refresh</button>
  </div>
  <div className="live-review-metrics">{[
    ['Total imported',summary?.total],['Draft / hidden',summary?.draft],
    ['Reviewed / ready',summary?.readyToReview],['Needs review',summary?.needsReview],
    ['Already approved',summary?.approved],['Mock reserved',summary?.mockReserved]
  ].map(([label,value])=><div className="live-review-metric" key={label}><span>{label}</span><strong>{Number.isFinite(value)?value.toLocaleString():'—'}</strong></div>)}</div>
  <div className="live-review-alert"><ShieldCheck size={20}/><span><strong>No automatic publishing.</strong> Verify the answer, usage rights, correct ASP11 domain and educational difficulty. The separate Mock reservation and release stages come later.</span></div>
  <AdminAdaptiveReadiness db={db} course={course} domains={official}/>
  {official.length!==9&&<div className="live-review-domains"><div><strong>Official ASP11 taxonomy</strong>
   <small>{official.length} / 9 official domains available. Legacy workbook names are not a trusted mapping.</small></div>
   <button className="live-secondary" type="button" onClick={prepare} disabled={saving}>Add official 9 domains</button></div>}
  {error&&<p role="alert" className="live-error">{error}</p>}
  {notice&&<p role="status" className="live-notice"><CheckCircle2 size={17}/>{notice}</p>}
  <div className="live-review-controls"><label>Question queue
   <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);setSelectedId(null);}}>
    {REVIEW_FILTERS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
   </select></label><span>{loading?'Loading…':String(result.total||0)+' questions'}</span></div>
  <div className="live-review-grid">
   <div className="live-review-list" role="list" aria-label="ASP question queue">
    {(result.items||[]).map(q=><button role="listitem" type="button" key={q.id}
     className={'live-review-row '+(selectedId===q.id?'selected':'')} onClick={()=>setSelectedId(q.id)}>
      <span><strong>{q.source_id}</strong><small>Legacy group: {q.legacy_group||'—'}</small></span>
      <span className="live-review-preview">{q.prompt}</span>
      <em>{q.review_state==='ready'?'Reviewed':q.approval_state==='approved'?'Approved':q.mock_exclusive?'Mock reserved':'Draft'}</em>
     </button>)}
    {!loading&&!(result.items||[]).length&&<div className="live-empty">No items here. Import verified ASP records as DRAFT using the separate secure admin importer first.</div>}
    <div className="live-review-pagination">
     <button type="button" disabled={page===0||loading} className="live-secondary" onClick={()=>{setPage(n=>n-1);setSelectedId(null);}}><ChevronLeft size={16}/> Previous</button>
     <span>Page {page+1} of {Math.max(1,Math.ceil((result.total||0)/REVIEW_PAGE_SIZE))}</span>
     <button type="button" disabled={loading||(page+1)*REVIEW_PAGE_SIZE>=Number(result.total||0)} className="live-secondary" onClick={()=>{setPage(n=>n+1);setSelectedId(null);}}>Next <ChevronRight size={16}/></button>
    </div>
   </div>
   <div className="live-review-detail">
    {!selected?<div className="live-review-choose"><ClipboardCheck size={25}/><strong>Select a question</strong><p>Review the original prompt, answer and source details. Nothing changes until you save the review.</p></div>:
     <form key={selected.id} onSubmit={save}>
      <div className="live-review-detail-title"><span>{selected.source_id}</span><small>Review source & correctness</small></div>
      <h3>{selected.prompt}</h3>
      <div className="live-review-options">{(selected.options||[]).map((o,i)=><div key={i} className={i===selected.correct_index?'correct':''}>
       <strong>{letter(i)}</strong><span>{typeof o==='string'?o:JSON.stringify(o)}</span>
       {i===selected.correct_index&&<b>Source answer</b>}
      </div>)}</div>
      {selected.explanation&&<p className="live-review-reference"><b>Original explanation:</b> {selected.explanation}</p>}
      {selected.reference_text&&<p className="live-review-reference"><b>Original reference:</b> {selected.reference_text}</p>}
      <label className="live-review-field">Official ASP11 domain
       <select value={form.domainId} onChange={e=>setForm(v=>({...v,domainId:e.target.value}))} disabled={selected.approval_state!=='draft'||selected.mock_exclusive}>
        <option value="">Not classified</option>
        {official.map(d=><option key={d.id} value={d.id}>{d.slug.toUpperCase()} — {d.title}</option>)}
       </select>
      </label>
      <label className="live-review-field">Difficulty
       <select value={form.difficulty} onChange={e=>setForm(v=>({...v,difficulty:e.target.value}))} disabled={selected.approval_state!=='draft'||selected.mock_exclusive}>
        <option value="unclassified">Not classified</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
       </select></label>
      <label className="live-review-check"><input type="checkbox" checked={form.answerChecked} onChange={e=>setForm(v=>({...v,answerChecked:e.target.checked}))} disabled={selected.approval_state!=='draft'||selected.mock_exclusive}/>
       I personally checked the question and the correct answer.</label>
      <label className="live-review-check"><input type="checkbox" checked={form.rightsChecked} onChange={e=>setForm(v=>({...v,rightsChecked:e.target.checked}))} disabled={selected.approval_state!=='draft'||selected.mock_exclusive}/>
       I verified the commercial-use rights / permitted source.</label>
      <label className="live-review-field">Reviewer notes<textarea rows={3} maxLength={2000} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} disabled={selected.approval_state!=='draft'||selected.mock_exclusive} placeholder="Content corrections, evidence and rationale…"/></label>
      <p className="live-review-hint"><LockKeyhole size={15}/> Private audited decision. Learner visibility never changes here.</p>
      <button type="submit" className="live-primary" disabled={saving||loading||selected.approval_state!=='draft'||selected.mock_exclusive}>{saving?'Saving…':'Save human review'}</button>
     </form>}
   </div>
  </div>
 </section>;
}
