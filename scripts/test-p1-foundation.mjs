// Static P1 schema contract test. No PostgreSQL execution is implied.
// Actual GRANT/RLS/direct API negative testing is mandatory in a Supabase sandbox.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const sql=readFileSync(new URL('../supabase/migrations/202610300001_p1_foundation.sql',import.meta.url),'utf8');
const norm=sql.replace(/--[^\n]*/g,' ').replace(/\s+/g,' ');
const requiredTables=[
 'lms_profiles','lms_role_assignments','lms_courses','lms_domains','lms_topics',
 'lms_lessons','lms_lesson_blocks','lms_entitlements','lms_trial_lesson_grants',
 'lms_media_assets','lms_audit_events'
];
for(const table of requiredTables){
 assert.match(norm,new RegExp('CREATE TABLE public\\.'+table+' \\(','i'),table+' must be created');
 assert.match(norm,new RegExp("'"+table+"'"),table+' must be in the RLS/GRANT loop');
}
const links=[
 ['lms_domains','course_id','lms_courses'],
 ['lms_topics','domain_id','lms_domains'],
 ['lms_lessons','topic_id','lms_topics'],
 ['lms_lesson_blocks','lesson_id','lms_lessons']
];
for(const [child,col,parent] of links){
 const from=norm.indexOf('CREATE TABLE public.'+child+' (');
 const to=norm.indexOf('CREATE TABLE public.',from+1);
 assert.ok(from>=0);
 const block=norm.slice(from,to>=0?to:undefined);
 assert.ok(block.includes(col+' uuid NOT NULL REFERENCES public.'+parent+'(id)'),child+' must have correct parent '+parent);
}
assert.match(norm,/to_regclass\(format\('public.%I',n\)\)/);
assert.match(norm,/RAISE EXCEPTION 'P1 conflict:/);
assert.match(norm,/ON auth\.users FOR EACH ROW EXECUTE FUNCTION public\.lms_p1_on_auth_signup/);
assert.match(norm,/CREATE FUNCTION public\.lms_p1_on_auth_signup\(\) RETURNS trigger/);
assert.doesNotMatch(norm,/NEW\.raw_user_meta_data\s*->>\s*'role'/i,'No role may be accepted from signup metadata');
assert.match(norm,/account_status='active'/);
assert.match(norm,/e\.starts_at<=now\(\) AND \(e\.ends_at IS NULL OR e\.ends_at>now\(\)\)/);
assert.match(norm,/e\.entitlement_type='trial' AND EXISTS/);
assert.match(norm,/g\.entitlement_id=e\.id AND g\.lesson_id=l\.id/);
assert.match(norm,/l\.publication_state='published'/);
assert.match(norm,/c\.publication_state='published'/);
assert.match(norm,/GRANT UPDATE\(full_name,locale\) ON public\.lms_profiles TO authenticated/);
assert.doesNotMatch(norm,/GRANT (?:ALL|INSERT|UPDATE|DELETE)[^;]* TO anon\b/i,'No anonymous writes');
assert.doesNotMatch(norm,/GRANT SELECT ON [^;]*(?:lms_media_assets|lms_trial_lesson_grants|lms_audit_events)[^;]* TO (?:anon|authenticated)\b/i,
 'Sensitive metadata must not have direct client SELECT grants');
assert.doesNotMatch(norm,/GRANT (?:INSERT|UPDATE|DELETE)[^;]*(?:lms_entitlements|lms_role_assignments)[^;]* TO authenticated\b/i,
 'No direct client entitlement/role write');
assert.doesNotMatch(norm,/\b(?:DROP TABLE|TRUNCATE|DELETE FROM)\b/i,'Migration must not erase data');
for(const functionName of ['lms_p1_actor_is_admin','lms_p1_actor_is_author_for',
  'lms_p1_course_entitled','lms_p1_can_view_structure','lms_p1_can_view_lesson']){
 assert.match(norm,new RegExp('CREATE FUNCTION public\\.'+functionName+'\\('),functionName+' must exist');
}
for(const table of requiredTables){
 assert.ok(sql.includes("'"+table+"'"),table+' RLS inclusion');
}
assert.match(norm,/ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY/);
assert.match(norm,/REVOKE ALL ON TABLE public\.%I FROM PUBLIC,anon,authenticated/);
assert.match(norm,/CREATE POLICY lms_course_public ON public\.lms_courses FOR SELECT TO anon,authenticated/);
assert.match(norm,/CREATE POLICY lms_block_read ON public\.lms_lesson_blocks FOR SELECT TO authenticated/);
assert.match(norm,/USING\(public\.lms_p1_can_view_lesson\(lesson_id\)\)/);
console.log('PASS P1 static schema: 11 tables; 4-level hierarchy; trusted signup; entitlement/trial gates; RLS and explicit GRANT guardrails.');
console.log('NOT EXECUTED: PostgreSQL syntax, real Supabase roles/RLS, edge API, client auth, or browser/device tests.');
