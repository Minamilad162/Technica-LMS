#!/usr/bin/env bash
# P9A: non-destructive preflight test on disposable PostgreSQL ONLY, after P8.
# This never connects to Supabase or reads real learner/question records.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000001
run_as(){
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -A -t -q -c \
  "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}
# Source-table fingerprints must remain unchanged by P9A migration/RPC.
before=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT
  count(*)::text||'|'||count(*) FILTER(WHERE approval_state='approved')||'|'||
  count(*) FILTER(WHERE mock_exclusive)||'|'||
  coalesce(md5(string_agg(id::text||'|'||approval_state||'|'||
    coalesce(domain_id::text,'')||'|'||difficulty||'|'||mock_exclusive::text,
    ',' ORDER BY id)),'')
  FROM public.lms_questions")
reviews_before=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT count(*) FROM public.lms_p6_question_reviews")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611040002_p9a_release_preflight.sql
if run_as anon 00000000-0000-0000-0000-000000000000 \
 "SELECT public.lms_p9a_release_preflight('$course')" >/dev/null 2>&1; then
 echo 'FAIL anonymous accessed ASP governance preflight';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT public.lms_p9a_release_preflight('$course')" >/dev/null 2>&1; then
 echo 'FAIL ordinary learner accessed ASP governance preflight';exit 1
fi
echo 'PASS preflight denied to anonymous and non-Admin JWT roles'
response=$(run_as authenticated "$admin" "SELECT public.lms_p9a_release_preflight('$course')")
printf '%s' "$response" | node -e "
 let text=''; process.stdin.on('data',x=>text+=x).on('end',()=>{
 const r=JSON.parse(text);
 if(r.mode!=='read_only'||r.releaseAllowed!==false||r.officialDomainCount!==9||
 !Array.isArray(r.blockedReasons)||!r.blockedReasons.length||
 !Array.isArray(r.domainCandidates)||r.domainCandidates.length!==9||
 r.total<100||r.approved<10||r.mockReserved===200||
 r.eligibleCandidates<1||r.candidateLow+r.candidateMedium+r.candidateHigh!==r.eligibleCandidates||
 'prompt' in r||'correctIndex' in r||'options' in r){
  process.stderr.write('FAIL invalid P9A protection/readiness report\\n');process.exit(1);
 }
 console.log('PASS P9A valid aggregate, nine-domain, blocked release status');
 });"
if run_as authenticated "$admin" \
 "SELECT public.lms_p9a_release_preflight('20000000-0000-0000-0000-000000000002')" >/dev/null 2>&1; then
 echo 'FAIL non-ASP course accepted by release preflight';exit 1
fi
# Preserve old question rows, classifications and reviews exactly.
after=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT
  count(*)::text||'|'||count(*) FILTER(WHERE approval_state='approved')||'|'||
  count(*) FILTER(WHERE mock_exclusive)||'|'||
  coalesce(md5(string_agg(id::text||'|'||approval_state||'|'||
    coalesce(domain_id::text,'')||'|'||difficulty||'|'||mock_exclusive::text,
    ',' ORDER BY id)),'')
  FROM public.lms_questions")
reviews_after=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT count(*) FROM public.lms_p6_question_reviews")
[[ "$before" == "$after" && "$reviews_before" == "$reviews_after" ]] || {
 echo 'FAIL preflight changed ASP question/review records';exit 1;
}
echo 'PASS P9A source records, P6 review count and P4 approval/mock flags unchanged'
