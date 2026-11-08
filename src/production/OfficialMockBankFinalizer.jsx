import React,{useEffect,useState} from 'react';
import {ClipboardCheck,ShieldCheck,TriangleAlert} from 'lucide-react';
import {loadMarkedMockCandidateIds} from './courseQuestionBankApi.js';
import AspMockReservation from './AspMockReservation.jsx';

// Only saved candidate IDs are eligible to be proposed for official finalization.
// Permanent reservation is exclusively done by the separately confirmed P9B RPC.
export default function OfficialMockBankFinalizer({db,course,disabled=false,revision=0,onReserved}){
 const [open,setOpen]=useState(false),[ids,setIds]=useState(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setOpen(false);setIds(null);setError('');},[db,course?.id]);
 useEffect(()=>{setIds(null);setError('');},[revision]);
 if(course?.slug!=='asp')return null;
 async function load(){
  if(disabled||loading)return;
  setLoading(true);setError('');setIds(null);
  try{
   const marked=await loadMarkedMockCandidateIds(db,course.id);
   if(marked.length>200)throw Error('More than 200 Mock candidates saved. Uncheck extra questions and Save All first.');
   if(new Set(marked).size!==marked.length)throw Error('The saved Mock selection contains duplicate IDs.');
   setIds(marked);
  }catch(e){setError(e?.message||'Could not verify saved Mock questions.');}
  finally{setLoading(false);}
 }
 return <section className="p40-bank-finalizer at-surface" aria-label="Finalize official ASP Mock from saved Question Bank selections">
  <div className="p40-finalizer-intro">
   <ShieldCheck size={19}/>
   <div><strong>Make the checked questions your official 200-question Mock</strong>
    <p>Save All your Mock Exam checkboxes first. Load the saved selection, verify the ASP11 answer and rights review, then confirm permanent reservation. The learner exam always stays at 200 questions / 5 hours.</p></div>
   <button type="button" className="at-outline" aria-expanded={open} disabled={disabled}
    onClick={()=>{setOpen(v=>!v);setError('');setIds(null);}}>
    <ClipboardCheck size={15}/>{open?'Close official setup':'Finalize official Mock'}
   </button>
  </div>
  {disabled&&<p className="p40-finalizer-note">Save or discard pending Question Bank edits before finalizing.</p>}
  {open&&<div className="p40-finalizer-body">
   <div className="p40-finalizer-load">
    <button type="button" className="at-primary" disabled={disabled||loading} onClick={()=>void load()}>
     {loading?'Checking saved choices…':'Load saved Mock Exam choices'}
    </button>
    <span role="status">{ids?ids.length+' / 200 saved candidates loaded':'No saved selection loaded yet'}</span>
   </div>
   {ids&&ids.length!==200&&<p className="p40-finalizer-note" role="status">
    Exactly 200 distinct saved Mock choices are required. Adjust the checkboxes in Question Bank and Save All.
   </p>}
   {ids?.length===200&&!disabled&&
    <AspMockReservation db={db} course={course} ids={ids} onReserved={()=>{
     setOpen(false);setIds(null);onReserved?.();
    }}/>}
   {error&&<p className="at-error" role="alert"><TriangleAlert size={15}/>{error}</p>}
  </div>}
 </section>;
}
