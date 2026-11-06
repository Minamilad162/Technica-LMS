#!/usr/bin/env bash
# P15 source-only Postgres smoke AFTER P14 disposable fixture. NEVER live DB.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
before=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
  (SELECT count(*) FROM public.lms_lessons)::text||'|'||
  (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
  (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
  (SELECT count(*) FROM public.lms_questions)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060003_p15_published_intro_outline.sql
after=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
  (SELECT count(*) FROM public.lms_lessons)::text||'|'||
  (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
  (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
  (SELECT count(*) FROM public.lms_questions)::text")
[[ "$before" == "$after" ]] || { echo 'FAIL P15 migration changed P1/P4 existing data';exit 1; }
query_as(){
 local role="$1" uid="$2" query="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN; SET LOCAL ROLE $role;
 SET LOCAL request.jwt.claim.sub='$uid'; $query; ROLLBACK;" |
  grep -E '^(true|false|[0-9]+)$' | tail -n 1
}
ANON='00000000-0000-0000-0000-000000000000'
OUTSIDER='00000000-0000-0000-0000-000000000002'
ADMIN='00000000-0000-0000-0000-000000000001'
PAID='00000000-0000-0000-0000-000000000003'
C='10000000-0000-0000-0000-000000000001'
FIRST='40000000-0000-0000-0000-000000000001'
SECOND='40000000-0000-0000-0000-000000000002'
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$FIRST'")" == 0 ]] ||
 { echo 'FAIL P15 preview enabled without Admin opt-in';exit 1; }
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_p15_course_outline('$C')")" == 2 ]] ||
 { echo 'FAIL P15 published locked outline not visible';exit 1; }
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_p15_course_outline('$C') WHERE is_free_intro")" == 0 ]] ||
 { echo 'FAIL P15 free intro marked enabled by default';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE anon;SET LOCAL request.jwt.claim.sub='$ANON';
 SELECT count(*) FROM public.lms_p15_course_outline('$C');ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P15 anonymous course outline read';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$OUTSIDER';
 SELECT public.lms_p15_set_intro('$C',true);ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P15 outsider changed Intro settings';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$OUTSIDER';
 SELECT * FROM public.lms_p15_intro_settings;ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P15 outsider read Admin-only config';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p15_set_intro('$C',true); COMMIT;" >/dev/null
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$FIRST'")" -ge 1 ]] ||
 { echo 'FAIL P15 opted-in Intro not readable';exit 1; }
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$SECOND'")" == 0 ]] ||
 { echo 'FAIL P15 paid Lesson exposed';exit 1; }
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_p15_course_outline('$C') WHERE is_free_intro")" == 1 ]] ||
 { echo 'FAIL P15 Intro not identified in published outline';exit 1; }
# Set the outsider's profile to suspended explicitly: other P1–P14 synthetic
# fixtures can change the paid user's status during prior test stages.
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_profiles
 SET account_status='suspended' WHERE id='$OUTSIDER'"
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$FIRST'")" == 0 ]] ||
 { echo 'FAIL P15 suspended profile saw free intro';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_profiles
 SET account_status='active' WHERE id='$OUTSIDER'"
# An Admin reordering/unpublishing cannot silently expose a NEW intro:
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_lessons
 SET publication_state='draft' WHERE id='$FIRST'"
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$SECOND'")" == 0 ]] ||
 { echo 'FAIL P15 first lesson drift leaked content';exit 1; }
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_p15_course_outline('$C') WHERE is_free_intro")" == 0 ]] ||
 { echo 'FAIL P15 auto-promoted unapproved intro';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_lessons
 SET publication_state='published' WHERE id='$FIRST'"
psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p15_set_intro('$C',false);COMMIT;" >/dev/null
[[ "$(query_as authenticated "$OUTSIDER" "SELECT count(*) FROM public.lms_lesson_blocks WHERE lesson_id='$FIRST'")" == 0 ]] ||
 { echo 'FAIL P15 revoked Intro remains readable';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060003_p15_published_intro_outline.sql >/dev/null 2>&1;then
 echo 'FAIL P15 migration replay accepted';exit 1
fi
echo 'PASS P15: opt-in first published intro, locked metadata only, one lesson RLS, active profile, suspended denial, no privilege escalation, no accidental next-free intro, no existing data mutation.'
