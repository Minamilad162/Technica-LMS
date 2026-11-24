import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {QUALIFICATIONS} from '../src/qualification/qualificationData.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/qualification/QualificationsWorkspace.jsx');
const css=read('src/qualification/qualifications.css');
const extra=read('src/qualification/qualificationExtras.css');
const material=read('src/qualification/qualificationUnitMaterial.css');
assert.equal(QUALIFICATIONS.length,3,'Keep all three qualifications visible');
const expected={
 othm6:'/images/hazop-engineers-sm.webp',
 othm7:'/images/course-banner-sm.webp',
 nvq6:'/images/practice-plant-sm.webp'
};
const images=new Set;
for(const q of QUALIFICATIONS){
 assert.equal(q.heroImage,expected[q.id],q.id+' hero mapping incorrect');
 assert.ok(existsSync(new URL('../public'+q.heroImage,import.meta.url)),'Hero asset missing: '+q.heroImage);
 images.add(q.heroImage);
 assert.ok(q.units.length>0&&q.name&&q.level,'Qualification content was lost');
}
assert.equal(images.size,3,'Each qualification needs a distinct hero photo');
for(const t of ['qf-course-hero','qf-course-hero-shade','qf-course-hero-head','qf-course-hero-level','qf-course-hero-brand','qf-course-foot']){
 assert.ok(ui.includes(t),'Missing card UI element: '+t);
 assert.ok(css.includes('.'+t),'Missing card CSS selector: '+t);
}
assert.match(ui,/item\.heroImage/);
assert.match(ui,/<img src=\{image\} alt="" loading="lazy" decoding="async" aria-hidden="true"\/>/);
assert.match(ui,/onClick=\{onClick\}/);
assert.match(ui,/aria-label=\{'Open '\+item\.name\}/);
assert.match(css,/\.qf-course-hero\{height:166px/);
assert.match(css,/\.qf-course-body h2\{font-size:19px/);
assert.match(css,/\.qf-course-units\{[^}]*font-size:13px/s);
assert.match(css,/\.qf-workspace \.qf-pane-tabs button\{font-size:14px/);
assert.match(css,/\.qf-workspace \.qf-number-tab\{font-size:14px/);
assert.match(extra,/\.qf-workspace \.qfx-simple-details span/);
assert.match(extra,/\.qf-workspace \.qfx-card-title h3\{font-size:17px/);
assert.match(material,/\.qf-workspace \.qmat-outcomes li\{font-size:13px/);
assert.match(material,/\.qf-workspace \.qmat-topics li\{font-size:13px/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(ui,/function UnitTabs/);
assert.match(ui,/Map evidence to assessment criteria/);
assert.match(ui,/Record preview decision/);
assert.ok(!/\b(?:db|supabase|client)\.(?:from|rpc|insert|update|delete|storage)\s*[\.(]/.test(ui),'No Supabase mutations allowed in UI preview');

const live=read('src/qualification/LiveQualificationPortfolio.jsx');
const catalogue=read('src/qualification/QualificationCatalogue.jsx');
const premium=read('src/qualification/qualificationPremium.css');
assert.match(live,/ProgrammeListPremium/, 'The real DB-backed route must use the premium catalogue');
assert.match(live,/<QualificationSourcePreview/, 'Source-backed qualification syllabus must be connected');
assert.match(catalogue,/QUALIFICATIONS\.map\(item =>/, 'All three pathways must render, not only enrolled records');
assert.match(catalogue,/assigned\.filter\(row =>\s*qualificationFor\(row\.title\)\?\.id === item\.id \|\|/, 'Enrolment matching must remain role-scoped');
assert.match(catalogue,/startsWith\('technica-source-'\+item\.id\+'-'\)/, 'Enrolled qualifications must match by genuine specification ID');
assert.match(catalogue,/onOpen\(enrolments\[0\]\.id\)/, 'Enrolled programmes must open live portfolios');
assert.match(catalogue,/onPreview\(item\.id\)/, 'Other programmes must only open read-only syllabus');
for(const title of ['Verified source syllabus','Assigned to you','Open portfolio','Explore actual Units']){
 assert.ok(catalogue.includes(title), 'Missing catalogue label: '+title);
}
for(const className of ['qf-live-lead','qf-live-feature','qf-live-kpi','qf-live-preview-notice']){
 assert.ok(premium.includes('.'+className), 'Premium live section missing: '+className);
}
for(const rpc of ["commit('save_claim'","commit('review'","commit('finalize'"]){
 assert.ok(live.includes(rpc), 'Do not drop live backend workflow: '+rpc);
}


const imported=JSON.parse(read('src/qualification/qualificationImportedReferenceCatalog.json'));
const sourcePreview=read('src/qualification/QualificationSourcePreview.jsx');
const migration=read('supabase/migrations/202611220002_qualification_reference_catalog.sql');
assert.equal(imported.specifications.length,4,'New + historical source editions must be available');
const keyed=new Map(imported.specifications.map(v=>[v.catalog_key,v]));
assert.equal(keyed.get('technica-source-othm6-2026').reference_number,'610/8264/8');
assert.equal(keyed.get('technica-source-othm6-2026').units.length,7);
assert.equal(keyed.get('technica-source-othm6-2026').units.reduce((n,u)=>n+u.outcomes.length,0),25,'Every new 2026 outcome must be source-backed');
assert.equal(keyed.get('technica-source-othm6-2026').units.reduce((n,u)=>n+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0),120,'2026 criteria must match new official specification');
assert.equal(imported.specifications.reduce((n,s)=>n+s.units.reduce((m,u)=>m+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0),0),510,'Historical and current criteria are version-isolated');
const legacy=imported.specifications.filter(v=>v.catalog_key!=='technica-source-othm6-2026');
assert.equal(legacy.reduce((n,s)=>n+s.units.length,0),23);
assert.equal(legacy.reduce((n,s)=>n+s.units.reduce((m,u)=>m+u.outcomes.length,0),0),93);
assert.equal(legacy.reduce((n,s)=>n+s.units.reduce((m,u)=>m+u.outcomes.reduce((a,o)=>a+o.criteria.length,0),0),0),390);
for(const spec of imported.specifications){
 assert.match(spec.source_pdf,/^https:\/\//);
 for(const unit of spec.units){
  assert.ok(unit.code&&unit.title&&unit.position>0);
  for(const o of unit.outcomes){
   assert.ok(o.title&&o.criteria.length>0);
   for(const c of o.criteria)assert.ok(c.code&&c.title.length>10&&!/Learning Outcome\s*-\s*The learner/.test(c.title));
  }
 }
}
assert.match(live,/portfolioRpc\(db,'reference_catalog'\)/,'Live learner must read source content from actual Supabase');
assert.match(catalogue,/references\.find\(source => source\.catalog_key/,'Source version selection missing');
assert.match(sourcePreview,/source\.units\.map/,'Source Unit navigation missing');
assert.match(sourcePreview,/unit\.indicativeTopics\?\.length/,'Study topics must come from source-backed API');
assert.match(sourcePreview,/unit\.aim/,'Source Unit aim must be displayed');
assert.match(read('supabase/migrations/202611220003_qualification_source_material_fields.sql'),/ADD COLUMN IF NOT EXISTS source_aim/);
assert.match(read('supabase/migrations/202611220003_qualification_source_material_fields.sql'),/'indicativeTopics',u\.source_topics/);
assert.ok(keyed.get('technica-source-othm6-2026').units.every(u=>u.aim?.length>100),
 'All 2026 official Unit aims must be imported from the November 2026 specification');

assert.match(sourcePreview,/<ReadOnlyOutcomeDetails unit=\{unit\} outcome=\{outcome\}/,'Source preview must open the selected Outcome criteria');
assert.match(read('src/qualification/QualificationOutcome.jsx'),/<OutcomeCriteria criteria=\{outcome\.criteria\}/,
 'Read-only Outcome must render the imported assessment criteria');
assert.match(sourcePreview,/sources.find\(s=>s.catalog_key===sourceKey\)/,'Do not conflate 2023 and 2026 requirements');
assert.match(migration,/auth\.uid\(\) IS NULL/);
assert.match(migration,/REVOKE ALL ON FUNCTION public\.lms_qf_reference_catalog\(\) FROM PUBLIC, anon/);
assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.lms_qf_reference_catalog\(\) TO authenticated/);
assert.ok(!/portfolioRpc\(db,'(?:save_claim|review|finalize)'/.test(sourcePreview),'Reference browser must never create real assessment data');


const centre=read('src/qualification/QualificationCentreAdmin.jsx');
const centreCss=read('src/qualification/qualificationCentreAdmin.css');
const centreBrief=read('src/qualification/QualificationCentreBrief.jsx');
const forms=read('src/qualification/QualificationEvidenceTemplates.jsx');
const migrationCentre=read('supabase/migrations/202611220004_qualification_centre_governance.sql');
assert.match(live,/<QualificationCentreAdmin/, 'Admin-only qualification centre workflow is missing');
assert.match(live,/portfolioRpc\(db,'admin_access'\)/, 'Admin rights must be server-side scoped');
assert.match(live,/portfolioRpc\(db,'programme_briefs'/, 'Live approved Unit briefing is missing');
assert.match(live,/<QualificationCentreBrief/, 'Signed private resources not integrated');
assert.match(live,/<QualificationEvidenceTemplates/, 'Unit-specific working forms missing');
assert.match(live,/selectedReference/, 'Live Study Library must match the exact pinned qualification edition');
assert.match(centre,/admin_save_brief/);
assert.match(centre,/admin_publish/);
assert.match(centre,/admin_assign/);
assert.match(centre,/admin_reserve_document/);
assert.match(centre,/admin_approve_document/);
assert.match(centre,/storage.from\('technica-qualification-materials'\)/);
assert.match(centreBrief,/createSignedUrl\(item.path,60\)/);
assert.match(forms,/Witness Testimony/);
assert.match(forms,/Reflective Account/);
assert.match(forms,/CPD & Development Log/);
assert.match(forms,/Evidence Mapping Matrix/);
assert.match(forms,/Assessment Planning Sheet/);
assert.match(forms,/unit\?\.outcomes/);
assert.match(centreCss,/\.qc-columns/);
assert.match(centreCss,/@media\(max-width:880px\)/);
assert.match(migrationCentre,/lms_qf_admin_access/);
assert.match(migrationCentre,/public\.lms_p1_actor_is_admin\(\)/);
assert.match(migrationCentre,/published_at=now\(\),allow_certificate_recording=false/);
assert.match(migrationCentre,/p_assessor=p_verifier/);
assert.match(migrationCentre,/EXISTS \(SELECT 1 FROM public\.lms_qualification_claims/);
assert.match(migrationCentre,/CREATE POLICY lms_qf_centre_files_read_guard/);
assert.match(migrationCentre,/CREATE POLICY lms_qf_centre_files_anon_guard/);
for(const table of ['lms_qf_centre_briefs','lms_qf_centre_documents','lms_qf_admin_activity']){
 assert.ok(migrationCentre.includes('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY'),
   'Protected centre data without RLS: '+table);
}


const issuerSql=read('supabase/migrations/202611220005_qualification_issuer_authorisation.sql');
const reviewerSql=read('supabase/migrations/202611220006_qualification_reviewer_competence.sql');
assert.match(centre,/admin_certificate_authorize/,'Must require real external issuer authorization');
assert.match(centre,/admin_authorize_staff/,'Staff competence admin action missing');
assert.match(centre,/admin_staff/,'Reviewers must be filtered to centre-authorized staff');
const assignmentUi=read('src/qualification/QualificationEnrolments.jsx');
assert.ok(assignmentUi.includes("authorized(staff,assessor,'assessor')")&&assignmentUi.includes("authorized(staff,verifier,'verifier')"),'Selection may discover registered admins but actual assignment must require role-specific authorisation');
assert.match(live,/portfolioRpc\(db,'certificate_access'/,'Certificate eligibility not linked to actual issuer authority');
assert.match(issuerSql,/lms_qf_certificate_issuer_authorisations/,'Issuer authorization must be persisted');
assert.match(issuerSql,/e\.completed_at IS NULL/,'Unfinished outcomes may not create certificates');
assert.match(issuerSql,/c\.state IS DISTINCT FROM 'verified'/,'Verification completion criteria missing');
assert.match(reviewerSql,/lms_qf_staff_authorisations/,'Independent assessor/verifier competence authorizations required');
assert.match(reviewerSql,/a\.role='assessor'/);
assert.match(reviewerSql,/a\.role='verifier'/);
assert.match(reviewerSql,/REVOKE ALL ON public\.lms_qf_staff_authorisations/);
assert.match(reviewerSql,/ENABLE ROW LEVEL SECURITY/);


const revocationSql=read('supabase/migrations/202611220007_qualification_reviewer_revocation_audit.sql');
assert.match(centre,/admin_revoke_staff/,'Centre must revoke an assessor/verifier when necessary');
assert.match(centre,/admin_reassign/,'Active portfolio must support auditable authorised replacement');
assert.match(revocationSql,/CREATE TABLE public\.lms_qf_staff_events/,'Professional staff authorizations need immutable audit trail');
assert.match(revocationSql,/CREATE TABLE public\.lms_qf_reassignment_events/,'Reviewer reassignments need immutable audit trail');
assert.match(revocationSql,/Active centre professional authorization is required to review this portfolio/);
assert.match(revocationSql,/a\.role='verifier' AND a\.revoked_at IS NULL/);
assert.match(revocationSql,/p_assessor=p_verifier/);
assert.match(revocationSql,/SET assessor_id=p_assessor,verifier_id=p_verifier/);
assert.ok(!/\bdemoEnrolments\s*=/.test(centre),'No manufactured enrolments may appear in real centre administration');


const internalNav=read('src/qualification/QualificationInternalNav.jsx');
const internalNavCss=read('src/qualification/qualificationInternalNav.css');
const previewCss=read('src/qualification/qualificationSourcePreview.css');
for(const name of ['Course','Evidence','Registration','Contact','Metrics','Overview','Study Library']){
 assert.ok(internalNav.includes("'"+name+"'"),'Shared Qualifications bar missing '+name);
}
assert.match(sourcePreview,/<QualificationInternalNav active=\{section\}/,
 'Reference previews must include internal Qualifications nav without a learner enrolment');
assert.match(live,/<QualificationInternalNav items=\{views\}/,
 'Enrolled portfolios must use the same internal nav component');
assert.match(live,/<QualificationStudyLibrary portfolio=\{visiblePortfolio\} source=\{selectedReference\}/,
 'Enrolled and test portfolios must use the unified Study Library without duplicated navigation');
assert.match(sourcePreview,/<QualificationStudyLibrary source=\{source\}/,
 'Official syllabus must use the same Study Library component with source-backed data');
assert.match(sourcePreview,/\(embedded\|\|section==='course'\)/,
 'Source course view must be available independently of enrolment');
assert.match(sourcePreview,/section === 'evidence'/,'Read-only evidence preparation tab missing');
assert.match(sourcePreview,/section==='registration'/,'Read-only registration tab missing');
assert.match(sourcePreview,/section==='contact'/,'Reference-safe Contact Diary tab missing');
assert.match(sourcePreview,/section==='metrics'/,'Source-backed Metrics tab missing');
assert.match(sourcePreview,/section==='overview'/,'Source-backed Overview tab missing');
assert.match(sourcePreview,/section==='library'/,'Study Library tab missing');
assert.match(sourcePreview,/source\.status!=='centre_published'/,
 'Reference-only status must be determined from the real database');
assert.match(internalNavCss,/position:sticky/,'Internal nav should stay visible while scrolling');
assert.match(internalNavCss,/overflow-x:auto/,'Internal nav must fit on mobile');
assert.match(previewCss,/\.qsrc-section-layout/,'Reference panel layout missing');
assert.ok(!/portfolioRpc|from\('lms_qualification_evidence'\)/.test(sourcePreview),
 'Read-only reference panels must not access private learner records');


const multiUnit=read('src/qualification/QualificationMultiUnitEvidence.jsx');
const multiUnitCss=read('src/qualification/qualificationMultiUnitEvidence.css');
const mapMigration=read('supabase/migrations/202611220008_qualification_multiunit_evidence_mapping.sql');
assert.match(live,/<QualificationMultiUnitEvidence portfolio=\{portfolio\}/,
 'Enrolled learner Evidence Folder must render centralized cross-Unit mapping');
assert.match(live,/onMap=\{saveMultiUnitMapping\}/,
 'Multi-Unit mapping handler must be wired to backend RPC');
assert.match(live,/portfolioRpc\(db,'map_evidence_across_units'/,
 'Mapping must be persisted and authorized on the server');
assert.match(live,/setDrafts\(\{\}\)/,
 'Multi-Unit claim versions must invalidate stale local drafts');
assert.match(multiUnit,/portfolio\.units\.map/,
 'Criteria and Units must come from the actual enrolled qualification');
assert.match(multiUnit,/outcome\.claim\?\.mapping/,
 'Selected evidence must be loaded from existing claims');
assert.match(multiUnit,/editableState\(o\.claim\?\.state\)/,
 'Submitted and verified work must remain locked');
assert.match(multiUnit,/const open=event\.currentTarget\.open;\s*setExpanded\(/,
 'Capture the disclosure state before scheduling the React updater');
assert.match(multiUnit,/Save mapping across Units/,
 'Bulk mapping save action missing');
assert.match(multiUnitCss,/\.qmu-unit-grid/);
assert.match(sourcePreview,/portfolio.catalogKey === source.catalog_key/,
 'Upload shortcuts must match the selected reference edition');
assert.doesNotMatch(sourcePreview,/Open test upload/,
 'Real qualification reference pages must not direct learners to the separate private sandbox');
assert.match(sourcePreview,/onOpenEvidence\(portfolio\.id, unit\.code\)/,
 'Real evidence upload must open the authenticated learner enrolment and selected Unit');
for(const value of [
 'p_enrolment uuid, p_evidence uuid, p_criteria uuid[]',
 'learner_id=public.lms_qf_actor() FOR UPDATE',
 'enrolment_id=e.id',
 'public.lms_qf_evidence_ready(f)',
 "q.state NOT IN ('draft','changes_requested')",
 'u.version_id=e.version_id',
 'claim'
]){
 assert.ok(mapMigration.includes(value),'Multi-Unit RPC missing boundary: '+value);
}
assert.match(mapMigration,/p_criteria IS NULL OR cardinality\(p_criteria\)>1500/);
assert.match(mapMigration,/GRANT EXECUTE ON FUNCTION public\.lms_qf_map_evidence_across_units/,
 'The RPC should be callable by authenticated learners, with server-side scope checks');
assert.ok(!/INSERT INTO public\.lms_qualification_submissions/.test(mapMigration),
 'Saving a mapping must never submit for assessor assessment');

console.log('P35 premium Qualification heroes, 3 verified local images, clear responsive typography and workflow preservation PASS');

