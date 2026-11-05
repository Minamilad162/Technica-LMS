#!/usr/bin/env bash
# P13 Admin Tools: disposable GitHub PostgreSQL ONLY after synthetic P10/P11.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
trial=00000000-0000-0000-0000-000000000004
anon=00000000-0000-0000-0000-000000000000
run_as(){
 local role="$1" uid="$2" sql="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c \
 "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $sql; COMMIT;" | tail -n 1
}
fingerprint(){
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_profiles)::text||'|'||
 (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
 (SELECT count(*) FROM public.lms_questions)::text||'|'||
 (SELECT count(*) FROM public.lms_lesson_progress)::text||'|'||
 (SELECT count(*) FROM public.lms_practice_attempts)::text||'|'||
 (SELECT count(*) FROM public.lms_p10_mock_attempts)::text||'|'||
 (SELECT count(*) FROM public.lms_audit_events)::text"
}
before=$(fingerprint)
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611050003_p13_admin_tools_analytics_read_only.sql
after=$(fingerprint)
[[ "$before" == "$after" ]] || { echo 'FAIL P13 migration changed protected user, question or attempt data'; exit 1; }
for fn in "public.lms_p13_admin_overview()" "public.lms_p13_admin_users('',20,0)" "public.lms_p13_admin_user_detail('$paid')";do
 if run_as anon "$anon" "SELECT $fn" >/dev/null 2>&1;then
  echo 'FAIL P13 anonymous Admin API allowed';exit 1
 fi
 if run_as authenticated "$paid" "SELECT $fn" >/dev/null 2>&1;then
  echo 'FAIL P13 paid learner accessed Admin API';exit 1
 fi
 if run_as authenticated "$trial" "SELECT $fn" >/dev/null 2>&1;then
  echo 'FAIL P13 trial learner accessed Admin API';exit 1
 fi
done
dashboard=$(run_as authenticated "$admin" "SELECT public.lms_p13_admin_overview()")
echo "$dashboard" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["version"]=="p13-v1"
assert len(x["trend"])==6
assert len(x["courses"])>=1
k=x["kpis"]
assert k["users"]>=4 and k["activeAccounts"]>=3
assert k["publishedCourses"]<=k["courses"]
assert k["practiceApproved"]+k["mockReserved"]<=k["questions"]
assert k["verifiedRevenue"] is None and k["currency"] is None
assert k["revenueTracked"] is False
assert all(set(y)=={"month","registrations","practice","mock"} for y in x["trend"])
assert all(y["month"].count("-")==1 for y in x["trend"])
assert not any(key in x for key in ("correctIndex","options","questionText"))
'
directory=$(run_as authenticated "$admin" "SELECT public.lms_p13_admin_users('',20,0)")
echo "$directory" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["version"]=="p13-v1"
assert x["total"]>=4
assert len(x["users"])<=20
assert all("email" not in p and "password" not in p for p in x["users"])
assert all(p["activePlans"]>=0 for p in x["users"])
'
detail=$(run_as authenticated "$admin" "SELECT public.lms_p13_admin_user_detail('$paid')")
echo "$detail" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["version"]=="p13-v1"
assert x["profile"]["status"]=="active"
assert x["revenueAvailable"] is False
assert "password" not in json.dumps(x)
assert "correctIndex" not in json.dumps(x)
assert all(i["amountPaid"] is None and i["currency"] is None and i["paymentRecorded"] is False for i in x["entitlements"])
assert x["practice"]["completed"]>=0 and x["mock"]["completed"]>=0
'
if run_as authenticated "$admin" "SELECT public.lms_p13_admin_user_detail('99999999-9999-9999-9999-999999999999')" >/dev/null 2>&1;then
 echo 'FAIL P13 nonexistent learner metadata accessible';exit 1
fi
if run_as authenticated "$admin" "SELECT public.lms_p13_admin_users('',500,0)" >/dev/null 2>&1;then
 echo 'FAIL P13 unlimited directory read allowed';exit 1
fi
if run_as authenticated "$admin" "SELECT public.lms_p13_admin_users(NULL,20,0)" >/dev/null 2>&1;then
 echo 'FAIL P13 null search allowed';exit 1
fi
final=$(fingerprint)
[[ "$before" == "$final" ]] || { echo 'FAIL P13 report mutated existing bank/learner records';exit 1; }
echo 'PASS P13 Admin-only read-only dynamic KPIs, 6-month trends, real plans/progress and no verified billing amounts (0 DB mutations).'
