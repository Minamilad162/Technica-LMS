-- P41: TEMPORARY server-controlled open access for published Technica LMS content.
-- AUTHORIZE AND APPLY ONCE to the EXACT Technica environment after read-only ledger,
-- backup and review. Does NOT publish Drafts, fabricate ASP questions, or bypass RLS.
-- Later Admin can disable via lms_p41_set_open_access(false), restoring P21 billing.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.lms_p1_course_entitled(uuid)') IS NULL
 OR to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
 OR to_regprocedure('public.lms_p4_can_practice(uuid)') IS NULL
 OR to_regprocedure('public.lms_p21_has_active_subscription()') IS NULL
 OR to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN RAISE EXCEPTION 'P41_REQUIRES_INSTALLED_P1_P4_P21'; END IF;
 IF to_regclass('public.lms_p41_access_policy') IS NOT NULL
 OR to_regprocedure('public.lms_p41_access_mode()') IS NOT NULL
 THEN RAISE EXCEPTION 'P41_ALREADY_INSTALLED_NO_REPLAY'; END IF;
END $$;

CREATE TABLE public.lms_p41_access_policy (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton IS TRUE),
 open_access boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_by uuid REFERENCES public.lms_profiles(id) ON DELETE SET NULL
);
INSERT INTO public.lms_p41_access_policy(singleton,open_access) VALUES(true,true);
ALTER TABLE public.lms_p41_access_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_p41_access_policy FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_p41_access_policy TO service_role;
-- Policy remains private: learners cannot read or mutate its flag.
CREATE POLICY lms_p41_admin_policy_read ON public.lms_p41_access_policy
 FOR SELECT TO authenticated USING(public.lms_p1_actor_is_admin());

CREATE FUNCTION public.lms_p41_open_access() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_p41_access_policy cfg
  JOIN public.lms_profiles p ON p.id=(SELECT auth.uid())
  WHERE cfg.singleton IS TRUE AND cfg.open_access IS TRUE
  AND p.account_status='active'
 );
$$;
CREATE FUNCTION public.lms_p41_access_mode() RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN public.lms_p41_open_access() THEN 'open' ELSE 'subscription' END;
$$;
CREATE FUNCTION public.lms_p41_set_open_access(p_enabled boolean) RETURNS boolean
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 DECLARE v_old boolean;
 BEGIN
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'Explicit boolean required'; END IF;
  IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
  THEN RAISE EXCEPTION 'Verified LMS Admin required'; END IF;
  SELECT open_access INTO v_old FROM public.lms_p41_access_policy
   WHERE singleton=true FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'P41 access policy missing'; END IF;
  UPDATE public.lms_p41_access_policy
   SET open_access=p_enabled,updated_at=clock_timestamp(),updated_by=(SELECT auth.uid())
   WHERE singleton=true;
  INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
   VALUES((SELECT auth.uid()),'p41_access_mode_changed','platform_access',NULL,
    jsonb_build_object('oldOpenAccess',v_old,'newOpenAccess',p_enabled));
  RETURN p_enabled;
 END; $$;
REVOKE ALL ON FUNCTION public.lms_p41_open_access(),
 public.lms_p41_access_mode(),public.lms_p41_set_open_access(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p41_open_access(),
 public.lms_p41_access_mode() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p41_set_open_access(boolean) TO authenticated;

-- Preserve paid/manual/trial entitlements, Admin, content-author and published guards.
-- Only the billing requirement changes for AUTHENTICATED ACTIVE profiles in open mode.
CREATE OR REPLACE FUNCTION public.lms_p1_course_entitled(p_course_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_entitlements e
  JOIN public.lms_profiles p ON p.id=e.user_id
  WHERE e.user_id=(SELECT auth.uid()) AND p.account_status='active'
   AND e.course_id=p_course_id AND e.status='active'
   AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
 ) OR ((public.lms_p41_open_access() OR public.lms_p21_has_active_subscription())
  AND EXISTS(SELECT 1 FROM public.lms_courses c
    WHERE c.id=p_course_id AND c.publication_state='published'));
$$;
CREATE OR REPLACE FUNCTION public.lms_p1_can_view_lesson(p_lesson_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_lessons l
  JOIN public.lms_topics t ON t.id=l.topic_id
  JOIN public.lms_domains d ON d.id=t.domain_id
  JOIN public.lms_courses c ON c.id=d.course_id
  WHERE l.id=p_lesson_id AND (
   public.lms_p1_actor_is_admin() OR public.lms_p1_actor_is_author_for(c.id)
   OR (c.publication_state='published' AND l.publication_state='published'
    AND (public.lms_p41_open_access() OR public.lms_p21_has_active_subscription()
     OR EXISTS(
      SELECT 1 FROM public.lms_entitlements e
      JOIN public.lms_profiles p ON p.id=e.user_id
      WHERE e.user_id=(SELECT auth.uid()) AND p.account_status='active'
       AND e.course_id=c.id AND e.status='active'
       AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
       AND (e.entitlement_type IN ('paid','manual') OR
        (e.entitlement_type='trial' AND EXISTS(
         SELECT 1 FROM public.lms_trial_lesson_grants g
         WHERE g.entitlement_id=e.id AND g.lesson_id=l.id
        )))
     ))
   )
  )
 );
$$;
CREATE OR REPLACE FUNCTION public.lms_p4_can_practice(p_course uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (
  EXISTS(SELECT 1 FROM public.lms_courses c
   WHERE c.id=p_course AND c.publication_state='published')
  AND (public.lms_p41_open_access() OR public.lms_p21_has_active_subscription()
   OR EXISTS(
    SELECT 1 FROM public.lms_profiles p
    JOIN public.lms_entitlements e ON e.user_id=p.id
    WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
     AND e.course_id=p_course AND e.entitlement_type IN ('paid','manual')
     AND e.status='active' AND e.starts_at<=now()
     AND (e.ends_at IS NULL OR e.ends_at>now())
   ))
 ) OR (public.lms_p1_actor_is_admin() AND EXISTS(
   SELECT 1 FROM public.lms_courses c WHERE c.id=p_course));
$$;
REVOKE ALL ON FUNCTION public.lms_p1_course_entitled(uuid),
 public.lms_p1_can_view_lesson(uuid),public.lms_p4_can_practice(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p1_course_entitled(uuid),
 public.lms_p1_can_view_lesson(uuid),public.lms_p4_can_practice(uuid)
 TO authenticated,service_role;
COMMIT;
