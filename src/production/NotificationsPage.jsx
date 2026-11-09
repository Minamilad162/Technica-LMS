import React,{useEffect,useMemo,useState} from 'react';
import {Bell,CheckCheck,CalendarDays,Clock3,LockKeyhole,RefreshCw,ShieldCheck,Wallet} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchNotifications,markNotificationsRead,notificationLabel,notificationSummary} from './notificationsApi.js';
import './notifications.css';
const fmt=x=>x&&Number.isFinite(Date.parse(x))?new Date(x).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
export default function NotificationsPage(){
 const [feed,setFeed]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [tab,setTab]=useState('all'),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError('');
  let db;try{db=getSupabaseClient({secureReviewEntry:true});}
  catch{setError('A configured LMS account is required.');setLoading(false);return;}
  fetchNotifications(db,100).then(x=>{if(live)setFeed(x);})
   .catch(e=>{if(live)setError(e.message||'Unable to load notifications.');})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[revision]);
 const items=useMemo(()=>(feed?.items||[]).filter(x=>tab==='all'||(tab==='unread'?!x.read:
  tab==='subscriptions'?x.type.startsWith('subscription_'):x.type.startsWith('p52_'))),[feed,tab]);
 const mark=async events=>{
  const unread=events.filter(x=>!x.read).map(x=>x.id);if(!unread.length||busy)return;
  setBusy(true);setError('');
  try{await markNotificationsRead(getSupabaseClient({secureReviewEntry:true}),unread);
   setRevision(n=>n+1);
  }catch(e){setError(e.message||'Could not mark as read.');}finally{setBusy(false);}
 };
 return <div className="n54-page">
  <header className="n54-hero"><span className="n54-eyebrow"><Bell size={17}/> TECHNICA LMS ACTIVITY</span>
   <h1>Notifications</h1><p>Verified subscription activity, account access changes and important dates.</p>
   <div className="n54-hero-actions"><span>{feed?.unreadCount??'—'} unread</span>
    <button type="button" onClick={()=>setRevision(x=>x+1)}><RefreshCw size={16}/> Refresh</button>
    <button type="button" disabled={busy||!feed?.items.some(x=>!x.read)} onClick={()=>mark(feed.items)}>
     <CheckCheck size={16}/> Mark visible as read</button></div>
  </header>
  <nav className="n54-filters" aria-label="Filter notifications">
   {[['all','All'],['unread','Unread'],['subscriptions','Subscriptions'],['accounts','Account status']].map(([id,label])=>
    <button type="button" key={id} aria-pressed={tab===id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}
  </nav>
  {error&&<div className="n54-error" role="alert">{error}</div>}
  {loading&&<p className="n54-empty" role="status">Loading verified notifications…</p>}
  {!loading&&!items.length&&<p className="n54-empty">There are no {tab==='all'?'notifications':tab} to show.</p>}
  <div className="n54-list">{!loading&&items.map(e=>{
   const d=e.details||{},active=e.type==='subscription_activated',request=e.type==='subscription_requested';
   const blocked=e.type==='p52_user_blocked';
   return <article className={'n54-item '+(!e.read?'unread ':'')+(blocked?'blocked':'')} key={e.id}>
    <div className="n54-item-icon">{request||active?<Wallet size={20}/>:blocked?<LockKeyhole size={20}/>:<ShieldCheck size={20}/>}</div>
    <div className="n54-item-content">
     <div className="n54-item-meta"><strong>{notificationLabel(e)}</strong><time dateTime={e.createdAt}>{fmt(e.createdAt)}</time></div>
     <p className="n54-item-summary">{notificationSummary(e)}</p>
     <dl className="n54-details">
      <div><dt>Account</dt><dd>{d.email||d.name||'Your account'}</dd></div>
      {(active||request)&&<div><dt>Plan</dt><dd>{d.plan||'—'}</dd></div>}
      {active&&<><div><dt>Starts</dt><dd>{fmt(d.startsAt)}</dd></div>
       <div><dt>Ends</dt><dd>{fmt(d.endsAt)}</dd></div>
       <div><dt>Duration</dt><dd>{d.months} months</dd></div></>}
      {request&&<div><dt>Request status</dt><dd>{d.requestStatus||'Pending'} · Not a confirmed payment</dd></div>}
      {active&&<div className="n54-full"><dt>Payment status</dt><dd>Access activated · payment not verified in LMS</dd></div>}
      {typeof d.note==='string'&&<div className="n54-full"><dt>Admin note</dt><dd className="n54-note">{d.note||'No reason provided.'}</dd></div>}
     </dl>
     {!e.read&&<button type="button" disabled={busy} className="n54-mark" onClick={()=>mark([e])}>
      <CheckCheck size={14}/> Mark as read</button>}
    </div>
   </article>;
  })}</div>
  <p className="n54-footer">Dates come from server records. Subscription requests and manual activation are not proof of online payment.</p>
 </div>;
}
