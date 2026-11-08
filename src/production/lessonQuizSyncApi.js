// P31: The same P22 published quiz IDs created by P28/P30 are consumed by
// learner Lessons. No answer key, admin-only list API or local mock pool crosses
// this boundary. P22 enforces Auth, Course access and is_published server-side.
export function validateLessonQuizPayload(rows,{adminPreview=false}={}){
 if(!Array.isArray(rows)||rows.length>100)
  throw Error('The protected Lesson Quiz returned an invalid question list.');
 const ids=new Set();
 return rows.map(row=>{
  if(!row||typeof row.id!=='string'||ids.has(row.id)
     ||typeof row.prompt!=='string'||row.prompt.trim().length<8
     ||!Array.isArray(row.options)||row.options.length<2||row.options.length>6
     ||row.options.some(v=>typeof v!=='string'||!v.trim())
     ||Object.hasOwn(row,'correct_index')||Object.hasOwn(row,'correctIndex'))
   throw Error('The protected Lesson Quiz returned an invalid question.');
  ids.add(row.id);
  return adminPreview?{
   id:row.id,prompt:row.prompt,options:row.options,
   is_published:row.is_published===true,position:row.position
  }:{id:row.id,prompt:row.prompt,options:row.options};
 });
}

export async function fetchLessonQuiz(db,lessonId,{adminPreview=false}={}){
 if(!lessonId)throw Error('Select a real Lesson.');
 if(adminPreview){
  const {data,error}=await db.from('lms_p22_lesson_quiz_questions')
   .select('id,prompt,options,is_published,position').eq('lesson_id',lessonId)
   .order('position',{ascending:true});
  if(error)throw Error('Admin Quiz preview unavailable: '+error.message);
  return validateLessonQuizPayload(data||[],{adminPreview:true});
 }
 const {data,error}=await db.rpc('lms_p22_get_lesson_quiz',{p_lesson_id:lessonId});
 if(error)throw Error('Could not load the published Lesson Quiz: '+error.message);
 return validateLessonQuizPayload(data);
}

export function quizQuestionIdsChanged(previous,next){
 if(previous.length!==next.length)return true;
 return previous.some((row,i)=>row.id!==next[i]?.id);
}
// P30 adds Lesson Quiz links only. The existing independent ASP review remains
// mandatory before a Draft link may become visible to subscribed learners.
export function summarizeSavedLessonAssignments(payload){
 const linked=payload.filter(row=>Boolean(row.addLessonId));
 return {
  assigned:linked.length,
  approved:linked.filter(row=>row.expectedApprovalState==='approved').length,
  draft:linked.filter(row=>row.expectedApprovalState!=='approved').length
 };
}
