import React,{useEffect,useRef,useState} from 'react';
import {ClipboardCheck,LockKeyhole,ShieldCheck,X} from 'lucide-react';
import './secureAspReviewPanel.css';

// The separate HTML file is an INTERNAL, protected Supabase-only iframe app.
// Do not import it into the legacy Demo JS bundle: that would mix auth modes
// and risk shipping protected answer data from the wrong entry.
export default function SecureAspReviewPanel({onClose}){
 const frame=useRef(null);
 const [height,setHeight]=useState(760);
 const src=new URL('asp-review.html',document.baseURI).href;
 useEffect(()=>{
  const onResize=e=>{
   if(e.origin!==window.location.origin||e.source!==frame.current?.contentWindow)return;
   if(e.data?.type!=='technica:asp-review:resize')return;
   const h=Number(e.data.height);
   if(Number.isFinite(h)&&h>=320&&h<=6000)setHeight(Math.ceil(h));
  };
  window.addEventListener('message',onResize);
  return()=>window.removeEventListener('message',onResize);
 },[]);
 return <section className="bank-review-inside-card" aria-label="Secure ASP question review">
  <div className="bank-review-card-header">
   <div className="bank-review-icon"><ClipboardCheck size={21}/></div>
   <div className="bank-review-card-description">
    <strong>ASP Question Review</strong>
    <span>Review, classify and verify ASP questions inside the course. Saved reviews stay private drafts until a separate release.</span>
   </div>
   <button type="button" className="bank-review-close" aria-label="Close ASP review" onClick={onClose}><X size={18}/></button>
  </div>
  <div className="bank-review-safe-note"><ShieldCheck size={17}/><span>Secure Supabase Admin access is required. Your browser-local Demo login cannot review or approve live questions.</span></div>
  <iframe
   ref={frame}
   title="ASP Question Review — secure Supabase admin workspace"
   src={src}
   className="bank-review-secure-frame"
   style={{height}}
   loading="lazy"
   referrerPolicy="strict-origin-when-cross-origin"
  />
  <div className="bank-review-footer"><LockKeyhole size={15}/> Question answers and review decisions are protected by server-side admin authorization.</div>
 </section>;
}
