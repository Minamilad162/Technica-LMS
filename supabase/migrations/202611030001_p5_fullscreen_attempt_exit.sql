-- Technica LMS P5: secure fullscreen-question exit lifecycle.
-- Dedicated Technica Supabase STAGING ONLY. AFTER P1, P2, P4.
-- This does not detect screenshots/recording or attest browser state on server.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_practice_attempts') IS NULL OR
    to_regprocedure('public.lms_p4_attempt_payload(uuid)') IS NULL THEN
   RAISE EXCEPTION 'P5 requires P4 schema/RPCs; stop, do not skip migrations';
 END IF;
 IF to_regprocedure('public.lms_p5_abandon_practice(uuid)') IS NOT NULL THEN
   RAISE EXCEPTION 'P5 already applied: do not run twice';
 END IF;
END $$;

ALTER TABLE public.lms_practice_attempts
 DROP CONSTRAINT lms_practice_attempts_state_check;
ALTER TABLE public.lms_practice_attempts
 ADD CONSTRAINT lms_practice_attempts_state_check
 CHECK(state IN ('in_progress','submitted','expired','abandoned'));

CREATE OR REPLACE FUNCTION public.lms_p4_attempt_payload(p_attempt uuid) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
DECLARE entries jsonb;
BEGIN
 SELECT * INTO a FROM public.lms_practice_attempts
 WHERE id=p_attempt AND user_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF NOT public.lms_p4_can_practice(a.course_id) THEN RAISE EXCEPTION 'Course access is not active'; END IF;
 -- A user who exits fullscreen is removed from question and answer review;
 -- even guessing the old attempt ID never reveals the reserved snapshots.
 IF a.state='abandoned' THEN
   RETURN jsonb_build_object('attemptId',a.id,'state','abandoned',
      'questions','[]'::jsonb,'serverNow',clock_timestamp());
 END IF;
 SELECT coalesce(jsonb_agg(
   jsonb_build_object('id',i.question_id,'position',i.position,'prompt',i.prompt_snapshot,
     'options',i.options_snapshot,'selectedIndex',i.selected_index)
   || CASE WHEN a.state='in_progress' THEN '{}'::jsonb ELSE
       jsonb_build_object('correctIndex',i.correct_index_snapshot,'explanation',i.explanation_snapshot) END
   ORDER BY i.position),'[]'::jsonb)
 INTO entries FROM public.lms_practice_attempt_items i WHERE i.attempt_id=a.id;
 RETURN jsonb_build_object('attemptId',a.id,'courseId',a.course_id,'mode',a.mode,
   'state',a.state,'startedAt',a.started_at,'deadlineAt',a.deadline_at,
   'serverNow',clock_timestamp(),'questionCount',a.question_count,
   'submittedAt',a.submitted_at,'correctCount',a.correct_count,
   'scorePercent',a.score_percent,'questions',entries);
END; $$;

CREATE FUNCTION public.lms_p5_abandon_practice(p_attempt_id uuid) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.lms_practice_attempts%ROWTYPE;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authenticated user required'; END IF;
 SELECT * INTO a FROM public.lms_practice_attempts
  WHERE id=p_attempt_id AND user_id=(SELECT auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF a.state='in_progress' THEN
   UPDATE public.lms_practice_attempts
    SET state='abandoned',submitted_at=clock_timestamp(),
        correct_count=NULL,score_percent=NULL
    WHERE id=p_attempt_id;
   a.state:='abandoned';
 END IF;
 -- Return no answers/snapshots regardless of current attempt state.
 RETURN jsonb_build_object('attemptId',a.id,'state',a.state,
  'closed',a.state='abandoned','serverNow',clock_timestamp());
END; $$;

REVOKE ALL ON FUNCTION public.lms_p5_abandon_practice(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p5_abandon_practice(uuid) TO authenticated,service_role;
-- Keep the existing P4 reader's strict privilege boundary.
REVOKE ALL ON FUNCTION public.lms_p4_attempt_payload(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p4_attempt_payload(uuid) TO authenticated,service_role;
COMMIT;