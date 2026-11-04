import React,{useEffect,useRef,useState} from 'react';
import {ClipboardCheck,RefreshCw,ShieldAlert,TriangleAlert} from 'lucide-react';
import {fetchAspReleasePreflight} from './aspReleasePreflightApi.js';
import './aspReleasePreflight.css';

// Admin-only ASP reviewer subpanel. No approval/reservation control exists here.
export default function AspReleasePreflight({db,course}){
 const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(0);
 useEffect(()=>{request.current+=1;setReport(null);setBusy(false);setError('');},
  [db,course?.id]);
 const run=async()=>{
  const seq=++request.current;setReport(null);setError('');setBusy(true);
  try{
   const result=await fetchAspReleasePreflight(db,course.id);
   if(request.current===seq)setReport(result);
  }catch(e){
   if(request.current===seq)setError(e?.message||'Could not verify bank release status.');
  }finally{if(request.current===seq)setBusy(false);}
 };
 if(course?.slug!=='asp')return null;
 return <section className="asp-release-preflight" aria-label="ASP question release preflight">
  <div className="asp-release-head">
   <div><span className="live-eyebrow">P9A · GOVERNANCE CHECK</span>
    <h3><ClipboardCheck size={19}/> Bank release preflight</h3>
    <p>Check the actual ASP question-review pipeline before planning publication. No questions are changed, reserved or approved.</p></div>
   <button type="button" className="live-secondary" disabled={busy||!course?.id} onClick={run}>
    <RefreshCw size={15}/>{busy?'Verifying…':report?'Recheck actual bank':'Run read-only preflight'}
   </button>
  </div>
  {!report&&!busy&&!error&&<p className="asp-release-empty">No data has been assumed. Run the protected Admin audit to inspect the current database.</p>}
  {busy&&<p role="status" className="asp-release-empty">Checking genuine Admin authorization and audited ASP records…</p>}
  {error&&<p role="alert" className="live-error"><TriangleAlert size={16}/>{error}</p>}
  {report&&<>
    <div className="asp-release-state"><ShieldAlert size={18}/><strong>Release blocked — preview only</strong><span>Review completion is not publication. Mock needs its own versioned 200-question reservation before any question release.</span></div>
    <div className="asp-release-metrics">
     {[
       ['Imported records',report.total],
       ['Human review pending',report.needsHumanReview],
       ['Reviewed draft candidates',report.eligibleCandidates],
       ['Approved already',report.approved],
       ['Mock flagged (target 200)',report.mockReserved],
       ['Classified approved gaps',report.approvedWithClassificationGaps]
     ].map(([name,value])=><div key={name}><small>{name}</small><strong>{value.toLocaleString()}</strong></div>)}
    </div>
    <h4>Draft candidates with verified answers, rights and ASP11 difficulty</h4>
    <div className="asp-release-tiers">
     <span>Low <strong>{report.candidateLow}</strong></span>
     <span>Medium <strong>{report.candidateMedium}</strong></span>
     <span>High <strong>{report.candidateHigh}</strong></span>
    </div>
    <h4>Current release blockers</h4>
    <ul className="asp-release-blockers">{report.blockedReasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>
    {!!report.domainCandidates.length&&<div className="asp-release-domain-wrap">
     <table className="asp-release-domain-table"><thead><tr><th>Official ASP11 domain</th><th>Low</th><th>Medium</th><th>High</th></tr></thead>
      <tbody>{report.domainCandidates.map(d=><tr key={d.slug}>
       <td><b>{d.slug.toUpperCase()}</b> {d.title}</td><td>{d.low}</td><td>{d.medium}</td><td>{d.high}</td>
      </tr>)}</tbody></table>
    </div>}
    <p className="asp-release-note">These figures are potential review candidates, not an approved learner bank. Release and Mock reservation are separate owner-authorized operations and are deliberately unavailable from this panel.</p>
  </>}
 </section>;
}
