import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Download, FileText, FolderOpen, GraduationCap, Layers3, LibraryBig, Link2, LoaderCircle, MessageSquare, PenLine, Printer, ShieldCheck, Upload, BarChart3} from 'lucide-react';
import PremiumLoading from '../components/PremiumLoading.jsx';
import {QUALIFICATIONS} from './qualificationData.js';
import {ProgrammeListPremium, privateSandboxKey, qualificationFor} from './QualificationCatalogue.jsx';
import QualificationSourcePreview from './QualificationSourcePreview.jsx';
import QualificationInternalNav from './QualificationInternalNav.jsx';
import QualificationUnitNavigation from './QualificationUnitNavigation.jsx';
import QualificationVisualDashboard, {QualificationTopStats} from './QualificationVisualDashboard.jsx';
import {ProgrammeUpdateList, useProgrammeUpdates} from './QualificationProgrammeUpdates.jsx';
import {printPortfolioSection} from './portfolioPrint.js';
import QualificationMultiUnitEvidence from './QualificationMultiUnitEvidence.jsx';
import QualificationCentreAdmin from './QualificationCentreAdmin.jsx';
import QualificationCentreBrief from './QualificationCentreBrief.jsx';
import {PortfolioStatusRibbon,PortfolioMetrics} from './QualificationPortfolioReferenceUI.jsx';
import QualificationCandidateRegistration from './QualificationCandidateRegistration.jsx';
import QualificationEvidenceTemplates from './QualificationEvidenceTemplates.jsx';
import {CentreResourceLinks, EvidenceUnitMaterials, LiveUnitLearningHub, OutcomeLearningSupport, ProgrammeMaterialSnapshot, EvidencePreparationTips} from './QualificationLearningResources.jsx';
import {
  canReview, claimLabels, claimState, downloadEvidenceShowcase, downloadPortfolioEvidence, evidenceExtensions,
  evidenceKinds, evidencePayload, fetchEvidenceFile, portfolioRpc, programmeProgress, uploadPortfolioEvidence,
} from './qualificationPortfolioApi.js';
import QualificationOutcome, {OutcomeContact, OutcomeCriteria, OutcomeRecords} from './QualificationOutcome.jsx';
import {getUnitSourceMaterial} from './qualificationUnitMaterial.js';
import './qualificationPortfolio.css';
import './qualificationPremium.css';
import './qualificationEvidenceExperience.css';

const roleLabels = {learner: 'My Programme', assessor: 'Assessment queue', verifier: 'Verification queue'};
const decisions = [['met','Met'], ['partial','Partially met'], ['not_met','Not met']];
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeZone: 'UTC'})
  .format(new Date(value)) : 'Not set';
const failureMessage = error => {
  if (['PGRST202', '42883'].includes(error?.code)) return 'Qualifications is not available on this environment yet.';
  return error?.message || 'Something went wrong. Try again.';
};

function Action({children, secondary = false, ...props}) {
  return <button type="button" className={'qf-button ' + (secondary ? 'qf-outline' : 'qf-primary')} {...props}>{children}</button>;
}

function Panel({title, children, action}) {
  return <section className="qf-card">
    <div className="qf-card-header"><h3>{title}</h3>{action}</div>
    {children}
  </section>;
}

function Status({outcome}) {
  const state = claimState(outcome);
  return <span className={'qf-live-status qf-live-' + state}>{claimLabels[state]}</span>;
}

