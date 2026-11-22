// The imported centre drafts contain a request to SELECT methods, not a decision.
// A real centre assessor must replace this text before sign-off.
export function needsAssessmentMethodReview(methods) {
  const text=typeof methods==='string'?methods.trim():'';
  return text.length<20 || /^methods must be selected and justified by the centre assessor\b/i.test(text);
}

// Match the server-supplied authoritative Unit, never a similarly named legacy edition.
export function sourceRubricForUnit(references,version,unit) {
  const source=Array.isArray(references)?references.find(r=>r.catalog_key===version?.catalogKey):null;
  const actual=source?.units?.find(item=>item.code===unit?.code)??null;
  const outcomes=Array.isArray(actual?.outcomes)?actual.outcomes:[];
  const criteria=outcomes.reduce((sum,o)=>sum+(Array.isArray(o.criteria)?o.criteria.length:0),0);
  return {source,unit:actual,outcomes,criteria,
    complete:Boolean(actual&&outcomes.length>0&&outcomes.length===Number(unit?.outcomes)&&criteria>0&&criteria===Number(unit?.criteria)
      &&outcomes.every(o=>Array.isArray(o.criteria)&&o.criteria.length>0))};
}

// Read-only readiness derived from the authenticated centre administrator RPC.
// These checks NEVER grant assessment access, approve a Unit, or publish a programme.
export function qualificationReadiness(version, staff = []) {
  const units = Array.isArray(version?.units) ? version.units : [];
  const enrolments = Array.isArray(version?.enrolments) ? version.enrolments : [];
  const reviewers = Array.isArray(staff) ? staff : [];
  const approvedUnits = units.filter(unit => unit.brief?.status === 'approved' && Boolean(unit.brief?.approvedAt));
  const pendingUnits = units.filter(unit => !approvedUnits.includes(unit));
  const incompleteRubric = units.filter(unit => !(Number(unit.outcomes) > 0 && Number(unit.criteria) > 0));
  const assessors = reviewers.filter(person => person.role === 'assessor').length;
  const verifiers = reviewers.filter(person => person.role === 'verifier').length;
  const published = Boolean(version?.publishedAt);
  const canRelease = !published && units.length > 0 && pendingUnits.length === 0 && incompleteRubric.length === 0;
  const canEnrol = published && assessors > 0 && verifiers > 0;
  const hasEnrolments = enrolments.length > 0;
  const live = canEnrol && hasEnrolments;

  let next = 'Select a qualification version to review its readiness.';
  if (incompleteRubric.length > 0) next = 'Resolve missing official Outcomes or Assessment Criteria before centre approval.';
  else if (pendingUnits.length > 0) next = 'Review the existing Unit briefs and approve each one only after genuine centre sign-off.';
  else if (!published) next = 'Record the genuine centre approval and release the complete qualification version.';
  else if (!assessors || !verifiers) next = 'Document the competence and authorization of an Assessor and an Internal Verifier.';
  else if (!hasEnrolments) next = 'Enrol a real learner and assign distinct authorized reviewers.';
  else next = 'Live portfolio access is available to the assigned learner and reviewers.';

  return {
    units: units.length,
    approvedBriefs: approvedUnits.length,
    draftBriefs: pendingUnits.length,
    pendingUnits, incompleteRubric,
    assessors, verifiers, enrolments: enrolments.length,
    published, canRelease, canEnrol, live, next
  };
}
