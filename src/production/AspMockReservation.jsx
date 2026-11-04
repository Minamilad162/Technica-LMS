import React,{useEffect,useMemo,useRef,useState} from 'react';
import {CheckCircle2,ClipboardCheck,LockKeyhole,RefreshCw,ShieldAlert,TriangleAlert} from 'lucide-react';
import {previewAspMockReservation,reserveAspMock} from './aspBankReleaseApi.js';

const PHRASE='RESERVE 200 ASP MOCK QUESTIONS';
const message=e=>e?.message||'Mock reservation could not be verified.';

export default function AspMockReservation({db,course,ids=[],onReserved}){
 const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false);
 const [phrase,setPhrase]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(null);
 const req=useRef(0);
 const selected=useMemo(()=>[...ids].sort(),[ids]);
 const signature=selected.join(',');
 useEffect(()=>{
  req.current+=1;setPreview(null);setPhrase('');setError('');setSuccess(null);
 },[course?.id,signature,db]);
 if(course?.slug!=='asp')return null;
 const check=async()=>{
  const serial=++req.current;setBusy(true);setPreview(null);setError('');
  try{
   const result=await previewAspMockReservation(db,course.id,selected);
   if(serial===req.current)setPreview(result);
  }catch(e){if(serial===req.current)setError(message(e));}
  finally{if(serial===req.current)setBusy(false);}
 };
 const reserve=async()=>{
  if(busy||!preview?.ready||phrase!==PHRASE)return;
  if(!window.confirm('Reserve exactly these 200 reviewed ASP question IDs permanently for the exclusive Mock? This is NOT Mock activation and cannot be undone in this workflow.'))return;
  const serial=++req.current;setBusy(true);setError('');
  try{
   // Recheck on the server during the atomic reservation. A stale preview
   // can never authorize another list or bypass human rights verification.
   const outcome=await reserveAspMock(db,course.id,selected,phrase);
   if(serial===req.current){
    setSuccess(outcome);
    setPreview(null);setPhrase('');
    onReserved?.();
   }
  }catch(e){if(serial===req.current)setError(message(e));}
  finally{if(serial===req.current)setBusy(false);}
 };
 return <section className="live-review-domains" aria-label="Versioned 200 question ASP Mock reservation">
  <div className="p9b-reservation">
   <span className="live-eyebrow">P9B · CONTROLLED BANK RELEASE</span>
   <h3><LockKeyhole size={18}/> Exclusive Mock reservation</h3>
   <p>Select individually reviewed <strong>Draft</strong> questions from the <b>Reviewed · ready</b> queue below. The 200 selected IDs become a permanent, private Mock form only after an explicit Admin action. This does <strong>not</strong> activate the 5-hour Mock exam or publish any questions.</p>
   <div className="p9b-progress"><strong>{selected.length} / 200 selected</strong><span>Requirements: official ASP11 domain, verified answer, usage rights and no prior Practice use. No automatic selections.</span></div>
   <button className="live-secondary" type="button" disabled={busy||selected.length!==200||!!success} onClick={check}><RefreshCw size={16}/> {busy?'Checking…':'Verify 200 selected IDs'}</button>
   {preview&&<div className="p9b-check" role="status">
    <strong>{preview.ready?'All selected items qualify':'Reservation blocked'}</strong>
    <span>Eligible {preview.verifiedEligible}/200 · Unique {preview.distinctSelected}/200 · Existing Mock flags {preview.existingReserved} · Official ASP11 domains {preview.officialDomainCount}/9</span>
    <span>Low {preview.low} · Medium {preview.medium} · High {preview.high} (this is not a required Mock difficulty split).</span>
   </div>}
   {preview?.ready&&<div className="p9b-confirm">
    <label>Type <strong>{PHRASE}</strong> to authorize this irreversible reservation
     <input value={phrase} onChange={e=>setPhrase(e.target.value)} autoComplete="off" placeholder="Exact confirmation phrase"/>
    </label>
    <button type="button" className="live-primary" disabled={busy||phrase!==PHRASE} onClick={reserve}>
     <ClipboardCheck size={16}/> Reserve 200 for Mock
    </button>
   </div>}
   {success&&<p className="live-notice" role="status"><CheckCircle2 size={16}/> Reserved exactly 200 questions in Mock Form v{success.version}. Practice approvals remain a separate step; Mock delivery is not active.</p>}
   {error&&<p className="live-error" role="alert"><TriangleAlert size={16}/>{error}</p>}
   <p className="live-review-hint"><ShieldAlert size={16}/> Only authorized Admins can use these RPCs. Source and CI alone do not indicate that this migration is installed in Supabase.</p>
  </div>
 </section>;
}
