import React,{useRef,useState} from 'react';
import {AlertTriangle,CheckCircle2,ClipboardCheck,Copy,FileJson2,LockKeyhole,ShieldAlert,XCircle} from 'lucide-react';
import {copyStagingEvidence,stagingEvidenceSummary,validateStagingEvidence} from './stagingQaEvidence.js';
import './stagingQaEvidence.css';

// Local file import ONLY. Never sends reports to backend/storage or claims GO.
const iconByStatus={pass:CheckCircle2,blocked:XCircle,pending:ShieldAlert};
export default function StagingQaEvidencePanel(){
 const [report,setReport]=useState(null),[error,setError]=useState(''),[info,setInfo]=useState('');
 const picker=useRef(null);
 async function importFile(file){
  setReport(null);setError('');setInfo('');
  if(!file)return;
  if(!/\.json$/i.test(file.name)||file.size>100*1024){
   setError('Select a P12 sanitized staging JSON report up to 100 KB.');return;
  }
  try{
   const content=await file.text();
   const data=validateStagingEvidence(content);
   setReport(data);
   setInfo('Local report opened. This does not verify its origin or grant release approval.');
  }catch{
   setError('The report is invalid, incomplete or contains unapproved fields. No data were sent.');
  }
 }
 async function copy(){
  if(!report)return;
  try{
   await navigator.clipboard.writeText(copyStagingEvidence(report));
   setInfo('Sanitized local QA summary copied. No user credentials included.');
  }catch{setInfo('Clipboard permission is unavailable; no report was sent.');}
 }
 const counts=report?stagingEvidenceSummary(report):null;
 return <section className="p12-evidence" aria-label="P12 Staging API QA evidence">
  <div className="p12-evidence-heading">
   <div><span className="eyebrow">P12.2 · STAGING QA EVIDENCE</span>
    <h2><ClipboardCheck size={20}/> Staging Integration Evidence</h2>
    <p>Import a sanitized report from the protected CLI. This view stays entirely in your browser, with no upload or database change.</p>
   </div>
   <button type="button" className="btn btn-secondary" onClick={()=>picker.current?.click()}>
    <FileJson2 size={16}/> Import local JSON report</button>
   <input ref={picker} type="file" accept="application/json,.json" hidden
    onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/>
  </div>
  <div className="p12-evidence-guard"><LockKeyhole size={16}/>
   Staging API checks do not replace browser/mobile E2E, content licensing, load testing or owner authorization. Release stays NO-GO.</div>
  {error&&<p className="p12-evidence-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
  {info&&<p className="p12-evidence-info" role="status">{info}</p>}
  {!report?<div className="p12-evidence-empty">
    <FileJson2 size={24}/>
    <b>No verified staging API evidence imported</b>
    <p>The runner is available in GitHub: <code>npm run qa:staging:read</code>. Use separate Staging test accounts; the runner refuses an unconfirmed production project and writes no LMS records.</p>
   </div>:<>
    <div className="p12-evidence-summary">
     <div><small>Scope</small><b>Read-only API / Staging</b></div>
     <div><small>Passed</small><b>{counts.passed}</b></div>
     <div><small>Blocked</small><b>{counts.blocked}</b></div>
     <div><small>Pending</small><b>{counts.pending}</b></div>
     <div><small>Launch status</small><b>NO-GO</b></div>
    </div>
    <div className="p12-evidence-toolbar"><span>Report date: {new Date(report.generatedAt).toLocaleString()}</span>
     <button type="button" className="btn btn-secondary" onClick={copy}><Copy size={15}/> Copy sanitized summary</button></div>
    <div className="p12-evidence-scenarios">
     {report.checks.map(item=>{
      const Icon=iconByStatus[item.status];
      return <div key={item.id} className="p12-evidence-check">
       <Icon size={17} className={'state-'+item.status}/>
       <div><b>{item.title}</b><p>{item.detail}</p></div>
       <span className={'p12-status state-'+item.status}>{item.status.toUpperCase()}</span>
      </div>;
     })}
    </div>
   </>}
 </section>;
}
