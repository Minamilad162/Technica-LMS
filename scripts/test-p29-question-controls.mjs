import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611080003_p29_bank_active_mock_and_lesson_controls.sql');
const bank=read('src/production/AdminCourseBank.jsx');
const api=read('src/production/courseQuestionBankApi.js');
const mock=read('src/production/AdminToolsPanels.jsx');
const quiz=read('src/production/AdminLessonQuizEditor.jsx');
const admin=read('src/production/AdminToolsWorkspace.jsx');
const builder=read('src/production/LiveCourseBuilder.jsx');
for(const part of [
 'ADD COLUMN is_active boolean NOT NULL DEFAULT true',
 'ADD COLUMN mock_candidate boolean NOT NULL DEFAULT false',
 'CREATE FUNCTION public.lms_p29_set_question_flags(',
 'CREATE FUNCTION public.lms_p29_mock_candidate_ids(',
 'CREATE OR REPLACE FUNCTION public.lms_p28_guard_bank_assignment()',
 'CREATE OR REPLACE FUNCTION public.lms_p28_guard_quiz_link()',
 'CREATE OR REPLACE FUNCTION public.lms_p28_list_bank(',
 'CREATE OR REPLACE FUNCTION public.lms_p4_start_practice(',
 'CREATE OR REPLACE FUNCTION public.lms_p8_levelup_readiness(',
 'CREATE OR REPLACE FUNCTION public.lms_p8_start_levelup(',
 'CREATE OR REPLACE FUNCTION public.lms_p8_answer_levelup(',
 'AND NOT q.mock_candidate',
 "AND NOT mock_candidate",
 "IF v_reserved OR q.mock_exclusive",
 "IF NOT p_is_active THEN",
 "SET is_published=false",
 "oldMockCandidate",
 "newMockCandidate",
 "Mock Exam candidate is excluded from Practice approval",
 'REVOKE ALL ON FUNCTION public.lms_p29_set_question_flags',
 ])assert(sql.includes(part),'P29 SQL missing '+part);
assert(!sql.includes('DROP TABLE')&&!sql.includes('DELETE FROM public.lms_questions'),'P29 must preserve source bank and graded histories');
for(const part of [
 'Upload Question File','type="file"','accept=".xlsx,.csv"','Active: ',
 'Mock Exam: ','Lesson Quiz','Select a lesson…','Add to Quiz',
 'setQuestionBankFlags(db,q.id','attachBankToLesson(db,lessonId,q.id',
 'liveCourseTree(db,courseId)','bank.compatibilityMode',
 ])assert(bank.includes(part),'P29 admin UI missing '+part);
for(const part of [
 'lms_p29_set_question_flags','lms_p29_mock_candidate_ids',
 'p_question_id:checkId(questionId)','compatibilityMode',
 ])assert(api.includes(part),'P29 frontend API missing '+part);
assert(mock.includes('Load checked Mock questions from Bank')&&mock.includes('loadMarkedMockCandidateIds(db,asp.id)'));
assert(quiz.includes('q.mockCandidate')&&quiz.includes('!q.isActive'));
assert(admin.includes('tab===\'questions\'&&<AdminCourseBank'));
assert(builder.includes('courseId={courseId}')&&builder.includes('AdminLessonQuizEditor'));
console.log('PASS P29 contracts: Excel uploader visible, Active defaults yes, Mock candidate checkbox, per-course Lesson Quiz picker, immutable ASP 200 Mock reservation, server-side Practice/Level Up exclusions.');