function PortfolioOverview({db, portfolio, progress, onOutcome, onView, qualification}) {
  const learner = portfolio.role === 'learner';
  const pending = progress.outcomes.filter(outcome => learner
    ? ['submitted','awaiting_verification','verification_returned'].includes(claimState(outcome))
    : canReview(portfolio.role, claimState(outcome)));
  const changes = learner ? progress.outcomes.filter(outcome => claimState(outcome) === 'changes_requested') : [];
  const overdue = learner ? progress.outcomes.filter(o => o.overdue) : [];
  const [tab, setTab] = useState('tasks');
  const [updates, setUpdates] = useState('news');
  const {entries, error} = usePortfolioContactEntries(db, portfolio.id, 0, learner);
  const feed = useProgrammeUpdates(db, learner ? portfolio.id : null);
  const now = Date.now();
  const showUpdates = (predicate, empty) => feed.error
    ? <p className="qf-live-error" role="alert">{feed.error}{' '}
        <button className="qf-live-link" type="button" onClick={feed.retry}>Retry</button></p>
    : <ProgrammeUpdateList items={feed.items?.filter(predicate)} empty={empty}/>;
  const homeTabs = [
    ['tasks', 'Tasks'], ['messages', 'Messages'], ['appointments', 'Appointments'],
    ['resources', 'Resources'], ['app', 'Mobile access'],
  ];
  const messages = entries?.filter(entry => entry.kind === 'message');
  const openContact = () => onView('contact');
  const recentContact = (items, empty) => <>
    {error && <p className="qf-live-error" role="alert">{error}</p>}
    {!error && !items && <p>Loading Contact Diary…</p>}
    {items?.length === 0 && <p>{empty}</p>}
    {!!items?.length && <div className="qf-ref-contact-history">
      {items.slice(0, 5).map(entry => <article key={entry.id}>
        <div><strong dir="auto">{entry.author}</strong><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></div>
        <p dir="auto">{entry.body}</p>
      </article>)}
    </div>}
  </>;
  return <>
    {learner && <QualificationInternalNav items={homeTabs} active={tab} onChange={setTab}
      ariaLabel="Qualification home sections" nested/>}
    {tab === 'tasks' && <>
      <Panel title={learner ? 'Awaiting Review' : roleLabels[portfolio.role]}>
        <div className="qf-live-list">
          {pending.length === 0 && <p>No outcomes awaiting action.</p>}
          {pending.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
        </div>
      </Panel>
      {learner && <>
        <Panel title="Latest Contact Diary entries" action={<Action secondary onClick={openContact}>Open Contact Diary</Action>}>
          {recentContact(entries, 'No Contact Diary entries yet.')}
        </Panel>
        {changes.length > 0 && <Panel title="Changes Requested"><div className="qf-live-list">
          {changes.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
        </div></Panel>}
        <Panel title="Overdue"><div className="qf-live-list">
          {overdue.length ? overdue.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>) : <p>No overdue outcomes.</p>}
        </div></Panel>
      </>}
    </>}
    {tab === 'messages' && <Panel title="Latest Messages" action={<Action secondary onClick={openContact}>Open Contact Diary</Action>}>
      {recentContact(messages, 'No programme messages yet.')}
    </Panel>}
    {tab === 'appointments' && <div className="qf-live-grid">
      <Panel title="Upcoming Appointments">{showUpdates(item => item.kind === 'appointment' && Date.parse(item.startsAt) >= now, 'No upcoming appointments.')}</Panel>
      <Panel title="Upcoming Reviews">{showUpdates(item => item.kind === 'review' && Date.parse(item.startsAt) >= now, 'No upcoming reviews.')}</Panel>
      <Panel title="Overdue Reviews">{showUpdates(item => item.kind === 'review' && Date.parse(item.startsAt) < now, 'No overdue reviews.')}</Panel>
    </div>}
    {(tab === 'resources' || !learner) && <ProgrammeMaterialSnapshot portfolio={portfolio} qualification={qualification}
      onProgramme={() => onView('programme')} onLibrary={() => onView('library')}/>}
    {tab === 'resources' && <Panel title="Resources by Unit">
      <div className="qf-live-gaps">{portfolio.units.map(unit => <details key={unit.id}>
        <summary>{unit.code} · {unit.title}</summary>
        <CentreResourceLinks unit={unit}/>
      </details>)}</div>
    </Panel>}
    {tab === 'app' && <Panel title="Technica LMS on mobile">
      <p>Open Technica LMS in your mobile browser to access your programme and upload evidence.</p>
      <Action secondary onClick={() => onView('evidence')}>Open Evidence Folder</Action>
    </Panel>}
    {learner && <Panel title="Programme updates">
      <div className="qf-live-actions" role="group" aria-label="Programme updates">
        {['news', 'events'].map(key => <Action key={key} secondary={updates !== key}
          aria-pressed={updates === key} onClick={() => setUpdates(key)}>{key === 'news' ? 'News' : 'Events'}</Action>)}
      </div>
      {showUpdates(item => item.kind === (updates === 'news' ? 'news' : 'event'), updates === 'news' ? 'No news has been published.' : 'No events have been published.')}
    </Panel>}
  </>;
}

function OutcomeLink({outcome, onOpen}) {
  return <button type="button" onClick={() => onOpen(outcome.id)}>
    <span><strong>{outcome.code} · {outcome.title}</strong>
      {outcome.deadline && <small>Due {formatDate(outcome.deadline)}</small>}
    </span><Status outcome={outcome}/><ArrowRight size={16}/>
  </button>;
}

function UnitProgramme({db,portfolio, unitIndex, setUnitIndex, onOutcome, onEvidence, onContact, onLibrary, aim}) {
  const unit = portfolio.units[unitIndex] || portfolio.units[0];
  const learner = portfolio.role === 'learner';
  if (!unit) return <Panel title="Programme units"><p>No units are available.</p></Panel>;
  const unitRequired = unit.outcomes.filter(outcome => outcome.required);
  const unitStarted = unitRequired.filter(outcome => claimState(outcome) !== 'not_started').length;
  const unitVerified = unitRequired.filter(outcome => claimState(outcome) === 'verified').length;
  return <>
    {aim && <Panel title="Unit aim"><p>{aim}</p></Panel>}
    <div className="qf-ref-unit-toolbar">
      <button type="button" disabled={unitIndex===0} onClick={()=>setUnitIndex(index=>Math.max(0,index-1))}><ArrowLeft size={15}/> Previous Unit</button>
      <label>Jump to Unit or Outcome
        <select value={'unit:' + unitIndex} onChange={event => {
          const [kind, value] = event.target.value.split(':');
          if (kind === 'unit') setUnitIndex(Number(value));
          else onOutcome(value);
        }}>
          {portfolio.units.map((item, index) => <optgroup key={item.id} label={item.code + ' · ' + item.title}>
            <option value={'unit:' + index}>{item.code} · Unit overview</option>
            {item.outcomes.map(outcome => <option key={outcome.id} value={'outcome:' + outcome.id}>
              {outcome.code} · {outcome.title}
            </option>)}
          </optgroup>)}
        </select>
      </label>
      <button type="button" disabled={unitIndex===portfolio.units.length-1}
        onClick={()=>setUnitIndex(index=>Math.min(portfolio.units.length-1,index+1))}>Next Unit <ArrowRight size={15}/></button>
    </div>
    <Panel title="Activity · Learning Outcomes">
      <div className="qf-ref-unit-progress">
        <span><strong>{unitStarted}/{unitRequired.length}</strong> Outcomes started</span>
        <progress max={unitRequired.length||1} value={unitStarted} aria-label={'Started Outcomes in Unit '+unit.code}/>
        <span><strong>{unitVerified}/{unitRequired.length}</strong> Outcomes verified</span>
        <progress max={unitRequired.length||1} value={unitVerified} aria-label={'Verified Outcomes in Unit '+unit.code}/>
      </div>
      {!unit.outcomes.some(outcome => outcome.deadline) && <p>No deadline has been set.</p>}
      <div className="qf-live-list">
        {unit.outcomes.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
      </div>
    </Panel>
    <div className="qf-live-grid">
      <Panel title="Evidence Folder">
        <Action secondary onClick={() => onEvidence(unit.id)}><FolderOpen size={16}/> View Unit evidence</Action>
      </Panel>
      <Panel title="Gap Analysis · Assessment Criteria"><div className="qf-live-gaps">
        {unit.outcomes.map(outcome => {
          const mapping = outcome.claim?.mapping;
          return <details key={outcome.id}>
            <summary>{outcome.code} · {outcome.title}</summary>
            <ul>{outcome.criteria.map(criterion => <li key={criterion.id}>
              <span>{criterion.code} · {criterion.title}</span>
              <small>{claimState(outcome) === 'verified' ? 'Verified' : learner
                ? ((mapping?.[criterion.id]?.length || 0) + ' linked') : 'Pending verification'}</small>
            </li>)}</ul>
          </details>;
        })}
      </div></Panel>
    </div>
    <Panel title="Contact">
      <Action secondary onClick={onContact}><MessageSquare size={16}/> Open programme Contact Diary</Action>
    </Panel>
    <QualificationCentreBrief unit={unit} db={db}/>
    <LiveUnitLearningHub key={unit.id} unit={unit} portfolio={portfolio} onEvidence={() => onEvidence(unit.id)} onLibrary={onLibrary}/>
  </>;
}

function EvidenceItem({item, onDownload, uses = []}) {
  return <article className="qf-live-evidence-item">
    <FileText size={18}/>
    <div><strong dir="auto">{item.title}</strong><small>{item.kind} · {formatDate(item.created_at)}</small>
    {item.description && <p dir="auto">{item.description}</p>}
    {!!uses.length && <small>Used in {uses.join(', ')}</small>}
    {item.body && <details><summary>Read evidence</summary><p className="qf-live-copy" dir="auto">{item.body}</p></details>}
    {item.filename && <Action secondary onClick={() => onDownload(item)}><Download size={15}/> {item.filename}</Action>}</div>
  </article>;
}

function EvidenceFolder({db, portfolio, source, initialUnitId, initialWizard, onSelectUnit, onDownload, onShowcase, busy, onSave, onDuplicate, onMap, onOpenOutcome, onBack, backLabel}) {
  const [mode, setMode] = useState(initialWizard || '');
  const [savedEvidenceId, setSavedEvidenceId] = useState('');
  const savedNotice = useRef(null);
  const [showcase, setShowcase] = useState([]);
  const [detailId, setDetailId] = useState('');
  const [mappingTarget, setMappingTarget] = useState(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [order, setOrder] = useState('newest');
  const [medium, setMedium] = useState('');
  const [showcaseOnly, setShowcaseOnly] = useState(false);
  const [unitFilter, setUnitFilter] = useState(initialUnitId);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [duplicateId, setDuplicateId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState(evidenceKinds[0]);
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const dropInput = useRef(null);
  const reservation = useRef(null);
  useEffect(() => {
    if (initialWizard) document.getElementById('qualification-evidence-wizard-heading')?.focus();
  }, [initialWizard]);
  const start = value => {
    setMode(value); setBody(''); setTitle(''); setDescription(''); setFile(null); setUploadError(''); setDuplicateId(''); reservation.current = null;
  };
  const openWizard = (nextMode, source) => {
    setSavedEvidenceId('');
    start(nextMode);
    if (source) {
      setDuplicateId(source.id);
      setTitle(('Copy of ' + source.title).slice(0, 160));
    }
    requestAnimationFrame(() => document.getElementById('qualification-evidence-wizard-heading')?.focus());
  };
  const chooseEvidenceFile = chosen => {
    if (!chosen) return;
    const extension = '.' + String(chosen.name.split('.').pop() || '').toLowerCase();
    if (!evidenceExtensions.split(',').includes(extension) || !chosen.size || chosen.size > 10485760) {
      setUploadError('Choose PDF, Word, Excel, JPEG or PNG evidence up to 10 MB.');
      return;
    }
    start('upload');
    setFile(chosen);
    setTitle(chosen.name.replace(/\.[^.]+$/, '').slice(0,160));
    requestAnimationFrame(() => document.getElementById('qualification-evidence-wizard-heading')?.focus());
  };
  const openMapper = item => {
    if (item) setMappingTarget({id:item.id});
    setMappingOpen(true);
  };
  useEffect(()=>{
    if(!mappingOpen)return;
    const mapper=document.getElementById('qualification-multi-unit-mapper');
    mapper?.focus({preventScroll:true});
    mapper?.scrollIntoView({block:'start',behavior:'smooth'});
  },[mappingOpen,mappingTarget]);
  const duplicate = portfolio.evidence.find(item => item.id === duplicateId);
  const showNewEvidence = id => {
    start('');
    setUnitFilter('');
    setSearch('');
    setType('');
    setMedium('');
    setShowcaseOnly(false);
    setOrder('newest');
    setPage(0);
    setSavedEvidenceId(id || '');
  };
  const save = () => mode === 'duplicate'
    ? onDuplicate(duplicate, title, reservation, showNewEvidence)
    : onSave({mode,title,description,kind,body,file}, reservation, showNewEvidence);
  const links = new Map();
  for (const unit of portfolio.units) {
    for (const outcome of unit.outcomes) {
      const ids = new Set([outcome.claim?.mapping, ...outcome.submissions.map(submission => submission.snapshot?.mapping)]
        .flatMap(mapping => Object.values(mapping || {}).flat()));
      for (const id of ids) {
        if (!links.has(id)) links.set(id, {unitIds: new Set(), outcomes: []});
        links.get(id).unitIds.add(unit.id);
        links.get(id).outcomes.push({id:outcome.id, label:unit.code + ' / ' + outcome.code});
      }
    }
  }
  const selectedUnit = portfolio.units.find(unit => unit.id === unitFilter);
  const lastSaved = portfolio.evidence.find(item => item.id === savedEvidenceId);
  const selection = portfolio.evidence.filter(item => showcase.includes(item.id));
  useEffect(() => {
    if (lastSaved) savedNotice.current?.focus();
  }, [lastSaved?.id]);
  const term = search.toLowerCase().trim();
  const visibleEvidence = portfolio.evidence.filter(item =>
    (!showcaseOnly || showcase.includes(item.id)) &&
    (!unitFilter || (unitFilter === 'unmapped' ? !links.has(item.id) : links.get(item.id)?.unitIds.has(unitFilter))) &&
    (!type || item.kind === type) && (!medium || (item.filename ? 'file' : 'written') === medium) && (!term || [item.id, item.title, item.filename, item.description, item.kind]
      .some(value => String(value || '').toLowerCase().includes(term)))
  ).sort((a,b) => order === 'title' ? a.title.localeCompare(b.title)
    : order === 'title-desc' ? b.title.localeCompare(a.title)
    : order === 'reference' ? a.id.localeCompare(b.id)
    : order === 'reference-desc' ? b.id.localeCompare(a.id)
    : order === 'oldest' ? Date.parse(a.created_at) - Date.parse(b.created_at)
    : Date.parse(b.created_at) - Date.parse(a.created_at));
  const lastPage = Math.max(0, Math.ceil(visibleEvidence.length / pageSize) - 1);
  const evidencePage = Math.min(page, lastPage);
  const pageStart = evidencePage * pageSize;
  const applyFilter = setter => event => { setter(event.target.value); setPage(0); };
  const sortColumn = (label, ascending, descending) => {
    const direction = order === ascending ? 'ascending' : order === descending ? 'descending' : undefined;
    return <th scope="col" aria-sort={direction}>
      <button type="button" className="qf-live-link" onClick={() => {
        setOrder(direction === 'ascending' ? descending : ascending); setPage(0);
      }}>{label}{direction && <span aria-hidden="true">{direction === 'ascending' ? ' ↑' : ' ↓'}</span>}</button>
    </th>;
  };
  const toggleShowcase = (id, checked) => setShowcase(old => checked ? [...new Set([...old, id])] : old.filter(value => value !== id));
  return <div className="qlearn-evidence-stack qf-evidence-experience">
    <section className="qf-evidence-command" aria-labelledby="qualification-evidence-title">
      <div className="qf-evidence-command-heading">
        <span className="qf-evidence-command-icon"><FolderOpen size={24} aria-hidden="true"/></span>
        <div><h2 id="qualification-evidence-title">Evidence Folder</h2>
          <p>{selectedUnit ? selectedUnit.title : portfolio.title}</p>
        </div>
        {onBack && <Action secondary disabled={busy} onClick={onBack}>{backLabel}</Action>}
      </div>
      {portfolio.canEdit && <div className="qf-evidence-primary-actions">
        <Action disabled={busy} onClick={() => dropInput.current?.click()}><Upload size={18} aria-hidden="true"/> Upload a file</Action>
        <Action secondary disabled={busy} onClick={() => openWizard('write')}><PenLine size={17} aria-hidden="true"/> Write evidence</Action>
      </div>}
    </section>
    {portfolio.canEdit && <section className={'qfd-upload-drop'+(dropActive?' is-dragging':'')}
      aria-label="Upload qualification evidence" onDragOver={event => {event.preventDefault();setDropActive(true);}}
      onDragLeave={event => {if(!event.currentTarget.contains(event.relatedTarget))setDropActive(false);}}
      onDrop={event => {event.preventDefault();setDropActive(false);if(!busy)chooseEvidenceFile(event.dataTransfer.files?.[0]);}}>
      <input ref={dropInput} type="file" accept={evidenceExtensions} className="qfd-upload-input"
        aria-label="Select evidence file" disabled={busy} onChange={event => {chooseEvidenceFile(event.target.files?.[0]);event.target.value='';}}/>
      <span className="qfd-drop-icon"><Upload size={28} aria-hidden="true"/></span>
      <h3>Upload Evidence</h3>
      <p>Drag and drop a file here or <button type="button" className="qf-live-link" disabled={busy}
        onClick={() => dropInput.current?.click()}>browse files</button></p>
      <small>PDF, DOCX, XLSX, JPG, PNG · Max 10 MB per file</small>
      {uploadError&&<p className="qfd-upload-error" role="alert">{uploadError}</p>}
    </section>}
    {lastSaved && <div ref={savedNotice} tabIndex={-1} className="qf-evidence-saved">
      <CheckCircle2 size={21} aria-hidden="true"/>
      <div role="status"><strong>Evidence saved</strong><p dir="auto">{lastSaved.title}</p></div>
      <Action secondary disabled={busy} onClick={() => openMapper(lastSaved)}>Map saved evidence <ArrowRight size={16} aria-hidden="true"/></Action>
    </div>}
    {portfolio.canEdit && mode && <section className="qf-card qf-evidence-wizard">
      <div className="qf-card-header">
        <h3 id="qualification-evidence-wizard-heading" tabIndex={-1}>{mode === 'duplicate' ? 'Duplication Wizard' : 'Evidence Wizard'}</h3>
        <Action secondary disabled={busy} onClick={() => start('')}>Close</Action>
      </div>
      {mode !== 'duplicate' && <div className="qf-live-actions qf-evidence-mode" role="group" aria-label="Evidence format">
        <Action secondary disabled={busy} aria-pressed={mode === 'upload'} onClick={() => {if (mode !== 'upload') start('upload');}}>
          <Upload size={16} aria-hidden="true"/> File upload
        </Action>
        <Action secondary disabled={busy} aria-pressed={mode === 'write'} onClick={() => {if (mode !== 'write') start('write');}}>
          <PenLine size={16} aria-hidden="true"/> Written evidence
        </Action>
      </div>}
      {mode === 'duplicate' && <form className="qf-live-form" onSubmit={event => {event.preventDefault(); save();}}>
        <fieldset disabled={busy}>
          <label className="qf-field">Evidence to duplicate<select required value={duplicateId}
            onChange={event => {
              const source = portfolio.evidence.find(item => item.id === event.target.value);
              setDuplicateId(event.target.value);
              setTitle(source ? ('Copy of ' + source.title).slice(0,160) : '');
              reservation.current = null;
            }}>
            <option value="">Choose evidence</option>
            {portfolio.evidence.map(item => <option key={item.id} value={item.id}>
              {item.id.slice(0,8).toUpperCase()} · {item.title}
            </option>)}
          </select></label>
          <label className="qf-field">Copy title<input dir="auto" required maxLength={160} value={title}
            onChange={event => { setTitle(event.target.value); reservation.current = null; }}/></label>
          <p>The copy starts with no criteria links. Use Map across Units to link the existing record without making a copy.</p>
          <button className="qf-button qf-primary" type="submit" disabled={!duplicate || !title.trim()}>Duplicate evidence</button>
        </fieldset>
      </form>}
      {['upload','write'].includes(mode) && <form id="qualification-evidence-upload" className="qf-live-form" onSubmit={event => {event.preventDefault(); save();}}>
        <fieldset disabled={busy}>
          <label className="qf-field">Title<input dir="auto" required maxLength={160} value={title} onChange={e => {setTitle(e.target.value); reservation.current = null;}}/></label>
          <label className="qf-field">Description<textarea dir="auto" maxLength={2000} rows={2} value={description} onChange={e => {setDescription(e.target.value); reservation.current = null;}}/></label>
          <label className="qf-field">Evidence type<select value={kind} onChange={e => {setKind(e.target.value); reservation.current = null;}}>
            {evidenceKinds.map(item => <option key={item}>{item}</option>)}
          </select></label>
          {mode === 'upload' ? <label className="qf-field qf-evidence-file">
            <span className="qf-evidence-file-heading"><Upload size={19} aria-hidden="true"/> Evidence file</span>
            <small>PDF, Word, Excel, JPEG or PNG · Up to 10 MB</small>
            <input required={!file} type="file" accept={evidenceExtensions}
              onChange={e => {setFile(e.target.files[0] || null); reservation.current = null;}}/>
            {file && <small className="qfd-file-selected">Selected file: {file.name}</small>}
          </label> :
            <label className="qf-field">Evidence<textarea dir="auto" required maxLength={20000} rows={6} value={body} onChange={e => {setBody(e.target.value); reservation.current = null;}}/></label>}
          <button className="qf-button qf-primary" type="submit" disabled={!title.trim() || (mode === 'write' ? !body.trim() : !file)}>
            {busy ? <><LoaderCircle className="qf-evidence-spinner" size={16} aria-hidden="true"/> Saving…</> : 'Save evidence'}
          </button>
        </fieldset>
      </form>}
    </section>}
    <div className="qfd-evidence-workspace">
      <div className="qfd-evidence-primary">
    <Panel title="Evidence records">
      <div className="qf-live-actions qf-evidence-record-tools">
        {portfolio.canEdit && <>
          <Action secondary disabled={busy || !portfolio.evidence.length} onClick={() => openMapper()}><Layers3 size={16} aria-hidden="true"/> Map across Units</Action>
          <Action secondary disabled={busy || !portfolio.evidence.length} onClick={() => openWizard('duplicate')}>Duplication Wizard</Action>
        </>}
        <Action secondary disabled={busy || !selection.length} onClick={() => onShowcase(selection)}>
          <Download size={15} aria-hidden="true"/> Download Showcase ({selection.length})
        </Action>
      </div>
      <details className="qf-evidence-filters">
        <summary>Filter evidence</summary>
      <div className="qf-ref-evidence-toolbar qf-ref-evidence-filters">
        <label>Search evidence<input value={search} onChange={applyFilter(setSearch)}
          type="search" placeholder="Reference, title, filename or description"/></label>
        <label>Type<select value={type} onChange={applyFilter(setType)}>
          <option value="">All types</option>
          {evidenceKinds.map(kind=><option key={kind} value={kind}>{kind}</option>)}
        </select></label>
        <label>Format<select value={medium} onChange={applyFilter(setMedium)}>
          <option value="">All formats</option><option value="file">File upload</option><option value="written">Written evidence</option>
        </select></label>
        <label>Unit<select value={unitFilter} onChange={event => {
          applyFilter(setUnitFilter)(event);
          onSelectUnit(event.target.value);
        }}>
          <option value="">All Units</option><option value="unmapped">Unmapped</option>
          {portfolio.units.map(unit => <option key={unit.id} value={unit.id}>{unit.code} · {unit.title}</option>)}
        </select></label>
        <label>Sort<select value={order} onChange={applyFilter(setOrder)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option><option value="title-desc">Title Z–A</option>
          <option value="reference">Reference A–Z</option><option value="reference-desc">Reference Z–A</option>
        </select></label>
      </div>
      <label className="qf-live-showcase"><input type="checkbox" checked={showcaseOnly}
        onChange={event => { setShowcaseOnly(event.target.checked); setPage(0); }}/> Showcase selection only</label>
      </details>
      <p className="qf-ref-evidence-count" role="status">Displaying {visibleEvidence.length} of {portfolio.evidence.length} evidence records</p>
      <div className="qf-evidence-table" role="region" aria-label="Evidence records" tabIndex={0}>
        <table>
          <thead><tr>
            {sortColumn('Ref','reference','reference-desc')}
            {sortColumn('Title','title','title-desc')}
            <th scope="col">Type</th>
            {sortColumn('Uploaded','oldest','newest')}
            <th scope="col">Used in</th><th scope="col">Showcase</th><th scope="col">Actions</th>
          </tr></thead>
          <tbody>
            {!visibleEvidence.length && <tr><td colSpan={7}>{portfolio.evidence.length ? 'No evidence matches the filters.' : 'No evidence has been added yet.'}</td></tr>}
            {visibleEvidence.slice(pageStart, pageStart + pageSize).map(item => {
              const expanded = detailId === item.id;
              return <React.Fragment key={item.id}>
                <tr>
                  <td><span className="qf-ref-evidence-id">{item.id.slice(0,8).toUpperCase()}</span></td>
                  <th scope="row"><button type="button" className="qf-live-link" dir="auto" aria-expanded={expanded}
                    aria-controls={'evidence-details-' + item.id}
                    onClick={() => setDetailId(expanded ? '' : item.id)}>{item.title}</button></th>
                  <td>{item.kind}<small>{item.filename ? 'File upload' : 'Written evidence'}</small></td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{links.has(item.id) ? <ul className="qf-evidence-outcomes">{links.get(item.id).outcomes.map(outcome =>
                    <li key={outcome.id}><button type="button" className="qf-live-link" disabled={busy}
                      onClick={() => onOpenOutcome(outcome.id)}>{outcome.label}</button></li>)}</ul> : 'Unmapped'}</td>
                  <td><input type="checkbox" checked={showcase.includes(item.id)} disabled={busy}
                    aria-label={'Include ' + item.title + ' in Showcase'}
                    onChange={event => toggleShowcase(item.id, event.target.checked)}/></td>
                  <td><div className="qf-evidence-row-actions">
                    {item.filename && <Action secondary disabled={busy} aria-label={'Download ' + item.title} onClick={() => onDownload(item)}><Download size={15}/></Action>}
                    {portfolio.canEdit && <>
                      <Action secondary disabled={busy} aria-label={'Map ' + item.title} onClick={() => openMapper(item)}><Link2 size={15}/></Action>
                      <Action secondary disabled={busy} aria-label={'Duplicate ' + item.title} onClick={() => openWizard('duplicate', item)}>Duplicate</Action>
                    </>}
                  </div></td>
                </tr>
                <tr id={'evidence-details-' + item.id} hidden={!expanded}>
                  <td colSpan={7}>{expanded && <div className="qf-evidence-details">
                    {item.description && <p dir="auto">{item.description}</p>}
                    {item.body && <p className="qf-live-copy" dir="auto">{item.body}</p>}
                    {item.filename && <span dir="auto">{item.filename}</span>}
                  </div>}</td>
                </tr>
              </React.Fragment>;
            })}
          </tbody>
        </table>
      </div>
      {visibleEvidence.length > 0 && <div className="qf-live-actions">
        <label className="qf-field">Records per page<select value={pageSize}
          onChange={event => { setPageSize(Number(event.target.value)); setPage(0); }}>
          {[10, 25, 50].map(size => <option key={size}>{size}</option>)}
        </select></label>
        <Action secondary disabled={evidencePage === 0} onClick={() => setPage(evidencePage - 1)}>Previous</Action>
        <label className="qf-field">Page<select value={evidencePage} onChange={event => setPage(Number(event.target.value))}>
          {Array.from({length:lastPage+1},(_,index) => <option key={index} value={index}>{index+1} of {lastPage+1}</option>)}
        </select></label>
        <Action secondary disabled={evidencePage === lastPage} onClick={() => setPage(evidencePage + 1)}>Next</Action>
      </div>}
    </Panel>
      </div>
      <aside className="qfd-evidence-summary" aria-label="Live evidence summary">
        <h3><FileText size={20}/> Evidence summary</h3>
        <dl>
          <div><dt>Total evidence</dt><dd>{portfolio.evidence.length}</dd></div>
          <div><dt>Linked evidence</dt><dd>{links.size}</dd></div>
          <div><dt>Unmapped evidence</dt><dd>{portfolio.evidence.filter(item=>!links.has(item.id)).length}</dd></div>
          <div><dt>Linked Units</dt><dd>{new Set([...links.values()].flatMap(link=>[...link.unitIds])).size} / {portfolio.units.length}</dd></div>
        </dl>
        <div className="qfd-evidence-summary-help">
          <h4><Link2 size={17}/> Link evidence to multiple Units</h4>
          <p>One uploaded document can support assessment criteria in several Units without uploading a duplicate file.</p>
          {portfolio.canEdit && <button type="button" className="qfd-action qfd-primary" disabled={busy||!portfolio.evidence.length}
            onClick={()=>openMapper(portfolio.evidence.find(item=>item.id===detailId))}>Map evidence to Units <ArrowRight size={15}/></button>}
        </div>
        {detailId && links.has(detailId) && <section className="qfd-evidence-linked">
          <h4>Selected evidence · Linked Units</h4>
          <ul>{portfolio.units.filter(unit=>links.get(detailId).unitIds.has(unit.id)).map(unit=>
            <li key={unit.id}><CheckCircle2 size={15}/>{unit.code} · {unit.title}</li>)}</ul>
        </section>}
      </aside>
    </div>
  {portfolio.canEdit && mappingOpen && <section className="qfd-mapping-workspace">
    <div className="qfd-mapping-top"><strong>Map evidence across Units</strong>
      <button type="button" className="qfd-action qfd-secondary" onClick={()=>setMappingOpen(false)}>Close mapping</button></div>
    <QualificationMultiUnitEvidence portfolio={portfolio} busy={busy} targetEvidence={mappingTarget}
      onSave={onMap} onOpenOutcome={onOpenOutcome}/>
  </section>}
  {selectedUnit && <EvidenceUnitMaterials key={selectedUnit.id} unit={selectedUnit} source={source}
    onOutcome={outcome => onOpenOutcome(outcome.id)}>
    {selectedUnit.centreBrief && <QualificationCentreBrief unit={selectedUnit} db={db}/>}
  </EvidenceUnitMaterials>}
  {portfolio.canEdit && selectedUnit?.outcomes.length > 0 && <details key={'forms:' + selectedUnit.id} className="qlearn-evidence-disclosure qsrc-evidence-templates">
    <summary>Technica working templates</summary>
    <QualificationEvidenceTemplates unit={selectedUnit} compact/>
  </details>}
  {portfolio.canEdit && <EvidencePreparationTips/>}
  </div>;
}

function MappingTable({criteria, evidence, mapping, editable, onToggle, assessment}) {
  const isClaim = assessment !== undefined;
  return <div className="qf-matrix-scroll" role="region" tabIndex={0} aria-label="Evidence to criteria mapping">
    <table className="qf-matrix qf-live-matrix"><thead>
      {isClaim && criteria.length > 0 && <tr><td colSpan={4}/><th scope="colgroup" colSpan={criteria.length}>Assessment Criteria</th></tr>}
      <tr>{isClaim && <th scope="col">Ref</th>}<th scope="col">Evidence</th>
        {isClaim && <><th scope="col">Type(s)</th><th scope="col">IV (claim)</th></>}
        {criteria.map(criterion => <th key={criterion.id} scope="col" title={criterion.title}>{criterion.code}</th>)}
      </tr>
    </thead><tbody>
      {isClaim && !evidence.length && <tr><td colSpan={criteria.length + 4}>No evidence selected for this outcome.</td></tr>}
      {evidence.map(item => <tr key={item.id}>
        {isClaim && <td>{item.id.slice(0,8).toUpperCase()}</td>}
        <th scope="row" dir="auto">{item.title}</th>
        {isClaim && <><td>{item.kind}</td><td>{assessment.verified ? 'Verified' : '—'}</td></>}
        {criteria.map(criterion => {
          const linked = mapping[criterion.id]?.includes(item.id);
          return <td key={criterion.id}>{editable
            ? <input type="checkbox" checked={!!linked} onChange={() => onToggle(criterion.id,item.id)}
                aria-label={'Link ' + item.title + ' to ' + criterion.code + ' ' + criterion.title}/>
            : (linked ? 'Linked' : '—')}</td>;
        })}
      </tr>)}
    </tbody>
    {isClaim && <tfoot><tr><th scope="row" colSpan={4}>Completed (Assessor Only)</th>
      {criteria.map(criterion => <td key={criterion.id} title={criterion.title}>
        {assessment.criteria?.[criterion.id] === 'met' ? 'Met' : '—'}
      </td>)}
    </tr></tfoot>}</table>
  </div>;
}

function SubmissionHistory({outcome, onDownload}) {
  return <Panel title="Submission history">
    {!outcome.submissions.length && <p>No submissions yet.</p>}
    <div className="qf-live-history">
      {outcome.submissions.map(submission => <details key={submission.revision} open={submission === outcome.submissions[0]}>
        <summary>Revision {submission.revision} · {formatDate(submission.submittedAt)}</summary>
        {submission.reviews.length === 0 && <p>No review decisions yet.</p>}
        {submission.reviews.map((review,index) => <div key={index}>
          <strong>{review.stage === 'assessor' ? 'Assessor' : 'Verifier'} · {review.decision === 'accept' ? 'Accepted' : 'Returned'}</strong>
          <small> {formatDate(review.createdAt)}</small>
          {review.feedback && <p className="qf-live-copy" dir="auto">{review.feedback}</p>}
          {submission.snapshot.criteria.some(c => review.criteria[c.id]) && <ul>
            {submission.snapshot.criteria.filter(c => review.criteria[c.id]).map(c =>
              <li key={c.id}>{c.code} · {decisions.find(([id]) => id === review.criteria[c.id])?.[1]}</li>)}
          </ul>}
        </div>)}
        <details>
          <summary>Evidence and criteria · Revision {submission.revision}</summary>
          {Object.values(submission.snapshot.evidence).map(item => <EvidenceItem key={item.id} item={item} onDownload={onDownload}/>)}
          <MappingTable criteria={submission.snapshot.criteria} evidence={Object.values(submission.snapshot.evidence)} mapping={submission.snapshot.mapping}/>
        </details>
      </details>)}
    </div>
  </Panel>;
}

function LearnerClaim({portfolio, outcome, mapping, updateMapping, busy, onSave, onEvidence, onRegistration, onDownload}) {
  const [confirming, setConfirming] = useState(false);
  const [picks, setPicks] = useState(null);
  const [selected, setSelected] = useState(() => {
    const linked = new Set(Object.values(mapping).flat());
    return Array.from(linked);
  });
  const state = claimState(outcome);
  const editable = portfolio.canEdit && ['not_started','draft','changes_requested'].includes(state);
  const submitted = outcome.submissions[0]?.snapshot;
  const currentMapping = editable ? mapping : submitted?.mapping || {};
  const linked = new Set(Object.values(currentMapping).flat());
  const evidence = editable ? portfolio.evidence.filter(item => linked.has(item.id) || selected.includes(item.id))
    : Object.values(submitted?.evidence || {});
  const covered = outcome.criteria.filter(criterion => currentMapping[criterion.id]?.length).length;
  const allCovered = outcome.criteria.length > 0 && covered === outcome.criteria.length;
  const toggle = (criterion, file) => {
    const files = mapping[criterion] || [];
    updateMapping({...mapping, [criterion]: files.includes(file) ? files.filter(id => id !== file) : [...files, file]});
    setConfirming(false);
  };
  return <>
    <Panel title="Competence Claim" action={<div className="qf-live-actions">
      <span>{covered} / {outcome.criteria.length} linked</span>
      {editable && <>
        <Action secondary disabled={busy} aria-expanded={picks !== null} onClick={() => setPicks(picks ? null : [...selected])}>Choose Evidence</Action>
        <Action secondary disabled={busy} onClick={onEvidence}><FolderOpen size={16}/> Evidence Wizard</Action>
      </>}
    </div>}>
      {editable && picks !== null && <fieldset className="qf-live-choose qf-outcome-picker" disabled={busy}>
        <legend>Choose evidence for this outcome</legend>
        {!portfolio.evidence.length ? <p>Add evidence to your folder first.</p> : <div className="qf-outcome-table">
          <table><thead><tr><th scope="col">Ref</th><th scope="col">Document</th><th scope="col">
            <label><input type="checkbox" aria-label="Select all evidence"
              checked={portfolio.evidence.every(item => linked.has(item.id) || picks.includes(item.id))}
              onChange={event => setPicks(event.target.checked ? portfolio.evidence.map(item => item.id) : [])}/> Select all</label>
          </th></tr></thead><tbody>
            {portfolio.evidence.map(item => <tr key={item.id}>
              <td>{item.id.slice(0,8).toUpperCase()}</td><th scope="row" dir="auto">{item.title}</th>
              <td><input type="checkbox" aria-label={'Choose ' + item.title} checked={linked.has(item.id) || picks.includes(item.id)}
                disabled={linked.has(item.id)} onChange={event => setPicks(old => event.target.checked ? [...old,item.id] : old.filter(id => id !== item.id))}/></td>
            </tr>)}
          </tbody></table>
        </div>}
        <div className="qf-live-actions">
          <Action secondary onClick={() => setPicks(null)}>Cancel</Action>
          <Action onClick={() => {setSelected(picks); setPicks(null);}}>Use selected evidence</Action>
        </div>
      </fieldset>}
      <MappingTable criteria={outcome.criteria} evidence={evidence} mapping={currentMapping}
        editable={editable && !busy} onToggle={toggle} assessment={{
          criteria: editable ? undefined : outcome.submissions[0]?.reviews.findLast(review => review.stage === 'assessor')?.criteria,
          verified: state === 'verified',
        }}/>
      <details className="qf-outcome-filters"><summary>Assessment Criteria</summary><OutcomeCriteria criteria={outcome.criteria}/></details>
      {editable && <>
        <div className="qf-live-actions">
          <Action secondary disabled={busy} onClick={() => onSave(false)}>Save Draft</Action>
          <Action disabled={busy || !allCovered || !portfolio.declarationAt || !portfolio.assessorAssigned}
            onClick={() => setConfirming(true)}>{state === 'changes_requested' ? 'Resubmit' : 'Submit Competence Claim'}</Action>
        </div>
        {!portfolio.declarationAt && <p>Accept the declaration in <button className="qf-live-link" type="button" onClick={onRegistration}>Registration</button> before submitting.</p>}
        {!portfolio.assessorAssigned && <p>An active assessor must be assigned before submission.</p>}
        {confirming && allCovered && <div className="qf-live-confirm">
          <p>Send this evidence and the criteria links for assessment?</p>
          <div className="qf-live-actions"><Action secondary disabled={busy} onClick={() => setConfirming(false)}>Cancel</Action>
            <Action disabled={busy} onClick={() => onSave(true)}>Confirm submission</Action></div>
        </div>}
      </>}
    </Panel>
    <SubmissionHistory outcome={outcome} onDownload={onDownload}/>
  </>;
}

function ReviewerClaim({portfolio, outcome, busy, onDownload, onReview}) {
  const submission = outcome.submissions[0];
  const snapshot = submission?.snapshot;
  const isAssessor = portfolio.role === 'assessor';
  const previousAssessment = submission?.reviews.findLast(review => review.stage === 'assessor');
  const [selected, setSelected] = useState(previousAssessment?.criteria || {});
  const [feedback, setFeedback] = useState('');
  const actionable = !portfolio.completedAt && canReview(portfolio.role, claimState(outcome));
  const evidence = Object.values(snapshot?.evidence || {});
  return <>
    <div className="qf-live-grid">
      <Panel title="Submitted Evidence">
        {!evidence.length && <p>No submission available for review.</p>}
        {evidence.map(item => <EvidenceItem key={item.id} item={item} onDownload={onDownload}/>)}
      </Panel>
      {snapshot && <Panel title={'Competence Claim · Revision ' + submission.revision}>
        <MappingTable criteria={snapshot.criteria} evidence={evidence} mapping={snapshot.mapping}
          assessment={{criteria: previousAssessment?.criteria, verified: claimState(outcome) === 'verified'}}/>
      </Panel>}
    </div>
    {snapshot && actionable && <Panel title={isAssessor ? 'Assessor Decision' : 'Verifier Decision'}>
      {isAssessor && snapshot.criteria.map(criterion => <label key={criterion.id} className="qf-field">
        <span>{criterion.code} · {criterion.title}</span>
        <select value={selected[criterion.id] || ''} disabled={busy} onChange={e => {
          const choice = e.target.value;
          setSelected(old => {
            const next = {...old};
            if (choice) next[criterion.id] = choice;
            else delete next[criterion.id];
            return next;
          });
        }}>
          <option value="">Choose decision</option>
          {decisions.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>)}
      {!isAssessor && <p>Review the submitted evidence and the assessor’s criterion decisions before verifying.</p>}
      <label className="qf-field">Feedback<textarea dir="auto" rows={4} maxLength={4000} value={feedback}
        disabled={busy} onChange={e => setFeedback(e.target.value)}/></label>
      <div className="qf-live-actions">
        <Action secondary disabled={busy || !feedback.trim()} onClick={() => onReview('return',feedback,selected)}>
          {isAssessor ? 'Request learner changes' : 'Return to assessor'}
        </Action>
        <Action disabled={busy || (isAssessor && !snapshot.criteria.every(c => selected[c.id] === 'met'))}
          onClick={() => onReview('accept',feedback,selected)}>{isAssessor ? 'Accept for verification' : 'Verify outcome'}</Action>
      </div>
    </Panel>}
    <SubmissionHistory outcome={outcome} onDownload={onDownload}/>
  </>;
}

function Registration({db, portfolio, progress, busy, onDeclare, onFinalize}) {
  const [reference, setReference] = useState('');
  const learner = portfolio.role === 'learner';
  const verifier = portfolio.role === 'verifier';
  return <div className="qf-ref-registration">
    <QualificationCandidateRegistration db={db} portfolio={portfolio}/>
    <div className="qf-live-grid">
    <Panel title="Programme registration & Declaration">
      <dl className="qf-live-details">
        <dt>Learner</dt><dd>{portfolio.learner || 'Registered learner'}</dd>
        <dt>Specification version</dt><dd>{portfolio.version}</dd>
        <dt>Official start</dt><dd>{formatDate(portfolio.startsOn)}</dd>
        <dt>Anticipated end</dt><dd>{formatDate(portfolio.targetOn)}</dd>
        <dt>Assessor</dt><dd>{portfolio.assessor || (portfolio.assessorAssigned ? 'Assigned' : 'Not assigned')}</dd>
        <dt>Verifier</dt><dd>{portfolio.verifier || (portfolio.verifierAssigned ? 'Assigned' : 'Not assigned')}</dd>
      </dl>
      <h4>Declaration</h4><p className="qf-live-copy" dir="auto">{portfolio.declaration}</p>
      {portfolio.declarationAt ? <p>Accepted {formatDate(portfolio.declarationAt)}</p> :
        learner && portfolio.canEdit && <Action disabled={busy} onClick={onDeclare}>Accept Declaration</Action>}
    </Panel>
    <Panel title="Completion and Certificate">
      <p>{progress.verified} of {progress.total} required outcomes verified.</p>
      {portfolio.completedAt ? <p>Completed {formatDate(portfolio.completedAt)}</p> : <p>Qualification in progress.</p>}
      {portfolio.certificate && <p>Certificate reference <strong dir="auto">{portfolio.certificate}</strong> · {formatDate(portfolio.certificateDate)}</p>}
      {verifier && !portfolio.completedAt && <Action disabled={busy || !progress.ready} onClick={() => onFinalize(null)}>
        <ShieldCheck size={16}/> Confirm qualification completion
      </Action>}
      {verifier && portfolio.completedAt && portfolio.canRecordCertificate && !portfolio.certificate && <form onSubmit={e => {e.preventDefault(); onFinalize(reference.trim());}}>
        <label className="qf-field">Issued certificate reference<input dir="auto" required maxLength={120}
          value={reference} disabled={busy} onChange={e => setReference(e.target.value)}/></label>
        <button type="submit" className="qf-button qf-primary" disabled={busy || !reference.trim()}>Record issued certificate</button>
      </form>}
    </Panel>
    </div>
  </div>;
}

function usePortfolioContactEntries(db, portfolioId, refresh, enabled = true) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setEntries(null);
    setError('');
    portfolioRpc(db,'contact_list',{p_enrolment:portfolioId})
      .then(result => { if (active) setEntries(Array.isArray(result) ? result : []); })
      .catch(err => { if (active) setError(failureMessage(err)); });
    return () => { active = false; };
  }, [db, portfolioId, refresh, enabled]);
  return {entries, error};
}

function ContactDiary({db,portfolio,progress,onOutcome}) {
  const [error,setError]=useState('');
  const [body,setBody]=useState('');
  const [kind,setKind]=useState('message');
  const [sending,setSending]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [search,setSearch]=useState('');
  const [entryType,setEntryType]=useState('');
  const printTarget=useRef(null);
  const {entries, error:readError} = usePortfolioContactEntries(db, portfolio.id, refresh);
  const save=async event=>{
    event.preventDefault();
    if(!body.trim()||sending)return;
    setSending(true);setError('');
    try{
      await portfolioRpc(db,'contact_add',{p_enrolment:portfolio.id,p_kind:kind,p_body:body.trim()});
      setBody('');setRefresh(old=>old+1);
    }catch(err){setError(failureMessage(err));}
    finally{setSending(false);}
  };
  const activity = progress.outcomes.flatMap(outcome => outcome.submissions.flatMap(submission =>
    submission.reviews.map((review,index) => ({...review,outcome,revision:submission.revision,index}))))
    .sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const term = search.toLowerCase().trim();
  const filtered = entries?.filter(item => (!entryType || item.kind === entryType) &&
    [item.author,item.body].some(value => String(value || '').toLowerCase().includes(term)));
  return <div className="qf-ref-contact">
    <Panel title="Contact Diary · Learner / Assessor / Verifier" action={<Action secondary
      disabled={!filtered?.length} onClick={() => printPortfolioSection(printTarget.current)}><Printer size={16}/> Print</Action>}>
      <p className="qf-live-copy">Messages and meeting notes are stored privately against this programme.
        Only the enrolled learner and currently assigned reviewers can access this diary. This does not send an email.</p>
      {error&&<p className="qf-live-error" role="alert">{error} <button className="qf-live-link" type="button" onClick={()=>setRefresh(old=>old+1)}>Retry</button></p>}
      <form className="qf-ref-contact-form" onSubmit={save}>
        <label className="qf-field">Entry type<select value={kind} disabled={sending} onChange={e=>setKind(e.target.value)}>
          <option value="message">Message</option><option value="meeting_note">Meeting / discussion note</option>
        </select></label>
        <label className="qf-field">Contact entry<textarea required rows={3} maxLength={4000} value={body} disabled={sending}
          onChange={e=>setBody(e.target.value)} placeholder="Record a message or assessment discussion..."/></label>
        <button className="qf-button qf-primary" type="submit" disabled={sending||!body.trim()}>
          {sending?'Saving...':'Save Contact Diary entry'}</button>
      </form>
      {readError&&<p className="qf-live-error" role="alert">{readError} <button className="qf-live-link" type="button" onClick={()=>setRefresh(old=>old+1)}>Retry</button></p>}
      {entries===null&&!readError&&<p>Loading contact records...</p>}
      {entries?.length===0&&<p>No Contact Diary entries yet.</p>}
      {!!entries?.length && <div className="qf-ref-evidence-toolbar">
        <label>Search Contact Diary<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
        <label>Filter by entry type<select value={entryType} onChange={event => setEntryType(event.target.value)}>
          <option value="">All entries</option><option value="message">Messages</option><option value="meeting_note">Meeting notes</option>
        </select></label>
      </div>}
      {!!entries?.length && filtered?.length === 0 && <p>No Contact Diary entries match the filters.</p>}
      {!!filtered?.length&&<div ref={printTarget} className="qf-ref-contact-history">
        <h3 className="qf-print-heading">Contact Diary · {portfolio.title}</h3>
        {filtered.map(item=><article key={item.id}>
        <div><strong>{item.author}</strong><span>{item.authorRole} · {item.kind==='meeting_note'?'Meeting note':'Message'}</span>
          <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>
        <p dir="auto">{item.body}</p>
      </article>)}</div>}
    </Panel>
    <Panel title="Assessment feedback and decisions">
      {activity.length===0&&<p>No assessment feedback yet.</p>}
      <div className="qf-live-history">{activity.map(entry=><article key={entry.outcome.id+':'+entry.revision+':'+entry.index}>
        <button type="button" className="qf-live-link" onClick={()=>onOutcome(entry.outcome.id)}>
          {entry.outcome.code} · {entry.outcome.title}</button>
        <p><strong>{entry.stage==='assessor'?'Assessor':'Verifier'} · {entry.decision==='accept'?'Accepted':'Returned'}</strong> · {formatDate(entry.createdAt)}</p>
        {entry.feedback&&<p className="qf-live-copy" dir="auto">{entry.feedback}</p>}
      </article>)}</div>
    </Panel>
  </div>;
}

function OpenPortfolio({db, portfolio, references, evidenceEntry, onRefresh, onBack}) {
  const entryIndex = portfolio.units.findIndex(unit => unit.code === evidenceEntry?.unitCode);
  const [view,setView] = useState(evidenceEntry ? 'evidence' : 'dashboard');
  const [unitIndex,setUnitIndex] = useState(Math.max(0, entryIndex));
  const [outcomeId,setOutcomeId] = useState('');
  const [evidenceFromOutcome,setEvidenceFromOutcome] = useState(false);
  const [evidenceUnit,setEvidenceUnit] = useState(evidenceEntry && entryIndex >= 0 ? portfolio.units[entryIndex].id : '');
  const [uploadOnEntry,setUploadOnEntry] = useState(Boolean(evidenceEntry && portfolio.canEdit));
  const [drafts,setDrafts] = useState({});
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const locking = useRef(false);
  const progress = programmeProgress(portfolio);
  const outcome = progress.outcomes.find(item => item.id === outcomeId);
  const learner = portfolio.role === 'learner';
  // Reviewers only see evidence already included in submitted, authorised snapshots.
  // The main evidence folder is intentionally learner-only in the backend RPC.
  const visiblePortfolio = learner ? portfolio : {
    ...portfolio,canEdit:false,
    evidence:Array.from(new Map(portfolio.units.flatMap(unit=>unit.outcomes.flatMap(outcome=>
      outcome.submissions.flatMap(submission=>Object.values(submission.snapshot?.evidence||{}))
    )).map(item=>[item.id,item])).values()),
  };
  const base = {p_enrolment: portfolio.id};
  const claimVersion = outcome?.claim?.version || 0;
  const mapping = drafts[outcomeId]?.version === claimVersion ? drafts[outcomeId].mapping : outcome?.claim?.mapping || {};
  const changeView = key => {
    setView(key); setError(''); setNotice('');
    setUploadOnEntry(false);
    setEvidenceFromOutcome(false);
    setEvidenceUnit('');
  };
  const openOutcome = id => {
    setUnitIndex(portfolio.units.findIndex(unit => unit.outcomes.some(item => item.id === id)));
    setOutcomeId(id); changeView('outcome');
  };
  const jumpFromOutcome = (nextUnit, nextOutcome) => {
    if (nextOutcome === null) {
      setUnitIndex(nextUnit);
      changeView('programme');
    } else {
      openOutcome(portfolio.units[nextUnit].outcomes[nextOutcome].id);
    }
  };
  const run = async (work, message) => {
    if (locking.current) return false;
    locking.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await work();
      if (message) setNotice(message);
      return true;
    } catch (error) {
      setError(failureMessage(error));
      return false;
    } finally {
      locking.current = false; setBusy(false);
    }
  };
  const commit = (name, args, message) => run(async () => {
    try {
      await portfolioRpc(db,name,{...base,...args});
    } catch (error) {
      if (/refresh/i.test(error?.message || '')) await onRefresh();
      throw error;
    }
    await onRefresh();
  }, message);
  const persistEvidence = async (fields, reservation, onSaved) => {
    const evidence = evidencePayload(fields);
    if (!reservation.current || Date.now() - reservation.current.requestedAt > 3500000) {
      reservation.current = {requestId:crypto.randomUUID(),requestedAt:Date.now()};
    }
    const request = {...base,...evidence,p_request:reservation.current.requestId};
    if (fields.mode === 'write') {
      const saved = await portfolioRpc(db,'add_evidence',request);
      await onRefresh();
      onSaved(saved.id);
      return;
    }
    if (!reservation.current.path) {
      const item = await portfolioRpc(db,'add_evidence',request);
      reservation.current = {...reservation.current,...item};
    }
    const updated = await uploadPortfolioEvidence(db,portfolio.id,reservation.current,fields.file,evidence.p_mime);
    await onRefresh(updated);
    onSaved(reservation.current.id);
  };
  const saveEvidence = (fields, reservation, onSaved) => run(
    () => persistEvidence(fields, reservation, onSaved));
  const duplicateEvidence = (source, title, reservation, onSaved) => run(async () => {
    if (!source || !learner || !portfolio.canEdit) throw new Error('Choose evidence from your portfolio.');
    const file = source.filename
      ? new File([await fetchEvidenceFile(db, source)], source.filename)
      : null;
    await persistEvidence({
      mode: file ? 'upload' : 'write', title, description: source.description || '',
      kind: source.kind, body: source.body || '', file,
    }, reservation, onSaved);
  });
  const saveMultiUnitMapping = (evidenceId,criterionIds)=>run(async()=>{
    await portfolioRpc(db,'map_evidence_across_units',{
      p_enrolment:portfolio.id,p_evidence:evidenceId,p_criteria:criterionIds,
    });
    setDrafts({}); // Versions change across multiple claims. Avoid stale outcome drafts.
    await onRefresh();
  },'Evidence mappings saved across Units. Open each Outcome to submit its Competence Claim.');
  const openEvidence = () => {
    changeView('evidence');
    setEvidenceFromOutcome(true);
  };
  const onDownload = item => run(() => downloadPortfolioEvidence(db,item));
  const isSandbox = portfolio.catalogKey === privateSandboxKey;
  const cover = isSandbox ? null : qualificationFor(portfolio.title);
  const selectedReference = references.find(ref => ref.catalog_key === portfolio.catalogKey ||
    (ref.title === portfolio.title && ref.version === portfolio.version));
  const libraryAvailable = cover && selectedReference;
  const views = [
    ...(learner ? [['dashboard','Home']] : []),
    ['programme','Course'],['evidence','Evidence'],['registration','Registration'],['contact','Contact'],
    ['metrics','Metrics'],
    ...(!learner ? [['dashboard','Overview']] : []),
    ...(libraryAvailable ? [['library','Study Library']] : []),
  ];
  const outcomeUnit = portfolio.units[unitIndex];
  const outcomeIndex = outcomeUnit?.outcomes.findIndex(item => item.id === outcomeId);
  const outcomeMaterial = getUnitSourceMaterial(outcomeUnit?.code);
  const unitView = ['dashboard','programme','outcome','evidence','registration','contact','metrics'].includes(view);
  const selectContextUnit = index => {
    setUnitIndex(index);
    if (view === 'outcome') changeView('programme');
    if (view === 'evidence') {
      setUploadOnEntry(false);
      setEvidenceFromOutcome(false);
      setEvidenceUnit(portfolio.units[index].id);
    }
  };
  const openSection = key => {
    changeView(key);
    if (key === 'evidence' && unitView && outcomeUnit) setEvidenceUnit(outcomeUnit.id);
  };
  const referenceUnit = selectedReference?.units?.find(unit => unit.code === outcomeUnit?.code);
  return <div className="qf-live-stack" aria-busy={busy}>
    <button type="button" className="qf-plain-back" disabled={busy} onClick={onBack}><ArrowLeft size={16}/> Qualifications</button>
    <header className="qfd-page-header">
      <div><span className="qfd-eyebrow">{roleLabels[portfolio.role]} · {cover?.body || 'TECHNICA'}</span>
        <h1>Qualifications</h1>
        <p>Track your qualification progress, manage Units and evidence, and complete your assessment.</p></div>
      <Action secondary disabled={busy} onClick={() => run(() => onRefresh())}>Refresh</Action>
    </header>
    <QualificationTopStats portfolio={portfolio} visiblePortfolio={visiblePortfolio}/>
    {view !== 'dashboard' && <details className="qfd-portfolio-details">
      <summary>Programme dates, progress &amp; assigned reviewers</summary>
      <PortfolioStatusRibbon portfolio={portfolio} progress={progress} onRegistration={()=>changeView('registration')}/>
    </details>}
    {unitView && <QualificationUnitNavigation units={portfolio.units} selectedIndex={unitIndex} onSelect={selectContextUnit}/>}
    <QualificationInternalNav items={views} active={view === 'outcome' ? 'programme' : view}
      onChange={openSection} disabled={busy} unitContext={unitView} ariaLabel={unitView ? 'Unit sections' : 'Programme sections'}/>
    {unitView && outcomeUnit && !['outcome','dashboard'].includes(view) && <header className="qf-unit-heading">
      <div><span className="qf-overline">Unit {String(unitIndex + 1).padStart(2,'0')} · {outcomeUnit.code}</span>
        <h2>{outcomeUnit.title}</h2></div>
    </header>}
    {error && <p className="qf-live-error" role="alert">{error}</p>}
    {notice && <p className="qf-live-notice" role="status">{notice}</p>}
    {view === 'evidence' && evidenceEntry && !portfolio.canEdit && <p>Evidence uploads are unavailable for this enrolment.</p>}
    {view === 'dashboard' && <>
      <QualificationVisualDashboard portfolio={visiblePortfolio} progress={progress} selectedUnitIndex={unitIndex}
        onUnit={index => {setUnitIndex(index);changeView('programme');}} onOutcome={openOutcome}
        onEvidence={() => changeView('evidence')} onRegistration={() => changeView('registration')}/>
      <details className="qfd-existing-tools"><summary>Tasks, messages, appointments &amp; programme resources</summary>
        <PortfolioOverview db={db} portfolio={portfolio} progress={progress} onOutcome={openOutcome}
          onView={changeView} qualification={libraryAvailable ? cover : null}/>
      </details>
    </>}
    {view === 'programme' && <UnitProgramme db={db} portfolio={portfolio} unitIndex={unitIndex} setUnitIndex={setUnitIndex} onOutcome={openOutcome}
      aim={referenceUnit?.aim || outcomeMaterial?.aim}
      onEvidence={id => { changeView('evidence'); setEvidenceUnit(id); }} onContact={() => changeView('contact')}
      onLibrary={libraryAvailable ? () => changeView('library') : null}/>}
    {view === 'evidence' && <EvidenceFolder key={evidenceUnit} db={db} portfolio={visiblePortfolio} source={selectedReference} initialUnitId={evidenceUnit} initialWizard={evidenceFromOutcome ? 'choose' : uploadOnEntry ? 'upload' : ''} busy={busy} onSave={saveEvidence} onDuplicate={duplicateEvidence}
      onSelectUnit={id => {
        const index = portfolio.units.findIndex(unit => unit.id === id);
        if (index >= 0) setUnitIndex(index);
      }}
      onMap={saveMultiUnitMapping} onOpenOutcome={openOutcome}
      onDownload={onDownload} onShowcase={items => run(() => downloadEvidenceShowcase(db,items))}
      onBack={evidenceFromOutcome || evidenceUnit ? () => changeView(evidenceFromOutcome ? 'outcome' : 'programme') : null}
      backLabel={evidenceFromOutcome ? 'Back to outcome' : 'Back to Unit'}/>}
    {view === 'registration' && <Registration db={db} portfolio={portfolio} progress={progress} busy={busy}
      onDeclare={() => commit('declare',{},'Declaration accepted.')}
      onFinalize={reference => commit('finalize',{p_certificate_reference: reference},reference ? 'Certificate reference recorded.' : 'Qualification completed.')}/>}
    {view === 'contact' && <ContactDiary db={db} portfolio={portfolio} progress={progress} onOutcome={openOutcome}/>}
    {view === 'metrics' && <PortfolioMetrics db={db} portfolio={portfolio} progress={progress} onOutcome={openOutcome}/>}
    {view === 'library' && cover && selectedReference &&
      <QualificationSourcePreview key={selectedReference.catalog_key} item={cover}
        references={[selectedReference]} embedded onBack={() => changeView('programme')}/>}
    {view === 'outcome' && outcome && outcomeIndex >= 0 && <QualificationOutcome
      units={portfolio.units} unitIndex={unitIndex} outcomeIndex={outcomeIndex} onJump={jumpFromOutcome}
      onBack={() => changeView('programme')} aim={referenceUnit?.aim || outcomeMaterial?.aim}
      sourceUrl={selectedReference?.source_url || outcomeMaterial?.sourceUrl}
      centreBrief={outcomeUnit.centreBrief ? <QualificationCentreBrief unit={outcomeUnit} db={db}/> : null}
      status={<Status outcome={outcome}/>} deadline={outcome.deadline && formatDate(outcome.deadline)} busy={busy}>
      {learner ? <LearnerClaim key={outcome.id + ':' + claimVersion} portfolio={portfolio} outcome={outcome}
        mapping={mapping} updateMapping={next => setDrafts(old => ({...old,[outcome.id]:{version:claimVersion,mapping:next}}))}
        busy={busy} onSave={submit => commit('save_claim',{p_outcome:outcome.id,p_version:claimVersion,p_mapping:mapping,p_submit:submit},
          submit ? 'Competence claim submitted.' : 'Draft saved.')}
        onEvidence={openEvidence} onRegistration={() => changeView('registration')} onDownload={onDownload}/> :
        <ReviewerClaim key={outcome.id + ':' + claimVersion} portfolio={portfolio} outcome={outcome}
          busy={busy} onDownload={onDownload} onReview={(decision,feedback,criteria) => commit('review',{
            p_outcome:outcome.id,p_version:claimVersion,p_stage:portfolio.role,p_decision:decision,p_feedback:feedback,p_criteria:criteria,
          }, 'Review recorded.')}/>}
      <OutcomeLearningSupport unit={outcomeUnit}/>
      <OutcomeRecords key={'records:' + outcome.id} unit={outcomeUnit} outcome={outcome} formatDate={formatDate}/>
      <OutcomeContact key={'contact:' + outcome.id} outcome={outcome} formatDate={formatDate} onContact={() => changeView('contact')}/>
    </QualificationOutcome>}
  </div>;
}

export default function LiveQualificationPortfolio({db}) {
  const [rows,setRows] = useState(null);
  const [references,setReferences] = useState([]);
  const [adminEnabled,setAdminEnabled] = useState(false);
  const [adminView,setAdminView] = useState(false);
  const [activeRole,setActiveRole] = useState('');
  const [portfolio,setPortfolio] = useState(null);
  const [evidenceEntry,setEvidenceEntry] = useState(null);
  const [previewId,setPreviewId] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(true);
  const [refreshKey,setRefreshKey] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    setBusy(true); setError('');
    Promise.all([portfolioRpc(db,'list'),portfolioRpc(db,'reference_catalog'),portfolioRpc(db,'admin_access')])
      .then(([data,sourceData,canManage]) => {
        if (id === request.current) {
          setRows(data);
          setReferences(Array.isArray(sourceData) ? sourceData : []);
          setAdminEnabled(canManage === true);
        }
      })
      .catch(error => {if (id === request.current) setError(failureMessage(error));})
      .finally(() => {if (id === request.current) setBusy(false);});
    return () => {request.current++;};
  }, [db,refreshKey]);
  const open = async (id, entry = null) => {
    const current = ++request.current;
    setBusy(true); setError('');
    try {
      const [data,briefs,certAuthorized] = await Promise.all([
        portfolioRpc(db,'portfolio',{p_enrolment:id}),
        portfolioRpc(db,'programme_briefs',{p_enrolment:id}),
        portfolioRpc(db,'certificate_access',{p_enrolment:id}),
      ]);
      if (current === request.current) {
        const byUnit=new Map((briefs||[]).map(item=>[item.unitId,item]));
        setEvidenceEntry(entry);
        setPortfolio({...data,catalogKey:data.catalogKey||rows?.find(row=>row.id===id)?.catalogKey,canRecordCertificate:data.canRecordCertificate||certAuthorized===true,
          units:data.units.map(unit=>({...unit,centreBrief:byUnit.get(unit.id)||null}))});
        setPreviewId('');setAdminView(false);
      }
    } catch (error) {
      if (current === request.current) setError(failureMessage(error));
    } finally {
      if (current === request.current) setBusy(false);
    }
  };
  const refresh = async updated => {
    const current = request.current;
    const [data,certAuthorized] = await Promise.all([
      updated || portfolioRpc(db,'portfolio',{p_enrolment:portfolio.id}),
      portfolioRpc(db,'certificate_access',{p_enrolment:portfolio.id}),
    ]);
    if (current === request.current) {
      const byUnit=new Map((portfolio?.units||[]).map(unit=>[unit.id,unit.centreBrief]));
      setPortfolio({...data,catalogKey:data.catalogKey||portfolio.catalogKey,canRecordCertificate:data.canRecordCertificate||certAuthorized===true,
        units:data.units.map(unit=>({...unit,centreBrief:byUnit.get(unit.id)||null}))});
    }
  };
  return <div className="qf-workspace qf-learner qf-live">
    {!busy&&!error&&!portfolio&&!previewId&&adminEnabled&&<div className="qc-admin-toolbar">
      <button type="button" onClick={()=>setAdminView(!adminView)}>
        <ShieldCheck size={17}/>{adminView?'Qualification catalogue':'Qualification Centre Admin'}
      </button>
    </div>}
    {busy ? <PremiumLoading variant="compact"/> : error ? <Panel title="Qualifications">
      <p role="alert">{error}</p><Action secondary onClick={() => setRefreshKey(value => value + 1)}>Retry</Action>
    </Panel> : portfolio ? <OpenPortfolio key={portfolio.id} db={db} portfolio={portfolio} references={references} evidenceEntry={evidenceEntry} onRefresh={refresh}
      onBack={() => {setPortfolio(null); setRefreshKey(value => value + 1);}}/> : adminView
      ? <QualificationCentreAdmin db={db} references={references} onBack={()=>{setAdminView(false);setRefreshKey(v=>v+1);}}/> : previewId
      ? <QualificationSourcePreview key={previewId} item={QUALIFICATIONS.find(item => item.id === previewId)}
          references={references} onBack={() => setPreviewId('')}
          learnerPortfolios={(rows || []).filter(row => row.role === 'learner' && !row.completedAt && row.catalogKey !== privateSandboxKey)}
          practicePortfolio={(rows || []).find(row => row.role === 'learner' && !row.completedAt && row.catalogKey === privateSandboxKey)}
          onOpenEvidence={(id, unitCode) => open(id, {unitCode})}/>
      : <ProgrammeListPremium rows={rows || []} references={references} activeRole={activeRole}
          onRoleChange={setActiveRole} onOpen={open} onPreview={setPreviewId}/>}
  </div>;
}
