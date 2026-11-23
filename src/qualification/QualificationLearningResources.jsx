import React, {useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, ExternalLink, FileCheck2, FileText, FolderOpen, Info, Layers3, LibraryBig, Link2, LockKeyhole, ShieldCheck} from 'lucide-react';
import {getUnitSourceMaterial} from './qualificationUnitMaterial.js';
import UnitMaterialPanel from './UnitMaterialPanel.jsx';
import './qualificationLearningResources.css';

// The published assessment rubric is authoritative for an enrolled portfolio.
// The three historical specifications below are supporting reference documents only.
export function CentreResourceLinks({unit, onOutcome}) {
  const published = unit.outcomes.flatMap(outcome =>
    (outcome.resources || []).map(resource => ({...resource, outcomeId:outcome.id, outcomeCode:outcome.code})));
  return <section className="qlearn-rail-card" aria-label="Unit resources">
    <div className="qlearn-rail-heading"><FolderOpen size={18}/><h3>Resources</h3><span>{published.length}</span></div>
    {published.length ? <div className="qlearn-resource-links">
      {published.map(resource => <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer">
        <FileText size={17}/><span><strong>{resource.title}</strong><small>{resource.outcomeCode} · Centre-published resource</small></span><ExternalLink size={15}/>
      </a>)}
    </div> : <div className="qlearn-empty"><Info size={17}/><p>No centre-published learning files or templates are attached to this Unit yet. The source outline is separate from an approved assignment brief.</p></div>}
    {onOutcome && <p className="qlearn-rail-foot">Choose a Learning Outcome below to view its assessment criteria and submission requirements.</p>}
  </section>;
}

export function EvidenceUnitMaterials({unit, source, onOutcome, children}) {
  const sourceUnit = source?.units?.find(entry => entry.code === unit.code);
  const files = new Map();
  for (const outcome of unit.outcomes) {
    for (const resource of outcome.resources || []) {
      if (!files.has(resource.url)) {
        files.set(resource.url, {resource, outcomes: []});
      }
      files.get(resource.url).outcomes.push(outcome);
    }
  }
  return <section className="qlearn-rail-card" aria-label="Unit evidence materials">
    <div className="qlearn-rail-heading"><FolderOpen size={18}/><h3>Unit materials</h3></div>
    {sourceUnit?.aim && <p>{sourceUnit.aim}</p>}
    {!!sourceUnit?.indicativeTopics?.length && <details className="qf-outcome-filters">
      <summary>Indicative study topics</summary>
      <ul>{sourceUnit.indicativeTopics.map((topic, index) => <li key={index}>{topic}</li>)}</ul>
    </details>}
    {!!files.size && <div className="qlearn-resource-links">
      {[...files.values()].map(({resource, outcomes}) => <a key={resource.url} href={resource.url}
        target="_blank" rel="noopener noreferrer">
        <FileText size={17}/><span><strong>{resource.title}</strong>
          <small>{resource.url === source?.source_url ? 'Awarding-body specification' : 'Unit resource'}
            {' · Outcomes ' + outcomes.map(outcome => outcome.code).join(', ')}</small>
        </span><ExternalLink size={15}/>
      </a>)}
    </div>}
    {sourceUnit && source.source_url && !files.has(source.source_url) && <div className="qlearn-resource-links">
      <a href={source.source_url} target="_blank" rel="noopener noreferrer"><FileText size={17}/>
        <span><strong>Open the original specification</strong><small>{source.version}</small></span><ExternalLink size={15}/>
      </a>
    </div>}
    {!files.size && !(sourceUnit && source.source_url) && !children && <p>No learning files are attached to this Unit.</p>}
    {children}
    {unit.outcomes.length > 0 && <details className="qf-outcome-filters">
      <summary>Learning Outcomes &amp; Assessment Criteria</summary>
      <ul>{unit.outcomes.map((outcome, index) => <li key={outcome.id || outcome.code}>
        <button type="button" className="qf-live-link" onClick={() => onOutcome(outcome, index)}>
          {outcome.code} · {outcome.title}
        </button>
      </li>)}</ul>
    </details>}
  </section>;
}

