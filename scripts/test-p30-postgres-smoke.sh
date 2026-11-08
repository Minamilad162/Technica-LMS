#!/usr/bin/env bash
# P30 ONE-REQUEST atomic batch editor smoke. DISPOSABLE CI Postgres only.
# Runs AFTER P29 smoke; never point at a real Supabase environment.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
learner=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
lesson=40000000-0000-0000-0000-000000000004
run_as(){
 local user="$1" sql="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c \
   "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$user';$sql;COMMIT;" |
   sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
before_q=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_questions")
before_mock=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p9b_mock_items")
before_lesson=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080004_p30_batch_question_bank_edits.sql
[[ "$(psql -X -A -t -c "SELECT count(*) FROM public.lms_questions")" == "$before_q" ]] || { echo 'FAIL P30 installer changed Question rows';exit 1; }
[[ "$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p9b_mock_items")" == "$before_mock" ]] || { echo 'FAIL P30 installer changed official Mock rows';exit 1; }
[[ "$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")" == "$before_lesson" ]] || { echo 'FAIL P30 installer changed Lesson Quiz rows';exit 1; }
if run_as "$learner" "SELECT public.lms_p30_save_question_bank('$course','[]'::jsonb)" >/dev/null 2>&1; then
 echo 'FAIL P30 learner can save course Bank';exit 1
fi
caps=$(run_as "$admin" "SELECT public.lms_p30_bank_capabilities()->>'version'")
[[ "$caps" == p30-v1 ]] || { echo 'FAIL P30 read-only capabilities';exit 1; }
if run_as "$learner" "SELECT public.lms_p30_bank_capabilities()" >/dev/null 2>&1; then
 echo 'FAIL P30 learner sees protected Bank capabilities';exit 1
fi
anon=$(psql -X -A -t -c "SELECT has_function_privilege('anon','public.lms_p30_save_question_bank(uuid,jsonb)','EXECUTE')")
[[ "$anon" == f ]] || { echo 'FAIL P30 anon can execute batch';exit 1; }
q1=$(psql -X -A -t -c "SELECT id FROM public.lms_questions WHERE source_id='P28-fixture-1' AND course_id='$course'")
q2=$(psql -X -A -t -c "SELECT id FROM public.lms_questions WHERE source_id='P29-candidate' AND course_id='$course'")
[[ -n "$q1" && -n "$q2" ]] || { echo 'FAIL P30 test fixtures not installed';exit 1; }
# One valid disable of approved q1 + one draft-difficulty & Lesson assignment.
payload=$(psql -X -A -t -c "
 SELECT jsonb_build_array(
  jsonb_build_object('questionId',a.id,'expectedActive',a.is_active,
   'expectedMockCandidate',a.mock_candidate,'expectedDifficulty',a.difficulty,
   'expectedApprovalState',a.approval_state,'isActive',false,
   'mockCandidate',false,'difficulty',a.difficulty,'addLessonId',null),
  jsonb_build_object('questionId',b.id,'expectedActive',b.is_active,
   'expectedMockCandidate',b.mock_candidate,'expectedDifficulty',b.difficulty,
   'expectedApprovalState',b.approval_state,'isActive',true,
   'mockCandidate',false,'difficulty','high','addLessonId','$lesson')
 ) FROM public.lms_questions a,public.lms_questions b WHERE a.id='$q1' AND b.id='$q2'")
saved=$(run_as "$admin" "SELECT public.lms_p30_save_question_bank('$course','$payload'::jsonb)->>'saved'")
[[ "$saved" == 2 ]] || { echo "FAIL P30 atomic batch update response: $saved";exit 1; }
q1state=$(psql -X -A -t -c "SELECT is_active::text||'/'||approval_state FROM public.lms_questions WHERE id='$q1'")
q2state=$(psql -X -A -t -c "SELECT difficulty||'/'||approval_state||'/'||mock_candidate::text FROM public.lms_questions WHERE id='$q2'")
[[ "$q1state" == false/approved && "$q2state" == high/draft/false ]] ||
 { echo "FAIL P30 batch changed wrong state: $q1state / $q2state";exit 1; }
linked=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id='$q2' AND lesson_id='$lesson' AND NOT is_published")
[[ "$linked" == 1 ]] || { echo 'FAIL P30 Draft Lesson Quiz link was not created or unexpectedly published';exit 1; }
# An approved difficulty modification must reject entire batch, including an
# otherwise valid question Active change. No partial updates.
bad=$(psql -X -A -t -c "
 SELECT jsonb_build_array(
  jsonb_build_object('questionId',a.id,'expectedActive',a.is_active,
   'expectedMockCandidate',a.mock_candidate,'expectedDifficulty',a.difficulty,
   'expectedApprovalState',a.approval_state,'isActive',true,
   'mockCandidate',false,'difficulty','high','addLessonId',null),
  jsonb_build_object('questionId',b.id,'expectedActive',b.is_active,
   'expectedMockCandidate',b.mock_candidate,'expectedDifficulty',b.difficulty,
   'expectedApprovalState',b.approval_state,'isActive',false,
   'mockCandidate',false,'difficulty',b.difficulty,'addLessonId',null)
 ) FROM public.lms_questions a,public.lms_questions b WHERE a.id='$q1' AND b.id='$q2'")
if run_as "$admin" "SELECT public.lms_p30_save_question_bank('$course','$bad'::jsonb)" >/dev/null 2>&1; then
 echo 'FAIL P30 approved difficulty change bypassed independent ASP review';exit 1
fi
[[ "$(psql -X -A -t -c "SELECT is_active::text FROM public.lms_questions WHERE id='$q2'")" == true ]] ||
 { echo 'FAIL P30 rejected batch partially disabled q2';exit 1; }
# Replaying stale expected values is blocked, preserving edits made by other Admins.
if run_as "$admin" "SELECT public.lms_p30_save_question_bank('$course','$payload'::jsonb)" >/dev/null 2>&1; then
 echo 'FAIL P30 stale batch silently overwrote newer state';exit 1
fi
# Official Mock never allows Admin flags via this batch editor.
official=$(psql -X -A -t -c "SELECT q.id FROM public.lms_questions q WHERE q.mock_exclusive LIMIT 1")
if [[ -n "$official" ]];then
  actual=$(psql -X -A -t -c "SELECT jsonb_build_array(jsonb_build_object('questionId',id,
   'expectedActive',is_active,'expectedMockCandidate',mock_candidate,
   'expectedDifficulty',difficulty,'expectedApprovalState',approval_state,
   'isActive',false,'mockCandidate',mock_candidate,'difficulty',difficulty))
   FROM public.lms_questions WHERE id='$official'")
  course_official=$(psql -X -A -t -c "SELECT course_id FROM public.lms_questions WHERE id='$official'")
  if run_as "$admin" "SELECT public.lms_p30_save_question_bank('$course_official','$actual'::jsonb)" >/dev/null 2>&1; then
   echo 'FAIL P30 mutated immutable official Mock reservation';exit 1
  fi
fi
# Repeat is fail-closed and cannot overwrite original installed functions.
if psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080004_p30_batch_question_bank_edits.sql >/dev/null 2>&1;then
 echo 'FAIL P30 installer replay was not blocked';exit 1
fi
echo 'PASS P30 atomic single-RPC batch edits, no installer data changes, draft-only Difficulty, protected Mock, lesson links, stale detection and rollback.'
