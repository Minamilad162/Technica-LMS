#!/usr/bin/env bash
# P14 ONLY on disposable GitHub PostgreSQL after synthetic P1-P13 fixtures.
# Supabase Storage system tables are emulated here; real Storage API/Edge
# deployment & platform plan quota require separately approved Staging QA.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(
 id text PRIMARY KEY,name text NOT NULL,public boolean NOT NULL,
 file_size_limit bigint,allowed_mime_types text[]
);
CREATE TABLE storage.objects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bucket_id text NOT NULL,name text NOT NULL,metadata jsonb
);
SQL
before=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_media_assets)::text||'|'||
 (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
 (SELECT count(*) FROM public.lms_questions)::text||'|'||
 (SELECT count(*) FROM public.lms_practice_attempts)::text||'|'||
 (SELECT count(*) FROM public.lms_entitlements)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060001_p14_private_lesson_media.sql
after=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_media_assets)::text||'|'||
 (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
 (SELECT count(*) FROM public.lms_questions)::text||'|'||
 (SELECT count(*) FROM public.lms_practice_attempts)::text||'|'||
 (SELECT count(*) FROM public.lms_entitlements)::text")
[[ "$before" == "$after" ]] || { echo 'FAIL P14 migration mutated existing protected LMS data';exit 1; }
private=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
SELECT CASE WHEN public=false AND file_size_limit=52428800
 AND allowed_mime_types=ARRAY['application/pdf','video/mp4','video/webm']::text[]
 THEN 'PRIVATE' ELSE 'INVALID' END FROM storage.buckets
 WHERE id='technica-private-lessons'")
[[ "$private" == 'PRIVATE' ]] || { echo 'FAIL P14 private Storage bucket limits';exit 1; }
for role in anon authenticated;do
 if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN; SET LOCAL ROLE $role;
 SELECT public.lms_p14_finalize_media('60000000-0000-0000-0000-000000000001'); ROLLBACK;" >/dev/null 2>&1;then
  echo "FAIL P14 $role invoked service-only finalizer";exit 1
 fi
 if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN; SET LOCAL ROLE $role;
 SELECT * FROM public.lms_p14_media_upload_intents; ROLLBACK;" >/dev/null 2>&1;then
  echo "FAIL P14 $role read private upload intent";exit 1
 fi
done
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.lms_p14_media_upload_intents
 (id,created_by,course_id,lesson_id,kind,expected_mime,
  expected_bytes,object_path,display_name)
VALUES
 ('60000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000001',
 'pdf','application/pdf',22,
 '10000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001.pdf',
 'protected-lesson.pdf');
SQL
if psql -X -v ON_ERROR_STOP=1 -q -c "SELECT public.lms_p14_finalize_media(
 '60000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14 finalized an upload without any Storage object';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO storage.objects(bucket_id,name,metadata)
VALUES('technica-private-lessons',
 '10000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001.pdf',
 '{"size":21,"mimetype":"application/pdf"}');
SQL
if psql -X -v ON_ERROR_STOP=1 -q -c "SELECT public.lms_p14_finalize_media(
 '60000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14 accepted incorrect actual Storage bytes';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE storage.objects SET metadata=jsonb_build_object('size',22,'mimetype','application/pdf')
 WHERE bucket_id='technica-private-lessons'"
receipt=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN;
 SET LOCAL ROLE service_role;
 SELECT public.lms_p14_finalize_media('60000000-0000-0000-0000-000000000001');
 COMMIT;" | grep '^{' | head -n 1)
printf '%s' "$receipt" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["kind"]=="pdf" and x["title"]=="protected-lesson.pdf"
assert "private_object_path" not in x and "token" not in x
'
if psql -X -v ON_ERROR_STOP=1 -q -c "SELECT public.lms_p14_finalize_media(
 '60000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14 duplicate finalization succeeded';exit 1
fi
test "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT count(*) FROM public.lms_media_assets")" -ge 1
test "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT count(*) FROM public.lms_lesson_blocks
 WHERE block_type='pdf'")" -eq 1
psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
SELECT payload FROM public.lms_lesson_blocks WHERE block_type='pdf'" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert "assetId" in x and "title" in x
assert not any(k in x for k in ("private_object_path","token","signedUrl"))
'
# The same P1 RLS policy now protects the new media block, too.
paid=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN; SET LOCAL ROLE authenticated;
 SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
 SELECT count(*) FROM public.lms_lesson_blocks WHERE block_type='pdf';
 ROLLBACK;" | grep -E '^[0-9]+$' | head -n 1)
