import React,{useEffect,useState} from 'react';
import {CheckCircle2,FileCheck2,LockKeyhole,RefreshCw,Save} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';

const groups=[
 {title:'Personal',description:'Contact information for this learner and programme.',fields:[
  {key:'phone',label:'Phone number',type:'tel',max:40},
  {key:'alternatePhone',label:'Alternative phone',type:'tel',max:40},
  {key:'country',label:'Country',max:80},
 ]},
 {title:'Professional',description:'Current professional background for the assessment portfolio.',fields:[
  {key:'jobTitle',label:'Job title / position',max:150},
  {key:'employer',label:'Employer / organisation',max:200},
  {key:'department',label:'Department',max:120},
 ]},
 {title:'Certificate',description:'Reference numbers supplied by the learner or training centre, not a certificate issued by this system.',fields:[
  {key:'awardingLearnerNumber',label:'Awarding Body learner number',max:120},
  {key:'uniqueLearnerNumber',label:'Unique Learner Number (if applicable)',max:120},
  {key:'awardingRegistrationNumber',label:'Awarding Body registration number',max:120},
  {key:'certificateName',label:'Name to appear on certificate',max:180},
 ]},
 {title:'General',description:'Support or accessibility information you choose to share with the authorised centre team.',fields:[
  {key:'learningNeeds',label:'Learning / assessment support needs',multiline:true,max:1000},
  {key:'generalNotes',label:'Additional registration notes',multiline:true,max:1000},
 ]},
 {title:'Funding',description:'Administrative funding details, if applicable. No payment information is collected.',fields:[
  {key:'fundingSource',label:'Funding source',max:150},
  {key:'fundingReference',label:'Funding reference',max:150},
 ]},
];
const date=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(value)):'Not saved';
export default function QualificationCandidateRegistration({db,portfolio}){
 const [data,setData]=useState(null);
 const [stamp,setStamp]=useState(null);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [saving,setSaving]=useState(false);
 const [revision,setRevision]=useState(0);
 const editable=portfolio.role==='learner'&&portfolio.canEdit;
 useEffect(()=>{
  if(portfolio.role!=='learner')return;
  let alive=true;
  setError('');setSuccess('');
  portfolioRpc(db,'registration_read',{p_enrolment:portfolio.id})
   .then(result=>{if(alive){setData(result?.details||{});setStamp(result?.updatedAt||null);}})
   .catch(err=>{if(alive)setError(err?.message||'Could not load registration details.');});
  return ()=>{alive=false;};
 },[db,portfolio.id,portfolio.role,revision]);
 const update=(key,value)=>{setData(old=>({...old,[key]:value}));setSuccess('');};
 const submit=async e=>{
  e.preventDefault();
  if(!editable||saving)return;
  setSaving(true);setError('');setSuccess('');
  try{
   const updated=await portfolioRpc(db,'registration_save',{p_enrolment:portfolio.id,p_data:data});
   setData(updated.details||{});setStamp(updated.updatedAt||null);
   setSuccess('Registration details saved to your private programme record.');
  }catch(err){setError(err?.message||'Could not save registration details.');}
  finally{setSaving(false);}
 };
 if(portfolio.role!=='learner')return <section className="qf-card qf-ref-candidate">
   <div className="qf-card-header"><h3>Candidate registration form</h3><LockKeyhole size={18}/></div>
   <p>Personal registration details are visible only to the enrolled learner and authorised centre administration. Assigned reviewers use the assessment portfolio and Declaration.</p>
 </section>;
 return <section className="qf-card qf-ref-candidate">
  <div className="qf-card-header"><h3>Candidate Registration Form</h3><FileCheck2 size={19}/></div>
  <div className="qf-ref-candidate-heading">
   <div><span>REGISTERED LEARNER</span><strong>{portfolio.learner}</strong>
     <small>{portfolio.title} · {portfolio.version}</small></div>
   <span><LockKeyhole size={14}/> Private learner record</span>
  </div>
  <p className="qf-ref-candidate-intro">This form collects only programme-related contact and professional details.
    Date of birth, national insurance numbers, home address and identity documents are not collected here unless a separate secure centre process is established.</p>
  {error&&<p className="qf-live-error" role="alert">{error} <button type="button" className="qf-live-link" onClick={()=>setRevision(old=>old+1)}>Retry</button></p>}
  {data===null&&!error&&<p className="qf-ref-candidate-loading"><RefreshCw size={16}/> Loading registration form...</p>}
  {data!==null&&<form onSubmit={submit}>
   {groups.map((group,index)=><details key={group.title} className="qf-ref-candidate-group" open={index===0?true:undefined}>
    <summary><span>{group.title}</span><small>{group.description}</small></summary>
    <div className="qf-ref-candidate-fields">{group.fields.map(field=><label key={field.key} className="qf-field">
     {field.label}
     {field.multiline?<textarea rows={3} value={data[field.key]||''} maxLength={field.max} disabled={!editable||saving}
       onChange={e=>update(field.key,e.target.value)}/>:
       <input value={data[field.key]||''} type={field.type||'text'} maxLength={field.max}
         disabled={!editable||saving} onChange={e=>update(field.key,e.target.value)}/>}
    </label>)}</div>
   </details>)}
   <div className="qf-ref-candidate-footer">
    <span>Last saved: {date(stamp)}</span>
    {editable&&<button type="submit" disabled={saving} className="qf-button qf-primary"><Save size={16}/>
      {saving?'Saving...':'Save registration details'}</button>}
   </div>
   {success&&<p role="status" className="qf-live-notice"><CheckCircle2 size={16}/> {success}</p>}
  </form>}
 </section>;
}
