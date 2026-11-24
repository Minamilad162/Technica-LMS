import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BookCheck,BookOpen,CheckCircle2,ClipboardCheck,Download,FileCheck2,FilePlus2,
 FileText,FolderClosed,GraduationCap,Info,Layers3,LockKeyhole,RefreshCw,Search,ShieldAlert,ShieldCheck,UploadCloud,Users,UserRound,Ellipsis,ChevronDown} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import {qualificationReadiness,needsAssessmentMethodReview,sourceRubricForUnit,publicationChecks,validPublicationReference,bulkBriefReview,defaultPublicationReference,DEFAULT_LEARNER_DECLARATION} from './qualificationReadiness.js';
import QualificationCentreLearnerPreview from './QualificationCentreLearnerPreview.jsx';
import {ProgrammeUpdatesAdmin} from './QualificationProgrammeUpdates.jsx';
import './qualificationCentreAdmin.css';
import {QualificationPublishBar,QualificationPublishDialog} from './QualificationPublish.jsx';
import {AdminQualificationNavigation,AdminQualificationCatalog,AdminQualificationDetail} from './QualificationAdminCenter.jsx';
import {AccountSelect,AssignmentWorkspace,enrolmentRows} from './QualificationEnrolments.jsx';

const methods=[['assignment_brief','Assignment Brief'],['reflective_account','Reflective Account'],
 ['witness_testimony','Witness Testimony'],['cpd_record','CPD Record'],
 ['evidence_matrix','Evidence Matrix'],['other','Other centre document']];
const mimeByExt={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
const errText=e=>e?.message||'This action could not be completed.';
const stamp=date=>date?new Date(date).toLocaleDateString(undefined,{dateStyle:'medium'}):'Not yet';
function Pill({ready,children}){return <span className={'qc-pill '+(ready?'qc-success':'qc-pending')}>{ready?<CheckCircle2 size={13}/>:<Info size={13}/>} {children}</span>;}
function Notice({children}){return <div className="qc-notice"><Info size={18}/><span>{children}</span></div>;}
function Card({title,icon:Icon,children,id,hidden=false}){return <section id={id} hidden={hidden} className="qc-card"><header><Icon size={19}/><h3>{title}</h3></header>{children}</section>;}
function PeopleSelect({label,value,onChange,people,disabled}){return <label className="qc-field">{label}
 <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} required>
  <option value="">Select active account</option>
  {people.map(p=><option value={p.id} key={p.id}>{p.name||p.email} · {p.email}</option>)}
 </select></label>;}

