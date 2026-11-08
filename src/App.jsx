import React,{useEffect,useState}from'react';import{Routes,Route,Navigate,useLocation}from'react-router-dom';
import Layout from './components/Layout';
import {useDemo} from './lib/store';
import MotionSystem from './components/MotionSystem';
import AuthPage,{DemoPolicyPage} from './pages/AuthPage';
import {getAuthSession,restorePortalAccount,subscribeToPortalAuth} from './lib/portalAuth';
// Route-level code splitting: do not fetch the question bank, calculator,
// admin builders or mock engine when a learner visits Courses or My Learning.
import HomePage from './pages/HomePage';
const LearningPlayer=React.lazy(()=>import('./pages/LearningPage'));
const LearningLibrary=React.lazy(()=>import('./pages/LearningPage').then(m=>({default:m.LearningLibrary})));
const PracticePage=React.lazy(()=>import('./pages/PracticePage'));
const QuizPage=React.lazy(()=>import('./pages/QuizPage'));
const AnalyticsPage=React.lazy(()=>import('./pages/AnalyticsPage'));
const BuilderPage=React.lazy(()=>import('./pages/BuilderPage'));
const LiveCoursesPage=React.lazy(()=>import('./production/LiveCoursesPage'));
const LiveCourseBuilder=React.lazy(()=>import('./production/LiveCourseBuilder'));
const LiveLearningCourse=React.lazy(()=>import('./production/LiveLearning').then(m=>({default:m.LiveLearningCourse})));
const LivePracticePortal=React.lazy(()=>import('./production/LivePracticePortal'));
const LiveLearnerPortal=React.lazy(()=>import('./production/LiveLearnerPortal.jsx'));
const LiveMockPortal=React.lazy(()=>import('./production/LiveMockPortal'));
const AdminToolsPortal=React.lazy(()=>import('./production/AdminToolsPortal'));
const AdminCoursePreview=React.lazy(()=>import('./production/AdminCoursePreview.jsx'));
const QualificationsWorkspace=React.lazy(()=>import('./qualification/QualificationsWorkspace.jsx'));
const LiveLearnerProgress=React.lazy(()=>import('./production/LiveLearnerProgress'));
const LiveReleaseReadiness=React.lazy(()=>import('./production/LiveReleaseReadiness'));
const LiveExamPracticeHub=React.lazy(()=>import('./production/LiveExamPracticeHub.jsx'));
const ResultsPage=React.lazy(()=>import('./pages/ResultsPage'));
const PracticeResultsPage=React.lazy(()=>import('./pages/PracticeResultsPage'));
const LearnersPage=React.lazy(()=>import('./pages/LearnersPage'));
const QuestionBankPage=React.lazy(()=>import('./pages/QuestionBankPage'));
const CoursesPage=React.lazy(()=>import('./pages/CoursesPage'));
// Local-only QA retains the accepted Demo authoring browser regression suite.
// In the normal deployed site, Courses/Builder default to genuine Supabase.
// Explicit "legacyPreview=1" shows the historic unsynced authoring tools.
const legacyBrowserQa=import.meta.env.DEV&&import.meta.env.VITE_LOCAL_QA_DEMO==='1';
function LegacyPreviewWarning({children}){return <><section role="note" style={{margin:'16px 24px',padding:12,border:'1px solid #e5d5ae',borderRadius:10,background:'#fff9e8',fontSize:12,color:'#745a29'}}><strong>Local Demo preview only.</strong> Changes here are saved in this browser, NOT Supabase. Return to <a href="#/courses">Live Courses</a> or <a href="#/builder">Live Course Builder</a> to edit the database.</section>{children}</>;}
function AdminOnly({children}){const {state}=useDemo();return getAuthSession()?.role==='admin'&&state.role==='admin'?children:<Navigate to='/home' replace/>}
function RoutePage({children,standalone=false}){return <><MotionSystem/><Layout standalone={standalone} onLogout={()=>{window.dispatchEvent(new Event('technica-demo-logout'))}}><React.Suspense fallback={<div className="route-chunk-fallback" role="status">Loading the selected page…</div>}>{children}</React.Suspense></Layout></>}
export default function App(){
 const l=useLocation(),{update}=useDemo();
 const legacyPreview=legacyBrowserQa; // Private historical QA never opens from a production query parameter.
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
 <Route path="/home" element={<RoutePage>{legacyBrowserQa?<HomePage/>:<LiveLearnerPortal initialScreen="learning"/>}</RoutePage>}/>
 <Route path="/course-catalog" element={<RoutePage><LiveLearnerPortal initialScreen="courses"/></RoutePage>}/>
 <Route path="/course-catalog/:courseId" element={<RoutePage><LiveLearnerPortal initialScreen="course"/></RoutePage>}/>
 <Route path="/subscription-plans" element={<RoutePage><LiveLearnerPortal initialScreen="subscription"/></RoutePage>}/>
 <Route path="/checkout/:courseId" element={<Navigate to="/subscription-plans" replace/>}/>
 <Route path="/my-learning" element={<RoutePage>{legacyPreview?<LegacyPreviewWarning><LearningLibrary/></LegacyPreviewWarning>:<LiveLearnerPortal initialScreen="learning"/>}</RoutePage>}/>
 <Route path="/qualifications" element={<RoutePage><QualificationsWorkspace/></RoutePage>}/>
 <Route path="/my-practice" element={<RoutePage><LiveLearnerPortal initialScreen="history"/></RoutePage>}/>
 <Route path="/my-progress" element={<RoutePage><LiveLearnerProgress/></RoutePage>}/>
 <Route path="/learning/course/:courseId" element={<RoutePage><LiveLearningCourse/></RoutePage>}/>
 <Route path="/learning/process-safety-foundations" element={legacyBrowserQa?<RoutePage><LegacyPreviewWarning><LearningPlayer/></LegacyPreviewWarning></RoutePage>:<Navigate to="/my-learning" replace/>}/>
 <Route path="/practice" element={legacyBrowserQa?<RoutePage><LegacyPreviewWarning><PracticePage/></LegacyPreviewWarning></RoutePage>:<Navigate to="/assessments?tab=practice" replace/>}/>
 <Route path="/practice/live" element={<RoutePage standalone><LivePracticePortal/></RoutePage>}/>
 <Route path="/practice/session" element={legacyBrowserQa?<RoutePage standalone><QuizPage kind="practice"/></RoutePage>:<Navigate to="/assessments?tab=practice" replace/>}/>
 <Route path="/admin-tools" element={<AdminOnly><RoutePage><AdminToolsPortal/></RoutePage></AdminOnly>}/>
 <Route path="/admin/course-preview/:courseId" element={<AdminOnly><RoutePage><AdminCoursePreview/></RoutePage></AdminOnly>}/>
 <Route path="/analytics" element={<AdminOnly><Navigate to="/admin-tools?tab=overview" replace/></AdminOnly>}/>
 <Route path="/builder" element={<AdminOnly><RoutePage>{legacyPreview?(legacyBrowserQa?<BuilderPage/>:<LegacyPreviewWarning><BuilderPage/></LegacyPreviewWarning>):<LiveCourseBuilder/>}</RoutePage></AdminOnly>}/>
 <Route path="/courses" element={<AdminOnly><RoutePage>{legacyPreview?(legacyBrowserQa?<CoursesPage/>:<LegacyPreviewWarning><CoursesPage/></LegacyPreviewWarning>):<LiveCoursesPage/>}</RoutePage></AdminOnly>}/>
 <Route path="/reports" element={<AdminOnly><Navigate to="/admin-tools?tab=overview" replace/></AdminOnly>}/>
 <Route path="/release-readiness" element={<AdminOnly><RoutePage><LiveReleaseReadiness/></RoutePage></AdminOnly>}/>
 <Route path="/assessments" element={<RoutePage><LiveExamPracticeHub/></RoutePage>}/>
 <Route path="/assessments/mock/live" element={<RoutePage standalone><LiveMockPortal/></RoutePage>}/>
 <Route path="/assessments/take" element={legacyBrowserQa?<RoutePage standalone><QuizPage kind="assessment"/></RoutePage>:<Navigate to="/assessments?tab=mock" replace/>}/>
 <Route path="/results" element={<Navigate to="/my-practice" replace/>}/>
 <Route path="/practice/results" element={<Navigate to="/my-practice" replace/>}/>
 <Route path="/learners" element={<AdminOnly><Navigate to="/admin-tools?tab=users" replace/></AdminOnly>}/>
 <Route path="/question-bank" element={<AdminOnly><Navigate to="/admin-tools?tab=questions" replace/></AdminOnly>}/>
 <Route path="/asp-review" element={<AdminOnly><Navigate to="/admin-tools?tab=questions" replace/></AdminOnly>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
