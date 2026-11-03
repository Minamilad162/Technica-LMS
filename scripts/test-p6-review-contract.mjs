import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611030002_p6a_asp_review_workbench.sql');
const api=read('src/production/questionReviewApi.js');
const ui=read('src/production/AdminQuestionReview.jsx');
const shell=read('src/production/SupabaseApp.jsx');
const migrationCount=(sql.match(/'asp11-0[1-9]'/g)||[]).length;
assert.equal(migrationCount,9,'Exactly nine official ASP11 domain records must exist');
for(const name of [
 'Mathematical Calculations','Safety Programs and Concepts','Ergonomics',
 'Fire Prevention and Protection','Emergency Preparedness and Response',
 'Industrial Hygiene and Occupational Health','Environmental Management',
 'Training, Education, and Communication','Legal'
])assert.ok(sql.includes(name),'Missing ASP domain: '+name);
assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'));
assert.ok(sql.includes('REVOKE ALL ON TABLE public.lms_p6_question_reviews FROM PUBLIC,anon,authenticated'));
assert.ok(sql.includes('public.lms_p1_actor_is_admin()'));
assert.ok(sql.includes("review_state IN ('needs_revision','ready')"));
assert.ok(sql.includes("p_answer_checked AND p_rights_checked"));
assert.ok(sql.includes("v_question.approval_state<>'draft'"));
assert.ok(sql.includes('reviewed_domain_id'));
assert.ok(!sql.includes("UPDATE public.lms_questions SET approval_state"));
assert.ok(!sql.includes("SET approval_state='approved'"));
assert.ok(sql.includes('lms_p6_review_question'),'Expected isolated P6 review RPC');
assert.ok(api.includes("db.rpc(name,args)"));
assert.ok(!api.includes("db.from('lms_questions')"));
assert.ok(!api.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!ui.includes('approval_state:'), 'UI must not write P4 approval state');
assert.ok(ui.includes('rightsChecked'));
assert.ok(ui.includes('answerChecked'));
assert.ok(ui.includes('Add official 9 domains'));
assert.ok(ui.includes('No automatic publishing.'));
assert.ok(shell.includes("isAdmin&&!suspended&&<nav className=\"live-admin-navigation\""),'Live review must appear in authenticated admin menu');
assert.ok(shell.includes("aria-label=\"Admin menu\""));
assert.ok(shell.includes('ASP Question Review'));
assert.ok(shell.includes("isAdmin&&adminSection==='review'"),'Review must be reachable as a distinct admin view');
assert.ok(shell.includes("setCourseId(aspCourse.id)"),'Clicking review must select the ASP course first');
assert.ok(shell.includes("loadedStructureFor!==aspCourse.id"),'Never render unrelated course domains in ASP review');
assert.ok(shell.includes('ASP course not found'),'Missing ASP course should have an actionable explanation');
assert.ok(!shell.includes('isAdmin&&selected?.slug===\'asp\'&&!suspended&&<AdminQuestionReview'),'Old footer-only rendering must be removed');
const demoMenu=read('src/components/Layout.jsx');
const demoRoutes=read('src/App.jsx');
const demoGate=read('src/pages/ASPReviewLiveNotice.jsx');
assert.ok(demoMenu.includes("['/asp-review','ASP Question Review'"),'Deployed admin menu must expose the actual reviewer');
assert.ok(demoRoutes.includes('path="/asp-review" element={<AdminOnly>'),'Demo notice route must remain admin gated');
assert.ok(demoGate.includes("window.location.replace(secureUrl)"),'Admin menu should open the functional secure entry directly');
assert.ok(!demoGate.includes("from '../production/"),'Demo notice must never import the production reviewer or protected RPCs');

const reviewHtml=read('asp-review.html');
const vite=read('vite.config.js');
const supabaseClient=read('src/lib/supabase.js');
assert.ok(reviewHtml.includes('/src/production/main.jsx'), 'Standalone secure review must use the isolated Live entry');
assert.ok(!reviewHtml.includes('/src/main.jsx'), 'No unprotected Demo app in secure review HTML');
assert.ok(vite.includes("aspReview:resolve(process.cwd(),'asp-review.html')"), 'Default build must emit the secure reviewer alongside existing site');
assert.ok(vite.includes("build:live?undefined:"), 'Full Live bundle must remain single entry and exclude Demo answer bank');
assert.ok(supabaseClient.includes("!secureReviewEntry"), 'Secure review entry may initialize Supabase without switching Demo app auth mode');
assert.ok(shell.includes("standaloneReviewPage?'review':'courses'"), 'Standalone review must open its real admin page by default');
assert.ok(shell.includes('<AdminQuestionReview'));
console.log('PASS P6A isolated secure admin review contract: no auto-approval, nine official domains, no browser direct bank read.');
