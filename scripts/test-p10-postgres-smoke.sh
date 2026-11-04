#!/usr/bin/env bash
# P10 ONLY synthetic disposable PostgreSQL after P9B test reserves exactly 200.
# DO NOT execute against an existing user's DB; time shifts below are fixture-only.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
course=10000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
admin=00000000-0000-0000-0000-000000000001
anon=00000000-0000-0000-0000-000000000000
other=20000000-0000-0000-0000-000000000002
rid=eeeeeeee-1111-4111-8111-111111111111
rid2=eeeeeeee-2222-4222-8222-222222222222
rid3=eeeeeeee-3333-4333-8333-333333333333
run_as(){
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -A -t -q -c \
 "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}
before=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_questions")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611050001_p10_mock_engine.sql
after=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_questions")
[[ "$before" == "$after" ]] || { echo 'FAIL P10 migration mutated questions';exit 1; }
for name in lms_p10_mock_attempts lms_p10_mock_answers;do
 if run_as authenticated "$paid" "SELECT count(*) FROM public.$name" >/dev/null 2>&1;then
  echo "FAIL P10 learner could directly SELECT private $name";exit 1
 fi
done
if run_as authenticated "$paid" "SELECT public.lms_p10_finalize(gen_random_uuid(),false)" >/dev/null 2>&1;then
 echo 'FAIL P10 untrusted client can call private finalizer';exit 1
fi
if run_as anon "$anon" "SELECT public.lms_p10_mock_readiness('$course')" >/dev/null 2>&1;then
 echo 'FAIL P10 anonymous can examine bank readiness';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p10_mock_readiness('$other')" >/dev/null 2>&1;then
 echo 'FAIL P10 unrelated course readiness exposed';exit 1
fi
readiness=$(run_as authenticated "$paid" "SELECT public.lms_p10_mock_readiness('$course')->>'ready'")
[[ "$readiness" == true ]] || { echo "FAIL P10 200 Mock fixture not ready ($readiness)";exit 1; }
if run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$other','$rid')" >/dev/null 2>&1;then
 echo 'FAIL P10 starts wrong course';exit 1
fi
data=$(run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$course','$rid')")
attempt=$(printf '%s' "$data" | python3 -c 'import json,sys;print(json.load(sys.stdin)["attemptId"])')
[[ "$attempt" =~ ^[a-f0-9-]{36}$ ]] || { echo 'FAIL P10 start did not return UUID';exit 1; }
echo "$data" | python3 -c '
import json,sys,datetime
x=json.load(sys.stdin)
assert x["state"]=="in_progress"
assert x["mode"]=="asp_mock_200"
assert x["questionCount"]==200 and x["durationSeconds"]==18000
assert len(x["questions"])==200
assert x["correctCount"] is None and x["scorePercent"] is None
assert sorted(z["position"] for z in x["questions"])==list(range(1,201))
assert len({z["id"] for z in x["questions"]})==200
assert all("correctIndex" not in z and "explanation" not in z and
 "correct_index_snapshot" not in z and "correct_index" not in z for z in x["questions"])
'
if run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$course','$rid2')" >/dev/null 2>&1;then
 echo 'FAIL P10 parallel learner mock attempts allowed';exit 1
fi
repeat=$(run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$course','$rid')->>'attemptId'")
[[ "$repeat" == "$attempt" ]] || { echo 'FAIL P10 idempotent retry created another Mock';exit 1; }
if run_as authenticated "$admin" "SELECT public.lms_p10_mock_payload('$attempt')" >/dev/null 2>&1;then
 echo 'FAIL P10 another user could read private attempt';exit 1
fi
first=$(psql -X -A -t -c "SELECT question_id FROM public.lms_p10_mock_answers
 WHERE attempt_id='$attempt' AND position=1")
second=$(psql -X -A -t -c "SELECT question_id FROM public.lms_p10_mock_answers
 WHERE attempt_id='$attempt' AND position=2")
wrong=$(psql -X -A -t -c "SELECT id FROM public.lms_questions
 WHERE source_id='P9B-PRACTICE'")
if run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$attempt','$wrong',0,false)" >/dev/null 2>&1;then
 echo 'FAIL P10 nonassigned/Practice item accepted';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$attempt','$first',99,false)" >/dev/null 2>&1;then
 echo 'FAIL P10 invalid selected answer allowed';exit 1
fi
saved=$(run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$attempt','$first',0,true)")
echo "$saved" | python3 -c 'import json,sys;x=json.load(sys.stdin);assert x["saved"] is True and "correctIndex" not in x'
run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$attempt','$second',1,false)" >/dev/null
progress=$(run_as authenticated "$paid" "SELECT public.lms_p10_mock_payload('$attempt')")
echo "$progress" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["answeredCount"]==2 and x["flaggedCount"]==1
assert x["questions"][0]["selectedIndex"]==0
assert x["questions"][0]["flagged"] is True
assert x["questions"][1]["selectedIndex"]==1
assert x["correctCount"] is None
'
finished=$(run_as authenticated "$paid" "SELECT public.lms_p10_submit_mock('$attempt')")
echo "$finished" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["state"]=="submitted" and x["correctCount"]==1
assert x["scorePercent"]==0.5
assert x["questions"]==[]
'
again=$(run_as authenticated "$paid" "SELECT public.lms_p10_submit_mock('$attempt')->>'state'")
[[ "$again" == submitted ]] || { echo 'FAIL P10 submit not idempotent';exit 1; }
if run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$attempt','$first',0,false)" >/dev/null 2>&1;then
 echo 'FAIL P10 changed answer after submission';exit 1
fi
echo 'PASS P10 200 private questions, no key leaks, idempotent start/submit, flags, and server-only scoring'

second_data=$(run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$course','$rid2')")
second_attempt=$(printf '%s' "$second_data" | python3 -c 'import json,sys;print(json.load(sys.stdin)["attemptId"])')
# Test time expiry using fixture-only clock adjustment; preserve exact 300m.
psql -X -v ON_ERROR_STOP=1 -q -c "WITH exact_tick AS (SELECT clock_timestamp() AS stamp)
 UPDATE public.lms_p10_mock_attempts a
 SET started_at=exact_tick.stamp-interval '301 minutes',
 deadline_at=exact_tick.stamp-interval '1 minute'
 FROM exact_tick WHERE a.id='$second_attempt'"
expired=$(run_as authenticated "$paid" "SELECT public.lms_p10_mock_payload('$second_attempt')")
echo "$expired" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["state"]=="expired" and x["questions"]==[]
assert x["correctCount"]==0 and x["scorePercent"]==0
'
if run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$second_attempt','$first',0,false)" >/dev/null 2>&1;then
 echo 'FAIL P10 answered after server deadline';exit 1
fi
third_data=$(run_as authenticated "$paid" "SELECT public.lms_p10_start_mock('$course','$rid3')")
third_attempt=$(printf '%s' "$third_data" | python3 -c 'import json,sys;print(json.load(sys.stdin)["attemptId"])')
closed=$(run_as authenticated "$paid" "SELECT public.lms_p10_abandon_mock('$third_attempt')")
echo "$closed" | python3 -c 'import json,sys;x=json.load(sys.stdin);assert x["closed"]'
abandon_payload=$(run_as authenticated "$paid" "SELECT public.lms_p10_mock_payload('$third_attempt')")
echo "$abandon_payload" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["state"]=="abandoned"
assert x["questions"]==[] and x["correctCount"] is None
'
if run_as authenticated "$paid" "SELECT public.lms_p10_save_mock('$third_attempt','$first',0,false)" >/dev/null 2>&1;then
 echo 'FAIL P10 unsealed abandoned exam';exit 1
fi
echo 'PASS P10 deadline auto-expiry, no saved answers after time, fullscreen-exit sealing'

excluded=$(psql -X -A -t -c "SELECT count(*) FROM public.lms_p10_mock_answers i
 JOIN public.lms_questions q ON q.id=i.question_id
 WHERE NOT q.mock_exclusive OR q.approval_state<>'draft'")
[[ "$excluded" == 0 ]] || { echo "FAIL P10 included non-exclusive or approved Practice questions";exit 1; }
echo 'PASS P10 reuses exclusively reserved 200 Mock bank, no Practice overlap, no production data'
