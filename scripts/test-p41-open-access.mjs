import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchLearningAccessMode} from '../src/production/accessModeApi.js';
import {isFullCourseEnrolled} from '../src/production/learnerJourneyApi.js';
import {mayReadLiveCourse} from '../src/production/liveLearningApi.js';
import {aspMissingReason} from '../src/production/questionBankCourseSelection.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const C='00000000-0000-0000-0000-000000000010';
const catalog={identity:{isAdmin:false},openAccess:true,subscription:null,entitlements:[]};
assert.deepEqual(await fetchLearningAccessMode({rpc:async()=>({data:'open',error:null})}),
 {mode:'open',openAccess:true,installed:true});
assert.deepEqual(await fetchLearningAccessMode({rpc:async()=>({data:'subscription',error:null})}),
 {mode:'subscription',openAccess:false,installed:true});
assert.equal((await fetchLearningAccessMode({rpc:async()=>({
 data:null,error:{code:'PGRST202',message:'function does not exist'}})})).openAccess,false);
await assert.rejects(()=>fetchLearningAccessMode({rpc:async()=>({
 data:null,error:{code:'42501',message:'permission denied'}})}),/could not be verified/);
await assert.rejects(()=>fetchLearningAccessMode({rpc:async()=>({data:'other',error:null})}),/Unexpected/);
assert.equal(isFullCourseEnrolled([],C,null,true),true);
assert.equal(isFullCourseEnrolled([],C,null,false),false);
assert.equal(isFullCourseEnrolled([],null,null,true),false);
assert(mayReadLiveCourse(catalog,{id:C,publication_state:'published'}));
assert(!mayReadLiveCourse(catalog,{id:C,publication_state:'draft'}));
assert(!mayReadLiveCourse({...catalog,openAccess:false},{id:C,publication_state:'published'}));
assert.match(aspMissingReason([{id:C,slug:'asp-course',title:'ASP Course'}]),/identifier/);
assert.match(aspMissingReason([]),/published ASP Course/);

const sql=read('supabase/migrations/202611080007_p41_open_access_showcase.sql');
for(const term of [
 'CREATE TABLE public.lms_p41_access_policy','open_access boolean NOT NULL DEFAULT true',
 'CREATE FUNCTION public.lms_p41_open_access()',
 'CREATE FUNCTION public.lms_p41_access_mode()',
 'CREATE FUNCTION public.lms_p41_set_open_access(p_enabled boolean)',
 "p.account_status='active'",
 "IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()",
 'public.lms_p41_open_access() OR public.lms_p21_has_active_subscription()',
 "c.publication_state='published' AND l.publication_state='published'",
 "WHERE c.id=p_course AND c.publication_state='published'",
 "p_enabled IS NULL",
 "p41_access_mode_changed",
 'REVOKE ALL ON public.lms_p41_access_policy FROM PUBLIC,anon,authenticated',
 'GRANT EXECUTE ON FUNCTION public.lms_p41_set_open_access(boolean) TO authenticated'
])assert(sql.includes(term),'Missing server P41 security: '+term);
assert(!sql.includes('INSERT INTO public.lms_entitlements'));
assert(!sql.includes('UPDATE public.lms_entitlements'));
assert(!sql.includes('UPDATE public.lms_courses SET publication_state'));
assert(!sql.includes('UPDATE public.lms_questions'));
const hub=read('src/production/LiveExamPracticeHub.jsx');
const mock=read('src/production/LiveMockPortal.jsx');
const practice=read('src/production/LivePracticePortal.jsx');
const workspace=read('src/production/LiveLearnerWorkspace.jsx');
const plans=read('src/production/SubscriptionPlans.jsx');
const app=read('src/App.jsx');
const qualifications=read('src/qualification/QualificationsWorkspace.jsx');
const layout=read('src/components/Layout.jsx');
assert(hub.includes('catalog.openAccess===true'));
assert(mock.includes('catalog.openAccess===true'));
assert(practice.includes('catalog.openAccess===true'));
assert(workspace.includes('catalog?.openAccess'));
assert(workspace.includes('openAccess={catalog?.openAccess===true}'));
assert(plans.includes('disabled={openAccess||'));
assert(read('src/production/AdminSubscriptionsPanel.jsx').includes('setLearningOpenAccess(db,next)'));
assert(read('src/production/AdminSubscriptionsPanel.jsx').includes('Enable subscription rules'));
assert(plans.includes("'Coming soon'"));
assert(!layout.includes('Reset demo data'));
assert(!app.includes("new URLSearchParams(l.search).get('legacyPreview')==='1'"));
assert(app.includes('legacyBrowserQa?<HomePage/>:<LiveLearnerPortal initialScreen="learning"/>'),
 'Production Home must use live Supabase learner data, not fabricated demo cards');
assert(app.includes('<Navigate to="/assessments?tab=history" replace/>'),
 'Legacy results links must show server-owned P11 history');
assert(app.includes('<Navigate to="/admin-tools?tab=questions" replace/>'),
 'Legacy Bank must redirect into protected real Admin tools');
assert(!qualifications.includes('Demo preview'),'Do not present qualification simulation as genuine submission');
assert(read('src/production/LiveMockExam.jsx').includes('200 fixed questions · 300 minutes'));
console.log('PASS P41 open-access policy: authenticated server setting, published only, old lock restored, immutable Mock/Practice, no fake billing/ASP mapping.');
