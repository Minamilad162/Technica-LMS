#!/usr/bin/env bash
# Ephemeral Postgres smoke only; NOT a substitute for actual Supabase staging tests.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
SQL
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202610300001_p1_foundation.sql
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-000000000001','{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-000000000002','{"role":"admin","full_name":"Unentitled"}'),
 ('00000000-0000-0000-0000-000000000003','{"full_name":"Paid"}'),
 ('00000000-0000-0000-0000-000000000004','{"full_name":"Trial"}');
INSERT INTO public.lms_courses(id,slug,title,publication_state) VALUES
 ('10000000-0000-0000-0000-000000000001','asp','ASP','published'),
 ('10000000-0000-0000-0000-000000000002','other','Other','published');
INSERT INTO public.lms_domains(id,course_id,slug,title)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','d','Domain');
INSERT INTO public.lms_topics(id,domain_id,slug,title)
VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','t','Topic');
INSERT INTO public.lms_lessons(id,topic_id,slug,title,publication_state) VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','a','Lesson A','published'),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','b','Lesson B','published'),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','c','Draft','draft');
INSERT INTO public.lms_lesson_blocks(lesson_id,block_type,payload) VALUES
 ('40000000-0000-0000-0000-000000000001','text','{"text":"A"}'),
 ('40000000-0000-0000-0000-000000000002','text','{"text":"B"}'),
 ('40000000-0000-0000-0000-000000000003','text','{"text":"draft"}');
INSERT INTO public.lms_role_assignments(user_id,role) VALUES
 ('00000000-0000-0000-0000-000000000001','admin');
INSERT INTO public.lms_entitlements(id,user_id,course_id,entitlement_type) VALUES
 ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','paid'),
 ('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','trial');
INSERT INTO public.lms_trial_lesson_grants VALUES
 ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001');
SQL
query_as() {
  local role="$1" user_id="$2" query="$3"
  psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$user_id'; $query; ROLLBACK;" | tail -n 1
}
assert_count() {
  local label="$1" expected="$2" role="$3" uid="$4" sql="$5" actual
  actual="$(query_as "$role" "$uid" "$sql")"
  if [[ "$actual" != "$expected" ]]; then echo "FAIL $label, expected $expected, got $actual"; exit 1; fi
  echo "PASS $label"
}
assert_count "anonymous public catalog" 2 anon 00000000-0000-0000-0000-000000000000 "SELECT count(*) FROM public.lms_courses"
assert_count "no entitlement cannot read lessons" 0 authenticated 00000000-0000-0000-0000-000000000002 "SELECT count(*) FROM public.lms_lesson_blocks"
assert_count "paid can read published lessons" 2 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_blocks"
assert_count "trial sees one allowlisted lesson" 1 authenticated 00000000-0000-0000-0000-000000000004 "SELECT count(*) FROM public.lms_lesson_blocks"
assert_count "admin can read draft too" 3 authenticated 00000000-0000-0000-0000-000000000001 "SELECT count(*) FROM public.lms_lesson_blocks"
assert_count "signup metadata cannot assign admin" 0 authenticated 00000000-0000-0000-0000-000000000002 "SELECT count(*) FROM public.lms_role_assignments WHERE user_id='00000000-0000-0000-0000-000000000002'"
if query_as authenticated 00000000-0000-0000-0000-000000000002 "INSERT INTO public.lms_role_assignments(user_id,role) VALUES ('00000000-0000-0000-0000-000000000002','admin')" > /dev/null 2>&1; then
  echo "FAIL learner can assign admin"; exit 1
fi
echo "PASS no self-granted admin role"
if query_as anon 00000000-0000-0000-0000-000000000000 "SELECT count(*) FROM public.lms_lesson_blocks" > /dev/null 2>&1; then
  echo "FAIL anonymous read blocks"; exit 1
fi
echo "PASS anonymous blocked from lesson blocks"
# Extend fixtures after baseline to verify strict cross-course isolation.
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.lms_domains(id,course_id,slug,title)
 VALUES ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','other','Other domain');
INSERT INTO public.lms_topics(id,domain_id,slug,title)
 VALUES ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','other','Other topic');
