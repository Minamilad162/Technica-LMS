import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pre=read('supabase/P9C_SCHEMA_PREFLIGHT_READ_ONLY.sql');
const audit=read('supabase/P9C_ASP_BANK_AUDIT_READ_ONLY.sql');
for(const [name,s] of [['preflight',pre],['bank audit',audit]]){
 const clean=s.replace(/--[^\n]*/g,'')
  .replace(/'(?:''|[^'])*'/g,"''").trim();
 assert(/^(?:SELECT|WITH)\b/i.test(clean),name+' must start with a SELECT-only statement');
 assert(!/\b(?:DO|CALL|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|COPY|SET|EXECUTE|PERFORM|BEGIN|COMMIT|ROLLBACK|LOCK|MERGE|VACUUM)\b/i.test(clean),
  name+' must not mutate any schema, row, grant or session');
 assert.equal((clean.match(/;/g)||[]).length,1,name+' should be exactly ONE SQL statement');
 assert(!s.includes('service_role_key')&&!s.includes('password')&&!s.includes('correct_index_snapshot'),
  name+' must not contain secrets or frozen answer keys');
}
for(const snippet of [
 "'CORE_REQUIRED'","'OPTIONAL_GOVERNANCE'","P9B: private Mock forms",
 "lms_p8_levelup_readiness(uuid,integer,uuid)","promotion_policy",
 "public.lms_p6_question_reviews","public.lms_questions"
])assert(pre.includes(snippet),'P9C schema preflight missing '+snippet);
for(const snippet of [
 "WHERE slug='asp'","'asp11-01'","'asp11-09'",
 "r.answer_checked IS TRUE AND r.rights_checked IS TRUE",
 "r.review_state='ready'","NOT i.mock_exclusive",
 "q.approval_state='approved'","q.mock_exclusive",
 "NOT i.used_in_practice","distinct_source_id",
 "'REFERENCE_ONLY'","'01_SOURCE'","'02_STATUS'","'03_REVIEW'",
 "'04_CONTENT'","'05_ASP11'","'06_PRACTICE'","'07_MOCK'",
 "'08_TIER'","'09_DOMAIN'",
 "approved_governance_gaps","missing_reference","missing_explanation",
 "duplicate_normalized_prompt_rows","mock_candidate",
 "COUNT_ONLY_OK","'NOT_INSTALLED'","'SCHEMA_PRESENT'",
 "'N=30 Level Up requires at least 30 approved non-Mock per tier; not 10 per tier.'",
 "FROM report"
])assert(audit.includes(snippet),'P9C aggregate report missing '+snippet);
assert(!/\b(?:FROM|JOIN)\s+public\.lms_p9b_mock_/i.test(audit),
 'Optional P9B form tables cannot be required by the base read-only audit');
assert(!/\b(?:FROM|JOIN)\s+public\.lms_practice_attempts\b/i.test(audit),
 'No user-level attempt histories required to compute bank readiness');
assert(!/\b(?:SELECT|RETURN)\s+(?:q\.prompt|q\.correct_index|r\.review_notes)/i.test(audit),
 'Must not directly return proprietary questions or answer keys');
const smoke=read('scripts/test-p9c-postgres-smoke.sh');
for(const s of [
 "schema_report=$(psql","report=$(psql","before=$(fingerprint)",
 "after=$(fingerprint)","[[ \"$before\" == \"$after\" ]]",
 "pre|post","PRE-P9B","POST-P9B","27",
 "'|1625|REFERENCE_ONLY|'"
])assert(smoke.includes(s),'P9C disposable audit test missing '+s);
const ci=read('.github/workflows/ci-security.yml');
assert(ci.includes('npm run test:p9c'),'P9C read-only contract Node check required in CI');
assert(ci.includes('scripts/test-p9c-postgres-smoke.sh pre'),'P9C must run before optional P9B migration');
assert(ci.includes('scripts/test-p9c-postgres-smoke.sh post'),'P9C must run after P9B fixture');
const blueprint=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');
const logic=read('docs/current/LOGIC_REGISTRY.md');
assert(blueprint.includes('## 60. P9C — Read-only ASP bank audit'));
assert(logic.includes('LMS-027'));
console.log('PASS P9C: SELECT-only core schema discovery; safe P9B-optional ASP review/domain/tiers/Mock diagnostics; no private outputs or writes; pre/post PostgreSQL fingerprint assertions.');
