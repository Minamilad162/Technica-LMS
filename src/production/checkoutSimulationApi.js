// P16: checkout UI simulation only. No payment provider, no P1 entitlements,
// no protected lesson-media reads, and no credit-card collection.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=(uid,cid)=>'technica-p16-checkout-preview:'+uid+':'+cid;
export const simulationEnabled=()=>import.meta.env?.VITE_DISABLE_CHECKOUT_DEMO!=='1';
export function hasSimulatedEnrollment(uid,cid){
 if(!simulationEnabled()||!uuid.test(uid||'')||!uuid.test(cid||''))return false;
 try{return sessionStorage.getItem(key(uid,cid))==='completed';}
 catch{return false;}
}
export function completeSimulatedCheckout(uid,cid,{testReference,confirmedDemo}={}){
 if(!simulationEnabled())throw Error('Checkout simulation is disabled in this environment.');
 if(!uuid.test(uid||'')||!uuid.test(cid||''))throw Error('A real signed-in learner and published Course are required.');
 if(typeof testReference!=='string'||!/^[0-9]{6,12}$/.test(testReference))
  throw Error('Enter a fictional 6–12 digit test reference, not any real payment details.');
 if(confirmedDemo!==true)throw Error('Please confirm this is a simulation with no real payment.');
 // Never store or transmit user-entered numeric details: only a UI-only marker.
 // This is not an entitlement. Real P1/P14 server authorization never reads it.
 try{sessionStorage.setItem(key(uid,cid),'completed');}
 catch{throw Error('Browser session storage is unavailable for this simulation.');}
 return {courseId:cid,mode:'demo_only'};
}
