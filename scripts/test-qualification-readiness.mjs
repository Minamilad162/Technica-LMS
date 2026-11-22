import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {qualificationReadiness} from '../src/qualification/qualificationReadiness.js';

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

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin=read('src/qualification/QualificationCentreAdmin.jsx');
const preview=read('src/qualification/QualificationSourcePreview.jsx');
const live=read('src/qualification/LiveQualificationPortfolio.jsx');
assert.ok(admin.includes('qualificationReadiness(version,staff)'),'Readiness must come from the live admin workspace and reviewer roster');
assert.ok(admin.includes('Assessment access readiness'));
assert.ok(admin.includes('Review next Unit'));
assert.ok(admin.includes('qc-centre-unit-review'));
assert.ok(preview.includes('Evidence submissions, assessor decisions and certificate recording require a centre-published version'));
assert.ok(live.includes("portfolioRpc(db,'admin_workspace')")===false,'Learner route must not query the privileged admin workspace');
assert.ok(live.includes("portfolioRpc(db,'list')") && live.includes('enrolments.length === 1')===false);
console.log('Qualification readiness: read-only, source-backed, role-isolated and no fabricated release: PASS');
