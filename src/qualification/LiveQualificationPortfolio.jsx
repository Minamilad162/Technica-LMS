import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Download, FileText, FolderOpen, GraduationCap, Layers3, LibraryBig, MessageSquare, ShieldCheck, BarChart3} from 'lucide-react';
import PremiumLoading from '../components/PremiumLoading.jsx';
import {QUALIFICATIONS} from './qualificationData.js';
import {ProgrammeListPremium, qualificationFor} from './QualificationCatalogue.jsx';
import QualificationSourcePreview from './QualificationSourcePreview.jsx';
import QualificationCentreAdmin from './QualificationCentreAdmin.jsx';
import QualificationCentreBrief from './QualificationCentreBrief.jsx';
import {PortfolioStatusRibbon,PortfolioMetrics} from './QualificationPortfolioReferenceUI.jsx';
import QualificationEvidenceTemplates from './QualificationEvidenceTemplates.jsx';
import {LiveUnitLearningHub, OutcomeLearningSupport, ProgrammeMaterialSnapshot, EvidencePreparationTips} from './QualificationLearningResources.jsx';
import {
  canReview, claimLabels, claimState, downloadEvidenceShowcase, downloadPortfolioEvidence, evidenceExtensions,
  evidenceKinds, evidencePayload, portfolioRpc, programmeProgress, uploadPortfolioEvidence,
} from './qualificationPortfolioApi.js';
import './qualificationPortfolio.css';
import './qualificationPremium.css';

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

function PortfolioOverview({portfolio, progress, onOutcome, onView, qualification}) {
  const learner = portfolio.role === 'learner';
  const pending = progress.outcomes.filter(outcome => learner
    ? ['submitted','awaiting_verification','verification_returned'].includes(claimState(outcome))
    : canReview(portfolio.role, claimState(outcome)));
  const changes = learner ? progress.outcomes.filter(outcome => claimState(outcome) === 'changes_requested') : [];
  const overdue = learner ? progress.outcomes.filter(o => o.overdue) : [];
  const start = new Date(portfolio.startsOn).getTime();
  const end = new Date(portfolio.targetOn).getTime();
  const expected = portfolio.targetOn && end > start
    ? Math.round(Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) * 100) : null;
  const percent = count => progress.total ? Math.round(count / progress.total * 100) : 0;
  return <>
    <div className="qf-live-progress">
      <Panel title="Started"><div className="qf-live-kpi"><strong>{percent(progress.started)}%</strong><span>{progress.started} outcomes started</span></div><progress max={100} value={percent(progress.started)}/></Panel>
      <Panel title="Completed"><div className="qf-live-kpi"><strong>{percent(progress.verified)}%</strong><span>{progress.verified} of {progress.total} required verified</span></div><progress max={100} value={percent(progress.verified)}/></Panel>
      <Panel title="Expected"><div className="qf-live-kpi"><strong>{expected === null ? '—' : expected + '%'}</strong><span>{expected === null ? 'No target date' : 'Expected progress by today'}</span></div><progress max={100} value={expected ?? 0}/></Panel>
    </div>
    <Panel title={learner ? 'Awaiting Review' : roleLabels[portfolio.role]}>
      <div className="qf-live-list">
        {pending.length === 0 && <p>No outcomes awaiting action.</p>}
        {pending.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
      </div>
    </Panel>
    {learner && <>
      {changes.length > 0 && <Panel title="Changes Requested"><div className="qf-live-list">
        {changes.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
      </div></Panel>}
      <Panel title="Overdue"><div className="qf-live-list">
        {overdue.length ? overdue.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>) : <p>No overdue outcomes.</p>}
      </div></Panel>
    </>}
    <ProgrammeMaterialSnapshot portfolio={portfolio} qualification={qualification}
      onProgramme={() => onView('programme')} onLibrary={() => onView('library')}/>
  </>;
}

function OutcomeLink({outcome, onOpen}) {
  return <button type="button" onClick={() => onOpen(outcome.id)}>
    <span><strong>{outcome.code} · {outcome.title}</strong>
      {outcome.deadline && <small>Due {formatDate(outcome.deadline)}</small>}
    </span><Status outcome={outcome}/><ArrowRight size={16}/>
  </button>;
}

