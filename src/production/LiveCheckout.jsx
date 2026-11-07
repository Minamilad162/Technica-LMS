import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpenCheck,CheckCircle2,ClipboardCheck,LockKeyhole,
 ReceiptText,ShieldCheck,ShoppingBag,TestTubeDiagonal,Wallet,XCircle} from 'lucide-react';
import {completeSimulatedCheckout,simulationEnabled} from './checkoutSimulationApi.js';
import './liveCheckout.css';

// Checkout uses the *selected published course*, never a browser-supplied title
// or amount. No PAN/CVV/expiry fields exist; no payment data leaves the browser.
export default function LiveCheckout({course,user,onBack,onSuccess,onOpenCourse,onMyLearning}){
 const [reference,setReference]=useState(''),[accepted,setAccepted]=useState(false);
 const [status,setStatus]=useState('entry'),[error,setError]=useState('');
 const enabled=simulationEnabled();
 const submit=e=>{
  e.preventDefault();setError('');
  try{
   if(!course?.id||!user?.id)throw Error('Select a published Course while signed in.');
   completeSimulatedCheckout(user.id,course.id,{
    testReference:reference,confirmedDemo:accepted
   });
   setReference('');setStatus('success');onSuccess?.();
  }catch(ex){setError(ex?.message||'The simulation could not complete.');}
 };
 return <section className="lc-page" aria-label="Course checkout">
  <div className="lc-backbar"><button type="button" className="lj-quiet" onClick={onBack}>
   <ArrowLeft size={16}/> Back to course</button><span><ShieldCheck size={15}/> Technica LMS</span></div>
  {status==='success'?<div className="lc-complete" role="status">
   <div className="lc-success-icon"><CheckCircle2 size={40}/></div>
   <span className="lc-overline">SIMULATION COMPLETED · NO REAL PAYMENT</span>
   <h2>Your course preview is ready</h2>
   <p><strong>{course.title}</strong> now appears in the demonstration section of My Learning.
    Published locked lessons can be explored as demo navigation, but the real files,
    quizzes and video remain protected until server-confirmed paid enrollment.</p>
   <div className="lc-actions">
    <button className="lj-primary" type="button" onClick={onMyLearning}>
     Go to My Learning <ArrowRight size={16}/></button>
    <button className="lj-quiet" type="button" onClick={onOpenCourse}>
     <BookOpenCheck size={16}/> Explore course lessons</button>
   </div>
  </div>:<>
   <div className="lc-steps" aria-label="Checkout progress">
    <span className="lc-active"><b>1</b> Review course</span>
    <span><b>2</b> Simulate checkout</span>
    <span><b>3</b> My Learning</span>
   </div>
   <div className="lc-layout"><form className="lc-form" onSubmit={submit}>
    <div className="lc-title"><span className="lc-overline">COURSE ENROLLMENT</span>
     <h2>Checkout</h2><p>Review your course and try the enrollment journey before real payments are integrated.</p></div>
    <div className="lc-notice" role="note"><TestTubeDiagonal size={20}/>
     <div><strong>Simulation only — no money will be charged</strong>
      <p>There is no payment gateway connected. Never enter actual card numbers, CVV, bank details or passwords.
       Completing this step unlocks only a local demonstration of lesson navigation, not protected course content.</p></div>
    </div>
    <div className="lc-section"><div className="lc-section-title"><ReceiptText size={18}/><h3>Enrollment details</h3></div>
     <label className="lc-field">Selected course<input value={course.title} readOnly aria-label="Selected course"/></label>
     <label className="lc-field">Signed-in learner<input value={user.email||'Signed-in user'} readOnly aria-label="Signed-in learner"/></label>
    </div>
    <div className="lc-section"><div className="lc-section-title"><Wallet size={18}/><h3>Test payment</h3></div>
     <p className="lc-hint">Use any invented 6–12 digit test reference, e.g. <code>12345678</code>. This is <strong>not</strong> a bank-card field.</p>
     <label className="lc-field">Fictional test reference
      <input type="text" inputMode="numeric" autoComplete="off" placeholder="12345678" maxLength={12}
       value={reference} disabled={!enabled} required pattern="[0-9]{6,12}"
       onChange={e=>{setReference(e.target.value.replace(/[^0-9]/g,''));setError('');}}/></label>
     <label className="lc-consent"><input type="checkbox" checked={accepted} disabled={!enabled}
       onChange={e=>setAccepted(e.target.checked)}/>
      <span>I understand this is a checkout simulation with no charge, receipt or paid access.</span></label>
    </div>
    {error&&<p className="lj-error" role="alert">{error}</p>}
    {!enabled&&<p className="lj-error" role="status">Checkout simulation has been disabled. Real payments are not available yet.</p>}
    <button className="lj-primary lc-submit" type="submit" disabled={!enabled||!accepted||reference.length<6}>
     <ShoppingBag size={18}/> Complete demo checkout <ArrowRight size={17}/></button>
    <p className="lc-footnote"><LockKeyhole size={13}/> No real card details collected · no database entitlement granted</p>
   </form>
   <aside className="lc-summary" aria-label="Order summary">
    <div className="lc-summary-icon"><BookOpenCheck size={26}/></div>
    <span className="lc-overline">YOUR COURSE</span>
    <h3>{course.title}</h3>
    {course.summary&&<p>{course.summary}</p>}
    <div className="lc-summary-row"><span>Course enrollment</span><strong>Demo</strong></div>
    <div className="lc-summary-row"><span>Test amount charged</span><strong>0</strong></div>
    <div className="lc-total"><span>Total charged today</span><strong>0</strong></div>
    <div className="lc-summary-note"><ShieldCheck size={17}/> In production, pricing, payment confirmation and entitlements must come from a trusted server — not this page.</div>
   </aside></div>
  </>}
 </section>;
}
