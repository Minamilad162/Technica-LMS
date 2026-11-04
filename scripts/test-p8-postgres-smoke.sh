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

# Install P8d on disposable PostgreSQL, preserving an in-progress P8 attempt.
# This specifically proves the owner-approved future migration won't silently
# change the logic for anyone already midway through a Practice session.
legacyreq=81234567-0000-0000-0000-000000000004
legacy=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$legacyreq',NULL,0)->>'attemptId'")
legacycp=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT checkpoint_size FROM public.lms_practice_adaptive_state WHERE attempt_id='$legacy'")
[[ "$legacycp" == 6 ]] || { echo "FAIL legacy 20% gate not captured before delta: $legacycp";exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611040003_p8d_adaptive_thirds.sql
legacycheck=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT checkpoint_size||'|'||coalesce(medium_checkpoint_size::text,'NULL') FROM public.lms_practice_adaptive_state WHERE attempt_id='$legacy'")
[[ "$legacycheck" == '6|NULL' ]] || { echo "FAIL changed in-flight legacy checkpoint $legacycheck";exit 1; }
for i in $(seq 0 5);do
 id=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$legacy')->'questions'->$i->>'id'")
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$legacy','$id',0)" >/dev/null
done
legacytier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$legacy'")
[[ "$legacytier" == medium ]] || { echo 'FAIL legacy 6-answer promotion changed midway';exit 1; }
run_as authenticated "$paid" "SELECT public.lms_p5_abandon_practice('$legacy')" >/dev/null
echo 'PASS old in-progress P8 session retains original stored 20% threshold after P8d delta'

for n in 10 25 30 50; do
 checkpoint=$(( n / 3 ))
 (( checkpoint < 1 )) && checkpoint=1
 medium_checkpoint=$(( (n - checkpoint) / 2 ))
 (( medium_checkpoint < 1 )) && medium_checkpoint=1
 ready=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'ready'")
 [[ "$ready" == true ]] || { echo "FAIL P8 not ready for $n questions";exit 1; }
 actual=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'checkpoint'")
 [[ "$actual" == "$checkpoint" ]] || { echo "FAIL one-third Low gate for $n: $actual";exit 1; }
 middle=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'mediumCheckpoint'")
 [[ "$middle" == "$medium_checkpoint" ]] || { echo "FAIL one-third Medium gate for $n: $middle";exit 1; }
 policy=$(run_as authenticated "$paid" \
  "SELECT public.lms_p8_levelup_readiness('$course',$n,NULL)->>'policyVersion'")
 [[ "$policy" == 'thirds-v1' ]] || { echo "FAIL P8d server version for $n: $policy";exit 1; }
done
echo 'PASS balanced third checkpoints for 10/25/30/50 and 70% server gating'

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

# P8d user-locked acceptance: N=30 => 10 LOW, 10 MEDIUM, 10 HIGH
# on an error-free run; 7/10 required at EACH stage; never leak tier mid-run.
req30=81234567-0000-0000-0000-000000000030
a30=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$req30',NULL,0)->>'attemptId'")
newgates=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT checkpoint_size||'|'||medium_checkpoint_size FROM public.lms_practice_adaptive_state WHERE attempt_id='$a30'")
[[ "$newgates" == '10|10' ]] || { echo "FAIL 30-question stored gates $newgates";exit 1; }
for i in $(seq 0 29); do
 id=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$a30')->'questions'->$i->>'id'")
 [[ "$id" =~ ^[a-f0-9-]{36}$ ]] || { echo "FAIL missing new question $i";exit 1; }
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$a30','$id',0)" >/dev/null
 case "$i" in
  8) expected=low;;
  9) expected=medium;;
  18) expected=medium;;
  19|29) expected=high;;
  *) expected='';;
 esac
 if [[ -n "$expected" ]];then
  tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
   "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$a30'")
  [[ "$tier" == "$expected" ]] || { echo "FAIL stage at question $((i+1)) wanted $expected got $tier";exit 1; }
 fi
done
dist30=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FILTER(WHERE q.difficulty='low')||'|'||
 count(*) FILTER(WHERE q.difficulty='medium')||'|'||
 count(*) FILTER(WHERE q.difficulty='high')
 FROM public.lms_practice_attempt_items i JOIN public.lms_questions q ON q.id=i.question_id
 WHERE i.attempt_id='$a30'")
