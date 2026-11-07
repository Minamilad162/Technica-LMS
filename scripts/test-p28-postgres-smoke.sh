#!/usr/bin/env bash
# P28 additive policy test on the same disposable CI PostgreSQL, AFTER P22.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
other=40000000-0000-0000-0000-000000000004
asp_lesson=40000000-0000-0000-0000-000000000002
before=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611080001_p28_course_bank_quiz_links.sql
after=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_questions")
[[ "$before" == "$after" ]] || { echo 'FAIL P28 migration imported/mutated question rows';exit 1; }
run_as(){
 local uid="$1" stmt="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c   "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$stmt;COMMIT;" |
  sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
input='[{"sourceId":"P28-fixture-1","prompt":"What is the safe procedure before maintenance?","options":["Isolate","Ignore"],"correctIndex":0,"reference":"Synthetic test","domainId":null,"difficulty":"high"},{"sourceId":"P28-fixture-2","prompt":"What is the second safe procedure after maintenance?","options":["Verify","Ignore"],"correctIndex":0,"reference":"Synthetic test","domainId":null}]'
if run_as "$paid" "SELECT public.lms_p28_list_bank('$course','',50,0)" >/dev/null 2>&1;then
 echo 'FAIL P28 learner reads answer bank';exit 1
fi
if run_as "$paid" "SELECT public.lms_p28_import_bank('$course','$input'::jsonb)" >/dev/null 2>&1;then
 echo 'FAIL P28 learner imports questions';exit 1
fi
inserted=$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$input'::jsonb)->>'inserted'")
[[ "$inserted" == 2 ]] || { echo "FAIL P28 import $inserted";exit 1; }
skipped=$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$input'::jsonb)->>'skipped'")
[[ "$skipped" == 2 ]] || { echo 'FAIL P28 duplicate import not idempotent';exit 1; }
difficulty_count=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','',50,0,NULL,'high','draft')->>'total'")
[[ "$difficulty_count" == 1 ]] || { echo "FAIL P28 draft high difficulty filter: $difficulty_count";exit 1; }
practice_before=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','',50,0,NULL,'','practice')->>'total'")
[[ "$practice_before" == 0 ]] || { echo "FAIL P28 draft questions visible as approved Practice";exit 1; }
q1=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT id FROM public.lms_questions WHERE course_id='$course' AND source_id='P28-fixture-1'")
q2=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT id FROM public.lms_questions WHERE course_id='$course' AND source_id='P28-fixture-2'")
if run_as "$admin" "SELECT public.lms_p28_attach_lesson_question('$asp_lesson','$q1',false)" >/dev/null 2>&1;then
 echo 'FAIL P28 cross-course quiz link';exit 1
fi
linked=$(run_as "$admin" "SELECT public.lms_p28_attach_lesson_question('$other','$q1',false)->>'isPublished'")
[[ "$linked" == false ]] || { echo 'FAIL P28 draft question auto-published';exit 1; }
if run_as "$admin" "SELECT public.lms_p28_attach_lesson_question('$other','$q2',true)" >/dev/null 2>&1;then
 echo 'FAIL P28 draft question published';exit 1
fi
if run_as "$admin" "SELECT public.lms_p28_mark_nonasp_mock('$q1','RESERVE NON-ASP MOCK ONLY')" >/dev/null 2>&1;then
 echo 'FAIL P28 reserving linked quiz question';exit 1
fi
run_as "$admin" "SELECT public.lms_p28_approve_nonasp('$q1','APPROVE NON-ASP QUESTION')->>'approvalState'" | grep -qx approved
run_as "$admin" "UPDATE public.lms_p22_lesson_quiz_questions SET is_published=true WHERE bank_question_id='$q1' RETURNING id" >/dev/null
if psql -X -q -v ON_ERROR_STOP=1 -c "UPDATE public.lms_questions SET mock_exclusive=true WHERE id='$q1'" >/dev/null 2>&1;then
 echo 'FAIL P28 guard permits Mock tag while published in Lesson Quiz';exit 1
fi
marked=$(run_as "$admin" "SELECT public.lms_p28_mark_nonasp_mock('$q2','RESERVE NON-ASP MOCK ONLY')->>'mockExclusive'")
[[ "$marked" == true ]] || { echo 'FAIL P28 Mock-only tag';exit 1; }
if run_as "$admin" "SELECT public.lms_p28_attach_lesson_question('$other','$q2',false)" >/dev/null 2>&1;then
 echo 'FAIL P28 Mock-only question linked to quiz';exit 1
fi
mockcount=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','',50,0,NULL,'','mock')->>'total'")
[[ "$mockcount" == 1 ]] || { echo 'FAIL P28 Mock-only filtering';exit 1; }
total=$(run_as "$admin" "SELECT public.lms_p28_list_bank('$course','P28-fixture',50,0)->>'total'")
[[ "$total" == 2 ]] || { echo 'FAIL P28 course-scoped bank list';exit 1; }
echo 'PASS P28 disposable PG: DDL nonmutation, Admin/RLS, idempotent draft import, cross-course denial, draft publication guard, official non-ASP release, Mock/Quiz non-overlap.'
