import {loadIdentity,listCourses,getCurrentEntitlements} from './lmsApi.js';
import {fetchMyPlatformSubscription,hasPlatformAccess} from './subscriptionApi.js';

// Server-verified, read-only learner catalog and P2 progress.
export async function fetchLiveLearningCatalog(db){
 const {data,error}=await db.auth.getUser();
 if(error||!data?.user?.id)throw new Error('Sign in to Technica LMS to view your learning library.');
 const user=data.user;
 const identity=await loadIdentity(db,user);
 if(identity.profile?.account_status!=='active')throw new Error('Your LMS account is not active.');
 const [courses,entitlements,subscription]=await Promise.all([
  listCourses(db),getCurrentEntitlements(db,user.id),
  fetchMyPlatformSubscription(db,user.id).catch(()=>null)
 ]);
 let progress=[],progressError='';
 try{
  const response=await db.from('lms_lesson_progress')
   .select('lesson_id,reading_completed,video_completed,quiz_passed,lesson_completed_at,last_activity_at')
   .eq('user_id',user.id);
  if(response.error)throw response.error;
  progress=response.data||[];
 }catch{progressError='Verified progress is unavailable; no completion is assumed.';}
 return {user,identity,courses,entitlements,subscription,progress,progressError};
}
export function mayReadLiveCourse(catalog,course){
 if(!catalog||!course)return false;
 return catalog.identity.isAdmin||
  (course.publication_state==='published'&&hasPlatformAccess(catalog.subscription))||
  catalog.entitlements.some(e=>e.course_id===course.id&&e.status==='active');
}
export function progressForLesson(progress,lessonId){
 return (progress||[]).find(row=>row.lesson_id===lessonId)||null;
}