export default function QualificationCentreAdmin({db,onBack,references=[],initialLearnerId=''}){
 const [versions,setVersions]=useState([]),[people,setPeople]=useState([]),[staff,setStaff]=useState([]);
 const [search,setSearch]=useState(''),[versionId,setVersionId]=useState(''),[unitId,setUnitId]=useState('');
 const [instructions,setInstructions]=useState(''),[assessmentMethods,setAssessmentMethods]=useState('');
 const [reviewChecks,setReviewChecks]=useState({rubric:false,methods:false,authority:false});
 const [approvalRef,setApprovalRef]=useState(''),[declaration,setDeclaration]=useState('');
 const [attest,setAttest]=useState(false);
 const [fileTitle,setFileTitle]=useState(''),[fileKind,setFileKind]=useState(methods[0][0]),
 [file,setFile]=useState(null),[fileAttest,setFileAttest]=useState(false);
 const staffRevokeRef=useRef(null);
 const [revokeUser,setRevokeUser]=useState(''),[revokeRole,setRevokeRole]=useState(''),
 [revokeReason,setRevokeReason]=useState('');
 const [staffUser,setStaffUser]=useState(''),[staffRole,setStaffRole]=useState('assessor'),
 [staffReference,setStaffReference]=useState(''),[staffAttest,setStaffAttest]=useState(false);
 const [issuerName,setIssuerName]=useState(''),[issuerRef,setIssuerRef]=useState(''),
 [issuerUrl,setIssuerUrl]=useState(''),[issuerAttest,setIssuerAttest]=useState(false),
 [issuerStatus,setIssuerStatus]=useState(null);
 const [previewWorkspace,setPreviewWorkspace]=useState(false);
 const [publishOpen,setPublishOpen]=useState(false);
 const [bulkOpen,setBulkOpen]=useState(false),[bulkAttest,setBulkAttest]=useState(false);
 const [section,setSection]=useState(initialLearnerId?'enrolments':'overview'),[setupTab,setSetupTab]=useState('summary');
 const catalogueVisible=['overview','qualifications'].includes(section);
 const selectVersion=v=>{if(v.id===version?.id)return true;if(!confirmDiscard())return false;setVersionId(v.id);setUnitId(v.units[0]?.id||'');setFile(null);setFileTitle('');return true;};
 const openSetup=tab=>{setSection('qualifications');setSetupTab(tab);};
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),
 [message,setMessage]=useState(''),[error,setError]=useState('');
 const version=versions.find(v=>v.id===versionId)||versions[0];
 const unit=version?.units?.find(u=>u.id===unitId)||version?.units?.[0];
 const release=!!version?.publishedAt;
 const briefDirty=Boolean(!release&&unit&&(instructions!==(unit.brief?.instructions||'')||assessmentMethods!==(unit.brief?.methods||'')));
 const confirmDiscard=()=>!briefDirty||window.confirm('Discard unsaved changes to this Unit? Save Draft first to retain them.');
 const chooseUnit=id=>{if(id===unit?.id||confirmDiscard()){setUnitId(id);setFile(null);setFileTitle('');}};
 const canSaveDraft=Boolean(briefDirty&&instructions.trim().length>=80);
 useEffect(()=>{if(!briefDirty)return;const prevent=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[briefDirty]);
 const approved=version?.units.filter(u=>u.brief?.status==='approved'&&Boolean(u.brief?.approvedAt)).length||0;
 const total=version?.units.length||0;
 const documents=unit?.documents||[];
 const readiness=qualificationReadiness(version,staff);
 const sourceRubric=sourceRubricForUnit(references,version,unit);
 const bulkReview=bulkBriefReview(version,references);
 useEffect(()=>{setBulkOpen(false);setBulkAttest(false);},[version?.id]);
 useEffect(()=>{setBulkAttest(false);},[versions,briefDirty]);
 const methodsNeedReview=needsAssessmentMethodReview(assessmentMethods);
 const canApproveBrief=Boolean(!saving&&!release&&unit&&sourceRubric.complete&&
   instructions.trim().length>=80&&!methodsNeedReview&&
   reviewChecks.rubric&&reviewChecks.methods&&reviewChecks.authority);
 const nextUnapproved=version?.units?.find(item=>item.id!==unit?.id&&item.brief?.status!=='approved');

 const reload=async(preferredVersion,preferredUnit)=>{
  const [v,p,s]=await Promise.all([portfolioRpc(db,'admin_workspace'),
    portfolioRpc(db,'admin_people',{p_search:search.trim()}),portfolioRpc(db,'admin_staff')]);
  setVersions(v||[]);setPeople(p||[]);setStaff(s||[]);
  const selected=v?.find(item=>item.id===(preferredVersion||versionId))||v?.[0];
  setVersionId(selected?.id||'');
  const selectedUnit=selected?.units.find(item=>item.id===(preferredUnit||unitId))||selected?.units[0];
  setUnitId(selectedUnit?.id||'');
 };
 useEffect(()=>{
  let alive=true;
  Promise.all([portfolioRpc(db,'admin_workspace'),portfolioRpc(db,'admin_people',{p_search:''}),
    portfolioRpc(db,'admin_staff')])
    .then(([v,p,s])=>{if(!alive)return;setVersions(v||[]);setPeople(p||[]);setStaff(s||[]);
      setVersionId(v?.[0]?.id||'');setUnitId(v?.[0]?.units?.[0]?.id||'');})
    .catch(e=>{if(alive)setError(errText(e));})
    .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[db]);
 useEffect(()=>{setInstructions(unit?.brief?.instructions||'');setAssessmentMethods(unit?.brief?.methods||'');setReviewChecks({rubric:false,methods:false,authority:false});},[unit?.id,unit?.brief?.approvedAt,unit?.brief?.instructions,unit?.brief?.methods]);
 useEffect(()=>{setApprovalRef(defaultPublicationReference(version));setAttest(false);setDeclaration(DEFAULT_LEARNER_DECLARATION);},[version?.id]);
 useEffect(()=>{
  if(!version?.id)return;
  let alive=true;
  setIssuerStatus(null);
  portfolioRpc(db,'admin_certificate_status',{p_version:version.id})
   .then(data=>{if(alive)setIssuerStatus(data||null);})
   .catch(e=>{if(alive)setError(errText(e));});
  return ()=>{alive=false;};
 },[db,version?.id,version?.publishedAt]);
 const run=async(callback,success,preferredUnit)=>{
  setSaving(true);setMessage('');setError('');
  try{await callback();await reload(version?.id,preferredUnit||unit?.id);setMessage(success);return true;}
  catch(e){setError(errText(e));return false;}
  finally{setSaving(false);}
 };
 const findPeople=async()=>{
  setSaving(true);setError('');
  try{const result=await portfolioRpc(db,'admin_people',{p_search:search.trim()});setPeople(result||[]);}
  catch(e){setError(errText(e));}finally{setSaving(false);}
 };
 const onBrief=approve=>{
  if(approve&&!canApproveBrief){setError('Review the official criteria, replace the generic methods and complete the centre sign-off checklist.');return;}
  if(approve&&!window.confirm('Confirm you are authorised by Technica Consult, reviewed this Unit against its official criteria, and selected its assessment methods? Your approval is recorded.'))return;
  void run(()=>portfolioRpc(db,'admin_save_brief',{
   p_unit:unit.id,p_instructions:instructions,p_methods:assessmentMethods,p_approve:approve}),
   approve?'Unit brief approved by centre administrator.':'Draft saved for centre review.',
   approve?nextUnapproved?.id:undefined);
 };
 const onApproveAll=async()=>{
  if(saving||release||briefDirty||!bulkReview.ready||!bulkAttest)return;
  const ok=await run(()=>portfolioRpc(db,'admin_approve_all_briefs',{
   p_version:version.id,p_expected:bulkReview.expected,p_attest:true
  }),'All Unit briefs approved for the selected qualification. The edition remains Draft until published.');
  if(ok){setBulkOpen(false);setBulkAttest(false);}
 };
 const onPublish=async()=>{
  if(saving||release||briefDirty||!publicationChecks(version,references).every(c=>c.ok)||
     !validPublicationReference(approvalRef)||declaration.trim().length<70||!attest)return;
  const ok=await run(()=>portfolioRpc(db,'admin_publish',{
   p_version:version.id,p_approval_reference:approvalRef.trim(),p_declaration:declaration.trim(),p_attest:attest
  }),'Qualification is now Live. The approved edition is locked and ready for eligible enrolments.');
  if(ok){setPublishOpen(false);setAttest(false);}
 };
 const openPublish=()=>{if(saving||release)return;setError('');setAttest(false);setPublishOpen(true);};
 const reviewPublication=tab=>{
  setPublishOpen(false);
  const next=tab==='units'?version.units.find(u=>!sourceRubricForUnit(references,version,u).complete):
   version.units.find(u=>u.brief?.status!=='approved'||!u.brief?.approvedAt||needsAssessmentMethodReview(u.brief?.methods));
  if(next&&!briefDirty)chooseUnit(next.id);
  openSetup(briefDirty?'plans':tab);
 };
 const authorizeCertificate=()=>run(async()=>{
    await portfolioRpc(db,'admin_certificate_authorize',{
      p_version:version.id,p_issuer_name:issuerName.trim(),p_reference:issuerRef.trim(),
      p_evidence_url:issuerUrl.trim(),p_attest:issuerAttest
    });
    const status=await portfolioRpc(db,'admin_certificate_status',{p_version:version.id});
    setIssuerStatus(status||null);
  },'Certificate issuer authorization recorded. The verifier may record an externally issued certificate after verified completion.');
 const authorizeStaff=()=>{
  if(!window.confirm('Confirm this staff member has documented competence to act in the selected assessment role?'))return;
  run(()=>portfolioRpc(db,'admin_authorize_staff',{
    p_user:staffUser,p_role:staffRole,p_reference:staffReference.trim(),p_attest:staffAttest
  }),'Professional reviewer authorization recorded. This staff member may now be selected for the approved role.');
 };
 const revokeStaff=()=>{
  if(!window.confirm('Revoke this professional reviewer authorization? Future decisions will be blocked; reassign any unfinished portfolios affected.'))return;
  run(()=>portfolioRpc(db,'admin_revoke_staff',{
   p_user:revokeUser,p_role:revokeRole,p_reason:revokeReason.trim()
  }),'Reviewer authorization revoked. Reassign any unfinished portfolios using this reviewer.');
 };
 const authoriseInline=(id,role,reference)=>run(()=>portfolioRpc(db,'admin_authorize_staff',{
  p_user:id,p_role:role,p_reference:reference,p_attest:true
 }),'Professional reviewer authorisation recorded.');
 const onReassign=payload=>run(()=>portfolioRpc(db,'admin_reassign_simple',payload),
  'Active portfolio reviewers reassigned with auditable reason. Previous decisions remain intact.');
 const onAssign=payload=>run(()=>portfolioRpc(db,'admin_assign_simple',payload),
  'Learner enrolled in the selected qualification. Assessment permissions are assigned.');
 const onUpload=()=>{
  if(!file) return;
  const ext=file.name.split('.').pop()?.toLowerCase();
  const mime=mimeByExt[ext];if(!mime||file.size<1||file.size>10485760){setError('Choose a PDF, Word, Excel, JPG or PNG file up to 10 MB.');return;}
  run(async()=>{
    const reservation=await portfolioRpc(db,'admin_reserve_document',{
      p_unit:unit.id,p_kind:fileKind,p_title:fileTitle.trim(),p_filename:file.name,p_mime:mime,p_bytes:file.size
    });
    const {error:uploadError}=await db.storage.from('technica-qualification-materials')
      .upload(reservation.path,file,{contentType:mime,upsert:false});
    if(uploadError) throw uploadError;
    setFile(null);setFileTitle('');setFileAttest(false);
  },'File uploaded privately. An administrator must review and approve it before learners can access it.');
 };
 const approveFile=id=>{
  if(!window.confirm('Confirm this uploaded file is authorised for this qualification and centre-approved for distribution?'))return;
  run(()=>portfolioRpc(db,'admin_approve_document',{p_document:id,p_attest:true}),
  'Centre resource approved. Only appropriately enrolled users can open the file.');
 };
 if(loading)return <div className="qc-loading"><RefreshCw size={20}/> Loading the centre’s real qualification records…</div>;
 if(previewWorkspace)return <QualificationCentreLearnerPreview version={version}
   references={references} onBack={()=>setPreviewWorkspace(false)}/>;
 return <div className="qc-workspace">
  <header className="qac-header"><div><button className="qc-back" type="button" onClick={()=>{if(confirmDiscard())onBack();}}><ArrowLeft size={16}/> Back to Qualifications</button>
    <span className="qf-overline">CENTRE OPERATIONS · ADMIN ACCESS</span><h1>Qualification Management</h1>
    <p>Set up, manage and deliver professional qualifications.</p></div>
    <button type="button" className="qc-primary" disabled={!version||saving} onClick={()=>openSetup('units')}><GraduationCap size={17}/> Manage qualification</button>
  </header>
  <AdminQualificationNavigation section={section} onSection={setSection}/>
  {error&&<p role="alert" className="qc-error">{error}</p>}
  {message&&<p role="status" className="qc-success-message"><CheckCircle2 size={16}/>{message}</p>}
  {catalogueVisible&&<AdminQualificationCatalog versions={versions} version={version} references={references}
     staff={staff} saving={saving} onSelect={v=>{if(selectVersion(v))setSetupTab('summary');}}
     onSection={setSection} onTab={openSetup}/>}
  {catalogueVisible&&<AdminQualificationDetail version={version} references={references} staff={staff}
     tab={setupTab} onTab={setSetupTab} saving={saving} onPreview={()=>setPreviewWorkspace(true)}
     onEnrol={()=>setSection('enrolments')}/>}
  {!catalogueVisible&&version&&!['enrolments','staff'].includes(section)&&<div className="qac-section-context">
    <label htmlFor="qac-edition-select">Qualification edition</label>
    <select id="qac-edition-select" disabled={saving} value={version.id}
      onChange={e=>{const next=versions.find(v=>v.id===e.target.value);if(next)selectVersion(next);}}>
      {versions.map(v=><option key={v.id} value={v.id}>{v.title} · {v.version}</option>)}
    </select>
    <Pill ready={release}>{release?'Live':'Draft'}</Pill>
  </div>}
  {catalogueVisible&&!versions.length&&!error&&<Notice>No official qualification editions are available. The catalogue is source-backed; new-edition authoring is not enabled in this release.</Notice>}
    {version&&catalogueVisible&&setupTab==='release'&&<section className="qc-assessment-readiness" aria-label="Assessment access readiness">
    <div className="qc-assessment-readiness-heading">
      <div><span className="qf-overline">LIVE CENTRE RECORDS</span><h2>Assessment access readiness</h2>
        <p>Technical access opens only after centre publication and genuine learner enrolment.</p></div>
      <span className={'qc-assessment-readiness-status '+(readiness.published?'is-ready':'is-locked')}>
        {readiness.published?<CheckCircle2 size={16}/>:<LockKeyhole size={16}/>}
        {readiness.published?'Live · Ready for enrolment':'Draft'}
      </span>
    </div>
    <div className="qc-assessment-readiness-grid">
      <div><strong>{readiness.approvedBriefs} / {readiness.units}</strong><span>Unit briefs approved</span></div>
      <div><strong>{readiness.incompleteRubric.length===0?'Complete':readiness.incompleteRubric.length+' missing'}</strong><span>Source assessment rubric</span></div>
      <div><strong>{readiness.published?'Published':'Pending'}</strong><span>Centre release</span></div>
      <div><strong>{readiness.assessors} / {readiness.verifiers}</strong><span>Authorised Assessors / Verifiers</span></div>
      <div><strong>{readiness.enrolments}</strong><span>Real learner enrolments</span></div>
    </div>
    <div className="qc-assessment-next">
      <div><strong>{readiness.published?'Delivery options':'Next required action'}</strong><p>{readiness.published?'Published. Zero enrolled learners is a normal state; assign reviewers when enrolling.':readiness.next}</p></div>
      {!readiness.published&&readiness.pendingUnits.length>0&&<button className="qc-outline" type="button"
        onClick={()=>{chooseUnit(readiness.pendingUnits[0].id);openSetup('plans');}}>
        Review next Unit · {readiness.pendingUnits[0].code}
      </button>}
    </div>
    <small className="qc-assessment-caveat">Database readiness is not proof of awarding-body approval or permission to issue certificates. Never publish using test references.</small>
  </section>}
  {section==='updates'&&(release?<ProgrammeUpdatesAdmin key={version.id} db={db} version={version}/>:<Notice>Publish this edition before creating programme updates or appointments.</Notice>)}
  {version&&<div className="qac-setup-content">
    <Card id="qc-centre-unit-review" title="Unit assessment plans" icon={Layers3} hidden={!(section==='plans'||(catalogueVisible&&['units','plans'].includes(setupTab)))}>
      <p className="qc-secondary">The real Learning Outcomes and Assessment Criteria are already imported.
        These centre-authored brief drafts must be checked against the current programme before approval.</p>
      {!release&&<section className="qc-bulk-approval" aria-label="Approve all Unit briefs">
        <div className="qc-bulk-top"><div><strong>Qualification-wide approval</strong><small>{bulkReview.rows.length-bulkReview.pending} of {bulkReview.rows.length} Unit briefs approved</small></div>
         <button className="qc-outline" type="button" aria-expanded={bulkOpen} disabled={saving||!bulkReview.pending}
           onClick={()=>{setBulkAttest(false);setBulkOpen(old=>!old);}}><BookCheck size={17}/> Approve All Unit Briefs</button></div>
        {bulkOpen&&<div className="qc-bulk-review">
         <p>Review all saved briefs for this edition. Existing approvals will remain unchanged.</p>
         <div className="qc-bulk-rows">{bulkReview.rows.map((row,index)=><div key={row.id} className="qc-bulk-row">
          <div><strong>Unit {String(index+1).padStart(2,'0')} · {row.code}</strong><small>{row.title}</small>
           {!!row.blockers.length&&<small className="qc-bulk-blockers">{row.blockers.join(' · ')}</small>}</div>
          <Pill ready={!row.blockers.length}>{row.blockers.length?'Needs review':row.approved?'Approved':'Ready for approval'}</Pill>
          {!!row.blockers.length&&<button className="qc-inline-action" type="button" disabled={saving} onClick={()=>chooseUnit(row.id)}>Review Unit</button>}
         </div>)}</div>
         {briefDirty&&<p className="qc-bulk-blockers">Save the selected Unit draft before approving all briefs.</p>}
         <label className="qc-confirm"><input type="checkbox" checked={bulkAttest} disabled={saving||briefDirty||!bulkReview.ready}
          onChange={e=>setBulkAttest(e.target.checked)}/><span>I am authorised by Technica Consult and have reviewed all Unit briefs against their official criteria, selected assessment methods and acceptance conditions.</span></label>
         <div className="qc-actions"><button className="qc-outline" type="button" disabled={saving} onClick={()=>{setBulkOpen(false);setBulkAttest(false);}}>Cancel</button>
          <button className="qc-primary" type="button" disabled={saving||briefDirty||!bulkReview.ready||!bulkAttest}
           onClick={onApproveAll}><BookCheck size={17}/>{saving?'Approving…':'Confirm Approval · '+bulkReview.pending+' Units'}</button></div>
        </div>}
      </section>}
      <div className="qc-unit-pills">{version.units.map((u,index)=><button key={u.id} type="button"
        disabled={saving} className={unit?.id===u.id?'active':''} onClick={()=>chooseUnit(u.id)}
        title={u.title}>Unit {String(index+1).padStart(2,'0')} · {u.code}{u.brief?.status==='approved'&&<CheckCircle2 size={15}/>}</button>)}</div>
      {unit&&<div className="qc-unit-editor">
       <div className="qc-unit-head"><div><span className="qf-overline">{unit.code}</span><h3>{unit.title}</h3>
        <small>{unit.outcomes} Outcomes · {unit.criteria} Criteria</small></div>
        <Pill ready={unit.brief?.status==='approved'}>{unit.brief?.status==='approved'?'Centre approved':'Working draft'}</Pill></div>
       <details className="qc-source-rubric">
        <summary><span>Official source criteria · {sourceRubric.outcomes.length} Outcomes / {sourceRubric.criteria} Criteria</span>
          <Pill ready={sourceRubric.complete}>{sourceRubric.complete?'Matched':'Verification required'}</Pill></summary>
        {sourceRubric.complete?<div className="qc-source-rubric-body">
         <p>Compare this Unit's centre brief and methods against all official Learning Outcomes and Assessment Criteria. Source content is read-only.</p>
         {sourceRubric.outcomes.map(outcome=><div key={outcome.code} className="qc-source-outcome">
          <strong>LO {outcome.code} — {outcome.title}</strong>
          <ol>{outcome.criteria.map(criterion=><li key={criterion.code}><b>AC {criterion.code}</b> — {criterion.title}</li>)}</ol>
         </div>)}
         {sourceRubric.source?.source_url?.startsWith('https://')&&
          <a href={sourceRubric.source.source_url} target="_blank" rel="noopener noreferrer">Open awarding-body specification</a>}
        </div>:<p className="qc-source-rubric-missing">Official criteria are missing or inconsistent with the Unit record; approval is blocked until reviewed.</p>}
       </details>
       <label className="qc-field">Unit Assessment Brief — centre-authored editable text
        <textarea value={instructions} disabled={saving||release} rows={13}
          onChange={e=>{setInstructions(e.target.value);setReviewChecks(old=>({...old,rubric:false,authority:false}));}} maxLength={30000}/></label>
       <label className="qc-field">Assessment methods &amp; acceptance conditions
        <textarea value={assessmentMethods} disabled={saving||release} rows={3}
          onChange={e=>{setAssessmentMethods(e.target.value);setReviewChecks(old=>({...old,methods:false,authority:false}));}} maxLength={3000}
          placeholder="List approved evidence methods, required checks and any practical activities."/></label>
       {methodsNeedReview&&<p className="qc-method-warning" role="status"><ShieldAlert size={16}/>
        These are placeholder methods. Select real assessment methods and acceptance conditions for this Unit before centre approval.</p>}
       {!release&&<fieldset className="qc-approval-checklist"><legend>Unit approval checklist · centre sign-off</legend>
        <label><input type="checkbox" checked={reviewChecks.rubric} disabled={saving||!sourceRubric.complete}
          onChange={e=>setReviewChecks(old=>({...old,rubric:e.target.checked}))}/>
          I checked this Unit against every official Learning Outcome and Assessment Criterion.</label>
        <label><input type="checkbox" checked={reviewChecks.methods} disabled={saving||methodsNeedReview}
          onChange={e=>setReviewChecks(old=>({...old,methods:e.target.checked}))}/>
          The actual methods and acceptance conditions are centre-selected and appropriate for this Unit.</label>
        <label><input type="checkbox" checked={reviewChecks.authority} disabled={saving}
          onChange={e=>setReviewChecks(old=>({...old,authority:e.target.checked}))}/>
          I am authorised by Technica Consult to approve this centre-authored Unit brief.</label>
       </fieldset>}
       <div className="qc-actions">
        
        <button type="button" className="qc-primary" disabled={!canApproveBrief}
          onClick={()=>onBrief(true)}><BookCheck size={16}/> Approve Unit brief</button>
       </div>
      </div>}
    </Card>
    <Card title="Centre resources · protected uploads" icon={FolderClosed} hidden={!(catalogueVisible&&setupTab==='materials')}>
      <div className="qc-unit-pills" aria-label="Resource Unit selector">{version.units.map((u,index)=><button key={u.id} type="button" disabled={saving} className={unit?.id===u.id?'active':''} onClick={()=>chooseUnit(u.id)} title={u.title}>Unit {String(index+1).padStart(2,'0')} · {u.code}</button>)}</div>
      <p className="qc-secondary">Upload genuine centre-authorised Assignment Briefs, Reflective Account forms, Witness Testimony forms, CPD records or evidence matrices. Drafts cannot be viewed by learners until approved.</p>
      <div className="qc-document-list">{documents.map(d=><div key={d.id}>
        <FileCheck2 size={19}/><div><strong>{d.title}</strong><small>{d.kind.replaceAll('_',' ')} · {d.filename} · {stamp(d.createdAt)}</small></div>
        <Pill ready={d.status==='approved'}>{d.status==='approved'?'Approved':'Review pending'}</Pill>
        {d.status!=='approved'&&<button type="button" disabled={saving} onClick={()=>approveFile(d.id)}>Approve</button>}
      </div>)}{!documents.length&&<p className="qc-secondary">No real centre files are attached to this Unit yet.</p>}</div>
      <div className="qc-upload-form">
       <label className="qc-field">Document title<input value={fileTitle} disabled={saving} maxLength={160}
         onChange={e=>setFileTitle(e.target.value)} placeholder="e.g. Approved Assignment Brief — Unit 1"/></label>
       <label className="qc-field">Document type<select disabled={saving} value={fileKind} onChange={e=>setFileKind(e.target.value)}>
        {methods.map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
       <label className="qc-field">Private file (10 MB max)<input disabled={saving} type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
         onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
       <button className="qc-primary" type="button" disabled={saving||!file||fileTitle.trim().length<4}
         onClick={onUpload}><UploadCloud size={16}/> Upload to protected centre library</button>
      </div>
    </Card>
    <Card title="Publication settings" icon={ShieldCheck} hidden={!(catalogueVisible&&setupTab==='release')}>
       <p className="qc-secondary">Keep working in Draft until the official structure, Unit briefs and assessment methods are approved. Publish once the authorised centre sign-off is complete.</p>
       {release?<div className="qc-release-done"><CheckCircle2 size={19}/> Live since {stamp(version.publishedAt)} · {version.approvalReference}</div>:<>
        <div className="qc-release-readiness">{publicationChecks(version,references).map(check=><Pill key={check.id} ready={check.ok}>{check.label}</Pill>)}</div>
        <p className="qc-secondary">Centre approval reference and the full learner declaration are recorded during publication. Zero enrolled learners is valid.</p>
        <div className="qpub-settings-actions"><button type="button" className="qc-outline" disabled={saving} onClick={openPublish}><ShieldCheck size={17}/> Review publication readiness</button></div>
       </>}
     </Card>
     {section==='enrolments'&&<AssignmentWorkspace db={db} versions={versions} staff={staff} busy={saving}
      initialVersionId={version?.id} initialLearnerId={initialLearnerId} onAssign={onAssign} onReassign={onReassign} onAuthorise={authoriseInline}/>}
    <section className="qsr-workspace" hidden={section!=='staff'} aria-labelledby="qsr-title">
      <section className="qsr-authorise-panel">
        <header className="qsr-hero">
          <span className="qsr-hero-icon"><ShieldCheck size={31}/></span>
          <div><h2 id="qsr-title">Qualified assessment staff</h2>
            <p>A person may only serve as Assessor or Internal Verifier after the centre confirms their actual professional competence. These roles are distinct from a normal LMS login.</p></div>
        </header>
        <div className="qsr-authorise-layout">
          <aside className="qsr-guide">
            <div className="qsr-guide-head"><span className="qsr-guide-icon"><Users size={24}/></span>
              <div><h3>Authorise a reviewer</h3><p>Confirm the person's account, role and competence reference, then authorise them to review on behalf of the centre.</p></div></div>
            <ol>{['Select staff account','Choose assessment role','Add competence reference','Confirm and authorise'].map((step,index)=><li key={step}><span>{index+1}</span>{step}</li>)}</ol>
          </aside>
          <div className="qsr-form">
            <div className="qsr-fields">
              <AccountSelect db={db} role={staffRole} label="Staff account" value={staffUser} onChange={id=>{setStaffUser(id);setStaffAttest(false);}} staff={staff} revision={staff.length} disabled={saving}/>
              <label className="qc-field">Approved assessment role
                <select value={staffRole} disabled={saving} onChange={e=>{setStaffRole(e.target.value);setStaffUser('');setStaffAttest(false);}}>
                  <option value="assessor">Assessor</option><option value="verifier">Internal Verifier</option>
                </select></label>
              <label className="qc-field qsr-reference">Documented competence / authorisation reference
                <input value={staffReference} maxLength={220} disabled={saving}
                  onChange={e=>{setStaffReference(e.target.value);setStaffAttest(false);}} placeholder="Training centre competency verification / assessor qualification record"/></label>
            </div>
            <label className="qc-confirm"><input type="checkbox" checked={staffAttest} disabled={saving}
              onChange={e=>setStaffAttest(e.target.checked)}/>
              <span>I confirm the centre has verified this person’s competence and authorisation for this assessment role.</span></label>
            <button type="button" className="qc-primary" disabled={saving||!staffUser||!staffAttest||staffReference.trim().length<12}
              onClick={authorizeStaff}><ShieldCheck size={19}/> Authorise reviewer</button>
          </div>
        </div>
      </section>
      <section className="qsr-directory" aria-label="Authorised centre reviewers">
        <header><span className="qsr-directory-icon"><Users size={23}/></span><h2>Authorised centre reviewers ({staff.length})</h2></header>
        <div className="qsr-reviewer-grid">
          {staff.map(s=>{const key=s.userId+':'+s.role;
            const name=s.name||people.find(p=>p.id===s.userId)?.email||s.userId;
            const assigned=enrolmentRows(versions).filter(e=>!e.completedAt&&(s.role==='assessor'?e.assessorId:e.verifierId)===s.userId).length;
            return <article className="qsr-reviewer" key={key}>
              <div className="qsr-reviewer-head"><span className="qsr-person-icon"><UserRound size={23}/></span>
                <strong>{name}</strong><span className={'qsr-role '+s.role}>{s.role==='assessor'?'Assessor':'Verifier'}</span>
                <details className="qsr-card-menu"><summary aria-label={'Actions for '+name+' '+s.role}><Ellipsis size={19}/></summary>
                  <div><button type="button" disabled={saving} onClick={e=>{e.currentTarget.closest('details').open=false;setRevokeUser(s.userId);setRevokeRole(s.role);setRevokeReason('');if(staffRevokeRef.current){staffRevokeRef.current.open=true;staffRevokeRef.current.scrollIntoView({block:'nearest',behavior:'auto'});}}}><ShieldAlert size={16}/> Revoke authorisation</button></div>
                </details>
              </div>
              <div className="qsr-reviewer-meta"><FileText size={17}/><span>{s.reference}</span></div>
              <div className="qsr-reviewer-meta"><Layers3 size={17}/><span>{assigned} active assigned {assigned===1?'portfolio':'portfolios'}</span></div>
            </article>;
          })}
        </div>
        {!staff.length&&<div className="qsr-empty"><Users size={26}/><strong>No authorised reviewers yet</strong><span>Authorise an eligible staff account above to get started.</span></div>}
      </section>
      {!!staff.length&&<details className="qc-revoke qsr-revoke" ref={staffRevokeRef}>
        <summary><ChevronDown size={19}/> Revoke a professional reviewer authorization</summary>
        <div className="qsr-revoke-form">
          <label className="qc-field">Authorised reviewer<select disabled={saving} value={revokeUser+':'+revokeRole}
            onChange={e=>{const item=staff.find(s=>s.userId+':'+s.role===e.target.value);
              setRevokeUser(item?.userId||'');setRevokeRole(item?.role||'');setRevokeReason('');}}>
            <option value=":">Choose reviewer and role</option>
            {staff.map(s=><option key={s.userId+':'+s.role} value={s.userId+':'+s.role}>
              {s.name||people.find(p=>p.id===s.userId)?.email||s.userId} · {s.role}</option>)}
          </select></label>
          <label className="qc-field">Documented reason<textarea rows={2} value={revokeReason}
            onChange={e=>setRevokeReason(e.target.value)} maxLength={1000} disabled={saving}/></label>
          <p className="qsr-revoke-note"><Info size={16}/> Future decisions for this role will be blocked. Reassign any unfinished portfolios affected.</p>
          <button type="button" className="qc-outline" disabled={saving||!staff.some(s=>s.userId===revokeUser&&s.role===revokeRole)||revokeReason.trim().length<15}
            onClick={revokeStaff}><ShieldAlert size={17}/> Revoke authorization</button>
        </div>
      </details>}
    </section>
    <Card title="Certificate issuer authorization" icon={FileCheck2} hidden={section!=='certificates'}>
      <p className="qc-secondary">Releasing a qualification does not authorise certificate issuance. The verifier can only record an actually issued certificate after the awarding body’s authority has been documented.</p>
      {!release?<p className="qc-locked"><LockKeyhole size={16}/> Release the centre-approved programme first.</p>:
       issuerStatus?<div className="qc-release-done"><CheckCircle2 size={19}/>
        <span>Authorised by {issuerStatus.issuer} · {issuerStatus.reference}
        <a href={issuerStatus.evidenceUrl} target="_blank" rel="noopener noreferrer"> View supporting record</a></span></div>:<>
        <label className="qc-field">Issuing awarding body
          <input value={issuerName} maxLength={140} disabled={saving}
            onChange={e=>setIssuerName(e.target.value)} placeholder="Legal name of certificate issuer"/></label>
        <label className="qc-field">Actual issuing-authority reference
          <input value={issuerRef} maxLength={240} disabled={saving}
            onChange={e=>setIssuerRef(e.target.value)} placeholder="Documented awarding-body authorisation"/></label>
        <label className="qc-field">Evidence URL (HTTPS)
          <input type="url" value={issuerUrl} disabled={saving} onChange={e=>setIssuerUrl(e.target.value)}
            placeholder="https://…"/></label>
        <label className="qc-confirm"><input type="checkbox" disabled={saving} checked={issuerAttest}
          onChange={e=>setIssuerAttest(e.target.checked)}/>
          <span>I confirm this issuer authority is real and documented, and that no certificate will be recorded without an externally issued certificate number.</span></label>
        <button type="button" className="qc-primary"
          disabled={saving||!issuerAttest||issuerName.trim().length<4||issuerRef.trim().length<12||!issuerUrl.startsWith('https://')}
          onClick={()=>{if(window.confirm('Confirm actual awarding-body certificate issuer authorisation for this version?'))authorizeCertificate();}}>
          <ShieldCheck size={16}/> Record issuer authorization
        </button>
       </>}
    </Card>
    <Card title="Release governance" icon={ShieldAlert} hidden={!(catalogueVisible&&setupTab==='release')}>
      <p className="qc-secondary">This edition is based on the supplied awarding-body specification. The centre must confirm it is the appropriate version for the learner, assessment requirements, and regulatory conditions.</p>
      <ul className="qc-gov-list"><li><CheckCircle2 size={15}/> Real source Unit rubric preserved</li>
       <li><CheckCircle2 size={15}/> Learner is separate; verification decisions remain independent</li>
       <li><CheckCircle2 size={15}/> Evidence stored privately</li>
       <li><LockKeyhole size={15}/> Certificate recording remains disabled until externally authorised</li></ul>
    </Card>
  </div>}
  {(catalogueVisible||section==='plans')&&version&&<QualificationPublishBar version={version} dirty={briefDirty} canSave={canSaveDraft}
    saving={saving} onSave={()=>onBrief(false)} onPublish={openPublish} onEnrol={()=>setSection('enrolments')}/>}
  {publishOpen&&version&&!release&&<QualificationPublishDialog version={version} references={references} dirty={briefDirty}
    saving={saving} error={error} approvalRef={approvalRef} declaration={declaration} attest={attest}
    onApprovalRef={v=>{setApprovalRef(v);setAttest(false);}} onDeclaration={v=>{setDeclaration(v);setAttest(false);}}
    onAttest={setAttest} onClose={()=>setPublishOpen(false)} onReview={reviewPublication} onPublish={onPublish}/>}
 </div>;
}
