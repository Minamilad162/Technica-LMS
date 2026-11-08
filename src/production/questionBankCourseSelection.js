// Pure UI catalog selection. Never manufacture a Course or rewrite its ID/slug.
// The ASP P6A/P9B backend identifies the controlled Course by slug='asp'.
const clean=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
const aspTitles=new Set(['asp','asp course','associated safety professional','associated safety professional course']);
export const isAspCourseTitle=course=>aspTitles.has(clean(course?.title));
export const isOfficialAspCourse=course=>clean(course?.slug)==='asp';
export function preferredQuestionBankCourse(courses=[]){
 const valid=Array.isArray(courses)?courses.filter(c=>c&&typeof c.id==='string'):[];
 return valid.find(isOfficialAspCourse)||valid.find(isAspCourseTitle)||valid[0]||null;
}
export function questionBankCatalogState(courses,loading=false,error=''){
 if(error)return {status:'error',message:'Course catalog could not be loaded: '+error};
 if(loading)return {status:'loading',message:'Loading real Supabase Courses…'};
 if(!courses?.length)return {status:'empty',message:'No Courses were returned from the connected Supabase database. Check Admin Tools → Courses; do not create a duplicate ASP Course until its database ID is verified.'};
 const chosen=preferredQuestionBankCourse(courses);
 if(chosen&&isAspCourseTitle(chosen)&&!isOfficialAspCourse(chosen))return {
  status:'asp-slug-mismatch',
  message:'A Course titled ASP exists, but its database slug is "'+String(chosen.slug||'(blank)')+'". Controlled ASP review/Mock requires the existing Course slug "asp". Verify the current Course record before importing or creating another ASP Course.'
 };
 return {status:'ready',message:''};
}
