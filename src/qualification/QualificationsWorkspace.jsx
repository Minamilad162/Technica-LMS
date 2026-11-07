import React,{useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronRight,ClipboardCheck,FileImage,FileSpreadsheet,FileText,FolderOpen,GraduationCap,Info,Link2,LockKeyhole,MessageSquare,Plus,Save,Send,ShieldCheck,Upload,X} from 'lucide-react';
import {QUALIFICATIONS,FIRST_LO,SAMPLE_EVIDENCE} from './qualificationData.js';
import './qualifications.css';

// P25: visual-only Qualifications workspace. No private files, credentials or assessment writes.
const unitKey=(qualificationId,unitIndex)=>qualificationId+':'+unitIndex;
const two=n=>String(n+1).padStart(2,'0');

function Button({children,onClick,variant='primary',disabled=false}) {
 return <button type="button" className={'qf-button qf-'+variant} disabled={disabled} onClick={onClick}>{children}</button>;
}
function PreviewNote(){return <p className="qf-preview-note" role="note"><Info size={13}/> Demo preview · No file uploads or assessment records are saved.</p>;}
function FileIcon({kind}){const Icon=kind==='image'?FileImage:kind==='sheet'?FileSpreadsheet:FileText;return <span className={'qf-file-icon '+(kind||'doc')}><Icon size={19}/></span>;}
function FileRow({file,onRemove}){
 return <div className="qf-file-row"><FileIcon kind={file.icon}/><span className="qf-file-name"><strong title={file.name}>{file.name}</strong><small>{file.kind} · {file.size}</small></span>
 {onRemove&&<button className="qf-icon-button" type="button" aria-label={'Remove '+file.name} onClick={onRemove}><X size={16}/></button>}</div>;
}
function UnitTabs({qualification,active,onSelect,scope}) {
 return <nav className="qf-unit-strip" aria-label="Qualification units"><div className="qf-unit-strip-label">UNITS</div>
  <div className="qf-number-tabs" role="tablist" aria-label="Choose a unit">
   {qualification.units.map(([ref,title],i)=><button key={ref} id={scope+'-unit-tab-'+i} role="tab" type="button" aria-selected={i===active} aria-controls={scope+'-unit-panel'}
    title={'Unit '+two(i)+' · '+title} aria-label={'Unit '+two(i)+': '+title} className={'qf-number-tab '+(i===active?'active':'')}
    onClick={()=>onSelect(i)}>{two(i)}</button>)}
  </div><span className="qf-unit-total">{qualification.units.length} units</span>
 </nav>;
}
function UnitHeading({qualification,unitIndex,status,scope}){
 const [ref,title]=qualification.units[unitIndex];
 return <header className="qf-unit-heading">
  <div><span className="qf-overline">UNIT {two(unitIndex)} <span aria-hidden="true">·</span> {ref}</span><h2>{title}</h2></div>
  {status&&<span className="qf-soft-status">{status}</span>}
 </header>;
}
function PaneTabs({tabs,active,onChange,label}){
 return <div className="qf-pane-tabs" role="tablist" aria-label={label}>
  {tabs.map(([id,text,Icon])=><button key={id} role="tab" aria-selected={active===id} aria-controls={label.replace(/\s/g,'-')+'-panel'} className={active===id?'active':''} type="button" onClick={()=>onChange(id)}><Icon size={16}/>{text}</button>)}
 </div>;
}
function Card({title,action,children,className=''}) {
 return <section className={'qf-card '+className}><div className="qf-card-header"><h3>{title}</h3>{action}</div>{children}</section>;
}
function QualificationCard({item,onClick}){
 return <article className="qf-course-card"><div className={'qf-course-mark '+item.color}><GraduationCap size={25}/></div>
 <div className="qf-course-body"><small>{item.body} · Level {item.level}</small><h2>{item.name}</h2><span>{item.units.length} Units</span></div>
 <button type="button" onClick={onClick} aria-label={'Open '+item.name}>Open <ArrowRight size={16}/></button></article>;
}
function LearnerQualifications(){
 const [qualificationId,setQualificationId]=useState('othm6');
 const [unitIndex,setUnitIndex]=useState(0);
 const [page,setPage]=useState('catalog');
 const [pane,setPane]=useState('evidence');
 const [filesByQualification,setFilesByQualification]=useState({});
 const [linksByUnit,setLinksByUnit]=useState({});
 const [submittedByUnit,setSubmittedByUnit]=useState({});
 const [notice,setNotice]=useState('');
 const inputRef=useRef(null);
 const qualification=QUALIFICATIONS.find(x=>x.id===qualificationId);
 const key=unitKey(qualificationId,unitIndex);
 const files=filesByQualification[qualificationId]||SAMPLE_EVIDENCE;
 const links=linksByUnit[key]||{};
 const submitted=!!submittedByUnit[key];
 const criteria=unitIndex===0?FIRST_LO[qualificationId].criteria:[];
 const lo=FIRST_LO[qualificationId];
 const mapped=criteria.filter(([code])=>files.some(file=>(links[file.id]||[]).includes(code))).length;
 const allMapped=criteria.length>0&&mapped===criteria.length;
 const setUnit=i=>{setUnitIndex(i);setPane('evidence');setNotice('');};
 const openQualification=id=>{setQualificationId(id);setUnitIndex(0);setPane('evidence');setPage('units');setNotice('');};
 const onFiles=e=>{
  const selected=Array.from(e.target.files||[]).slice(0,10);
  if(!submitted&&selected.length){
   const incoming=selected.map((file,i)=>({id:'local-'+Date.now()+'-'+i,name:file.name,kind:'Draft',size:file.size>1048576?(file.size/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(file.size/1024))+' KB',
    icon:/\.(jpg|jpeg|png|webp)$/i.test(file.name)?'image':/\.(xls|xlsx|csv)$/i.test(file.name)?'sheet':/\.pdf$/i.test(file.name)?'pdf':'doc'}));
   setFilesByQualification(old=>({...old,[qualificationId]:[...files,...incoming]}));
   setNotice('Files added to this preview only. No file was uploaded.');
  }
  e.target.value='';
 };
 const fileProtected=id=>Object.keys(submittedByUnit).some(k=>k.startsWith(qualificationId+':')&&submittedByUnit[k]&&(linksByUnit[k]?.[id]||[]).length>0);
 const removeFile=id=>{
  if(fileProtected(id))return;
  if(submitted)return;
  setFilesByQualification(old=>({...old,[qualificationId]:files.filter(file=>file.id!==id)}));
  setLinksByUnit(old=>{const next={...old};for(const k of Object.keys(next)){if(k.startsWith(qualificationId+':')){next[k]={...next[k]};delete next[k][id];}}return next;});
 };
 const toggle=(fileId,code)=>{
  if(submitted)return;
  setLinksByUnit(old=>{const existing=old[key]||{},prev=existing[fileId]||[];return {...old,[key]:{...existing,[fileId]:prev.includes(code)?prev.filter(v=>v!==code):[...prev,code]}};});
 };
 const chooseFile=<input ref={inputRef} className="qf-visually-hidden" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.csv" aria-label="Select evidence files for preview" onChange={onFiles}/>;
 const addEvidence=<Button variant="outline" disabled={submitted} onClick={()=>inputRef.current?.click()}><Upload size={16}/> Add Evidence</Button>;
 const coverage=<div className="qf-coverage"><span>{mapped}/{criteria.length} mapped</span><div className="qf-progress"><span style={{width:(criteria.length?Math.round(100*mapped/criteria.length):0)+'%'}}/></div></div>;
 return <div className="qf-workspace qf-learner">
 {page==='catalog'?<>
   <div className="qf-intro"><h1>My Qualifications</h1><p>Choose a qualification.</p></div>
   <div className="qf-course-grid">{QUALIFICATIONS.map(q=><QualificationCard key={q.id} item={q} onClick={()=>openQualification(q.id)}/>)}</div>
  </>:<>
   <div className="qf-topline"><button type="button" className="qf-plain-back" onClick={()=>setPage('catalog')}><ArrowLeft size={16}/> Qualifications</button><span>{qualification.short}</span></div>
   <h1 className="qf-programme-title">{qualification.name}</h1>
   <UnitTabs qualification={qualification} active={unitIndex} onSelect={setUnit} scope="learner"/>
   <section id="learner-unit-panel" role="tabpanel" aria-labelledby={'learner-unit-tab-'+unitIndex}>
   <UnitHeading qualification={qualification} unitIndex={unitIndex} status={submitted?'Submitted · Demo':null} scope="learner"/>
   <PaneTabs label="Unit sections" active={pane} onChange={setPane} tabs={[[ 'evidence','Evidence',FolderOpen],['mapping','Mapping',Link2],['submission','Submit',Send]]}/>
   <main id="Unit-sections-panel" className="qf-pane-content" role="tabpanel">
    {pane==='evidence'&&<div className="qf-columns">
      <Card title={'Your Evidence ('+files.length+')'} className="qf-evidence-card" action={<>{chooseFile}{addEvidence}</>}>
       {files.length?<div className="qf-file-list">{files.map(file=><FileRow key={file.id} file={file} onRemove={submitted||fileProtected(file.id)?null:()=>removeFile(file.id)}/>)}</div>:<div className="qf-empty"><FileText size={25}/> No evidence yet.</div>}
       <div className="qf-card-footer"><Button disabled={!files.length||!criteria.length} onClick={()=>setPane('mapping')}>Map Evidence <ArrowRight size={16}/></Button></div>
      </Card>
      <Card title="Unit details" className="qf-details-card">
       {unitIndex===0?<><p className="qf-detail-code">Learning Outcome {lo.code}</p><p>{lo.title}</p><details className="qf-criteria-details"><summary>Assessment Criteria ({criteria.length})</summary><div>{criteria.map(([code,title])=><p key={code}><b>{code}</b> {title}</p>)}</div></details></>:
        <div className="qf-empty qf-empty-compact">Assessment criteria not available for this unit yet.</div>}
      </Card>
     </div>}
    {pane==='mapping'&&<Card className="qf-mapping-card" title="Map evidence to assessment criteria" action={criteria.length?coverage:null}>
      {!criteria.length?<div className="qf-empty"><LockKeyhole size={22}/> Assessment criteria not available for this unit yet.</div>:
       !files.length?<div className="qf-empty">Add evidence first.</div>:
       <><div className="qf-matrix-scroll" role="region" tabIndex={0} aria-label="Evidence to criteria mapping table"><table className="qf-matrix"><thead><tr><th scope="col">Evidence</th>{criteria.map(([code,title])=><th key={code} scope="col" title={title}>AC {code}<span className="qf-ac-short">{title}</span></th>)}</tr></thead>
         <tbody>{files.map(file=><tr key={file.id}><th scope="row"><FileIcon kind={file.icon}/><span title={file.name}>{file.name}</span></th>{criteria.map(([code,title])=><td key={code}><label className="qf-map-check" title={'AC '+code+': '+title}><input type="checkbox" aria-label={'Map '+file.name+' to criterion '+code+': '+title} disabled={submitted} checked={(links[file.id]||[]).includes(code)} onChange={()=>toggle(file.id,code)}/><span aria-hidden="true"><Check size={15}/></span></label></td>)}</tr>)}</tbody></table></div>
        <div className="qf-mapping-actions"><span>One file can cover several criteria.</span><div><Button variant="ghost" onClick={()=>setNotice('Draft is stored in this browser preview only.')}><Save size={16}/> Save Draft</Button><Button disabled={!allMapped||submitted} onClick={()=>setPane('submission')}>Next <ArrowRight size={16}/></Button></div></div></>}
     </Card>}
    {pane==='submission'&&<div className="qf-submit-layout">
      <Card title="Submit for Review"><div className="qf-review-summary"><div><FileText size={17}/>{files.length} Evidence files</div><div><Link2 size={17}/>{mapped}/{criteria.length} Criteria mapped</div></div>
        {!allMapped&&<p className="qf-inline-help">Map all available criteria before submitting.</p>}
        {submitted?<div className="qf-done"><CheckCircle2 size={18}/> Demo submitted · No assessor notified</div>:
         <Button disabled={!files.length||!allMapped} onClick={()=>{setSubmittedByUnit(old=>({...old,[key]:true}));setNotice('Submission simulated in this browser only.');}}><Send size={16}/> Submit for Review</Button>}
      </Card>
      <Card title="Your status"><p>{submitted?'Submitted (preview)':'Not submitted'}</p><p className="qf-small-note">Your assessor will review the evidence once the live workflow is enabled.</p></Card>
     </div>}
   </main>
   </section>
  </>}
  <PreviewNote/>
  {notice&&<div className="qf-toast" role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={16}/></button></div>}
 </div>;
}
function AdminQualifications(){
 const [qualificationId,setQualificationId]=useState('othm6');
 const [unitIndex,setUnitIndex]=useState(0);
 const [pane,setPane]=useState('details');
 const [templatesByUnit,setTemplatesByUnit]=useState({});
 const [selectedTemplateByUnit,setSelectedTemplateByUnit]=useState({});
 const [decisionsByUnit,setDecisionsByUnit]=useState({});
 const [feedbackByUnit,setFeedbackByUnit]=useState({});
 const [outcomesByUnit,setOutcomesByUnit]=useState({});
 const [notice,setNotice]=useState('');
 const qualification=QUALIFICATIONS.find(x=>x.id===qualificationId);
 const key=unitKey(qualificationId,unitIndex);
 const criteria=unitIndex===0?FIRST_LO[qualificationId].criteria:[];
 const lo=FIRST_LO[qualificationId];
 const templates=templatesByUnit[key]||[{id:'example',title:'Evidence portfolio',instructions:''}];
 const selectedId=selectedTemplateByUnit[key]||templates[0]?.id;
 const activeTemplate=templates.find(t=>t.id===selectedId)||templates[0];
 const decisions=decisionsByUnit[key]||{};
 const feedback=feedbackByUnit[key]||'';
 const outcome=outcomesByUnit[key]||'return';
 const changeUnit=i=>{setUnitIndex(i);setPane('details');setNotice('');};
 const changeQualification=id=>{setQualificationId(id);setUnitIndex(0);setPane('details');setNotice('');};
 const updateTemplate=patch=>{setTemplatesByUnit(old=>({...old,[key]:templates.map(t=>t.id===selectedId?{...t,...patch}:t)}));};
 const createTemplate=()=>{const id='draft-'+Date.now(),next=[...templates,{id,title:'New task',instructions:''}];setTemplatesByUnit(old=>({...old,[key]:next}));setSelectedTemplateByUnit(old=>({...old,[key]:id}));setPane('templates');setNotice('New draft added to preview.');};
 const recordReview=()=>{
  if(outcome==='accept'&&(!criteria.length||criteria.some(([code])=>decisions[code]!=='met'))){setNotice('Mark every criterion Met before accepting.');return;}
  if(outcome==='return'&&!feedback.trim()){setNotice('Add feedback before returning.');return;}
  setNotice('Record preview decision only. No real learner file is accessed and no acceptance was saved.');
 };
 return <div className="qf-workspace qf-admin">
  <div className="qf-intro qf-admin-intro"><h1>Qualifications</h1><div className="qf-select-wrap"><label htmlFor="qf-qualification-select">Qualification</label><select id="qf-qualification-select" value={qualificationId} onChange={e=>changeQualification(e.target.value)}>{QUALIFICATIONS.map(q=><option key={q.id} value={q.id}>{q.short} · {q.name}</option>)}</select></div></div>
  <UnitTabs qualification={qualification} active={unitIndex} onSelect={changeUnit} scope="admin"/>
  <section id="admin-unit-panel" role="tabpanel" aria-labelledby={'admin-unit-tab-'+unitIndex}>
  <UnitHeading qualification={qualification} unitIndex={unitIndex} scope="admin"/>
  <PaneTabs label="Admin qualification sections" active={pane} onChange={setPane} tabs={[[ 'details','Unit Details',BookOpen],['templates','Task Templates',FileText],['review','Assessments',ClipboardCheck],['iqa','IQA',ShieldCheck]]}/>
  <div id="Admin-qualification-sections-panel" className="qf-pane-content" role="tabpanel">
   {pane==='details'&&<Card title="Assessment criteria" className="qf-admin-details">
     <div className="qf-readonly"><span>Unit reference</span><strong>{qualification.units[unitIndex][0]}</strong></div>
     {criteria.length?<><p className="qf-detail-code">LO {lo.code} · {lo.title}</p>{criteria.map(([code,title])=><div className="qf-criterion-item" key={code}><b>{code}</b><span>{title}</span></div>)}</>:<div className="qf-empty qf-empty-compact">Approved assessment criteria not imported yet.</div>}
     <p className="qf-small-note">Official wording is read-only.</p>
   </Card>}
   {pane==='templates'&&<div className="qf-admin-two">
      <Card title="Task Templates" action={<Button variant="outline" onClick={createTemplate}><Plus size={16}/> New Task</Button>}>
       <div className="qf-template-list">{templates.map(t=><button key={t.id} type="button" className={t.id===selectedId?'active':''} onClick={()=>setSelectedTemplateByUnit(old=>({...old,[key]:t.id}))}><FileText size={16}/>{t.title}<ChevronRight size={16}/></button>)}</div>
      </Card>
      <Card title="Edit task"><label className="qf-field">Task name<input value={activeTemplate?.title||''} maxLength={140} onChange={e=>updateTemplate({title:e.target.value})}/></label>
       <label className="qf-field">Instructions<textarea rows={5} value={activeTemplate?.instructions||''} maxLength={1600} onChange={e=>updateTemplate({instructions:e.target.value})}/></label>
       <Button disabled={!activeTemplate?.title.trim()} onClick={()=>setNotice('Template saved in preview only.')}><Save size={16}/> Save Draft</Button>
      </Card>
     </div>}
   {pane==='review'&&<div className="qf-review-grid">
     <Card title="Evidence"><div className="qf-sample-learner"><span className="qf-avatar">SL</span><span><strong>Sample learner</strong><small>Assessment preview</small></span></div>
      <div className="qf-file-list">{SAMPLE_EVIDENCE.map(file=><FileRow key={file.id} file={file}/>)}</div></Card>
     <Card title="Assessment criteria" className="qf-assessor-criteria">
      {criteria.length?criteria.map(([code,title])=><div key={code} className="qf-review-item"><div><strong>AC {code}</strong><p>{title}</p></div>
        <div className="qf-choices">{[['met','Met'],['partial','Partial'],['not','Not Met']].map(([value,label])=><label key={value} className={decisions[code]===value?'selected '+value:''}><input type="radio" name={'decision-'+key+'-'+code} checked={decisions[code]===value} onChange={()=>setDecisionsByUnit(old=>({...old,[key]:{...decisions,[code]:value}}))}/>{label}</label>)}</div></div>):
        <div className="qf-empty qf-empty-compact">No assessment criteria imported for this unit.</div>}
     </Card>
     <Card title="Decision"><div className="qf-decision-choices"><label><input type="radio" name={'outcome-'+key} checked={outcome==='accept'} onChange={()=>setOutcomesByUnit(old=>({...old,[key]:'accept'}))}/> Accept</label><label><input type="radio" name={'outcome-'+key} checked={outcome==='return'} onChange={()=>setOutcomesByUnit(old=>({...old,[key]:'return'}))}/> Return</label></div>
       <label className="qf-field">Feedback<textarea value={feedback} onChange={e=>setFeedbackByUnit(old=>({...old,[key]:e.target.value}))} rows={5} maxLength={1600} placeholder="Feedback to learner"/></label>
       <Button onClick={recordReview}><ClipboardCheck size={16}/> Record preview decision</Button>
       <p className="qf-small-note">No real learner file is accessed.</p>
     </Card>
   </div>}
   {pane==='iqa'&&<Card title="Internal Quality Assurance"><div className="qf-empty"><ShieldCheck size={26}/> No assessments connected yet.</div></Card>}
  </div>
  </section>
  <PreviewNote/>
  {notice&&<div className="qf-toast" role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={16}/></button></div>}
 </div>;
}
export default function QualificationsWorkspace({admin=false}){return admin?<AdminQualifications/>:<LearnerQualifications/>;}
