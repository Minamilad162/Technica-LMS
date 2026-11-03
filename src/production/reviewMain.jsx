import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import SupabaseApp from './SupabaseApp';

// This is an internal secure Supabase HTML entry, not a separate navigation tab.
// In default deployed mode it is embedded inside the ASP Question Bank course
// card. Real Auth/JWT and P6A PostgreSQL RPC checks control all answer access.
const embedded=window.parent!==window;
if(embedded)document.documentElement.classList.add('tc-review-embedded');

function ReportEmbeddedHeight(){
 useEffect(()=>{
  if(!embedded)return;
  const root=document.getElementById('root');
  if(!root)return;
  const report=()=>{
   // Only layout height is shared, never credentials/question data.
   const height=Math.max(360,Math.min(5900,Math.ceil(root.getBoundingClientRect().height)+8));
   window.parent.postMessage({type:'technica:asp-review:resize',height},window.location.origin);
  };
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(report):null;
  observer?.observe(root);
  window.addEventListener('resize',report);
  const raf=requestAnimationFrame(report);
  return()=>{observer?.disconnect();window.removeEventListener('resize',report);cancelAnimationFrame(raf);};
 },[]);
 return null;
}
createRoot(document.getElementById('root')).render(
 <React.StrictMode>
  <SupabaseApp secureReviewEntry={true} reviewerOnly={true}/>
  <ReportEmbeddedHeight/>
 </React.StrictMode>
);
