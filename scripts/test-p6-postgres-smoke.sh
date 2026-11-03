#!/usr/bin/env bash
# Disposable PostgreSQL P6A ASP admin-review security and zero-publication tests.
# Called after P1/P2/P4/P5 fixture smoke in GitHub Actions. NEVER points to Supabase.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611030002_p6a_asp_review_workbench.sql

run_as() {
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c \
  "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000001
if run_as authenticated "$paid" "SELECT public.lms_p6_bank_summary('$course')" >/dev/null 2>&1; then
 echo 'FAIL learner sees protected admin question summary';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p6_list_questions('$course','all',20,0)" >/dev/null 2>&1; then
 echo 'FAIL learner sees review queue and answer keys';exit 1
fi
if run_as anon 00000000-0000-0000-0000-000000000000 "SELECT public.lms_p6_seed_asp11_domains('$course')" >/dev/null 2>&1; then
 echo 'FAIL anonymous may add ASP domains';exit 1
fi
if run_as authenticated "$paid" "SELECT count(*) FROM public.lms_p6_question_reviews" >/dev/null 2>&1; then
 echo 'FAIL learner directly reads review decisions';exit 1
fi
echo 'PASS P6A review endpoints and private rows reject learner/anonymous roles'

count=$(run_as authenticated "$admin" "SELECT public.lms_p6_seed_asp11_domains('$course')->>'asp11Domains'")
[[ "$count" == 9 ]] || { echo "FAIL official 9 domain catalog: $count";exit 1; }
repeated=$(run_as authenticated "$admin" "SELECT public.lms_p6_seed_asp11_domains('$course')->>'asp11Domains'")
[[ "$repeated" == 9 ]] || { echo "FAIL non-idempotent ASP11 domain setup: $repeated";exit 1; }
echo 'PASS admin explicitly provisions nine official ASP11 domains idempotently'

draft=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT id FROM public.lms_questions WHERE source_id='DRAFT'")
domain=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT id FROM public.lms_domains WHERE course_id='$course' AND slug='asp11-01'")
wrong=20000000-0000-0000-0000-000000000002
if run_as authenticated "$admin" "SELECT public.lms_p6_review_question('$draft','$wrong','low',true,true,'Wrong course')" >/dev/null 2>&1; then
 echo 'FAIL cross-course domain mapping accepted';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p6_review_question('$draft','$domain','low',true,true,'Role bypass')" >/dev/null 2>&1; then
 echo 'FAIL learner may forge review decision';exit 1
fi
if run_as authenticated "$admin" "SELECT public.lms_p6_review_question('$draft','$domain','low',true,false,'No rights')" | grep -Fq '"reviewState": "ready"'; then
 echo 'FAIL unverified rights marked READY';exit 1
fi
pending=$(run_as authenticated "$admin" \
 "SELECT public.lms_p6_review_question('$draft','$domain','low',true,false,'Pending rights')->>'reviewState'")
[[ "$pending" == needs_revision ]] || { echo "FAIL unverified rights state: $pending";exit 1; }
ready=$(run_as authenticated "$admin" \
 "SELECT public.lms_p6_review_question('$draft','$domain','low',true,true,'Verified SME audit')->>'reviewState'")
[[ "$ready" == ready ]] || { echo "FAIL full review not READY: $ready";exit 1; }
echo 'PASS review requires official domain, difficulty, verified answer and rights'

saved=$(run_as authenticated "$admin" \
 "SELECT public.lms_p6_bank_summary('$course')->>'readyToReview'")
[[ "$saved" == 1 ]] || { echo "FAIL ready count: $saved";exit 1; }
selected=$(run_as authenticated "$admin" \
 "SELECT public.lms_p6_list_questions('$course','ready',20,0)->>'total'")
[[ "$selected" == 1 ]] || { echo "FAIL ready filter count: $selected";exit 1; }
current=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT approval_state||'|'||mock_exclusive||'|'||coalesce(domain_id::text,'NULL')||'|'||difficulty FROM public.lms_questions WHERE id='$draft'")
[[ "$current" == 'draft|false|NULL|unclassified' ]] || {
 echo "FAIL review unexpectedly published or remapped source question: $current";exit 1;
}
if run_as authenticated "$admin" "SELECT public.lms_p6_review_question((SELECT id FROM public.lms_questions WHERE source_id='P4-1'),'$domain','low',true,true,'Already live')" >/dev/null 2>&1; then
 echo 'FAIL approved question edited by review workflow';exit 1
fi
echo 'PASS review remains separate and cannot publish or mutate active P4 source questions'
echo 'PASS P6A ASP review queue on disposable Postgres; live Supabase/JWT/device remain pending'
