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


# The SQL Editor diagnostic must also PASS against disposable P1/P2/P4/P5/P6.
# This is a catalog-only SELECT, never a live Supabase command.
connection_report=$(psql -X -v ON_ERROR_STOP=1 -A -t -f supabase/P6A_VERIFY_READ_ONLY.sql)
if printf '%s\n' "$connection_report" | grep -Eq '\|(MISSING|FAIL)\|'; then
 echo 'FAIL P6A read-only SQL Editor footprint check on disposable PostgreSQL'
 printf '%s\n' "$connection_report"
 exit 1
fi
if ! printf '%s\n' "$connection_report" | grep -Fq 'P6A|rpc:lms_p6_bank_summary(uuid)|PASS|'; then
 echo 'FAIL P6A review RPC not confirmed by read-only footprint'
 exit 1
fi
echo 'PASS P6A read-only SQL Editor footprint on disposable PostgreSQL'


# Test the actual FOUR pilot account-role SQL on the SAME disposable PostgreSQL.
# Supabase Auth itself is not mocked for passwords; only its user metadata
# (with four verified identities) and Technica P1 role constraints are tested.
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
ALTER TABLE auth.users
  ADD COLUMN email text,
  ADD COLUMN email_confirmed_at timestamptz;
INSERT INTO auth.users(id,raw_user_meta_data,email,email_confirmed_at) VALUES
 ('77777777-0000-0000-0000-000000000001','{}','qa-admin-1@pilot.invalid',now()),
 ('77777777-0000-0000-0000-000000000002','{}','qa-admin-2@pilot.invalid',now()),
 ('77777777-0000-0000-0000-000000000003','{}','qa-learner-1@pilot.invalid',now()),
 ('77777777-0000-0000-0000-000000000004','{}','qa-learner-2@pilot.invalid',now());
SQL
pilot_sql=$(mktemp)
trap 'rm -f "$pilot_sql"' EXIT
sed -e 's/admin1@replace-me.invalid/qa-admin-1@pilot.invalid/g' \
    -e 's/admin2@replace-me.invalid/qa-admin-2@pilot.invalid/g' \
    -e 's/learner1@replace-me.invalid/qa-learner-1@pilot.invalid/g' \
    -e 's/learner2@replace-me.invalid/qa-learner-2@pilot.invalid/g' \
  supabase/PILOT_2_ADMIN_2_LEARNER_ASSIGN.sql > "$pilot_sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$pilot_sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$pilot_sql"
admins=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_role_assignments a JOIN auth.users u ON u.id=a.user_id WHERE u.email LIKE 'qa-admin-%@pilot.invalid' AND a.role='admin' AND a.revoked_at IS NULL")
learners=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_profiles p JOIN auth.users u ON u.id=p.id WHERE u.email LIKE 'qa-learner-%@pilot.invalid' AND p.account_status='active' AND NOT EXISTS(SELECT 1 FROM public.lms_role_assignments a WHERE a.user_id=u.id AND a.revoked_at IS NULL)")
[[ "$admins" == 2 && "$learners" == 2 ]] || {
 echo "FAIL four-account pilot expected exactly 2 Admin + 2 Learner, got $admins/$learners";exit 1;
}
echo 'PASS four-user owner-run SQL: two verified Admin, two nonprivileged Learners; idempotent on disposable PostgreSQL'
