import PremiumLoading from '../components/PremiumLoading.jsx';
import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BookOpen,CalendarClock,ChevronRight,ClipboardCheck,GraduationCap,
 Mail,RefreshCw,ShieldCheck,UserRound} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchLiveLearningCatalog} from './liveLearningApi.js';
import {subscriptionPlanLabel,subscriptionTimeLeft,formatEnd} from './subscriptionCountdownPolicy.js';
import SubscriptionCountdown from './SubscriptionCountdown.jsx';
import './liveProfile.css';

// This is the signed-in learner's verified profile and P11 history.
// Never use demo store names, another user's ID, or client-computed grades.
const LiveLearnerWorkspace=React.lazy(()=>import('./LiveLearnerWorkspace.jsx'));
const validTab=tab=>tab==='practice'?'practice':'overview';
const date=value=>value&&Number.isFinite(Date.parse(value))?formatEnd(value):'—';
export default function LiveMyProfile(){
 const [params,setParams]=useSearchParams();
 const tab=validTab(params.get('tab'));
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState({loading:true,db:null,catalog:null,error:''});
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let alive=true,db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch(e){setState({loading:false,db:null,catalog:null,error:e?.message||'Secure account connection unavailable.'});return;}
  setState({loading:true,db,catalog:null,error:''});
  fetchLiveLearningCatalog(db).then(catalog=>{
   if(alive)setState({loading:false,db,catalog,error:''});
  }).catch(e=>{if(alive)setState({loading:false,db,catalog:null,error:e?.message||'Could not verify your profile.'});});
  return()=>{alive=false;};
 },[revision]);
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  const handleFocus=()=>tick();
  const interval=window.setInterval(tick,60_000);
  window.addEventListener('focus',handleFocus);
  return()=>{window.clearInterval(interval);window.removeEventListener('focus',handleFocus);};
 },[]);
 const selectTab=next=>{
  const target=new URLSearchParams(params);
  if(next==='overview')target.delete('tab');else target.set('tab','practice');
  setParams(target);
 };
 const {loading,db,catalog,error}=state;
 const user=catalog?.user;
 const name=String(catalog?.identity?.profile?.full_name||user?.user_metadata?.full_name||
  user?.email?.split('@')[0]||'').trim();
 const subscription=catalog?.subscription||null;
 const days=subscriptionTimeLeft(subscription,now);
 const active=days.state==='active';
 const plan=active?subscriptionPlanLabel(subscription):'No active subscription';
 const canBrowse=catalog?.openAccess===true;
 return <main className="lprofile page-enter" data-feature="verified-my-profile">
  <div className="lprofile-hero">
   <div className="lprofile-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase()||<UserRound size={28}/>}</div>
   <div className="lprofile-hero-copy">
    <span className="lprofile-eyebrow">MY TECHNICA ACCOUNT</span>
    <h1>{loading?'My Profile':name||'My Profile'}</h1>
    <p><Mail size={15}/>{user?.email||'Account and subscription details'}</p>
   </div>
   <button type="button" className="lprofile-refresh" disabled={loading}
    onClick={()=>setRevision(n=>n+1)}><RefreshCw size={17}/>Refresh</button>
  </div>
  <div className="lprofile-tabs" role="tablist" aria-label="My Profile sections">
   <button type="button" role="tab" id="lprofile-tab-overview" aria-selected={tab==='overview'}
    aria-controls="lprofile-section-overview" onClick={()=>selectTab('overview')}>
    <UserRound size={19}/> Profile &amp; Subscription
   </button>
   <button type="button" role="tab" id="lprofile-tab-practice" aria-selected={tab==='practice'}
    aria-controls="lprofile-section-practice" onClick={()=>selectTab('practice')}>
    <ClipboardCheck size={19}/> My Practice
   </button>
  </div>
  {loading?<PremiumLoading variant="page"/>:
   error?<div className="lprofile-status" role="alert">{error}
    <button type="button" onClick={()=>setRevision(n=>n+1)}>Retry</button></div>:
   tab==='practice'?<section role="tabpanel" id="lprofile-section-practice"
    aria-labelledby="lprofile-tab-practice" className="lprofile-panel lprofile-history">
    <React.Suspense fallback={<PremiumLoading variant="compact"/>}>
     <LiveLearnerWorkspace db={db} user={user} embedded initialScreen="history"/>
    </React.Suspense>
   </section>:
   <section role="tabpanel" id="lprofile-section-overview" aria-labelledby="lprofile-tab-overview"
    className="lprofile-panel">
    <div className="lprofile-grid">
     <article className="lprofile-card">
      <div className="lprofile-card-heading"><UserRound size={20}/><h2>Account details</h2></div>
      <dl className="lprofile-details">
       <div><dt>Full name</dt><dd>{name||'Not provided'}</dd></div>
       <div><dt>Email address</dt><dd>{user?.email||'—'}</dd></div>
       <div><dt>Account status</dt><dd>{catalog.identity?.profile?.account_status==='active'?'Active':'Unavailable'}</dd></div>
      </dl>
     </article>
     <article className="lprofile-card">
      <div className="lprofile-card-heading"><CalendarClock size={20}/><h2>Subscription</h2></div>
      <div className="lprofile-plan"><span>Your current plan</span><strong>{plan}</strong></div>
      {active?<div className="lprofile-days">
        <strong>{days.days}</strong><span>total days left</span>
       </div>:<p className="lprofile-no-plan">{canBrowse
        ?'Learning is currently available without a paid subscription.'
        :'You have no active paid subscription.'}</p>}
      {active&&<div className="lprofile-dates">
       <span>Started <b>{date(subscription.starts_at)}</b></span>
       <span>Ends <b>{date(subscription.ends_at)}</b></span>
      </div>}
      <SubscriptionCountdown subscription={subscription} openAccess={canBrowse}
       onOpenPlans={undefined}/>
      <Link to="/subscription-plans" className="lprofile-link">View subscription plans <ChevronRight size={17}/></Link>
     </article>
    </div>
    <div className="lprofile-shortcuts">
     <h2>My learning</h2>
     <div>
      <Link to="/assessments?tab=history"><ClipboardCheck size={19}/> My Practice results <ChevronRight size={17}/></Link>
      <Link to="/my-learning"><BookOpen size={19}/> My Learning <ChevronRight size={17}/></Link>
      <Link to="/my-progress"><ShieldCheck size={19}/> My Progress <ChevronRight size={17}/></Link>
      <Link to="/assessments?tab=mock"><GraduationCap size={19}/> Mock Exam <ChevronRight size={17}/></Link>
     </div>
    </div>
   </section>}
 </main>;
}
