import React,{useState} from 'react';
import {BookCheck,Download,FileCheck2,Info,LockKeyhole,ShieldCheck} from 'lucide-react';
import './qualificationCentreBrief.css';

const bucket='technica-qualification-materials';
export default function QualificationCentreBrief({unit,db,learner=false}){
 const brief=unit.centreBrief;
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 if(!brief)return <section className="qb-empty"><Info size={17}/><span>No approved Unit assignment brief has been published for your enrolled edition. Contact the centre before relying on working templates for an official submission.</span></section>;
 const open=async item=>{
  setBusy(item.id);setError('');
  try{
   const {data,error:storageError}=await db.storage.from(bucket).createSignedUrl(item.path,60);
   if(storageError||!data?.signedUrl)throw storageError||new Error('Approved centre file is not currently accessible.');
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }catch(e){setError(e.message||'Unable to open approved resource.');}
  finally{setBusy('');}
 };
 return <section className="qb-brief">
  <header><div className="qb-icon"><BookCheck size={23}/></div><div><span className="qf-overline">CENTRE APPROVED · ASSESSMENT INSTRUCTIONS</span>
    <h3>{unit.code} — Assessment Brief</h3>
    <p>Approved by the training centre on {new Date(brief.approvedAt).toLocaleDateString()}.</p></div><ShieldCheck size={23}/></header>
  <details open={learner}><summary>Read approved Unit instructions</summary><div className="qb-body">{brief.instructions}</div></details>
  {learner&&<p className="qb-learner-guidance">Prepare the work described in the Unit instructions. Link your evidence to the relevant criteria, then submit each complete Outcome for assessment.</p>}
  {brief.methods&&(learner ? <details><summary>How your work will be assessed</summary><div className="qb-body">{brief.methods}</div></details>
    : <div className="qb-methods"><strong>Approved assessment methods and conditions</strong><p>{brief.methods}</p></div>)}
  {!!brief.files?.length&&<div className="qb-files">
   <strong>Protected centre-issued resource files</strong>
   {brief.files.map(file=><button type="button" disabled={busy===file.id} key={file.id} onClick={()=>open(file)}>
    <FileCheck2 size={16}/><span>{file.title}<small>{file.filename} · {file.kind.replaceAll('_',' ')}</small></span>
    <Download size={16}/></button>)}
   <p><LockKeyhole size={14}/> Files are private to enrolled learners and their assigned reviewers.</p>
  </div>}
  {error&&<p className="qb-error" role="alert">{error}</p>}
 </section>;
}