[[ "$paid" == 1 ]] || { echo 'FAIL P14 entitled learner RLS visibility';exit 1; }
outsider=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 BEGIN; SET LOCAL ROLE authenticated;
 SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
 SELECT count(*) FROM public.lms_lesson_blocks WHERE block_type='pdf';
 ROLLBACK;" | grep -E '^[0-9]+$' | head -n 1)
[[ "$outsider" == 0 ]] || { echo 'FAIL P14 unentitled learner can see media block';exit 1; }
echo 'PASS P14 private bucket, service-only atomic upload, metadata check, no duplicate attachment, P1 learner RLS and zero existing data mutation.'

# P14.1 additive page-delivery checks on disposable PostgreSQL ONLY.
baseline=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
 (SELECT count(*) FROM public.lms_media_assets)::text||'|'||
 (SELECT count(*) FROM public.lms_questions)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060002_p141_protected_pdf_pages.sql
unchanged=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_lesson_blocks)::text||'|'||
 (SELECT count(*) FROM public.lms_media_assets)::text||'|'||
 (SELECT count(*) FROM public.lms_questions)::text")
[[ "$baseline" == "$unchanged" ]] || { echo 'FAIL P14.1 migration mutated existing data';exit 1; }
bucket=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT CASE WHEN public=false AND file_size_limit=2097152
 AND allowed_mime_types=ARRAY['image/jpeg']::text[]
 THEN 'PRIVATE' ELSE 'INVALID' END FROM storage.buckets
 WHERE id='technica-private-lesson-pages'")
[[ "$bucket" == PRIVATE ]] || { echo 'FAIL P14.1 bucket is not private';exit 1; }
for role in anon authenticated;do
 if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN;SET LOCAL ROLE $role;
 SELECT public.lms_p141_finalize_pdf_pages('50000000-0000-0000-0000-000000000001');ROLLBACK;" >/dev/null 2>&1;then
  echo "FAIL P14.1 $role invoked private finalizer";exit 1
 fi
 if psql -X -v ON_ERROR_STOP=1 -q -c "BEGIN;SET LOCAL ROLE $role;
 SELECT * FROM public.lms_p141_pdf_packages;ROLLBACK;" >/dev/null 2>&1;then
  echo "FAIL P14.1 $role read service-only page package";exit 1
 fi
done
psql -X -v ON_ERROR_STOP=1 -q <<'SQLPAGES'
INSERT INTO public.lms_p141_pdf_packages
 (id,created_by,course_id,lesson_id,title,page_count,expected_page_sizes,object_prefix)
VALUES
 ('50000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000001',
 'Protected PDF',2,'[4,5]'::jsonb,
 '10000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001');
SQLPAGES
if psql -X -v ON_ERROR_STOP=1 -q -c "
 SELECT public.lms_p141_finalize_pdf_pages('50000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14.1 finalized missing JPG pages';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q <<'SQLPAGES'
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES
 ('technica-private-lesson-pages',
 '10000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/0001.jpg',
 '{"size":4,"mimetype":"image/jpeg"}'),
 ('technica-private-lesson-pages',
 '10000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/0002.jpg',
 '{"size":6,"mimetype":"image/jpeg"}');
SQLPAGES
if psql -X -v ON_ERROR_STOP=1 -q -c "
 SELECT public.lms_p141_finalize_pdf_pages('50000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14.1 accepted wrong image byte size';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE storage.objects SET metadata='{\"size\":5,\"mimetype\":\"image/jpeg\"}'::jsonb
 WHERE bucket_id='technica-private-lesson-pages' AND name LIKE '%/0002.jpg'"
receipt=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN;
 SET LOCAL ROLE service_role;
 SELECT public.lms_p141_finalize_pdf_pages('50000000-0000-0000-0000-000000000001');
 COMMIT;" | grep '^{' | head -n 1)
printf '%s' "$receipt" | python3 -c '
import sys,json
r=json.load(sys.stdin)
assert r["kind"]=="pdf" and r["pageCount"]==2
assert "object_prefix" not in r and "signedUrl" not in r
'
if psql -X -v ON_ERROR_STOP=1 -q -c "
 SELECT public.lms_p141_finalize_pdf_pages('50000000-0000-0000-0000-000000000001');" >/dev/null 2>&1;then
 echo 'FAIL P14.1 duplicate finalization accepted';exit 1
fi
test "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT count(*) FROM public.lms_lesson_blocks WHERE payload->>'protectedPages'='true'")" -eq 1
echo 'PASS P14.1 protected raster PDF: private bucket, service-only ACL, exact page metadata, single finalize, no original PDF or existing data mutation.'

