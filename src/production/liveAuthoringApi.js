import {createCourse,createDomain,createTopic,createLesson,createTextBlock,loadIdentity,listCourses,loadStructure,loadTextBlocks} from './lmsApi.js';

// P7 transitional authoring adapter. Uses the already installed P1 tables/RLS.
// No automatic migration, localStorage import, deletes, publishing or privilege
// grants. Every mutation requires an explicit authenticated admin action.
const titles=new Set(['lms_courses','lms_domains','lms_topics','lms_lessons']);
const text=value=>String(value??'').trim();

export function validAuthoringTitle(value){
 const v=text(value);
 if(!v||v.length>180)throw new Error('Title must contain 1–180 characters.');
 return v;
}
export async function verifiedLiveAdmin(db){
 if(!db)throw new Error('Supabase is not configured in the published build.');
 const {data,error}=await db.auth.getUser();
 if(error||!data?.user?.id)throw new Error('Sign in with your verified Supabase email and password.');
 const identity=await loadIdentity(db,data.user);
 if(identity.profile?.account_status!=='active'||identity.isAdmin!==true)
  throw new Error('An active Technica LMS Admin role is required. No browser role override is permitted.');
 return data.user;
}
export async function liveCourses(db){return listCourses(db);}
export async function liveCourseTree(db,courseId){return loadStructure(db,courseId);}
export async function liveLessonText(db,lessonId){return loadTextBlocks(db,lessonId);}

export async function addDraftCourse(db,title,summary,peers){
 const clean=validAuthoringTitle(title);
 return createCourse(db,clean,text(summary).slice(0,2000),peers);
}
export async function addAuthoringNode(db,editor,peers){
 const clean=validAuthoringTitle(editor.title);
 switch(editor.kind){
  case 'domain':
   if(!editor.courseId)throw new Error('Choose a course first.');
   return createDomain(db,editor.courseId,clean,peers);
  case 'topic':
   if(!editor.domainId)throw new Error('Choose a domain first.');
   return createTopic(db,editor.domainId,clean,peers);
  case 'lesson':
   if(!editor.topicId)throw new Error('Choose a topic first.');
   return createLesson(db,editor.topicId,clean,peers);
  default:throw new Error('Unsupported authoring operation.');
 }
}
export async function updateAuthoringTitle(db,table,id,title){
 if(!titles.has(table)||!id)throw new Error('Invalid or missing authoring target.');
 const clean=validAuthoringTitle(title);
 const {data,error}=await db.from(table).update({title:clean}).eq('id',id).select('id').single();
 if(error)throw new Error(error.message||'Rename denied by Supabase.');
 if(!data?.id)throw new Error('Target not found or not authorized.');
 return data;
}
export async function updateAuthoringCourse(db,courseId,title,summary){
 if(!courseId)throw new Error('Choose a course first.');
 const clean=validAuthoringTitle(title);
 const {data,error}=await db.from('lms_courses')
  .update({title:clean,summary:text(summary).slice(0,2000)})
  .eq('id',courseId).select('id').single();
 if(error)throw new Error(error.message||'Course update denied by Supabase.');
 if(!data?.id)throw new Error('Course not found or not authorized.');
 return data;
}
export async function addReadingParagraph(db,lessonId,paragraph,position){
 if(!lessonId)throw new Error('Choose a lesson first.');
 const clean=text(paragraph);
 if(!clean||clean.length>20000)throw new Error('Reading paragraph must contain 1–20,000 characters.');
 return createTextBlock(db,lessonId,clean,position);
}
