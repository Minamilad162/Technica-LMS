import React,{useEffect,useState}from'react';import{Routes,Route,Navigate,useLocation}from'react-router-dom';
import Layout from './components/Layout';
import {useDemo} from './lib/store';
import MotionSystem from './components/MotionSystem';
import AuthPage,{DemoPolicyPage} from './pages/AuthPage';
import {getAuthSession,restorePortalAccount,subscribeToPortalAuth} from './lib/portalAuth';
import HomePage from './pages/HomePage';import LearningPlayer,{LearningLibrary} from './pages/LearningPage';import PracticePage from './pages/PracticePage';import QuizPage from './pages/QuizPage';
import AnalyticsPage from './pages/AnalyticsPage';import BuilderPage from './pages/BuilderPage';
import LiveCoursesPage from './production/LiveCoursesPage';
import LiveCourseBuilder from './production/LiveCourseBuilder';
import {LiveLearningLibrary,LiveLearningCourse} from './production/LiveLearning';
import LivePracticePortal from './production/LivePracticePortal';
import LiveLearnerPortal from './production/LiveLearnerPortal.jsx';
import LiveMockPortal from './production/LiveMockPortal';
import AdminToolsPortal from './production/AdminToolsPortal';
import LiveLearnerProgress from './production/LiveLearnerProgress';
import LiveReleaseReadiness from './production/LiveReleaseReadiness';import AssessmentOverview from './pages/AssessmentOverview';import ResultsPage from './pages/ResultsPage';import PracticeResultsPage from './pages/PracticeResultsPage';import LearnersPage from './pages/LearnersPage';import QuestionBankPage from './pages/QuestionBankPage';import CoursesPage from './pages/CoursesPage';
// Local-only QA retains the accepted Demo authoring browser regression suite.
// In the normal deployed site, Courses/Builder default to genuine Supabase.
// Explicit "legacyPreview=1" shows the historic unsynced authoring tools.
const legacyBrowserQa=import.meta.env.DEV&&import.meta.env.VITE_LOCAL_QA_DEMO==='1';
function LegacyPreviewWarning({children}){return <><section role="note" style={{margin:'16px 24px',padding:12,border:'1px solid #e5d5ae',borderRadius:10,background:'#fff9e8',fontSize:12,color:'#745a29'}}><strong>Local Demo preview only.</strong> Changes here are saved in this browser, NOT Supabase. Return to <a href="#/courses">Live Courses</a> or <a href="#/builder">Live Course Builder</a> to edit the database.</section>{children}</>;}
function AdminOnly({children}){const {state}=useDemo();return getAuthSession()?.role==='admin'&&state.role==='admin'?children:<Navigate to='/home' replace/>}
function RoutePage({children,standalone=false}){return <><MotionSystem/><Layout standalone={standalone} onLogout={()=>{window.dispatchEvent(new Event('technica-demo-logout'))}}>{children}</Layout></>}
export default function App(){
 const l=useLocation(),{update}=useDemo();
 const legacyPreview=legacyBrowserQa||new URLSearchParams(l.search).get('legacyPreview')==='1';
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
 <Route path="/course-catalog" element={<RoutePage><LiveLearnerPortal initialScreen="courses"/></RoutePage>}/>
 <Route path="/course-catalog/:courseId" element={<RoutePage><LiveLearnerPortal initialScreen="course"/></RoutePage>}/>
 <Route path="/checkout/:courseId" element={<RoutePage><LiveLearnerPortal initialScreen="checkout"/></RoutePage>}/>
 <Route path="/my-learning" element={<RoutePage>{legacyPreview?<LegacyPreviewWarning><LearningLibrary/></LegacyPreviewWarning>:<LiveLearnerPortal initialScreen="learning"/>}</RoutePage>}/>
 <Route path="/my-practice" element={<RoutePage><LiveLearnerPortal initialScreen="history"/></RoutePage>}/>
 <Route path="/my-progress" element={<RoutePage><LiveLearnerProgress/></RoutePage>}/>
 <Route path="/learning/course/:courseId" element={<RoutePage><LiveLearningCourse/></RoutePage>}/>
 <Route path="/learning/process-safety-foundations" element={<RoutePage><LegacyPreviewWarning><LearningPlayer/></LegacyPreviewWarning></RoutePage>}/>
 <Route path="/practice" element={<RoutePage>{legacyPreview?<LegacyPreviewWarning><PracticePage/></LegacyPreviewWarning>:<LiveLearnerPortal initialScreen="practice"/>}</RoutePage>}/>
 <Route path="/practice/live" element={<RoutePage standalone><LivePracticePortal/></RoutePage>}/>
 <Route path="/practice/session" element={<RoutePage standalone><QuizPage kind="practice"/></RoutePage>}/>
 <Route path="/admin-tools" element={<AdminOnly><RoutePage><AdminToolsPortal/></RoutePage></AdminOnly>}/>
 <Route path="/analytics" element={<AdminOnly><RoutePage><AnalyticsPage/></RoutePage></AdminOnly>}/>
 <Route path="/builder" element={<AdminOnly><RoutePage>{legacyPreview?(legacyBrowserQa?<BuilderPage/>:<LegacyPreviewWarning><BuilderPage/></LegacyPreviewWarning>):<LiveCourseBuilder/>}</RoutePage></AdminOnly>}/>
 <Route path="/courses" element={<AdminOnly><RoutePage>{legacyPreview?(legacyBrowserQa?<CoursesPage/>:<LegacyPreviewWarning><CoursesPage/></LegacyPreviewWarning>):<LiveCoursesPage/>}</RoutePage></AdminOnly>}/>
 <Route path="/reports" element={<AdminOnly><RoutePage><AnalyticsPage/></RoutePage></AdminOnly>}/>
 <Route path="/release-readiness" element={<AdminOnly><RoutePage><LiveReleaseReadiness/></RoutePage></AdminOnly>}/>
 <Route path="/assessments" element={<RoutePage><AssessmentOverview/></RoutePage>}/>
 <Route path="/assessments/mock/live" element={<RoutePage standalone><LiveMockPortal/></RoutePage>}/>
 <Route path="/assessments/take" element={<RoutePage standalone><QuizPage kind="assessment"/></RoutePage>}/>
 <Route path="/results" element={<RoutePage><ResultsPage/></RoutePage>}/>
 <Route path="/practice/results" element={<RoutePage><PracticeResultsPage/></RoutePage>}/>
 <Route path="/learners" element={<AdminOnly><RoutePage><LearnersPage/></RoutePage></AdminOnly>}/>
 <Route path="/question-bank" element={<AdminOnly><RoutePage><QuestionBankPage/></RoutePage></AdminOnly>}/>
 <Route path="/asp-review" element={<AdminOnly><Navigate to="/question-bank?course=asp&review=1" replace/></AdminOnly>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
