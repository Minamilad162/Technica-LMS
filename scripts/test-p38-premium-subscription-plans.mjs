import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {baselineSubscriptionPlan,featuredSubscriptionPlanId,subscriptionPlanSavings,
 subscriptionPlanCallout,subscriptionTerm} from '../src/production/subscriptionPlanPresentation.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/production/SubscriptionPlans.jsx');
const css=read('src/production/subscriptionPlans.css');
const api=read('src/production/subscriptionApi.js');
const master=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');
const plans=[
 {id:'a',duration_months:3,price_amount:300,currency:'EGP',name:'Starter'},
 {id:'b',duration_months:6,price_amount:540,currency:'EGP',name:'Growth'},
 {id:'c',duration_months:9,price_amount:720,currency:'EGP',name:'Extended'}
];
assert.equal(featuredSubscriptionPlanId(plans),'b','Use actual 6-month plan as recommended');
assert.equal(featuredSubscriptionPlanId([plans[0],plans[2]]),'a','Fallback to available midpoint rather than inventing a plan');
assert.equal(featuredSubscriptionPlanId([]),'');
assert.equal(baselineSubscriptionPlan(plans).id,'a');
assert.equal(subscriptionPlanSavings(plans[1],plans[0]),10);
assert.equal(subscriptionPlanSavings(plans[2],plans[0]),20);
assert.equal(subscriptionPlanSavings(plans[0],plans[0]),null);
assert.equal(subscriptionPlanSavings({...plans[1],currency:'USD'},plans[0]),null,'Never compare prices in unlike currencies');
assert.equal(subscriptionPlanSavings({...plans[1],price_amount:null},plans[0]),null,'No invented discount for unconfigured prices');
assert.equal(subscriptionPlanSavings({...plans[1],price_amount:700},plans[0]),null,'Do not claim savings where none exist');
assert.equal(subscriptionPlanSavings(plans[1],{...plans[0],price_amount:0}),null);
assert.equal(subscriptionTerm(1),'1 month');
assert.equal(subscriptionTerm(6),'6 months');
assert.equal(subscriptionTerm(0),'Membership');
assert(subscriptionPlanCallout(plans[1],true).includes('balanced term'));

for(const marker of [
 'LearningIllustration','sp-illustration','sp-art-laptop','/images/technica-logo.webp',
 'sp-art-books','sp-art-play','sp-art-check','sp-art-cap','sp-art-award',
 'sp-hero','Choose Your ','Learning Plan','sp-hero-points',
 'sp-duration-selector','aria-pressed={focusedPlanId===plan.id}',
 'onClick={()=>focusPlan(plan.id)}','focusedPlanId===plan.id',
 'sp-grid','sp-featured','sp-selected','sp-recommended',
 'sp-card-callout','sp-benefits','sp-feature-bar','sp-trust-row',
 'sp-policy','sp-active','sp-pending','sp-alert',
 'displayPlanPrice(plan)','listSubscriptionPlans(db)','listMySubscriptionRequests(db,user.id)',
 'requestPlatformPlan(db,plan.id)','No payment was collected',
 'Admin-reviewed request','No card payment at this step',
 'Admin-reviewed activation','Price not configured',
 'Already subscribed','Awaiting Admin','Request this plan'
]){
 const value=marker==='Request this plan'?'Request this plan':marker;
 assert(ui.includes(value),'P38 Premium UI missing '+marker);
}
assert(ui.includes('<PremiumLoading variant="page"/>'),'P64 requires the shared premium loading display for subscription fetches.');
assert(!ui.includes('$29.99')&&!ui.includes('$49.99')&&!ui.includes('$69.99'),'No hardcoded mockup price');
assert(!ui.includes('Secure Payment'),'Do not claim online payments while offline Admin-reviewed');
assert(!ui.includes('Most Popular'),'Do not claim popularity without product data');
assert(!ui.includes('completeSimulatedCheckout('),'Subscription activation must remain server-verifiable');
assert(api.includes("db.rpc('lms_p21_request_plan'")&&api.includes('isActivePlatformSubscription'),
 'Existing P21 server-controlled request+entitlement logic is unchanged.');
for(const marker of [
 '.sp-hero','.sp-illustration','.sp-art-laptop','.sp-card.sp-featured',
 '.sp-duration-selector button.sp-duration-active','.sp-grid',
 '.sp-feature-bar','.sp-trust-row','.sp-savings',
 '@media(max-width:1130px)','@media(max-width:625px)',
 '@media(max-width:390px)','prefers-reduced-motion:reduce',
 ':focus-visible'
])assert(css.includes(marker),'P38 responsive/UI affordance missing '+marker);
assert(master.includes('P21 — Platform-wide Subscriptions'),'Preserve canonical subscription architecture');
console.log('PASS P38 premium subscription page: real Supabase plans/prices, grounded savings, accessible selection, responsive illustration, server-controlled requests and honest payment state.');
