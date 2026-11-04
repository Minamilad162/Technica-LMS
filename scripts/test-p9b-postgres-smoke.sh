#!/usr/bin/env bash
# P9B tests ALWAYS run on disposable GitHub Actions PostgreSQL after P9A.
# NEVER run this script against the user's real Technica Supabase production.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
admin2=77777777-0000-0000-0000-000000000002
paid=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000001
other=20000000-0000-0000-0000-000000000002
run_as(){
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -A -t -q -c \
 "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $query; COMMIT;" | tail -n 1
}

before=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT count(*)::text||'|'||
 count(*) FILTER(WHERE approval_state='approved')::text||'|'||
 count(*) FILTER(WHERE mock_exclusive)::text
 FROM public.lms_questions")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611040005_p9b_controlled_mock_reservation_and_practice_approval.sql
after=$(psql -X -v ON_ERROR_STOP=1 -A -t -c "SELECT count(*)::text||'|'||
 count(*) FILTER(WHERE approval_state='approved')::text||'|'||
 count(*) FILTER(WHERE mock_exclusive)::text
 FROM public.lms_questions")
[[ "$before" == "$after" ]] || { echo "FAIL P9B migration touched pre-existing question data: $before -> $after";exit 1; }
echo 'PASS migration schema-only install: no existing question approval/classification/reservation mutation'

# Generate synthetic fixture with EXACTLY 200 individually fully reviewed draft
# items, one additional independently-approvable Practice item, one rights-
# unverified item; NEVER imported or auto-approved in a real environment.
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.lms_questions(course_id,source_id,prompt,options,correct_index,
  difficulty,approval_state,mock_exclusive)
SELECT '10000000-0000-0000-0000-000000000001',
 CASE WHEN n<=200 THEN 'P9B-MOCK-'||lpad(n::text,3,'0')
   WHEN n=201 THEN 'P9B-PRACTICE' ELSE 'P9B-NO-RIGHTS' END,
 'Synthetic reviewed item '||n||'?', '["True","False"]'::jsonb,0,
 'unclassified','draft',false
FROM generate_series(1,202) n;
INSERT INTO public.lms_p6_question_reviews(
 question_id,reviewed_domain_id,difficulty,answer_checked,rights_checked,
 review_state,review_notes,reviewed_by)
SELECT q.id,d.id,
 CASE WHEN q.source_id<'P9B-MOCK-068' THEN 'low'
      WHEN q.source_id<'P9B-MOCK-135' THEN 'medium'
      ELSE 'high' END,
 true,q.source_id<>'P9B-NO-RIGHTS',
 CASE WHEN q.source_id='P9B-NO-RIGHTS' THEN 'needs_revision'
      ELSE 'ready' END,
 'Synthetic review fixture only; no real ASP licensing',
 '00000000-0000-0000-0000-000000000001'
FROM public.lms_questions q
JOIN public.lms_domains d ON d.course_id=q.course_id AND d.slug='asp11-01'
WHERE q.source_id LIKE 'P9B-%';
SQL

ids=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT string_agg(id::text,',' ORDER BY source_id)
  FROM public.lms_questions WHERE source_id LIKE 'P9B-MOCK-%'")
shortids=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT string_agg(id::text,',' ORDER BY source_id)
  FROM (SELECT id,source_id FROM public.lms_questions
   WHERE source_id LIKE 'P9B-MOCK-%' ORDER BY source_id LIMIT 199) x")
first=${ids%%,*}
dups="${shortids},${first}"
practice=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT id FROM public.lms_questions WHERE source_id='P9B-PRACTICE'")
bad=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT id FROM public.lms_questions WHERE source_id='P9B-NO-RIGHTS'")

if run_as anon 00000000-0000-0000-0000-000000000000 \
 "SELECT public.lms_p9b_mock_preflight('$course','{${ids}}'::uuid[])" >/dev/null 2>&1;then
 echo 'FAIL anonymous inspected protected Mock candidate data';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT public.lms_p9b_mock_preflight('$course','{${ids}}'::uuid[])" >/dev/null 2>&1;then
 echo 'FAIL learner inspected Mock candidate data';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${ids}}'::uuid[],'RESERVE 200 ASP MOCK QUESTIONS')" >/dev/null 2>&1;then
 echo 'FAIL learner reserved Mock bank';exit 1
