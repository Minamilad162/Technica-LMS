import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stagedQuestionEdit} from '../src/production/questionBankDraft.js';
const read=p=>readFileSync(p,'utf8');
const sql=read('supabase/migrations/202611120002_p77_auto_practice_import.sql');
const api=read('src/production/courseQuestionBankApi.js');
const bank=read('src/production/AdminCourseBank.jsx');
const mock=read('supabase/migrations/202611120001_p71_fixed_course_mock_from_bank.sql');
const legacy=read('supabase/migrations/202611080002_p28_2_forward_upgrade_existing.sql');
for(const fragment of [
 'CREATE FUNCTION public.lms_p77_import_bank',
 "v_difficulty,'approved',false)",
 "'defaultApproval','approved'",
 "'skipped',v_skipped,'state','approved','isActive',true",
 'CREATE OR REPLACE FUNCTION public.lms_p29_set_question_flags',
 "approval_state=v_approval",
 "WHEN p_mock_candidate THEN 'draft'",
 "WHEN q.mock_candidate AND NOT p_mock_candidate THEN 'approved'",
 'lms_practice_attempt_items WHERE question_id=q.id',
 'lms_p22_lesson_quiz_questions WHERE bank_question_id=q.id',
 'lms_p34_selected_mock_answers WHERE question_id=q.id',
 'CREATE FUNCTION public.lms_p77_existing_practice_preview',
 'CREATE FUNCTION public.lms_p77_activate_existing_practice',
 'ACTIVATE EXISTING PRACTICE IMPORTS',
 'p_expected_count NOT BETWEEN 1 AND 10000',
 'GET DIAGNOSTICS v_written=ROW_COUNT',
 'pg_advisory_xact_lock',
 'TO authenticated,service_role'
])assert(sql.includes(fragment),'Missing P77 server gate: '+fragment);
assert(api.includes("call(db,'lms_p77_import_bank'"));
assert(api.includes("result.state!=='approved'"));
assert(api.includes('existingPracticeImportPreview'));
assert(api.includes('activateExistingPracticeImports'));
assert(bank.includes('legacyPractice.count>0'));
assert(bank.includes('activateExistingPracticeImports(db,selected.id,expected)'));
assert(bank.includes('as Active + Approved for Practice'));
assert(bank.includes("['draft','approved'].includes(q.approvalState)"));
assert(legacy.includes("v_difficulty,'draft',false)"),'Original P28 must be unchanged');
assert(mock.includes('IF v_count<>200 THEN'),'200 fixed Mock contract stays protected');
const approved={isActive:true,mockCandidate:false,mockExclusive:false,
 approvalState:'approved',linkedCount:0,linkedLessonIds:[],difficulty:'unclassified'};
assert.equal(stagedQuestionEdit(approved,null,'mockCandidate',true).next.mockCandidate,true);
assert.throws(()=>stagedQuestionEdit({...approved,linkedCount:1},null,'mockCandidate',true));
console.log('P77 PASS: Active/Approved import feeds Practice; unused Approved Mock switch; old Drafts require Admin opt-in.');
