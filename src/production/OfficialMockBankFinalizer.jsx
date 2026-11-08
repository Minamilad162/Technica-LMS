import React,{useEffect,useState} from 'react';
import {ClipboardCheck,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {loadMarkedMockCandidateIds} from './courseQuestionBankApi.js';
import AspMockReservation from './AspMockReservation.jsx';

// Only saved candidate IDs are eligible to be proposed for official finalization.
// Permanent reservation is exclusively done by the separately confirmed P9B RPC.
export default function OfficialMockBankFinalizer({db,course,disabled=false,revision=0,onReserved}){
 const [open,setOpen]=useState(false),[ids,setIds]=useState(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 // Admin-only count of ALL saved candidates, including selections on other pages.
 // No question contents or answer keys are exposed in this setup panel.
 useEffect(()=>{
  if(!db||!course?.id){setOpen(false);setIds(null);setError('');return;}
  let live=true;setOpen(false);setIds(null);setError('');setLoading(true);
  loadMarkedMockCandidateIds(db,course.id).then(marked=>{
   if(!live)return;
   if(new Set(marked).size!==marked.length)throw Error('Duplicate saved Mock question IDs.');
   setIds(marked);setOpen(marked.length===200&&course.slug==='asp');
  }).catch(e=>{if(live)setError(e?.message||'Saved Mock selection could not be read.');})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[db,course?.id,course?.slug,revision]);
 async function load(){
  if(disabled||loading)return;
  setLoading(true);setError('');
  try{
   const marked=await loadMarkedMockCandidateIds(db,course.id);
   if(new Set(marked).size!==marked.length)throw Error('Duplicate saved Mock question IDs.');
   setIds(marked);setOpen(marked.length===200&&course.slug==='asp');
  }catch(e){setError(e?.message||'Could not verify saved Mock questions.');}
  finally{setLoading(false);}
 }
 return <section className="p40-bank-finalizer at-surface" aria-label="Finalize official ASP Mock from saved Question Bank selections">
  <div className="p40-finalizer-intro">
   <ShieldCheck size={19}/>
   <div><strong>Saved Mock Exam choices · {loading?'Checking…':ids?ids.length+'/200':'Unavailable'}</strong>
    <p>{course.slug!=='asp'
      ?'These saved Mock choices belong to a Course without the canonical ASP identifier. Link the existing ASP Course first.'
      :disabled?'Save All Changes first; only committed Question Bank selections can be finalized.'
      :ids?.length===200?'200 saved questions found across the entire bank. Verify their reviewed answers and usage rights, then explicitly confirm the official 5-hour Mock form.'
      :ids?.length>200?'Too many saved Mock choices. Uncheck '+(ids.length-200)+' questions and save.'
      :'Choose '+(200-(ids?.length||0))+' additional unused Draft questions as Mock Exam and Save All Changes.'}</p>
   </div>
   <button type="button" className="at-outline" disabled={disabled||loading}
    onClick={()=>void load()}><RefreshCw size={15}/> Refresh saved selection</button>
  </div>
  {disabled&&<p className="p40-finalizer-note">Save or discard pending Question Bank edits before finalizing.</p>}
  {course?.slug==='asp'&&open&&ids?.length===200&&!disabled&&<div className="p40-finalizer-body">
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
