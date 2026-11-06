-- P15: published catalog outline + admin-opted free first lesson.
-- ADDITIVE source only. Do NOT execute on Production without separate approval.
-- Preserves existing RLS for paid/manual/Trial, private media and Mock/Practice.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.lms_courses') IS NULL OR
    to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
 THEN RAISE EXCEPTION 'P15 requires installed P1'; END IF;
 IF to_regclass('public.lms_p15_intro_settings') IS NOT NULL
 THEN RAISE EXCEPTION 'P15 already installed - do not replay migration'; END IF;
END $$;
CREATE TABLE public.lms_p15_intro_settings(
 course_id uuid PRIMARY KEY REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 enabled boolean NOT NULL DEFAULT false,
 intro_lesson_id uuid REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE RESTRICT,
 CHECK(NOT enabled OR intro_lesson_id IS NOT NULL)
);
ALTER TABLE public.lms_p15_intro_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p15_intro_settings FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_p15_intro_settings TO service_role;

CREATE FUNCTION public.lms_p15_first_published_lesson(p_course_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT l.id FROM public.lms_lessons l
 JOIN public.lms_topics t ON t.id=l.topic_id
 JOIN public.lms_domains d ON d.id=t.domain_id
 JOIN public.lms_courses c ON c.id=d.course_id
 WHERE c.id=p_course_id AND c.publication_state='published'
   AND l.publication_state='published'
 ORDER BY d.position,d.id,t.position,t.id,l.position,l.id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lms_p15_first_published_lesson(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p15_first_published_lesson(uuid) TO service_role;

CREATE FUNCTION public.lms_p15_can_preview_lesson(p_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.lms_lessons l
  JOIN public.lms_topics t ON t.id=l.topic_id
  JOIN public.lms_domains d ON d.id=t.domain_id
  JOIN public.lms_courses c ON c.id=d.course_id
  JOIN public.lms_p15_intro_settings s ON s.course_id=c.id AND s.enabled=true
  JOIN public.lms_profiles p ON p.id=(SELECT auth.uid())
  WHERE l.id=p_lesson_id AND s.intro_lesson_id=l.id
    AND p.account_status='active'
    AND c.publication_state='published' AND l.publication_state='published'
    AND l.id=public.lms_p15_first_published_lesson(c.id)
 );
$$;
REVOKE ALL ON FUNCTION public.lms_p15_can_preview_lesson(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p15_can_preview_lesson(uuid) TO authenticated,service_role;

-- A free intro is an EXTRA narrow SELECT rule, not an expanded full-course
-- entitlement. P1 paid/manual/trial lesson policies remain authoritative.
CREATE POLICY lms_p15_intro_lesson_read ON public.lms_lessons
 FOR SELECT TO authenticated USING(public.lms_p15_can_preview_lesson(id));
CREATE POLICY lms_p15_intro_block_read ON public.lms_lesson_blocks
 FOR SELECT TO authenticated USING(public.lms_p15_can_preview_lesson(lesson_id));

-- Only PUBLIC COURSE + PUBLISHED LESSON TITLES. No blocks, answers,
-- drafts, storage metadata, learner information or paid content returned.
CREATE FUNCTION public.lms_p15_course_outline(p_course_id uuid)
RETURNS TABLE(
 domain_id uuid,domain_title text,domain_position integer,
 topic_id uuid,topic_title text,topic_position integer,
 lesson_id uuid,lesson_title text,lesson_position integer,
 is_free_intro boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.lms_profiles p
  WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
 ) THEN RAISE EXCEPTION 'Active LMS account required'; END IF;
 RETURN QUERY SELECT d.id,d.title,d.position,t.id,t.title,t.position,
  l.id,l.title,l.position,
  (coalesce(s.enabled,false) AND s.intro_lesson_id=l.id AND
    l.id=public.lms_p15_first_published_lesson(c.id)) AS is_free_intro
 FROM public.lms_courses c
 JOIN public.lms_domains d ON d.course_id=c.id
 JOIN public.lms_topics t ON t.domain_id=d.id
 JOIN public.lms_lessons l ON l.topic_id=t.id
 LEFT JOIN public.lms_p15_intro_settings s ON s.course_id=c.id
 WHERE c.id=p_course_id AND c.publication_state='published'
  AND l.publication_state='published'
 ORDER BY d.position,d.id,t.position,t.id,l.position,l.id;
END $$;
REVOKE ALL ON FUNCTION public.lms_p15_course_outline(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p15_course_outline(uuid) TO authenticated,service_role;

CREATE FUNCTION public.lms_p15_admin_intro_enabled(p_course_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified Admin required'; END IF;
 RETURN coalesce((SELECT enabled FROM public.lms_p15_intro_settings
  WHERE course_id=p_course_id),false);
END $$;
REVOKE ALL ON FUNCTION public.lms_p15_admin_intro_enabled(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p15_admin_intro_enabled(uuid) TO authenticated,service_role;

CREATE FUNCTION public.lms_p15_set_intro(p_course_id uuid,p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_first uuid;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() OR p_course_id IS NULL OR p_enabled IS NULL
 THEN RAISE EXCEPTION 'Verified Admin and valid course required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_courses WHERE id=p_course_id)
 THEN RAISE EXCEPTION 'Course not found'; END IF;
 v_first=public.lms_p15_first_published_lesson(p_course_id);
 IF p_enabled AND v_first IS NULL
 THEN RAISE EXCEPTION 'Publish course and its first Lesson before enabling free intro'; END IF;
 INSERT INTO public.lms_p15_intro_settings(course_id,enabled,intro_lesson_id,updated_at,updated_by)
 VALUES(p_course_id,p_enabled,CASE WHEN p_enabled THEN v_first ELSE NULL END,now(),auth.uid())
 ON CONFLICT(course_id) DO UPDATE
 SET enabled=EXCLUDED.enabled,intro_lesson_id=EXCLUDED.intro_lesson_id,
 updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by;
 RETURN p_enabled;
END $$;
REVOKE ALL ON FUNCTION public.lms_p15_set_intro(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p15_set_intro(uuid,boolean) TO authenticated,service_role;
COMMIT;
