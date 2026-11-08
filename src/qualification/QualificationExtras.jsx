import React,{useRef,useState} from 'react';
import {BookOpen,CalendarDays,Check,CheckCircle2,ChevronRight,ClipboardCheck,ClipboardList,Clock3,FileText,FolderOpen,Info,MessageSquare,Plus,Send,ShieldCheck,Upload,Users,X} from 'lucide-react';
import './qualificationExtras.css';
import UnitMaterialPanel from './UnitMaterialPanel.jsx';

// P26: Portfolio *preview* only, intentionally no Supabase access or official resource URLs.
// Learners and admins see clearly identified demo/reference content until approved files and
// audited assessment/assessor records are connected to the backend.
const exampleResources=[
 'Unit 1 Witness Testimony Template',
 'Unit 1 Reflective Account Template',
 'Unit 1 Learner Guidance Notes'
];
const sampleFeedback=[
 ['1.1','More supporting workplace evidence is needed.'],
 ['1.2','Criteria met in this example.'],
 ['1.3','Add evidence that supports the reflective account.']
];
function MiniCard({title,icon:Icon,action,children}) {
 return <section className="qfx-card">
  <header className="qfx-card-title"><div>{Icon&&<Icon size={17}/>}<h3>{title}</h3></div>{action}</header>
  {children}
 </section>;
}
function Empty({children}){return <div className="qfx-empty"><Info size={17}/>{children}</div>;}
export function PortfolioSnapshot({filesCount,mapped,criteriaCount,submitted,assessor='Not assigned',verifier='Not assigned'}){
 return <div className="qfx-snapshot" aria-label="Qualification portfolio overview">
  <div className="qfx-mini-stat"><span>Evidence</span><strong>{filesCount}</strong></div>
  <div className="qfx-mini-stat"><span>Criteria linked</span><strong>{mapped}/{criteriaCount}</strong></div>
  <div className="qfx-mini-stat"><span>Submission</span><strong className={submitted?'qfx-state-good':''}>{submitted?'Submitted · Demo':'Draft'}</strong></div>
  <div className="qfx-person"><span><Users size={15}/> Assessor</span><strong>{assessor}</strong></div>
  <div className="qfx-person"><span><ShieldCheck size={15}/> Verifier</span><strong>{verifier}</strong></div>
 </div>;
}
export function LearnerCourseSection({unitCode,qualificationId,unitIndex,submitted,hasCriteria,onEvidence,onMapping}){
 const isNvqReference=qualificationId==='nvq6'&&unitIndex===0;
 return <div className="qfx-course-material-layout">
  <UnitMaterialPanel key={unitCode} unitCode={unitCode}/>
  <aside className="qfx-course-sidebar" aria-label="Unit resources and actions">
   <MiniCard title="Resources" icon={FolderOpen}>
    {isNvqReference?<><div className="qfx-example-tag">REFERENCE FROM WALKTHROUGH</div><div className="qfx-resource-list">
      {exampleResources.map(name=><div key={name}><FileText size={17}/><span>{name}</span><small>Not downloadable · not supplied</small></div>)}
     </div></>:<Empty>No approved resources published for this unit. The source outline is available.</Empty>}
    <p className="qfx-footnote">The study outline and its source PDF are on this Unit page. Assignment briefs and downloadable templates require authorised centre files.</p>
   </MiniCard>
   <MiniCard title="Actions" icon={ClipboardCheck}>
    <div className="qfx-simple-details"><div><span>Status</span><strong>{submitted?'Submitted (demo)':'Not submitted'}</strong></div>
     <div><span>Criteria</span><strong>{hasCriteria?'Sample criteria available':'Full rubric not imported'}</strong></div>
     <div><span>Deadline</span><strong>Not set</strong></div></div>
    <button className="qfx-action" type="button" onClick={onEvidence}>View Evidence <ChevronRight size={16}/></button>
    <button className="qfx-text-action" type="button" onClick={onMapping} disabled={!hasCriteria}>Map criteria</button>
   </MiniCard>
  </aside>
 </div>;
}
export function LearnerContactSection({qualificationId,unitIndex,submitted}){
 const hasReferenceExample=qualificationId==='nvq6'&&unitIndex===0;
 return <div className="qfx-contact-layout">
  <MiniCard title="Contact Diary" icon={MessageSquare}>
   <p className="qfx-muted">Messages and assessment decisions from your assessor will appear here.</p>
   <Empty>{submitted?'No live assessor response connected.':'No assessor messages yet.'}</Empty>
  </MiniCard>
  <MiniCard title="Assessment Feedback" icon={ClipboardCheck}>
   <div className="qfx-example-tag">REFERENCE EXAMPLE · NOT YOUR ASSESSMENT</div>
   <div className="qfx-feedback-head"><div><span className="qfx-avatar">AS</span><span><strong>Sample assessor</strong><small>Outcome returned for changes</small></span></div><span className="qfx-returned">Returned</span></div>
   <p className="qfx-muted">This is how criterion-by-criterion feedback will look after review.</p>
   <div className="qfx-feedback-points">{sampleFeedback.map(([code,message])=><div key={code}><b>{code}</b><span>{message}</span></div>)}</div>
   {!hasReferenceExample&&<p className="qfx-footnote">Shown for layout demonstration only; not tied to this qualification's rubric.</p>}
  </MiniCard>
 </div>;
}
export function LearnerRecordsSection({filesCount,mapped,criteriaCount,submitted}){
 return <div className="qfx-records">
  <MiniCard title="Registration" icon={CalendarDays}>
   <div className="qfx-simple-details"><div><span>Start date</span><strong>Not connected</strong></div><div><span>Expected end</span><strong>Not connected</strong></div>
    <div><span>Assessor</span><strong>Not assigned</strong></div><div><span>Verifier</span><strong>Not assigned</strong></div></div>
  </MiniCard>
  <MiniCard title="Metrics" icon={Clock3}>
   <div className="qfx-metrics"><div><strong>{filesCount}</strong><span>Evidence files</span></div><div><strong>{mapped}/{criteriaCount}</strong><span>Criteria linked</span></div><div><strong>{submitted?'1':'0'}</strong><span>Preview submissions</span></div></div>
  </MiniCard>
  <MiniCard title="Grading Checklists" icon={ClipboardCheck}><Empty>No assessor checklists available yet.</Empty></MiniCard>
  <MiniCard title="Recording Forms" icon={FileText}><Empty>No approved recording forms published yet.</Empty></MiniCard>
 </div>;
}
export function AdminResourcesSection({onNotify,unitRef,resources=[],onResourcesChange}){
 const inputRef=useRef(null);
 const [newName,setNewName]=useState('');
 const addResource=()=>{
  if(!newName.trim())return;
  onResourcesChange([...resources,{id:'name-'+Date.now(),name:newName.trim(),type:'Draft title'}]);
  setNewName('');onNotify('Resource draft added to this preview only.');
 };
 const addFiles=e=>{
  const added=Array.from(e.target.files||[]).map((file,i)=>({id:'file-'+Date.now()+'-'+i,name:file.name,type:'Local file preview'}));
  if(added.length){onResourcesChange([...resources,...added]);onNotify('File names stored in the preview only. No upload occurred.');}
  e.target.value='';
 };
 return <><UnitMaterialPanel key={unitRef} unitCode={unitRef} compact/><div className="qfx-grid qfx-two">
  <MiniCard title="Unit Resources" icon={FolderOpen}>
   <p className="qfx-muted">Unit {unitRef} · Draft guidance and templates.</p>
   {resources.length?<div className="qfx-resource-list">{resources.map(item=><div key={item.id}><FileText size={17}/><span>{item.name}</span><small>{item.type}</small><button type="button" title={'Remove '+item.name} aria-label={'Remove '+item.name} onClick={()=>onResourcesChange(resources.filter(x=>x.id!==item.id))}><X size={16}/></button></div>)}</div>:<Empty>No unit resources added.</Empty>}
  </MiniCard>
  <MiniCard title="Add Resources" icon={Upload}>
   <label className="qfx-input-label">Resource name<input maxLength={130} placeholder="e.g. Assignment guidance" value={newName} onChange={e=>setNewName(e.target.value)}/></label>
   <div className="qfx-inline-actions"><button type="button" className="qfx-action" onClick={addResource} disabled={!newName.trim()}><Plus size={15}/> Add name</button>
    <input className="qfx-hidden" ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" onChange={addFiles} aria-label="Choose draft resource files"/>
    <button type="button" className="qfx-outline" onClick={()=>inputRef.current?.click()}><Upload size={15}/> Select files</button></div>
   <p className="qfx-footnote">Draft names only. Publication requires approved Storage upload, permission checks and file versioning.</p>
  </MiniCard>
 </div></>;
}
export function AdminPortfolioRecords({reviewHistory=[],criteria=[],unitRef,addNote,notes=[]}){
 const [draft,setDraft]=useState('');
 const save=()=>{
  if(!draft.trim())return;
  addNote(draft.trim());setDraft('');
 };
 return <div className="qfx-records">
  <MiniCard title="Contact Diary" icon={MessageSquare}>
   {reviewHistory.length===0&&notes.length===0?<Empty>No recorded activity in this preview yet.</Empty>:
    <div className="qfx-diary">
     {reviewHistory.map((item,i)=><article key={'review-'+i}><span className="qfx-tag">{item.outcome==='accept'?'Criteria Met':'Returned for Action'} · Demo</span><strong>Sample assessor review</strong><p>{item.feedback||'Criteria recorded as Met in this preview.'}</p><small>{item.date}</small></article>)}
     {notes.map((item,i)=><article key={'note-'+i}><span className="qfx-tag">Note · Demo</span><strong>Admin note</strong><p>{item.text}</p><small>{item.date}</small></article>)}
    </div>}
   <label className="qfx-input-label">New note<textarea value={draft} rows={3} maxLength={1800} placeholder="Write a contact diary note" onChange={e=>setDraft(e.target.value)}/></label>
   <button className="qfx-action" type="button" disabled={!draft.trim()} onClick={save}><Plus size={15}/> Add note</button>
  </MiniCard>
  <MiniCard title="Registration" icon={Users}>
   <div className="qfx-simple-details"><div><span>Unit</span><strong>{unitRef}</strong></div><div><span>Assessor</span><strong>Not assigned</strong></div><div><span>Verifier</span><strong>Not assigned</strong></div>
    <div><span>Start / End</span><strong>Not connected</strong></div></div>
   <p className="qfx-footnote">Live assessor/verifier assignment is not connected.</p>
  </MiniCard>
  <MiniCard title="Grading Checklists" icon={ClipboardList}>
   {criteria.length?<div className="qfx-grade-list">{criteria.map(([code,title])=><div key={code}><b>{code}</b><span>{title}</span></div>)}</div>:<Empty>No approved criteria imported for this unit.</Empty>}
   <p className="qfx-footnote">The checklist is a preview based on imported criteria, not a signed grading record.</p>
  </MiniCard>
  <MiniCard title="Recording Forms" icon={FileText}><Empty>No recording forms uploaded. These require approved file storage.</Empty></MiniCard>
 </div>;
}
