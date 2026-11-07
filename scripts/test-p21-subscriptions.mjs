import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isActivePlatformSubscription,currentPlatformSubscription,hasPlatformAccess,
 hasGlobalOrCourseAccess,displayPlanPrice,adminSaveSubscriptionPlan,
 requestPlatformPlan,adminDecideSubscriptionRequest,adminRevokePlatformSubscription,
 fetchMyPlatformSubscription} from '../src/production/subscriptionApi.js';
import {isFullCourseEnrolled} from '../src/production/learnerJourneyApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const U='10000000-0000-0000-0000-000000000001';
const C='20000000-0000-0000-0000-000000000001';
const P='30000000-0000-0000-0000-000000000001';
const R='40000000-0000-0000-0000-000000000001';
const active={id:U,user_id:U,plan_id:P,status:'active',
 starts_at:'2026-11-01T00:00:00Z',ends_at:'2027-02-01T00:00:00Z'};
const future={...active,starts_at:'2027-02-01T00:00:00Z',ends_at:'2027-04-01T00:00:00Z'};
const ended={...active,ends_at:'2026-11-03T00:00:00Z'};
const revoked={...active,status:'revoked'};
const at=Date.parse('2026-11-07T00:00:00Z');
assert(isActivePlatformSubscription(active,at));
assert(!isActivePlatformSubscription(future,at));
assert(!isActivePlatformSubscription(ended,at));
assert(!isActivePlatformSubscription(revoked,at));
assert.equal(currentPlatformSubscription([ended,active],at).id,U);
assert.equal(currentPlatformSubscription([revoked],at),null);
const durable={...active,starts_at:'2020-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z'};
assert(hasPlatformAccess(durable),'Current global grant does not depend on a particular course id');
assert(!hasPlatformAccess(revoked));
assert(isFullCourseEnrolled([],C,durable));
assert(!isFullCourseEnrolled([],C,revoked));
assert(hasGlobalOrCourseAccess([],C,durable));
assert(!hasGlobalOrCourseAccess([],C,revoked));
assert(!isFullCourseEnrolled([{course_id:C,status:'active',
 entitlement_type:'trial',starts_at:'2026-01-01'}],C));
assert(displayPlanPrice({price_amount:null,currency:null}).includes('Price'));
assert(displayPlanPrice({price_amount:900,currency:'EGP'}).includes('900'));
let calls=[];
const db={rpc:async(name,args)=>{calls.push([name,args]);
 if(name==='lms_p21_save_plan')return {data:P,error:null};
 if(name==='lms_p21_request_plan')return {data:R,error:null};
 if(name==='lms_p21_admin_decide_request')return {data:U,error:null};
 if(name==='lms_p21_admin_revoke')return {data:true,error:null};
 throw Error('Unknown RPC '+name);
}};
assert.equal(await adminSaveSubscriptionPlan(db,{
 name:'Quarterly',duration_months:3,price_amount:'900',currency:'egp',
 description:'All access',is_published:true}),P);
