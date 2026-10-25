import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {startingModules,assessmentQuestions,demoResult,topics,questionPool} from '../data/mock';
import {createQuestionSet} from './questionSelection';
import {aspCourse,findCourse} from '../data/courseCatalog';
import {assessmentSettings,prepareAssessment,canPracticeCourse} from './courseAssessment';
import {markQuestionLeft} from './quizNavigation';
const Context=createContext(null);
const initial={
 role:'learner', name:'Alex Morgan', published:false, courseDetails:{title:'ASP Course',domain:'Safety Certification',summary:'Five ASP question-bank domains.'}, practiceCourseId:'asp', selectedTopics:[...aspCourse.domainIds], questionCount:50,timerMode:'none',feedbackMode:'end',pool:'all', customMinutes:30,
 assessmentCourseId:'asp', courseAssessmentSettings:{}, assessmentAttempts:{},
 modules:startingModules, addedQuestions:[], savedQuestions:[], seenQuestions:[], flags:[], assessmentSession:null,practiceSession:null, lastResult:null,
 notifications:[{id:1,text:'Your PSM Foundations lesson is ready to continue.',unread:true},{id:2,text:'12 questions are ready for your mistakes review.',unread:true}],
};
function load(){try{const v=JSON.parse(localStorage.getItem('technica-lms-demo-v1-asp5'));return v?{...initial,...v}:initial}catch{return initial}}
export function DemoProvider({children}) {
 const [state,setState]=useState(load);
 const [toast,setToast]=useState('');
 useEffect(()=>{localStorage.setItem('technica-lms-demo-v1-asp5',JSON.stringify(state))},[state]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3400);return()=>clearTimeout(timer)},[toast]);
 const update=(patch)=>setState(s=>({...s,...patch}));
 const notify=(message)=>setToast(message);
 function previousWrongIds() {
  const previous=state.lastResult;
  return (previous?.questions||[]).filter(q=>previous.answers?.[q.id]!==undefined&&previous.answers[q.id]!==q.correct).map(q=>q.bankId||q.id);
 }
 // Learners select a COURSE. Assessment parameters always come from the admin-owned
 // course configuration, never the old learner-customisable assessment fields.
 function beginAssessment(courseId=state.assessmentCourseId){
  if(state.role==='admin'){notify('Switch to Learner workspace to take an assessment.');return false}
  const allBank=[...questionPool,...state.addedQuestions];
  const attemptNo=state.assessmentAttempts?.[courseId]||0;
  const prepared=prepareAssessment({courseId,settings:state.courseAssessmentSettings,bank:allBank,attempts:attemptNo});
  if(prepared.error){notify(prepared.error);return false}
  const {course,config,questions}=prepared;
  update({assessmentCourseId:courseId,assessmentAttempts:{...state.assessmentAttempts,[courseId]:attemptNo+1},assessmentSession:{
   startedAt:Date.now(),questionStartedAt:Date.now(),answers:{},flags:[],visitedQuestions:[],current:1,questionSet:questions,
   courseId,courseName:course.name,passMark:config.passMark,attempt:attemptNo+1,
   durationSeconds:config.durationMinutes*60,timerMode:'whole',feedbackMode:'end',domainIds:config.domainIds,submitted:false
  }});
  return true;
 }
 function updateAssessmentSettings(courseId,patch){
  if(state.role!=='admin'){notify('Only the Admin workspace can configure assessments.');return false}
  const course=findCourse(courseId);
  if(!course||!course.domainIds.length){notify('Add a question bank before configuring this course.');return false}
  const existing=assessmentSettings(courseId,state.courseAssessmentSettings);
  const next=assessmentSettings(courseId,{...state.courseAssessmentSettings,[courseId]:{...existing,...patch}});
  update({courseAssessmentSettings:{...state.courseAssessmentSettings,[courseId]:next}});
  notify(`${course.name} assessment settings saved (demo)`);
  return true;
 }
 function beginPractice(overrides={}){
  const setup={...state,...overrides};
  const courseId=setup.practiceCourseId||'asp';
  const bank=[...questionPool,...state.addedQuestions];
  if(!canPracticeCourse(courseId,bank)){notify('This course has no practice questions yet.');return false}
  const course=findCourse(courseId);
  const domainIds=[...new Set(setup.selectedTopics||[])].filter(id=>course.domainIds.includes(id));
  if(!domainIds.length){notify('Choose at least one domain to begin.');return false}
  const {questions,fallback}=createQuestionSet({
   bank:bank.filter(q=>course.domainIds.includes(q.domainId)),domainIds,
   count:setup.questionCount,pool:setup.pool,seenIds:state.seenQuestions,
   wrongIds:previousWrongIds(),balanced:domainIds.length>1
  });
  if(!questions.length){notify('No practice questions available. Change your selection.');return false}
  if(fallback)notify('No matching questions for that pool yet. Using the full domain bank.');
  const timerMode=setup.timerMode||'none';
  update({practiceSession:{startedAt:Date.now(),questionStartedAt:Date.now(),answers:{},flags:[],visitedQuestions:[],current:1,questionSet:questions,
   courseId,courseName:course.name,
   durationSeconds:timerMode==='none'?null:timerMode==='per'?60:Math.min(180,Math.max(1,Number(setup.customMinutes)||30))*60,
   timerMode,feedbackMode:setup.feedbackMode,submitted:false}});
  return true;
 }
 function answer(kind,id,index){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>({...s,[key]:{...s[key],answers:{...s[key]?.answers,[id]:index}}}))}
 function jump(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>{const session=s[key];if(!session)return s;const count=session.questionSet?.length||0;if(!Number.isInteger(id)||id<1||id>count)return s;return {...s,[key]:{...session,visitedQuestions:markQuestionLeft(session.visitedQuestions||[],session.current,count),current:id,questionStartedAt:Date.now()}}})}
 function flag(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>{const current=s[key]||{}, flags=current.flags||[];return {...s,[key]:{...current,flags:flags.includes(id)?flags.filter(x=>x!==id):[...flags,id]}}})}
 function saveQuestion(id){setState(s=>({...s,savedQuestions:s.savedQuestions.includes(id)?s.savedQuestions.filter(x=>x!==id):[...s.savedQuestions,id]}))}
 function submit(kind){
  const key=kind==='practice'?'practiceSession':'assessmentSession';const s=state[key];if(!s)return;
  const questions=s.questionSet||assessmentQuestions;
  const result={answers:s.answers,flags:s.flags||[],questions,total:questions.length,timeTaken:timeString(Math.round((Date.now()-s.startedAt)/1000)),submittedAt:new Date().toISOString(),kind,courseId:s.courseId||'asp',courseName:s.courseName||'ASP Course',passMark:s.passMark||70,attempt:s.attempt};
  const seen=[...new Set([...state.seenQuestions,...questions.map(q=>q.bankId).filter(Boolean)])];
  update({lastResult:result,seenQuestions:seen,[key]:{...s,submitted:true}});
  notify(kind==='practice'?'Practice session completed':'Assessment submitted successfully')
 }
 function addQuestion(question){setState(s=>({...s,addedQuestions:[...s.addedQuestions,{id:'custom-'+Date.now(),bankId:'custom-'+Date.now(),domainId:question.domainId||'domain1',topic:question.topic||'Domain 1',...question}]}));notify('Question added to the demo bank')}
 function addModule(){const id='module'+Date.now();setState(s=>({...s,modules:[...s.modules.map(m=>({...m,expanded:false})),{id,title:'New module',expanded:true,lessons:[]}]}));notify('New module added')}
 function editModule(id,title){setState(s=>({...s,modules:s.modules.map(m=>m.id===id?{...m,title}:m)}))}
 function deleteModule(id){setState(s=>({...s,modules:s.modules.filter(m=>m.id!==id)}));notify('Module removed')}
 function toggleModule(id){setState(s=>({...s,modules:s.modules.map(m=>m.id===id?{...m,expanded:!m.expanded}:m)}))}
 function addLesson(moduleId,lesson){setState(s=>({...s,modules:s.modules.map(m=>m.id===moduleId?{...m,expanded:true,lessons:[...m.lessons,{id:'lesson'+Date.now(),...lesson}]}:m)}));notify('Lesson added to course')}
 function editLesson(moduleId,id,lesson){setState(s=>({...s,modules:s.modules.map(m=>m.id===moduleId?{...m,lessons:m.lessons.map(l=>l.id===id?{...l,...lesson}:l)}:m)}));notify('Lesson updated')}
 function deleteLesson(moduleId,id){setState(s=>({...s,modules:s.modules.map(m=>m.id===moduleId?{...m,lessons:m.lessons.filter(l=>l.id!==id)}:m)}));notify('Lesson removed')}
 function moveLesson(moduleId,id,direction){setState(s=>({...s,modules:s.modules.map(m=>{if(m.id!==moduleId)return m;let arr=[...m.lessons];const i=arr.findIndex(l=>l.id===id),j=i+direction;if(i>=0&&j>=0&&j<arr.length)[arr[i],arr[j]]=[arr[j],arr[i]];return {...m,lessons:arr}})}))}
 const value=useMemo(()=>({state,update,notify,toast,beginAssessment,beginPractice,answer,jump,flag,saveQuestion,submit,updateAssessmentSettings,addQuestion,addModule,editModule,deleteModule,toggleModule,addLesson,editLesson,deleteLesson,moveLesson,reset:()=>{setState(initial);notify('Demo data reset')} }),[state,toast]);
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useDemo(){return useContext(Context)}
export function timeString(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
export function calculateResult(result){const src=result||demoResult;let correct=0,incorrect=0,unanswered=0;const qs=src.questions||assessmentQuestions;qs.forEach(q=>{const a=src.answers[q.id];if(a===undefined)unanswered++;else if(a===q.correct)correct++;else incorrect++});const passMark=src.passMark||70;return {correct,incorrect,unanswered,score:qs.length?Math.round(correct/qs.length*100):0,passed:!!qs.length&&correct/qs.length>=passMark/100,passMark,courseName:src.courseName||'ASP Course',courseId:src.courseId||'asp',answers:src.answers,timeTaken:src.timeTaken,questions:qs,total:qs.length,flags:src.flags||[],kind:src.kind||'assessment'}}
