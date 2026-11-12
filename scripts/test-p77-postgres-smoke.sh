#!/usr/bin/env bash
# P77 disposable PostgreSQL smoke after P44; NEVER run on production.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
admin=00000000-0000-0000-0000-000000000001
learner=00000000-0000-0000-0000-000000000003
course=10000000-0000-0000-0000-000000000002
request=7c770000-0000-4000-8000-000000000077
query(){ psql -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"; }
run_as(){
 local uid="$1" stmt="$2"
 psql -X -q -A -t -v ON_ERROR_STOP=1 -c "BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$uid';$stmt;COMMIT;" |
 sed '/^$/d' | grep -v '^BEGIN$' | grep -v '^COMMIT$' | tail -n 1
}
before=$(query "SELECT count(*) FROM public.lms_questions")
before_items=$(query "SELECT count(*) FROM public.lms_practice_attempt_items")
before_mock=$(query "SELECT count(*) FROM public.lms_p9b_mock_items")
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/202611120002_p77_auto_practice_import.sql
[[ "$(query "SELECT count(*) FROM public.lms_questions")" == "$before" ]] ||
 { echo 'P77 installer changed business questions';exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_practice_attempt_items")" == "$before_items" ]] ||
 { echo 'P77 installer changed attempt snapshots';exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_p9b_mock_items")" == "$before_mock" ]] ||
 { echo 'P77 installer changed official Mock form';exit 1; }
[[ "$(query "SELECT has_function_privilege('anon','public.lms_p77_import_bank(uuid,jsonb)','EXECUTE')")" == f ]] ||
 { echo 'P77 importer accessible to anon';exit 1; }
if run_as "$learner" "SELECT public.lms_p77_import_bank('$course','[]'::jsonb)" >/dev/null 2>&1;then
 echo 'P77 learner can import';exit 1;fi
# Imported sheet has exact answer indices and 12 unique questions.
items="(SELECT jsonb_agg(jsonb_build_object('sourceId','file:p77-'||i,
 'prompt','What is a valid new Practice action in safety scenario '||i||'?',
 'options',jsonb_build_array('Verify isolation','Ignore risks'),
 'correctIndex',0,'difficulty','low','reference','Synthetic P77 fixture'))
 FROM generate_series(1,12) i)"
state=$(run_as "$admin" "SELECT public.lms_p77_import_bank('$course',$items)->>'state'")
[[ "$state" == approved ]] || { echo "P77 new import state $state";exit 1; }
[[ "$(run_as "$admin" "SELECT public.lms_p77_import_bank('$course',$items)->>'skipped'")" == 12 ]] ||
 { echo 'P77 re-import changed existing questions';exit 1; }
q1=$(query "SELECT id FROM public.lms_questions WHERE course_id='$course' AND source_id='file:p77-1'")
[[ "$(query "SELECT approval_state||'/'||is_active::text||'/'||mock_candidate::text FROM public.lms_questions WHERE id='$q1'")" == approved/true/false ]] ||
 { echo 'P77 import did not create Approved+Active Practice question';exit 1; }
[[ "$(run_as "$admin" "SELECT public.lms_p29_set_question_flags('$q1',true,true)->>'approvalState'")" == draft ]] ||
 { echo 'P77 approved unused question not selectable for Mock';exit 1; }
[[ "$(query "SELECT approval_state||'/'||mock_candidate::text FROM public.lms_questions WHERE id='$q1'")" == draft/true ]] ||
 { echo 'P77 Mock question not isolated from Practice';exit 1; }
[[ "$(run_as "$admin" "SELECT public.lms_p29_set_question_flags('$q1',true,false)->>'approvalState'")" == approved ]] ||
 { echo 'P77 unused Mock uncheck did not return to Practice';exit 1; }
if run_as "$learner" "SELECT public.lms_p77_activate_existing_practice('$course',1,'ACTIVATE EXISTING PRACTICE IMPORTS')" >/dev/null 2>&1; then
 echo 'P77 learner can authorize existing Drafts';exit 1;fi
# Old importer intentionally remains Draft, and duplicate imports are never
# modified automatically.
old='[{"sourceId":"file:p77-legacy","prompt":"What follows an alarm in the old imported safety checklist?","options":["Follow response plan","Ignore alarm"],"correctIndex":0,"reference":"Synthetic legacy fixture"}]'
[[ "$(run_as "$admin" "SELECT public.lms_p28_import_bank('$course','$old'::jsonb)->>'state'")" == draft ]] ||
 { echo 'P77 changed backward-compatible old P28 importer';exit 1; }
preview=$(run_as "$admin" "SELECT public.lms_p77_existing_practice_preview('$course')->>'count'")
[[ "$preview" =~ ^[0-9]+$ && "$preview" -gt 0 ]] || { echo 'P77 legacy count preview failed';exit 1; }
if run_as "$admin" "SELECT public.lms_p77_activate_existing_practice('$course',99999,'ACTIVATE EXISTING PRACTICE IMPORTS')" >/dev/null 2>&1;then
 echo 'P77 invalid confirmation accepted';exit 1;fi
[[ "$(run_as "$admin" "SELECT public.lms_p77_activate_existing_practice('$course',$preview,'ACTIVATE EXISTING PRACTICE IMPORTS')->>'activated'")" == "$preview" ]] ||
 { echo 'P77 legacy activation failed count check';exit 1; }
[[ "$(query "SELECT approval_state FROM public.lms_questions WHERE source_id='file:p77-legacy'")" == approved ]] ||
 { echo 'P77 old import not activated';exit 1; }
[[ "$(query "SELECT count(*) FROM public.lms_p9b_mock_items")" == "$before_mock" ]] ||
 { echo 'P77 altered reserved official Mock';exit 1; }
# Ensure the REAL Practice start RPC delivers approved, non-Mock questions.
aid=$(run_as "$learner" "SELECT public.lms_p4_start_practice('$course','quick10',10,'7c770000-0000-4000-8000-000000000077',NULL,0)->>'attemptId'")
[[ -n "$aid" ]] || { echo 'P77 new Approved questions cannot start Quick10';exit 1; }
used=$(query "SELECT question_id FROM public.lms_practice_attempt_items WHERE attempt_id='$aid' ORDER BY position LIMIT 1")
[[ -n "$used" ]] || { echo 'P77 Practice did not save an attempt snapshot';exit 1; }
if run_as "$admin" "SELECT public.lms_p29_set_question_flags('$used',true,true)" >/dev/null 2>&1;then
 echo 'P77 leaked a previously served Practice question into Mock';exit 1;fi
delivered=$(query "SELECT question_id FROM public.lms_p34_selected_mock_answers LIMIT 1")
if [[ -n "$delivered" ]];then
 if run_as "$admin" "SELECT public.lms_p29_set_question_flags('$delivered',true,false)" >/dev/null 2>&1;then
  echo 'P77 leaked a delivered Mock question into Practice';exit 1;fi
fi
echo 'PASS P77 disposable PG: new validated imports instantly Practice-approved; safe Mock switch; strict explicit legacy opt-in; anon/learner denied and historical snapshots intact.'
