import React,{useEffect,useState} from 'react';
import {AlertTriangle,CalendarDays,CheckCircle2,Clock3,Plus,RefreshCw,
 ShieldCheck,Wallet,XCircle} from 'lucide-react';
import {adminDecideSubscriptionRequest,adminRevokePlatformSubscription,
 adminSaveSubscriptionPlan,displayPlanPrice,fetchAdminSubscriptionOverview} from './subscriptionApi.js';
import {fetchLearningAccessMode,setLearningOpenAccess} from './accessModeApi.js';
import './adminSubscriptions.css';
const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('en-GB'):'—';
const planModel=p=>({
 id:p?.id||null,name:p?.name||'',duration_months:p?.duration_months||3,
 price_amount:p?.price_amount===null||p?.price_amount===undefined?'':String(p.price_amount),
 currency:p?.currency||'',description:p?.description||'',is_published:p?.is_published??true
});
export default function AdminSubscriptionsPanel({db}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),
  [revision,setRevision]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[busy,setBusy]=useState('');
 const [profiles,setProfiles]=useState({});
 const [accessMode,setAccessMode]=useState({installed:false,openAccess:false,loading:true});
 const [modeBusy,setModeBusy]=useState(false);
 useEffect(()=>{let alive=true;
  setAccessMode(x=>({...x,loading:true}));
  fetchLearningAccessMode(db).then(x=>{if(alive)setAccessMode({...x,loading:false});})
   .catch(e=>{if(alive){setAccessMode({installed:false,openAccess:false,loading:false});setError(e?.message||'Learning access policy unavailable.');}});
  return()=>{alive=false;};
 },[db,revision]);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
  Promise.all([fetchAdminSubscriptionOverview(db),
   db.from('lms_profiles').select('id,full_name').limit(500)])
   .then(([next,profileResult])=>{
    if(!alive)return;
    setData(next);
    const names={};
    for(const p of profileResult.data||[])names[p.id]=p.full_name?.trim()||p.id.slice(0,8);
    setProfiles(names);
   }).catch(e=>{if(alive)setError(e?.message||'Subscriptions unavailable until P21 migration is applied.');})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[db,revision]);
 const refresh=()=>setRevision(x=>x+1);
 const save=async e=>{
  e.preventDefault();if(saving)return;
  setSaving(true);setError('');setNotice('');
  try{await adminSaveSubscriptionPlan(db,editing);
   setEditing(null);setNotice('Subscription plan updated in Supabase.');refresh();}
  catch(e){setError(e?.message||'Could not save the plan.');}
  finally{setSaving(false);}
 };
 const decide=async(r,approve)=>{
  if(busy)return;
  const question=approve?
   'Manually activate this platform subscription? This action grants ALL published courses, Practice and Mock access without a verified online payment. Confirm offline payment/complimentary authorization first.':
   'Reject this membership request?';
  if(typeof window!=='undefined'&&!window.confirm(question))return;
  setBusy(r.id);setError('');setNotice('');
  try{await adminDecideSubscriptionRequest(db,r.id,approve);
   setNotice(approve?'Manual platform access activated with server-controlled expiry.':'Request rejected.');
   refresh();}
  catch(e){setError(e?.message||'Request decision failed.');}
  finally{setBusy('');}
 };
 const revoke=async s=>{
  if(busy)return;
  if(typeof window!=='undefined'&&!window.confirm('Revoke all platform access for this subscription immediately?'))return;
  setBusy(s.id);setError('');setNotice('');
  try{await adminRevokePlatformSubscription(db,s.id);
   setNotice('Subscription revoked. Server access checks will deny future protected requests.');
   refresh();}
  catch(e){setError(e?.message||'Revocation failed.');}
  finally{setBusy('');}
 };
 const setMode=async next=>{
  if(modeBusy||!accessMode.installed||accessMode.openAccess===next)return;
  const message=next
   ?'Open all PUBLISHED learning courses, quizzes, approved Practice and ready Mock to every ACTIVE signed-in learner? Drafts and Admin roles remain protected.'
   :'Enable the subscription requirement again for users without a verified paid/manual grant? Some learners may immediately lose access.';
  if(!window.confirm(message))return;
  setModeBusy(true);setError('');setNotice('');
  try{await setLearningOpenAccess(db,next);
   setNotice(next?'Learning access opened for published courses.':'Subscription access requirements restored.');
   refresh();
  }catch(e){setError(e?.message||'Access mode change failed.');}
  finally{setModeBusy(false);}
 };
 const requests=data?.requests?.filter(x=>x.status==='pending')||[];
 const members=data?.subscriptions?.filter(s=>s.status==='active'&&Date.parse(s.ends_at)>Date.now())||[];
 return <div className="asub-shell at-animate" aria-label="Subscription plan management">
  <header className="at-section-title"><div><span className="at-eyebrow">MEMBERSHIP & ACCESS CONTROL</span>
   <h2>Subscription Plans</h2>
   <p>Manage membership plans and the platform access policy.</p></div>
   <button className="at-outline" type="button" onClick={refresh}><RefreshCw size={15}/> Refresh</button></header>
  <div className="asub-access-mode" aria-label="Platform access mode">
   <div><ShieldCheck size={20}/><span><strong>Learning access</strong>
    <small>{accessMode.loading?'Checking access policy…':!accessMode.installed?'Access policy setup required':
      accessMode.openAccess?'Open to active learners — published content only':'Subscription rules active'}</small></span></div>
   <button type="button" className="at-primary" disabled={modeBusy||accessMode.loading||!accessMode.installed}
    onClick={()=>void setMode(!accessMode.openAccess)}>
    {modeBusy?'Updating…':accessMode.openAccess?'Enable subscription rules':'Open learning access'}
   </button>
  </div>
  <div className="asub-disclaimer"><ShieldCheck size={17}/> Plan prices and durations are editable.
   Existing active subscriptions keep their original term and price snapshots.
   Payment processing is not connected; approval below is explicitly a MANUAL grant.</div>
  {error&&<p className="at-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
  {notice&&<p className="asub-notice" role="status"><CheckCircle2 size={16}/>{notice}</p>}
  {loading?<div className="at-empty">Loading verified subscription records…</div>:
   data&&<>
    <div className="asub-metrics"><div><span><CalendarDays size={18}/></span><small>Configured Plans</small><strong>{data.plans.length}</strong></div>
     <div><span><Clock3 size={18}/></span><small>Pending Requests</small><strong>{requests.length}</strong></div>
     <div><span><ShieldCheck size={18}/></span><small>Active Members</small><strong>{members.length}</strong></div></div>
    <div className="asub-title"><div><h3>Plans & Pricing</h3><p>Edit name, months, price, currency and visibility — no code changes required.</p></div>
     <button type="button" className="at-primary" onClick={()=>setEditing(planModel(null))}><Plus size={16}/> New Plan</button></div>
    <div className="asub-plan-grid">{data.plans.map(p=><article key={p.id} className="asub-plan">
     <div><span className="asub-plan-months">{p.duration_months} months</span>
      <span className={p.is_published?'asub-plan-live':'asub-plan-draft'}>{p.is_published?'Published':'Hidden'}</span></div>
     <h4>{p.name}</h4><p>{p.description||'Full learning access'}</p>
     <strong>{displayPlanPrice(p)}</strong>
     <button type="button" className="at-outline" onClick={()=>setEditing(planModel(p))}>Edit plan</button>
    </article>)}</div>
    <section className="asub-table-section"><div className="asub-title"><div><h3>Pending Subscription Requests</h3>
     <p>Students cannot activate paid membership themselves. Confirm offline payment or authorized complimentary access.</p></div></div>
     <div className="asub-table-wrap"><table className="asub-table"><thead><tr>
      <th>Learner</th><th>Plan</th><th>Requested</th><th>Status</th><th>Decision</th></tr></thead>
      <tbody>{requests.map(r=><tr key={r.id}>
       <td>{profiles[r.user_id]||r.user_id.slice(0,8)}</td>
       <td>{r.plan_name_snapshot}<small className="asub-request-terms">{r.duration_months_snapshot} months · {displayPlanPrice({price_amount:r.price_amount_snapshot,currency:r.currency_snapshot})}</small></td>
       <td>{date(r.requested_at)}</td><td><span className="asub-wait">Pending</span></td>
       <td className="asub-row-actions"><button type="button" disabled={!!busy} onClick={()=>decide(r,true)}
        className="asub-approve"><CheckCircle2 size={14}/> Activate manually</button>
        <button type="button" disabled={!!busy} onClick={()=>decide(r,false)}
        className="asub-reject"><XCircle size={14}/> Reject</button></td></tr>)}
      {!requests.length&&<tr><td colSpan={5}>No pending requests.</td></tr>}</tbody></table></div>
    </section>
    <section className="asub-table-section"><div className="asub-title"><div><h3>Active Platform Memberships</h3>
     <p>Verified server-owned expiry. Revoking a membership stops new protected access.</p></div></div>
     <div className="asub-table-wrap"><table className="asub-table"><thead><tr>
      <th>Learner</th><th>Plan snapshot</th><th>Start</th><th>End</th><th>Source</th><th>Action</th></tr></thead>
      <tbody>{members.map(s=><tr key={s.id}>
       <td>{profiles[s.user_id]||s.user_id.slice(0,8)}</td><td>{s.plan_name_snapshot}</td>
       <td>{date(s.starts_at)}</td><td>{date(s.ends_at)}</td>
       <td>{s.source==='admin_manual'?'Manual grant':'Verified payment'}</td>
       <td><button type="button" className="asub-reject" disabled={!!busy} onClick={()=>revoke(s)}>Revoke</button></td></tr>)}
      {!members.length&&<tr><td colSpan={6}>No active platform memberships.</td></tr>}</tbody></table></div>
    </section>
   </>}
  {editing&&<div className="asub-modal-shade" role="presentation">
   <form className="asub-editor" role="dialog" aria-modal="true" aria-label="Edit subscription plan" onSubmit={save}>
    <header><h3>{editing.id?'Edit Subscription Plan':'Create Subscription Plan'}</h3>
     <button type="button" disabled={saving} onClick={()=>setEditing(null)}>×</button></header>
    <label>Plan name<input required minLength={2} maxLength={120} value={editing.name}
     onChange={e=>setEditing(v=>({...v,name:e.target.value}))}/></label>
    <div className="asub-form-cols"><label>Duration (months)<input required type="number" min={1} max={36} step={1}
     value={editing.duration_months} onChange={e=>setEditing(v=>({...v,duration_months:e.target.value}))}/></label>
     <label>Price amount<input type="number" min={0} step="0.01" placeholder="Set amount"
      value={editing.price_amount} onChange={e=>setEditing(v=>({...v,price_amount:e.target.value}))}/></label></div>
    <label>Currency (3-letter code)<input placeholder="e.g. EGP, USD" maxLength={3}
     disabled={editing.price_amount===''} value={editing.currency}
     onChange={e=>setEditing(v=>({...v,currency:e.target.value.toUpperCase()}))}/></label>
    <label>Short description<textarea rows={3} maxLength={500} value={editing.description}
     onChange={e=>setEditing(v=>({...v,description:e.target.value}))}/></label>
    <label className="asub-check"><input type="checkbox" checked={editing.is_published}
     onChange={e=>setEditing(v=>({...v,is_published:e.target.checked}))}/>
     Visible in learner Subscription Plans</label>
    <div className="asub-modal-actions"><button type="button" className="at-outline" onClick={()=>setEditing(null)}>Cancel</button>
     <button type="submit" className="at-primary" disabled={saving}>{saving?'Saving…':'Save Plan'}</button></div>
   </form>
  </div>}
 </div>;
}
