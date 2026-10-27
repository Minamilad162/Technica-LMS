import React,{useEffect,useState}from'react';import{Routes,Route,Navigate,useLocation}from'react-router-dom';
import Layout from './components/Layout';
import {useDemo} from './lib/store';
import MotionSystem from './components/MotionSystem';
import AuthPage,{DemoPolicyPage} from './pages/AuthPage';
import {getAuthSession} from './lib/demoAuth';
import HomePage from './pages/HomePage';import LearningPlayer,{LearningLibrary} from './pages/LearningPage';import PracticePage from './pages/PracticePage';import QuizPage from './pages/QuizPage';
import AnalyticsPage from './pages/AnalyticsPage';import BuilderPage from './pages/BuilderPage';import AssessmentOverview from './pages/AssessmentOverview';import ResultsPage from './pages/ResultsPage';import PracticeResultsPage from './pages/PracticeResultsPage';import LearnersPage from './pages/LearnersPage';import QuestionBankPage from './pages/QuestionBankPage';import CoursesPage from './pages/CoursesPage';
function AdminOnly({children}){const {state}=useDemo();return getAuthSession()?.role==='admin'&&state.role==='admin'?children:<Navigate to='/home' replace/>}
function RoutePage({children,standalone=false}){return <><MotionSystem/><Layout standalone={standalone} onLogout={()=>{window.dispatchEvent(new Event('technica-demo-logout'))}}>{children}</Layout></>}
export default function App(){const l=useLocation();const[auth,setAuth]=useState(getAuthSession);useEffect(()=>{window.scrollTo({top:0,behavior:'instant'})},[l.pathname]);useEffect(()=>{const fn=()=>setAuth(null);window.addEventListener('technica-demo-logout',fn);return()=>window.removeEventListener('technica-demo-logout',fn)},[]);
 if(!auth){return <Routes>
 <Route path="/login" element={<><MotionSystem/><AuthPage mode="login" onAuthenticated={setAuth}/></>}/>
 <Route path="/signup" element={<><MotionSystem/><AuthPage mode="signup" onAuthenticated={setAuth}/></>}/>
 <Route path="/forgot-password" element={<><MotionSystem/><AuthPage mode="forgot" onAuthenticated={setAuth}/></>}/>
 <Route path="/terms" element={<DemoPolicyPage kind="terms"/>}/>
 <Route path="/privacy" element={<DemoPolicyPage kind="privacy"/>}/>
 <Route path="*" element={<Navigate to="/login" state={{from:l}} replace/>}/>
 </Routes>}
 return <Routes>
 <Route path="/login" element={<Navigate to="/home" replace/>}/>
 <Route path="/signup" element={<Navigate to="/home" replace/>}/>
 <Route path="/" element={<Navigate to="/home" replace/>}/>
 <Route path="/home" element={<RoutePage><HomePage/></RoutePage>}/>
 <Route path="/my-learning" element={<RoutePage><LearningLibrary/></RoutePage>}/>
 <Route path="/learning/process-safety-foundations" element={<RoutePage><LearningPlayer/></RoutePage>}/>
 <Route path="/practice" element={<RoutePage><PracticePage/></RoutePage>}/>
 <Route path="/practice/session" element={<RoutePage standalone><QuizPage kind="practice"/></RoutePage>}/>
 <Route path="/analytics" element={<AdminOnly><RoutePage><AnalyticsPage/></RoutePage></AdminOnly>}/>
 <Route path="/builder" element={<AdminOnly><RoutePage><BuilderPage/></RoutePage></AdminOnly>}/>
 <Route path="/courses" element={<AdminOnly><RoutePage><CoursesPage/></RoutePage></AdminOnly>}/>
 <Route path="/reports" element={<AdminOnly><RoutePage><AnalyticsPage/></RoutePage></AdminOnly>}/>
 <Route path="/assessments" element={<RoutePage><AssessmentOverview/></RoutePage>}/>
 <Route path="/assessments/take" element={<RoutePage standalone><QuizPage kind="assessment"/></RoutePage>}/>
 <Route path="/results" element={<RoutePage><ResultsPage/></RoutePage>}/>
 <Route path="/practice/results" element={<RoutePage><PracticeResultsPage/></RoutePage>}/>
 <Route path="/learners" element={<AdminOnly><RoutePage><LearnersPage/></RoutePage></AdminOnly>}/>
 <Route path="/question-bank" element={<AdminOnly><RoutePage><QuestionBankPage/></RoutePage></AdminOnly>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
