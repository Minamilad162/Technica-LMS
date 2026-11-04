-- Technica LMS P8e: READ-ONLY verification AFTER owner-run P8e migration.
-- Dedicated Technica STAGING Supabase only; no writes, no learner/answer rows.
-- This script checks source function footprints + expected arithmetic without
-- granting roles or querying private per-learner attempts/answer snapshots.

-- 1. Fixed correct targets use ORIGINAL tier allocations, never the number
-- of extra questions attempted after missing an earlier answer.
WITH targets(n,low_base,medium_base,low_correct,medium_correct) AS (
 VALUES (10,3,3,3,3),(25,8,8,6,6),(30,10,10,7,7),(50,16,17,12,12)
)
SELECT 'P8E_FIXED_TARGET' AS section,n AS requested_questions,
 public.lms_p8_checkpoint(n) AS low_base,
 public.lms_p8_medium_checkpoint(n) AS medium_base,
 ceil(public.lms_p8_checkpoint(n)*7.0/10)::int AS low_required_correct,
 ceil(public.lms_p8_medium_checkpoint(n)*7.0/10)::int AS medium_required_correct,
 CASE WHEN public.lms_p8_checkpoint(n)=low_base
   AND public.lms_p8_medium_checkpoint(n)=medium_base
   AND ceil(public.lms_p8_checkpoint(n)*7.0/10)::int=low_correct
   AND ceil(public.lms_p8_medium_checkpoint(n)*7.0/10)::int=medium_correct
 THEN 'PASS' ELSE 'FAIL' END AS status
FROM targets ORDER BY n;

-- 2. In-flight P8/P8d rows use NULL promotion_policy; no existing row updates.
SELECT 'P8E_PRIVATE_VERSION_COLUMN' AS section,
 'lms_practice_adaptive_state.promotion_policy' AS item,
 CASE WHEN EXISTS(
  SELECT 1 FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='lms_practice_adaptive_state'
    AND a.attname='promotion_policy' AND NOT a.attisdropped
    AND NOT a.attnotnull
 ) AND EXISTS (
  SELECT 1 FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='lms_practice_adaptive_state'
    AND c.relrowsecurity
 ) AND NOT coalesce(pg_catalog.has_table_privilege('authenticated',
   to_regclass('public.lms_practice_adaptive_state'),'SELECT'),false)
 THEN 'PASS' ELSE 'FAIL' END AS status;

-- 3. Protected answer RPC MUST implement the fixed baseline for new sessions
-- and separately retain the old growing-denominator behavior for in-flight
-- attempts. Return only PASS/FAIL, never function source in the report.
WITH fn AS (
 SELECT to_regprocedure('public.lms_p8_answer_levelup(uuid,uuid,integer)') AS oid
),source AS (
 SELECT CASE WHEN oid IS NULL THEN '' ELSE pg_get_functiondef(oid) END AS body
 FROM fn
)
SELECT 'P8E_SERVER_PROMOTION' AS section,'lms_p8_answer_levelup' AS item,
 CASE WHEN body LIKE '%s.promotion_policy=%thirds-fixed-correct-v2%'
   AND body LIKE '%v_tier_correct*10 >= (CASE%'
   AND body LIKE '%ELSE s.checkpoint_size END)*7%'
   AND body LIKE '%s.promotion_policy IS NULL%'
   AND body LIKE '%v_tier_correct*10>=v_tier_attempted*7%'
 THEN 'PASS' ELSE 'FAIL' END AS status
FROM source;

-- 4. New start persists fixed-base policy version, and readiness advertises it.
WITH funcs AS (
 SELECT
  to_regprocedure('public.lms_p8_start_levelup(uuid,integer,uuid,uuid,integer)') AS start_oid,
  to_regprocedure('public.lms_p8_levelup_readiness(uuid,integer,uuid)') AS ready_oid
),source AS (
 SELECT
  CASE WHEN start_oid IS NULL THEN '' ELSE pg_get_functiondef(start_oid) END AS start_body,
  CASE WHEN ready_oid IS NULL THEN '' ELSE pg_get_functiondef(ready_oid) END AS ready_body
 FROM funcs
)
SELECT 'P8E_NEW_SESSIONS' AS section,'fixed-correct policy version' AS item,
 CASE WHEN start_body LIKE '%promotion_policy)%'
   AND start_body LIKE '%thirds-fixed-correct-v2%'
   AND ready_body LIKE '%lowRequiredCorrect%'
   AND ready_body LIKE '%mediumRequiredCorrect%'
   AND ready_body LIKE '%thirds-fixed-correct-v2%'
 THEN 'PASS' ELSE 'FAIL' END AS status
FROM source;
