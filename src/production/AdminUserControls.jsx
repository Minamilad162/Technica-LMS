import React,{useEffect,useState} from 'react';
import {AlertCircle,CalendarClock,CheckCircle2,LockKeyhole,ShieldCheck,Unlock,Wallet} from 'lucide-react';
import {fetchAdminUserControls,setAdminUserBlocked,activateAdminUserPlan} from './adminUserControlsApi.js';
import {adminRevokePlatformSubscription} from './subscriptionApi.js';
import './adminUserControls.css';
const date=x=>x?new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
export default function AdminUserControls({db,userId,onChanged}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [note,setNote]=useState(''),[planId,setPlanId]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;setData(null);setError('');setNote('');setPlanId('');
 fetchAdminUserControls(db,userId).then(x=>{if(live){setData(x);setNote(x.blockNote||'');}})
 .catch(e=>{if(live)setError(e?.message||'Account controls unavailable.');});return()=>{live=false;};
 },[db,userId,revision]);
 const refresh=()=>{setRevision(n=>n+1);onChanged?.();};
 const blocked=data?.status==='suspended';
 const activeSubscription=data?.subscriptions?.[0]||null;
 const toggle=async()=>{
  if(!data||busy)return;
  if(!window.confirm(blocked?'Unblock this account and restore access?':'Block this account? The learner will see your note and lose protected access.'))return;
  setBusy(true);setError('');
  try{await setAdminUserBlocked(db,userId,!blocked,note);setNotice(blocked?'Account unblocked.':'Account blocked.');refresh();}
  catch(e){setError(e?.message||'Account update failed.');}finally{setBusy(false);}
 };
 const saveNote=async()=>{
  if(!data||!blocked||busy||note===data.blockNote)return;
  setBusy(true);setError('');
  try{await setAdminUserBlocked(db,userId,true,note);setNotice('Block note updated.');refresh();}
  catch(e){setError(e?.message||'Could not update block note.');}finally{setBusy(false);}
 };
 const activate=async()=>{
  if(!data||busy||blocked||!planId)return;
  const plan=data.plans.find(x=>x.id===planId);
  if(!plan||!window.confirm('Activate '+plan.name+' for '+data.email+'? This is a manual grant, not confirmation of a payment.'))return;
  setBusy(true);setError('');
  try{await activateAdminUserPlan(db,userId,planId);setNotice('Plan activated.');refresh();}
  catch(e){setError(e?.message||'Plan activation failed.');}finally{setBusy(false);}
 };
 const revoke=async id=>{
  if(busy||!window.confirm('Revoke this active subscription immediately?'))return;
  setBusy(true);setError('');
  try{await adminRevokePlatformSubscription(db,id);setNotice('Subscription revoked.');refresh();}
  catch(e){setError(e?.message||'Revocation failed.');}finally{setBusy(false);}
 };
 return <section className="auc-shell" aria-label="User account and subscription controls">
  <div className="auc-heading"><ShieldCheck size={18}/><div><strong>Account &amp; Subscription Controls</strong><small>Admin-only · all changes are audited</small></div></div>
  {error&&<p role="alert" className="auc-error"><AlertCircle size={17}/>{error}</p>}
  {notice&&<p role="status" className="auc-ok"><CheckCircle2 size={17}/>{notice}</p>}
  {!data&&!error&&<p role="status">Loading verified account information…</p>}
  {data&&<div className="auc-body">
   <div className="auc-account"><strong>{data.email||'Email unavailable'}</strong><span className={'auc-state '+(blocked?'blocked':'active')}>{blocked?'Blocked':'Active'}</span></div>
   <div className="auc-card"><h4><LockKeyhole size={17}/> Account access</h4>
    {blocked&&<div className="auc-preview"><b>Message displayed to this user</b><p>{data.blockNote||'Contact the LMS administrator for assistance.'}</p><small>Blocked {date(data.blockedAt)}</small></div>}
    <label htmlFor={'auc-note-'+userId}>Block note (optional · visible at sign-in)</label>
    <textarea id={'auc-note-'+userId} rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} placeholder="Please contact Technica LMS support about your account."/>
    {blocked&&<button type="button" className="auc-button activate" disabled={busy||note===data.blockNote} onClick={saveNote}>Save block note</button>}
    <button type="button" className={'auc-button '+(blocked?'unblock':'block')} disabled={busy} onClick={toggle}>{blocked?<><Unlock size={16}/> Unblock user</>:<><LockKeyhole size={16}/> Block user</>}</button>
   </div>
   <div className="auc-card"><h4><CalendarClock size={17}/> Platform subscription</h4>
    <div className={'auc-plan-status '+(activeSubscription?'auc-plan-status-active':'auc-plan-status-free')}>
      <div><small>CURRENT PLAN</small><strong>{activeSubscription?.planName||'Free · No subscription'}</strong>
        <span>{activeSubscription?'Active until '+date(activeSubscription.endsAt):'This user has no active platform subscription.'}</span></div>
      <span className="auc-state">{activeSubscription?'Active plan':'Free'}</span>
    </div>
    {data.subscriptions.length?data.subscriptions.map(s=><div className="auc-sub" key={s.id}>
     <span><strong>{s.planName}</strong><small>{date(s.startsAt)} – {date(s.endsAt)}</small></span>
     <button type="button" onClick={()=>revoke(s.id)} disabled={busy}>Revoke</button>
    </div>):<p className="auc-muted">No active subscription.</p>}
    <label htmlFor={'auc-plan-'+userId}>Assign / activate a plan for this user</label>
    <select id={'auc-plan-'+userId} value={planId} onChange={e=>setPlanId(e.target.value)}
     disabled={busy||blocked||data.subscriptions.length>0}><option value="">Choose a plan…</option>
     {data.plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.months} months</option>)}</select>
    <button type="button" className="auc-button activate" onClick={activate}
     disabled={busy||blocked||!planId||data.subscriptions.length>0}><Wallet size={16}/> Activate plan</button>
    <p className="auc-muted">{blocked?'Unblock this account before activation.':data.subscriptions.length?'Revoke the existing subscription before replacing it.':'Activation starts today with server-calculated expiry. This is a manual grant, not a verified payment.'}</p>
   </div>
  </div>}
 </section>;
}
