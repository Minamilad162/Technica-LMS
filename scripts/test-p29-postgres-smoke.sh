#!/usr/bin/env bash
# P29 dynamic question flags and Lesson assignment smoke — disposable CI Postgres ONLY.
# Runs AFTER existing P28 smoke; never run against real Supabase.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
lesson=40000000-0000-0000-0000-000000000004
run_as(){
 local uid="$1" stmt="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c \
  "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$stmt;COMMIT;" |
  sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
before=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
before_mock=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
before_quiz=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080003_p29_bank_active_mock_and_lesson_controls.sql
after=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
after_mock=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
after_quiz=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
[[ "$before" == "$after" && "$before_mock" == "$after_mock" && "$before_quiz" == "$after_quiz" ]] ||
 { echo 'FAIL P29 changed existing question/Mock/quiz rows';exit 1; }
default=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions WHERE NOT is_active OR mock_candidate")
[[ "$default" == 0 ]] || { echo "FAIL P29 default Active/candidate: $default";exit 1; }
q=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT id FROM public.lms_questions WHERE source_id='P28-fixture-1' AND course_id='$course'")
[[ -n "$q" ]] || { echo 'FAIL P29 fixture unavailable';exit 1; }
if run_as "$paid" "SELECT public.lms_p29_set_question_flags('$q',false,false)" >/dev/null 2>&1;then
 echo 'FAIL P29 permits a learner to change question flags';exit 1
fi
if run_as "$admin" "SELECT public.lms_p29_set_question_flags('$q',true,true)" >/dev/null 2>&1;then
 echo 'FAIL P29 permits an approved and published question to become a Mock candidate';exit 1
fi
run_as "$admin" "SELECT public.lms_p29_set_question_flags('$q',false,false)" >/dev/null
disabled=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT is_active::text||'/'||approval_state FROM public.lms_questions WHERE id='$q'")
[[ "$disabled" == false/approved ]] || { echo "FAIL P29 disabled question changed approval: $disabled";exit 1; }
published=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id='$q' AND is_published")
[[ "$published" == 0 ]] || { echo 'FAIL P29 disabled question remains published in Lesson quiz';exit 1; }
filtered=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P28-fixture-1',50,0,NULL,'','practice')->>'total'")
[[ "$filtered" == 0 ]] || { echo 'FAIL P29 disabled approved question shown as Practice-eligible';exit 1; }
run_as "$admin" "SELECT public.lms_p29_set_question_flags('$q',true,false)" >/dev/null
unpublished=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions WHERE bank_question_id='$q' AND is_published")
[[ "$unpublished" == 0 ]] || { echo 'FAIL P29 enabling republished question automatically';exit 1; }
fixture='[{"sourceId":"P29-candidate","prompt":"How should a worker verify a restricted access condition?","options":["Verify authorization","Ignore warning"],"correctIndex":0,"difficulty":"medium","reference":"Synthetic only"}]'
added=$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$fixture'::jsonb)->>'inserted'")
[[ "$added" == 1 ]] || { echo 'FAIL P29 import fixture';exit 1; }
candidate=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT id FROM public.lms_questions WHERE source_id='P29-candidate' AND course_id='$course'")
run_as "$admin" "SELECT public.lms_p29_set_question_flags('$candidate',true,true)" >/dev/null
marked=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT mock_candidate::text||'/'||mock_exclusive::text FROM public.lms_questions WHERE id='$candidate'")
[[ "$marked" == true/false ]] || { echo 'FAIL P29 candidate was incorrectly made an official Mock reservation';exit 1; }
ids=$(run_as "$admin" "SELECT public.lms_p29_mock_candidate_ids('$course')->>'count'")
[[ "$ids" == 1 ]] || { echo 'FAIL P29 marked candidates are not retrievable for P9B preflight';exit 1; }
if run_as "$admin" "SELECT public.lms_p28_attach_lesson_question('$lesson','$candidate',false)" >/dev/null 2>&1;then
 echo 'FAIL P29 Mock candidate could be attached to Lesson Quiz';exit 1
fi
if run_as "$admin" "SELECT public.lms_p28_approve_nonasp('$candidate','APPROVE NON-ASP QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL P29 Mock candidate was approved into Practice';exit 1
fi
# P4 quick/custom and P8e Level Up must filter all newly disabled/Mock candidates
# on the SERVER, not only in the Admin catalogue.
selector_check=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "
 SELECT
  position('q.is_active' IN pg_get_functiondef('public.lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)'::regprocedure))>0 AND
  position('NOT q.mock_candidate' IN pg_get_functiondef('public.lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)'::regprocedure))>0 AND
  position('NOT mock_candidate' IN pg_get_functiondef('public.lms_p8_levelup_readiness(uuid,integer,uuid)'::regprocedure))>0 AND
  position('NOT mock_candidate' IN pg_get_functiondef('public.lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)'::regprocedure))>0 AND
  position('NOT x.mock_candidate' IN pg_get_functiondef('public.lms_p8_answer_levelup(uuid,uuid,integer)'::regprocedure))>0")
[[ "$selector_check" == t ]] || { echo 'FAIL P29 server Practice/Level Up selector did not exclude disabled and Mock candidates';exit 1; }
listed=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P29-candidate',50,0,NULL,'medium','mock')->>'total'")
[[ "$listed" == 1 ]] || { echo 'FAIL P29 domain/difficulty/Mock filtering';exit 1; }
if run_as "$admin" "SELECT public.lms_p29_set_question_flags('$candidate',false,true)" >/dev/null 2>&1;then
 echo 'FAIL P29 allowed inactive Mock candidate';exit 1
fi
run_as "$admin" "SELECT public.lms_p29_set_question_flags('$candidate',true,false)" >/dev/null
stillDraft=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT approval_state FROM public.lms_questions WHERE id='$candidate'")
[[ "$stillDraft" == draft ]] || { echo 'FAIL P29 toggling flags silently approved question';exit 1; }
if psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080003_p29_bank_active_mock_and_lesson_controls.sql >/dev/null 2>&1;then
 echo 'FAIL P29 replay not blocked';exit 1
fi
echo 'PASS P29 disposable PG: Active default, Admin-only flags, disabled quiz unpublish, Mock candidate stays draft and excluded, real Practice/Level Up server filters, no old data changes.'
