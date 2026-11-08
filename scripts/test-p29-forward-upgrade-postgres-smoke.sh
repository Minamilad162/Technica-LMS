#!/usr/bin/env bash
# P29 regression for the user's ACTUAL path: original P28 -> P28.2 4+7 arg RPC -> P29.
# Disposable secondary CI PostgreSQL only, NEVER run against Supabase.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=technica_p28_upgrade PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
course=10000000-0000-0000-0000-000000000002
before=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
before_mock=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
before_lesson=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
defaults_before=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT pronargdefaults FROM pg_proc WHERE oid='public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)'::regprocedure")
[[ "$defaults_before" == 0 ]] || { echo "FAIL P29 legacy P28.2 clone unexpectedly has 7-arg defaults: $defaults_before";exit 1; }
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080003_p29_bank_active_mock_and_lesson_controls.sql
after=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
after_mock=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
after_lesson=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
[[ "$before" == "$after" && "$before_mock" == "$after_mock" && "$before_lesson" == "$after_lesson" ]] ||
 { echo "FAIL P29 upgraded schema mutated existing question/Mock/Lesson rows";exit 1; }
valid=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "
 SELECT
  to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NOT NULL
  AND to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NOT NULL
  AND (SELECT pronargdefaults=0 FROM pg_proc WHERE oid='public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)'::regprocedure)
  AND NOT has_function_privilege('anon',
    'public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)','EXECUTE')")
[[ "$valid" == t ]] || { echo "FAIL P29 changed old/new RPC signatures/defaults or anon privileges";exit 1; }
run_admin(){
 local sql="$1"
 psql -X -A -t -q -v ON_ERROR_STOP=1 -c \
  "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$admin';$sql;COMMIT;" |
  sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
old_total=$(run_admin "SELECT public.lms_p28_list_bank('$course','P282-difficulty-fixture',50,0)->>'total'")
new_total=$(run_admin "SELECT public.lms_p28_list_bank('$course','P282-difficulty-fixture',50,0,NULL,'high','draft')->>'total'")
[[ "$old_total" == 1 && "$new_total" == 1 ]] || { echo "FAIL P29 original-P28 forward-upgrade list overload compatibility";exit 1; }
q=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT id FROM public.lms_questions WHERE course_id='$course' AND source_id='P282-difficulty-fixture'")
run_admin "SELECT public.lms_p29_set_question_flags('$q',false,false)" >/dev/null
inactive=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT is_active::text||'/'||approval_state FROM public.lms_questions WHERE id='$q'")
[[ "$inactive" == false/draft ]] || { echo "FAIL P29 Active flag not persisted on upgraded DB";exit 1; }
run_admin "SELECT public.lms_p29_set_question_flags('$q',true,true)" >/dev/null
candidate=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT mock_candidate::text||'/'||mock_exclusive::text FROM public.lms_questions WHERE id='$q'")
[[ "$candidate" == true/false ]] || { echo "FAIL P29 candidate changed official reservation";exit 1; }
echo 'PASS P29 disposable original P28 -> P28.2 -> P29: old and new APIs, no default overload collisions, Admin toggles, Mock protected, no existing rows touched.'
