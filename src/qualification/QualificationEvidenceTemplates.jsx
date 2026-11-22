import React,{useMemo,useState} from 'react';
import {BookOpen,CheckCircle2,ClipboardCopy,Download,FileCheck2,FileSpreadsheet,FileText,Info,NotebookPen} from 'lucide-react';
import './qualificationEvidenceTemplates.css';

const forms=[
 {id:'reflective',name:'Reflective Account',icon:NotebookPen,description:'Describe your own work, decisions and learning against the Unit’s actual criteria.'},
 {id:'witness',name:'Witness Testimony',icon:FileCheck2,description:'Structure a statement from someone who genuinely observed the work.'},
 {id:'matrix',name:'Evidence Mapping Matrix',icon:FileSpreadsheet,description:'Cross-reference every Learning Outcome and Assessment Criterion to evidence.'},
 {id:'cpd',name:'CPD & Development Log',icon:BookOpen,description:'Record professional learning, its application and personal development actions.'},
 {id:'plan',name:'Assessment Planning Sheet',icon:FileText,description:'Plan permitted assessment methods, target dates and evidence requirements.'}
];
const allCriteria=unit=>(unit?.outcomes||[]).flatMap(o=>(o.criteria||[]).map(c=>({lo:o.code,code:c.code,title:c.title})));
const heading=(unit,name)=>`TECHNICA CONSULT | ${name.toUpperCase()} — CENTRE WORKING TEMPLATE
This is a blank Technica-created learning aid, NOT an OTHM/ProQual-issued assignment brief,
not a verified statement, and not proof of assessment completion.
Qualification Unit: ${unit?.code||''} — ${unit?.title||''}
Generated on: ${new Date().toISOString().slice(0,10)}

`;
export function getEvidenceTemplateText(unit,id){
 const criteria=allCriteria(unit);
 const listing=criteria.map(c=>`AC ${c.code}: ${c.title}\nEvidence reference: __________________________\nNotes: ________________________________`).join('\n\n');
 const common=heading(unit,forms.find(f=>f.id===id)?.name||'Evidence form');
 if(id==='reflective')return common+`Learner: _____________________     Date: __________
Workplace / job context: __________________________________
What task was carried out and why?
__________________________________________________________
My personal role, actions and decisions:
__________________________________________________________
Procedures, risk controls and people involved:
__________________________________________________________
Outcome, what I learned and what I would improve:
__________________________________________________________
Supporting documents and date(s): _________________________
Assessment Criteria evidenced (see checklist below):
${listing}
Learner declaration of authenticity: ______________________
`;
 if(id==='witness')return common+`Candidate: ____________________   Witness: _______________
Witness organisation, role and independent contact: ________
Work activity and dates directly observed: _________________
What the witness personally saw the candidate do:
__________________________________________________________
Quality, safety and competence demonstrated:
__________________________________________________________
Limitations (activities NOT witnessed): _____________________
Supporting records, time and location: ______________________
Which assessment criteria does this support?
${listing}
The witness confirms this is an authentic account of their direct observation.
Witness name and signature: __________________  Date: ______
Candidate must not sign on behalf of a witness.
`;
 if(id==='matrix')return common+`Evidence reference index:
E01: __________________________
E02: __________________________
E03: __________________________

CRITERION-TO-EVIDENCE MATRIX
${criteria.map(c=>`${c.code} | ${c.title}\n  Evidence ref(s): ________  How the evidence meets the criterion: ________`).join('\n')}
Assessment note: Every mandatory criterion needs real, accessible evidence before submission.
`;
 if(id==='cpd')return common+`Learner: __________________  Role: _________________
Date / duration of activity: ______________________________
Activity / course / research / professional discussion: ______
Reason for learning / identified development need: __________
Knowledge and skills gained: ________________________________
Application in the workplace / impact: ______________________
Follow-up action and target date: ___________________________
Evidence reference / CPD certificate: _______________________
Linked Unit Assessment Criteria: ____________________________
Reflection and next learning objective: ______________________
Repeat this section for each genuine CPD activity.
`;
 return common+`Candidate: ____________________  Assessor: _______________
Unit assessment period: __________ to ______________
Methods proposed by the qualified assessor (select only as appropriate):
[ ] Work product / workplace evidence  [ ] Observation
[ ] Reflective Account  [ ] Professional Discussion
[ ] Witness Testimony   [ ] Knowledge-based assignment
Accessibility / reasonable adjustments: ___________________
Documents and equipment required: __________________________
Submission and assessment review arrangements: _____________
${listing}
Assessor confirms the agreed methods and centre quality requirements.
Assessor: ______________________  Date: ___________
`;
}
export default function QualificationEvidenceTemplates({unit,compact=false}){
 const [selected,setSelected]=useState('reflective'),[message,setMessage]=useState('');
 const text=useMemo(()=>getEvidenceTemplateText(unit,selected),[unit,selected]);
 const save=()=>{
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`Technica_${selected}_${(unit?.code||'Unit').replaceAll('/','-')}.txt`;
  a.click();URL.revokeObjectURL(url);setMessage('Blank working template downloaded. Complete it with authentic evidence.');
 };
 const copy=async()=>{
  try{await navigator.clipboard.writeText(text);setMessage('Blank template copied for your records.');}
  catch{setMessage('Copy is unavailable here. Use Download working template.');}
 };
 return <section className={'qt-templates '+(compact?'qt-compact':'')} aria-label="Technica working forms">
  <header className="qt-intro"><div className="qt-intro-icon"><FileText size={22}/></div>
   <div><span className="qf-overline">TECHNICA CENTRE STUDY TOOLS</span>
    <h3>Evidence &amp; assessment working forms</h3>
    <p>Blank Unit-specific worksheets generated from the actual assessment criteria. These are not awarding-body files or final assessment decisions.</p></div></header>
  <div className="qt-layout">
   <nav className="qt-form-nav" aria-label="Choose a working form">
    {forms.map(f=>{const Icon=f.icon;return <button type="button" key={f.id} className={selected===f.id?'selected':''}
      onClick={()=>{setSelected(f.id);setMessage('');}}><Icon size={17}/>
      <span><strong>{f.name}</strong><small>{f.description}</small></span></button>;})}
   </nav>
   <div className="qt-preview">
    <div className="qt-preview-head"><strong>{forms.find(f=>f.id===selected)?.name}</strong>
      <span>{allCriteria(unit).length} source criteria</span></div>
    <pre>{text}</pre>
    <div className="qt-action-bar">
      <button className="qt-primary" type="button" onClick={save}><Download size={16}/> Download blank template</button>
      <button className="qt-secondary" type="button" onClick={copy}><ClipboardCopy size={16}/> Copy</button>
    </div>
    {message&&<p role="status" className="qt-status"><CheckCircle2 size={14}/>{message}</p>}
   </div>
  </div>
  <p className="qt-disclaimer"><Info size={16}/> Real assessment still requires centre-approved briefs, authentic evidence and the authorised Assessor/Verifier workflow.</p>
 </section>;
}
