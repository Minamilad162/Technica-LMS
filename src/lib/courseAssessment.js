import {courses,findCourse,defaultAssessmentSettings} from '../data/courseCatalog.js';
import {createQuestionSet} from './questionSelection.js';
const bounded=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.min(max,Math.max(min,Math.round(n))):fallback};
export function assessmentSettings(courseId,stored={}) {
 const course=findCourse(courseId),base=defaultAssessmentSettings[courseId];
 if(!course||!base)return null;
 const saved=stored[courseId]||{};
 const eligible=(Array.isArray(saved.domainIds)?saved.domainIds:base.domainIds).filter(id=>course.domainIds.includes(id));
 return {
  enabled:base.enabled===false?false:saved.enabled!==false,
  questionCount:bounded(saved.questionCount,1,50,base.questionCount),
  durationMinutes:bounded(saved.durationMinutes,1,180,base.durationMinutes),
  passMark:bounded(saved.passMark,1,100,base.passMark),
  domainIds:[...new Set(eligible)],
 };
}
export function prepareAssessment({courseId,settings,bank,random=Math.random}){
 const course=findCourse(courseId);
 const config=assessmentSettings(courseId,settings);
 if(!course||!config)return {error:'Course not found.'};
 if(!course.domainIds.length||!config.enabled)return {error:`${course.name} is coming soon. No questions are available yet.`};
 if(!config.domainIds.length)return {error:'The admin has not selected any domains for this assessment.'};
 const selectedBank=(bank||[]).filter(q=>config.domainIds.includes(q.domainId));
 if(selectedBank.length<config.questionCount)return {error:`This course does not yet have ${config.questionCount} questions available. Contact the admin.`};
 const selection=createQuestionSet({bank:selectedBank,domainIds:config.domainIds,count:config.questionCount,balanced:config.domainIds.length>1,pool:'all',random});
 if(selection.questions.length!==config.questionCount)return {error:'Unable to create the configured assessment. Contact the admin.'};
 return {course,config,questions:selection.questions};
}
export function canPracticeCourse(courseId,bank){
 const course=findCourse(courseId);
 return !!course&&course.domainIds.length>0&&(bank||[]).some(q=>course.domainIds.includes(q.domainId));
}
export function courseOptions(){return courses;}
