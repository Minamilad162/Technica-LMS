-- P50: Technica new-project schema security verification (2026-11-09).
-- Applied ONLY to Technica Account: klmwiivitgbyjbynxwbg.
-- No seed data, auth users, course/question rows or subscription changes.
-- For a fresh installation P28.2 is legacy-only: original P28 already provides 7-arg Bank RPC.
BEGIN;
DO $audit$
BEGIN
 IF to_regclass('public.lms_courses') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.lms_courses'::regclass AND conname='lms_p17_cover_path_guard' AND contype='c')
 THEN RAISE EXCEPTION 'P50 missing P17 cover constraint'; END IF;
 IF to_regprocedure('public.rls_auto_enable()') IS NULL
 THEN RAISE EXCEPTION 'P50 missing expected RLS event trigger helper'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtfoid='public.rls_auto_enable()'::regprocedure AND evtname='ensure_rls' AND evtenabled='O')
 THEN RAISE EXCEPTION 'P50 RLS event trigger configuration changed'; END IF;
END $audit$;
ALTER TABLE public.lms_courses VALIDATE CONSTRAINT lms_p17_cover_path_guard;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
DO $post$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.lms_courses'::regclass AND conname='lms_p17_cover_path_guard' AND NOT convalidated)
 THEN RAISE EXCEPTION 'P50 cover path remains unvalidated'; END IF;
 IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')
 THEN RAISE EXCEPTION 'P50 event trigger function still callable by API roles'; END IF;
END $post$;
COMMIT;
