import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeSimulatedCheckout,hasSimulatedEnrollment,simulationEnabled}
 from '../src/production/checkoutSimulationApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const user='11111111-1111-1111-1111-111111111111';
const course='22222222-2222-2222-2222-222222222222';
const otherCourse='33333333-3333-3333-3333-333333333333';
const otherUser='44444444-4444-4444-4444-444444444444';
const data=new Map();
globalThis.sessionStorage={
 getItem:key=>data.get(key)||null,
 setItem:(key,value)=>data.set(key,value)
};
assert.equal(simulationEnabled(),true,'Demo-only mode is available until explicitly disabled.');
assert.equal(hasSimulatedEnrollment(user,course),false);
assert.throws(()=>completeSimulatedCheckout(user,course,{testReference:'12345678',confirmedDemo:false}),/confirm/);
assert.throws(()=>completeSimulatedCheckout(user,course,{testReference:'',confirmedDemo:true}),/fictional/);
assert.throws(()=>completeSimulatedCheckout(user,course,{testReference:'4242424242424242',confirmedDemo:true}),/fictional/);
assert.throws(()=>completeSimulatedCheckout('bad',course,{testReference:'12345678',confirmedDemo:true}),/signed-in/);
assert.deepEqual(completeSimulatedCheckout(user,course,{testReference:'12345678',confirmedDemo:true}),
 {courseId:course,mode:'demo_only'});
assert.equal(hasSimulatedEnrollment(user,course),true);
assert.equal(hasSimulatedEnrollment(user,otherCourse),false,'No unlock of unrelated Course');
assert.equal(hasSimulatedEnrollment(otherUser,course),false,'No cross-user fake checkout');
for(const value of data.values())assert.equal(value,'completed','No test digits, PAN, CVV or billing data stored');
assert(![...data.keys()].some(k=>k.includes('12345678')),'No test digits in storage keys');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const checkout=read('src/production/LiveCheckout.jsx');
const api=read('src/production/checkoutSimulationApi.js');
const portal=read('src/production/LiveLearnerPortal.jsx');
const app=read('src/App.jsx');
const css=read('src/production/liveCheckout.css');
assert(workspace.includes('Enroll Now')&&workspace.includes('startCheckout(chosen.id)'),
 'Locked lessons and Course card must link to selected-course checkout');
assert(workspace.includes('onCheckoutRoute(id)'));
assert(workspace.includes('screen===\'checkout\''));
assert(workspace.includes('hasSimulatedEnrollment(user.id,c.id)'));
assert(workspace.includes('full||l.isFreeIntro?<SecureLessonContent'),
 'Demo flag must NEVER grant access to actual media');
assert(checkout.includes('course.title')&&checkout.includes('user.email'));
assert(checkout.includes('onMyLearning')&&checkout.includes('onOpenCourse'));
assert(checkout.includes('There is no payment gateway connected'));
assert(checkout.includes('Never enter actual card numbers'));
assert(checkout.includes('type="checkbox"')&&checkout.includes('confirmedDemo:accepted'));
assert(!/(?:name|id|autoComplete)=["'](?:cvv|expiry|cardNumber|card_number|pan)["']/i.test(checkout),
 'No actual card details should be requested as input fields');
assert(api.includes('sessionStorage.setItem(key(uid,cid),\'completed\')'));
assert(!api.includes('lms_entitlements')||api.includes('no P1 entitlements'));
assert(!api.includes('fetch(')&&!api.includes('.rpc('),'No network or DB writes in checkout simulation');
assert(portal.includes('onCheckoutRoute={id=>navigate(\'/checkout/\''));
assert(portal.includes('onCourseRoute={id=>navigate(\'/course-catalog/\''));
assert(app.includes('path="/checkout/:courseId"'));
assert(app.includes('path="/course-catalog/:courseId"'));
assert(read('src/production/LiveLearning.jsx').includes("navigate('/checkout/'+encodeURIComponent(course.id))"),
 'Old secure deep-linked course page must offer same-course Checkout');
assert(css.includes('@media(max-width:575px)'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 73. P16'));
delete globalThis.sessionStorage;
console.log('PASS P16: selected-course checkout, actionable locked lessons, isolated demo enrollment, My Learning, no real payment/storage/entitlement bypass.');
