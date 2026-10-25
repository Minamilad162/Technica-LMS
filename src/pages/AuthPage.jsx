import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {UserRound,IdCard,Mail,LockKeyhole,Eye,EyeOff,ArrowRight,GraduationCap,ChartNoAxesColumn,BookMarked,Clock3,Check,AlertCircle,ShieldCheck,ArrowLeft,UserPlus,LogIn,KeyRound} from 'lucide-react';
import {DEMO_LOGIN,loginDemo,signupDemo} from '../lib/demoAuth';
import {useDemo} from '../lib/store';
const PERKS=[[GraduationCap,'Expert','Courses'],[ChartNoAxesColumn,'Progress','Tracking'],[BookMarked,'Certificate','of Completion'],[Clock3,'Flexible','Learning']];
function Field({label,icon:Icon,visible,canReveal,onReveal,...props}){
 return <label className="auth-field"><span className="auth-field-label">{label}</span><span className="auth-input-wrap"><Icon size={19} strokeWidth={1.9} aria-hidden="true"/><input {...props} aria-label={label} /><span className="auth-field-end">{canReveal&&<button type="button" className="auth-show-password" onClick={onReveal} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</span></span></label>
}
function BenefitPanel(){
 return <section className="auth-story" aria-label="Technica Consult LMS benefits"><div className="auth-story-shade"/>
  <div className="auth-brand"><img src="/images/technica-icon.png" alt="Technica Consult"/><span className="auth-brand-name">TECHNICA CONSULT</span><span className="auth-brand-tagline">ALIGNED FOR EXCELLENCE</span></div>
  <div className="auth-story-bottom"><h2>Learn Today<br/>Build a <span>Safer</span> Tomorrow</h2><p>Access expert-led courses, build your skills and be part of a safer, more sustainable future.</p><div className="auth-perks">{PERKS.map(([Icon,line1,line2])=><div key={line1}><Icon size={27} strokeWidth={1.6}/><span>{line1}<br/>{line2}</span></div>)}</div></div>
 </section>
}
const cleanError=(e)=>e?.message||'Something went wrong. Please try again.';
export default function AuthPage({mode='login',onAuthenticated}){
 const navigate=useNavigate();const location=useLocation();const {update}=useDemo();
 const isSignup=mode==='signup',isForgot=mode==='forgot';
 const[identifier,setIdentifier]=useState('');const[password,setPassword]=useState('');const[remember,setRemember]=useState(true);
 const[name,setName]=useState('');const[email,setEmail]=useState('');const[employeeId,setEmployeeId]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[accepted,setAccepted]=useState(false);
 const[showPass,setShowPass]=useState(false);const[showConfirm,setShowConfirm]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const from=location.state?.from?.pathname||'/home';
 async function enterDemo(){
  setError('');setLoading(true);
  try{
   const account=await loginDemo(DEMO_LOGIN.employeeId,DEMO_LOGIN.password,remember);
   update({name:account.name,role:account.role});onAuthenticated(account);
   navigate(from,{replace:true});
  }catch(err){setError(cleanError(err))}finally{setLoading(false)}
 }
 async function submit(e){
  e.preventDefault();setError('');setLoading(true);
  try{
   const account=isSignup?await signupDemo({name,email,employeeId,password,confirmPassword,accepted}):await loginDemo(identifier,password,remember);
   update({name:account.name,role:account.role});onAuthenticated(account);navigate(isSignup?'/home':from,{replace:true});
  }catch(err){setError(cleanError(err))}finally{setLoading(false)}
 }
 return <div className="auth-page"><div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/>
  <div className="auth-layout"><BenefitPanel/><section className="auth-form-section"><div className="auth-mobile-brand"><img src="/images/technica-icon.png" alt="Technica Consult"/><b>TECHNICA CONSULT <span>LMS</span></b></div>
   <div className="auth-form-card">
    {isForgot?<><span className="auth-heading-icon"><KeyRound size={22}/></span><h1>Forgot <em>Password?</em></h1><p className="auth-description">Password reset emails will be available when Supabase authentication is connected.</p><div className="auth-notice"><ShieldCheck size={19}/><span>This is a local-only demo. No reset email can be sent or verified yet. You can use the sample credentials below to explore the LMS.</span></div><div className="auth-demo-credentials"><b>Sample learner</b><span>Employee ID: <code>{DEMO_LOGIN.employeeId}</code></span><span>Password: <code>{DEMO_LOGIN.password}</code></span></div><Link className="auth-main-button" to="/login"><ArrowLeft size={18}/> Back to Sign In</Link></>:
    <><div className="auth-card-heading"><div className="auth-small-symbol">{isSignup?<UserPlus size={21}/>:<LogIn size={21}/>}</div><h1>{isSignup?<>Create <em>Account</em></>:<>Welcome <em>Back</em></>}</h1><p className="auth-description">{isSignup?'Join Technica Consult LMS and start your learning journey today.':'Sign in to your Technica Consult LMS account and continue your learning journey.'}</p></div>
    <form onSubmit={submit} className="auth-form" noValidate>
     {isSignup&&<><Field label="Full Name" icon={UserRound} placeholder="Enter your full name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/><Field label="Employee ID" icon={IdCard} placeholder="Enter your employee ID" autoComplete="username" value={employeeId} onChange={e=>setEmployeeId(e.target.value)} required maxLength={24}/><Field label="Email Address" icon={Mail} placeholder="Enter your email address" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={150}/></>}
     {!isSignup&&<Field label="Employee ID or Email" icon={UserRound} placeholder="Enter your employee ID or email" autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} required/>}
     <Field label="Password" icon={LockKeyhole} placeholder={isSignup?'Create a password':'Enter your password'} type={showPass?'text':'password'} autoComplete={isSignup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} canReveal visible={showPass} onReveal={()=>setShowPass(p=>!p)} required/>
     {isSignup&&<Field label="Confirm Password" icon={LockKeyhole} placeholder="Confirm your password" type={showConfirm?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} canReveal visible={showConfirm} onReveal={()=>setShowConfirm(p=>!p)} required/>}
     {isSignup?<label className="auth-checkbox"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span className="auth-check-ui"><Check size={14}/></span><span>I agree to the <Link to="/terms" onClick={e=>e.stopPropagation()}>Terms of Service</Link> and <Link to="/privacy" onClick={e=>e.stopPropagation()}>Privacy Policy</Link></span></label>:<div className="auth-options"><label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span className="auth-check-ui"><Check size={14}/></span>Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>}
     {error&&<p className="auth-error" role="alert"><AlertCircle size={16}/>{error}</p>}
     <button className="auth-main-button" type="submit" disabled={loading}>{loading?'Please wait...':isSignup?'Sign Up':'Sign In'} {!loading&&<ArrowRight size={19}/>}</button>
    </form>
    <div className="auth-divider"><span>OR</span></div>
    <Link className="auth-alt-button" to={isSignup?'/login':'/signup'}>{isSignup?'Already have an account? Sign In':'Create New Account'} <ArrowRight size={17}/></Link>
    {!isSignup&&<div className="auth-demo-credentials"><b>Demo access · no sign-up needed</b><span>Employee ID: <code>{DEMO_LOGIN.employeeId}</code></span><span>Password: <code>{DEMO_LOGIN.password}</code></span><button type="button" className="auth-demo-login-button" onClick={enterDemo} disabled={loading}><LogIn size={15}/> Login with Demo Account <ArrowRight size={15}/></button></div>}
    </>}
   </div><p className="auth-legal">Demo preview · v1.6.1 · Accounts remain in this browser · Do not reuse a real password.</p></section>
  </div>
 </div>
}
export function DemoPolicyPage({kind}){return <div className="auth-page auth-policy-page"><div className="auth-policy-card"><img width="84" src="/images/technica-icon.png" alt="Technica Consult"/><h1>{kind==='terms'?'Terms of Service':'Privacy Policy'} — Demo</h1><p>This interface is a non-production preview. Sign-up records are stored only in your browser. This demo does not send information to a server, verify email addresses or grant access to a real learning platform. Do not use actual company credentials or confidential information.</p><Link className="auth-main-button" to="/signup"><ArrowLeft size={17}/> Back to Sign Up</Link></div></div>}