function AssessmentGuide({learner = true, onEvidence, onLibrary}) {
  const steps = [
    {icon:BookOpen,title:'Read the Unit',body:'Review the learning outcomes, official criteria and available source information.'},
    {icon:FolderOpen,title:'Prepare evidence',body:'Upload one clearly titled file at a time, or write a reflective account. Describe how it relates to your own work.'},
    {icon:Link2,title:'Cross-reference',body:'Reuse evidence across the appropriate assessment criteria instead of uploading the same document repeatedly.'},
    {icon:ShieldCheck,title:'Submit for assessment',body:'Submit the complete competence claim. The assessor and verifier decisions appear in the history and Contact Diary.'},
  ];
  return <section className="qlearn-rail-card qlearn-steps">
    <div className="qlearn-rail-heading"><ClipboardCheck size={18}/><h3>{learner ? 'Your next steps' : 'Review guidance'}</h3></div>
    {steps.map(({icon:Icon,title,body},index) => <div className="qlearn-step" key={title}>
      <div className="qlearn-step-icon"><Icon size={17}/></div>
      <div><strong>{String(index+1).padStart(2,'0')} · {title}</strong><p>{body}</p></div>
    </div>)}
    <div className="qlearn-rail-actions">
      {onEvidence && <button type="button" className="qf-button qf-primary" onClick={onEvidence}><FolderOpen size={16}/> Evidence Folder <ArrowRight size={16}/></button>}
      {onLibrary && <button type="button" className="qf-button qf-outline" onClick={onLibrary}><LibraryBig size={16}/> Reference Library</button>}
    </div>
  </section>;
}

function CustomUnitOverview({unit}) {
  const criteria = unit.outcomes.reduce((count,outcome) => count + outcome.criteria.length,0);
  return <section className="qlearn-custom-unit">
    <div className="qlearn-section-intro"><span className="qlearn-section-icon"><Layers3 size={23}/></span>
      <div><span className="qf-overline">ENROLLED UNIT · {unit.code}</span><h3>{unit.title}</h3>
        <p>{unit.outcomes.length} Learning Outcomes · {criteria} Assessment Criteria</p></div></div>
    <div className="qlearn-empty qlearn-custom-note"><Info size={18}/>
      <div><strong>Centre-specific Unit</strong>
        <p>The assessment outcomes below come from this enrolled programme. No separate centre-issued study pack is linked to this Unit yet. Official reference syllabuses are accessible through the Reference Library.</p>
      </div>
    </div>
    <div className="qlearn-custom-outcomes">
      {unit.outcomes.map((outcome,index) => <div key={outcome.id}>
        <span>{String(index+1).padStart(2,'0')}</span>
        <div><strong>{outcome.code} · {outcome.title}</strong>
          <small>{outcome.criteria.length} assessment criteria{outcome.guidance ? ' · guidance available in the outcome' : ''}</small></div>
      </div>)}
    </div>
  </section>;
}

export function LiveUnitLearningHub({unit, portfolio, onEvidence, onLibrary}) {
  const material = getUnitSourceMaterial(unit.code);
  return <div className="qlearn-layout">
    <div className="qlearn-primary" aria-label="Unit learning material">
      {material ? <UnitMaterialPanel key={unit.code} unitCode={unit.code}/> : <CustomUnitOverview unit={unit}/>}
      <div className="qlearn-source-disclaimer"><Info size={16}/>
        <span>{material
          ? 'Source information is from a historical awarding-body specification or handbook. Check the current centre-approved version before relying on assessment requirements.'
          : 'This Unit uses a centre-specific rubric. The official awarding-body syllabus is provided separately and does not replace this Unit’s assessment criteria.'}</span>
      </div>
    </div>
    <aside className="qlearn-rail" aria-label="Unit resources and actions">
      <CentreResourceLinks unit={unit}/>
      <AssessmentGuide learner={portfolio.role === 'learner'} onEvidence={portfolio.role === 'learner' ? onEvidence : null} onLibrary={onLibrary}/>
    </aside>
  </div>;
}

export function OutcomeLearningSupport({unit}) {
  if (!getUnitSourceMaterial(unit?.code)) return null;
  return <details className="qf-card qf-outcome-filters">
    <summary>Unit study material</summary>
    <UnitMaterialPanel key={unit.code} unitCode={unit.code} compact/>
  </details>;
}

