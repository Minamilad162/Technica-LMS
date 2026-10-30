-- Technica LMS P1: proposed production foundation. STAGING ONLY until security review.
-- Never execute in CHEIRON or other projects. No service key in frontend.
BEGIN;
DO $$ DECLARE n text; BEGIN
  FOREACH n IN ARRAY ARRAY[
   'lms_profiles','lms_role_assignments','lms_courses','lms_domains','lms_topics',
   'lms_lessons','lms_lesson_blocks','lms_entitlements','lms_trial_lesson_grants',
   'lms_media_assets','lms_audit_events'
  ] LOOP
    IF to_regclass(format('public.%I',n)) IS NOT NULL THEN
      RAISE EXCEPTION 'P1 conflict: public.% already exists. Review existing schema; do not overwrite',n;
    END IF;
  END LOOP;
END $$;

CREATE TABLE public.lms_profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name)<=160),
 locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ar')),
 account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lms_courses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
 summary text NOT NULL DEFAULT '',
 publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft','published','archived')),
 cover_path text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lms_domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 slug text NOT NULL, title text NOT NULL,
 position integer NOT NULL DEFAULT 0 CHECK (position>=0),
 UNIQUE (course_id,slug)
);
CREATE TABLE public.lms_topics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 domain_id uuid NOT NULL REFERENCES public.lms_domains(id) ON DELETE RESTRICT,
 slug text NOT NULL, title text NOT NULL,
 position integer NOT NULL DEFAULT 0 CHECK (position>=0),
 UNIQUE(domain_id,slug)
);
CREATE TABLE public.lms_lessons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 topic_id uuid NOT NULL REFERENCES public.lms_topics(id) ON DELETE RESTRICT,
 slug text NOT NULL, title text NOT NULL,
 position integer NOT NULL DEFAULT 0 CHECK (position>=0),
 publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft','published','archived')),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 UNIQUE(topic_id,slug)
);
CREATE TABLE public.lms_lesson_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 block_type text NOT NULL CHECK (block_type IN
   ('heading','text','image','pdf','video','table','callout','quiz')),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
 position integer NOT NULL DEFAULT 0 CHECK (position>=0)
);
CREATE TABLE public.lms_role_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('admin','content_author')),
 scope_course_id uuid REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 granted_by uuid REFERENCES public.lms_profiles(id),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 CHECK ((role='admin' AND scope_course_id IS NULL) OR
        (role='content_author' AND scope_course_id IS NOT NULL))
);
CREATE UNIQUE INDEX lms_role_active_unique_idx
 ON public.lms_role_assignments
 (user_id,role,coalesce(scope_course_id,'00000000-0000-0000-0000-000000000000'::uuid))
 WHERE revoked_at IS NULL;
CREATE TABLE public.lms_entitlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 entitlement_type text NOT NULL CHECK(entitlement_type IN ('trial','paid','manual')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','refunded')),
 starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 grant_reference text, granted_by uuid REFERENCES public.lms_profiles(id),
 CHECK (ends_at IS NULL OR ends_at>starts_at)
);
CREATE TABLE public.lms_trial_lesson_grants (
 entitlement_id uuid NOT NULL REFERENCES public.lms_entitlements(id) ON DELETE CASCADE,
 lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE RESTRICT,
 PRIMARY KEY(entitlement_id,lesson_id)
);
-- Never provide private_object_path directly to learners; trusted media signing API later.
CREATE TABLE public.lms_media_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK (kind IN ('image','pdf','video')),
 private_object_path text NOT NULL, mime_type text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lms_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES public.lms_profiles(id),
 event_type text NOT NULL, target_type text NOT NULL, target_id uuid,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Trusted self-signup. Never trust requested admin/paid role in raw user metadata.
CREATE FUNCTION public.lms_p1_on_auth_signup() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.lms_profiles(id,full_name,locale)
 VALUES (NEW.id,left(coalesce(NEW.raw_user_meta_data->>'full_name',''),160),'en')
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END; $$;
CREATE TRIGGER lms_p1_auth_user_insert AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.lms_p1_on_auth_signup();
REVOKE ALL ON FUNCTION public.lms_p1_on_auth_signup() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p1_actor_is_admin() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lms_profiles p
  JOIN public.lms_role_assignments a ON a.user_id=p.id
  WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
   AND a.role='admin' AND a.revoked_at IS NULL
 );
$$;
CREATE FUNCTION public.lms_p1_actor_is_author_for(p_course_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lms_profiles p
  JOIN public.lms_role_assignments a ON a.user_id=p.id
  WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
   AND a.role='content_author' AND a.scope_course_id=p_course_id
   AND a.revoked_at IS NULL
 );
$$;
CREATE FUNCTION public.lms_p1_course_entitled(p_course_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lms_entitlements e
  JOIN public.lms_profiles p ON p.id=e.user_id
  WHERE e.user_id=(SELECT auth.uid()) AND p.account_status='active'
   AND e.course_id=p_course_id AND e.status='active'
   AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
 );
