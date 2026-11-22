import React, {useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, GraduationCap, Layers3, LockKeyhole, ShieldCheck} from 'lucide-react';
import {QUALIFICATIONS} from './qualificationData.js';
import UnitMaterialPanel from './UnitMaterialPanel.jsx';

// Reference catalogue entries are NOT enrolments. Real portfolio access only comes from lms_qf_list.
export function qualificationFor(title = '') {
  const value = String(title).toLowerCase();
  if (/(proqual|nvq)/.test(value) && /(level\s*6|nvq)/.test(value)) return QUALIFICATIONS.find(q => q.id === 'nvq6');
  if (/othm/.test(value) && /level\s*7/.test(value)) return QUALIFICATIONS.find(q => q.id === 'othm7');
  if (/othm/.test(value) && /level\s*6/.test(value)) return QUALIFICATIONS.find(q => q.id === 'othm6');
  return null;
}

const roleLabels = {learner: 'My Qualifications', assessor: 'Assessment queue', verifier: 'Verification queue'};

export function ProgrammeListPremium({rows, activeRole, onRoleChange, onOpen, onPreview}) {
  const roles = ['learner', ...['assessor', 'verifier'].filter(key => rows.some(row => row.role === key))];
  const role = roles.includes(activeRole) ? activeRole : 'learner';
  const assigned = rows.filter(row => row.role === role);
  const unmatched = assigned.filter(row => !qualificationFor(row.title));
  return <>
    <header className="qf-live-lead">
      <div className="qf-live-lead-content">
        <span className="qf-live-eyebrow"><GraduationCap size={16}/> TECHNICA PROFESSIONAL QUALIFICATIONS</span>
        <h1>Qualifications</h1>
        <p>Explore your programmes, manage evidence and follow every step of your assessment journey.</p>
      </div>
      <div className="qf-live-lead-count"><strong>03</strong><span>Qualification pathways</span></div>
    </header>
    <nav className="qf-live-nav qf-live-role-nav" aria-label="Qualification workspaces">
      {roles.map(key => {
        const Icon = key === 'learner' ? GraduationCap : key === 'assessor' ? ClipboardCheck : ShieldCheck;
        return <button key={key} type="button" aria-pressed={role === key} onClick={() => onRoleChange(key)}>
          <Icon size={17}/>{roleLabels[key]}
          {key !== 'learner' && <span className="qf-live-tab-count">{rows.filter(row => row.role === key).length}</span>}
        </button>;
      })}
    </nav>
    {role === 'learner' ? <>
      <div className="qf-live-section-heading">
        <div><span className="qf-overline">YOUR LEARNING PATH</span><h2>Choose a qualification</h2></div>
        <span>{assigned.length} assigned {assigned.length === 1 ? 'portfolio' : 'portfolios'}</span>
      </div>
      <div className="qf-course-grid qf-live-catalogue">
        {QUALIFICATIONS.map(item => {
          const enrolments = assigned.filter(row => qualificationFor(row.title)?.id === item.id);
          return <article className={'qf-course-card qf-course-theme-' + item.color} key={item.id}>
            <div className="qf-course-hero">
              <img src={item.heroImage} alt="" loading="lazy" decoding="async" aria-hidden="true"/>
              <div className="qf-course-hero-shade" aria-hidden="true"/>
              <div className="qf-course-hero-head"><span>PROFESSIONAL QUALIFICATION</span><span className="qf-course-hero-level">LEVEL {item.level}</span></div>
              <div className="qf-course-hero-brand"><strong>{item.body}</strong></div>
            </div>
            <div className="qf-course-body">
              <span className={'qf-live-card-label ' + (enrolments.length ? 'assigned' : '')}>
                {enrolments.length ? <><CheckCircle2 size={15}/> Assigned to you</> : <><BookOpen size={15}/> Programme preview</>}
              </span>
              <h2>{item.name}</h2>
              <div className="qf-course-foot">
                <span className="qf-course-units"><Layers3 size={17}/> {item.units.length} Units</span>
                <button type="button" onClick={() => enrolments.length === 1 ? onOpen(enrolments[0].id) : onPreview(item.id)}
                  aria-label={(enrolments.length === 1 ? 'Open ' : 'Preview ') + item.name}>
                  {enrolments.length === 1 ? 'Open portfolio' : 'View syllabus'} <ArrowRight size={17}/>
                </button>
              </div>
              {enrolments.length > 1 && <div className="qf-live-multi-enrolments" aria-label="Assigned portfolios">
                {enrolments.map(row => <button type="button" key={row.id} onClick={() => onOpen(row.id)}>
                  <span>{row.title}</span><ChevronRight size={17}/>
                </button>)}
              </div>}
            </div>
          </article>;
        })}
      </div>
      {unmatched.length > 0 && <section className="qf-card">
        <div className="qf-card-header"><h3>Other assigned programmes</h3></div>
        <div className="qf-live-list">
          {unmatched.map(row => <button type="button" key={row.id} onClick={() => onOpen(row.id)}>
            <BookOpen size={19}/><span><strong>{row.title}</strong><small>Assigned programme</small></span><ArrowRight size={18}/>
          </button>)}
        </div>
      </section>}
      <p className="qf-live-catalogue-note"><LockKeyhole size={16}/>
        All three qualifications can be previewed. Submitting evidence or receiving assessor decisions requires an assigned portfolio.
      </p>
    </> : <>
      <div className="qf-live-section-heading">
        <div><span className="qf-overline">REVIEW WORKSPACE</span><h2>{roleLabels[role]}</h2></div>
        <span>{assigned.length} assigned</span>
      </div>
      <section className="qf-card">
        <div className="qf-card-header"><h3>{role === 'assessor' ? 'Learner submissions' : 'Internal verification'}</h3></div>
        {!assigned.length && <p className="qf-empty qf-empty-compact">No assigned portfolios in this queue.</p>}
        <div className="qf-live-list qf-live-review-list">
          {assigned.map(row => <button type="button" key={row.id} onClick={() => onOpen(row.id)}>
            <ClipboardCheck size={21}/><span><strong>{row.title}</strong>
              <small>{row.learner || 'Learner'} · {row.pending} awaiting review</small></span><ArrowRight size={19}/>
          </button>)}
        </div>
      </section>
    </>}
  </>;
}

