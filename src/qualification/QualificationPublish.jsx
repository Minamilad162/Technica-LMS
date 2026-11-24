import React,{useEffect,useRef} from 'react';
import {ArrowRight,CheckCircle2,Info,LockKeyhole,Rocket,Save,ShieldCheck,Users,X} from 'lucide-react';
import {needsAssessmentMethodReview,sourceRubricForUnit} from './qualificationReadiness.js';
import './qualificationPublish.css';

// Publication status is independent of enrolment and reviewer counts.
export const editionStatus=version=>version?.publishedAt?'Live':'Draft';
export function publicationChecks(version,references){
 const units=version?.units||[];
 return [
  {id:'rubric',label:'Official qualification structure verified',ok:units.length>0&&units.every(u=>sourceRubricForUnit(references,version,u).complete),tab:'units'},
  {id:'briefs',label:'All Unit Assessment Plans approved',ok:units.length>0&&units.every(u=>u.brief?.status==='approved'&&Boolean(u.brief?.approvedAt)),tab:'plans'},
  {id:'methods',label:'Assessment methods confirmed',ok:units.length>0&&units.every(u=>!needsAssessmentMethodReview(u.brief?.methods)),tab:'plans'},
 ];
}
export function validPublicationReference(value){
 return value.trim().length>=10&&!/(pending|placeholder|test|sandbox|demo|source reference|draft)/i.test(value);
}
export function QualificationPublishBar({version,dirty,canSave,saving,onSave,onPublish,onEnrol}){
 const live=!!version.publishedAt;
 return <footer className="qpub-bar" aria-label="Qualification publishing actions">
  <div className="qpub-bar-info"><span className={'qpub-indicator '+(live?'live':'draft')}/><div>
   <strong>{live?'Live · Ready for enrolment':dirty?'Unsaved Unit changes':'Draft · Not published'}</strong>
   <small>{live?'Approved structure is locked. Manage enrolments and authorised materials.':dirty?'Save the selected Unit before switching or publishing.':'Unit drafts and uploaded resources are saved separately. Publish when ready.'}</small>
  </div></div>
  <div className="qpub-bar-actions">
   {live?<button type="button" className="qc-primary" disabled={saving} onClick={onEnrol}><Users size={17}/> Enrol Learners</button>:<>
    <button type="button" className="qc-outline" disabled={saving||!canSave} onClick={onSave}><Save size={17}/> Save Draft</button>
    <button type="button" className="qc-primary" disabled={saving} onClick={onPublish}><Rocket size={17}/> Publish Qualification</button>
   </>}
  </div>
 </footer>;
}
export function QualificationPublishDialog({version,references,dirty,saving,error,approvalRef,declaration,attest,onApprovalRef,onDeclaration,onAttest,onClose,onReview,onPublish}){
 const dialog=useRef(null);
 useEffect(()=>{
  const node=dialog.current;
  if(node&&!node.open)node.showModal();
  return ()=>{if(node?.open)node.close();};
 },[]);
 const checks=publicationChecks(version,references);
 const formReady=validPublicationReference(approvalRef)&&declaration.trim().length>=70&&attest;
 const ready=checks.every(check=>check.ok)&&formReady&&!dirty&&!version.publishedAt;
 const count=checks.filter(c=>c.ok).length+Number(formReady);
 const pendingResources=(version.units||[]).flatMap(u=>u.documents||[]).filter(d=>d.status!=='approved').length;
 return <dialog ref={dialog} className="qpub-dialog" aria-labelledby="qpub-title" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}>
  <header className="qpub-dialog-head"><span className="qpub-hero-icon"><Rocket size={24}/></span><div><h2 id="qpub-title">Publish Qualification</h2><p>{version.title} · {version.version}</p></div>
   <button type="button" className="qpub-close" aria-label="Close publication review" disabled={saving} onClick={onClose}><X size={21}/></button></header>
  <div className="qpub-dialog-body">
   <div className="qpub-check-title"><h3>Publication readiness</h3><strong>{count} / 4 complete</strong></div>
   <progress className="qpub-progress" max={4} value={count} aria-label="Publication readiness"/>
   <ul className="qpub-checks">{checks.map(check=><li key={check.id}>
    <span className={'qpub-check-icon '+(check.ok?'ok':'pending')}>{check.ok?<CheckCircle2 size={19}/>:<Info size={19}/>}</span>
    <span>{check.label}</span>{check.ok?<span className="qpub-check-ok">Complete</span>:<button type="button" disabled={saving} className="qpub-review" onClick={()=>onReview(check.tab)}>Review <ArrowRight size={14}/></button>}
   </li>)}
   <li><span className={'qpub-check-icon '+(formReady?'ok':'pending')}>{formReady?<CheckCircle2 size={19}/>:<Info size={19}/>}</span><span>Centre approval and declaration</span><span className={formReady?'qpub-check-ok':'qpub-check-pending'}>{formReady?'Confirmed':'Required'}</span></li></ul>
   {dirty&&<p className="qpub-alert"><Info size={17}/> Save unsaved Unit changes, then approve the updated brief before publication.</p>}
   <div className="qpub-enrolment"><Users size={21}/><div><strong>{version.enrolments?.length||0} Enrolled learners</strong><small>Enrolments and learner-specific reviewer assignments are not required for publication.</small></div><CheckCircle2 size={19}/></div>
   {!!pendingResources&&<p className="qpub-note">{pendingResources} uploaded resource(s) are awaiting approval. Unapproved files remain unavailable to learners; optional resources do not block publication.</p>}
   <section className="qpub-form"><h3><ShieldCheck size={18}/> Centre sign-off</h3>
    <label className="qc-field">Centre approval / authorisation reference<input value={approvalRef} maxLength={180} disabled={saving} onChange={e=>onApprovalRef(e.target.value)} placeholder="Genuine centre approval record"/></label>
    {approvalRef&&!validPublicationReference(approvalRef)&&<p className="qpub-note">Enter a genuine reference of at least 10 characters; draft, test and placeholder references are not accepted.</p>}
    <label className="qc-field">Learner declaration (full approved wording)<textarea value={declaration} maxLength={5000} disabled={saving} rows={4} onChange={e=>onDeclaration(e.target.value)} placeholder="Enter the approved declaration learners must accept before assessment…"/></label>
    <label className="qc-confirm"><input type="checkbox" checked={attest} disabled={saving} onChange={e=>onAttest(e.target.checked)}/><span>I am authorised by Technica Consult to approve this exact edition, its approved Unit briefs and learner declaration. Assessments will follow centre quality assurance.</span></label>
   </section>
   <p className="qpub-note"><LockKeyhole size={15}/> Publication locks this edition's assessment structure and allows eligible enrolments. It does not automatically enrol learners or authorise certificate issuance.</p>
   {error&&<p className="qc-error" role="alert">{error}</p>}
  </div>
  <footer className="qpub-dialog-footer"><button type="button" className="qc-outline" disabled={saving} onClick={onClose}>Cancel</button><button type="button" className="qc-primary" disabled={saving||!ready} onClick={onPublish}><Rocket size={17}/>{saving?'Publishing…':'Publish Qualification'}</button></footer>
 </dialog>;
}
