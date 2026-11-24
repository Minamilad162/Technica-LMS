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

// Publication status is independent of enrolment and reviewer counts.
export const editionStatus=version=>version?.publishedAt?'Live':'Draft';
export function publicationChecks(version,references){
 const units=version?.units||[];
 return [
  {id:'rubric',label:'Official qualification structure verified',ok:units.length>0&&units.every(u=>sourceRubricForUnit(references,version,u).complete),tab:'units'},
  {id:'briefs',label:'All Unit Assessment Plans approved',ok:units.length>0&&units.every(u=>u.brief?.status==='approved'&&Boolean(u.brief?.approvedAt)),tab:'plans'},
  {id:'methods',label:'Assessment methods confirmed',ok:units.length>0&&units.every(u=>!needsAssessmentMethodReview(u.brief?.methods)),tab:'plans'},
 ];
}
export function validPublicationReference(value){
 return value.trim().length>=10&&!/(pending|placeholder|test|sandbox|demo|source reference|draft)/i.test(value);
}

export function bulkBriefReview(version,references){
 const units=version?.units||[];
 const rows=units.map(unit=>{
  const brief=unit.brief||{}, blockers=[];
  if(!sourceRubricForUnit(references,version,unit).complete)blockers.push('Official criteria need verification');
  if((brief.instructions||'').trim().length<80||(brief.instructions||'').trim().length>30000)blockers.push('Complete Unit instructions');
  if(needsAssessmentMethodReview(brief.methods)||(brief.methods||'').trim().length>3000)blockers.push('Select genuine assessment methods');
  return {id:unit.id,code:unit.code,title:unit.title,approved:brief.status==='approved'&&Boolean(brief.approvedAt),blockers};
 });
 const pending=rows.filter(row=>!row.approved).length;
 const expected=Object.fromEntries(units.map(u=>[u.id,{instructions:u.brief?.instructions??null,methods:u.brief?.methods??null}]));
 return {rows,pending,expected,ready:!version?.publishedAt&&pending>0&&rows.every(row=>!row.blockers.length)};
}

 // Proposed centre declaration: editable and not approved until the authorised user signs off.
export const DEFAULT_LEARNER_DECLARATION = 'I declare that the work and evidence I submit for this qualification are my own, authentic, accurate and attributable to me. I will acknowledge all sources and assistance, including any permitted use of AI, and will not submit misleading or plagiarised work. I will follow Technica Consult and the awarding body assessment, confidentiality and academic integrity requirements, and cooperate with assessment and internal quality assurance. I understand that suspected malpractice may be investigated under the applicable procedures.';
export function defaultPublicationReference(version){
 // This identifies the internal publication decision created by the existing audited RPC.
 // It is NOT an awarding-body accreditation or an already granted approval.
 return version?.id ? 'TECHNICA-INTERNAL-PUBLICATION-'+version.id : '';
}
