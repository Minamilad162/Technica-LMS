import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookOpenCheck,CalendarDays,Check,CheckCircle2,
 ClipboardCheck,Clock3,Crown,GraduationCap,Headphones,Layers3,LockKeyhole,
 Play,Rocket,ShieldCheck,Sparkles,Star,Target,TrendingUp,Trophy,Zap} from 'lucide-react';
import {displayPlanPrice,listMySubscriptionRequests,listSubscriptionPlans,
 requestPlatformPlan} from './subscriptionApi.js';
import {baselineSubscriptionPlan,featuredSubscriptionPlanId,
 subscriptionPlanCallout,subscriptionPlanSavings,subscriptionTerm} from './subscriptionPlanPresentation.js';
import './subscriptionPlans.css';

const when=s=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleDateString('en-GB'):'—';
const planFeatures=[
 {label:'Access to all published courses',icon:CheckCircle2},
 {label:'Video lessons & study materials',icon:CheckCircle2},
 {label:'Practice modes & question banks',icon:CheckCircle2},
 {label:'Assessments & mock exams',icon:CheckCircle2},
 {label:'Track your learning progress',icon:CheckCircle2}
];
const platformFeatures=[
 {title:'Full Platform Access',description:'One membership across every published course.',icon:Layers3},
 {title:'Progress Tracking',description:'See the progress you make as you learn.',icon:TrendingUp},
 {title:'Practice Modes',description:'Build confidence with focused practice.',icon:Target},
 {title:'Mock Assessments',description:'Prepare with secure exam-style sessions.',icon:Trophy},
 {title:'Protected Learning',description:'Protected media and verified course access.',icon:ShieldCheck}
];

function LearningIllustration(){
 return <div className="sp-illustration" aria-hidden="true">
  <span className="sp-visual-orbit sp-visual-orbit-one"/><span className="sp-visual-orbit sp-visual-orbit-two"/>
  <span className="sp-visual-spark sp-spark-one"/><span className="sp-visual-spark sp-spark-two"/>
  <div className="sp-art-play"><Play size={21} fill="currentColor"/></div>
  <div className="sp-art-books"><span/><span/><span/><BookOpen size={32}/></div>
  <div className="sp-art-laptop">
   <div className="sp-laptop-screen"><img src="/images/technica-logo.webp" alt=""/><b>TECHNICA CONSULT</b><small>LMS · LEARN & ACHIEVE</small></div>
   <div className="sp-laptop-base"/>
  </div>
  <div className="sp-art-cap"><GraduationCap size={62} strokeWidth={1.9}/></div>
  <div className="sp-art-check"><ClipboardCheck size={26}/><Check size={19}/><Check size={19}/></div>
  <div className="sp-art-award"><Star size={24} fill="currentColor"/></div>
 </div>;
}
function PlanCalendar({featured=false,long=false}){
 return <div className={'sp-plan-illustration'+(featured?' sp-plan-illustration-featured':'')+(long?' sp-plan-illustration-long':'')} aria-hidden="true">
  <span className="sp-calendar-halo"/><CalendarDays size={62} strokeWidth={1.55}/>
  {featured&&<Crown className="sp-calendar-extra" size={25} fill="currentColor"/>}
  {long&&<Clock3 className="sp-calendar-extra" size={28}/>}
 </div>;
}

