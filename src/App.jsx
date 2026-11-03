import React,{useEffect,useState}from'react';import{Routes,Route,Navigate,useLocation}from'react-router-dom';
import Layout from './components/Layout';
import {useDemo} from './lib/store';
import MotionSystem from './components/MotionSystem';
import AuthPage,{DemoPolicyPage} from './pages/AuthPage';
import {getAuthSession,restorePortalAccount,subscribeToPortalAuth} from './lib/portalAuth';
import HomePage from './pages/HomePage';import LearningPlayer,{LearningLibrary} from './pages/LearningPage';import PracticePage from './pages/PracticePage';import QuizPage from './pages/QuizPage';
import AnalyticsPage from './pages/AnalyticsPage';import BuilderPage from './pages/BuilderPage';import AssessmentOverview from './pages/AssessmentOverview';import ResultsPage from './pages/ResultsPage';import PracticeResultsPage from './pages/PracticeResultsPage';import LearnersPage from './pages/LearnersPage';import QuestionBankPage from './pages/QuestionBankPage';import CoursesPage from './pages/CoursesPage';
function AdminOnly({children}){const {state}=useDemo();return getAuthSession()?.role==='admin'&&state.role==='admin'?children:<Navigate to='/home' replace/>}
function RoutePage({children,standalone=false}){return <><MotionSystem/><Layout standalone={standalone} onLogout={()=>{window.dispatchEvent(new Event('technica-demo-logout'))}}>{children}</Layout></>}
export default function App(){
 const l=useLocation(),{update}=useDemo();
 const [auth,setAuth]=useState(null),[authLoading,setAuthLoading]=useState(true),[authError,setAuthError]=useState('');
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'})},[l.pathname]);
 useEffect(()=>{
  let active=true;
  restorePortalAccount().then(account=>{
   if(active&&account){setAuth(account);update({name:account.name,role:account.role});}
  }).catch(error=>{if(active)setAuthError(error?.message||'Unable to verify this session.');})
    .finally(()=>{if(active)setAuthLoading(false);});
  let unsubscribe=()=>{};
  try{unsubscribe=subscribeToPortalAuth(()=>{if(active){setAuth(null);update({role:'learner'});}});}
  catch(error){if(active)setAuthError(error?.message||'Supabase configuration is unavailable.');}
  const fn=()=>{setAuth(null);update({role:'learner'});};
  window.addEventListener('technica-demo-logout',fn);
  return()=>{active=false;unsubscribe();window.removeEventListener('technica-demo-logout',fn);};
 },[]);
 if(authLoading)return <div className="auth-page" role="status"><div className="auth-form-card" style={{maxWidth:420,textAlign:'center',padding:30}}>Verifying your Technica LMS session…</div></div>;

 if(!auth){return <Routes>
 <Route path="/login" element={<><MotionSystem/><AuthPage mode="login" onAuthenticated={setAuth}/></>}/>
 <Route path="/signup" element={<Navigate to="/login" replace/>}/>
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
 <Route path="/asp-review" element={<AdminOnly><Navigate to="/question-bank?course=asp&review=1" replace/></AdminOnly>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
