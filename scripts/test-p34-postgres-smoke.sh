#!/usr/bin/env bash
# P34 one-save Lesson Quiz and separate selected Mock. Disposable CI PostgreSQL only.
# Run AFTER P30 smoke. Never point this test at a real Supabase project.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
learner=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
lesson=40000000-0000-0000-0000-000000000004
request=55000000-0000-4000-8000-000000000034
run_as(){
 local uid="$1" stmt="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c  "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$stmt;COMMIT;" |
 sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
query(){ psql -X -A -t -v ON_ERROR_STOP=1 -c "$1" | tail -n 1; }
before_q=$(query "SELECT count(*) FROM public.lms_questions")
before_lesson=$(query "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
before_mock=$(query "SELECT count(*) FROM public.lms_p9b_mock_items")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080005_p34a_one_save_lesson_quiz.sql
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080006_p34b_selected_mock_engine.sql
[[ "$before_q" == "$(query "SELECT count(*) FROM public.lms_questions")" ]] ||
 { echo 'FAIL P34 installer changed existing bank rows'; exit 1; }
[[ "$before_lesson" == "$(query "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")" ]] ||
 { echo 'FAIL P34 installer changed existing Lesson rows'; exit 1; }
[[ "$before_mock" == "$(query "SELECT count(*) FROM public.lms_p9b_mock_items")" ]] ||
 { echo 'FAIL P34 installer altered immutable official Mock'; exit 1; }
[[ "$(run_as "$admin" "SELECT public.lms_p34_bank_capabilities()->>'version'")" == p34a-v1 ]] ||
 { echo 'FAIL P34A Admin capability'; exit 1; }
[[ "$(run_as "$admin" "SELECT public.lms_p34b_admin_capabilities()->>'version'")" == p34b-v1 ]] ||
 { echo 'FAIL P34B Admin capability'; exit 1; }
if run_as "$learner" "SELECT public.lms_p34_bank_capabilities()" >/dev/null 2>&1; then
 echo 'FAIL learner can access Admin P34 capabilities';exit 1;fi
if run_as "$learner" "SELECT public.lms_p34_save_question_bank('$course','[]'::jsonb,'$lesson')" >/dev/null 2>&1;then
 echo 'FAIL learner can publish Lesson Quiz';exit 1;fi
[[ "$(query "SELECT has_function_privilege('anon','public.lms_p34_release_one(uuid,uuid)','EXECUTE')")" == f ]] ||
 { echo 'FAIL private publish helper was public';exit 1; }
# P30 created one Draft linked to this Course and Lesson, previously unpublished.
q=$(query "SELECT id FROM public.lms_questions WHERE source_id='P29-candidate' AND course_id='$course'")
[[ -n "$q" ]] || { echo 'FAIL missing P30 linked Draft fixture';exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id='$q' AND lesson_id='$lesson' AND NOT is_published")" == 1 ]] ||
 { echo 'FAIL fixture was not linked as unpublished Draft';exit 1; }
result=$(run_as "$admin" "SELECT public.lms_p34_save_question_bank('$course','[]'::jsonb,'$lesson')->>'published'")
[[ "$result" -ge 1 ]] || { echo "FAIL P34 one-save did not publish existing Draft link ($result)";exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id='$q' AND lesson_id='$lesson' AND is_published")" == 1 ]] ||
 { echo 'FAIL linked Draft not visible as published P22 question';exit 1; }
[[ "$(query "SELECT approval_state FROM public.lms_questions WHERE id='$q'")" == draft ]] ||
 { echo 'FAIL P34 Lesson-specific publication globally approved Draft for Practice';exit 1; }
got=$(run_as "$learner" "SELECT jsonb_array_length(public.lms_p22_get_lesson_quiz('$lesson'))")
[[ "$got" -ge 1 ]] || { echo 'FAIL actual learner P22 Quiz does not see saved published link';exit 1; }
keys=$(run_as "$learner" "SELECT public.lms_p22_get_lesson_quiz('$lesson')::text LIKE '%correct_index%'")
[[ "$keys" == f ]] || { echo 'FAIL P22 leaked server-only answer key';exit 1; }
# Brand new active Draft link: one admin selection + one Save must publish.
fixture='[{"sourceId":"P34-direct","prompt":"Which control prevents accidental ignition during hot work?","options":["Verify isolation and permit controls","Ignore site controls"],"correctIndex":0,"difficulty":"low","reference":"Synthetic CI fixture"}]'
[[ "$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$fixture'::jsonb)->>'inserted'")" == 1 ]] ||
 { echo 'FAIL P34 new Draft setup';exit 1; }
newq=$(query "SELECT id FROM public.lms_questions WHERE source_id='P34-direct' AND course_id='$course'")
payload=$(query "SELECT jsonb_build_array(jsonb_build_object(
 'questionId',id,'expectedActive',is_active,'expectedMockCandidate',mock_candidate,
 'expectedDifficulty',difficulty,'expectedApprovalState',approval_state,
 'isActive',true,'mockCandidate',false,'difficulty',difficulty,'addLessonId','$lesson'))
 FROM public.lms_questions WHERE id='$newq'")
