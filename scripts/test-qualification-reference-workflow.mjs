import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=source('src/qualification/LiveQualificationPortfolio.jsx');
const status=source('src/qualification/QualificationPortfolioReferenceUI.jsx');
const registration=source('src/qualification/QualificationCandidateRegistration.jsx');
const css=source('src/qualification/qualificationPremium.css');
const preview=source('src/qualification/QualificationCentreLearnerPreview.jsx');
const sourcePreview=source('src/qualification/QualificationSourcePreview.jsx');
const unitNav=source('src/qualification/QualificationUnitNavigation.jsx');
for(const view of [ui,preview,sourcePreview]){
 assert.match(view,/<QualificationUnitNavigation units=\{/,'Use the same top Unit navigator in all three portfolio views');
}
assert.match(unitNav,/className="qf-number-tabs"/);
assert.match(unitNav,/aria-pressed=\{selected\}/);
assert.doesNotMatch(sourcePreview,/qsrc-unit-list/,'Do not restore the sidebar in the source view');
const centre=source('src/qualification/QualificationCentreAdmin.jsx');
assert.ok(centre.includes('Preview learner workspace')&&centre.includes('<QualificationCentreLearnerPreview version={version}'));
assert.ok(preview.includes("source?.units||[]"),'Admin preview must be backed by real specification');
assert.ok(preview.includes("No real learner, assessment decision, evidence record, or enrolment is created."));
assert.ok(preview.includes('Gap Analysis · Assessment Criteria'));
assert.ok(!/(?:portfolioRpc|db\.rpc|db\.from|db\.storage|supabase\.rpc)\(/.test(preview),
 'Source-only visual preview must have zero backend mutations');


for(const route of ["['programme','Course']","['evidence','Evidence']","['registration','Registration']",
 "['contact','Contact']","['metrics','Metrics']"]){
 assert.ok(ui.includes(route),'Reference workflow missing '+route);
}
assert.ok(ui.includes("useState('programme')"),'First open must land in the real learner Course');
assert.ok(ui.includes('<PortfolioStatusRibbon portfolio={portfolio} progress={progress}'));
assert.ok(status.includes('portfolio.assessor||')&&status.includes('portfolio.verifier||'),'Reviewer names must be live from enrolment');
assert.ok(status.includes('progress.verified')&&status.includes('progress.started'),'Progress must derive from actual outcomes');
assert.ok(status.includes('Date.now()'),'Expected timeline must be computed, not copied from screenshot');
assert.ok(ui.includes('Jump to Unit or Outcome')&&ui.includes('Gap Analysis · Assessment Criteria'));
assert.ok(ui.includes('visibleEvidence.slice(pageStart, pageStart + pageSize).map')&&ui.includes('onShowcase(selection)'));
assert.ok(ui.includes('outcome.submissions.flatMap(submission=>Object.values(submission.snapshot?.evidence||{}))'),
 'Reviewers must see submitted evidence only, never unsubmitted learner evidence');
assert.ok(ui.includes("portfolioRpc(db,'contact_list'")&&ui.includes("portfolioRpc(db,'contact_add'"));
assert.ok(registration.includes("portfolioRpc(db,'registration_read'")&&registration.includes("portfolioRpc(db,'registration_save'"));
assert.ok(status.includes("portfolioRpc(db,'training_list'")&&status.includes("portfolioRpc(db,'training_add'"));
assert.ok(status.includes('Learner-reported activity'),'Do not imply that logged hours were assessor-approved');
assert.ok(registration.includes("portfolio.role!=='learner'"),'Reviewer must not see private candidate registration');
for(const section of ['Personal','Professional','Certificate','General','Funding']){
 assert.ok(registration.includes("title:'"+section+"'"),'Candidate form missing '+section);
}
for(const table of ['contact_entries','candidate_registration','training_activities']){
 const path=table==='contact_entries'?'202611220009_qualification_contact_diary.sql':
   table==='candidate_registration'?'202611220010_qualification_candidate_registration.sql':
     '202611220011_qualification_training_metrics.sql';
 const sql=source('supabase/migrations/'+path);
 assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'),'RLS must be active: '+table);
 assert.ok(sql.includes('REVOKE ALL ON public.lms_qf_'+table),'Direct grants must be denied: '+table);
 assert.ok(sql.includes("public.lms_qf_actor()"),'Active logged-in learner checks required: '+table);
 assert.ok(sql.includes("USING ERRCODE='42501'"),'Denied access must fail explicitly: '+table);
}
const registrationSQL=source('supabase/migrations/202611220010_qualification_candidate_registration.sql');
assert.ok(registrationSQL.includes('actor IS DISTINCT FROM e.learner_id'));
assert.ok(!registrationSQL.includes("nationalInsuranceNumber"),'Do not store unnecessary NI numbers without retention policy');
const trainingSQL=source('supabase/migrations/202611220011_qualification_training_metrics.sql');
assert.ok(trainingSQL.includes("actor IS DISTINCT FROM e.learner_id"));
assert.ok(trainingSQL.includes('p_date<e.starts_on')&&trainingSQL.includes('p_date>current_date'));
assert.ok(css.includes('.qf-ref-ribbon')&&css.includes('.qf-ref-unit-toolbar')&&css.includes('.qf-ref-candidate'));
const outcomePage=source('src/qualification/QualificationOutcome.jsx');
for(const view of [ui,preview,sourcePreview]){
 assert.match(view,/<QualificationOutcome\s+units=\{/,'Course items must open the same dedicated Outcome page');
}
for(const control of ['Jump to Unit/Outcome','No previous outcomes','No next outcomes','Resources','Deadline',
 'Grading Checklists','Recording Forms','Programme Contact Diary']){
 assert.ok(outcomePage.includes(control),'Outcome page lost '+control);
}
assert.ok(ui.includes('initialWizard={evidenceFromOutcome}')&&ui.includes('Back to outcome'));
assert.ok(ui.includes('Completed (Assessor Only)')&&ui.includes("commit('save_claim'"));
console.log('Qualification reference workflow: programme, evidence, enrolment, contact, metrics and privacy constraints PASS');
