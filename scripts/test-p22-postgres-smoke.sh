#!/usr/bin/env bash
# P22 integration smoke on CI disposable PostgreSQL ONLY, after P1/P2/P15/P21.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
paid=00000000-0000-0000-0000-000000000003
none=00000000-0000-0000-0000-000000000002
lesson=40000000-0000-0000-0000-000000000002
q1=82000000-0000-0000-0000-000000000001
q2=82000000-0000-0000-0000-000000000002
before=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_lesson_progress")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611070003_p22_lesson_journey.sql
after=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.lms_lesson_progress")
[[ "$before" == "$after" ]] || { echo "FAIL P22 migration mutated learner rows";exit 1; }
psql -X -q -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.lms_p22_lesson_quiz_questions(id,lesson_id,position,prompt,options,correct_index,is_published)
VALUES
 ('$q1','$lesson',0,'Which option is correct for the first question?','["Alpha","Beta"]',0,true),
 ('$q2','$lesson',1,'Which option is correct for the second question?','["Gamma","Delta"]',1,true);
SQL
run_as(){
 local uid="$1" statement="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c \
  "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$statement;COMMIT;" | sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
if psql -X -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$paid';SELECT correct_index FROM public.lms_p22_lesson_quiz_questions;ROLLBACK;" >/dev/null 2>&1;then
 echo "FAIL P22 exposes correct keys to learner";exit 1
fi
if psql -X -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$paid';UPDATE public.lms_lesson_progress SET quiz_completed=true WHERE lesson_id='$lesson';ROLLBACK;" >/dev/null 2>&1;then
 echo "FAIL P22 allows browser direct progress write";exit 1
fi
if psql -X -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$none';SELECT public.lms_p22_get_lesson_quiz('$lesson');ROLLBACK;" >/dev/null 2>&1;then
 echo "FAIL P22 unentitled learner can request protected quiz";exit 1
fi
quiz=$(run_as "$paid" "SELECT public.lms_p22_get_lesson_quiz('$lesson')")
printf '%s' "$quiz" | python3 -c 'import sys,json; q=json.load(sys.stdin);assert len(q)==2 and all("correct_index" not in x for x in q)'
if psql -X -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$paid';SELECT public.lms_p22_submit_lesson_quiz('$lesson','[{\"id\":\"$q1\",\"selectedIndex\":1}]'::jsonb);ROLLBACK;" >/dev/null 2>&1;then
 echo "FAIL P22 accepts an incomplete quiz";exit 1
fi
# Submit both answers wrong: completion must be true, pass must be false.
score=$(run_as "$paid" "SELECT public.lms_p22_submit_lesson_quiz('$lesson','[{\"id\":\"$q1\",\"selectedIndex\":1},{\"id\":\"$q2\",\"selectedIndex\":0}]'::jsonb)")
printf '%s' "$score" | python3 -c 'import sys,json;x=json.load(sys.stdin);assert x["quizCompleted"] is True and x["scorePercent"]==0 and x["lessonCompleted"] is False'
flags=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT quiz_completed::text||'|'||quiz_passed::text||'|'||(lesson_completed_at IS NULL)::text FROM public.lms_lesson_progress WHERE user_id='$paid' AND lesson_id='$lesson'")
[[ "$flags" == "true|false|true" ]] || { echo "FAIL P22 wrong quiz must complete quiz, not lesson";exit 1; }
run_as "$paid" "SELECT public.lms_p22_complete_lesson_step('$lesson','reading')" >/dev/null
flags=$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT reading_completed::text||'|'||quiz_completed::text||'|'||(lesson_completed_at IS NOT NULL)::text FROM public.lms_lesson_progress WHERE user_id='$paid' AND lesson_id='$lesson'")
[[ "$flags" == "true|true|true" ]] || { echo "FAIL P22 completing last required step does not roll up";exit 1; }
if psql -X -q -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$none';SELECT public.lms_p22_complete_lesson_step('$lesson','reading');ROLLBACK;" >/dev/null 2>&1;then
 echo "FAIL P22 nonentitled step completion";exit 1
fi
echo "PASS P22 disposable Postgres: migration nonmutation, key secrecy, no direct learner write, strict authorized full quiz, wrong answers count for completion, reading gate, lesson rollup and unauthorized user denial."
