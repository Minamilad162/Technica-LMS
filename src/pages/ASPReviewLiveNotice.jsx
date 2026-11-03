import React from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpenCheck,LockKeyhole,ArrowLeft,ShieldCheck} from 'lucide-react';

// The current demo intentionally bundles the historic ASP bank and answers.
// This page must NEVER import secure production RPCs or imply that demo
// classifications/approval persist to Supabase.
export default function ASPReviewLiveNotice(){
 const navigate=useNavigate();
 return <div className="page-enter" style={{maxWidth:850,margin:'0 auto',display:'grid',gap:20}}>
  <div className="library-heading"><div><span style={{fontSize:12,fontWeight:800,color:'#15857d'}}>ADMIN · ASP QUESTION BANK</span>
   <h1 style={{display:'flex',alignItems:'center',gap:11}}><BookOpenCheck size={29}/> ASP Question Review</h1>
   <p className="page-subtitle">This workspace is available in the secured Supabase Live edition of Technica LMS.</p>
  </div></div>
  <section style={{background:'#fff',padding:'clamp(20px,4vw,32px)',border:'1px solid #dce8e9',borderRadius:18,display:'grid',gap:18,boxShadow:'0 14px 40px #1339460c'}}>
   <div style={{display:'flex',gap:15,alignItems:'flex-start'}}>
    <LockKeyhole size={27} color="#167b73" style={{flexShrink:0}}/>
    <div><h2 style={{margin:'0 0 8px',fontSize:22}}>Secure review is not part of the Demo</h2>
     <p style={{lineHeight:1.7,margin:0,color:'#586f78'}}>You're currently viewing the browser-local demonstration. The real ASP review queue is deliberately restricted to verified admins using Supabase Auth and P6A server-side permissions. Demo questions and simulated admin roles cannot approve live content.</p></div>
   </div>
   <div style={{background:'#eff8f5',borderRadius:12,padding:'14px 16px',display:'flex',gap:11,alignItems:'flex-start'}}>
    <ShieldCheck size={21} color="#187968" style={{flexShrink:0}}/>
    <span style={{lineHeight:1.65,fontSize:13,color:'#31685d'}}>To use the functional review menu, deploy the separate Live build with <code>VITE_DATA_MODE=supabase</code>, its public Supabase URL and anon key, a verified Admin account, and the P6A migration installed in an approved environment. Never publish a service-role key to the browser.</span>
   </div>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <button type="button" className="btn btn-secondary" onClick={()=>navigate('/question-bank')}><ArrowLeft size={17}/> Back to Demo Question Bank</button>
   </div>
  </section>
 </div>;
}
