import React,{useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock3,Crown,
 LockKeyhole,ShieldCheck,Sparkles,Wallet} from 'lucide-react';
import {displayPlanPrice,listMySubscriptionRequests,listSubscriptionPlans,
 requestPlatformPlan} from './subscriptionApi.js';
import './subscriptionPlans.css';

const when=s=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleDateString('en-GB'):'—';
export default function SubscriptionPlans({db,user,subscription,subscriptionError='',onBack,onRefresh,onMyLearning}){
 const [plans,setPlans]=useState([]),[requests,setRequests]=useState([]),
  [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),
  [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  Promise.all([listSubscriptionPlans(db),listMySubscriptionRequests(db,user.id)])
   .then(([a,b])=>{if(active){setPlans(a);setRequests(b);}})
   .catch(e=>{if(active)setError(e?.message||'Subscription plans are unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,user.id,reload]);
 const pending=requests.find(r=>r.status==='pending');
 const choose=async plan=>{
  if(busy||subscription||pending||plan.price_amount===null||!plan.currency)return;
  setBusy(plan.id);setError('');setNotice('');
  try{
   await requestPlatformPlan(db,plan.id);
   setNotice('Request submitted for Admin review. No payment was collected and access is not yet activated.');
   setReload(x=>x+1);onRefresh?.();
  }catch(e){setError(e?.message||'Could not request the selected plan.');}
  finally{setBusy('');}
 };
 return <section className="sp-page" aria-label="Platform subscription plans">
  <header className="sp-hero">
   <div><span className="sp-eyebrow"><Crown size={15}/> TECHNICA ALL-ACCESS MEMBERSHIP</span>
    <h2>One subscription.<br/><em>Every opportunity.</em></h2>
    <p>Access all published courses, protected lessons, Practice and Assessments
     with a single time-based Technica LMS subscription.</p>
    <div className="sp-hero-points"><span><CheckCircle2 size={15}/> All Courses</span>
     <span><CheckCircle2 size={15}/> Practice & Level Up</span>
     <span><CheckCircle2 size={15}/> Mock Assessments</span></div>
   </div>
   <div className="sp-hero-art"><ShieldCheck size={55}/><strong>ALL ACCESS</strong>
    <small>For your selected membership term</small></div>
  </header>
  {subscription&&<div className="sp-active" role="status"><CheckCircle2 size={23}/>
    <div><strong>Your platform subscription is active</strong>
     <p>{subscription.plan_name_snapshot} · Valid until {when(subscription.ends_at)}.
      All published learning features are unlocked on your account.</p></div>
    <button type="button" onClick={onMyLearning}>My Learning <ArrowRight size={16}/></button></div>}
  {pending&&!subscription&&<div className="sp-pending" role="status"><Clock3 size={22}/>
    <div><strong>Subscription request pending</strong>
     <p>Your chosen plan is awaiting Admin review. You have not been charged and
      restricted content remains locked until activation.</p></div></div>}
  <div className="sp-section-head"><div><span className="sp-eyebrow">SIMPLE, FLEXIBLE PLANS</span>
   <h2>Choose your duration</h2><p>One membership covers the entire published Technica LMS catalog.</p></div></div>
  {error&&<p className="sp-alert" role="alert">{error}</p>}
  {subscriptionError&&<p className="sp-alert" role="note">{subscriptionError}</p>}
  {notice&&<p className="sp-notice" role="status">{notice}</p>}
  {loading?<div className="sp-loading" role="status">Loading subscription plans…</div>:
   <div className="sp-grid">{plans.map((plan,i)=>{
    const configured=plan.price_amount!==null&&plan.currency!==null;
    const featured=i===1;
    return <article key={plan.id} className={'sp-card'+(featured?' sp-featured':'')}>
     {featured&&<div className="sp-recommended"><Sparkles size={14}/> POPULAR OPTION</div>}
     <div className="sp-card-top"><span className="sp-card-icon"><CalendarDays size={22}/></span>
      <span className="sp-months">{plan.duration_months} months</span></div>
     <h3>{plan.name}</h3><p>{plan.description||'Complete access to Technica LMS.'}</p>
     <div className="sp-price">{displayPlanPrice(plan)}</div>
     <div className="sp-period">One-time membership term · no per-course charges</div>
     <div className="sp-benefits"><span><CheckCircle2 size={16}/> Every published course</span>
      <span><CheckCircle2 size={16}/> Video & PDF lessons</span>
      <span><CheckCircle2 size={16}/> Practice and assessments</span></div>
     <button type="button" disabled={!!subscription||!!pending||!configured||!!busy}
      onClick={()=>choose(plan)}>
      {subscription?'Already subscribed':pending?'Awaiting Admin':!configured?'Price not configured':
       busy===plan.id?'Submitting…':'Request this plan'} <ArrowRight size={16}/></button>
    </article>;
   })}
   {!plans.length&&<div className="sp-empty">No plans are available yet. An Admin can publish them in Admin Tools.</div>}
   </div>}
  <div className="sp-policy"><LockKeyhole size={18}/><div><strong>Activation is verified, not simulated.</strong>
   <p>Online payment is not connected yet. Selecting a plan submits an Admin-reviewed request;
    it does not collect card details or unlock paid lessons. Only a verified active
    server subscription grants platform-wide access.</p></div></div>
  {onBack&&<button className="sp-back" onClick={onBack}><ArrowLeft size={16}/> Back to Courses</button>}
 </section>;
}
