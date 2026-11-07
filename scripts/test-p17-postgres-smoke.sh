#!/usr/bin/env bash
# Disposable PostgreSQL fixture only, AFTER P15. NEVER production DB.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
base=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
        (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
        (SELECT count(*) FROM public.lms_lesson_blocks)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611070001_p17_course_covers.sql
actual=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
        (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
        (SELECT count(*) FROM public.lms_lesson_blocks)::text")
[[ "$base" == "$actual" ]] || { echo 'FAIL P17 changed existing LMS data';exit 1; }
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT public::text||'|'||file_size_limit::text||'|'||array_to_string(allowed_mime_types,',')
 FROM storage.buckets WHERE id='technica-course-covers'")" == "true|2097152|image/webp" ]] ||
 { echo 'FAIL P17 public cover bucket configuration';exit 1; }
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT count(*) FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects'
 AND policyname LIKE 'lms_p17_cover_storage_%'")" == 3 ]] ||
 { echo 'FAIL P17 Admin-only Storage RLS policies';exit 1; }
C='10000000-0000-0000-0000-000000000001'
ADMIN='00000000-0000-0000-0000-000000000001'
OUTSIDER='00000000-0000-0000-0000-000000000002'
FILE='c0000000-0000-0000-0000-000000000001'
NEWPATH="$C/$FILE.webp"
# Unentitled learner cannot change public cover metadata. RLS UPDATE may
# silently affect zero rows; test the actual affected-row count, not SQL exit.
outside=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$OUTSIDER';
 WITH updated AS (UPDATE public.lms_courses SET cover_path='$NEWPATH'
  WHERE id='$C' RETURNING id) SELECT count(*) FROM updated;
 ROLLBACK;" | grep -E '^[0-9]+$' | tail -n 1)
[[ "$outside" == 0 ]] || { echo 'FAIL P17 outsider changed cover';exit 1; }
# Verified Admin mutation creates one audit record.
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 UPDATE public.lms_courses SET cover_path='$NEWPATH' WHERE id='$C';
 COMMIT;"
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT count(*) FROM public.lms_p17_cover_audit
 WHERE course_id='$C' AND previous_path IS NULL
 AND new_path='$NEWPATH' AND event_type='uploaded' AND actor_id='$ADMIN'")" == 1 ]] ||
 { echo 'FAIL P17 cover audit missing';exit 1; }
# No foreign course path can be saved even by verified Admin.
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 UPDATE public.lms_courses SET cover_path='00000000-0000-0000-0000-000000000009/$FILE.webp'
 WHERE id='$C';ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P17 accepted cross-course object path';exit 1
fi
# Admin removal is auditable and does not affect course publication.
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 UPDATE public.lms_courses SET cover_path=NULL WHERE id='$C';
 COMMIT;"
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT count(*) FROM public.lms_p17_cover_audit
 WHERE course_id='$C' AND previous_path='$NEWPATH'
 AND new_path IS NULL AND event_type='removed'")" == 1 ]] ||
 { echo 'FAIL P17 removal audit missing';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$OUTSIDER';
 SELECT * FROM public.lms_p17_cover_audit;ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P17 audit readable by learner';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611070001_p17_course_covers.sql >/dev/null 2>&1;then
 echo 'FAIL P17 migration replay succeeded';exit 1
fi
echo 'PASS P17: no existing data mutation, cover bucket, Admin-only writes, path ownership, audit and strict replay guard.'
