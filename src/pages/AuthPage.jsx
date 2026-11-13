import React,{useEffect,useState} from 'react';
import '../production/adminUserControls.css';
import './signup.css';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {UserRound,Mail,LockKeyhole,Eye,EyeOff,ArrowRight,GraduationCap,ChartNoAxesColumn,BookMarked,Clock3,Check,AlertCircle,ShieldCheck,ArrowLeft,LogIn,KeyRound} from 'lucide-react';
import {loginWithEmailPassword,requestPasswordReset,signUpPortalAccount,startGooglePortalAuth} from '../lib/portalAuth';
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
export default function AuthPage({mode='login',onAuthenticated,initialError=''}){
 const navigate=useNavigate(),location=useLocation(),{update}=useDemo();
 const forgot=mode==='forgot',signup=mode==='signup';
 const[email,setEmail]=useState(''),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[visible,setVisible]=useState(false);
 const[loading,setLoading]=useState(false),[error,setError]=useState(initialError),[notice,setNotice]=useState('');
 useEffect(()=>{setError(initialError);},[initialError]);
 const from=location.state?.from?.pathname||'/home';
 const google=async()=>{
  if(loading)return;
  setLoading(true);setError('');setNotice('');
  try{await startGooglePortalAuth();}
  catch(e){setError(message(e));setLoading(false);}
 };
 const submit=async event=>{
  event.preventDefault();setError('');setNotice('');setLoading(true);
  try{
   if(forgot){await requestPasswordReset(email);setNotice('If this account is registered, check its inbox for the password recovery instructions.');}
   else if(signup){
    if(password!==confirmPassword)throw Error('The passwords do not match.');
    const result=await signUpPortalAccount({fullName,email,password});
    if(result.needsConfirmation){
     setNotice('Check your inbox to confirm your email, then return to Sign In. If an account already exists, use Sign In or Forgot password.');
     setPassword('');setConfirmPassword('');
    }else if(result.account){
     update({name:result.account.name,role:result.account.role});
     onAuthenticated(result.account);
     navigate('/home',{replace:true});
    }
   }
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
    <div className="auth-card-heading"><span className="auth-heading-icon">{forgot?<KeyRound size={22}/>:signup?<UserRound size={22}/>:<LogIn size={22}/>}</span>
     <h1>{forgot?<>Reset <em>Password</em></>:signup?<>Create <em>Account</em></>:<>Welcome <em>Back</em></>}</h1>
     <p className="auth-description">{forgot?'Enter the email associated with your LMS account.':signup?'Join Technica LMS, then explore learning plans and courses.':'Sign in to continue learning, or create your learner account.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     {signup&&<Field label="Full Name" icon={UserRound} type="text" autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" required maxLength={160}/>}
     <Field label="Email Address" icon={Mail} placeholder="name@company.com" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/>
     {!forgot&&(signup?
      <Field label="Password" icon={LockKeyhole} placeholder="Create a strong password" type={visible?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} canReveal visible={visible} onReveal={()=>setVisible(v=>!v)} required minLength={12}/>:
      <Field label="Password" icon={LockKeyhole} placeholder="Enter your password" type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} canReveal visible={visible} onReveal={()=>setVisible(v=>!v)} required minLength={1}/>)}
     {signup&&<><Field label="Confirm Password" icon={LockKeyhole} placeholder="Repeat your password" type={visible?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={12}/><small className="auth-password-hint">Use at least 12 characters. New accounts begin with Learner access; no plan is activated automatically.</small></>}
     {error&&(error.startsWith('Your Technica LMS account is blocked.')?
      <div className="auth-blocked-account" role="alert"><LockKeyhole size={23}/><div><strong>Account blocked</strong><p>{error}</p><small>If you believe this is a mistake, contact your Technica LMS administrator.</small></div></div>:
      <p className="auth-error" role="alert"><AlertCircle size={16}/>{error}</p>)}
     {notice&&<div className="auth-notice" role="status"><ShieldCheck size={18}/><span>{notice}</span></div>}
     <button type="submit" className="auth-main-button" disabled={loading}>{loading?'Please wait…':forgot?'Send recovery email':signup?'Create Account':'Sign In'} {!loading&&<ArrowRight size={19}/>}</button>
    </form>
    {forgot?<Link to="/login" className="auth-alt-button"><ArrowLeft size={17}/> Back to Sign In</Link>:
      <div className="auth-social-actions">
       <div className="auth-social-divider"><span>or continue with</span></div>
       <button className="auth-google-button" type="button" disabled={loading} onClick={google} aria-label="Continue with Google">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.28 5.48-4.82 7.18l7.73 6C44.36 38.04 46.98 31.91 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.2A23.95 23.95 0 0 0 0 24c0 3.87.93 7.51 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.16 2.3-6.26 0-11.57-4.23-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
       </button>
      </div>}
    {!forgot&&<div className="auth-options auth-entry-links">
      {signup?<>Already have an account? <Link to="/login">Sign In</Link></>:
       <><Link to="/forgot-password">Forgot password?</Link><span>New to Technica? <Link to="/signup">Create an account</Link></span></>}
    </div>}
    {!forgot&&<div className="auth-notice" style={{marginTop:18}}><ShieldCheck size={18}/><span>New registrations receive Learner access only. Subscriptions and Admin permissions require separate authorization.</span></div>}
   </div>
   <p className="auth-legal">Review our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link> before continuing.</p>
  </section></div>
 </div>;
}
export function DemoPolicyPage({kind}){
 return <div className="auth-page auth-policy-page"><div className="auth-policy-card"><img width="84" src="/images/technica-icon.png" alt="Technica Consult"/><h1>{kind==='terms'?'Terms of Service':'Privacy Policy'}</h1><p>Our policies are being finalized. For questions about your account, personal data or learning access, please contact Technica Consult support. This page is not yet a complete legal policy.</p><Link className="auth-main-button" to="/login"><ArrowLeft size={17}/> Back to Sign In</Link></div></div>;
}
