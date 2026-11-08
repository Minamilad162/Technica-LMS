import {verifiedLiveAdmin} from './liveAuthoringApi.js';
import {isAspCourseTitle,isOfficialAspCourse} from './questionBankCourseSelection.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Explicit Admin operation on EXISTING Course identity; no new Course,
// publication, question rewrite, reservation or browser-only authorization.
export function checkAspCourseRecovery(courses,courseId){
 if(!uuid.test(courseId||'')||!Array.isArray(courses))throw Error('Choose an existing ASP Course.');
 const matching=courses.filter(isAspCourseTitle),canonical=courses.filter(isOfficialAspCourse);
 if(canonical.length)throw Error('The canonical ASP Course already exists. Select that record instead.');
 if(matching.length!==1||matching[0].id!==courseId)
  throw Error('ASP Course identity is ambiguous. Review Course IDs before continuing.');
 const course=matching[0];
 if(!course.slug||!['draft','published'].includes(course.publication_state))
  throw Error('Course identifier or publication status requires manual Admin review.');
 return {id:course.id,oldSlug:course.slug,title:course.title,state:course.publication_state};
}
export async function repairExistingAspCourseId(db,courseId,confirmation){
 if(confirmation!=='USE EXISTING ASP COURSE')throw Error('Explicit Admin confirmation required.');
 await verifiedLiveAdmin(db);
 const {data:rows,error:readError}=await db.from('lms_courses')
  .select('id,title,slug,publication_state').order('created_at',{ascending:false});
 if(readError||!Array.isArray(rows))throw Error('Could not verify existing Course IDs; no changes made.');
 const course=checkAspCourseRecovery(rows,courseId);
 const {data,error}=await db.from('lms_courses').update({slug:'asp'})
  .eq('id',course.id).eq('slug',course.oldSlug).eq('title',course.title)
  .eq('publication_state',course.state)
  .select('id,slug,title,publication_state').single();
 if(error||data?.id!==course.id||data?.slug!=='asp')
  throw Error('ASP identity update was rejected. Recheck Admin access and Course uniqueness.');
 return {id:data.id,title:data.title,publicationState:data.publication_state};
}
