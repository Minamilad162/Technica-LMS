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
const sourceDashboard=source('src/qualification/QualificationSourceDashboard.jsx');
const sourceStyles=source('src/qualification/qualificationSourceDashboard.css');
const catalogue=source('src/qualification/QualificationCatalogue.jsx');
assert.match(sourcePreview,/useState\(embedded\?'course':'overview'\)/,
 'Real source-backed qualifications must open the approved overview, not only the sandbox portfolio');
assert.ok(sourcePreview.includes('QualificationSourceDashboard source={source}'),
 'Every genuine OTHM / ProQual source route needs the redesigned overview');
assert.ok(sourceDashboard.includes('source.units||[]')&&sourceDashboard.includes('source.source_url'),
 'The real qualification design must use imported Units and official source documents');
assert.ok(sourceDashboard.includes('Learning Outcomes')&&sourceDashboard.includes('Assessment Criteria'),
 'Show verified syllabus counts, not fabricated learner progress');
assert.ok(!sourcePreview.includes('Open test upload'),
 'Real qualification evidence access must never redirect to the private test sandbox');
assert.ok(catalogue.includes("String(row.catalogKey||'').startsWith('technica-source-'+item.id+'-')"),
 'Recognize real learner enrolments by pinned source edition as well as title');
assert.ok(sourceStyles.includes('.qsrc-compact-header')&&sourceStyles.includes('.qsrc-compact-unit-title'),
 'Apply the compact styling and avoid oversized, repeated headings');
assert.ok(ui.includes('mappingOpen')&&ui.includes('setMappingOpen(true)'),
 'Keep the real evidence mapper accessible on demand');

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
assert.ok(ui.includes("useState(evidenceEntry ? 'evidence' : 'dashboard')"),'Approved Qualifications overview must be the default, with the direct Evidence link unchanged');
assert.ok(ui.includes("['programme','Course']")&&ui.includes("<QualificationUnitNavigation units={portfolio.units}"),'Original Course navigation and numbered Unit tabs must remain available');
assert.ok(ui.includes("<QualificationTopStats portfolio={portfolio} visiblePortfolio={visiblePortfolio}/>"),'Statistics must use real RLS-scoped portfolio data');
assert.ok(ui.includes("<QualificationVisualDashboard portfolio={visiblePortfolio}"),'Qualification overview must render the approved live layout');
const visual=source('src/qualification/QualificationVisualDashboard.jsx');
assert.ok(visual.includes('claimState(outcome)')&&visual.includes('portfolio.units.map')&&visual.includes('evidenceIds(unit)'),'Units, status and evidence must come from live portfolio records');
assert.ok(visual.includes('ReviewerSnapshot')&&visual.includes('submission?.snapshot?.evidence'),'Review panels must show real submitted evidence');
assert.ok(ui.includes('chooseEvidenceFile(event.dataTransfer.files?.[0])')&&ui.includes('onMap={saveMultiUnitMapping}'),'Drag/drop and actual multi-unit mapping must remain connected');
assert.ok(source('src/qualification/qualificationVisualDashboard.css').includes('@media(max-width:680px)'),'Approved layouts need a responsive mobile state');
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
assert.ok(ui.includes("initialWizard={evidenceFromOutcome ? 'choose' : uploadOnEntry ? 'upload' : ''}")&&ui.includes('Back to outcome'));
assert.ok(ui.includes('Completed (Assessor Only)')&&ui.includes("commit('save_claim'"));
const unitMaterials=source('src/qualification/QualificationLearningResources.jsx');
assert.match(sourcePreview,/<EvidenceUnitMaterials[\s\S]*?unit=\{unit\} source=\{source\}/,
 'Reference Evidence should expose materials for the selected Unit and edition');
assert.match(ui,/<EvidenceUnitMaterials[\s\S]*?unit=\{selectedUnit\} source=\{source\}/,
 'Enrolled Evidence should scope materials to its Unit filter');
assert.match(unitMaterials,/source\?\.units\?\.find\(entry => entry.code === unit.code\)/,
 'Select source materials by official Unit code in the pinned edition');
assert.match(sourcePreview,/<QualificationUnitNavigation[^\n]+>\}\s*\{!embedded&&<QualificationInternalNav/,
 'Reference Unit navigation must stay visible across the selected Unit sections');
assert.match(ui,/unitView && <QualificationUnitNavigation/);
assert.match(ui,/key === 'evidence' && unitView && outcomeUnit\) setEvidenceUnit\(outcomeUnit.id\)/,
 'Evidence opened from a Unit must start with that Unit selected');
for(const view of [ui,sourcePreview]){
 assert.match(view,/<details[^>]+>\s*<summary>Technica working templates<\/summary>/,
  'Technica templates are optional supporting tools in Evidence');
}
assert.match(ui,/Boolean\(evidenceEntry && portfolio.canEdit\)/,
 'The direct upload path still requires server-provided edit permission');
assert.match(ui,/row.role === 'learner' && !row.completedAt && row.catalogKey === privateSandboxKey/);
assert.ok(ui.indexOf('qf-evidence-wizard') < ui.indexOf('<Panel title="Evidence records">'),
 'The upload form must appear above the records register');
assert.match(ui,/openMapper\(lastSaved\)/,'Saved evidence must carry its own identity into the Unit mapper');
assert.match(source('src/qualification/qualificationEvidenceExperience.css'),/prefers-reduced-motion: no-preference/);
console.log('Qualification reference workflow: programme, evidence, enrolment, contact, metrics and privacy constraints PASS');
