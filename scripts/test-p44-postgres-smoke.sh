#!/usr/bin/env bash
# P44 AFTER P41 tests on disposable CI PostgreSQL only; no external DB write.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
LEARNER='00000000-0000-0000-0000-000000000002'
C2='10000000-0000-0000-0000-000000000002'
R1='14400000-0000-0000-0000-000000000001'
R2='14400000-0000-0000-0000-000000000002'
R3='14400000-0000-0000-0000-000000000003'
before=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT count(*) FROM public.lms_practice_attempts")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611090001_p44_configured_build_your_own.sql >/dev/null
after=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT count(*) FROM public.lms_practice_attempts")
[[ "$before" == "$after" ]] || { echo 'FAIL P44 mutated existing sessions';exit 1; }
# Populate disposable ONLY with approved Practice questions, each tier >=100.
psql -X -v ON_ERROR_STOP=1 -q -c "
 INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,explanation,
  difficulty,approval_state,is_active,mock_exclusive,mock_candidate)
 SELECT '$C2','P44_SECURE_'||n::text,'P44 sample question '||n::text,
 '[\"Option A\",\"Option B\",\"Option C\",\"Option D\"]'::jsonb,0,'Sample explanation',
 CASE WHEN n<=110 THEN 'low' WHEN n<=220 THEN 'medium' ELSE 'high' END,
 'approved',true,false,false FROM generate_series(1,330) n;" >/dev/null
as_learner(){
 local sql="$1"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 $sql;COMMIT;"
}
# Client cannot spoof answers or claim server settings: only returned selected pool.
A=$(as_learner "SELECT public.lms_p44_start_custom('$C2',100,'$R1',7200,90,'mixed','end',false,null);")
ID=$(echo "$A"|grep 'attemptId'|tail -n 1|python3 -c 'import sys,json;print(json.load(sys.stdin)["attemptId"])')
[[ -n "$ID" ]] || {echo 'FAIL no P44 attempt';exit 1;}
[[ "$(psql -X -A -t -c "SELECT count(*) FROM public.lms_practice_attempt_items WHERE attempt_id='$ID'")" == 100 ]] || {echo 'FAIL not 100 items';exit 1;}
[[ "$(echo "$A"|grep -o 'correctIndex'|wc -l)" == 0 ]] || {echo 'FAIL leaked answers before submission';exit 1;}
Q=$(psql -X -A -t -c "SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$ID' AND position=1")
if as_learner "SELECT public.lms_p4_save_answer('$ID','$Q',0)" >/dev/null 2>&1;then
 echo 'FAIL old P4 API bypasses configured timers';exit 1
fi
B=$(as_learner "SELECT public.lms_p44_answer('$ID','$Q',0)")
[[ "$(echo "$B"|grep -o 'correctIndex'|wc -l)" == 0 ]] || {echo 'FAIL leaked end-only answer';exit 1;}
if as_learner "SELECT public.lms_p44_answer('$ID','$Q',1)" >/dev/null 2>&1;then
 echo 'FAIL changed a submitted P44 answer';exit 1
fi
as_learner "SELECT public.lms_p44_next('$ID')" >/dev/null
# Actual clock enforcement cannot be reset by local browser state.
psql -X -q -c "UPDATE public.lms_p44_custom_config SET question_deadline_at=clock_timestamp()-interval '1 second'
 WHERE attempt_id='$ID'" >/dev/null
Q2=$(psql -X -A -t -c "SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$ID' AND position=2")
if as_learner "SELECT public.lms_p44_answer('$ID','$Q2',0)" >/dev/null 2>&1;then
 echo 'FAIL accepted expired per-question answer';exit 1
fi
as_learner "SELECT public.lms_p44_next('$ID')" >/dev/null
# Immediate feedback provides only the current correct answer, no whole bank.
IMM=$(as_learner "SELECT public.lms_p44_start_custom('$C2',100,'$R2',0,0,'high','each',false,null)")
IMM_ID=$(echo "$IMM"|grep 'attemptId'|tail -n 1|python3 -c 'import sys,json;print(json.load(sys.stdin)["attemptId"])')
IMM_Q=$(psql -X -A -t -c "SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$IMM_ID' AND position=1")
REPLY=$(as_learner "SELECT public.lms_p44_answer('$IMM_ID','$IMM_Q',0)")
[[ "$(echo "$REPLY"|grep -o 'correctIndex'|wc -l)" == 1 ]] || {echo 'FAIL exact one-question feedback';exit 1;}
[[ "$(psql -X -A -t -c "SELECT count(*) FROM public.lms_practice_attempt_items i JOIN public.lms_questions q ON q.id=i.question_id WHERE i.attempt_id='$IMM_ID' AND q.difficulty='high'")" == 100 ]] || {echo 'FAIL selected difficulty policy';exit 1;}
# Adaptive is server-selected and uses fixed base 70%, not a growing denominator.
AD=$(as_learner "SELECT public.lms_p44_start_custom('$C2',30,'$R3',0,0,'adaptive','end',false,null)")
AD_ID=$(echo "$AD"|grep 'attemptId'|tail -n 1|python3 -c 'import sys,json;print(json.load(sys.stdin)["attemptId"])')
for n in $(seq 1 10);do
 Q=$(psql -X -q -A -t -c "SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$AD_ID' AND position=$n")
 sel=0;[[ "$n" -gt 7 ]] && sel=1
 as_learner "SELECT public.lms_p44_answer('$AD_ID','$Q',$sel)" >/dev/null
 as_learner "SELECT public.lms_p44_next('$AD_ID')" >/dev/null
done
[[ "$(psql -X -q -A -t -c "SELECT tier FROM public.lms_p44_custom_config WHERE attempt_id='$AD_ID'")" == medium ]] || {echo 'FAIL 70% fixed base promotion';exit 1;}
if as_learner "SELECT public.lms_p44_start_custom('$C2',101,'14400000-0000-0000-0000-000000000004',0,0,'mixed','end',false,null)" >/dev/null 2>&1;then
 echo 'FAIL accepted 101 questions';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN;SET LOCAL ROLE anon;
 SELECT public.lms_p44_payload('$ID');ROLLBACK" >/dev/null 2>&1;then
 echo 'FAIL anonymous can read practice';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611090001_p44_configured_build_your_own.sql >/dev/null 2>&1;then
 echo 'FAIL P44 replay';exit 1
fi
echo 'PASS P44: 100 items, server-only answer disclosure, per-question deadline, fixed difficulty, 70% adaptive and RLS.'
