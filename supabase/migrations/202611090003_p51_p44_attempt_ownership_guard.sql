-- P51: preserve P44 practice semantics while hiding cross-user attempt existence.
-- Applied to Technica Account / klmwiivitgbyjbynxwbg on 2026-11-09.
-- No new data, no table changes, preserves P4 server-side scoring/entitlement checks.
BEGIN;
DO $pre$
BEGIN
 IF to_regprocedure('public.lms_p44_payload(uuid)') IS NULL
 OR to_regprocedure('public.lms_p4_attempt_payload(uuid)') IS NULL
 OR to_regclass('public.lms_p44_custom_config') IS NULL
 OR to_regclass('public.lms_practice_attempts') IS NULL
 THEN RAISE EXCEPTION 'P51: missing P4/P44 prerequisites'; END IF;
END $pre$;
CREATE OR REPLACE FUNCTION public.lms_p44_payload(p_attempt uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_config public.lms_p44_custom_config%ROWTYPE;
BEGIN
 -- Reject missing/no-session, foreign and non-configured attempts identically.
 -- Keep all P4 ownership/entitlement/answer-key protections in the existing payload RPC.
 IF (SELECT auth.uid()) IS NULL THEN
   RAISE EXCEPTION 'Attempt unavailable';
 END IF;
 SELECT cfg.* INTO v_config
 FROM public.lms_p44_custom_config cfg
 JOIN public.lms_practice_attempts a ON a.id=cfg.attempt_id
 WHERE cfg.attempt_id=p_attempt AND a.user_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 RETURN public.lms_p4_attempt_payload(p_attempt)||jsonb_build_object(
  'feedbackTiming',v_config.feedback_timing,'difficultyPolicy',v_config.difficulty_policy,
  'perQuestionSeconds',v_config.per_question_seconds,'cameraEnabled',v_config.camera_enabled,
  'currentPosition',v_config.current_position,'questionDeadlineAt',v_config.question_deadline_at
 );
END $function$;
REVOKE ALL ON FUNCTION public.lms_p44_payload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p44_payload(uuid) TO authenticated,service_role;
DO $post$
BEGIN
 IF has_function_privilege('anon','public.lms_p44_payload(uuid)','EXECUTE') OR
 NOT has_function_privilege('authenticated','public.lms_p44_payload(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'P51: RPC grant drift'; END IF;
END $post$;
COMMIT;