[[ "$dist30" == '10|10|10' ]] || { echo "FAIL ideal 30-question stage distribution $dist30";exit 1; }
total30=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$a30')->'questions')")
[[ "$total30" == 30 ]] || { echo "FAIL completed 30 session had $total30 questions";exit 1; }
if run_as authenticated "$paid" \
 "SELECT public.lms_p8_answer_levelup('$a30',\
 (SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$a30' AND position=30),0)" >/dev/null 2>&1; then
 # An identical-answer retry of question 30 is allowed (idempotent), but it
 # MUST NOT change the question count; check separately instead of failing.
 :;
fi
total30again=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$a30')->'questions')")
[[ "$total30again" == 30 ]] || { echo 'FAIL adaptive exceeded chosen 30 questions';exit 1; }
score30=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_finish_practice('$a30')->>'scorePercent'")
[[ "$score30" == 100.00 ]] || { echo "FAIL perfect 30 score $score30";exit 1; }
echo 'PASS 30 perfect questions split 10/10/10, server-only promotion, cap and score'

# Recovery: 6/10 LOW => stay LOW, then +4 correct => 10/14 = 71.4%
# => MEDIUM. After 7/10 MEDIUM => HIGH. Exactly 30 questions total:
# 14 LOW + 10 MEDIUM + 6 HIGH, all new unique items.
reqrecover=81234567-0000-0000-0000-000000000031
rec=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$reqrecover',NULL,0)->>'attemptId'")
for i in $(seq 0 29); do
 id=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$rec')->'questions'->$i->>'id'")
 if (( i < 6 )); then pick=0
 elif (( i < 10 )); then pick=1
 elif (( i < 14 )); then pick=0
 elif (( i < 21 )); then pick=0
 elif (( i < 24 )); then pick=1
 else pick=0; fi
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$rec','$id',$pick)" >/dev/null
 case "$i" in
  9|12) expected=low;;
  13|22) expected=medium;;
  23|29) expected=high;;
  *) expected='';;
 esac
 if [[ -n "$expected" ]]; then
  tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
   "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$rec'")
  [[ "$tier" == "$expected" ]] || { echo "FAIL recovery at question $((i+1)): $tier vs $expected";exit 1; }
 fi
done
distribution=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FILTER(WHERE q.difficulty='low')||'|'||
 count(*) FILTER(WHERE q.difficulty='medium')||'|'||
 count(*) FILTER(WHERE q.difficulty='high')
 FROM public.lms_practice_attempt_items i JOIN public.lms_questions q ON q.id=i.question_id
 WHERE i.attempt_id='$rec'")
[[ "$distribution" == '14|10|6' ]] || { echo "FAIL recovered 30 question split $distribution";exit 1; }
unique=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(DISTINCT question_id) FROM public.lms_practice_attempt_items WHERE attempt_id='$rec'")
[[ "$unique" == 30 ]] || { echo 'FAIL duplicate question in 30 recovery run';exit 1; }
run_as authenticated "$paid" "SELECT public.lms_p4_finish_practice('$rec')" >/dev/null
echo 'PASS 6/10 remains Low, cumulative 10/14 Low promotes, Medium 7/10 promotes; 30 cap and unique items'

# Even after 30 wrong answers, never force a promotion just to fit quotas.
reqalllow=81234567-0000-0000-0000-000000000032
alllow=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$reqalllow',NULL,0)->>'attemptId'")
for i in $(seq 0 29); do
 id=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$alllow')->'questions'->$i->>'id'")
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$alllow','$id',1)" >/dev/null
done
stilllow=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT tier||'|'||answered_count FROM public.lms_practice_adaptive_state WHERE attempt_id='$alllow'")
[[ "$stilllow" == 'low|30' ]] || { echo "FAIL should stop at 30 LOW questions: $stilllow";exit 1; }
run_as authenticated "$paid" "SELECT public.lms_p4_finish_practice('$alllow')" >/dev/null
echo 'PASS failed Level Up stays Low for all 30 attempts then stops without forcing Hard'

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
# The owner-run P8d SQL Editor audit itself must be SELECT-only and PASS.
p8d_report=$(psql -X -v ON_ERROR_STOP=1 -A -t -f supabase/P8D_VERIFY_READ_ONLY.sql)
if printf '%s\n' "$p8d_report" | grep -Eq '\|(FAIL|FAIL_[A-Z_]+|MISSING)(\||$)'; then
 echo 'FAIL P8d SELECT-only SQL Editor audit against disposable PostgreSQL'
 printf '%s\n' "$p8d_report";exit 1
