import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {UserRound,Mail,LockKeyhole,Eye,EyeOff,ArrowRight,GraduationCap,ChartNoAxesColumn,BookMarked,Clock3,Check,AlertCircle,ShieldCheck,ArrowLeft,LogIn,KeyRound} from 'lucide-react';
import {loginWithEmailPassword,requestPasswordReset} from '../lib/portalAuth';
import {useDemo} from '../lib/store';
const PERKS=[[GraduationCap,'Expert','Courses'],[ChartNoAxesColumn,'Progress','Tracking'],[BookMarked,'Certificate','of Completion'],[Clock3,'Flexible','Learning']];
function Field({label,icon:Icon,visible,canReveal,onReveal,...props}){
 return <label className="auth-field"><span className="auth-field-label">{label}</span><span className="auth-input-wrap"><Icon size={19} strokeWidth={1.9} aria-hidden="true"/><input {...props} aria-label={label}/><span className="auth-field-end">{canReveal&&<button type="button" className="auth-show-password" onClick={onReveal} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</span></span></label>
}
function BenefitPanel(){
 return <section className="auth-story" aria-label="Technica Consult LMS benefits"><div className="auth-story-shade"/>
  <div className="auth-brand"><img src="/images/technica-icon.png" alt="Technica Consult"/><span className="auth-brand-name">TECHNICA CONSULT</span><span className="auth-brand-tagline">ALIGNED FOR EXCELLENCE</span></div>
  <div className="auth-story-bottom"><h2>Learn Today<br/>Build a <span>Safer</span> Tomorrow</h2><p>Access expert-led courses, build your skills and be part of a safer, more sustainable future.</p><div className="auth-perks">{PERKS.map(([Icon,a,b])=><div key={a}><Icon size={27} strokeWidth={1.6}/><span>{a}<br/>{b}</span></div>)}</div></div>
 </section>;
}
const message=e=>e?.message||'Unable to authenticate. Please try again.';
export default function AuthPage({mode='login',onAuthenticated}){
 const navigate=useNavigate(),location=useLocation(),{update}=useDemo();
 const forgot=mode==='forgot';
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
 const[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const from=location.state?.from?.pathname||'/home';
 const submit=async event=>{
  event.preventDefault();setError('');setNotice('');setLoading(true);
  try{
   if(forgot){await requestPasswordReset(email);setNotice('If this account is registered, check its inbox for the password recovery instructions.');}
   else{
    const account=await loginWithEmailPassword(email,password);
    update({name:account.name,role:account.role});
    onAuthenticated(account);
    navigate(account.role==='admin'&&from==='/home'?'/analytics':from,{replace:true});
   }
  }catch(e){setError(message(e));}finally{setLoading(false);}
 };
 return <div className="auth-page"><div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/>
  <div className="auth-layout"><BenefitPanel/><section className="auth-form-section">
   <div className="auth-mobile-brand"><img src="/images/technica-icon.png" alt="Technica Consult"/><b>TECHNICA CONSULT <span>LMS</span></b></div>
   <div className="auth-form-card">
    <div className="auth-card-heading"><span className="auth-heading-icon">{forgot?<KeyRound size={22}/>:<LogIn size={22}/>}</span>
     <h1>{forgot?<>Reset <em>Password</em></>:<>Welcome <em>Back</em></>}</h1>
     <p className="auth-description">{forgot?'Enter the email associated with your LMS account.':'Sign in with your assigned Technica LMS email and password.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     <Field label="Email Address" icon={Mail} placeholder="name@company.com" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/>
     {!forgot&&<Field label="Password" icon={LockKeyhole} placeholder="Enter your password" type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} canReveal visible={visible} onReveal={()=>setVisible(v=>!v)} required minLength={1}/>}
     {error&&<p className="auth-error" role="alert"><AlertCircle size={16}/>{error}</p>}
     {notice&&<div className="auth-notice" role="status"><ShieldCheck size={18}/><span>{notice}</span></div>}
     <button type="submit" className="auth-main-button" disabled={loading}>{loading?'Please wait…':forgot?'Send recovery email':'Sign In'} {!loading&&<ArrowRight size={19}/>}</button>
    </form>
    {forgot?<Link to="/login" className="auth-alt-button"><ArrowLeft size={17}/> Back to Sign In</Link>:
     <div className="auth-options" style={{justifyContent:'center',marginTop:18}}><Link to="/forgot-password">Forgot password?</Link></div>}
    {!forgot&&<div className="auth-notice" style={{marginTop:20}}><ShieldCheck size={18}/><span>Account access is managed by Technica LMS administrators. There are no one-click or sample Admin/Learner sign-ins.</span></div>}
   </div>
   <p className="auth-legal">Secure email/password sign-in via Supabase Auth. Course data on legacy preview pages remains demonstration content.</p>
  </section></div>
 </div>;
}
export function DemoPolicyPage({kind}){
 return <div className="auth-page auth-policy-page"><div className="auth-policy-card"><img width="84" src="/images/technica-icon.png" alt="Technica Consult"/><h1>{kind==='terms'?'Terms of Service':'Privacy Policy'}</h1><p>This Technica LMS pilot uses Supabase Authentication to verify identities. Some course and exam screens still use local demonstration content and are not a production-protected question bank.</p><Link className="auth-main-button" to="/login"><ArrowLeft size={17}/> Back to Sign In</Link></div></div>;
}
