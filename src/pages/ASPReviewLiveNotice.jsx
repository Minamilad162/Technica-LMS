import React,{useEffect} from 'react';
import {BookOpenCheck,ShieldCheck} from 'lucide-react';

// The demo admin menu is a gateway to the REAL Supabase Auth reviewer,
// not a parallel local-storage review or an answer-key-bearing import.
// /asp-review.html is built as an isolated HTML module entry, on the same site.
export default function ASPReviewLiveNotice(){
 const secureUrl=new URL('asp-review.html',document.baseURI).href;
 useEffect(()=>{window.location.replace(secureUrl);},[secureUrl]);
 return <div className="page-enter" style={{maxWidth:760,margin:'35px auto',padding:30,textAlign:'center'}}>
  <BookOpenCheck size={33} color="#15857d" style={{margin:'0 auto'}}/>
  <h1>Opening ASP Question Review</h1>
  <p className="page-subtitle">Connecting to the secured Supabase administrator workspace. You will sign in with your actual LMS admin credentials.</p>
  <a className="btn btn-secondary" href={secureUrl}><ShieldCheck size={17}/> Open secure ASP reviewer</a>
 </div>;
}