function UnitProgramme({db,portfolio, unitIndex, setUnitIndex, onOutcome, onEvidence, onLibrary}) {
  const unit = portfolio.units[unitIndex];
  const learner = portfolio.role === 'learner';
  return <>
    <div className="qf-live-section-heading"><div><span className="qf-overline">LEARNING OUTCOMES</span><h2>Programme units</h2></div><span>{portfolio.units.length} units</span></div>
    <nav className="qf-unit-strip" aria-label="Qualification units">
      <span className="qf-unit-strip-label">UNITS</span>
      <div className="qf-number-tabs">
        {portfolio.units.map((item, index) => <button type="button" key={item.id}
          className={'qf-number-tab ' + (index === unitIndex ? 'active' : '')} aria-pressed={index === unitIndex}
          title={item.title} aria-label={item.code + ' · ' + item.title}
          onClick={() => setUnitIndex(index)}>{String(index + 1).padStart(2, '0')}</button>)}
      </div>
    </nav>
    <div className="qf-unit-heading"><div><span className="qf-overline" dir="ltr">{unit.code}</span><h2>{unit.title}</h2></div></div>
    <QualificationCentreBrief unit={unit} db={db}/>
    <LiveUnitLearningHub key={unit.id} unit={unit} portfolio={portfolio} onEvidence={onEvidence} onLibrary={onLibrary}/>
    <QualificationEvidenceTemplates key={unit.id+':forms'} unit={unit}/>
    <div className="qf-live-grid">
      <Panel title="Learning Outcomes"><div className="qf-live-list">
        {unit.outcomes.map(outcome => <OutcomeLink key={outcome.id} outcome={outcome} onOpen={onOutcome}/>)}
      </div></Panel>
      <Panel title="Criteria & Gap Analysis"><div className="qf-live-gaps">
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

function EvidenceFolder({portfolio, onDownload, onShowcase, busy, onSave, onBack}) {
  const [mode, setMode] = useState('');
  const [showcase, setShowcase] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState(evidenceKinds[0]);
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const reservation = useRef(null);
  const start = value => {
    setMode(value); setBody(''); setTitle(''); setDescription(''); setFile(null); reservation.current = null;
  };
  const save = () => onSave({mode,title,description,kind,body,file}, reservation, () => start(''));
  const outcomes = portfolio.units.flatMap(unit => unit.outcomes.map(outcome => ({...outcome, unitCode: unit.code})));
  const uses = id => outcomes.filter(outcome => {
    const mappings = [outcome.claim?.mapping, ...outcome.submissions.map(submission => submission.snapshot.mapping)];
    return mappings.some(mapping => mapping && Object.values(mapping).some(ids => ids.includes(id)));
  }).map(outcome => outcome.unitCode + ' / ' + outcome.code);
  const selection = portfolio.evidence.filter(item => showcase.includes(item.id));
  return <div className="qlearn-evidence-stack"><EvidencePreparationTips/><div className="qf-live-grid">
    <Panel title="Evidence Folder" action={onBack && <Action secondary disabled={busy} onClick={onBack}>Back to outcome</Action>}>
      {portfolio.evidence.length === 0 && <p>No evidence added yet.</p>}
      <div className="qf-live-evidence-list">
        {portfolio.evidence.map(item => <div key={item.id}>
          <EvidenceItem item={item} onDownload={onDownload} uses={uses(item.id)}/>
          <label className="qf-live-showcase"><input type="checkbox" checked={showcase.includes(item.id)} disabled={busy}
            onChange={e => setShowcase(old => e.target.checked ? [...old,item.id] : old.filter(id => id !== item.id))}
            aria-label={'Include ' + item.title + ' in showcase'}/> Include in Showcase</label>
        </div>)}
      </div>
      {portfolio.evidence.length > 0 && <Action secondary disabled={busy || !selection.length} onClick={() => onShowcase(selection)}>
        <Download size={15}/> Download Showcase ({selection.length})
      </Action>}
    </Panel>
    {portfolio.canEdit && <Panel title="Evidence Wizard">
      <div className="qf-live-actions">
        <Action secondary disabled={busy || mode === 'upload'} onClick={() => start('upload')}>Upload a file</Action>
        <Action secondary disabled={busy || mode === 'write'} onClick={() => start('write')}>Write evidence</Action>
      </div>
      {mode && <form className="qf-live-form" onSubmit={event => {event.preventDefault(); save();}}>
        <fieldset disabled={busy}>
          <label className="qf-field">Title<input dir="auto" required maxLength={160} value={title} onChange={e => {setTitle(e.target.value); reservation.current = null;}}/></label>
          <label className="qf-field">Description<textarea dir="auto" maxLength={2000} rows={2} value={description} onChange={e => {setDescription(e.target.value); reservation.current = null;}}/></label>
          <label className="qf-field">Evidence type<select value={kind} onChange={e => {setKind(e.target.value); reservation.current = null;}}>
            {evidenceKinds.map(item => <option key={item}>{item}</option>)}
          </select></label>
          {mode === 'upload' ? <label className="qf-field">File (up to 10 MB)<input required type="file" accept={evidenceExtensions}
            onChange={e => {setFile(e.target.files[0] || null); reservation.current = null;}}/></label> :
            <label className="qf-field">Evidence<textarea dir="auto" required maxLength={20000} rows={6} value={body} onChange={e => {setBody(e.target.value); reservation.current = null;}}/></label>}
          <button className="qf-button qf-primary" type="submit" disabled={!title.trim() || (mode === 'write' ? !body.trim() : !file)}>Save evidence</button>
        </fieldset>
      </form>}
    </Panel>}
  </div></div>;
}

function MappingTable({criteria, evidence, mapping, editable, onToggle}) {
  return <div className="qf-matrix-scroll" role="region" tabIndex={0} aria-label="Evidence to criteria mapping">
    <table className="qf-matrix qf-live-matrix"><thead><tr><th scope="col">Evidence</th>
      {criteria.map(criterion => <th key={criterion.id} scope="col" title={criterion.title}>{criterion.code}</th>)}
    </tr></thead><tbody>
      {evidence.map(item => <tr key={item.id}><th scope="row" dir="auto">{item.title}</th>
        {criteria.map(criterion => {
          const linked = mapping[criterion.id]?.includes(item.id);
          return <td key={criterion.id}>{editable
            ? <input type="checkbox" checked={!!linked} onChange={() => onToggle(criterion.id,item.id)}
                aria-label={'Link ' + item.title + ' to ' + criterion.code + ' ' + criterion.title}/>
            : (linked ? 'Linked' : '—')}</td>;
        })}
      </tr>)}
    </tbody></table>
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
  const [choosing, setChoosing] = useState(false);
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
    <Panel title="Competence Claim" action={<span>{covered} / {outcome.criteria.length} linked</span>}>
      {editable && <div className="qf-live-actions">
        <Action secondary disabled={busy} aria-expanded={choosing} onClick={() => setChoosing(value => !value)}>Choose evidence</Action>
        <Action secondary disabled={busy} onClick={onEvidence}>Evidence Wizard <FolderOpen size={16}/></Action>
      </div>}
      {editable && choosing && <fieldset className="qf-live-choose" disabled={busy}>
        <legend>Show evidence in the mapping table</legend>
        {portfolio.evidence.length === 0 && <p>Add evidence to your folder first.</p>}
        {portfolio.evidence.map(item => <label key={item.id}><input type="checkbox" checked={linked.has(item.id) || selected.includes(item.id)}
          disabled={linked.has(item.id)} onChange={e => setSelected(old => e.target.checked ? [...old,item.id] : old.filter(id => id !== item.id))}/>
          <span dir="auto">{item.title}</span>
        </label>)}
      </fieldset>}
      {evidence.length ? <MappingTable criteria={outcome.criteria} evidence={evidence} mapping={currentMapping}
        editable={editable && !busy} onToggle={toggle}/> : <p>No evidence selected for this outcome.</p>}
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
      {snapshot && <Panel title={'Criterion mapping · Revision ' + submission.revision}>
        <MappingTable criteria={snapshot.criteria} evidence={evidence} mapping={snapshot.mapping}/>
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

function Registration({portfolio, progress, busy, onDeclare, onFinalize}) {
  const [reference, setReference] = useState('');
  const learner = portfolio.role === 'learner';
  const verifier = portfolio.role === 'verifier';
  return <div className="qf-live-grid">
    <Panel title="Registration">
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
  </div>;
}

function ContactDiary({progress, onOutcome}) {
  const activity = progress.outcomes.flatMap(outcome => outcome.submissions.flatMap(submission =>
    submission.reviews.map((review,index) => ({...review,outcome,revision:submission.revision,index}))))
    .sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return <Panel title="Contact Diary">
    {activity.length === 0 && <p>No assessment feedback yet.</p>}
    <div className="qf-live-history">{activity.map(entry => <article key={entry.outcome.id + ':' + entry.revision + ':' + entry.index}>
      <button type="button" className="qf-live-link" onClick={() => onOutcome(entry.outcome.id)}>{entry.outcome.code} · {entry.outcome.title}</button>
      <p><strong>{entry.stage === 'assessor' ? 'Assessor' : 'Verifier'} · {entry.decision === 'accept' ? 'Accepted' : 'Returned'}</strong> · {formatDate(entry.createdAt)}</p>
      {entry.feedback && <p className="qf-live-copy" dir="auto">{entry.feedback}</p>}
    </article>)}</div>
  </Panel>;
}

function OpenPortfolio({db, portfolio, references, onRefresh, onBack}) {
  const [view,setView] = useState('programme');
  const [unitIndex,setUnitIndex] = useState(0);
  const [outcomeId,setOutcomeId] = useState('');
  const [evidenceFromOutcome,setEvidenceFromOutcome] = useState(false);
  const [drafts,setDrafts] = useState({});
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const locking = useRef(false);
  const progress = programmeProgress(portfolio);
  const outcome = progress.outcomes.find(item => item.id === outcomeId);
  const learner = portfolio.role === 'learner';
  const base = {p_enrolment: portfolio.id};
  const claimVersion = outcome?.claim?.version || 0;
  const mapping = drafts[outcomeId]?.version === claimVersion ? drafts[outcomeId].mapping : outcome?.claim?.mapping || {};
  const changeView = key => {
    setView(key); setError(''); setNotice('');
    if (key !== 'evidence') setEvidenceFromOutcome(false);
  };
  const openOutcome = id => {
    setUnitIndex(portfolio.units.findIndex(unit => unit.outcomes.some(item => item.id === id)));
    setOutcomeId(id); changeView('outcome');
  };
  const run = async (work, message) => {
    if (locking.current) return;
    locking.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await work();
      if (message) setNotice(message);
    } catch (error) {
      setError(failureMessage(error));
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
  const saveEvidence = (fields, reservation, onSaved) => run(async () => {
    const evidence = evidencePayload(fields);
    if (!reservation.current || Date.now() - reservation.current.requestedAt > 3500000) {
      reservation.current = {requestId:crypto.randomUUID(),requestedAt:Date.now()};
    }
    const request = {...base,...evidence,p_request:reservation.current.requestId};
    if (fields.mode === 'write') {
      await portfolioRpc(db,'add_evidence',request);
      onSaved();
      await onRefresh();
      return;
    }
    if (!reservation.current.path) {
      const item = await portfolioRpc(db,'add_evidence',request);
      reservation.current = {...reservation.current,...item};
    }
    const updated = await uploadPortfolioEvidence(db,portfolio.id,reservation.current,fields.file,evidence.p_mime);
    onSaved();
    await onRefresh(updated);
  }, 'Evidence saved.');
  const openEvidence = () => {
    changeView('evidence'); setEvidenceFromOutcome(true);
  };
  const onDownload = item => run(() => downloadPortfolioEvidence(db,item));
  const views = [
    ['programme','Course'],['evidence','Evidence'],['registration','Registration'],['contact','Contact'],
    ['metrics','Metrics'],['dashboard','Overview'],
    ...(qualificationFor(portfolio.title) ? [['library','Study Library']] : []),
  ];
  const sectionIcons = {dashboard: Layers3, programme: BookOpen, evidence: FolderOpen, registration: GraduationCap, contact: MessageSquare, metrics: BarChart3, library: LibraryBig};
  const cover = qualificationFor(portfolio.title);
  const selectedReference = references.find(ref => ref.catalog_key === portfolio.catalogKey ||
    (ref.title === portfolio.title && ref.version === portfolio.version));
  const outcomeUnit = portfolio.units.find(unit => unit.outcomes.some(item => item.id === outcomeId));
  return <div className="qf-live-stack" aria-busy={busy}>
    <button type="button" className="qf-plain-back" disabled={busy} onClick={onBack}><ArrowLeft size={16}/> Qualifications</button>
    <header className={'qf-live-feature qf-live-feature-open ' + (cover ? 'qf-course-theme-' + cover.color : '')}>
      {cover && <img src={cover.heroImage} alt="" aria-hidden="true"/>}
      <div className="qf-live-feature-shade"/>
      <div className="qf-live-feature-content">
        <span className="qf-live-eyebrow">{roleLabels[portfolio.role]} · {cover?.body || 'TECHNICA'}</span>
        <h1 className="qf-programme-title">{portfolio.title}</h1>
        <div className="qf-live-feature-meta"><span><Layers3 size={16}/> {portfolio.units.length} Units</span>
          <span><CheckCircle2 size={16}/> {progress.verified}/{progress.total} verified outcomes</span>
          {portfolio.completedAt && <span><ShieldCheck size={16}/> Completed</span>}</div>
        {!learner && <p className="qf-live-feature-learner" dir="auto">{portfolio.learner}</p>}
      </div>
      <div className="qf-live-feature-action"><Action secondary disabled={busy} onClick={() => run(() => onRefresh())}>Refresh</Action></div>
    </header>
    <PortfolioStatusRibbon portfolio={portfolio} progress={progress} onRegistration={()=>changeView('registration')}/>
    <nav className="qf-live-nav" aria-label="Programme sections">
      {views.map(([key,label]) => {
        const Icon = sectionIcons[key];
        return <button key={key} type="button" disabled={busy}
          aria-pressed={view === key || (view === 'outcome' && key === 'programme')}
          onClick={() => changeView(key)}><Icon size={17}/>{label}</button>;
      })}
    </nav>
    {error && <p className="qf-live-error" role="alert">{error}</p>}
    {notice && <p className="qf-live-notice" role="status">{notice}</p>}
    {view === 'dashboard' && <PortfolioOverview portfolio={portfolio} progress={progress} onOutcome={openOutcome} onView={changeView} qualification={cover}/>}
    {view === 'programme' && <UnitProgramme db={db} portfolio={portfolio} unitIndex={unitIndex} setUnitIndex={setUnitIndex} onOutcome={openOutcome}
      onEvidence={learner ? () => changeView('evidence') : null} onLibrary={cover ? () => changeView('library') : null}/>}
    {view === 'evidence' && <EvidenceFolder portfolio={portfolio} busy={busy} onSave={saveEvidence}
      onDownload={onDownload} onShowcase={items => run(() => downloadEvidenceShowcase(db,items))} onBack={evidenceFromOutcome ? () => changeView('outcome') : null}/>}
    {view === 'registration' && <Registration portfolio={portfolio} progress={progress} busy={busy}
      onDeclare={() => commit('declare',{},'Declaration accepted.')}
      onFinalize={reference => commit('finalize',{p_certificate_reference: reference},reference ? 'Certificate reference recorded.' : 'Qualification completed.')}/>}
    {view === 'contact' && <ContactDiary progress={progress} onOutcome={openOutcome}/>}
    {view === 'metrics' && <PortfolioMetrics portfolio={portfolio} progress={progress} onOutcome={openOutcome}/>}
    {view === 'library' && cover && selectedReference &&
      <QualificationSourcePreview key={selectedReference.catalog_key} item={cover}
        references={[selectedReference]} onBack={() => changeView('programme')}/>}
    {view === 'outcome' && outcome && <>
      <div className="qf-live-actions"><Action secondary disabled={busy} onClick={() => changeView('programme')}><ArrowLeft size={16}/> Back to unit</Action><Status outcome={outcome}/></div>
      <h2>{outcome.code} · {outcome.title}</h2>
      <OutcomeLearningSupport unit={outcomeUnit} outcome={outcome} learner={learner}
        onEvidence={openEvidence} onLibrary={cover ? () => changeView('library') : null}/>
      <div className="qf-live-grid">
        <Panel title="Assessment Criteria"><ol className="qf-live-criteria">
          {outcome.criteria.map(criterion => <li key={criterion.id}><strong>{criterion.code}</strong> {criterion.title}</li>)}
        </ol></Panel>
        <Panel title="Assessment readiness">
          <div className="qlearn-readiness-list">
            <div><span>Criteria to address</span><strong>{outcome.criteria.length}</strong></div>
            <div><span>Current status</span><Status outcome={outcome}/></div>
            {outcome.deadline && <div><span>Target date</span><strong>{formatDate(outcome.deadline)}</strong></div>}
            <div><span>Submitted revisions</span><strong>{outcome.submissions.length}</strong></div>
          </div>
          {learner && <Action secondary disabled={busy} onClick={openEvidence}><FolderOpen size={16}/> Open Evidence Folder</Action>}
          <p className="qlearn-readiness-note">An uploaded file is not an assessor submission. Link your evidence to the criteria in the Competence Claim below.</p>
        </Panel>
      </div>
      {learner ? <LearnerClaim key={outcome.id + ':' + claimVersion} portfolio={portfolio} outcome={outcome}
        mapping={mapping} updateMapping={next => setDrafts(old => ({...old,[outcome.id]:{version:claimVersion,mapping:next}}))}
        busy={busy} onSave={submit => commit('save_claim',{p_outcome:outcome.id,p_version:claimVersion,p_mapping:mapping,p_submit:submit},
          submit ? 'Competence claim submitted.' : 'Draft saved.')}
        onEvidence={openEvidence} onRegistration={() => changeView('registration')} onDownload={onDownload}/> :
        <ReviewerClaim key={outcome.id + ':' + claimVersion} portfolio={portfolio} outcome={outcome}
          busy={busy} onDownload={onDownload} onReview={(decision,feedback,criteria) => commit('review',{
            p_outcome:outcome.id,p_version:claimVersion,p_stage:portfolio.role,p_decision:decision,p_feedback:feedback,p_criteria:criteria,
          }, 'Review recorded.')}/>}
    </>}
  </div>;
}

export default function LiveQualificationPortfolio({db}) {
  const [rows,setRows] = useState(null);
  const [references,setReferences] = useState([]);
  const [adminEnabled,setAdminEnabled] = useState(false);
  const [adminView,setAdminView] = useState(false);
  const [activeRole,setActiveRole] = useState('');
  const [portfolio,setPortfolio] = useState(null);
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
  const open = async id => {
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
        setPortfolio({...data,canRecordCertificate:data.canRecordCertificate||certAuthorized===true,
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
      setPortfolio({...data,canRecordCertificate:data.canRecordCertificate||certAuthorized===true,
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
    </Panel> : portfolio ? <OpenPortfolio key={portfolio.id} db={db} portfolio={portfolio} references={references} onRefresh={refresh}
      onBack={() => {setPortfolio(null); setRefreshKey(value => value + 1);}}/> : adminView
      ? <QualificationCentreAdmin db={db} references={references} onBack={()=>{setAdminView(false);setRefreshKey(v=>v+1);}}/> : previewId
      ? <QualificationSourcePreview key={previewId} item={QUALIFICATIONS.find(item => item.id === previewId)}
          references={references} onBack={() => setPreviewId('')}/>
      : <ProgrammeListPremium rows={rows || []} references={references} activeRole={activeRole}
          onRoleChange={setActiveRole} onOpen={open} onPreview={setPreviewId}/>}
  </div>;
}
