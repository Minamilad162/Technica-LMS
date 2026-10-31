import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {startingModules,assessmentQuestions,demoResult,topics,questionPool} from '../data/mock';
import {createQuestionSet} from './questionSelection';
import {aspCourse,findCourse} from '../data/courseCatalog';
import {assessmentSettings,prepareAssessment,canPracticeCourse} from './courseAssessment';
import {markQuestionLeft} from './quizNavigation';
import {archiveAssessment,DEMO_LEARNER_ID} from './assessmentHistory';
import {getAuthSession} from './demoAuth';
import {allAdminCourses,createCourseId,validateCourse} from './adminCourses';
import {getCourse,getCourseBank,courseDomainId,getCourseModules} from './courseWorkspace';
const Context=createContext(null);
const initial={
 role:'learner', name:'Alex Morgan', published:false, courseDetails:{title:'ASP Course',domain:'Safety Certification',summary:'Five ASP question-bank domains.'}, practiceCourseId:'asp', selectedTopics:[...aspCourse.domainIds], questionCount:50,timerMode:'none',feedbackMode:'end',pool:'all', customMinutes:30,
 assessmentCourseId:'asp', courseAssessmentSettings:{}, assessmentAttempts:{}, assessmentHistory:[],
 createdCourses:[],courseEdits:{},courseMedia:[],modules:startingModules,courseModules:{}, addedQuestions:[], seenQuestions:[], flags:[], assessmentSession:null,practiceSession:null, lastResult:null,
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
  const courseForLearner=getCourse(state,courseId);
  if(!courseForLearner||!['published','scheduled'].includes(courseForLearner.status)||
     (courseForLearner.status==='scheduled'&&Date.parse(courseForLearner.publishAt)>Date.now())){notify('This course is not published yet.');return false}
  const allBank=getCourseBank(state,courseId,questionPool);
  const attemptNo=state.assessmentAttempts?.[courseId]||0;
  const prepared=prepareAssessment({courseId,course:getCourse(state,courseId),settings:state.courseAssessmentSettings,bank:allBank});
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
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Only the Admin workspace can configure assessments.');return false}
  const course=getCourse(state,courseId);
  if(!course){notify('Course not found.');return false}
  const existing=assessmentSettings(courseId,state.courseAssessmentSettings,course);
  const next=assessmentSettings(courseId,{...state.courseAssessmentSettings,[courseId]:{...existing,...patch}},course);
  update({courseAssessmentSettings:{...state.courseAssessmentSettings,[courseId]:next}});
  notify(`${course.name} assessment settings saved (demo)`);
  return true;
 }
 function beginPractice(overrides={}){
  const setup={...state,...overrides};
  const courseId=setup.practiceCourseId||'asp';
  const practiceCourse=getCourse(state,courseId);
  if(!practiceCourse||!['published','scheduled'].includes(practiceCourse.status)||
     (practiceCourse.status==='scheduled'&&Date.parse(practiceCourse.publishAt)>Date.now())){notify('This course is not published yet.');return false}
  const bank=getCourseBank(state,courseId,questionPool);
  if(!canPracticeCourse(courseId,bank,getCourse(state,courseId))){notify('This course has no practice questions yet.');return false}
  const course=getCourse(state,courseId);
  const domainIds=[...new Set(setup.selectedTopics||[])].filter(id=>course.domainIds.includes(id));
  if(!domainIds.length){notify('Choose at least one domain to begin.');return false}
  const {questions,fallback}=createQuestionSet({
   bank:bank.filter(q=>course.domainIds.includes(q.domainId)),domainIds,
   count:setup.questionCount,pool:setup.pool,seenIds:state.seenQuestions,
   wrongIds:setup.wrongIds||previousWrongIds(),balanced:domainIds.length>1
  });
  if(!questions.length){notify('No practice questions available. Change your selection.');return false}
  if(fallback)notify('No matching questions for that pool yet. Using the full domain bank.');
  const timerMode=setup.timerMode||'none';
  update({practiceSession:{startedAt:Date.now(),questionStartedAt:Date.now(),answers:{},flags:[],visitedQuestions:[],current:1,questionSet:questions,
   courseId,courseName:course.name,practiceMode:setup.practiceMode||'custom',practiceModeLabel:setup.practiceModeLabel||'Build Your Own',
   durationSeconds:timerMode==='none'?null:timerMode==='per'?60:Math.min(180,Math.max(1,Number(setup.customMinutes)||30))*60,
   timerMode,feedbackMode:setup.feedbackMode,submitted:false}});
  return true;
 }
 function answer(kind,id,index){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>({...s,[key]:{...s[key],answers:{...s[key]?.answers,[id]:index}}}))}
 function jump(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>{const session=s[key];if(!session)return s;const count=session.questionSet?.length||0;if(!Number.isInteger(id)||id<1||id>count)return s;return {...s,[key]:{...session,visitedQuestions:markQuestionLeft(session.visitedQuestions||[],session.current,count),current:id,questionStartedAt:Date.now()}}})}
 function flag(kind,id){const key=kind==='practice'?'practiceSession':'assessmentSession';setState(s=>{const current=s[key]||{}, flags=current.flags||[];return {...s,[key]:{...current,flags:flags.includes(id)?flags.filter(x=>x!==id):[...flags,id]}}})}
 function submit(kind){
  const key=kind==='practice'?'practiceSession':'assessmentSession';const s=state[key];if(!s)return;
  const questions=s.questionSet||assessmentQuestions;
  const learnerId=getAuthSession()?.id || DEMO_LEARNER_ID;
  const result={answers:s.answers,flags:s.flags||[],questions,total:questions.length,timeTaken:timeString(Math.round((Date.now()-s.startedAt)/1000)),submittedAt:new Date().toISOString(),kind,courseId:s.courseId||'asp',courseName:s.courseName||'ASP Course',passMark:s.passMark||70,attempt:s.attempt,learnerId,...(kind==='practice'?{practiceMode:s.practiceMode||'custom',practiceModeLabel:s.practiceModeLabel||'Build Your Own'}:{})};
  const seen=[...new Set([...state.seenQuestions,...questions.map(q=>q.bankId).filter(Boolean)])];
  // Only actual assessment submissions are added to the course review history.
  const historyRecord=kind==='assessment'?archiveAssessment(result,learnerId):null;
  update({lastResult:result,seenQuestions:seen,
    ...(historyRecord?{assessmentHistory:[...(state.assessmentHistory||[]),historyRecord]}:{}),
    [key]:{...s,submitted:true}});
  notify(kind==='practice'?'Practice session completed':'Assessment submitted successfully')
 }
 function createAdminCourse(values){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin workspace required to create a course.');return null}
  const all=allAdminCourses(state),error=validateCourse(values,all);
  if(error){notify(error);return null}
  const id=createCourseId(values.name,all);
  setState(s=>({...s,createdCourses:[...(s.createdCourses||[]),{id,name:values.name.trim(),category:values.category?.trim()||'General Engineering',description:values.description?.trim()||'',status:values.status||'draft',publishAt:values.status==='scheduled'?values.publishAt:null,domainIds:[courseDomainId(id)],createdAt:new Date().toISOString()}]}));
  notify(`${values.name} created as ${values.status||'draft'} (demo)`);
  return id;
 }
 function editAdminCourse(courseId,values){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin workspace required to edit courses.');return null}
  const all=allAdminCourses(state),original=all.find(c=>c.id===courseId);
  if(!original){notify('Course not found');return null}
  const updated={...original,...values};
  const error=validateCourse(updated,all,courseId);
  if(error){notify(error);return null}
  if(original.builtIn){setState(s=>({...s,courseEdits:{...s.courseEdits,[courseId]:{...(s.courseEdits?.[courseId]||{}),...values}}}))}
  else setState(s=>({...s,createdCourses:(s.createdCourses||[]).map(c=>c.id===courseId?{...c,...values}:c)}));
  notify(`${updated.name} updated (demo)`);
  return courseId;
 }
 function addCourseMedia(record){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin workspace required to upload materials');return false}
  setState(s=>({...s,courseMedia:[...(s.courseMedia||[]),record]}));return true;
 }
 function deleteCourseMedia(mediaId){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin workspace required to delete materials');return false}
  setState(s=>({...s,courseMedia:(s.courseMedia||[]).filter(m=>m.id!==mediaId)}));return true;
 }
 function importQuestions(courseId,questions){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin access required');return {added:0,duplicates:0}}
  const existing=getCourseBank(state,courseId,questionPool);
  const hashes=new Set(existing.map(q=>String(q.prompt).trim().toLowerCase()));
  const unique=[];let duplicates=0;
  for(const q of questions){const hash=String(q.prompt).trim().toLowerCase();if(!hash||hashes.has(hash)){duplicates++;continue}hashes.add(hash);unique.push({...q,courseId,domainId:q.domainId||courseDomainId(courseId),topic:q.topic||'General questions',id:`import-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`,bankId:`import-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`})}
  setState(s=>({...s,addedQuestions:[...(s.addedQuestions||[]),...unique]}));
  notify(`${unique.length} questions imported into ${getCourse(state,courseId)?.name||courseId}; ${duplicates} duplicates skipped.`);
  return {added:unique.length,duplicates};
 }
 function addQuestion(courseId,question){
  if(getAuthSession()?.role!=='admin'||state.role!=='admin'){notify('Admin access required');return}
  const id=`custom-${globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)}`;
  setState(s=>({...s,addedQuestions:[...(s.addedQuestions||[]),{...question,id,bankId:id,courseId,domainId:question.domainId||courseDomainId(courseId),topic:question.topic||'General questions'}]}));
  notify('Question added to this course');
 }
 const mutateModules=(courseId,fn)=>setState(s=>{const old=getCourseModules(s,courseId);const next=fn(old);return {...s,courseModules:{...(s.courseModules||{}),[courseId]:next},...(courseId==='asp'?{modules:next}:{})}});
 function addModule(courseId){const id=`module-${globalThis.crypto?.randomUUID?.()||Date.now()}`;
  mutateModules(courseId,arr=>[...arr.map(m=>({...m,expanded:false})),{id,title:'New module',expanded:true,lessons:[]}]);notify('Module added to course');}
 function editModule(courseId,id,title){mutateModules(courseId,arr=>arr.map(m=>m.id===id?{...m,title}:m))}
 function deleteModule(courseId,id){mutateModules(courseId,arr=>arr.filter(m=>m.id!==id));notify('Module removed')}
 function toggleModule(courseId,id){mutateModules(courseId,arr=>arr.map(m=>m.id===id?{...m,expanded:!m.expanded}:m))}
 function addLesson(courseId,moduleId,lesson){mutateModules(courseId,arr=>arr.map(m=>m.id===moduleId?{...m,expanded:true,lessons:[...m.lessons,{id:`lesson-${globalThis.crypto?.randomUUID?.()||Date.now()}`,...lesson}]}:m));notify('Lesson added to course')}
 function editLesson(courseId,moduleId,id,lesson){mutateModules(courseId,arr=>arr.map(m=>m.id===moduleId?{...m,lessons:m.lessons.map(l=>l.id===id?{...l,...lesson}:l)}:m));notify('Lesson updated')}
 function deleteLesson(courseId,moduleId,id){mutateModules(courseId,arr=>arr.map(m=>m.id===moduleId?{...m,lessons:m.lessons.filter(l=>l.id!==id)}:m));notify('Lesson removed')}
 function moveLesson(courseId,moduleId,id,direction){mutateModules(courseId,arr=>arr.map(m=>{if(m.id!==moduleId)return m;const result=[...m.lessons],i=result.findIndex(l=>l.id===id),j=i+direction;if(i>=0&&j>=0&&j<result.length)[result[i],result[j]]=[result[j],result[i]];return {...m,lessons:result}}))}
 const value=useMemo(()=>({state,update,notify,toast,beginAssessment,beginPractice,answer,jump,flag,submit,updateAssessmentSettings,createAdminCourse,editAdminCourse,addCourseMedia,deleteCourseMedia,addQuestion,importQuestions,addModule,editModule,deleteModule,toggleModule,addLesson,editLesson,deleteLesson,moveLesson,reset:()=>{setState(initial);notify('Demo data reset')} }),[state,toast]);
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useDemo(){return useContext(Context)}
export function timeString(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
export function calculateResult(result){const src=result||demoResult;let correct=0,incorrect=0,unanswered=0;const qs=src.questions||assessmentQuestions;qs.forEach(q=>{const a=src.answers[q.id];if(a===undefined)unanswered++;else if(a===q.correct)correct++;else incorrect++});const passMark=src.passMark||70;return {correct,incorrect,unanswered,score:qs.length?Math.round(correct/qs.length*100):0,passed:!!qs.length&&correct/qs.length>=passMark/100,passMark,courseName:src.courseName||'ASP Course',courseId:src.courseId||'asp',answers:src.answers,timeTaken:src.timeTaken,questions:qs,total:qs.length,flags:src.flags||[],kind:src.kind||'assessment'}}
