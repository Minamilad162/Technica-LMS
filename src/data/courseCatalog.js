// IDs correspond exactly to worksheets 1–5 of the supplied ASP workbook.
const aspDomainIds=['domain1','domain2','domain3','domain4','domain5'];

// Course is the parent entity; the five imported ASP worksheets are its domains.
// The Excel workbook has generic sheet titles only — no descriptive domain labels were supplied.
export const courses = Object.freeze([
  {id:'asp',name:'ASP Course',subtitle:'Associate Safety Professional',description:'Five imported domains from the ASP question bank.',domainIds:aspDomainIds,art:'refinery',theme:'mint'},
  {id:'psee',name:'PSEE',subtitle:'Upcoming course',description:'Course shell only. Questions and assessment configuration will be added after the next content upload.',domainIds:[],art:'plant',theme:'blue'},
]);
export const aspCourse = courses[0];
export const findCourse = id => courses.find(c=>c.id===id);
export const courseQuestionCount = (course,bank) => course ? (bank||[]).filter(q=>course.domainIds.includes(q.domainId)).length : 0;
export const defaultAssessmentSettings = Object.freeze({
  asp:{enabled:true,questionCount:50,durationMinutes:60,passMark:70,maxAttempts:3,domainIds:[...aspCourse.domainIds]},
  psee:{enabled:false,questionCount:50,durationMinutes:60,passMark:70,maxAttempts:3,domainIds:[]},
});
