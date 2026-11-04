import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/P9C_DECISION_SUMMARY_READ_ONLY.sql');
const stripped=sql.replace(/--[^\n]*/g,'')
 .replace(/'(?:''|[^'])*'/g,"''").trim();
assert(/^WITH\b/i.test(stripped),'P9C decision must be one SELECT-only CTE');
assert.equal((stripped.match(/;/g)||[]).length,1,
 'Owner-facing summary must contain exactly one SQL statement');
assert(!/\b(?:CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|MERGE|TRUNCATE|GRANT|REVOKE|EXECUTE|DO|CALL|LOCK|COPY|SET|BEGIN|COMMIT)\b/i.test(stripped),
 'Owner-facing query must be strictly read-only');
for(const s of [
 "public.lms_questions","public.lms_p6_question_reviews",
 "public.lms_p9b_mock_forms","public.lms_p9b_mock_items",
 "public.lms_practice_attempt_items",
 "r.answer_checked IS TRUE","r.rights_checked IS TRUE",
 "r.difficulty=q.difficulty","r.reviewed_domain_id=q.domain_id",
 "'low'","'medium'","'high'",
 "WHERE tier='low'","WHERE tier='medium'","WHERE tier='high'",
 "approved_gap","'BLOCKER'","'SHORTAGE'",
 "count(DISTINCT i.question_id)","excluded_draft=200",
 "mock_candidates","'CANDIDATES_ONLY'","'FORM_ITEMS_ONLY'",
 "FROM output ORDER BY area,check_name"
])assert(sql.includes(s),'Missing expected real bank release guard: '+s);
assert(sql.includes('Historical ASP source reference')&&sql.includes('1,625'),
 'Imported count is reference only, not claim of actual Supabase state');
assert(sql.includes('7 correct out of the ORIGINAL 10'),
 'Do not change locked P8e fixed correctness policy');
assert(!/\b(?:SELECT|RETURN)\s+(?:q\.prompt|q\.options|q\.correct_index|r\.review_notes|q\.source_id)\b/i.test(sql),
 'Read-only output cannot include proprietary question text, keys or source IDs');
const ci=read('.github/workflows/ci-security.yml');
assert(ci.includes('npm run test:p9c:decision'));
const smoke=read('scripts/test-p9c-postgres-smoke.sh');
assert(smoke.includes('P9C_DECISION_SUMMARY_READ_ONLY.sql'));
assert(smoke.includes('decision_after=$(fingerprint)'));
const md=read('TECHNICA_LMS_MASTER_BLUEPRINT.md');
assert(md.includes('P9C.1 — Concise owner-run readiness decision summary'));
console.log('PASS P9C.1 concise bank/Mock readiness: 100% SELECT only, reviewed rights, P8e tier caps, exact Mock form, no private source/answer output.');
