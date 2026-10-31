-- Technica LMS | P2 additive learning progress | 2026-10-31
-- STAGING ONLY, dedicated project. Run AFTER 202610300001_p1_foundation.sql.
-- The P1 migration ALREADY defines Course -> Domain -> Topic -> Lesson.
-- Never run this against CHEIRON or an unrelated Supabase database.
-- API clients have SELECT-only access to their own progress; only trusted
-- service-side code may write verified progress/events/revisions.
BEGIN;

DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY[
    'lms_profiles','lms_courses','lms_domains','lms_topics','lms_lessons',
    'lms_role_assignments','lms_lesson_blocks'
  ] LOOP
    IF to_regclass(format('public.%I', n)) IS NULL THEN
      RAISE EXCEPTION 'P2 requires P1: missing public.%', n;
    END IF;
  END LOOP;
  IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL THEN
    RAISE EXCEPTION 'P2 requires P1 admin authorization function';
  END IF;
  FOREACH n IN ARRAY ARRAY[
    'lms_lesson_progress','lms_lesson_events','lms_course_structure_versions'
  ] LOOP
    IF to_regclass(format('public.%I', n)) IS NOT NULL THEN
      RAISE EXCEPTION 'P2 conflict: public.% already exists. Stop and review', n;
    END IF;
  END LOOP;
END $$;

-- The canonical nesting is enforced by P1 foreign keys:
-- lms_domains.course_id -> courses.id
-- lms_topics.domain_id -> domains.id
-- lms_lessons.topic_id -> topics.id
CREATE TABLE public.lms_lesson_progress (
  user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
  reading_completed boolean NOT NULL DEFAULT false,
  video_completed boolean NOT NULL DEFAULT false,
  video_watched_seconds integer NOT NULL DEFAULT 0 CHECK (video_watched_seconds >= 0),
  quiz_best_percent numeric(5,2) CHECK (quiz_best_percent BETWEEN 0 AND 100),
  quiz_passed boolean NOT NULL DEFAULT false,
  lesson_completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- Immutable-ish event ingest log. Write it only through an authenticated
-- backend validator/Edge Function, never directly from learner devices.
CREATE TABLE public.lms_lesson_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'section_viewed','video_checkpoint','quiz_submitted','lesson_completed'
  )),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_data) = 'object'),
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Draft/publish snapshots are server-managed; never exposed to learners.
CREATE TABLE public.lms_course_structure_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision >= 1),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_by uuid REFERENCES public.lms_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, revision)
);

CREATE INDEX lms_lesson_progress_lesson_idx ON public.lms_lesson_progress(lesson_id);
CREATE INDEX lms_lesson_progress_recent_idx ON public.lms_lesson_progress(user_id,last_activity_at DESC);
CREATE INDEX lms_lesson_events_user_time_idx ON public.lms_lesson_events(user_id,received_at DESC);
CREATE INDEX lms_lesson_events_lesson_idx ON public.lms_lesson_events(lesson_id);
CREATE INDEX lms_structure_versions_latest_idx ON public.lms_course_structure_versions(course_id,revision DESC);

ALTER TABLE public.lms_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lesson_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_course_structure_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lms_lesson_progress FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.lms_lesson_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.lms_course_structure_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.lms_lesson_progress TO service_role;
GRANT ALL ON TABLE public.lms_lesson_events TO service_role;
GRANT ALL ON TABLE public.lms_course_structure_versions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lms_lesson_events_id_seq TO service_role;
GRANT SELECT ON TABLE public.lms_lesson_progress TO authenticated;

CREATE POLICY lms_p2_progress_own_or_admin
  ON public.lms_lesson_progress FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
-- No INSERT/UPDATE/DELETE policies for authenticated or anon.
-- No client grants for raw events or authoring revision snapshots.
COMMIT;
