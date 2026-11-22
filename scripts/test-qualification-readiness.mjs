import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {qualificationReadiness,needsAssessmentMethodReview,sourceRubricForUnit} from '../src/qualification/qualificationReadiness.js';

const approvedAt='2026-11-22T09:00:00Z';
const unit=(id,approved=false)=>({
 id,code:'U-'+id,outcomes:2,criteria:5,
 brief:approved?{status:'approved',approvedAt}:{status:'draft',approvedAt:null}
});
const version=(units,published=false,enrolments=[])=>({
 id:'q1',units,publishedAt:published?approvedAt:null,enrolments
});
const staff=[{userId:'assessor1',role:'assessor'}, {userId:'verifier1',role:'verifier'}];

let state=qualificationReadiness(version([unit('a'),unit('b')]));
assert.equal(state.units,2);
assert.equal(state.approvedBriefs,0);
assert.equal(state.draftBriefs,2);
assert.equal(state.pendingUnits[0].code,'U-a');
assert.equal(state.canRelease,false);
assert.equal(state.live,false);
assert.match(state.next,/Review the existing Unit briefs/);

state=qualificationReadiness(version([unit('a',true),unit('b',true)]));
assert.equal(state.approvedBriefs,2);
assert.equal(state.canRelease,true);
assert.match(state.next,/genuine centre approval/);
assert.equal(state.live,false);

state=qualificationReadiness(version([unit('a',true)],true));
assert.equal(state.published,true);
assert.equal(state.canRelease,false);
assert.equal(state.canEnrol,false);
assert.match(state.next,/Assessor and an Internal Verifier/);
assert.equal(state.live,false);

state=qualificationReadiness(version([unit('a',true)],true),staff);
assert.equal(state.assessors,1);
assert.equal(state.verifiers,1);
assert.equal(state.canEnrol,true);
assert.match(state.next,/Enrol a real learner/);
assert.equal(state.live,false);

state=qualificationReadiness(version([unit('a',true)],true,[{id:'enrol1'}]),staff);
assert.equal(state.live,true);
assert.equal(state.enrolments,1);
assert.match(state.next,/Live portfolio access is available/);

const incomplete=unit('missing',true);
incomplete.criteria=0;
state=qualificationReadiness(version([incomplete]));
assert.equal(state.canRelease,false);
assert.equal(state.incompleteRubric.length,1);

state=qualificationReadiness(version([{id:'unknown',brief:{status:'approved',approvedAt}}]));
assert.equal(state.incompleteRubric.length,1);
assert.equal(state.canRelease,false);

state=qualificationReadiness(version([unit('a',true)],true,[{id:'enrol1'}]));
assert.equal(state.live,false,'Missing authorised reviewers must not be treated as live');

const unsigned=unit('unsigned');
unsigned.brief={status:'approved',approvedAt:null};
state=qualificationReadiness(version([unsigned]));
assert.equal(state.approvedBriefs,0);
assert.equal(state.canRelease,false);

assert.equal(needsAssessmentMethodReview('Methods must be selected and justified by the centre assessor (e.g., work product review).'),true);
assert.equal(needsAssessmentMethodReview(' '),true);
assert.equal(needsAssessmentMethodReview('Professional discussion and a written assignment will be assessed against all AC; the assessor will validate documentary evidence.'),false);
const rubricExample={catalog_key:'technica-source-othm6-2026',units:[{code:'H/652/4328',
 outcomes:[{code:'1',title:'Safety management',criteria:[{code:'1.1',title:'Evaluate requirements'},{code:'1.2',title:'Assess legal duties'}]}]}]};
const rubricVersion={catalogKey:'technica-source-othm6-2026'};
const rubricUnit={code:'H/652/4328',outcomes:1,criteria:2};
assert.equal(sourceRubricForUnit([rubricExample],rubricVersion,rubricUnit).complete,true);
assert.equal(sourceRubricForUnit([rubricExample],{catalogKey:'technica-source-othm6-2023'},rubricUnit).complete,false,'Never use a legacy edition rubric');
assert.equal(sourceRubricForUnit([rubricExample],rubricVersion,{...rubricUnit,criteria:3}).complete,false,'Do not approve partial imported rubric');

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const methodGuard=read('supabase/migrations/202611220008_qualification_methods_approval_guard.sql');
assert.ok(methodGuard.includes('IF p_approve AND'), 'Approved methods require server-side review');
assert.ok((methodGuard.match(/methods must be selected and justified by the centre assessor/g)||[]).length===2,
 'Both Unit approval and qualification publishing must reject the imported placeholder');
assert.ok(methodGuard.includes('lms_qf_admin_access()'), 'Original centre-admin authorization must be preserved');
const admin=read('src/qualification/QualificationCentreAdmin.jsx');
const preview=read('src/qualification/QualificationSourcePreview.jsx');
const live=read('src/qualification/LiveQualificationPortfolio.jsx');
assert.ok(admin.includes('qualificationReadiness(version,staff)'),'Readiness must come from the live admin workspace and reviewer roster');
assert.ok(admin.includes('Assessment access readiness'));
assert.ok(admin.includes('Review next Unit'));
assert.ok(admin.includes('sourceRubricForUnit(references,version,unit)'));
assert.ok(admin.includes('reviewChecks.rubric&&reviewChecks.methods&&reviewChecks.authority'));
assert.ok(admin.includes('methodsNeedReview'));
assert.ok(admin.includes("I am authorised by Technica Consult"));
assert.ok(live.includes('<QualificationCentreAdmin db={db} references={references}'));

assert.ok(admin.includes('qc-centre-unit-review'));
assert.ok(preview.includes('Evidence submissions, assessor decisions and certificate recording require a centre-published version'));
assert.ok(live.includes("portfolioRpc(db,'admin_workspace')")===false,'Learner route must not query the privileged admin workspace');
assert.ok(live.includes("portfolioRpc(db,'list')") && live.includes('enrolments.length === 1')===false);
console.log('Qualification readiness: read-only, source-backed, role-isolated and no fabricated release: PASS');