fi
if ! printf '%s\n' "$p8d_report" | grep -Fq 'P8D_POLICY|30|10|10|10|PASS'; then
 echo 'FAIL P8d 30-question audit did not verify 10/10/10';exit 1
fi
if ! printf '%s\n' "$p8d_report" | grep -Fq 'P8D_STATE_COLUMN|lms_practice_adaptive_state.medium_checkpoint_size|PASS'; then
 echo 'FAIL P8d in-flight-safe nullable state column audit';exit 1
fi
if ! printf '%s\n' "$p8d_report" | grep -Fq 'P8D_HELPER_PERMISSIONS|lms_p8_medium_checkpoint(integer)|PASS'; then
 echo 'FAIL P8d helper is exposed to the browser';exit 1
fi
echo 'PASS P8d SELECT-only policy, in-flight schema, private helper and bank inventory on disposable PostgreSQL'

# --- P8e: fixed 70% of ORIGINAL ten answered, not expanding denominator ---
# Create an in-flight P8d session before the migration so the new version
# cannot rewrite the rules of a learner who is already answering.
old_req=81234567-0000-0000-0000-000000000041
old_id=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$old_req',NULL,0)->>'attemptId'")
for i in $(seq 0 9); do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$old_id')->'questions'->$i->>'id'")
 if (( i < 6 )); then choice=0; else choice=1; fi
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$old_id','$qid',$choice)" >/dev/null
done
old_tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$old_id'")
[[ "$old_tier" == low ]] || { echo 'FAIL P8d old session should stay Low at 6/10'; exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611040004_p8e_fixed_correct_target.sql
old_policy=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT coalesce(promotion_policy,'NULL') FROM public.lms_practice_adaptive_state WHERE attempt_id='$old_id'")
[[ "$old_policy" == NULL ]] || { echo "FAIL P8e changed active session's policy: $old_policy";exit 1; }
for i in $(seq 10 13); do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$old_id')->'questions'->$i->>'id'")
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$old_id','$qid',0)" >/dev/null
 tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
  "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$old_id'")
 if (( i < 13 )); then
  [[ "$tier" == low ]] || { echo "FAIL prior P8d attempt promoted prematurely at $((i+1))";exit 1; }
 else
  [[ "$tier" == medium ]] || { echo 'FAIL prior P8d attempt lost original cumulative rule';exit 1; }
 fi
done
run_as authenticated "$paid" "SELECT public.lms_p5_abandon_practice('$old_id')" >/dev/null
echo 'PASS P8e migration retains existing P8d attempt behavior (6/10 + four correct for 10/14)'

# NEW session: exactly 30, fixed 7 correct out of the first 10 Low
# even if extra question changes the cumulative denominator to 11.
fixed_req=81234567-0000-0000-0000-000000000042
fixed_id=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$fixed_req',NULL,0)->>'attemptId'")
policy=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT promotion_policy||'|'||checkpoint_size||'|'||medium_checkpoint_size
  FROM public.lms_practice_adaptive_state WHERE attempt_id='$fixed_id'")
[[ "$policy" == 'thirds-fixed-correct-v2|10|10' ]] || { echo "FAIL wrong fixed policy: $policy";exit 1; }
for i in $(seq 0 29); do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$fixed_id')->'questions'->$i->>'id'")
 [[ "$qid" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL missing question $((i+1))";exit 1; }
 # Q1..Q10 Low: six right, four wrong. Q11 right -> SEVENTH Low.
 # Q12..Q21 Medium: six right, four wrong. Q22 right -> SEVENTH Medium.
 if (( i < 6 || i==10 || (i>=11 && i<17) || i==21 || i>=22 )); then choice=0
 else choice=1; fi
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$fixed_id','$qid',$choice)" >/dev/null
 case "$i" in
  9) expected=low;; 10) expected=medium;;
  20) expected=medium;; 21|29) expected=high;;
  *) expected='';;
 esac
 if [[ -n "$expected" ]]; then
  tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
   "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$fixed_id'")
  [[ "$tier" == "$expected" ]] || { echo "FAIL at Q$((i+1)): wanted $expected got $tier"; exit 1; }
 fi
