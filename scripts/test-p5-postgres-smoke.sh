#!/usr/bin/env bash
# Disposable PostgreSQL P5 permission and abandonment assertions.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611030001_p5_fullscreen_attempt_exit.sql

run_as() {
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -q -t -A -c  "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}
paid=00000000-0000-0000-0000-000000000003
other=00000000-0000-0000-0000-000000000004
course=10000000-0000-0000-0000-000000000001
req=99999999-9999-9999-9999-999999999999
attempt=$(run_as authenticated "$paid"  "SELECT public.lms_p4_start_practice('$course','quick10',10,'$req',NULL,0)->>'attemptId'")
if [[ ! "$attempt" =~ ^[a-f0-9-]{36}$ ]]; then echo "FAIL: invalid attempt";exit 1;fi
q=$(run_as authenticated "$paid"  "SELECT public.lms_p4_attempt_payload('$attempt')->'questions'->0->>'id'")
[[ "$q" =~ ^[a-f0-9-]{36}$ ]] || { echo 'FAIL missing quiz question';exit 1; }
run_as authenticated "$paid"  "SELECT public.lms_p4_save_answer('$attempt','$q',0)->>'saved'" >/dev/null
if run_as authenticated "$other"  "SELECT public.lms_p5_abandon_practice('$attempt')" >/dev/null 2>&1; then
 echo 'FAIL cross-user can abandon attempt';exit 1
fi
echo 'PASS cross-user abandon denied'
closed=$(run_as authenticated "$paid"  "SELECT public.lms_p5_abandon_practice('$attempt')->>'state'")
[[ "$closed" == abandoned ]] || { echo 'FAIL state not abandoned';exit 1; }
again=$(run_as authenticated "$paid"  "SELECT public.lms_p5_abandon_practice('$attempt')->>'state'")
[[ "$again" == abandoned ]] || { echo 'FAIL abandon not idempotent';exit 1; }
echo 'PASS exit closes and idempotently seals attempt'
n=$(run_as authenticated "$paid"  "SELECT jsonb_array_length(public.lms_p4_attempt_payload('$attempt')->'questions')")
[[ "$n" == 0 ]] || { echo 'FAIL abandoned attempt exposes questions';exit 1; }
leak=$(run_as authenticated "$paid"  "SELECT public.lms_p4_attempt_payload('$attempt')::text LIKE '%correctIndex%'")
[[ "$leak" == f ]] || { echo 'FAIL abandoned attempt leaks answer index';exit 1; }
echo 'PASS abandoned attempt redacts question and answer bank'
n2=$(run_as authenticated "$paid"  "SELECT jsonb_array_length(public.lms_p4_finish_practice('$attempt')->'questions')")
[[ "$n2" == 0 ]] || { echo 'FAIL finish bypasses abandonment';exit 1; }
if run_as authenticated "$paid"  "SELECT public.lms_p4_save_answer('$attempt','$q',1)" >/dev/null 2>&1; then
 echo 'FAIL answer accepted after fullscreen exit';exit 1
fi
echo 'PASS grading endpoint and answer mutation cannot reopen sealed attempt'
if run_as anon 00000000-0000-0000-0000-000000000000  "SELECT public.lms_p5_abandon_practice('$attempt')" >/dev/null 2>&1; then
 echo 'FAIL anonymous may call abandonment RPC';exit 1
fi
echo 'PASS anonymous cannot invoke abandonment RPC'
# The old idempotency request cannot generate a second active quiz.
old=$(run_as authenticated "$paid"  "SELECT public.lms_p4_start_practice('$course','quick10',10,'$req',NULL,0)->>'state'")
[[ "$old" == abandoned ]] || { echo 'FAIL retry resurrects abandoned session';exit 1; }
echo 'PASS abandoned idempotent start cannot be resurrected'
echo 'PASS P5 fullscreen-exit SQL data privacy on disposable Postgres; real Supabase device/JWT remains pending'


# Validate the unified READ-ONLY catalog checker on ephemeral P1/P2/P4/P5 PostgreSQL.
# This validates query syntax and expected schema fingerprint, NOT live Supabase.
audit_output=$(psql -X -v ON_ERROR_STOP=1 -A -t -f supabase/P4_P5_VERIFY_ALL_READ_ONLY.sql)
if printf '%s\n' "$audit_output" | grep -Eq '\|(FAIL|MISSING)\|'; then
 echo "FAIL unified P4/P5 read-only catalog audit on disposable Postgres"
 printf '%s\n' "$audit_output"
 exit 1
fi
if ! printf '%s\n' "$audit_output" | grep -Fq 'P5|payload:abandoned_snapshot_redaction|PASS|'; then
 echo "FAIL P5 abandonment redaction fingerprint not verified"
 exit 1
fi
if ! printf '%s\n' "$audit_output" | grep -Fq 'P4|rpc:lms_p4_start_practice(uuid,text,integer,uuid,uuid,integer)|PASS|'; then
 echo "FAIL P4 authenticated practice RPC not verified"
 exit 1
fi
echo 'PASS unified P1/P2/P4/P5 READ-ONLY SQL audit against disposable Postgres'
