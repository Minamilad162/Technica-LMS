import {courses} from '../data/courseCatalog.js';
import {pseeDemoQuestions} from '../data/pseeDemoQuestions.js';

export const COURSE_CATEGORIES=Object.freeze([
 'Safety Certification','Engineering Education','Process Safety','Mechanical Integrity',
 'Occupational Safety','Technical Operations','Professional Development','General Engineering'
]);

export function courseDomainId(courseId){return `course-${courseId}`;}
export function getCourse(state,courseId){
 const original=courses.find(c=>c.id===courseId);
 const created=(state?.createdCourses||[]).find(c=>c.id===courseId);
 const edits=state?.courseEdits?.[courseId]||{};
 const source=created||original;
 if(!source)return null;
 const course={...source,...(!created?{status:courseId==='asp'?'published':'draft',...edits}:{})};
 if(!course.domainIds?.length && (created||courseId==='psee')){
  course.domainIds=[courseDomainId(courseId)];
 }
 return course;
}
export function getCourseModules(state,courseId){
 if(courseId==='asp')return state?.courseModules?.asp??state?.modules??[];
 return state?.courseModules?.[courseId]??[];
}
export function getCourseBank(state,courseId,imported=[]){
 const legacy=courseId==='asp'?imported:courseId==='psee'?pseeDemoQuestions:[];
 return [...legacy,...(state?.addedQuestions||[]).filter(q=>(q.courseId||'asp')===courseId)];
}
export function courseBankCount(state,courseId,imported=[]){return getCourseBank(state,courseId,imported).length;}
export function learnerCourses(state){
 const items=[...courses.map(c=>getCourse(state,c.id)),...(state?.createdCourses||[]).map(c=>getCourse(state,c.id))];
 return items.filter(c=>c&& (c.status==='published'||
 (c.status==='scheduled'&&c.publishAt&&Date.parse(c.publishAt)<=Date.now())));
}