$$;
CREATE FUNCTION public.lms_p1_can_view_structure(p_course_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.lms_p1_actor_is_admin()
   OR public.lms_p1_actor_is_author_for(p_course_id)
   OR (public.lms_p1_course_entitled(p_course_id)
     AND EXISTS(SELECT 1 FROM public.lms_courses c
       WHERE c.id=p_course_id AND c.publication_state='published'));
$$;
CREATE FUNCTION public.lms_p1_can_view_lesson(p_lesson_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lms_lessons l
   JOIN public.lms_topics t ON t.id=l.topic_id
   JOIN public.lms_domains d ON d.id=t.domain_id
   JOIN public.lms_courses c ON c.id=d.course_id
   WHERE l.id=p_lesson_id AND (
    public.lms_p1_actor_is_admin() OR public.lms_p1_actor_is_author_for(c.id)
    OR (c.publication_state='published' AND l.publication_state='published'
      AND EXISTS (
       SELECT 1 FROM public.lms_entitlements e
       JOIN public.lms_profiles p ON p.id=e.user_id
       WHERE e.user_id=(SELECT auth.uid()) AND p.account_status='active'
        AND e.course_id=c.id AND e.status='active'
        AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
        AND (e.entitlement_type IN ('paid','manual') OR (
          e.entitlement_type='trial' AND EXISTS (
            SELECT 1 FROM public.lms_trial_lesson_grants g
             WHERE g.entitlement_id=e.id AND g.lesson_id=l.id
          )
        ))
      )
    )
   )
 );
$$;

-- All P1 tables start with RLS enabled; explicit Data API GRANTs follow.
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY[
  'lms_profiles','lms_role_assignments','lms_courses','lms_domains','lms_topics',
  'lms_lessons','lms_lesson_blocks','lms_entitlements','lms_trial_lesson_grants',
  'lms_media_assets','lms_audit_events'
 ] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',n);
 END LOOP;
END $$;
GRANT USAGE,SELECT ON SEQUENCE public.lms_audit_events_id_seq TO service_role;
GRANT SELECT ON public.lms_courses TO anon,authenticated;
GRANT SELECT ON public.lms_profiles,public.lms_role_assignments,
 public.lms_entitlements,public.lms_domains,public.lms_topics,
 public.lms_lessons,public.lms_lesson_blocks TO authenticated;
GRANT UPDATE(full_name,locale) ON public.lms_profiles TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.lms_courses,public.lms_domains,
 public.lms_topics,public.lms_lessons,public.lms_lesson_blocks TO authenticated;

DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY[
  'lms_p1_actor_is_admin()','lms_p1_actor_is_author_for(uuid)',
  'lms_p1_course_entitled(uuid)','lms_p1_can_view_structure(uuid)',
  'lms_p1_can_view_lesson(uuid)'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated,service_role',n);
 END LOOP;
END $$;

CREATE POLICY lms_profile_read ON public.lms_profiles FOR SELECT TO authenticated
 USING(id=(SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
CREATE POLICY lms_profile_self_edit ON public.lms_profiles FOR UPDATE TO authenticated
 USING(id=(SELECT auth.uid()) AND account_status='active')
 WITH CHECK(id=(SELECT auth.uid()) AND account_status='active');
CREATE POLICY lms_roles_read ON public.lms_role_assignments FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
CREATE POLICY lms_entitlement_read ON public.lms_entitlements FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
CREATE POLICY lms_course_public ON public.lms_courses FOR SELECT TO anon,authenticated
 USING(publication_state='published');
CREATE POLICY lms_course_editors_read ON public.lms_courses FOR SELECT TO authenticated
 USING(public.lms_p1_actor_is_admin() OR public.lms_p1_actor_is_author_for(id));
CREATE POLICY lms_course_admin_write ON public.lms_courses FOR ALL TO authenticated
 USING(public.lms_p1_actor_is_admin()) WITH CHECK(public.lms_p1_actor_is_admin());
CREATE POLICY lms_domain_read ON public.lms_domains FOR SELECT TO authenticated
 USING(public.lms_p1_can_view_structure(course_id));
CREATE POLICY lms_domain_admin_write ON public.lms_domains FOR ALL TO authenticated
 USING(public.lms_p1_actor_is_admin()) WITH CHECK(public.lms_p1_actor_is_admin());
CREATE POLICY lms_topic_read ON public.lms_topics FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.lms_domains d
  WHERE d.id=domain_id AND public.lms_p1_can_view_structure(d.course_id)));
CREATE POLICY lms_topic_admin_write ON public.lms_topics FOR ALL TO authenticated
 USING(public.lms_p1_actor_is_admin()) WITH CHECK(public.lms_p1_actor_is_admin());
CREATE POLICY lms_lesson_read ON public.lms_lessons FOR SELECT TO authenticated
 USING(public.lms_p1_can_view_lesson(id));
CREATE POLICY lms_lesson_admin_write ON public.lms_lessons FOR ALL TO authenticated
 USING(public.lms_p1_actor_is_admin()) WITH CHECK(public.lms_p1_actor_is_admin());
CREATE POLICY lms_block_read ON public.lms_lesson_blocks FOR SELECT TO authenticated
 USING(public.lms_p1_can_view_lesson(lesson_id));
CREATE POLICY lms_block_admin_write ON public.lms_lesson_blocks FOR ALL TO authenticated
 USING(public.lms_p1_actor_is_admin()) WITH CHECK(public.lms_p1_actor_is_admin());
-- Author writes are deliberately deferred until course-scope testing.
-- No anon write. No client grants for trial grants/media/audit; service-only.

CREATE INDEX lms_domain_order_idx ON public.lms_domains(course_id,position);
CREATE INDEX lms_topic_order_idx ON public.lms_topics(domain_id,position);
CREATE INDEX lms_lesson_order_idx ON public.lms_lessons(topic_id,position);
CREATE INDEX lms_block_order_idx ON public.lms_lesson_blocks(lesson_id,position);
CREATE INDEX lms_entitlements_access_idx
 ON public.lms_entitlements(user_id,course_id,status,ends_at);
CREATE INDEX lms_trial_grants_lesson_idx ON public.lms_trial_lesson_grants(lesson_id);
COMMIT;
