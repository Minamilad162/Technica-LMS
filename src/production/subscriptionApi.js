// P21 platform subscription: server-owned dates and grants only.
// No browser flag, checkout reference or unverified payment creates access.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validP21Id=x=>typeof x==='string'&&uuid.test(x);
const now=()=>Date.now();
export function isActivePlatformSubscription(row,at=now()){
 return !!row&&row.status==='active'&&
  Number.isFinite(Date.parse(row.starts_at))&&Date.parse(row.starts_at)<=at&&
  Number.isFinite(Date.parse(row.ends_at))&&Date.parse(row.ends_at)>at;
}
export function currentPlatformSubscription(rows=[],at=now()){
 return (rows||[]).filter(r=>isActivePlatformSubscription(r,at))
  .sort((a,b)=>Date.parse(b.ends_at)-Date.parse(a.ends_at))[0]||null;
}
export const hasPlatformAccess=x=>Boolean(x?.id&&isActivePlatformSubscription(x));
export function hasGlobalOrCourseAccess(entitlements=[],courseId,subscription=null){
 return hasPlatformAccess(subscription)||!!courseId&&(entitlements||[]).some(e=>
  e.course_id===courseId&&e.status==='active'&&['paid','manual'].includes(e.entitlement_type)
  &&Date.parse(e.starts_at)<=Date.now()&&
  (!e.ends_at||Date.parse(e.ends_at)>Date.now()));
}
const requireResult=(response,label)=>{
 if(response.error)throw Error(label+' unavailable: '+(response.error.message||'Supabase error'));
 return response.data;
};
export async function fetchMyPlatformSubscription(db,userId){
 if(!validP21Id(userId))throw Error('Verified learner ID required.');
 const r=await db.from('lms_platform_subscriptions')
  .select('id,user_id,plan_id,plan_name_snapshot,duration_months_snapshot,starts_at,ends_at,status,source')
  .eq('user_id',userId).order('ends_at',{ascending:false}).limit(30);
 return currentPlatformSubscription(requireResult(r,'Platform subscription')||[]);
}
export async function listSubscriptionPlans(db){
 const r=await db.from('lms_subscription_plans')
  .select('id,code,name,description,duration_months,price_amount,currency,is_published,display_order')
  .eq('is_published',true).order('display_order',{ascending:true})
  .order('duration_months',{ascending:true});
 return requireResult(r,'Subscription plans')||[];
}
export async function listMySubscriptionRequests(db,userId){
 if(!validP21Id(userId))throw Error('Verified learner ID required.');
 const r=await db.from('lms_subscription_requests')
  .select('id,plan_id,status,requested_at,decided_at')
  .eq('user_id',userId).order('requested_at',{ascending:false}).limit(20);
 return requireResult(r,'Subscription requests')||[];
}
export async function requestPlatformPlan(db,planId){
 if(!validP21Id(planId))throw Error('Select a valid plan.');
 const r=await db.rpc('lms_p21_request_plan',{p_plan_id:planId});
 const data=requireResult(r,'Subscription request');
 if(!validP21Id(data))throw Error('Subscription request was not confirmed.');
 return data;
}
export async function adminSaveSubscriptionPlan(db,model){
 const months=Number(model.duration_months);
 const name=String(model.name||'').trim();
 const price=model.price_amount===''||model.price_amount===null?null:Number(model.price_amount);
 const currency=price===null?null:String(model.currency||'').trim().toUpperCase();
 if(name.length<2||name.length>120||!Number.isInteger(months)||months<1||months>36
  ||(price!==null&&(!Number.isFinite(price)||price<0||!currency||!/^[A-Z]{3}$/.test(currency))))
  throw Error('Enter a valid plan name, 1–36 months, and a non-negative price with three-letter currency.');
 const args={
  p_plan_id:validP21Id(model.id)?model.id:null,
  p_name:name,p_duration_months:months,p_price_amount:price,p_currency:currency,
  p_description:String(model.description||'').trim(),p_is_published:model.is_published===true
 };
 const r=await db.rpc('lms_p21_save_plan',args);
 const data=requireResult(r,'Save subscription plan');
 if(!validP21Id(data))throw Error('Subscription plan was not saved.');
 return data;
}
export async function adminDecideSubscriptionRequest(db,requestId,approve){
 if(!validP21Id(requestId)||typeof approve!=='boolean')throw Error('Valid request decision required.');
 const r=await db.rpc('lms_p21_admin_decide_request',{
  p_request_id:requestId,p_approve:approve
 });
 return requireResult(r,'Admin decision');
}
export async function adminRevokePlatformSubscription(db,subscriptionId){
 if(!validP21Id(subscriptionId))throw Error('Valid subscription required.');
 const r=await db.rpc('lms_p21_admin_revoke',{p_subscription_id:subscriptionId});
 if(requireResult(r,'Revoke subscription')!==true)throw Error('Revocation was not confirmed.');
 return true;
}
export async function fetchAdminSubscriptionOverview(db){
 const [plans,requests,subscriptions]=await Promise.all([
  db.from('lms_subscription_plans').select('*').order('display_order',{ascending:true}),
  db.from('lms_subscription_requests').select('id,user_id,plan_id,plan_name_snapshot,duration_months_snapshot,price_amount_snapshot,currency_snapshot,status,requested_at,decided_at')
   .order('requested_at',{ascending:false}).limit(100),
  db.from('lms_platform_subscriptions')
   .select('id,user_id,plan_id,plan_name_snapshot,duration_months_snapshot,starts_at,ends_at,status,source')
   .order('granted_at',{ascending:false}).limit(100)
 ]);
 return {plans:requireResult(plans,'Admin plans')||[],
  requests:requireResult(requests,'Admin subscription requests')||[],
  subscriptions:requireResult(subscriptions,'Admin subscriptions')||[]};
}
export function displayPlanPrice(plan){
 if(plan.price_amount===null||plan.price_amount===undefined||!plan.currency)return 'Price to be set';
 const value=Number(plan.price_amount);
 if(!Number.isFinite(value))return 'Price unavailable';
 return new Intl.NumberFormat('en',{style:'currency',currency:plan.currency,
  maximumFractionDigits:2}).format(value);
}
