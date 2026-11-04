#!/usr/bin/env bash
# P11 acceptance on GitHub disposable PostgreSQL ONLY after synthetic P10.
# NEVER connect to the user's real Supabase environment.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
course=10000000-0000-0000-0000-000000000001
other=10000000-0000-0000-0000-000000000002
admin=00000000-0000-0000-0000-000000000001
none=00000000-0000-0000-0000-000000000002
paid=00000000-0000-0000-0000-000000000003
trial=00000000-0000-0000-0000-000000000004
anon=00000000-0000-0000-0000-000000000000
lesson=40000000-0000-0000-0000-000000000001
run_as(){
 local role="$1" uid="$2" statement="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c \
  "BEGIN; SET LOCAL ROLE $role; SET LOCAL request.jwt.claim.sub='$uid'; $statement; COMMIT;" | tail -n 1
}
fingerprint(){
 psql -X -v ON_ERROR_STOP=1 -A -t -c "
 SELECT
 (SELECT count(*)::text||':'||count(*) FILTER(WHERE lesson_completed_at IS NOT NULL)::text FROM public.lms_lesson_progress)
 ||'|'||(SELECT count(*)::text||':'||coalesce(sum(correct_count),0)::text FROM public.lms_practice_attempts)
 ||'|'||(SELECT count(*)::text FROM public.lms_practice_attempt_items)
 ||'|'||(SELECT count(*)::text||':'||coalesce(sum(correct_count),0)::text FROM public.lms_p10_mock_attempts)
 ||'|'||(SELECT count(*)::text FROM public.lms_p10_mock_answers)
 ||'|'||(SELECT count(*)::text FROM public.lms_questions)"
}
before=$(fingerprint)
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611050002_p11_learner_progress_analytics.sql
after=$(fingerprint)
[[ "$before" == "$after" ]] || { echo 'FAIL P11 migration altered existing learner/answer data';exit 1; }
if run_as anon "$anon" "SELECT public.lms_p11_my_progress('$course')" >/dev/null 2>&1;then
 echo 'FAIL P11 allows anonymous learner analytics';exit 1
fi
if run_as authenticated "$none" "SELECT public.lms_p11_my_progress('$course')" >/dev/null 2>&1;then
 echo 'FAIL P11 unentitled learner can read ASP course';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p11_my_progress('$other')" >/dev/null 2>&1;then
 echo 'FAIL P11 cross-course analytics leak';exit 1
fi
if run_as authenticated "$paid" "SELECT correct_index_snapshot FROM public.lms_p10_mock_answers" >/dev/null 2>&1;then
 echo 'FAIL P11 enabled direct private Mock answer reads';exit 1
fi
if run_as authenticated "$paid" "SELECT public.lms_p11_my_progress(NULL)" >/dev/null 2>&1;then
 echo 'FAIL P11 null course request not denied';exit 1
fi
# The existing P2 synthetic fixture marks a reading complete, not a lesson.
# Only trusted completion timestamps are counted as actual completed lessons.
initial=$(run_as authenticated "$paid" "SELECT public.lms_p11_my_progress('$course')")
printf '%s' "$initial" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["version"]=="p11-v1" and x["courseTitle"]=="ASP"
assert x["learning"]["totalLessons"]==2
assert x["learning"]["completedLessons"]==0
assert x["learning"]["readingCompleted"]==1
assert x["learning"]["completionPercent"]==0
assert x["domains"][0]["topics"][0]["questionAccuracyPercent"] is None
assert "Synthetic reviewed item" not in json.dumps(x)
assert "correctIndex" not in json.dumps(x)
'
# Perform a verified completion update on THIS SYNTHETIC test fixture only.
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_lesson_progress SET
 lesson_completed_at=clock_timestamp(),quiz_passed=true,
 updated_at=clock_timestamp()
 WHERE user_id='$paid' AND lesson_id='$lesson';"
saved=$(fingerprint)
report=$(run_as authenticated "$paid" "SELECT public.lms_p11_my_progress('$course')")
printf '%s' "$report" | python3 -c '
import json,sys
x=json.load(sys.stdin)
l=x["learning"]
assert l["totalLessons"]==2 and l["completedLessons"]==1
assert l["completionPercent"]==50
assert l["readingCompleted"]==1 and l["quizzesPassed"]==1
d=[d for d in x["domains"] if d["completedLessons"]>0]
assert len(d)==1 and d[0]["totalLessons"]==2
assert d[0]["completionPercent"]==50
assert d[0]["topics"][0]["completedLessons"]==1
assert d[0]["topics"][0]["questionAccuracyPercent"] is None
assert x["mock"]["attempts"]==2
assert x["mock"]["assignedQuestions"]==400
assert x["mock"]["answeredQuestions"]==2
assert x["mock"]["correctAnswers"]==1
assert x["mock"]["scoredPercent"]==0.25
assert x["mock"]["answerAccuracyPercent"]==50
assert x["practice"]["attempts"]>=1
assert x["practice"]["answeredQuestions"]>=1
assert x["practice"]["correctAnswers"]<=x["practice"]["answeredQuestions"]
assert len(x["recentAttempts"])<=10
assert all(a["state"] in ("submitted","expired") for a in x["recentAttempts"])
assert all(a["scorePercent"] is not None for a in x["recentAttempts"])
assert all("prompt" not in json.dumps(a) for a in x["recentAttempts"])
'
final=$(fingerprint)
[[ "$saved" == "$final" ]] || { echo 'FAIL P11 read-only RPC mutated protected data';exit 1; }
echo 'PASS P11 private real-schema learner report: P2 completion, 2 published lessons, separate 200 Mock/Practice, honest answer denominators and no keys'

trial_report=$(run_as authenticated "$trial" "SELECT public.lms_p11_my_progress('$course')")
printf '%s' "$trial_report" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["learning"]["totalLessons"]==1, "Trial could view an ungranted lesson"
assert x["learning"]["completedLessons"]==0
assert x["mock"]["attempts"]==0 and x["practice"]["attempts"]==0
assert x["recentAttempts"]==[]
'
admin_report=$(run_as authenticated "$admin" "SELECT public.lms_p11_my_progress('$course')")
printf '%s' "$admin_report" | python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x["learning"]["totalLessons"]==3, "Admin should see draft lessons"
assert x["mock"]["attempts"]==0, "Admin must not see another learner Mock"
'
echo 'PASS P11 Trial-only lesson isolation, Admin own metrics only, no cross-user activity'
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_profiles SET account_status='suspended' WHERE id='$paid';"
if run_as authenticated "$paid" "SELECT public.lms_p11_my_progress('$course')" >/dev/null 2>&1;then
 echo 'FAIL P11 suspended learner has analytics access';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_profiles SET account_status='active' WHERE id='$paid';
 UPDATE public.lms_entitlements SET status='revoked' WHERE user_id='$paid';"
if run_as authenticated "$paid" "SELECT public.lms_p11_my_progress('$course')" >/dev/null 2>&1;then
 echo 'FAIL P11 learner can view course after entitlement revocation';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_entitlements SET status='active' WHERE user_id='$paid';"
echo 'PASS P11 suspended/revoked user authorization denied; private source/answers and source bank remain unchanged'