publish=$(run_as "$admin" "SELECT public.lms_p34_save_question_bank('$course','$payload'::jsonb,NULL)->>'published'")
[[ "$publish" == 1 ]] || { echo "FAIL P34 single Save did not immediately publish newly selected Draft ($publish)";exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_p34_lesson_releases WHERE bank_question_id='$newq' AND lesson_id='$lesson'")" == 1 ]] ||
 { echo 'FAIL scoped release receipt missing';exit 1; }
# A selected Mock has its own exam engine; it never creates an official 200 form.
mockfixture='[{"sourceId":"P34-mock","prompt":"What establishes the emergency assembly point after an evacuation?","options":["The site emergency response plan","An informal guess"],"correctIndex":0,"difficulty":"medium","reference":"Synthetic CI fixture"}]'
[[ "$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$mockfixture'::jsonb)->>'inserted'")" == 1 ]] ||
 { echo 'FAIL P34 selected Mock fixture';exit 1; }
mq=$(query "SELECT id FROM public.lms_questions WHERE source_id='P34-mock' AND course_id='$course'")
mpayload=$(query "SELECT jsonb_build_array(jsonb_build_object(
 'questionId',id,'expectedActive',is_active,'expectedMockCandidate',mock_candidate,
 'expectedDifficulty',difficulty,'expectedApprovalState',approval_state,
 'isActive',true,'mockCandidate',true,'difficulty',difficulty))
 FROM public.lms_questions WHERE id='$mq'")
[[ "$(run_as "$admin" "SELECT public.lms_p34_save_question_bank('$course','$mpayload'::jsonb,NULL)->>'saved'")" == 1 ]] ||
 { echo 'FAIL selected Mock Save All change';exit 1; }
[[ "$(run_as "$learner" "SELECT public.lms_p34_selected_mock_readiness('$course')->>'ready'")" == true ]] ||
 { echo 'FAIL saved Mock tick not visible to learner selected Mock engine';exit 1; }
if run_as "$admin" "SELECT public.lms_p34_save_question_bank('$course','$mpayload'::jsonb,NULL)" >/dev/null 2>&1;then
 echo 'FAIL stale Mock Save did not protect against concurrent changes';exit 1;fi
aid=$(run_as "$learner" "SELECT public.lms_p34_start_selected_mock('$course','$request')->>'attemptId'")
[[ -n "$aid" ]] || { echo 'FAIL learner cannot start selected Mock';exit 1; }
[[ "$(run_as "$learner" "SELECT public.lms_p34_selected_mock_payload('$aid')->>'questionCount'")" == 1 ]] ||
 { echo 'FAIL selected Mock expected exactly 1 admin-selected question';exit 1; }
[[ "$(run_as "$learner" "SELECT public.lms_p34_selected_mock_payload('$aid')::text LIKE '%correct_index%'")" == f ]] ||
 { echo 'FAIL selected Mock leaked answer key';exit 1; }
[[ "$(run_as "$learner" "SELECT public.lms_p34_save_selected_mock('$aid','$mq',0,false)->>'saved'")" == true ]] ||
 { echo 'FAIL learner cannot save Selected Mock answer';exit 1; }
[[ "$(run_as "$learner" "SELECT public.lms_p34_submit_selected_mock('$aid')->>'correctCount'")" == 1 ]] ||
 { echo 'FAIL server scoring of selected Mock';exit 1; }
[[ "$before_mock" == "$(query "SELECT count(*) FROM public.lms_p9b_mock_items")" ]] ||
 { echo 'FAIL Selected Mock touched official immutable 200';exit 1; }
if psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080005_p34a_one_save_lesson_quiz.sql >/dev/null 2>&1;then
 echo 'FAIL P34A replay succeeded';exit 1;fi
if psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080006_p34b_selected_mock_engine.sql >/dev/null 2>&1;then
 echo 'FAIL P34B replay succeeded';exit 1;fi
echo 'PASS P34: one Save publishes new/existing Lesson Drafts only for that Lesson; separate Mock selected question starts, answers and grades; no answer keys, Practice approval, official 200 mutation or replay.'
