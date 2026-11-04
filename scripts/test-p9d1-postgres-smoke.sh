#!/usr/bin/env bash
# P9D.1: run ONLY against ephemeral PostgreSQL in CI after P9B synthetic data.
# SQL snapshot selects masked hashes only. NEVER run on or write real Supabase.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres

fingerprint(){
 psql -X -v ON_ERROR_STOP=1 -A -t -c "
 SELECT
 (SELECT count(*)::text||'|'||coalesce(md5(string_agg(
  id::text||approval_state||mock_exclusive::text,
  ',' ORDER BY id)),'') FROM public.lms_questions)
 ||':'||
 (SELECT count(*)::text FROM public.lms_p6_question_reviews)
 ||':'||
 (SELECT count(*)::text FROM public.lms_practice_attempt_items)
 ||':'||
 (SELECT count(*)::text FROM public.lms_audit_events)"
}
before=$(fingerprint)
result=$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' \
 -f supabase/P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql)
after=$(fingerprint)
[[ "$before" == "$after" ]] || {
 echo 'FAIL P9D1 fingerprint SELECT mutated private bank/review/audit data';exit 1
}
actual_rows=$(printf '%s\n' "$result" | grep -c '^P9D1_V1|asp|' || true)
expected_rows=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_questions q
 JOIN public.lms_courses c ON c.id=q.course_id WHERE c.slug='asp'")
[[ "$actual_rows" == "$expected_rows" ]] || {
 echo "FAIL P9D1 export count $actual_rows != expected private ASP rows $expected_rows";exit 1
}
# The synthetic P9B fixture contains explicit unique questions with approved
# safe test strings, so this checks actual Postgres hashing interoperates with
# the Python implementation. Never print any private prompts or hashes.
actual_prompt_hash=$(printf '%s\n' "$result" | awk -F'|' \
 '$3=="P9B-MOCK-001"{print $4}')
expected_prompt_hash=$(python3 -c \
 'import hashlib; print(hashlib.sha256("synthetic reviewed item 1?".encode()).hexdigest())')
[[ "$actual_prompt_hash" == "$expected_prompt_hash" ]] || {
 echo 'FAIL P9D1 normalized prompt SHA256 disagrees with Python';exit 1
}
# All 3 expected digest columns must have 64 hex characters for EVERY row.
bad=$(printf '%s\n' "$result" | awk -F'|' \
 'NF!=9 || $4 !~ /^[0-9a-f]{64}$/ || $5 !~ /^[0-9a-f]{64}$/ || $6 !~ /^[0-9a-f]{64}$/ {n++} END {print n+0}')
# mawk/awk interval regex support differs, so verify via Python as well.
bad=$(printf '%s\n' "$result" | python3 -c '
import re,sys
rows=sys.stdin.read().splitlines()
print(sum(1 for row in rows if
 len((f:=row.split("|")))!=9 or
 any(re.fullmatch("[0-9a-f]{64}", f[i]) is None for i in (3,4,5))
 or f[0]!="P9D1_V1" or f[1]!="asp"))')
[[ "$bad" == 0 ]] || {
 echo "FAIL P9D1 private hash export returned $bad malformed rows";exit 1
}
echo "PASS P9D1 private SELECT-only fingerprints on synthetic PostgreSQL: $actual_rows matches, Python SHA256 compatible, zero bank/review/audit mutations"
