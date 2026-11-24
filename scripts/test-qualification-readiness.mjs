import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {qualificationReadiness,needsAssessmentMethodReview,sourceRubricForUnit,publicationChecks,editionStatus,validPublicationReference,bulkBriefReview,defaultPublicationReference,DEFAULT_LEARNER_DECLARATION} from '../src/qualification/qualificationReadiness.js';

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


const adminCenter=read('src/qualification/QualificationAdminCenter.jsx');
const adminStyles=read('src/qualification/qualificationAdminCenter.css');
assert.ok(admin.includes('<AdminQualificationNavigation section={section}')&&admin.includes('<AdminQualificationCatalog versions={versions}'),'Q01 admin layout uses real workspace records');
assert.ok(admin.includes('<AdminQualificationDetail version={version}')&&admin.includes("onEnrol={()=>setSection('enrolments')}"),'Selected edition connects to existing enrolment workflow');
assert.ok(adminCenter.includes('version.publishedAt?')&&adminCenter.includes('Ready for enrolment · No learners yet'),'Zero learners never prevent a released edition from being active');
assert.ok(adminCenter.includes('r.published?')&&adminCenter.includes("No learners enrolled yet."),'Readiness is based on publication, not student count');
assert.ok(adminCenter.includes('refs.find(r=>r.catalog_key===v?.catalogKey)'),'Reference number is edition-specific, never guessed');
assert.ok(adminCenter.includes('v.version')&&adminCenter.includes('learnersOf(v).length')&&adminCenter.includes('approvedCount(v)'),'All visible edition metrics use actual data');
for(const action of ['admin_assign','admin_publish','admin_authorize_staff','admin_reassign','admin_reserve_document','admin_approve_document','admin_certificate_authorize'])
 assert.ok(admin.includes("'"+action+"'"),'Existing governed action must remain available: '+action);
assert.ok(admin.includes("section==='enrolments'&&<AssignmentWorkspace")&&admin.includes("hidden={section!=='staff'}"),'Admin controls are separated into navigation views');
assert.ok(adminStyles.includes('@media(max-width:620px)')&&adminStyles.includes('prefers-reduced-motion'),'Responsive admin layout respects reduced motion');

const sourceVersion={catalogKey:rubricVersion.catalogKey,units:[{...rubricUnit,brief:{status:'approved',approvedAt,methods:'Written assignment and verified workplace evidence'}}],enrolments:[]};
assert.equal(editionStatus(sourceVersion),'Draft');
assert.equal(editionStatus({...sourceVersion,publishedAt:approvedAt}),'Live','Published status is independent of learner/reviewer counts');
assert.ok(publicationChecks(sourceVersion,[rubricExample]).every(c=>c.ok));
assert.equal(publicationChecks(sourceVersion,[])[0].ok,false,'Missing exact source rubric blocks publication');
assert.equal(publicationChecks({...sourceVersion,units:[]},[rubricExample]).every(c=>c.ok),false);
const badMethod={...sourceVersion,units:[{...sourceVersion.units[0],brief:{...sourceVersion.units[0].brief,methods:'Methods must be selected and justified by the centre assessor'}}]};
assert.equal(publicationChecks(badMethod,[rubricExample]).find(c=>c.id==='methods').ok,false);
assert.equal(validPublicationReference('draft record ABC-001'),false);
assert.equal(validPublicationReference('CENTRE/2026/001'),true);
const publish=read('src/qualification/QualificationPublish.jsx');
assert.ok(admin.includes('<QualificationPublishBar version={version}')&&admin.includes('<QualificationPublishDialog version={version}'));
assert.ok(admin.includes('onSave={()=>onBrief(false)}')&&admin.includes('briefDirty&&instructions.trim().length>=80'),'Draft saves actual edited Unit without revoking unchanged approval');
assert.ok(admin.includes('if(saving||release||briefDirty||!publicationChecks')&&admin.includes("portfolioRpc(db,'admin_publish'"),'Existing governed RPC only after validated confirmation');
assert.ok(publish.includes('!dirty&&!version.publishedAt')&&publish.includes('Enrolments and learner-specific reviewer assignments are not required for publication.'));
assert.ok(publish.includes('node.showModal()')&&publish.includes('onCancel='));
assert.ok(!adminCenter.includes('In Setup'),'Use Draft and Live consistently on admin cards');
console.log('Q02 draft/live publication readiness, zero enrolments, exact edition and modal wiring: PASS');