export function QualificationPreview({item, onBack}) {
  const [unitIndex,setUnitIndex] = useState(0);
  const unit = item.units[unitIndex];
  return <div className="qf-live-stack">
    <button type="button" className="qf-plain-back" onClick={onBack}><ArrowLeft size={17}/> All qualifications</button>
    <header className={'qf-live-feature qf-course-theme-' + item.color}>
      <img src={item.heroImage} alt="" aria-hidden="true"/>
      <div className="qf-live-feature-shade"/>
      <div className="qf-live-feature-content">
        <span className="qf-live-eyebrow">QUALIFICATION OVERVIEW · {item.body}</span>
        <h1>{item.name}</h1>
        <div className="qf-live-feature-meta"><span><GraduationCap size={17}/> Level {item.level}</span>
          <span><Layers3 size={17}/> {item.units.length} Units</span><span>{item.ref}</span></div>
      </div>
    </header>
    <div className="qf-live-preview-notice"><BookOpen size={20}/><p><strong>Programme preview.</strong> Browse the awarding-body unit structure and verified source material. Evidence, assessment and certificates require an enrolled portfolio.</p></div>
    <div className="qf-live-section-heading"><div><span className="qf-overline">PROGRAMME STRUCTURE</span><h2>Explore the units</h2></div><span>{item.units.length} units</span></div>
    <nav className="qf-unit-strip" aria-label="Qualification units">
      <span className="qf-unit-strip-label">UNITS</span>
      <div className="qf-number-tabs" role="tablist" aria-label="Choose a unit">
        {item.units.map(([code,title],index) => <button type="button" role="tab" aria-selected={index === unitIndex}
          key={code} className={'qf-number-tab ' + (index === unitIndex ? 'active' : '')}
          onClick={() => setUnitIndex(index)} title={title} aria-label={'Unit ' + (index + 1) + ': ' + title}>
          {String(index + 1).padStart(2,'0')}
        </button>)}
      </div><span className="qf-unit-total">{item.units.length} units</span>
    </nav>
    <header className="qf-unit-heading"><div><span className="qf-overline" dir="ltr">{unit[0]}</span><h2>{unit[1]}</h2></div></header>
    <UnitMaterialPanel key={unit[0]} unitCode={unit[0]}/>
  </div>;
}