export default function SubscriptionPlans({db,user,subscription,subscriptionError='',onBack,onRefresh,onMyLearning}){
 const [plans,setPlans]=useState([]),[requests,setRequests]=useState([]),
  [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),
  [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reload,setReload]=useState(0),[focusedPlanId,setFocusedPlanId]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');
  Promise.all([listSubscriptionPlans(db),listMySubscriptionRequests(db,user.id)])
   .then(([a,b])=>{if(active){setPlans(a);setRequests(b);}})
   .catch(e=>{if(active)setError(e?.message||'Subscription plans are unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,user.id,reload]);
 const featuredId=useMemo(()=>featuredSubscriptionPlanId(plans),[plans]);
 const baseline=useMemo(()=>baselineSubscriptionPlan(plans),[plans]);
 useEffect(()=>{setFocusedPlanId(previous=>plans.some(p=>p.id===previous)?previous:featuredId);},[plans,featuredId]);
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
 const focusPlan=id=>{if(!busy)setFocusedPlanId(id);};
 return <section className="sp-page" aria-label="Platform subscription plans">
  <header className="sp-hero">
   <div className="sp-hero-copy"><span className="sp-eyebrow"><Sparkles size={15}/> PREMIUM TECHNICA MEMBERSHIP</span>
    <h1>Choose Your <em>Learning Plan</em></h1>
    <p>One subscription unlocks the full learning platform — courses, quizzes,
     practice and assessments to help you reach your goals.</p>
    <div className="sp-hero-points">
     <span><Crown size={16}/> Full Platform Access</span>
     <span><Zap size={16}/> Learn & Practice</span>
     <span><TrendingUp size={16}/> Track Your Progress</span>
    </div>
   </div>
   <LearningIllustration/>
  </header>

  {subscription&&<div className="sp-active" role="status">
   <div className="sp-status-icon"><CheckCircle2 size={23}/></div>
   <div><strong>Your platform subscription is active</strong>
    <p>{subscription.plan_name_snapshot} · Valid until {when(subscription.ends_at)}.
     All published learning features are unlocked on your account.</p></div>
   {onMyLearning&&<button type="button" onClick={onMyLearning}>My Learning <ArrowRight size={16}/></button>}
  </div>}
  {pending&&!subscription&&<div className="sp-pending" role="status">
   <div className="sp-status-icon"><Clock3 size={23}/></div>
   <div><strong>Subscription request pending</strong>
    <p>Your chosen plan is awaiting Admin approval. You have not been charged;
     protected lessons remain locked until your subscription is activated.</p></div>
  </div>}

  <div className="sp-plan-heading">
   <div className="sp-plan-heading-copy">
    <span className="sp-eyebrow"><Star size={14}/> YOUR LEARNING, YOUR PACE</span>
    <h2>Choose a subscription duration</h2>
    <p>Every plan includes the full published Technica LMS experience.</p>
   </div>
   {!loading&&plans.length>0&&<div className="sp-duration-selector" role="group" aria-label="Highlight a subscription duration">
    {plans.map(plan=><button type="button" key={plan.id}
     className={focusedPlanId===plan.id?'sp-duration-active':''}
     aria-pressed={focusedPlanId===plan.id}
     onClick={()=>focusPlan(plan.id)} disabled={!!busy}>
     <CalendarDays size={17}/>{subscriptionTerm(plan.duration_months)}
    </button>)}
   </div>}
  </div>

  {error&&<p className="sp-alert" role="alert">{error}</p>}
  {subscriptionError&&<p className="sp-alert" role="note">{subscriptionError}</p>}
  {notice&&<p className="sp-notice" role="status"><CheckCircle2 size={18}/>{notice}</p>}

  {loading?<div className="sp-loading" role="status"><span className="sp-loader"/><strong>Loading membership options…</strong><small>Checking current published plans and prices</small></div>:
   <div className="sp-grid" data-plan-count={plans.length}>{plans.map((plan,i)=>{
    const configured=plan.price_amount!==null&&plan.price_amount!==undefined&&!!plan.currency;
    const featured=plan.id===featuredId;
    const selected=focusedPlanId===plan.id;
    const savings=subscriptionPlanSavings(plan,baseline);
    const term=subscriptionTerm(plan.duration_months);
    const long=Number(plan.duration_months)>6;
    const current=subscription?.plan_id===plan.id;
    return <article id={'subscription-plan-'+plan.id} key={plan.id}
      className={'sp-card'+(featured?' sp-featured':'')+(selected?' sp-selected':'')}
      aria-label={plan.name+', '+term}>
     {featured&&<div className="sp-recommended"><Star size={15} fill="currentColor"/> RECOMMENDED</div>}
     <div className="sp-card-heading">
      <div><div className="sp-card-term"><CalendarDays size={20}/><h3>{term}</h3></div>
       <p className="sp-term-subtitle">Full learning access for {term}</p></div>
      <PlanCalendar featured={featured} long={long}/>
     </div>
     <div className="sp-card-pricing">
      <div className="sp-price">{displayPlanPrice(plan)}</div>
      {configured&&<span className="sp-period">/ {term}</span>}
      {savings!==null&&<span className="sp-savings"><Zap size={13}/> Save {savings}%</span>}
     </div>
     <div className="sp-card-callout">
      {featured?<Crown size={18}/>:long?<Rocket size={18}/>:<Zap size={18}/>}
      <span>{subscriptionPlanCallout(plan,featured)}</span>
     </div>
     {plan.description&&<p className="sp-plan-description">{plan.description}</p>}
     <div className="sp-benefits">
      {planFeatures.map(({label,icon:Icon})=><span key={label}><Icon size={17}/>{label}</span>)}
     </div>
     {selected&&<div className="sp-focused-label"><CheckCircle2 size={13}/> Highlighted plan</div>}
     <button className="sp-subscribe" type="button"
      disabled={!!subscription||!!pending||!configured||!!busy}
      onClick={()=>choose(plan)}>
      {subscription?(current?'Your active plan':'Already subscribed'):
       pending?'Awaiting Admin':!configured?'Price not configured':
       busy===plan.id?'Submitting…':'Request '+term+' access'}
      <ArrowRight size={18}/>
     </button>
    </article>;
   })}
   {!plans.length&&<div className="sp-empty"><CalendarDays size={27}/>
    <strong>Subscription plans are being prepared</strong>
    <p>No plans are available yet. An Admin can publish them in Admin Tools.</p>
   </div>}
   </div>}

  <section className="sp-feature-bar" aria-label="Included with every published plan">
   {platformFeatures.map(({title,description,icon:Icon})=><div className="sp-feature" key={title}>
    <span className="sp-feature-icon"><Icon size={25}/></span>
    <div><h3>{title}</h3><p>{description}</p></div>
   </div>)}
  </section>

  <div className="sp-trust-row" aria-label="Subscription request information">
   <div><span><LockKeyhole size={21}/></span><div><strong>No card payment at this step</strong>
    <p>Request a published plan without entering card details.</p></div></div>
   <div><span><Zap size={24}/></span><div><strong>Admin-reviewed activation</strong>
    <p>Membership starts only after your request is approved.</p></div></div>
   <div><span><Headphones size={22}/></span><div><strong>Need help?</strong>
    <p>Contact your Technica LMS administrator for assistance.</p></div></div>
  </div>
  <div className="sp-policy"><ShieldCheck size={19}/><div>
   <strong>Transparent membership activation</strong>
   <p>Online payment is not connected yet. Choosing a plan sends an Admin-reviewed request
    — no payment is collected and no protected access is unlocked until a verified active
    subscription is granted by the server.</p>
  </div></div>
  {onBack&&<button type="button" className="sp-back" onClick={onBack}>
   <ArrowLeft size={16}/> Back to Courses</button>}
 </section>;
}
