import {getCurrentEntitlements,loadIdentity,loadStructure} from './lmsApi.js';
import {fetchMyPlatformSubscription,hasPlatformAccess} from './subscriptionApi.js';
import {fetchLearningAccessMode} from './accessModeApi.js';

// P15: browser only receives published titles for locked content. Real lessons
// still require P1/P15 RLS and signed-media server checks; never trust UI flags.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isP15Id=x=>typeof x==='string'&&uuid.test(x);
export function isFullCourseEnrolled(entitlements,courseId,subscription=null,openAccess=false){
 if(openAccess===true&&!!courseId)return true;
 if(hasPlatformAccess(subscription))return true;
 return !!courseId&&(entitlements||[]).some(e=>e.course_id===courseId
  &&e.status==='active'&&['paid','manual'].includes(e.entitlement_type)
  &&Date.parse(e.starts_at)<=Date.now()
  &&(!e.ends_at||Date.parse(e.ends_at)>Date.now()));
}
export async function fetchP15Catalog(db,user){
 if(!db||!user?.id)throw Error('Real Supabase authentication required.');
 // P20: independent read-only queries run in parallel; retain the exact
 // active-profile authorization check before returning ANY course metadata.
 const [identity,all,entitlements,p21,policy]=await Promise.all([
  loadIdentity(db,user),
  db.from('lms_courses')
   .select('id,slug,title,summary,cover_path,publication_state,created_at')
   .eq('publication_state','published').order('created_at',{ascending:false}),
  getCurrentEntitlements(db,user.id),
  fetchMyPlatformSubscription(db,user.id).then(subscription=>({subscription,error:''}))
   .catch(()=>({subscription:null,error:'Subscription plans are unavailable.'})),
  fetchLearningAccessMode(db)
 ]);
 if(identity.profile?.account_status!=='active')throw Error('Your LMS account is not active.');
 if(all.error)throw Error('Published course catalog is unavailable.');
 return {identity,entitlements,courses:all.data||[],subscription:p21.subscription,subscriptionError:p21.error,openAccess:policy.openAccess,accessModeInstalled:policy.installed};
}
export function nestPublishedOutline(rows,courseId){
 if(!isP15Id(courseId)||!Array.isArray(rows))throw Error('Invalid P15 course outline.');
 const domains=[],dMap=new Map(),tMap=new Map(),seen=new Set();
 for(const r of rows){
  if(!isP15Id(r.domain_id)||!isP15Id(r.topic_id)||!isP15Id(r.lesson_id)
   ||typeof r.domain_title!=='string'||typeof r.topic_title!=='string'
   ||typeof r.lesson_title!=='string'||seen.has(r.lesson_id)
   ||!Number.isSafeInteger(r.domain_position)
   ||!Number.isSafeInteger(r.topic_position)||!Number.isSafeInteger(r.lesson_position)
   ||typeof r.is_free_intro!=='boolean')
   throw Error('Invalid published course outline response.');
  seen.add(r.lesson_id);
  let d=dMap.get(r.domain_id);
  if(!d){
   d={id:r.domain_id,title:r.domain_title,position:r.domain_position,topics:[]};
   domains.push(d);dMap.set(r.domain_id,d);
  }
  let t=tMap.get(r.topic_id);
  if(!t){
   t={id:r.topic_id,title:r.topic_title,position:r.topic_position,lessons:[]};
   d.topics.push(t);tMap.set(r.topic_id,t);
  }
  t.lessons.push({id:r.lesson_id,title:r.lesson_title,
   position:r.lesson_position,isFreeIntro:r.is_free_intro});
 }
 if(rows.filter(r=>r.is_free_intro).length>1)throw Error('Only one published Intro is permitted.');
 return domains;
}
export async function fetchP15Outline(db,courseId){
 if(!db||!isP15Id(courseId))throw Error('Choose a published Course.');
 const {data,error}=await db.rpc('lms_p15_course_outline',{p_course_id:courseId});
 if(error)throw Error('Course outline is unavailable until P15 is installed on authorized Staging.');
 return nestPublishedOutline(data||[],courseId);
}
export async function fetchAdminFreeIntro(db,courseId){
 if(!isP15Id(courseId))throw Error('Choose a saved Course.');
 const {data,error}=await db.rpc('lms_p15_admin_intro_enabled',{p_course_id:courseId});
 if(error||typeof data!=='boolean')throw Error('Free Intro setting unavailable. Check P15 Staging migration and Admin privileges.');
 return data;
}
export async function setAdminFreeIntro(db,courseId,enabled){
 if(!isP15Id(courseId)||typeof enabled!=='boolean')throw Error('Invalid Free Intro action.');
 const {data,error}=await db.rpc('lms_p15_set_intro',{p_course_id:courseId,p_enabled:enabled});
 if(error||data!==enabled)throw Error('Free Intro could not be changed. Publish the Course and first Lesson, then verify Admin rights.');
 return data;
}
export async function setAdminPublished(db,table,id,state){
 if(!['lms_courses','lms_lessons'].includes(table)||!isP15Id(id)
   ||!['published','draft'].includes(state))throw Error('Invalid publishing action.');
 const {data,error}=await db.from(table).update({publication_state:state})
  .eq('id',id).select('id,publication_state').single();
 if(error||data?.id!==id||data.publication_state!==state)
  throw Error('Publishing denied. Verify signed Admin permissions and course status.');
 return data;
}
// Deliberately DEV-only. No card data, amount, billing or entitlement is sent
// anywhere. Does NOT grant P1 access to real protected PDFs/videos or exams.
export const localCheckoutEnabled=()=>import.meta.env?.DEV===true
 &&import.meta.env?.VITE_LOCAL_QA_DEMO==='1';
const demoKey=(userId,courseId)=>'technica-p15-demo-checkout-v1:'+userId+':'+courseId;
export function hasLocalDemoCheckout(userId,courseId){
 if(!localCheckoutEnabled()||!isP15Id(userId)||!isP15Id(courseId))return false;
 try{return sessionStorage.getItem(demoKey(userId,courseId))==='yes';}catch{return false;}
}
export function recordLocalDemoCheckout(userId,courseId,enteredDigits){
 if(!localCheckoutEnabled())throw Error('Demo Checkout is disabled outside local QA.');
 if(!isP15Id(userId)||!isP15Id(courseId))throw Error('Invalid local learner or course.');
 if(typeof enteredDigits!=='string'||!/^[0-9]{8,19}$/.test(enteredDigits))
  throw Error('Use 8–19 fake numeric digits for local checkout testing.');
 // NEVER persist the digits. The marker is UI-only and not a Supabase entitlement.
 sessionStorage.setItem(demoKey(userId,courseId),'yes');
 return true;
}
export async function getEnrolledStructure(db,catalog,course){
 if(!catalog||!course||!isFullCourseEnrolled(catalog.entitlements,course.id,catalog.subscription,catalog.openAccess))
  throw Error('This Course requires an active platform subscription or a valid legacy grant.');
 return loadStructure(db,course.id);
}
