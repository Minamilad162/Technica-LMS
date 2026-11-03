// ASP P6A: admin-only RPCs; never read lms_questions with browser .from().
// The database validates JWT admin role and preserves P4 published-state guards.
async function call(db,name,args){
 const {data,error}=await db.rpc(name,args);
 if(error)throw new Error(error.message||'ASP review request failed');
 return data;
}
export function fetchAspReviewPage(db,courseId,{filter='unreviewed',limit=20,offset=0}={}){
 return call(db,'lms_p6_list_questions',{
   p_course_id:courseId,p_filter:filter,p_limit:limit,p_offset:offset
 });
}
export function fetchAspReviewSummary(db,courseId){
 return call(db,'lms_p6_bank_summary',{p_course_id:courseId});
}
export function prepareAsp11Domains(db,courseId){
 return call(db,'lms_p6_seed_asp11_domains',{p_course_id:courseId});
}
export function saveAspReview(db,{questionId,domainId=null,difficulty='unclassified',answerChecked=false,rightsChecked=false,notes=''}){
 return call(db,'lms_p6_review_question',{
   p_question_id:questionId,p_domain_id:domainId,p_difficulty:difficulty,
   p_answer_checked:answerChecked,p_rights_checked:rightsChecked,p_notes:notes.trim()
 });
}
export const ASP11_PREFIX=/^asp11-0[1-9]$/;
export const REVIEW_PAGE_SIZE=20;
export const REVIEW_FILTERS=[
 {value:'unreviewed',label:'Needs review'},
 {value:'ready',label:'Reviewed · ready'},
 {value:'approved',label:'Already approved'},
 {value:'reserved',label:'Mock reserved'},
 {value:'all',label:'All questions'}
];