INSERT INTO public.lms_lessons(id,topic_id,slug,title,publication_state)
 VALUES ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002','other','Other lesson','published');
INSERT INTO public.lms_lesson_blocks(lesson_id,block_type,payload)
 VALUES ('40000000-0000-0000-0000-000000000004','text','{"text":"another course"}');
SQL
assert_count "paid ASP isolated from other course" 2 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_blocks"
assert_count "admin sees both courses" 4 authenticated 00000000-0000-0000-0000-000000000001 "SELECT count(*) FROM public.lms_lesson_blocks"
if query_as authenticated 00000000-0000-0000-0000-000000000003 \
 "UPDATE public.lms_profiles SET account_status='active' WHERE id='00000000-0000-0000-0000-000000000003'" >/dev/null 2>&1; then
 echo "FAIL user can update protected account status"; exit 1
fi
echo "PASS account-status column write denied"
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_entitlements SET status='revoked' WHERE user_id='00000000-0000-0000-0000-000000000003'"
assert_count "revoked paid entitlement denied" 0 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_blocks"
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_entitlements SET status='active',starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' WHERE user_id='00000000-0000-0000-0000-000000000003'"
assert_count "expired paid entitlement denied" 0 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_blocks"
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_entitlements SET ends_at=NULL WHERE user_id='00000000-0000-0000-0000-000000000003'"
psql -X -v ON_ERROR_STOP=1 -q -c "UPDATE public.lms_profiles SET account_status='suspended' WHERE id='00000000-0000-0000-0000-000000000003'"
assert_count "suspended paid user denied" 0 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_blocks"
echo "PASS P1 ephemeral PostgreSQL migration + expanded RLS smoke; real Supabase staging still required."

# P2 extension: apply on the same disposable database AFTER all P1 smoke checks.
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202610310002_p2_learning_progress.sql
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.lms_lesson_progress(user_id,lesson_id,reading_completed)
 VALUES('00000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000001',true);
INSERT INTO public.lms_lesson_events(idempotency_key,user_id,lesson_id,event_type)
 VALUES('60000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000001','section_viewed');
INSERT INTO public.lms_course_structure_versions(course_id,revision,snapshot)
 VALUES('10000000-0000-0000-0000-000000000001',1,'{"domains":[]}');
SQL
assert_count "P2 learner reads own progress" 1 authenticated 00000000-0000-0000-0000-000000000003 "SELECT count(*) FROM public.lms_lesson_progress"
assert_count "P2 other learner cannot read progress" 0 authenticated 00000000-0000-0000-0000-000000000004 "SELECT count(*) FROM public.lms_lesson_progress"
assert_count "P2 admin reads progress" 1 authenticated 00000000-0000-0000-0000-000000000001 "SELECT count(*) FROM public.lms_lesson_progress"
assert_count "P2 RLS on all new tables" 3 authenticated 00000000-0000-0000-0000-000000000001 "SELECT count(*) FROM pg_class WHERE oid IN ('public.lms_lesson_progress'::regclass,'public.lms_lesson_events'::regclass,'public.lms_course_structure_versions'::regclass) AND relrowsecurity"
if query_as authenticated 00000000-0000-0000-0000-000000000003 "INSERT INTO public.lms_lesson_progress(user_id,lesson_id) VALUES('00000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000002')" >/dev/null 2>&1; then
  echo "FAIL learner can spoof verified progress"; exit 1
fi
echo "PASS learner progress writes blocked"
if query_as authenticated 00000000-0000-0000-0000-000000000001 "SELECT count(*) FROM public.lms_lesson_events" >/dev/null 2>&1; then
  echo "FAIL raw event log accessible to client"; exit 1
fi
echo "PASS P2 event log client access blocked"
if query_as anon 00000000-0000-0000-0000-000000000000 "SELECT count(*) FROM public.lms_lesson_progress" >/dev/null 2>&1; then
  echo "FAIL anonymous progress access"; exit 1
fi
echo "PASS P2 anonymous progress blocked"
echo "PASS P2 migration, GRANT, RLS, event/authoring privacy on disposable PostgreSQL."
