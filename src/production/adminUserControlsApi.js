import {verifiedLiveAdmin} from './liveAuthoringApi.js';
const validId=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const value=(r,label)=>{if(r.error)throw Error(label+': '+(r.error.message||'Permission denied'));return r.data;};
export async function fetchAdminUserControls(db,userId){
 if(!validId(userId))throw Error('Select a valid LMS user.');
 await verifiedLiveAdmin(db);
 const x=value(await db.rpc('lms_p53_admin_user_controls',{p_user_id:userId}),'User controls unavailable');
 if(!x||x.userId!==userId||!['active','suspended'].includes(x.status)||
 typeof x.blockNote!=='string'||x.blockNote.length>500||!Array.isArray(x.plans)||!Array.isArray(x.subscriptions)||
 x.plans.some(p=>!validId(p.id)||typeof p.name!=='string'||!Number.isInteger(p.months))||
 x.subscriptions.some(s=>!validId(s.id)||typeof s.planName!=='string'))
 throw Error('Invalid protected user-control response.');
 return x;
}
export async function setAdminUserBlocked(db,userId,block,note=''){
 if(!validId(userId)||typeof block!=='boolean'||typeof note!=='string'||note.length>500)throw Error('Invalid account status update.');
 await verifiedLiveAdmin(db);
 const x=value(await db.rpc('lms_p52_admin_set_block',{p_user_id:userId,p_block:block,p_note:block?note.trim():''}),'Status update denied');
 if(x?.userId!==userId||x.status!==(block?'suspended':'active'))throw Error('Unconfirmed account status.');
 return x;
}
export async function activateAdminUserPlan(db,userId,planId){
 if(!validId(userId)||!validId(planId))throw Error('Select a user and published plan.');
 await verifiedLiveAdmin(db);
 const x=value(await db.rpc('lms_p52_admin_activate_plan',{p_user_id:userId,p_plan_id:planId}),'Plan activation denied');
 if(!validId(x?.id)||x.userId!==userId||x.planId!==planId||!Number.isFinite(Date.parse(x.endsAt)))
 throw Error('Unconfirmed subscription dates.');
 return x;
}
