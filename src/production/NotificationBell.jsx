import React,{useEffect,useState} from 'react';
import {Bell,CheckCircle2,ExternalLink} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchNotifications,notificationLabel,notificationSummary} from './notificationsApi.js';
import './notifications.css';
export default function NotificationBell({account,onOpen}){
 const [open,setOpen]=useState(false),[feed,setFeed]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  if(!account?.id){setFeed(null);setOpen(false);return;}
  let alive=true;
  const refresh=async()=>{if(!alive||document.visibilityState==='hidden')return;
   try{const db=getSupabaseClient({secureReviewEntry:true});const next=await fetchNotifications(db,6);
    if(alive){setFeed(next);setError('');}
   }catch(e){if(alive)setError('Notifications temporarily unavailable.');}
  };
  void refresh();const timer=window.setInterval(refresh,30000);
  window.addEventListener('focus',refresh);
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[account?.id]);
 const count=feed?.unreadCount||0;
 return <div className="n54-bell-wrap">
  <button type="button" className="icon-btn notification-button" aria-label={count?count+' unread notifications':'Notifications'}
   aria-expanded={open} onClick={()=>setOpen(x=>!x)}><Bell size={20}/>
   {count>0&&<span className="n54-bell-count" aria-label={count+' unread'}>{count>99?'99+':count}</span>}
  </button>
  {open&&<div className="n54-popover" role="region" aria-label="Recent notifications">
   <div className="n54-popover-head"><strong>Notifications</strong><small>{count} unread</small></div>
   {error&&<p role="alert" className="n54-error">{error}</p>}
   {!feed&&!error&&<p className="n54-empty">Loading notifications…</p>}
   {feed&&!feed.items.length&&<p className="n54-empty">No account notifications yet.</p>}
   {feed?.items.map(x=><button type="button" key={x.id} className={'n54-popover-item '+(x.read?'':'unread')}
    onClick={()=>{setOpen(false);onOpen?.();}}>
    <small>{notificationLabel(x)}</small><span>{notificationSummary(x)}</span>
   </button>)}
   <button type="button" className="n54-view-all" onClick={()=>{setOpen(false);onOpen?.();}}>
    View all notifications <ExternalLink size={15}/>
   </button>
  </div>}
 </div>;
}
