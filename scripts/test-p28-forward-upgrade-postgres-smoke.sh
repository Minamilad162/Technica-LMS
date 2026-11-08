#!/usr/bin/env bash
# Forward-only P28.2 upgrade regression on a CLONED DISPOSABLE P22 PostgreSQL database.
# Must never run on real Supabase. Original 4-arg P28 fixture -> 7-arg P28.2.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=technica_p28_upgrade PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
lesson=40000000-0000-0000-0000-000000000004
run_as(){
 local uid="$1" sql="$2"
 psql -X -A -t -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$sql;COMMIT;" |
   sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
psql -X -q -v ON_ERROR_STOP=1 -f scripts/fixtures/p28_legacy_installed_test_only.sql
old=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NOT NULL AND to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NULL")
[[ "$old" == t ]] || { echo 'FAIL preflight: expected original P28 only'; exit 1; }
before_questions=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
before_reserved=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
before_quiz=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080002_p28_2_forward_upgrade_existing.sql
after_questions=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
after_reserved=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p9b_mock_items")
after_quiz=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_p22_lesson_quiz_questions")
[[ "$before_questions" == "$after_questions" && "$before_reserved" == "$after_reserved" && "$before_quiz" == "$after_quiz" ]] ||
 { echo 'FAIL P28.2 upgrade unexpectedly changed question/Mock/quiz records'; exit 1; }
new=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer)') IS NOT NULL AND to_regprocedure('public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)') IS NOT NULL")
[[ "$new" == t ]] || { echo 'FAIL P28.2 removed legacy RPC or failed new RPC'; exit 1; }
if run_as "$paid" "SELECT public.lms_p28_list_bank('$course','',50,0,NULL,'','all')" >/dev/null 2>&1; then
 echo 'FAIL learner could read protected ASP answer bank'; exit 1
fi
anon_exec=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT has_function_privilege('anon','public.lms_p28_list_bank(uuid,text,integer,integer,uuid,text,text)','EXECUTE')")
[[ "$anon_exec" == f ]] || { echo 'FAIL P28.2 new RPC exposed to anon'; exit 1; }
# Old source quiz rows remain editable without overwriting their historical answer bank IDs.
run_as "$admin" "UPDATE public.lms_p22_lesson_quiz_questions SET prompt=prompt WHERE id='82000000-0000-0000-0000-000000000001' RETURNING id" >/dev/null
if run_as "$admin" "INSERT INTO public.lms_p22_lesson_quiz_questions(lesson_id,position,prompt,options,correct_index)
 VALUES('$lesson',99,'Should this question bypass the Course Bank?','[\"No\",\"Yes\"]'::jsonb,0)" >/dev/null 2>&1; then
 echo 'FAIL P28.2 permits new standalone Lesson Quiz question'; exit 1
fi
payload='[{"sourceId":"P282-difficulty-fixture","prompt":"How do you verify safe maintenance conditions?","options":["Isolate and test","Skip verification"],"correctIndex":0,"difficulty":"high","reference":"Synthetic only"}]'
added=$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$payload'::jsonb)->>'inserted'")
[[ "$added" == 1 ]] || { echo 'FAIL P28.2 Draft import'; exit 1; }
got=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT difficulty||'/'||approval_state||'/'||mock_exclusive FROM public.lms_questions WHERE course_id='$course' AND source_id='P282-difficulty-fixture'")
[[ "$got" == high/draft/false ]] || { echo "FAIL P28.2 provisional difficulty/draft guard: $got"; exit 1; }
both=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P282-difficulty-fixture',50,0)->>'total'")
new_count=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P282-difficulty-fixture',50,0,NULL,'high','draft')->>'total'")
no_practice=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P282-difficulty-fixture',50,0,NULL,'','practice')->>'total'")
[[ "$both" == 1 && "$new_count" == 1 && "$no_practice" == 0 ]] ||
 { echo 'FAIL P28.2 old/new RPC compatibility or filtered Draft exclusion'; exit 1; }
repeat=$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$payload'::jsonb)->>'skipped'")
[[ "$repeat" == 1 ]] || { echo 'FAIL P28.2 idempotent duplicate import'; exit 1; }
# Repeating P28.2 must fail CLOSED, without replaying migrations.
if psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080002_p28_2_forward_upgrade_existing.sql > /dev/null 2>&1; then
 echo 'FAIL P28.2 incorrectly allowed repeat execution'; exit 1
fi
echo 'PASS P28.2 disposable upgrade: real old P28 installer -> new 7-arg filters; old clients intact, no existing data changes, Draft high, RLS, no standalone quiz, no replay.'
