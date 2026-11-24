import {claimState} from './qualificationPortfolioApi.js';

const sections = new Set(['dashboard','tasks','programme','outcome','evidence','matrix','registration','contact','metrics','library']);

export function restoreLearnerSection(units, link) {
  const index = units.findIndex(unit => unit.id === link?.unit);
  const unitIndex = Math.max(0, index);
  const view = sections.has(link?.section) ? link.section : 'tasks';
  if (view !== 'outcome') return {view, unitIndex, outcomeId: ''};
  const outcomeUnit = units.findIndex(unit => unit.outcomes.some(outcome => outcome.id === link.outcome));
  return outcomeUnit < 0 ? {view: 'programme', unitIndex, outcomeId: ''}
    : {view, unitIndex: outcomeUnit, outcomeId: link.outcome};
}

export function learnerNextStep(portfolio) {
  if (portfolio.completedAt) return {title: 'Qualification completed', section: 'registration', action: 'View completion record'};
  const outcomes = portfolio.units.flatMap(unit => unit.outcomes);
  const blocked = !portfolio.assessorAssigned
    ? 'The centre needs to assign an assessor before you can submit.'
    : !portfolio.declarationAt ? 'Accept your learner declaration before submitting.' : '';
  const needsChanges = outcomes.find(outcome => claimState(outcome) === 'changes_requested');
  if (portfolio.canEdit && needsChanges) {
    return {title: 'Review requested changes', detail: needsChanges.title, outcomeId: needsChanges.id, action: 'Open feedback and revise', blocked};
  }

  const pending = outcomes.filter(outcome => outcome.required && ['not_started','draft'].includes(claimState(outcome)));
  if (portfolio.canEdit && pending.length) {
    const fullyMapped = pending.find(outcome => outcome.criteria.length && outcome.criteria.every(criterion => outcome.claim?.mapping?.[criterion.id]?.length));
    if (fullyMapped && !portfolio.declarationAt && portfolio.assessorAssigned) {
      return {title: 'Accept your learner declaration', section: 'registration', action: 'Open Registration'};
    }
    if (fullyMapped) {
      return {title: blocked ? 'Review your mapped evidence' : 'Review and submit your claim', detail: fullyMapped.title, outcomeId: fullyMapped.id, action: 'Open claim', blocked};
    }
    if (!portfolio.evidence.length) {
      return {title: 'Prepare your first evidence', detail: 'Read the Unit brief for the work you need to prepare.', section: 'programme', unitIndex: portfolio.units.findIndex(unit => unit.outcomes.includes(pending[0])), action: 'Read Unit brief', blocked};
    }
    const target = pending.find(outcome => claimState(outcome) === 'draft') || pending[0];
    return {title: 'Link evidence to assessment criteria', detail: target.title, outcomeId: target.id, action: 'Open criteria', blocked};
  }

  if (outcomes.some(outcome => ['submitted','awaiting_verification','verification_returned'].includes(claimState(outcome)))) {
    return {title: 'Waiting for review', detail: 'Check the assessment panel for recorded decisions.'};
  }
  return {title: 'Check your programme status', section: 'registration', action: 'Open Registration'};
}
