// P54 — authenticated real events and user-owned read receipts.
const supported=new Set(['subscription_activated','subscription_requested','p52_user_blocked','p52_user_unblocked']);
export function verifyNotifications(data){
 if(!data||!Array.isArray(data.items)||!Number.isSafeInteger(data.unreadCount)||data.unreadCount<0||
 typeof data.isAdmin!=='boolean'||data.items.length>100)throw Error('Invalid verified notification feed.');
 const ids=new Set();
 for(const x of data.items){
  if(typeof x.id!=='string'||ids.has(x.id)||!supported.has(x.type)||
   !Number.isFinite(Date.parse(x.createdAt))||typeof x.read!=='boolean'||
   !x.details||typeof x.details!=='object'||typeof x.details.name!=='string')
   throw Error('Invalid notification event.');
  if(x.type==='subscription_activated'&&
   (!Number.isFinite(Date.parse(x.details.startsAt))||!Number.isFinite(Date.parse(x.details.endsAt))||
    Date.parse(x.details.endsAt)<=Date.parse(x.details.startsAt)))throw Error('Invalid subscription period.');
  ids.add(x.id);
 }
 return data;
}
export async function fetchNotifications(db,limit=50){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid notification limit.');
 if(!db?.rpc)throw Error('Authenticated LMS connection required.');
 const {data,error}=await db.rpc('lms_p54_notifications',{p_limit:limit});
 if(error)throw Error('Notifications unavailable. Check LMS connection and account permissions.');
 return verifyNotifications(data);
}
export async function markNotificationsRead(db,keys){
 if(!Array.isArray(keys)||!keys.length||keys.length>100||keys.some(x=>typeof x!=='string'||x.length>100))
 throw Error('Invalid notification selection.');
 const {data,error}=await db.rpc('lms_p54_mark_read',{p_event_keys:[...new Set(keys)]});
 if(error)throw Error('Could not update notification status.');
 if(!Number.isSafeInteger(data)||data<0)throw Error('Invalid notification receipt.');
 return data;
}
export function notificationLabel(event){
 if(event.type==='subscription_requested')return 'Subscription requested';
 if(event.type==='subscription_activated')return 'Subscription activated';
 if(event.type==='p52_user_blocked')return 'Account blocked';
 return 'Account unblocked';
}
export function notificationSummary(event){
 const d=event.details||{}, person=d.email||d.name||'Account';
 if(event.type==='subscription_requested')return person+' requested '+(d.plan||'a subscription plan');
 if(event.type==='subscription_activated')return person+' activated '+(d.plan||'a subscription plan');
 if(event.type==='p52_user_blocked')return person+' was blocked';
 return person+' was unblocked';
}
