import React, {useEffect, useRef, useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {portfolioRpc} from './qualificationPortfolioApi.js';

const kinds = {news: 'News', event: 'Event', appointment: 'Appointment', review: 'Review'};
const unavailable = error => ['PGRST202', '42883'].includes(error?.code);
const dateTime = value => new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
});

export function useProgrammeUpdates(db, enrolmentId) {
  const [result, setResult] = useState({items: null, error: ''});
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!enrolmentId) return;
    let active = true;
    setResult({items: null, error: ''});
    portfolioRpc(db, 'programme_updates', {p_enrolment: enrolmentId})
      .then(items => { if (active) setResult({items, error: ''}); })
      .catch(error => {
        if (active) setResult({items: null, error: unavailable(error)
          ? 'Programme scheduling and updates are unavailable on this deployment.'
          : error?.message || 'Could not load programme updates.'});
      });
    return () => { active = false; };
  }, [db, enrolmentId, refresh]);
  return {...result, retry: () => setRefresh(value => value + 1)};
}

export function ProgrammeUpdateList({items, empty}) {
  if (!items) return <p role="status">Loading programme updates…</p>;
  if (!items.length) return <p>{empty}</p>;
  return <div className="qf-ref-contact-history">
    {items.map(item => <article key={item.id}>
      <div><strong dir="auto">{item.title}</strong>
        <time dateTime={item.startsAt || item.createdAt}>{dateTime(item.startsAt || item.createdAt)}</time></div>
      {item.details && <p className="qf-live-copy" dir="auto">{item.details}</p>}
    </article>)}
  </div>;
}

export function ProgrammeUpdatesAdmin({db, version}) {
  const [items, setItems] = useState(null);
  const [kind, setKind] = useState('news');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [enrolment, setEnrolment] = useState('');
  const [error, setError] = useState('');
  const [readError, setReadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');
  const request = useRef(null);
  const enrolments = (version.enrolments || []).filter(row => !row.completedAt);
  const isPrivate = kind === 'appointment' || kind === 'review';

  useEffect(() => {
    let active = true;
    setReadError(null);
    portfolioRpc(db, 'admin_programme_updates', {p_version: version.id})
      .then(data => { if (active) setItems(data || []); })
      .catch(error => { if (active) setReadError(error); });
    return () => { active = false; };
  }, [db, version.id, refresh]);

  const run = async (work, success) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(success);
      setRefresh(value => value + 1);
    } catch (error) {
      setError(error?.message || 'Could not save the programme update.');
    } finally {
      setBusy(false);
    }
  };
  const save = event => {
    event.preventDefault();
    if (busy || !title.trim() || (kind !== 'news' && !startsAt) || (isPrivate && !enrolment)) return;
    const args = {p_version: version.id, p_enrolment: isPrivate ? enrolment : null,
      p_kind: kind, p_title: title.trim(), p_details: details.trim(),
      p_starts_at: kind === 'news' ? null : new Date(startsAt).toISOString()};
    const signature = JSON.stringify(args);
    if (request.current?.signature !== signature) request.current = {signature, id: crypto.randomUUID()};
    return run(async () => {
      await portfolioRpc(db, 'admin_create_programme_update', {...args, p_id: request.current.id});
      request.current = null;
      setTitle('');
      setDetails('');
      setStartsAt('');
    }, 'Programme update saved.');
  };
  const resolve = (item, resolution) => run(() => portfolioRpc(db, 'admin_resolve_programme_update', {
    p_version: version.id, p_id: item.id, p_resolution: resolution,
  }), resolution === 'completed' ? 'Meeting marked complete.' : 'Programme update withdrawn.');

  return <section className="qc-card">
    <header><CalendarDays size={19}/><h3>Programme updates and appointments</h3></header>
    {readError ? <p role="alert" className="qc-error">{unavailable(readError)
      ? 'Programme updates are unavailable on this deployment.'
      : readError.message || 'Could not load programme updates.'}{' '}
      <button type="button" className="qc-outline" onClick={() => setRefresh(value => value + 1)}>Retry</button></p>
      : items === null && <p role="status">Loading programme updates…</p>}
    {error && <p role="alert" className="qc-error">{error}</p>}
    {notice && <p role="status" className="qc-success-message">{notice}</p>}
    {items && !readError && <form className="qf-ref-contact-form" onSubmit={save}>
      <label className="qc-field">Update type<select value={kind} onChange={event => setKind(event.target.value)} disabled={busy}>
        {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {isPrivate && <label className="qc-field">Learner<select value={enrolment} onChange={event => setEnrolment(event.target.value)} disabled={busy} required>
        <option value="">{enrolments.length ? 'Choose an active enrolment' : 'No active enrolments'}</option>
        {enrolments.map(row => <option key={row.id} value={row.id}>{row.learner}</option>)}
      </select></label>}
      <label className="qc-field">Title<input dir="auto" value={title} onChange={event => setTitle(event.target.value)} required maxLength={160} disabled={busy}/></label>
      {kind !== 'news' && <label className="qc-field">Date and time (local)<input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} required disabled={busy}/></label>}
      <label className="qc-field">Details<textarea dir="auto" rows={3} value={details} onChange={event => setDetails(event.target.value)} maxLength={2000} disabled={busy}/></label>
      <button type="submit" className="qf-button qf-primary" disabled={busy || !title.trim() || (isPrivate && !enrolment)}>
        {kind === 'news' || kind === 'event' ? 'Publish update' : 'Schedule meeting'}
      </button>
    </form>}
    {items?.length === 0 && <p>No programme updates have been published.</p>}
    {!!items?.length && <div className="qf-ref-contact-history">
      {items.map(item => <article key={item.id}>
        <div><strong dir="auto">{item.title}</strong><span>{kinds[item.kind]}{item.learner ? ' · ' + item.learner : ''}</span>
          {item.startsAt && <time dateTime={item.startsAt}>{dateTime(item.startsAt)}</time>}</div>
        {item.details && <p className="qf-live-copy" dir="auto">{item.details}</p>}
        {item.resolvedAs ? <span>{item.resolvedAs === 'completed' ? 'Completed' : 'Withdrawn'}</span> : <div className="qf-live-actions">
          <button type="button" className="qc-outline" disabled={busy} onClick={() => resolve(item, 'cancelled')}>Withdraw</button>
          {item.learner && Date.parse(item.startsAt) <= Date.now() &&
            <button type="button" className="qc-outline" disabled={busy} onClick={() => resolve(item, 'completed')}>Mark complete</button>}
        </div>}
      </article>)}
    </div>}
  </section>;
}
