#!/usr/bin/env bash
# P9C: SELECT-ONLY inventory of SYNTHETIC disposable PostgreSQL fixtures.
# Run in GitHub Actions after P9A ("pre") and after P9B ("post").
# No migrations or data writes. Never connect this script to real Supabase.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
phase="${1:-}"
if [[ "$phase" != pre && "$phase" != post ]];then
 echo "Usage: bash scripts/test-p9c-postgres-smoke.sh pre|post";exit 2
fi

# Preserve a checksum of private ASP question/review/attempt/audit/Mock rows.
# Only compare; never expose live source IDs, answers or reviewer data.
fingerprint(){
 psql -X -v ON_ERROR_STOP=1 -A -t -c "
 SELECT
 (SELECT count(*)::text||'|'||
  coalesce(md5(string_agg(q.id::text||q.approval_state||q.difficulty||
   q.mock_exclusive::text||coalesce(q.domain_id::text,''),
   ',' ORDER BY q.id)),'') FROM public.lms_questions q)
 ||':'||
 (SELECT count(*)::text||'|'||
  coalesce(md5(string_agg(r.question_id::text||r.review_state||
  r.answer_checked::text||r.rights_checked::text,
  ',' ORDER BY r.question_id)),'') FROM public.lms_p6_question_reviews r)
 ||':'||
 (SELECT count(*) FROM public.lms_practice_attempt_items)::text
 ||':'||
 (SELECT count(*) FROM public.lms_audit_events)::text"
}
before=$(fingerprint)
schema_report=$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' \
 -f supabase/P9C_SCHEMA_PREFLIGHT_READ_ONLY.sql)
for required in \
 'CORE_REQUIRED|P1: courses|PRESENT|' \
 'CORE_REQUIRED|P4: private ASP questions|PRESENT|' \
 'CORE_REQUIRED|P6A: private human reviews|PRESENT|' \
 'ADAPTIVE_POLICY|P8e: fixed correct target column|PRESENT|';do
 if ! printf '%s\n' "$schema_report" | grep -Fq "$required";then
  echo "FAIL P9C schema preflight missing $required";exit 1
 fi
done
report=$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' \
 -f supabase/P9C_ASP_BANK_AUDIT_READ_ONLY.sql)
after=$(fingerprint)
[[ "$before" == "$after" ]] || {
 echo 'FAIL P9C changed protected questions/reviews/attempts/audit content';exit 1
}
for expected in \
 '00_CONTEXT|ASP course records|ASP|1|1|PASS' \
 '01_SOURCE|Imported ASP question rows|ASP|' \
 '|1625|REFERENCE_ONLY|' \
 '05_ASP11|Official ASP11 domains installed|ASP|9|9|PASS' \
 '06_PRACTICE|Runtime eligible approved non-Mock|ASP|' \
 '06_PRACTICE|Governance-verified approved non-Mock|ASP|' \
 '07_MOCK|Eligible reviewed unused Draft Mock candidates|ASP|' \
 '08_TIER|Governed approved non-Mock|low|' \
 '08_TIER|Governed approved non-Mock|medium|' \
 '08_TIER|Governed approved non-Mock|high|';do
 if ! printf '%s\n' "$report" | grep -Fq "$expected";then
  echo "FAIL P9C report missing $expected";exit 1
 fi
done
rows=$(printf '%s\n' "$report" | grep -c '^09_DOMAIN|Governed approved per official Domain/Tier|')
[[ "$rows" == 27 ]] || { echo "FAIL P9C should show 27 official domain/tier rows, got $rows";exit 1; }

if [[ "$phase" == pre ]];then
 if ! printf '%s\n' "$schema_report" | grep -Fq \
  'OPTIONAL_GOVERNANCE|P9B: private Mock forms|MISSING|';then
  echo 'FAIL P9C should tolerate P9B not yet installed';exit 1
 fi
 if ! printf '%s\n' "$report" | grep -Fq \
  '07_MOCK|P9B form schema installed|ASP|0|1|NOT_INSTALLED|';then
  echo 'FAIL P9C optional-Mock pre-install audit did not fail safely';exit 1
 fi
 echo 'PASS P9C PRE-P9B: read-only real-schema audit on synthetic ASP data works without any Mock form'
else
 if ! printf '%s\n' "$schema_report" | grep -Fq \
  'OPTIONAL_GOVERNANCE|P9B: private Mock forms|PRESENT|';then
  echo 'FAIL P9C does not recognize installed private P9B form';exit 1
 fi
 if ! printf '%s\n' "$report" | grep -Fq \
  '07_MOCK|P9B form schema installed|ASP|1|1|SCHEMA_PRESENT|';then
  echo 'FAIL P9C audit did not recognize P9B schema';exit 1
 fi
 if ! printf '%s\n' "$report" | grep -Fq \
  '07_MOCK|Currently Mock-flagged questions|ASP|200|200|FLAGS_ONLY|';then
  echo 'FAIL P9C must count exactly 200 Mock flags without claiming Mock engine active';exit 1
 fi
 if ! printf '%s\n' "$report" | grep -Fq \
  '07_MOCK|Mock-flagged approved questions|ASP|0|0|PASS|';then
  echo 'FAIL approved Mock-exclusive items should be absent from fixture';exit 1
 fi
 echo 'PASS P9C POST-P9B: 200 flags and immutable form detected, no Mock engine inferred'
fi
if [[ "$phase" == post ]];then
 decision_before=$(fingerprint)
 decision=$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' \\
  -f supabase/P9C_DECISION_SUMMARY_READ_ONLY.sql)
 decision_after=$(fingerprint)
 [[ "$decision_before" == "$decision_after" ]] || {
  echo 'FAIL P9C decision summary altered protected source rows';exit 1
 }
 for expected in \\
  '01_BANK|Actual ASP questions|' \\
  '02_QUALITY|Approved Practice governance gaps|' \\
  '03_DOMAINS|Official ASP11 domains|9|9|COUNT_OK|' \\
  '04_PRACTICE|Approved Low question pool|' \\
  '04_PRACTICE|Rights-reviewed Low pool|' \\
  '05_MOCK|Actual versioned Mock forms|1|1|FORM_EXISTS|' \\
  '05_MOCK|Items inside Mock form|200|200|FORM_ITEMS_ONLY|' \\
  '05_MOCK|Mock-exclusive source flags|200|200|FLAGS_ONLY|' \\
  '06_RELEASE|Formal Mock exam engine active|0|1|NOT_IMPLEMENTED|';do
  if ! printf '%s\\n' "$decision" | grep -Fq "$expected";then
   echo "FAIL P9C concise decision status missing: $expected";exit 1
  fi
 done
 echo 'PASS P9C concise decision: real schema, Mock form 200 vs no engine, rights-reviewed Practice counts, zero data changes'
fi
echo 'PASS P9C private bank fingerprint unchanged after catalog/count-only reports'