export function ProgrammeReferenceLibrary({qualification}) {
  const [active,setActive] = useState(0);
  if (!qualification) return <div className="qlearn-empty"><Info size={17}/><p>No matching awarding-body reference found for this programme.</p></div>;
  const unit = qualification.units[active];
  return <div className="qlearn-library">
    <div className="qlearn-library-banner">
      <div><span className="qf-overline">REFERENCE LIBRARY · {qualification.body}</span>
        <h2>Qualification syllabus &amp; source materials</h2>
        <p>Explore the unit aims, learning outcomes, indicative topics where supplied, and awarding-body source PDFs.</p></div>
      <span className="qlearn-library-count"><LibraryBig size={22}/>{qualification.units.length} Units</span>
    </div>
    <div className="qlearn-source-disclaimer"><Info size={16}/><span>
      This is the original supplied qualification reference, not an enrolment or a centre-approved assignment pack.
      If your portfolio uses TEST or custom Unit codes, do not substitute these official reference criteria for its saved rubric.
      Source PDFs are historical editions and should be checked against the current awarding-body version.
    </span></div>
    <div className="qlearn-library-layout">
      <nav className="qlearn-library-units" aria-label="Reference syllabus units">
        {qualification.units.map(([code,title],index) => <button type="button" key={code} aria-current={active === index ? 'true' : undefined}
          className={active === index ? 'active' : ''} onClick={() => setActive(index)}>
          <span>{String(index+1).padStart(2,'0')}</span><span><strong>{title}</strong><small>{code}</small></span><ArrowRight size={16}/>
        </button>)}
      </nav>
      <div className="qlearn-library-material">
        <div className="qlearn-section-intro"><span className="qlearn-section-icon"><BookOpen size={22}/></span>
          <div><span className="qf-overline">UNIT {String(active+1).padStart(2,'0')} · {unit[0]}</span><h3>{unit[1]}</h3></div></div>
        <UnitMaterialPanel key={unit[0]} unitCode={unit[0]}/>
      </div>
    </div>
  </div>;
}

export function ProgrammeMaterialSnapshot({portfolio, qualification, onLibrary, onProgramme}) {
  const enrolled = portfolio.units || [];
  const linked = enrolled.filter(unit => getUnitSourceMaterial(unit.code)).length;
  const centreLinks = enrolled.reduce((sum,unit) => sum + unit.outcomes.reduce((total,outcome) => total + (outcome.resources || []).length,0),0);
  return <section className="qlearn-overview-panel">
    <div className="qlearn-overview-head"><div><span className="qf-overline">COURSE FOLDER</span><h2>Learning materials &amp; resources</h2>
      <p>Study each Unit, review available resources and prepare the evidence required for your competence claims.</p></div><LibraryBig size={26}/></div>
    <div className="qlearn-overview-counters">
      <div><BookOpen size={19}/><strong>{enrolled.length}</strong><span>Enrolled Units</span></div>
      <div><FileCheck2 size={19}/><strong>{linked}</strong><span>Units with source material</span></div>
      <div><FolderOpen size={19}/><strong>{centreLinks}</strong><span>Centre resource links</span></div>
      <div><LibraryBig size={19}/><strong>{qualification?.units.length || 0}</strong><span>Reference syllabus Units</span></div>
    </div>
    <div className="qlearn-overview-actions">
      <button type="button" className="qf-button qf-primary" onClick={onProgramme}><Layers3 size={16}/> Open My Programme <ArrowRight size={16}/></button>
      {qualification && <button type="button" className="qf-button qf-outline" onClick={onLibrary}><LibraryBig size={16}/> Open Reference Library</button>}
    </div>
  </section>;
}

export function EvidencePreparationTips() {
  return <section className="qlearn-evidence-help" aria-label="How to prepare evidence">
    <div><span className="qlearn-section-icon"><ClipboardCheck size={20}/></span>
      <div><h3>Preparing evidence for assessment</h3><p>Keep your portfolio clear, authentic and easy for the assessor to follow.</p></div></div>
    <ul>
      <li><CheckCircle2 size={16}/> Upload each file separately with a descriptive title and a short explanation of your contribution.</li>
      <li><CheckCircle2 size={16}/> One item can support several assessment criteria. Map it in your Competence Claim instead of uploading duplicates.</li>
      <li><CheckCircle2 size={16}/> Saving an item to the Evidence Folder does not submit it for assessment. Submit the complete claim after mapping.</li>
    </ul>
  </section>;
}