fi
if run_as authenticated "$paid" \
 "SELECT public.lms_p9b_approve_practice_question('$practice','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL learner approved reviewed source';exit 1
fi
if run_as authenticated "$paid" "SELECT count(*) FROM public.lms_p9b_mock_items" >/dev/null 2>&1;then
 echo 'FAIL learner directly reads protected reserved Mock IDs';exit 1
fi
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_mock_preflight('$other','{${ids}}'::uuid[])" >/dev/null 2>&1;then
 echo 'FAIL another course can reserve ASP Mock';exit 1
fi
echo 'PASS learner/anon denial, private Mock IDs and exact ASP course scope'

invalid=$(run_as authenticated "$admin" \
 "SELECT public.lms_p9b_mock_preflight('$course','{${shortids}}'::uuid[])->>'ready'")
[[ "$invalid" == false ]] || { echo 'FAIL 199 selected accepted';exit 1; }
dup_result=$(run_as authenticated "$admin" \
 "SELECT public.lms_p9b_mock_preflight('$course','{${dups}}'::uuid[])->>'ready'")
[[ "$dup_result" == false ]] || { echo 'FAIL duplicate Mock question accepted';exit 1; }
if run_as authenticated "$admin2" \
 "SELECT public.lms_p9b_approve_practice_question('$practice','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL Practice approval bypassed Mock 200-reservation gate';exit 1
fi
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${shortids}}'::uuid[],'RESERVE 200 ASP MOCK QUESTIONS')" >/dev/null 2>&1;then
 echo 'FAIL 199-question Mock reservation accepted';exit 1
fi
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${dups}}'::uuid[],'RESERVE 200 ASP MOCK QUESTIONS')" >/dev/null 2>&1;then
 echo 'FAIL duplicate 200 IDs reservation accepted';exit 1
fi
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${ids}}'::uuid[],'no confirmation')" >/dev/null 2>&1;then
 echo 'FAIL missing written confirmation accepted';exit 1
fi
echo 'PASS 199/duplicate/wrong confirmation rejected; Practice cannot publish before Mock reserve'

# P8 smoke intentionally seeds a test flagged Mock question. Existing stray
# flags MUST block P9B; only clear those flags in THIS disposable test fixture.
blocked=$(run_as authenticated "$admin" \
 "SELECT public.lms_p9b_mock_preflight('$course','{${ids}}'::uuid[])->>'ready'")
[[ "$blocked" == false ]] || { echo 'FAIL existing orphan Mock flags not detected';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c \
 "UPDATE public.lms_questions SET mock_exclusive=false
  WHERE course_id='$course' AND mock_exclusive"
ready=$(run_as authenticated "$admin" \
 "SELECT public.lms_p9b_mock_preflight('$course','{${ids}}'::uuid[])->>'ready'")
[[ "$ready" == true ]] || { echo "FAIL 200 vetted fixture not ready $ready";exit 1; }
form=$(run_as authenticated "$admin" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${ids}}'::uuid[],'RESERVE 200 ASP MOCK QUESTIONS')->>'formId'")
[[ "$form" =~ ^[0-9a-f-]{36}$ ]] || { echo 'FAIL no valid reservation form ID';exit 1; }
stats=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*)::text||'|'||count(DISTINCT i.question_id)::text||'|'||
 count(*) FILTER(WHERE q.mock_exclusive AND q.approval_state='draft')::text
 FROM public.lms_p9b_mock_items i JOIN public.lms_questions q ON q.id=i.question_id
 WHERE i.form_id='$form'")
