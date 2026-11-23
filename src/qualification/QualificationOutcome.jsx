import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ExternalLink, Printer} from 'lucide-react';
import QualificationEvidenceTemplates from './QualificationEvidenceTemplates.jsx';
import QualificationInternalNav from './QualificationInternalNav.jsx';
import {printPortfolioSection} from './portfolioPrint.js';
import './qualificationOutcome.css';

function outcomeLabel(unitIndex, code) {
  const unitNumber = String(unitIndex + 1).padStart(2, '0');
  return String(code).startsWith(unitNumber + '.') ? code : unitNumber + '.' + code;
}

export function OutcomePanel({title, action, children}) {
  return <section className="qf-card qf-outcome-panel">
    <div className="qf-card-header"><h3>{title}</h3>{action}</div>
    {children}
  </section>;
}

export function OutcomeCriteria({criteria}) {
  return <ol className="qf-live-criteria qf-outcome-criteria">
    {criteria.map(criterion => <li key={criterion.id || criterion.code}>
      <strong>{criterion.code}</strong> {criterion.title}
    </li>)}
  </ol>;
}

export default function QualificationOutcome({
  units, unitIndex, outcomeIndex, onJump, onBack, aim, sourceUrl, status, deadline, busy, centreBrief, children,
}) {
  const unit = units[unitIndex];
  const outcome = unit.outcomes[outcomeIndex];
  const titleRef = useRef(null);
  const sequence = units.flatMap((item, u) => item.outcomes.map((entry, o) => ({
    unitIndex: u, outcomeIndex: o, label: outcomeLabel(u, entry.code),
  })));
  const index = sequence.findIndex(entry => entry.unitIndex === unitIndex && entry.outcomeIndex === outcomeIndex);
  const previous = sequence[index - 1];
  const next = sequence[index + 1];
  const resources = outcome.resources || [];

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.scrollIntoView?.({block: 'nearest'});
  }, [unitIndex, outcomeIndex]);

  return <article className="qf-outcome-page">
    <nav className="qf-outcome-path" aria-label="Outcome location">
      <button className="qf-button qf-outline" type="button" onClick={onBack} disabled={busy}>
        <ArrowLeft size={15}/> Back to Unit
      </button>
      <span>{unit.code} · {unit.title}</span>
    </nav>
    <section className="qf-card qf-outcome-intro">
      <h2 ref={titleRef} tabIndex={-1}>Outcome {outcomeLabel(unitIndex, outcome.code)} · {outcome.title}</h2>
      {(outcome.guidance || aim) && <p dir="auto">{outcome.guidance || aim}</p>}
    </section>
    <nav className="qf-outcome-navigation" aria-label="Navigate learning outcomes">
      <button type="button" className="qf-button qf-outline" disabled={busy || !previous}
        onClick={() => onJump(previous.unitIndex, previous.outcomeIndex)}>
        <ArrowLeft size={15}/> {previous ? 'Previous · ' + previous.label : 'No previous outcomes'}
      </button>
      <label>Jump to Unit/Outcome
        <select value={unitIndex + ':' + outcomeIndex} disabled={busy} onChange={event => {
          const [u, o] = event.target.value.split(':');
          onJump(Number(u), o === undefined ? null : Number(o));
        }}>
          {units.map((item, u) => <optgroup key={item.id || item.code} label={item.title}>
            <option value={u}>Unit {String(u + 1).padStart(2, '0')} · {item.title}</option>
            {item.outcomes.map((entry, o) => <option key={entry.id || entry.code} value={u + ':' + o}>
              {outcomeLabel(u, entry.code)} · {entry.title}
            </option>)}
          </optgroup>)}
        </select>
      </label>
      <button type="button" className="qf-button qf-outline" disabled={busy || !next}
        onClick={() => onJump(next.unitIndex, next.outcomeIndex)}>
        {next ? 'Next · ' + next.label : 'No next outcomes'} <ArrowRight size={15}/>
      </button>
    </nav>
    <div className="qf-outcome-grid">
      <OutcomePanel title="Resources">
        {(resources.length > 0 || sourceUrl || !centreBrief) && <div className="qf-outcome-table">
          <table>
            <thead><tr><th scope="col">Resource</th><th scope="col">Type</th></tr></thead>
            <tbody>
              {resources.map(resource => <tr key={resource.id || resource.url}>
                <td><a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} <ExternalLink size={14}/></a></td>
                <td>{resource.type || 'Centre resource'}</td>
              </tr>)}
              {sourceUrl && <tr>
                <td><a href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source specification <ExternalLink size={14}/></a></td>
                <td>Awarding-body reference</td>
              </tr>}
              {!resources.length && !sourceUrl && !centreBrief && <tr><td colSpan={2}>No learning resources attached.</td></tr>}
            </tbody>
          </table>
        </div>}
        {centreBrief}
      </OutcomePanel>
      <OutcomePanel title="Actions">
        <dl className="qf-outcome-facts">
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div><dt>Deadline</dt><dd>{deadline || 'Not set'}</dd></div>
        </dl>
      </OutcomePanel>
    </div>
    {children}
  </article>;
}

