#!/usr/bin/env bash
# P8 destructive test ONLY on GitHub Actions ephemeral PostgreSQL.
# Must run after P1/P2/P4/P5/P6, NEVER with production connection variables.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres

psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611040001_p8_adaptive_levelup.sql

run_as(){
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -A -t -q -c \
  "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}
paid=00000000-0000-0000-0000-000000000003
other=00000000-0000-0000-0000-000000000002
admin=00000000-0000-0000-0000-000000000001
course=10000000-0000-0000-0000-000000000001
# These are deliberately synthetic reviewed test items, never owner bank rows.
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,difficulty,approval_state,mock_exclusive)
 SELECT '10000000-0000-0000-0000-000000000001'::uuid,
 'P8-'||tier||'-'||n,'Test safety '||tier||' question '||n||'?',
 '["Correct answer","Wrong answer"]'::jsonb,0,tier,'approved',false
 FROM (VALUES('low'),('medium'),('high')) d(tier),generate_series(1,55) n;
INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,difficulty,approval_state,mock_exclusive)
 VALUES
 ('10000000-0000-0000-0000-000000000001','P8-MOCK-HIGH','Reserved high mock sample?', '["A","B"]',0,'high','approved',true),
 ('10000000-0000-0000-0000-000000000001','P8-DRAFT-LOW','Unapproved low sample?', '["A","B"]',0,'low','draft',false);
SQL

for n in 10 25 50; do
 checkpoint=$(( (n + 4)/5 ))
 (( checkpoint < 3 )) && checkpoint=3
 ready=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'ready'")
 [[ "$ready" == true ]] || { echo "FAIL P8 not ready for $n questions";exit 1; }
 actual=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'checkpoint'")
 [[ "$actual" == "$checkpoint" ]] || { echo "FAIL proportional checkpoint for $n: $actual";exit 1; }
done
echo 'PASS 10/25/50 proportional 20% checkpoints and server-approved readiness'

# No anonymous, unentitled or trial can inspect tier counts or start sessions.
if run_as anon 00000000-0000-0000-0000-000000000000 \
 "SELECT public.lms_p8_levelup_readiness('$course',10,NULL)" >/dev/null 2>&1; then
 echo 'FAIL anonymous can check adaptive bank';exit 1
fi
if run_as authenticated "$other" \
 "SELECT public.lms_p8_start_levelup('$course',10,'81234567-0000-0000-0000-000000000001',NULL,0)" >/dev/null 2>&1; then
 echo 'FAIL unentitled learner can start adaptive';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT count(*) FROM public.lms_practice_adaptive_state" >/dev/null 2>&1; then
 echo 'FAIL browser can read private adaptive state';exit 1
fi
echo 'PASS adaptive state privacy and entitlements'

request=81234567-0000-0000-0000-000000000002
attempt=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',10,'$request',NULL,0)->>'attemptId'")
[[ "$attempt" =~ ^[a-f0-9-]{36}$ ]] || { echo "FAIL adaptive start $attempt";exit 1; }
same=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',10,'$request',NULL,0)->>'attemptId'")
[[ "$same" == "$attempt" ]] || { echo 'FAIL idempotent adaptive start';exit 1; }
questions=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$attempt')->'questions')")
[[ "$questions" == 1 ]] || { echo "FAIL preloaded all adaptive items: $questions";exit 1; }
leak=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')::text LIKE '%correctIndex%' OR public.lms_p4_attempt_payload('$attempt')::text LIKE '%difficulty%'")
[[ "$leak" == f ]] || { echo 'FAIL adaptive answer or tier leaked before submission';exit 1; }
qid=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')->'questions'->0->>'id'")
if run_as authenticated "$paid" \
 "SELECT public.lms_p4_save_answer('$attempt','$qid',0)" >/dev/null 2>&1; then
 echo 'FAIL original P4 answer RPC bypasses adaptive progression';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT public.lms_p4_finish_practice('$attempt')" >/dev/null 2>&1; then
 echo 'FAIL learner can finish adaptive before answering required length';exit 1
fi
if run_as authenticated "$other" \
 "SELECT public.lms_p8_answer_levelup('$attempt','$qid',0)" >/dev/null 2>&1; then
 echo 'FAIL another learner can answer adaptive attempt';exit 1
fi
echo 'PASS one-question release, private grading, ID ownership and P4 bypass denied'

# Full perfect 10-question session: 3 Low -> 3 Medium -> 4 High.
for i in $(seq 0 9);do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$attempt')->'questions'->$i->>'id'")
 [[ "$qid" =~ ^[a-f0-9-]{36}$ ]] || { echo "FAIL adaptive missing question index $i";exit 1; }
 if [[ "$i" == 0 ]]; then
  id0="$qid"
 fi
 run_as authenticated "$paid" \
  "SELECT jsonb_array_length(public.lms_p8_answer_levelup('$attempt','$qid',0)->'questions')" >/dev/null
 if [[ "$i" == 2 || "$i" == 5 || "$i" == 9 ]];then
  stage=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
   "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$attempt'")
  case "$i:$stage" in
   "2:medium"|"5:high"|"9:high") :;;
   *) echo "FAIL expected promotion at checkpoint, $i:$stage";exit 1;;
  esac
 fi
