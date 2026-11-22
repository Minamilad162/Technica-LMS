import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=source('src/qualification/LiveQualificationPortfolio.jsx');
const status=source('src/qualification/QualificationPortfolioReferenceUI.jsx');
const registration=source('src/qualification/QualificationCandidateRegistration.jsx');
const css=source('src/qualification/qualificationPremium.css');

for(const route of ["['programme','Course']","['evidence','Evidence']","['registration','Registration']",
 "['contact','Contact']","['metrics','Metrics']"]){
 assert.ok(ui.includes(route),'Reference workflow missing '+route);
}
assert.ok(ui.includes("useState('programme')"),'First open must land in the real learner Course');
assert.ok(ui.includes('<PortfolioStatusRibbon portfolio={portfolio} progress={progress}'));
assert.ok(status.includes('portfolio.assessor||')&&status.includes('portfolio.verifier||'),'Reviewer names must be live from enrolment');
assert.ok(status.includes('progress.verified')&&status.includes('progress.started'),'Progress must derive from actual outcomes');
assert.ok(status.includes('Date.now()'),'Expected timeline must be computed, not copied from screenshot');
assert.ok(ui.includes('Jump to qualification Unit')&&ui.includes('Gap Analysis · Assessment Criteria'));
assert.ok(ui.includes('visibleEvidence.map')&&ui.includes('onShowcase(selection)'));
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
console.log('Qualification reference workflow: programme, evidence, enrolment, contact, metrics and privacy constraints PASS');