export function ReadOnlyOutcomeDetails({unit, outcome}) {
  return <>
    <OutcomePanel title="Assessment Criteria"><OutcomeCriteria criteria={outcome.criteria}/></OutcomePanel>
    <OutcomePanel title="Competence Claim"><p>Evidence and criterion decisions are available in an enrolled portfolio.</p></OutcomePanel>
    <OutcomeRecords key={'records:' + unit.code + ':' + outcome.code} unit={unit} outcome={outcome}/>
    <OutcomeContact key={'contact:' + unit.code + ':' + outcome.code} outcome={outcome}/>
  </>;
}

export function OutcomeRecords({unit, outcome, formatDate}) {
  const [tab, setTab] = useState('checklists');
  const assessed = (outcome.submissions || []).flatMap(submission =>
    submission.reviews.filter(review => review.stage === 'assessor' && Object.keys(review.criteria || {}).length)
      .map(review => ({review, revision: submission.revision, criteria: submission.snapshot.criteria})));
  return <OutcomePanel title="Assessment records">
    <QualificationInternalNav items={ [['checklists', 'Grading Checklists'], ['forms', 'Recording Forms']] }
      active={tab} onChange={setTab} nested ariaLabel="Outcome assessment records"/>
    {tab === 'checklists' ? (assessed.length ? <div className="qf-live-history">
      {assessed.map(({review, revision, criteria}) => <details key={revision + ':' + review.createdAt}>
        <summary>Revision {revision} · {formatDate(review.createdAt)} · {review.decision === 'accept' ? 'Accepted' : 'Returned'}</summary>
        <ul>{criteria.filter(criterion => review.criteria[criterion.id]).map(criterion => <li key={criterion.id}>
          {criterion.code} · {criterion.title} <strong>({review.criteria[criterion.id].replaceAll('_', ' ')})</strong>
        </li>)}</ul>
      </details>)}
    </div> : <p>No recorded grading checklists for this outcome.</p>) :
      <QualificationEvidenceTemplates unit={ {...unit, outcomes: [outcome]} } compact/>}
  </OutcomePanel>;
}

export function OutcomeContact({outcome, onContact, formatDate}) {
  const [postedBy, setPostedBy] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('new');
  const printTarget = useRef(null);
  const entries = (outcome.submissions || []).flatMap(submission =>
    submission.reviews.filter(review => review.feedback)
      .map(review => ({...review, revision: submission.revision})));
  const filtered = entries.filter(entry => (!postedBy || entry.stage === postedBy) &&
    (!category || entry.decision === category) && entry.feedback.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (order === 'new' ? -1 : 1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  return <OutcomePanel title="Contact" action={<div className="qf-live-actions">
    {onContact && <button className="qf-button qf-outline" type="button" onClick={onContact}>Programme Contact Diary</button>}
    <button className="qf-button qf-outline" type="button" disabled={!filtered.length}
      onClick={() => printPortfolioSection(printTarget.current)}><Printer size={16}/> Print</button>
  </div>}>
    <details className="qf-outcome-filters"><summary>Filter</summary>
      <div className="qf-outcome-filter-fields">
        <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">All decisions</option><option value="accept">Accepted</option><option value="return">Returned</option>
        </select></label>
        <label>Posted by<select value={postedBy} onChange={event => setPostedBy(event.target.value)}>
          <option value="">All reviewers</option><option value="assessor">Assessor</option><option value="verifier">Verifier</option>
        </select></label>
        <label>Search feedback<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
        <label>Order by<select value={order} onChange={event => setOrder(event.target.value)}>
          <option value="new">Newest first</option><option value="old">Oldest first</option>
        </select></label>
      </div>
    </details>
    <div ref={printTarget} className="qf-ref-contact-history">
      <h3 className="qf-print-heading">Outcome contact · {outcome.title}</h3>
      {!filtered.length && <p>{entries.length ? 'No feedback matches the filters.' : 'No outcome feedback recorded.'}</p>}
      {filtered.map(entry => <article key={entry.revision + ':' + entry.stage + ':' + entry.createdAt}>
        <div><strong>{entry.stage === 'assessor' ? 'Assessor' : 'Verifier'} · Revision {entry.revision}</strong>
          <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></div>
        <p dir="auto">{entry.feedback}</p>
      </article>)}
    </div>
  </OutcomePanel>;
}
