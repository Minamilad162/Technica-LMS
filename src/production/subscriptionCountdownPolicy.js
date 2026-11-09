// P36 pure date arithmetic for platform subscription countdown; no DB or auth writes.
const DAY_MS=86_400_000;
const validTime=value=>value&&Number.isFinite(Date.parse(value))?Date.parse(value):NaN;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));

// Only signed, approved server-owned P21 subscription dates drive this visual.
// It cannot activate, extend or revoke a subscription.
export function subscriptionTimeLeft(row,at=Date.now()){
 if(!row)return {state:'none',days:0,remainingPercent:0};
 const start=validTime(row.starts_at),end=validTime(row.ends_at);
 if(row.status!=='active'||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(at))
  return {state:'none',days:0,remainingPercent:0};
 if(at<start)return {state:'upcoming',days:Math.ceil((start-at)/DAY_MS),remainingPercent:100};
 if(at>=end)return {state:'expired',days:0,remainingPercent:0};
 const remainingPercent=clamp((end-at)/(end-start)*100,0,100);
 return {state:'active',days:Math.ceil((end-at)/DAY_MS),remainingPercent};
}
export const formatEnd=value=>Number.isFinite(validTime(value))
 ?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';


/** Display label only. Use verified P21 row snapshots, never a local purchase flag. */
export function subscriptionPlanLabel(row){
 if(!row||row.status!=='active')return '';
 const name=typeof row.plan_name_snapshot==='string'?row.plan_name_snapshot.trim():'';
 if(name)return name.slice(0,120);
 const months=Number(row.duration_months_snapshot);
 return Number.isSafeInteger(months)&&months>0&&months<=36
  ?months+'-Month Plan':'Subscription plan';
}
