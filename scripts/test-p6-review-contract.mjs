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
assert.ok(sql.includes("p6a_"),'Expected isolated extension naming');
assert.ok(api.includes("db.rpc(name,args)"));
assert.ok(!api.includes("db.from('lms_questions')"));
assert.ok(!api.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!ui.includes('approval_state:'), 'UI must not write P4 approval state');
assert.ok(ui.includes('rightsChecked'));
assert.ok(ui.includes('answerChecked'));
assert.ok(ui.includes('Add official 9 domains'));
assert.ok(ui.includes('No automatic publishing.'));
assert.ok(shell.includes("isAdmin&&selected?.slug==='asp'"));
assert.ok(shell.includes('<AdminQuestionReview'));
console.log('PASS P6A isolated secure admin review contract: no auto-approval, nine official domains, no browser direct bank read.');
