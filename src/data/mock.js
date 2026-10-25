import aspBank from './aspQuestionBank.json';
import aspDomains from './aspDomains.json';
export const assets = {
  vessel: '/images/process-vessel.webp', plant: '/images/hero-plant.webp', practice: '/images/practice-plant.webp',
  refinery: '/images/refinery.webp', engineers: '/images/hazop-engineers.webp', tank: '/images/tank-farm.webp',
  moc: '/images/moc-plant.webp', pha: '/images/pha-plant.webp', pump: '/images/pump.webp', emergency: '/images/emergency-plant.webp', course: '/images/course-banner.webp',
};
export const catalog = [
 {id:'asp',name:'ASP Course',domain:'Available',description:'Associate Safety Professional · five imported domains with 1,625 questions.',topics:5,progress:0,art:'refinery',theme:'mint',action:'Start practice'},
 {id:'psee',name:'PSEE',domain:'Coming soon',description:'Upcoming course. Question bank and assessments have not been uploaded.',topics:0,progress:0,art:'engineers',theme:'blue',action:'View course'},
];
export const topics = aspDomains;
export const questionPool = aspBank;
export const learnerDomains = aspDomains;
export const learners = [
 {id:1,name:'Priya Sharma', initials:'PS',job:'Process Engineer',course:'Process Safety Fundamentals',progress:75,accuracy:82,last:'Today',avatar:'rose'},
 {id:2,name:'Daniel O’Connor',initials:'DO',job:'Operations Manager',course:'Management of Change',progress:40,accuracy:68,last:'Today',avatar:'blue'},
 {id:3,name:'Michael Adeyemi',initials:'MA',job:'Maintenance Lead',course:'Mechanical Integrity',progress:90,accuracy:88,last:'Yesterday',avatar:'amber'},
 {id:4,name:'Sarah Kim',initials:'SK',job:'HSE Advisor',course:'Process Hazard Analysis',progress:60,accuracy:70,last:'Yesterday',avatar:'violet'},
 {id:5,name:'Alex Morgan',initials:'AM',job:'Plant Engineer',course:'PSM Foundations',progress:65,accuracy:76,last:'2 days ago',avatar:'teal'},
 {id:6,name:'Jamie Davis',initials:'JD',job:'Operations Technician',course:'Management of Change',progress:82,accuracy:91,last:'Today',avatar:'amber'},
 {id:7,name:'Maya Patel',initials:'MP',job:'Safety Specialist',course:'Risk Assessment',progress:48,accuracy:73,last:'3 days ago',avatar:'rose'},
 {id:8,name:'Omar Hassan',initials:'OH',job:'Shift Supervisor',course:'PSM Foundations',progress:95,accuracy:93,last:'Today',avatar:'blue'},
];
export const activity = [20,26,35,29,27,42,37,35,44,55,67,53,45,33,33,31,41,32,29,40,45,59,58,63];
export const weakest = [
 { name:'Management of Change',accuracy:62},
 { name:'Mechanical Integrity',accuracy:68},
 { name:'Process Hazard Analysis',accuracy:71},
];
// First five workbook worksheets. Sample assessment is balanced across all five domains.
export const assessmentQuestions = Array.from({length:10},(_,i)=>aspDomains.map(d=>aspBank.filter(q=>q.domainId===d.id)[i])).flat().map((q,i)=>({...q,id:i+1}));
export const demoResult = {
 questions:assessmentQuestions,
 answers:Object.fromEntries(assessmentQuestions.slice(0,48).map((q,i)=>[q.id,([2,8,14,19,26,32,38,44].includes(i)?(q.correct+1)%4:q.correct)])),
 timeTaken:'46:18', submittedAt:'2026-10-24T09:41:00Z', kind:'assessment'
};
export const startingModules = [
 {id:'module1',title:'PSM Foundations',expanded:true,lessons:[
  {id:'lesson1',title:'Introduction to Process Safety',type:'Reading',duration:10,description:'Key principles and industry context'},
  {id:'lesson2',title:'PSM overview guide',type:'PDF',duration:15,description:'Core concepts and framework'},
  {id:'lesson3',title:'Knowledge check',type:'Quiz',duration:5,description:'10 questions'},
 ]},
 {id:'module2',title:'Management of Change',expanded:false,lessons:[]},
];
