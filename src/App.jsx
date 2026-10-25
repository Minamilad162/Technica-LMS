import React,{useEffect,useState}from'react';import{Routes,Route,Navigate,useLocation}from'react-router-dom';
import Layout from './components/Layout';
import AuthPage,{DemoPolicyPage} from './pages/AuthPage';
import {getAuthSession} from './lib/demoAuth';
import HomePage from './pages/HomePage';import PracticePage from './pages/PracticePage';import QuizPage from './pages/QuizPage';
import AnalyticsPage from './pages/AnalyticsPage';import BuilderPage from './pages/BuilderPage';import AssessmentOverview from './pages/AssessmentOverview';import ResultsPage from './pages/ResultsPage';import LearnersPage from './pages/LearnersPage';import SavedPage from './pages/SavedPage';
function RoutePage({children,standalone=false}){return <Layout standalone={standalone} onLogout={()=>{window.dispatchEvent(new Event('technica-demo-logout'))}}>{children}</Layout>}
export default function App(){const l=useLocation();const[auth,setAuth]=useState(getAuthSession);useEffect(()=>{window.scrollTo({top:0,behavior:'instant'})},[l.pathname]);useEffect(()=>{const fn=()=>setAuth(null);window.addEventListener('technica-demo-logout',fn);return()=>window.removeEventListener('technica-demo-logout',fn)},[]);
 if(!auth){return <Routes>
 <Route path="/login" element={<AuthPage mode="login" onAuthenticated={setAuth}/>}/>
 <Route path="/signup" element={<AuthPage mode="signup" onAuthenticated={setAuth}/>}/>
 <Route path="/forgot-password" element={<AuthPage mode="forgot" onAuthenticated={setAuth}/>}/>
 <Route path="/terms" element={<DemoPolicyPage kind="terms"/>}/>
 <Route path="/privacy" element={<DemoPolicyPage kind="privacy"/>}/>
 <Route path="*" element={<Navigate to="/login" state={{from:l}} replace/>}/>
 </Routes>}
 return <Routes>
 <Route path="/login" element={<Navigate to="/home" replace/>}/>
 <Route path="/signup" element={<Navigate to="/home" replace/>}/>
 <Route path="/" element={<Navigate to="/home" replace/>}/>
 <Route path="/home" element={<RoutePage><HomePage/></RoutePage>}/>
 <Route path="/my-learning" element={<RoutePage><HomePage learningOnly/></RoutePage>}/>
 <Route path="/practice" element={<RoutePage><PracticePage/></RoutePage>}/>
 <Route path="/practice/session" element={<RoutePage standalone><QuizPage kind="practice"/></RoutePage>}/>
 <Route path="/analytics" element={<RoutePage><AnalyticsPage/></RoutePage>}/>
 <Route path="/builder" element={<RoutePage><BuilderPage/></RoutePage>}/>
 <Route path="/assessments" element={<RoutePage><AssessmentOverview/></RoutePage>}/>
 <Route path="/assessments/take" element={<RoutePage standalone><QuizPage kind="assessment"/></RoutePage>}/>
 <Route path="/results" element={<RoutePage><ResultsPage/></RoutePage>}/>
 <Route path="/learners" element={<RoutePage><LearnersPage/></RoutePage>}/>
 <Route path="/question-bank" element={<RoutePage><SavedPage questionBank/></RoutePage>}/>
 <Route path="/saved" element={<RoutePage><SavedPage/></RoutePage>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
