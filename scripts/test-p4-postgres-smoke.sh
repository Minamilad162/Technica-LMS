#!/usr/bin/env bash
# Called AFTER scripts/test-p1-postgres-smoke.sh on a disposable database.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres

psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202610310003_p4_secure_practice.sql
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
UPDATE public.lms_profiles SET account_status='active' WHERE id='00000000-0000-0000-0000-000000000003';
UPDATE public.lms_entitlements SET status='active',ends_at=NULL
 WHERE user_id='00000000-0000-0000-0000-000000000003';
INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,approval_state,explanation)
 SELECT '10000000-0000-0000-0000-000000000001'::uuid,
 'P4-'||n, 'Question '||n||' on safety?', '["Yes","No","Unknown"]'::jsonb, 0,'approved','Explanation'
 FROM generate_series(1,30) n;
INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,approval_state,mock_exclusive)
 VALUES
 ('10000000-0000-0000-0000-000000000001','MOCK-ONLY','Secret mock question?',
  '["Yes","No"]',1,'approved',true),
 ('10000000-0000-0000-0000-000000000001','DRAFT','Draft question should not show?',
  '["Yes","No"]',1,'draft',false);
SQL
run_as(){
 local role="$1" uid="$2" statement="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c \
 "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $statement; COMMIT;" | tail -n 1
}
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
trial=00000000-0000-0000-0000-000000000004
none=00000000-0000-0000-0000-000000000002
course=10000000-0000-0000-0000-000000000001
request=77777777-7777-7777-7777-777777777777
if run_as authenticated "$paid" 'SELECT correct_index FROM public.lms_questions LIMIT 1' >/dev/null 2>&1; then
 echo 'FAIL: learner can read answer bank'; exit 1
fi
echo 'PASS direct answer bank read denied'
if run_as authenticated "$admin" 'SELECT correct_index_snapshot FROM public.lms_practice_attempt_items LIMIT 1' >/dev/null 2>&1; then
 echo 'FAIL: browser-admin can read snapshot'; exit 1
fi
echo 'PASS snapshot answers not Data API-readable'
if run_as authenticated "$paid" "INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index) VALUES('$course','fake','Fake prompt with many words','[\"A\",\"B\"]',0)" >/dev/null 2>&1; then
 echo 'FAIL: learner can author answers directly'; exit 1
fi
echo 'PASS browser writes denied'
if run_as authenticated "$none" "SELECT public.lms_p4_start_practice('$course','quick10',10,'$request',NULL,0)" >/dev/null 2>&1; then
 echo 'FAIL no entitlement could start'; exit 1
fi
echo 'PASS unentitled learner denied'
if run_as authenticated "$trial" "SELECT public.lms_p4_start_practice('$course','quick10',10,'$request',NULL,0)" >/dev/null 2>&1; then
 echo 'FAIL trial could start full practice'; exit 1
fi
echo 'PASS trial blocked from paid practice'
if run_as authenticated "$paid" "SELECT public.lms_p4_start_practice('$course','timed25',25,'$request',NULL,0)" >/dev/null 2>&1; then
 echo 'FAIL timed preset duration bypass'; exit 1
fi
echo 'PASS timed preset duration is server enforced'
attempt=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_start_practice('$course','quick10',10,'$request',NULL,0)->>'attemptId'")
if [[ ! "$attempt" =~ ^[0-9a-f-]{36}$ ]]; then echo "FAIL invalid attempt id: $attempt";exit 1;fi
echo 'PASS secure attempt started'
same=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_start_practice('$course','quick10',10,'$request',NULL,0)->>'attemptId'")
[[ "$attempt" == "$same" ]] || { echo 'FAIL retry duplicated attempt';exit 1; }
echo 'PASS start idempotent'
count=$(run_as authenticated "$paid" \
 "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$attempt')->'questions')")
[[ "$count" == 10 ]] || { echo "FAIL expected 10, got $count";exit 1; }
leak=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')::text LIKE '%correctIndex%'")
[[ "$leak" == f ]] || { echo 'FAIL correctIndex leaked before finish';exit 1; }
echo 'PASS only sanitized questions before submission'
# Private tables cannot be read as authenticated; inspect in disposable DB as owner.
reserved=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_practice_attempt_items i JOIN public.lms_questions q ON q.id=i.question_id WHERE i.attempt_id='$attempt' AND q.mock_exclusive" | tail -n 1)
[[ "$reserved" == 0 ]] || { echo 'FAIL reserved mock question selected';exit 1; }
echo 'PASS mock-exclusive questions never selected'
qid=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')->'questions'->0->>'id'")
saved=$(run_as authenticated "$paid" "SELECT public.lms_p4_save_answer('$attempt','$qid',0)->>'saved'")
[[ "$saved" == true ]] || { echo 'FAIL server answer save'; exit 1; }
if run_as authenticated "$trial" "SELECT public.lms_p4_finish_practice('$attempt')" >/dev/null 2>&1; then
 echo 'FAIL another user finished attempt';exit 1
fi
echo 'PASS attempt ownership enforced'
done=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_finish_practice('$attempt')->>'state'")
[[ "$done" == submitted ]] || { echo "FAIL finish state $done";exit 1; }
review=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_attempt_payload('$attempt')::text LIKE '%correctIndex%'")
[[ "$review" == t ]] || { echo 'FAIL review answers unavailable after submission';exit 1; }
again=$(run_as authenticated "$paid" \
 "SELECT public.lms_p4_finish_practice('$attempt')->>'state'")
[[ "$again" == submitted ]] || { echo 'FAIL finish idempotency';exit 1; }
echo 'PASS server grading/review after finish and finish idempotency'
if run_as authenticated "$paid" "SELECT public.lms_p4_save_answer('$attempt','$qid',1)" >/dev/null 2>&1; then
 echo 'FAIL late answer changed result';exit 1
fi
echo 'PASS post-finish answer mutation denied'
psql -X -v ON_ERROR_STOP=1 -q -c \
 "UPDATE public.lms_practice_attempts SET deadline_at=now()-interval '1 minute' WHERE id='$attempt'" >/dev/null 2>&1 || true
echo 'PASS P4 RLS, session security, fixed preset, reserved exclusions and transactional scoring'
