import {liveCourses,liveCourseTree,verifiedLiveAdmin} from './liveAuthoringApi.js';
import {fetchAdminFreeIntro,isP15Id} from './learnerJourneyApi.js';

export const ADMIN_PREVIEW_MODES=['draft','visitor','subscriber'];
export function buildAdminPreviewOutline(tree=[],mode='draft',introEnabled=false){
 if(!ADMIN_PREVIEW_MODES.includes(mode)||!Array.isArray(tree))throw Error('Invalid Course preview.');
 const publishOnly=mode!=='draft';
 const all=tree.map(d=>({...d,topics:(d.topics||[]).map(t=>({...t,
  lessons:(t.lessons||[]).filter(l=>!publishOnly||l.publication_state==='published')
   .map(l=>({...l,isFreeIntro:false}))}))
  .filter(t=>!publishOnly||t.lessons.length>0)}))
  .filter(d=>!publishOnly||d.topics.length>0);
 // P15 free-intro policy: only the first published Lesson on a published Course.
 // Metadata label here is a visual Admin simulation, never an access grant.
 if(introEnabled&&publishOnly){
  const first=all.flatMap(d=>d.topics.flatMap(t=>t.lessons))[0];
  if(first)first.isFreeIntro=true;
 }
 return all;
}
export async function readAdminCoursePreview(db,courseId){
 if(!isP15Id(courseId))throw Error('Invalid saved Course ID.');
 // Direct/new-tab URL is not a bypass. Verify signed role before reading drafts.
 await verifiedLiveAdmin(db);
 const [courses,tree,intro]=await Promise.all([
  liveCourses(db),
  liveCourseTree(db,courseId),
  fetchAdminFreeIntro(db,courseId).catch(()=>null)
 ]);
 const course=courses.find(c=>c.id===courseId);
 if(!course)throw Error('Course not found or your Admin access was revoked.');
 if(!Array.isArray(tree))throw Error('The Course structure is unavailable.');
 return {course,tree,introEnabled:intro};
}
export function countAdminPreviewLessons(outline=[]){
 return outline.reduce((n,d)=>n+(d.topics||[]).reduce((v,t)=>v+(t.lessons||[]).length,0),0);
}