const draftForBulk={...sourceVersion,units:[{...rubricUnit,id:'u1',brief:{status:'draft',instructions:'Real centre-reviewed instructions. '.repeat(4),methods:'Written assignment and verified workplace evidence'}}]};
let bulk=bulkBriefReview(draftForBulk,[rubricExample]);
assert.equal(bulk.ready,true);
assert.equal(bulk.pending,1);
assert.equal(bulk.expected.u1.methods,draftForBulk.units[0].brief.methods);
assert.equal(bulkBriefReview({...draftForBulk,publishedAt:approvedAt},[rubricExample]).ready,false);
assert.equal(bulkBriefReview(draftForBulk,[]).ready,false);
assert.equal(bulkBriefReview({...draftForBulk,units:[{...draftForBulk.units[0],brief:{...draftForBulk.units[0].brief,methods:'Methods must be selected and justified by the centre assessor'}}]},[rubricExample]).ready,false);
assert.ok(admin.includes('Approve All Unit Briefs')&&admin.includes('Approve Unit brief'));
assert.ok(admin.includes("portfolioRpc(db,'admin_approve_all_briefs'")&&admin.includes('p_expected:bulkReview.expected'));
console.log('Bulk Unit approval eligibility and single/bulk workflow: PASS');

assert.equal(defaultPublicationReference(null),'');
assert.equal(defaultPublicationReference({id:'123'}),'TECHNICA-INTERNAL-PUBLICATION-123');
assert.notEqual(defaultPublicationReference({id:'123'}),defaultPublicationReference({id:'456'}));
assert.ok(validPublicationReference(defaultPublicationReference({id:'123'})));
assert.ok(DEFAULT_LEARNER_DECLARATION.length>=70&&DEFAULT_LEARNER_DECLARATION.length<=5000);
assert.ok(admin.includes('setApprovalRef(defaultPublicationReference(version))')&&admin.includes('setDeclaration(DEFAULT_LEARNER_DECLARATION)'));
assert.ok(admin.includes('setAttest(false)')&&publish.includes('not an awarding-body approval number'));
console.log('Q02 proposed sign-off defaults preserve explicit approval: PASS');

const assignment=read('src/qualification/QualificationEnrolments.jsx');
const dirSql=read('supabase/migrations/202611240002_qualification_enrolment_directory.sql');
const adminUsers=read('src/production/AdminToolsPanels.jsx');
const adminWorkspace=read('src/production/AdminToolsWorkspace.jsx');
assert.ok(assignment.includes("portfolioRpc(db,'admin_directory'")&&assignment.includes('p_selected:value||null'),'Independent server search retains selected reviewer');
assert.ok(assignment.includes('setEditAssessor(e.assessorId')&&assignment.includes('setEditVerifier(e.verifierId'),'Edit current reviewers, not blank fields');
assert.ok(assignment.includes('onAuthorise(value,role,reference.trim())')&&assignment.includes('!attest||!validRef(reference)'),'Documented authorisation is explicit');
assert.ok(assignment.includes('versions.filter(v=>v.publishedAt)')&&assignment.includes('e.learnerId===learner'),'Exact live edition, duplicate checks');
assert.ok(adminUsers.includes('onAssignQualification(selected.id)')&&adminWorkspace.includes('initialLearnerId={qualificationLearner}'),'Users directory opens same assignment workspace');
assert.ok(dirSql.includes('public.lms_qf_admin_access()')&&dirSql.includes("r.role='admin'")&&dirSql.includes("s.revoked_at IS NULL"));
assert.ok(dirSql.includes('Independent verification required')&&dirSql.includes('This learner is already enrolled'));
console.log('Q03/Q04 assignment and reviewer directory integration: PASS');
