import React,{useEffect,useRef,useState} from 'react';
import {RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {fetchAdminAdaptiveReadiness} from './adminAdaptiveReadiness.js';

// Mounted only within the protected Supabase Admin ASP reviewer.
// The installed P8 server RPC enforces actual database authorization.
export default function AdminAdaptiveReadiness({db,course,domains=[]}){
 const [domainId,setDomainId]=useState('');
 const [rows,setRows]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(0);
 useEffect(()=>{
  request.current+=1;setRows(null);setError('');setBusy(false);
 },[course?.id,domainId,db]);
 const check=async()=>{
  const current=++request.current;setRows(null);setError('');setBusy(true);
  try{
   const result=await fetchAdminAdaptiveReadiness(db,course.id,domainId||null);
   if(request.current===current)setRows(result);
  }catch(e){
   if(request.current===current)setError(e?.message||'Could not verify the approved question pool.');
  }finally{
   if(request.current===current)setBusy(false);
  }
 };
 return <section className="live-adaptive-review" aria-label="Adaptive Level Up bank readiness">
  <div className="live-adaptive-review-head">
   <div><h3><ShieldCheck size={18}/> Level Up bank readiness</h3>
    <p>Read-only live Supabase check. Each length requires that many <strong>approved, non-Mock</strong> questions in EACH difficulty tier. Human review alone is not approval.</p></div>
   <button type="button" className="live-secondary" onClick={check} disabled={busy||!course?.id}>
    <RefreshCw size={15}/>{busy?'Checking…':rows?'Check again':'Check real bank'}
   </button>
  </div>
  <label className="live-adaptive-review-domain">Question pool
   <select value={domainId} onChange={e=>setDomainId(e.target.value)}>
    <option value="">All ASP domains</option>
    {domains.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
   </select>
  </label>
  {busy&&<p className="live-adaptive-review-status" role="status">Verifying approved Low / Medium / High pools through the protected P8 RPC…</p>}
  {error&&<p className="live-error" role="alert"><TriangleAlert size={16}/>{error} Check the P8 migration, Admin role and selected course in the dedicated Technica Supabase project.</p>}
  {rows&&<><div className="live-adaptive-review-pools" role="status">
   <span>Eligible questions, per tier</span><strong>Low {rows[0].low}</strong><strong>Medium {rows[0].medium}</strong><strong>High {rows[0].high}</strong>
  </div>
  <div className="live-adaptive-review-grid">{rows.map(r=><div key={r.count} className="live-adaptive-review-result">
   <b>{r.count} questions</b>
   <strong className={r.ready?'ready':'blocked'}>{r.ready?'Ready':'Not ready'}</strong>
   <small>{r.ready?'Server pool verified':'Needs '+r.count+' per tier'}</small>
   <small>Low {r.checkpoint} · Medium {r.mediumCheckpoint} minimum · 70% to advance</small>
  </div>)}</div>
  <p className="live-adaptive-review-footnote">Counts are read-only snapshots. Starting practice rechecks permissions and eligibility on the server. No question is approved, classified or published by this panel.</p></>}
  {!rows&&!busy&&!error&&<p className="live-adaptive-review-status">Choose a pool and check the real database. No readiness is assumed before the server responds.</p>}
 </section>;
}
