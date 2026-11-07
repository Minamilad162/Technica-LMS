#!/usr/bin/env bash
# P21 platform subscription security on disposable PostgreSQL only.
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
ADMIN='00000000-0000-0000-0000-000000000001'
LEARNER='00000000-0000-0000-0000-000000000002'
OTHER='00000000-0000-0000-0000-000000000004'
C1='10000000-0000-0000-0000-000000000001'
C2='10000000-0000-0000-0000-000000000002'
LESSON='40000000-0000-0000-0000-000000000002'
count_before=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
        (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
        (SELECT count(*) FROM public.lms_lesson_blocks)::text")
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611070002_p21_platform_subscriptions.sql
count_after=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT (SELECT count(*) FROM public.lms_courses)::text||'|'||
        (SELECT count(*) FROM public.lms_entitlements)::text||'|'||
        (SELECT count(*) FROM public.lms_lesson_blocks)::text")
[[ "$count_before" == "$count_after" ]] || { echo 'FAIL P21 modified legacy data';exit 1; }
query_as(){
 local role="$1" uid="$2" sql="$3"
 psql -X -v ON_ERROR_STOP=1 -q -A -t -c "BEGIN; SET LOCAL ROLE $role;
 SET LOCAL request.jwt.claim.sub='$uid'; $sql; ROLLBACK;" | grep -E '^(t|f|true|false|[0-9]+)$' | tail -n 1 | sed 's/^t$/true/;s/^f$/false/'
}
[[ "$(query_as anon 00000000-0000-0000-0000-000000000000 "SELECT count(*) FROM public.lms_subscription_plans")" == 3 ]] || { echo 'FAIL P21 published seed plans';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p21_has_active_subscription()")" == false ]] || { echo 'FAIL P21 unentitled learner active';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == false ]] || { echo 'FAIL P21 unrelated Course Practice not locked';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 INSERT INTO public.lms_platform_subscriptions(user_id,plan_id,plan_name_snapshot,duration_months_snapshot,status,source,starts_at,ends_at)
 SELECT '$LEARNER',id,'Hacked',3,'active','admin_manual',now(),now()+interval '3 months'
 FROM public.lms_subscription_plans LIMIT 1;ROLLBACK" >/dev/null 2>&1;then
 echo 'FAIL P21 learner minted subscription';exit 1
fi
PLAN=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT id FROM public.lms_subscription_plans WHERE code='three-months'")
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p21_save_plan('$PLAN','Hacked plan',3,100,'EGP','',true);ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P21 learner edited plan';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p21_request_plan('$PLAN');ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P21 allowed unpriced plan request';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN; SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p21_save_plan('$PLAN','Quarterly Access',3,900,'EGP','All Courses and exams',true);
 COMMIT;" >/dev/null
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN; SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p21_request_plan('$PLAN'); COMMIT;" >/dev/null
REQUEST=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT id FROM public.lms_subscription_requests WHERE user_id='$LEARNER' AND status='pending'")
[[ -n "$REQUEST" ]] || { echo 'FAIL P21 request not recorded';exit 1; }
# Price and duration at REQUEST time remain immutable if Admin changes Plan.
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT duration_months_snapshot::text||'|'||price_amount_snapshot::text||'|'||currency_snapshot
 FROM public.lms_subscription_requests WHERE id='$REQUEST'")" == '3|900.00|EGP' ]] || { echo 'FAIL P21 request did not freeze the chosen terms';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p21_save_plan('$PLAN','Later Edited Plan',9,1500,'EGP','Latest commercial terms',true);
 COMMIT;" >/dev/null

[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p21_has_active_subscription()")" == false ]] || { echo 'FAIL P21 request self-activated';exit 1; }
[[ "$(query_as authenticated "$OTHER" "SELECT count(*) FROM public.lms_subscription_requests WHERE id='$REQUEST'")" == 0 ]] || { echo 'FAIL P21 leaked other learner request';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p21_admin_decide_request('$REQUEST',true);ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P21 learner self-approved subscription';exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$LEARNER';
 SELECT public.lms_p21_request_plan('$PLAN');ROLLBACK;" >/dev/null 2>&1;then
 echo 'FAIL P21 duplicate pending request';exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p21_admin_decide_request('$REQUEST',true); COMMIT;" >/dev/null
SUB=$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT id FROM public.lms_platform_subscriptions WHERE user_id='$LEARNER' AND status='active'")
[[ -n "$SUB" ]] || { echo 'FAIL P21 no activated subscription';exit 1; }
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT plan_name_snapshot||'|'||duration_months_snapshot::text||'|'||price_amount_snapshot::text||'|'||currency_snapshot
 FROM public.lms_platform_subscriptions WHERE id='$SUB'")" == 'Quarterly Access|3|900.00|EGP' ]] || { echo 'FAIL P21 membership terms differ from original learner request';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p21_has_active_subscription()")" == true ]] || { echo 'FAIL P21 activated user has no access';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C1')")" == true ]] || { echo 'FAIL P21 Practice A locked';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == true ]] || { echo 'FAIL P21 Practice B locked';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p1_can_view_lesson('$LESSON')")" == true ]] || { echo 'FAIL P21 paid lesson locked';exit 1; }
[[ "$(query_as authenticated "$OTHER" "SELECT public.lms_p21_has_active_subscription()")" == false ]] || { echo 'FAIL P21 leaked to another learner';exit 1; }
[[ "$(query_as authenticated "$OTHER" "SELECT count(*) FROM public.lms_platform_subscriptions WHERE id='$SUB'")" == 0 ]] || { echo 'FAIL P21 leaked subscription row';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p21_save_plan('$PLAN','New Name',9,1500,'EGP','Updated price',true);
 COMMIT;" >/dev/null
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "SELECT duration_months_snapshot FROM public.lms_platform_subscriptions WHERE id='$SUB'")" == 3 ]] || { echo 'FAIL P21 retroactively changed purchased duration';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_platform_subscriptions SET ends_at=now()-interval '1 second'
 WHERE id='$SUB'" >/dev/null
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p21_has_active_subscription()")" == false ]] || { echo 'FAIL P21 expired subscription still unlocked';exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.lms_platform_subscriptions SET ends_at=now()+interval '1 day'
 WHERE id='$SUB'" >/dev/null
psql -X -v ON_ERROR_STOP=1 -q -c "
 BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='$ADMIN';
 SELECT public.lms_p21_admin_revoke('$SUB'); COMMIT;" >/dev/null
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p21_has_active_subscription()")" == false ]] || { echo 'FAIL P21 revoked still active';exit 1; }
[[ "$(query_as authenticated "$LEARNER" "SELECT public.lms_p4_can_practice('$C2')")" == false ]] || { echo 'FAIL P21 revoked unrelated Course still accessible';exit 1; }
[[ "$(psql -X -v ON_ERROR_STOP=1 -q -A -t -c "
 SELECT count(*) FROM public.lms_audit_events
 WHERE event_type IN ('p21_plan_saved','p21_subscription_requested','p21_subscription_decided','p21_subscription_revoked')")" -ge 5 ]] || { echo 'FAIL P21 audit events incomplete';exit 1; }
if psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611070002_p21_platform_subscriptions.sql >/dev/null 2>&1;then
 echo 'FAIL P21 replay not guarded';exit 1
fi
echo 'PASS P21: three plans, editable Admin pricing, no learner grants, pending/review, cross-Course access, expiry, revocation, snapshots, RLS, audit, strict replay guard.'
