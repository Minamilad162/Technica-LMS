import React,{useEffect,useState} from 'react';
import {Activity,CheckCircle2,ChevronDown,ChevronUp,RefreshCw,ShieldAlert} from 'lucide-react';
import {diagnoseReviewConnection} from './reviewConnectionCheck';
import './reviewConnectionDiagnostics.css';

const publicBuild={
 url:import.meta.env.VITE_SUPABASE_URL||'',
 publicKey:import.meta.env.VITE_SUPABASE_ANON_KEY||''
};
const buildRef=typeof __TECHNICA_BUILD_SHA__==='string'?__TECHNICA_BUILD_SHA__:'not tagged';
const names={
 build:'Build configuration',api:'Supabase Data API',auth:'Supabase authentication',
 profile:'LMS account profile',admin:'Verified Admin role',asp:'ASP course',p6a:'P6A question-review RPC',ui:'LMS interface'
};

export default function ReviewConnectionDiagnostics({db,session=null,identity=null,course=null,identityError=''}) {
 const [open,setOpen]=useState(false),[checks,setChecks]=useState([]),[busy,setBusy]=useState(false),[round,setRound]=useState(0);
 useEffect(()=>{if(identityError)setOpen(true);},[identityError]);
 useEffect(()=>{
  if(!open)return;
  let active=true;
  setBusy(true);
  diagnoseReviewConnection(db,{build:publicBuild,session,identity,course,identityError})
   .then(rows=>{if(active)setChecks(rows);})
   .catch(()=>{if(active)setChecks([{id:'api',status:'fail',detail:'Connection inspection could not finish. Check your browser network access.'}]);})
   .finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[db,open,round,session?.user?.id,identity?.isAdmin,course?.id,identityError]);
 const problems=checks.filter(x=>x.status==='fail').length;
 return <section className="live-conn-panel" aria-label="ASP database connection diagnostics">
  <button className="live-conn-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <Activity size={17}/><span>Check database connection</span>
   {open&&problems>0&&<strong>{problems} issue{problems===1?'':'s'}</strong>}
   {open?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
  </button>
  {open&&<div className="live-conn-details">
   <p className="live-conn-explain">Read-only checks from this deployed browser. Source build: <code>{buildRef}</code>. No key, token, password or question contents are displayed.</p>
   {busy&&<p className="live-conn-progress"><RefreshCw size={14}/> Checking connection and permissions…</p>}
   {!busy&&checks.map(item=><div className="live-conn-step" key={item.id}>
    <div className={'live-conn-state state-'+item.status}>
     {item.status==='pass'?<CheckCircle2 size={17}/>:<ShieldAlert size={17}/>}
    </div>
    <div><strong>{names[item.id]||item.id}</strong><p>{item.detail}</p></div>
   </div>)}
   <div className="live-conn-actions">
    <button className="live-secondary" type="button" disabled={busy} onClick={()=>setRound(x=>x+1)}><RefreshCw size={14}/> Run checks again</button>
    <span>These checks don't change any database records.</span>
   </div>
  </div>}
 </section>;
}
