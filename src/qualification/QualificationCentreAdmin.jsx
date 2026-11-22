import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,BookCheck,BookOpen,CheckCircle2,ClipboardCheck,Download,FileCheck2,FilePlus2,
 FileText,FolderClosed,GraduationCap,Info,Layers3,LockKeyhole,RefreshCw,Search,ShieldAlert,ShieldCheck,UploadCloud,Users} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';
import './qualificationCentreAdmin.css';

const methods=[['assignment_brief','Assignment Brief'],['reflective_account','Reflective Account'],
 ['witness_testimony','Witness Testimony'],['cpd_record','CPD Record'],
 ['evidence_matrix','Evidence Matrix'],['other','Other centre document']];
const mimeByExt={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
const errText=e=>e?.message||'This action could not be completed.';
const stamp=date=>date?new Date(date).toLocaleDateString(undefined,{dateStyle:'medium'}):'Not yet';
function Pill({ready,children}){return <span className={'qc-pill '+(ready?'qc-success':'qc-pending')}>{ready?<CheckCircle2 size={13}/>:<Info size={13}/>} {children}</span>;}
function Notice({children}){return <div className="qc-notice"><Info size={18}/><span>{children}</span></div>;}
function Card({title,icon:Icon,children}){return <section className="qc-card"><header><Icon size={19}/><h3>{title}</h3></header>{children}</section>;}
function PeopleSelect({label,value,onChange,people,disabled}){return <label className="qc-field">{label}
 <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} required>
  <option value="">Select active account</option>
  {people.map(p=><option value={p.id} key={p.id}>{p.name||p.email} · {p.email}</option>)}
 </select></label>;}