assert.deepEqual(calls[0],[ 'lms_p21_save_plan',{
 p_plan_id:null,p_name:'Quarterly',p_duration_months:3,
 p_price_amount:900,p_currency:'EGP',p_description:'All access',p_is_published:true
}]);
assert.equal(await requestPlatformPlan(db,P),R);
assert.equal(await adminDecideSubscriptionRequest(db,R,true),U);
assert.equal(await adminRevokePlatformSubscription(db,U),true);
await assert.rejects(()=>adminSaveSubscriptionPlan(db,{
 name:'a',duration_months:3,price_amount:50,currency:'EGP',is_published:true
}),/valid plan name/);
await assert.rejects(()=>adminSaveSubscriptionPlan(db,{
 name:'Test plan',duration_months:0,price_amount:50,currency:'EGP',is_published:true
}),/valid plan name/);
const readDb={from:table=>{
 assert.equal(table,'lms_platform_subscriptions');
 return {select(){return this;},eq(){return this;},order(){return this;},limit(){return Promise.resolve({data:[active],error:null});}};
}};
assert.equal((await fetchMyPlatformSubscription(readDb,U)).id,U);
const sql=read('supabase/migrations/202611070002_p21_platform_subscriptions.sql');
for(const mark of [
 'CREATE TABLE public.lms_subscription_plans',
 'CREATE TABLE public.lms_subscription_requests',
 'CREATE TABLE public.lms_platform_subscriptions',
 'lms_p21_one_pending_request_idx',
 "VALUES('three-months','3 Months'",
 "('six-months','6 Months'",
 "('nine-months','9 Months'",
 "source text NOT NULL CHECK(source IN ('admin_manual','payment_verified'))",
 "CREATE FUNCTION public.lms_p21_has_active_subscription()",
 "CREATE FUNCTION public.lms_p21_request_plan(",
 "CREATE FUNCTION public.lms_p21_admin_decide_request(",
 "CREATE FUNCTION public.lms_p21_admin_revoke(",
 'CREATE OR REPLACE FUNCTION public.lms_p1_can_view_lesson',
 'CREATE OR REPLACE FUNCTION public.lms_p4_can_practice',
 'public.lms_p21_has_active_subscription()',
 'WHERE id=p_request_id FOR UPDATE',
 'pg_advisory_xact_lock',
 'make_interval(months=>plan.duration_months)',
 'duration_months_snapshot',
 'lms_p21_subscription_scoped_read',
 'GRANT SELECT ON public.lms_subscription_plans TO anon,authenticated',
 'GRANT SELECT ON public.lms_subscription_requests,public.lms_platform_subscriptions TO authenticated'
])assert(sql.includes(mark),'P21 SQL missing '+mark);
assert(!/GRANT (INSERT|UPDATE|DELETE|ALL) ON public\.lms_platform_subscriptions TO authenticated/.test(sql));
assert(!/GRANT (INSERT|UPDATE|DELETE|ALL) ON public\.lms_subscription_requests TO authenticated/.test(sql));
assert(!sql.includes("INSERT INTO public.lms_entitlements"));
assert(!sql.includes("UPDATE public.lms_entitlements"));
const ui=read('src/production/SubscriptionPlans.jsx');
const admin=read('src/production/AdminSubscriptionsPanel.jsx');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const bridge=read('src/production/LiveLearnerPortal.jsx');
const app=read('src/App.jsx');
const nav=read('src/components/Layout.jsx');
const tools=read('src/production/AdminToolsWorkspace.jsx');
const cards=read('src/production/LearnerCourseCard.jsx');
const learning=read('src/production/PremiumMyLearning.jsx');
assert(ui.includes('ONE-TIME')||ui.includes('One-time membership term'));
assert(ui.includes('Request this plan')&&ui.includes('requestPlatformPlan(db,plan.id)'));
assert(ui.includes('No payment was collected')&&ui.includes('Admin-reviewed request'));
assert(ui.includes('My Learning'));
assert(admin.includes('adminSaveSubscriptionPlan(db,editing)'));
assert(admin.includes('adminDecideSubscriptionRequest(db,r.id,approve)'));
assert(admin.includes('adminRevokePlatformSubscription(db,s.id)'));
assert(admin.includes('Manually activate')&&admin.includes('Confirm offline payment'));
assert(tools.includes("id:'subscriptions'")&&tools.includes('AdminSubscriptionsPanel'));
assert(workspace.includes("screen==='subscription'||screen==='checkout'?<SubscriptionPlans"));
assert(workspace.includes('isFullCourseEnrolled(catalog?.entitlements,chosen.id,catalog?.subscription)'));
assert(workspace.includes('full||l.isFreeIntro?<SecureLessonContent'));
assert(workspace.includes("LOCKED · SUBSCRIBE TO VIEW"));
assert(!workspace.includes('<LiveCheckout'),'No legacy course checkout in active learner flow');
assert(cards.includes('View Plans')&&cards.includes('View Subscription Plans'));
assert(learning.includes('All-Access Subscription'));
assert(nav.includes("['/subscription-plans','Subscription'"));
assert(app.includes('path="/subscription-plans"'));
assert(bridge.includes("onSubscriptionRoute={()=>navigate('/subscription-plans')}"));
assert(read('src/production/LiveMockPortal.jsx').includes('hasPlatformAccess(catalog.subscription)'));
assert(read('src/production/LivePracticePortal.jsx').includes('hasPlatformAccess(catalog?.subscription)'));
assert(read('src/production/SupabaseApp.jsx').includes('hasPlatformAccess(platformSubscription)'));
assert(read('src/production/liveLearningApi.js').includes('hasPlatformAccess(catalog.subscription)'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 79. P21 — Platform-wide Subscriptions'));
console.log('PASS P21 static/API: whole-platform access, expiry, admin plan editing, pending requests, no client-paid grant, UI route and Supabase-side feature gating.');