done
split=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FILTER(WHERE q.difficulty='low')||'|'||
 count(*) FILTER(WHERE q.difficulty='medium')||'|'||
 count(*) FILTER(WHERE q.difficulty='high')
 FROM public.lms_practice_attempt_items i JOIN public.lms_questions q
 ON i.question_id=q.id WHERE i.attempt_id='$fixed_id'")
[[ "$split" == '11|11|8' ]] || { echo "FAIL fixed correct split: $split";exit 1; }
unique=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(DISTINCT question_id) FROM public.lms_practice_attempt_items
 WHERE attempt_id='$fixed_id'")
[[ "$unique" == 30 ]] || { echo 'FAIL P8e repeated or added questions beyond 30';exit 1; }
run_as authenticated "$paid" "SELECT public.lms_p4_finish_practice('$fixed_id')" >/dev/null
echo 'PASS N30 P8e Low 6/10 + Q11 right promotes, Medium 6/10 + Q22 right promotes; 11/11/8, no duplicates'

# Additional wrong Low at Q11 does NOT increase the target: Q12 right
# is still the seventh correct, and Q13 must be Medium.
recover_req=81234567-0000-0000-0000-000000000043
recover=$(run_as authenticated "$paid" \
 "SELECT public.lms_p8_start_levelup('$course',30,'$recover_req',NULL,0)->>'attemptId'")
for i in $(seq 0 11); do
 qid=$(run_as authenticated "$paid" \
  "SELECT public.lms_p4_attempt_payload('$recover')->'questions'->$i->>'id'")
 if (( i < 6 || i==11 ));then choice=0;else choice=1;fi
 run_as authenticated "$paid" "SELECT public.lms_p8_answer_levelup('$recover','$qid',$choice)" >/dev/null
 if (( i == 10 || i == 11 )); then
  tier=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
   "SELECT tier FROM public.lms_practice_adaptive_state WHERE attempt_id='$recover'")
  if (( i == 10 ));then expected=low;else expected=medium;fi
  [[ "$tier" == "$expected" ]] || { echo "FAIL fixed target 7/12 recovery, expected $expected got $tier";exit 1; }
 fi
done
run_as authenticated "$paid" "SELECT public.lms_p5_abandon_practice('$recover')" >/dev/null
echo 'PASS 6/10 + wrong Q11 + correct Q12 = 7/12 promotes; denominator NEVER raises fixed target'

# Protected state remains unreachable through ordinary browser privileges.
if run_as authenticated "$paid" \
 "SELECT promotion_policy FROM public.lms_practice_adaptive_state LIMIT 1" >/dev/null 2>&1; then
 echo 'FAIL Learner can read internal fixed-correct state';exit 1
fi
echo 'PASS P8e new policy is server-only, old attempts unchanged, no browser privilege expansion'
p8e_report=$(psql -X -v ON_ERROR_STOP=1 -A -t -f supabase/P8E_VERIFY_READ_ONLY.sql)
if printf '%s\n' "$p8e_report" | grep -Eq '\|(FAIL|MISSING)(\||$)';then
 echo 'FAIL P8e read-only SQL audit in disposable Postgres';printf '%s\n' "$p8e_report";exit 1
fi
for required in \
 'P8E_FIXED_TARGET|30|10|10|7|7|PASS' \
 'P8E_PRIVATE_VERSION_COLUMN|lms_practice_adaptive_state.promotion_policy|PASS' \
 'P8E_SERVER_PROMOTION|lms_p8_answer_levelup|PASS' \
 'P8E_NEW_SESSIONS|fixed-correct policy version|PASS'; do
 if ! printf '%s\n' "$p8e_report" | grep -Fq "$required";then
  echo "FAIL P8e audit missing $required";printf '%s\n' "$p8e_report";exit 1
 fi
done
echo 'PASS P8e SELECT-only SQL audit: N30 baseline 10+10, fixed 7+7 correct, RLS and versioned RPCs'



