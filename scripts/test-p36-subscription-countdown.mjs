import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {subscriptionTimeLeft,formatEnd} from '../src/production/subscriptionCountdownPolicy.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

const DAY=86_400_000;
const start=Date.parse('2026-11-08T12:00:00Z');
const end=Date.parse('2027-02-08T12:00:00Z'); // three calendar months
const record={id:'d2c8e4ad-56a3-4210-a9e2-61e367a7b502',status:'active',
 starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString()};
const totalDays=Math.ceil((end-start)/86_400_000);
const atStart=subscriptionTimeLeft(record,start);
assert.equal(atStart.state,'active');
assert.equal(atStart.days,totalDays);
assert.equal(atStart.remainingPercent,100);

const atMiddle=subscriptionTimeLeft(record,start+(end-start)/2);
assert.equal(atMiddle.state,'active');
assert.equal(atMiddle.remainingPercent,50);
assert.equal(atMiddle.days,Math.ceil(totalDays/2));

const lastDay=subscriptionTimeLeft(record,end-1000);
assert.equal(lastDay.state,'active');
assert.equal(lastDay.days,1);
assert.ok(lastDay.remainingPercent>0&&lastDay.remainingPercent<1);

const expired=subscriptionTimeLeft(record,end);
assert.equal(expired.state,'expired');
assert.equal(expired.days,0);
assert.equal(expired.remainingPercent,0);
assert.equal(subscriptionTimeLeft(record,end+DAY).state,'expired');

const nextMonth=subscriptionTimeLeft(record,start-DAY);
assert.equal(nextMonth.state,'upcoming');
assert.equal(nextMonth.days,1);
assert.equal(nextMonth.remainingPercent,100);

assert.equal(subscriptionTimeLeft(null).state,'none');
assert.equal(subscriptionTimeLeft({...record,status:'revoked'},start).state,'none');
assert.equal(subscriptionTimeLeft({...record,starts_at:'invalid'},start).state,'none');
assert.equal(subscriptionTimeLeft({...record,ends_at:record.starts_at},start).state,'none');
assert.equal(formatEnd(record.ends_at),'8 Feb 2027');

const countdown=read('src/production/SubscriptionCountdown.jsx');
const style=read('src/production/subscriptionCountdown.css');
const policy=read('src/production/subscriptionCountdownPolicy.js');
const hook=read('src/production/useHeaderSubscription.js');
const layout=read('src/components/Layout.jsx');
const learner=read('src/production/LiveLearnerWorkspace.jsx');
const subscriptionApi=read('src/production/subscriptionApi.js');
const learnerApi=read('src/production/learnerJourneyApi.js');
assert.match(countdown,/role="progressbar"/);
assert.match(countdown,/aria-valuetext=/);
assert.match(countdown,/days===1\?'1 day left'/);
assert.match(countdown,/No active plan/);
assert.match(countdown,/Plan expired/);
assert.match(countdown,/setInterval\(tick,60_000\)/);
assert.match(countdown,/addEventListener\('visibilitychange',visibility\)/);
assert.match(countdown,/hasPlatformAccess\(subscription\)/);
assert.match(countdown,/Until /);
assert.match(style,/\.sc-track i/);
assert.match(style,/@media\(max-width:700px\)/);
assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(policy,/export function subscriptionTimeLeft/);
assert.match(hook,/fetchMyPlatformSubscription\(db,userId\)/);
assert.match(hook,/validP21Id\(userId\)/);
assert.match(hook,/getSupabaseClient\(\{secureReviewEntry:true\}\)/);
assert.match(hook,/technica-subscription-changed/);
assert.match(layout,/useHeaderSubscription\(account\?\.id,!standalone&&!isAdmin\)/);
assert.match(layout,/<SubscriptionCountdown subscription=\{headerSubscription.subscription\}/);
assert.match(layout,/onOpenPlans=\{\(\)=>nav\('\/subscription-plans'\)\}/);
assert.match(learner,/<SubscriptionCountdown subscription=\{catalog\?\.subscription\}/);
assert.match(learner,/onOpenPlans=\{\(\)=>go\('subscription'\)\}/);
assert.match(learnerApi,/fetchMyPlatformSubscription\(db,user.id\)/);
assert.match(subscriptionApi,/currentPlatformSubscription/);
assert.match(subscriptionApi,/row.status==='active'/);
for(const content of [countdown,hook,policy]){
 assert.ok(!/\b(?:db|supabase|client)\.(?:insert|update|delete|rpc|storage)\s*[\.(]/.test(content),
  'Countdown is read-only');
}
console.log('P36 verified subscription countdown: active three-month interval, remaining-days math, expiry, access gates, dual headers and responsive UI PASS');