export default function QualificationCentreAdmin({db,onBack}){
 const [versions,setVersions]=useState([]),[people,setPeople]=useState([]);
 const [search,setSearch]=useState(''),[versionId,setVersionId]=useState(''),[unitId,setUnitId]=useState('');
 const [instructions,setInstructions]=useState(''),[assessmentMethods,setAssessmentMethods]=useState('');
 const [approvalRef,setApprovalRef]=useState(''),[declaration,setDeclaration]=useState('');
 const [attest,setAttest]=useState(false),[learner,setLearner]=useState(''),[assessor,setAssessor]=useState(''),
 [verifier,setVerifier]=useState(''),[startOn,setStartOn]=useState(()=>new Date().toISOString().slice(0,10)),
 [targetOn,setTargetOn]=useState('');
 const [fileTitle,setFileTitle]=useState(''),[fileKind,setFileKind]=useState(methods[0][0]),
 [file,setFile]=useState(null),[fileAttest,setFileAttest]=useState(false);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),
 [message,setMessage]=useState(''),[error,setError]=useState('');
 const version=versions.find(v=>v.id===versionId)||versions[0];
 const unit=version?.units?.find(u=>u.id===unitId)||version?.units?.[0];
 const release=!!version?.publishedAt;
 const approved=version?.units.filter(u=>u.brief?.status==='approved').length||0;
 const total=version?.units.length||0;
 const documents=unit?.documents||[];

 const reload=async(preferredVersion,preferredUnit)=>{
  const [v,p]=await Promise.all([portfolioRpc(db,'admin_workspace'),portfolioRpc(db,'admin_people',{p_search:search.trim()})]);
  setVersions(v||[]);setPeople(p||[]);
  const selected=v?.find(item=>item.id===(preferredVersion||versionId))||v?.[0];
  setVersionId(selected?.id||'');
  const selectedUnit=selected?.units.find(item=>item.id===(preferredUnit||unitId))||selected?.units[0];
  setUnitId(selectedUnit?.id||'');
 };
 useEffect(()=>{
  let alive=true;
  Promise.all([portfolioRpc(db,'admin_workspace'),portfolioRpc(db,'admin_people',{p_search:''})])
    .then(([v,p])=>{if(!alive)return;setVersions(v||[]);setPeople(p||[]);
      setVersionId(v?.[0]?.id||'');setUnitId(v?.[0]?.units?.[0]?.id||'');})
    .catch(e=>{if(alive)setError(errText(e));})
    .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[db]);
 useEffect(()=>{setInstructions(unit?.brief?.instructions||'');setAssessmentMethods(unit?.brief?.methods||'');},[unit?.id,unit?.brief?.approvedAt,unit?.brief?.instructions,unit?.brief?.methods]);
 useEffect(()=>{setApprovalRef('');setAttest(false);setDeclaration('');},[version?.id]);
 const run=async(callback,success)=>{
  setSaving(true);setMessage('');setError('');
  try{await callback();await reload(version?.id,unit?.id);setMessage(success);}
  catch(e){setError(errText(e));}
  finally{setSaving(false);}
 };
 const findPeople=async()=>{
  setSaving(true);setError('');
  try{const result=await portfolioRpc(db,'admin_people',{p_search:search.trim()});setPeople(result||[]);}
  catch(e){setError(errText(e));}finally{setSaving(false);}
 };
 const onBrief=approve=>{
  if(approve&&!window.confirm('Confirm you reviewed this Unit assessment plan and approve it as a Technica centre-authored brief, not an awarding-body document?'))return;
  run(()=>portfolioRpc(db,'admin_save_brief',{
   p_unit:unit.id,p_instructions:instructions,p_methods:assessmentMethods,p_approve:approve}),
   approve?'Unit brief approved by centre administrator.':'Draft saved for centre review.');
 };
 const onPublish=()=>run(()=>portfolioRpc(db,'admin_publish',{
  p_version:version.id,p_approval_reference:approvalRef.trim(),p_declaration:declaration.trim(),p_attest:attest
 }),'Programme version published and locked. You can now assign distinct learner, assessor and verifier.');
 const onAssign=()=>run(()=>portfolioRpc(db,'admin_assign',{
  p_version:version.id,p_learner:learner,p_assessor:assessor,p_verifier:verifier,p_start:startOn,
  p_target:targetOn||null
 }),'Learner enrolled in the real qualification. Assessment permissions are assigned.');
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
 return <div className="qc-workspace">
  <div className="qc-top"><div><button className="qc-back" type="button" onClick={onBack}><ArrowLeft size={17}/> Back to Qualifications</button>
   <span className="qf-overline">CENTRE OPERATIONS · ADMIN ACCESS</span><h1>Qualification Management</h1>
   <p>Authorise source-backed programmes, approve Unit assessment briefs, attach private resources and enrol real learners.</p>
  </div><div className="qc-top-icon"><ShieldCheck size={31}/></div></div>
  <Notice>Imported awarding-body specifications are real reference material, not evidence of centre approval.
    Only your centre administrator can release a version. Certificates stay disabled until there is an externally issued certificate reference and a separate authorised configuration.</Notice>
  {error&&<p role="alert" className="qc-error">{error}</p>}
  {message&&<p role="status" className="qc-success-message"><CheckCircle2 size={16}/>{message}</p>}
  <div className="qc-versions" aria-label="Choose qualification edition">
   {versions.map(v=>{
    const passed=v.units.filter(u=>u.brief?.status==='approved').length;
    return <button key={v.id} type="button" className={v.id===version?.id?'selected':''}
      disabled={saving} onClick={()=>{setVersionId(v.id);setUnitId(v.units[0]?.id||'');}}>
      <span>{v.title}</span><small>{v.version} · {v.units.length} Units</small>
      <Pill ready={!!v.publishedAt}>{v.publishedAt?'Released':'Centre approval pending'}</Pill>
      <div className="qc-mini-track"><div style={{width:`${v.units.length?Math.round(passed/v.units.length*100):0}%`}}/></div>
      <small>{passed}/{v.units.length} Unit briefs approved</small>
    </button>;
   })}
  </div>
  {version&&<div className="qc-columns">
   <div className="qc-main">
    <Card title="Unit assessment plans" icon={Layers3}>
      <p className="qc-secondary">The real Learning Outcomes and Assessment Criteria are already imported.
        These centre-authored brief drafts must be checked against the current programme before approval.</p>
      <div className="qc-unit-pills">{version.units.map(u=><button key={u.id} type="button"
        disabled={saving} className={unit?.id===u.id?'active':''} onClick={()=>setUnitId(u.id)}
        title={u.title}>{u.code}{u.brief?.status==='approved'&&<CheckCircle2 size={15}/>}</button>)}</div>
      {unit&&<div className="qc-unit-editor">
       <div className="qc-unit-head"><div><span className="qf-overline">{unit.code}</span><h3>{unit.title}</h3>
        <small>{unit.outcomes} Outcomes · {unit.criteria} Criteria</small></div>
        <Pill ready={unit.brief?.status==='approved'}>{unit.brief?.status==='approved'?'Centre approved':'Working draft'}</Pill></div>
       <label className="qc-field">Unit Assessment Brief — centre-authored editable text
        <textarea value={instructions} disabled={saving||release} rows={13}
          onChange={e=>setInstructions(e.target.value)} maxLength={30000}/></label>
       <label className="qc-field">Assessment methods &amp; acceptance conditions
        <textarea value={assessmentMethods} disabled={saving||release} rows={3}
          onChange={e=>setAssessmentMethods(e.target.value)} maxLength={3000}
          placeholder="List approved evidence methods, required checks and any practical activities."/></label>
       <div className="qc-actions">
        <button type="button" className="qc-outline" disabled={saving||release||!instructions.trim()}
          onClick={()=>onBrief(false)}><FileText size={16}/> Save draft</button>
        <button type="button" className="qc-primary" disabled={saving||release||instructions.trim().length<80||assessmentMethods.trim().length<20}
          onClick={()=>onBrief(true)}><BookCheck size={16}/> Approve Unit brief</button>
       </div>
      </div>}
    </Card>
    <Card title="Centre resources · protected uploads" icon={FolderClosed}>
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
    <Card title="Release an assessed qualification" icon={ShieldCheck}>
      <div className="qc-release-readiness"><Pill ready={approved===total&&total>0}>{approved}/{total} Centre-approved Unit briefs</Pill>
      <Pill ready={version.units.every(u=>u.criteria>0)}>{version.units.reduce((n,u)=>n+u.criteria,0)} assessment criteria</Pill></div>
      <p className="qc-secondary">Release locks the rubric and opens real enrolments. This is a formal administrative action, not an automatic conversion of a reference specification.</p>
      {release?<div className="qc-release-done"><CheckCircle2 size={19}/> Published {stamp(version.publishedAt)} · {version.approvalReference}</div>:<>
        <label className="qc-field">Centre approval / authorisation reference
          <input value={approvalRef} maxLength={180} disabled={saving} onChange={e=>setApprovalRef(e.target.value)}
            placeholder="Enter the genuine centre authorization or approval record"/></label>
        <label className="qc-field">Learner declaration (full approved wording)
          <textarea value={declaration} maxLength={5000} disabled={saving} rows={4}
            onChange={e=>setDeclaration(e.target.value)} placeholder="The approved declaration the learner must accept before assessment…"/></label>
        <label className="qc-confirm"><input type="checkbox" checked={attest} disabled={saving} onChange={e=>setAttest(e.target.checked)}/>
          <span>I am authorised by the centre to approve this exact qualification issue, each Unit brief and the learner declaration. All assessments will follow centre quality assurance.</span></label>
        <button className="qc-primary" type="button"
          disabled={saving||!attest||approved!==total||approvalRef.trim().length<10||declaration.trim().length<70}
          onClick={()=>{if(window.confirm('Publish and permanently lock this centre-approved qualification edition?'))onPublish();}}>
          <ShieldCheck size={17}/> Release approved qualification
        </button>
      </>}
    </Card>
   </div>
   <aside className="qc-aside">
    <Card title="Learner & reviewer assignment" icon={Users}>
      <p className="qc-secondary">Only published, centre-approved qualifications can be assigned. Reviewers must be different active users.</p>
      <div className="qc-people-search"><input aria-label="Find users by name or email" value={search}
        onChange={e=>setSearch(e.target.value)} placeholder="Search active accounts"/>
        <button type="button" onClick={findPeople} disabled={saving}><Search size={17}/></button></div>
      <PeopleSelect label="Learner" value={learner} onChange={setLearner} people={people} disabled={saving||!release}/>
      <PeopleSelect label="Assessor" value={assessor} onChange={setAssessor} people={people} disabled={saving||!release}/>
      <PeopleSelect label="Internal Verifier" value={verifier} onChange={setVerifier} people={people} disabled={saving||!release}/>
      <div className="qc-dates"><label className="qc-field">Start date<input type="date" value={startOn}
        onChange={e=>setStartOn(e.target.value)} disabled={saving||!release}/></label>
      <label className="qc-field">Target date<input type="date" value={targetOn}
        min={startOn} onChange={e=>setTargetOn(e.target.value)} disabled={saving||!release}/></label></div>
      <button type="button" className="qc-primary" disabled={saving||!release||!learner||!assessor||!verifier||
        new Set([learner,assessor,verifier]).size!==3} onClick={onAssign}><GraduationCap size={17}/> Enrol &amp; assign</button>
      {!release&&<p className="qc-locked"><LockKeyhole size={16}/> Release and sign off all Unit briefs before enrolling.</p>}
      <hr/><h4>Current enrolments</h4>
      {version.enrolments.length?version.enrolments.map(e=><div className="qc-enrolled" key={e.id}>
         <strong>{e.learner}</strong><small>Assessor: {e.assessor} · Verifier: {e.verifier}</small>
         <small>{e.completedAt?'Completed':'In progress'} · Started {e.startOn}</small>
      </div>):<p className="qc-secondary">No active learner enrolments on this edition.</p>}
    </Card>
    <Card title="Release governance" icon={ShieldAlert}>
      <p className="qc-secondary">This edition is based on the supplied awarding-body specification. The centre must confirm it is the appropriate version for the learner, assessment requirements, and regulatory conditions.</p>
      <ul className="qc-gov-list"><li><CheckCircle2 size={15}/> Real source Unit rubric preserved</li>
       <li><CheckCircle2 size={15}/> Learner / Assessor / Verifier are separate</li>
       <li><CheckCircle2 size={15}/> Evidence stored privately</li>
       <li><LockKeyhole size={15}/> Certificate recording remains disabled until externally authorised</li></ul>
    </Card>
   </aside>
  </div>}
 </div>;
}