done
unique_count=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(DISTINCT question_id) FROM public.lms_practice_attempt_items WHERE attempt_id='$attempt'")
[[ "$unique_count" == 10 ]] || { echo 'FAIL repeated adaptive question';exit 1; }
tier_counts=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FILTER(WHERE q.difficulty='low')||','||
  count(*) FILTER(WHERE q.difficulty='medium')||','||
  count(*) FILTER(WHERE q.difficulty='high')
  FROM public.lms_practice_attempt_items i JOIN public.lms_questions q ON q.id=i.question_id
  WHERE i.attempt_id='$attempt'")
[[ "$tier_counts" == '3,3,4' ]] || { echo "FAIL adaptive tier distribution $tier_counts";exit 1; }
if run_as authenticated "$paid" \
 "SELECT public.lms_p8_answer_levelup('$attempt','$id0',1)" >/dev/null 2>&1; then
 echo 'FAIL immutable adaptive answer changed';exit 1
fi
replay=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p8_answer_levelup('$attempt','$id0',0)->'questions')")
[[ "$replay" == 10 ]] || { echo 'FAIL idempotent retry created duplicate question';exit 1; }
state=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_finish_practice('$attempt')->>'state'")
[[ "$state" == submitted ]] || { echo "FAIL finished adaptive state $state";exit 1; }
score=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')->>'scorePercent'")
[[ "$score" == 100.00 ]] || { echo "FAIL adaptive server score $score";exit 1; }
echo 'PASS 10-question perfect session 3/3/4 Low/Medium/High, no repeats, immutable answers, P4 grading'

# At 25 questions: first 5 wrong => NO promotion; recover cumulatively.
req25=81234567-0000-0000-0000-000000000003
attempt25=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',25,'$req25',NULL,0)->>'attemptId'")
for i in $(seq 0 4);do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$attempt25')->'questions'->$i->>'id'")
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$attempt25','$qid',1)" >/dev/null
done
stage=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$attempt25'")
[[ "$stage" == low ]] || { echo 'FAIL wrongly promoted after incorrect responses';exit 1; }
# Cumulative recovery: 12 right of 17 => 70.58% (threshold = 70%).
for i in $(seq 5 16);do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$attempt25')->'questions'->$i->>'id'")
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$attempt25','$qid',0)" >/dev/null
done
stage=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$attempt25'")
[[ "$stage" == medium ]] || { echo 'FAIL cumulative 70% recovery not promoted';exit 1; }
echo 'PASS 25-question session remains Low below 70% and promotes after cumulative recovery'

# Abandoned P8 answers/snapshots must be redacted by existing P5.
closed=$(run_as authenticated "$paid" \
 "SELECT public.lms_p5_abandon_practice('$attempt25')->>'state'")
[[ "$closed" == abandoned ]] || { echo 'FAIL P8 attempt not sealed by P5';exit 1; }
n=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$attempt25')->'questions')")
[[ "$n" == 0 ]] || { echo 'FAIL abandoned adaptive payload exposed snapshot';exit 1; }
echo 'PASS P5 abandonment privacy preserved for P8 adaptive'
echo 'PASS P8 server progression and isolation on disposable PostgreSQL; production untouched'


# Validate the owner-run read-only post-migration footprint and readiness
# query against the disposable P8 database (NOT production Supabase).
readiness_report=$(psql -X -v ON_ERROR_STOP=1 -A -t -f supabase/P8_VERIFY_READ_ONLY.sql)
if printf '%s\n' "$readiness_report" | grep -Eq '\|(MISSING|FAIL_[A-Z_]+)(\||$)'; then
 echo 'FAIL P8 read-only SQL Editor audit on disposable PostgreSQL'
 printf '%s\n' "$readiness_report"
 exit 1
fi
if ! printf '%s\n' "$readiness_report" | grep -Fq 'P8_RPC|lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)|PASS'; then
 echo 'FAIL P8 start RPC not confirmed by post-migration read-only audit';exit 1
fi
if ! printf '%s\n' "$readiness_report" | grep -Fq 'P8_PRIVATE_TABLE|lms_practice_adaptive_state|PASS'; then
 echo 'FAIL P8 private table was not confirmed by post-migration read-only audit';exit 1
fi
if ! printf '%s\n' "$readiness_report" | grep -Fq 'P8_COURSE_READINESS|asp|'; then
 echo 'FAIL P8 ASP bank pool not present in post-migration readiness output';exit 1
fi
echo 'PASS P8 read-only catalog, private RLS and eligible ASP pool audit on ephemeral PostgreSQL'
