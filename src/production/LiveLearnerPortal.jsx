import React,{useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {getSupabaseClient} from '../lib/supabase.js';
import {signOutPortal} from '../lib/portalAuth.js';
import LiveLearnerWorkspace from './LiveLearnerWorkspace.jsx';

// The ReactRouter /#/ portal and the isolated Supabase Vite entrypoint share
// one P15 learner UI and the same real Auth/RLS. No synthetic course fallback.
export default function LiveLearnerPortal({initialScreen='courses'}){
 const navigate=useNavigate();const {courseId=''}=useParams();
 const [state,setState]=useState({loading:true,db:null,user:null,error:''});
 useEffect(()=>{
  let alive=true,db;
  try{db=getSupabaseClient({secureReviewEntry:true});}
  catch{setState({loading:false,db:null,user:null,error:'A real Supabase connection is required.'});return;}
  db.auth.getUser().then(({data,error})=>{
   if(!alive)return;
   if(error||!data?.user?.id)setState({loading:false,db:null,user:null,
    error:'A valid signed-in Technica LMS account is required for published courses.'});
   else setState({loading:false,db,user:data.user,error:''});
  }).catch(()=>{if(alive)setState({loading:false,db:null,user:null,
   error:'Could not verify your Supabase session.'});});
  return()=>{alive=false;};
 },[]);
 if(state.loading)return <main className="live-learning"><div className="live-learning-empty" role="status">
  Verifying your Supabase learning account…</div></main>;
 if(state.error)return <main className="live-learning"><div className="live-learning-empty" role="alert">
  <strong>Secure learning unavailable</strong><p>{state.error}</p>
  <Link className="btn" to="/login">Sign in</Link></div></main>;
 return <LiveLearnerWorkspace key={state.user.id+'-'+initialScreen}
  db={state.db} user={state.user} initialScreen={initialScreen}
  initialCourseId={courseId} embedded
  onCheckoutRoute={()=>navigate('/subscription-plans')}
  onSubscriptionRoute={()=>navigate('/subscription-plans')}
  onCourseRoute={id=>navigate('/course-catalog/'+encodeURIComponent(id))}
  onLearningRoute={()=>navigate('/my-learning')}
  onPracticeRoute={()=>navigate('/assessments?tab=practice')}
  onHistoryRoute={()=>navigate('/assessments?tab=history')}
  onMistakesRoute={()=>navigate('/kill-mistakes')}
  onSignOut={()=>{void signOutPortal();}}/>;
}
