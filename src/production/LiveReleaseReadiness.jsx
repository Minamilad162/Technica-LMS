import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Activity,AlertTriangle,ArrowLeft,CheckCircle2,ChevronDown,ChevronUp,ClipboardList,Clock3,Copy,LockKeyhole,RefreshCw,ShieldCheck,XCircle} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {checkReleaseReadiness,releaseReportText,summarizeReleaseReadiness} from './releaseReadiness.js';
import './liveLearning.css';
import './releaseReadiness.css';

const icons={pass:CheckCircle2,blocked:XCircle,pending:Clock3};
const labels={pass:'Passed',blocked:'Blocked',pending:'Needs independent evidence'};
const zones=['Platform','Access','Learning','Progress','Practice','Content','Exams','Analytics','Security','Integration','Entitlements','Devices','Operations','Release'];
export default function LiveReleaseReadiness(){
 const nav=useNavigate();
 const [round,setRound]=useState(0),[rows,setRows]=useState([]),[loading,setLoading]=useState(true);
 const [message,setMessage]=useState(''),[open,setOpen]=useState({});
 useEffect(()=>{
  let active=true;
  setRows([]);setLoading(true);setMessage('');
  let db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch{setRows([{id:'build',area:'Platform',title:'Supabase public configuration',
    status:'blocked',detail:'Verified Supabase build configuration is missing. No database checks were run.'}]);
   setLoading(false);return;}
  checkReleaseReadiness(db).then(values=>{if(active)setRows(values);})
   .catch(()=>{if(active)setMessage('The read-only readiness check could not complete. Do not approve Production.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[round]);
 const summary=useMemo(()=>summarizeReleaseReadiness(rows),[rows]);
 const grouped=useMemo(()=>zones.map(zone=>({zone,items:rows.filter(r=>r.area===zone)}))
  .filter(x=>x.items.length),[rows]);
 const copyReport=async()=>{
  try{
   await navigator.clipboard.writeText(releaseReportText(rows));
   setMessage('Aggregate evidence checklist copied. No question content or access keys included.');
  }catch{
   setMessage('Clipboard permission unavailable. You can still review each gate here.');
  }
 };
 return <main className="live-learning p12-page page-enter" aria-label="Production readiness diagnostics">
  <div className="live-learning-breadcrumb">
   <button type="button" onClick={()=>nav('/analytics')}><ArrowLeft size={16}/> Admin Overview</button>
  </div>
  <header className="live-learning-header">
   <span className="eyebrow">P12 · PRODUCTION READINESS</span>
   <h1>Release Readiness &amp; QA</h1>
   <p>Real signed-in Admin, live Supabase checks, and independent sign-off requirements. Everything on this page is read-only.</p>
  </header>
  <div className="p12-warning"><LockKeyhole size={18}/>
   <span>This checklist never installs migrations, creates questions, approves content, reserves a Mock,
    or deploys Production. A successful browser check cannot substitute for staging and owner sign-off.</span>
  </div>
  <section className="p12-summary" aria-label="Readiness status">
   <div className="p12-verdict"><AlertTriangle size={21}/><div><small>RELEASE DECISION</small><strong>NO-GO</strong>
    <span>Not cleared for production launch</span></div></div>
   <div className="p12-count"><strong>{summary.passed}</strong><span>Passed checks</span></div>
   <div className="p12-count blocked"><strong>{summary.blocked}</strong><span>Blocked checks</span></div>
   <div className="p12-count"><strong>{summary.pending}</strong><span>Awaiting evidence</span></div>
  </section>
  <div className="p12-actions">
   <span><ShieldCheck size={16}/> Live Admin checks run only after verified Supabase authentication</span>
   <div><button type="button" className="btn btn-secondary" disabled={loading} onClick={()=>setRound(n=>n+1)}>
    <RefreshCw size={15}/> Run checks again</button>
    <button type="button" className="btn btn-secondary" disabled={loading||!rows.length} onClick={copyReport}>
     <Copy size={15}/> Copy checklist</button></div>
  </div>
  {message&&<p className="p12-notice" role="status">{message}</p>}
  {loading?<div className="live-learning-empty" role="status"><Activity size={18}/> Checking the live ASP infrastructure without modifying data…</div>:
   !rows.length?<div className="live-learning-empty" role="alert">Readiness results were not available. Launch remains blocked.</div>:
   <div className="p12-groups">{grouped.map(({zone,items})=><section key={zone} className="p12-group">
    <div className="p12-group-title"><h2>{zone}</h2><span>{items.length} check{items.length===1?'':'s'}</span></div>
    {items.map(item=>{
     const Icon=icons[item.status]||AlertTriangle;
     return <div className="p12-check" key={item.id}>
      <button type="button" className="p12-check-title" onClick={()=>setOpen(v=>({...v,[item.id]:!(v[item.id]??true)}))}
       aria-expanded={open[item.id]??true}>
       <Icon size={17} className={'state-'+item.status}/>
       <strong>{item.title}</strong>
       <span className={'p12-status state-'+item.status}>{labels[item.status]}</span>
       {open[item.id]??true?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
      </button>
      {(open[item.id]??true)&&<p>{item.detail}</p>}
     </div>;
    })}
   </section>)}</div>}
  <footer className="p12-footer">
   <ClipboardList size={17}/> Read-only runtime status, not a production certification. Detailed staging QA, evidence, content-rights review, rollback and explicit launch authorization remain separate mandatory release gates.
  </footer>
 </main>;
}
