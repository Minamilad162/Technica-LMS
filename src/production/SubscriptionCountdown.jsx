import React,{useEffect,useState} from 'react';
import {CalendarClock} from 'lucide-react';
import {subscriptionTimeLeft,formatEnd,subscriptionPlanLabel} from './subscriptionCountdownPolicy.js';
import './subscriptionCountdown.css';

export default function SubscriptionCountdown({subscription,openAccess=false,loading=false,error='',onOpenPlans,compact=false}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  const interval=window.setInterval(tick,60_000);
  const visibility=()=>{if(document.visibilityState==='visible')tick();};
  window.addEventListener('focus',tick);
  document.addEventListener('visibilitychange',visibility);
  return()=>{window.clearInterval(interval);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const info=subscriptionTimeLeft(subscription,now);
 // Even if a prop looks valid, server-owned active status is the only access source.
 const active=info.state==='active'&&Boolean(subscription?.id);
 const status=loading?'loading':active?'active':error?'error':openAccess?'open':info.state==='expired'?'expired':info.state==='upcoming'?'upcoming':'none';
 const days=active?info.days:0;
 const plan=active?subscriptionPlanLabel(subscription):'';
 const label=status==='open'?'Learning access':status==='active'?days===1?'1 day left':days+' days left':
  status==='upcoming'?'Starts in '+info.days+' days':
  status==='expired'?'Plan expired':status==='loading'?'Checking plan…':
  status==='error'?'Plan unavailable':'No active plan';
 const end=active?formatEnd(subscription.ends_at):'';
 const hint=status==='open'?'Published learning content is currently available':active?plan+' · '+label+' · ends '+end:status==='error'?error:label;
 const labelId=active?plan+': '+label+', ends '+end:label;
 const content=<>
  <div className="sc-text"><CalendarClock size={16} aria-hidden="true"/><span className="sc-copy"><strong>{label}</strong>{(active||status==='open'||!compact)&&<small>{active?plan||'Until '+end:status==='open'?'Open access':'Subscription'}</small>}</span></div>
  {status!=='open'&&<span className="sc-track" role="progressbar" aria-label="Subscription time remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={active?Math.round(info.remainingPercent):0}
   aria-valuetext={status==='open'?'Published learning available':active?label:'No active remaining subscription'}>
   <i style={{width:(active?info.remainingPercent:0)+'%'}}/>
  </span>}
 </>;
 const cls='sc-countdown sc-'+status+(compact?' sc-compact':'');
 return onOpenPlans
  ?<button type="button" className={cls} data-feature="subscription-countdown" data-subscription-status={status} aria-label={labelId+'. Open subscription plans'} title={hint} onClick={onOpenPlans}>{content}</button>
  :<div className={cls} data-feature="subscription-countdown" data-subscription-status={status} aria-label={labelId} title={hint}>{content}</div>;
}
