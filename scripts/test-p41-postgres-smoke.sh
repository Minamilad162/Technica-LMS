#!/usr/bin/env bash
# P41 is applied AFTER P21 tests on disposable CI PostgreSQL, not to production.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
ADMIN='00000000-0000-0000-0000-000000000001'
LEARNER='00000000-0000-0000-0000-000000000002'
C2='10000000-0000-0000-0000-000000000002'
LESSON='40000000-0000-0000-0000-000000000002'
DRAFT='10000000-0000-0000-0000-000000000099'
before=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT (SELECT count(*) FROM public.lms_entitlements)::text||'|'||(SELECT count(*) FROM public.lms_courses)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611080007_p41_open_access_showcase.sql
after=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT (SELECT count(*) FROM public.lms_entitlements)::text||'|'||(SELECT count(*) FROM public.lms_courses)::text")
[[ "$before" == "$after" ]] || { echo 'FAIL P41 altered existing courses or entitlements'; exit 1; }
query_as(){
 local role="$1" uid="$2" sql="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN; SET LOCAL ROLE $role;
 SET LOCAL request.jwt.claim.sub='$uid'; $sql; ROLLBACK;" |
  grep -E '^(t|f|true|false)$' | tail -n 1 | sed 's/^t$/true/;s/^f$/false/'
}
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p41_open_access()")" == true ]] || { echo 'FAIL active learner open mode'; exit 1; }
[[ "$(query_as anon 00000000-0000-0000-0000-000000000000 "SELECT public.lms_p1_course_entitled('$C2')")" == false ]] || { echo 'FAIL anonymous access'; exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p1_course_entitled('$C2')")" == true ]] || { echo 'FAIL published Course access'; exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p1_can_view_lesson('$LESSON')")" == true ]] || { echo 'FAIL published lesson access'; exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == true ]] || { echo 'FAIL published Practice access'; exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "INSERT INTO public.lms_courses(id,slug,title,publication_state)
 VALUES('$DRAFT','p41-locked-draft','P41 private Draft','draft')" >/dev/null
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p1_course_entitled('$DRAFT')")" == false ]] || { echo 'FAIL Draft leaked'; exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$DRAFT')")" == false ]] || { echo 'FAIL Draft Practice leaked'; exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN;SET LOCAL ROLE authenticated;
 SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p41_set_open_access(false);ROLLBACK;" >/dev/null 2>&1; then
 echo 'FAIL learner changed access mode';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN; SET LOCAL ROLE authenticated;
 SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p41_set_open_access(false);COMMIT;" >/dev/null
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p41_open_access()")" == false ]] || { echo 'FAIL Admin access disable';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == false ]] || { echo 'FAIL old subscription lock not restored';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN; SET LOCAL ROLE authenticated;
 SET LOCAL request.jwt.claim.sub='$ADMIN'; SELECT public.lms_p41_set_open_access(true);COMMIT;" >/dev/null
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == true ]] || { echo 'FAIL reopen';exit 1; }
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT count(*) FROM public.lms_audit_events WHERE event_type='p41_access_mode_changed'")" == 2 ]] || { echo 'FAIL audit log';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611080007_p41_open_access_showcase.sql >/dev/null 2>&1;then
 echo 'FAIL unsafe migration replay'; exit 1
fi
echo 'PASS P41: active authenticated open access, anon/Draft denied, Admin-only toggle, old paywall restored and audited.'
