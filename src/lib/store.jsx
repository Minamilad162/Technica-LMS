import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {startingModules,assessmentQuestions,demoResult,topics,questionPool} from '../data/mock';
import {createQuestionSet} from './questionSelection';
const Context=createContext(null);
const initial={
 role:'learner', name:'Alex Morgan', published:false, courseDetails:{title:'PSM Foundations',domain:'Process Safety',summary:'Core principles and implementation of Process Safety Management.'}, selectedTopics:['domain1'], questionCount:50,timerMode:'none',feedbackMode:'end',pool:'all', customMinutes:30,
 assessmentDomain:'domain1', assessmentQuestionCount:50, assessmentCustomCount:50, assessmentTimerMode:'whole', assessmentDurationMinutes:60, assessmentFeedbackMode:'end', assessmentPool:'all',
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
 // One domain = 50 random questions drawn ONLY from that domain by default.
 // Choosing "all" = 50 questions shared evenly across the five domains.
 function beginAssessment(overrides={}){
  const setup={...state,...overrides};
  const domainIds=setup.assessmentDomain==='all'?topics.map(t=>t.id):[setup.assessmentDomain||'domain1'];
  const {questions,fallback}=createQuestionSet({
   bank:[...questionPool,...state.addedQuestions],domainIds,
   count:setup.assessmentQuestionCount,pool:setup.assessmentPool,
   seenIds:state.seenQuestions,wrongIds:previousWrongIds(),balanced:domainIds.length>1
  });
  if(!questions.length){notify('No questions available for this domain. Choose another pool.');return false}
  if(fallback)notify('No matching questions for that pool yet. Using the full domain bank.');
  const timerMode=setup.assessmentTimerMode||'whole';
  update({assessmentSession:{startedAt:Date.now(),questionStartedAt:Date.now(),answers:{},flags:[],current:1,questionSet:questions,
   durationSeconds:timerMode==='none'?null:timerMode==='per'?60:Math.max(1,Number(setup.assessmentDurationMinutes)||60)*60,
   timerMode,feedbackMode:setup.assessmentFeedbackMode||'end',domainIds,submitted:false}});
  return true;
 }
 function beginPractice(overrides={}){
  const setup={...state,...overrides};
  const domainIds=setup.selectedTopics?.length?setup.selectedTopics:topics.map(t=>t.id);
  const {questions,fallback}=createQuestionSet({
   bank:[...questionPool,...state.addedQuestions],domainIds,
   count:setup.questionCount,pool:setup.pool,seenIds:state.seenQuestions,
   wrongIds:previousWrongIds(),balanced:false
  });
  if(!questions.length){notify('No practice questions available. Change your selection.');return false}
  if(fallback)notify('No matching questions for that pool yet. Using the full domain bank.');
  update({practiceSession:{startedAt:Date.now(),questionStartedAt:Date.now(),answers:{},flags:[],current:1,questionSet:questions,
   durationSeconds:setup.timerMode==='none'?null:setup.timerMode==='per'?60:Math.max(1,Number(setup.customMinutes)||30)*60,
   timerMode:setup.timerMode,feedbackMode:setup.feedbackMode,submitted:false}});
  return true;
 }
 function answer(kind,id,index){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>({...s,[key]:{...s[key],answers:{...s[key]?.answers,[id]:index}}}))}
 function jump(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>({...s,[key]:{...s[key],current:id,questionStartedAt:Date.now()}}))}
 function flag(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>{const current=s[key]||{}, flags=current.flags||[];return {...s,[key]:{...current,flags:flags.includes(id)?flags.filter(x=>x!==id):[...flags,id]}}})}
 function saveQuestion(id){setState(s=>({...s,savedQuestions:s.savedQuestions.includes(id)?s.savedQuestions.filter(x=>x!==id):[...s.savedQuestions,id]}))}
 function submit(kind){
  const key=kind==='practice'?'practiceSession':'assessmentSession';const s=state[key];if(!s)return;
  const questions=s.questionSet||assessmentQuestions;
  const result={answers:s.answers,flags:s.flags||[],questions,total:questions.length,timeTaken:timeString(Math.round((Date.now()-s.startedAt)/1000)),submittedAt:new Date().toISOString(),kind};
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
 const value=useMemo(()=>({state,update,notify,toast,beginAssessment,beginPractice,answer,jump,flag,saveQuestion,submit,addQuestion,addModule,editModule,deleteModule,toggleModule,addLesson,editLesson,deleteLesson,moveLesson,reset:()=>{setState(initial);notify('Demo data reset')} }),[state,toast]);
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useDemo(){return useContext(Context)}
export function timeString(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
export function calculateResult(result){const src=result||demoResult;let correct=0,incorrect=0,unanswered=0;const qs=src.questions||assessmentQuestions;qs.forEach(q=>{const a=src.answers[q.id];if(a===undefined)unanswered++;else if(a===q.correct)correct++;else incorrect++});return {correct,incorrect,unanswered,score:Math.round(correct/qs.length*100),passed:correct/qs.length>=.7,answers:src.answers,timeTaken:src.timeTaken,questions:qs,total:qs.length,flags:src.flags||[],kind:src.kind||'assessment'}}