[[ "$stats" == '200|200|200' ]] || { echo "FAIL form count/flags: $stats";exit 1; }
positions=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT CASE WHEN min(position)=1 AND max(position)=200
  AND count(DISTINCT position)=200 THEN 'true' ELSE 'false' END
  FROM public.lms_p9b_mock_items WHERE form_id='$form'")
[[ "$positions" == true ]] || { echo 'FAIL immutable 200 ordered positions';exit 1; }
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_reserve_mock('$course','{${ids}}'::uuid[],'RESERVE 200 ASP MOCK QUESTIONS')" >/dev/null 2>&1;then
 echo 'FAIL reserved same bank twice';exit 1
fi
echo 'PASS atomic exactly-200 verified Mock v1 reservation, unique positions and no double-booking'

if psql -X -v ON_ERROR_STOP=1 -q -c \
 "UPDATE public.lms_questions SET mock_exclusive=false WHERE id='$first'" >/dev/null 2>&1;then
 echo 'FAIL protected Mock item was unreserved';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c \
 "UPDATE public.lms_p9b_mock_items SET position=199 WHERE form_id='$form' AND position=1" >/dev/null 2>&1;then
 echo 'FAIL immutable Mock item was rewritten';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c \
 "DELETE FROM public.lms_p9b_mock_forms WHERE id='$form'" >/dev/null 2>&1;then
 echo 'FAIL immutable Mock form deleted';exit 1
fi
if run_as authenticated "$admin2" \
 "SELECT public.lms_p9b_approve_practice_question('$first','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL Mock-exclusive item published to Practice';exit 1
fi
if run_as authenticated "$admin" \
 "SELECT public.lms_p9b_approve_practice_question('$practice','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL original reviewer self-approved a Practice question';exit 1
fi
if run_as authenticated "$admin2" \
 "SELECT public.lms_p9b_approve_practice_question('$bad','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL unverified usage rights accepted';exit 1
fi
echo 'PASS permanent Mock exclusion/immutability, self-review and rights-negative tests'

approved=$(run_as authenticated "$admin2" \
 "SELECT public.lms_p9b_approve_practice_question('$practice','APPROVE ASP PRACTICE QUESTION')->>'approvalState'")
[[ "$approved" == approved ]] || { echo 'FAIL second verified Admin cannot approve';exit 1; }
approved_info=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT q.approval_state||'|'||q.difficulty||'|'||q.mock_exclusive::text||
 '|'||d.slug FROM public.lms_questions q
 JOIN public.lms_domains d ON d.id=q.domain_id WHERE q.id='$practice'")
[[ "$approved_info" == 'approved|high|false|asp11-01' ]] || { echo "FAIL Practice review classification not copied: $approved_info";exit 1; }
if run_as authenticated "$admin2" \
 "SELECT public.lms_p9b_approve_practice_question('$practice','APPROVE ASP PRACTICE QUESTION')" >/dev/null 2>&1;then
 echo 'FAIL approved question can be released twice';exit 1
fi
audit=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_audit_events
 WHERE (event_type='asp_mock_200_reserved' AND target_id='$form')
 OR (event_type='asp_practice_question_approved' AND target_id='$practice')")
[[ "$audit" == 2 ]] || { echo "FAIL immutable audit count not 2: $audit";exit 1; }
echo 'PASS independent second Admin, reviewed ASP11 difficulty, exact one-item approval and 2 audit events'

# No P9B Mock question appears in any previously staged P4/P8 public pool.
exclusive=$(psql -X -v ON_ERROR_STOP=1 -A -t -c \
 "SELECT count(*) FROM public.lms_questions q
 JOIN public.lms_p9b_mock_items i ON i.question_id=q.id
 WHERE q.approval_state='approved' OR NOT q.mock_exclusive")
[[ "$exclusive" == 0 ]] || { echo 'FAIL Mock reservation leaked into learner Practice eligibility';exit 1; }
echo 'PASS P8e untouched, 200 Mock-exclusives non-Practice and real question pool remains owner-gated'
