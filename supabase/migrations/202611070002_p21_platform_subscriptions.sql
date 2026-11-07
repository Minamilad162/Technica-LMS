-- P21 platform-wide time-based subscription plans.
-- Apply ONCE only to explicitly approved Technica staging; do not replay P1/P4.
-- Existing course entitlements remain valid for transition, but NEW plans grant
-- a single platform subscription (not per-Course rows).
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
  OR to_regprocedure('public.lms_p1_can_view_lesson(uuid)') IS NULL
  OR to_regprocedure('public.lms_p4_can_practice(uuid)') IS NULL
  OR to_regclass('public.lms_audit_events') IS NULL
 THEN RAISE EXCEPTION 'P21 requires installed verified P1, P4 and audit schema'; END IF;
 IF to_regclass('public.lms_subscription_plans') IS NOT NULL
  OR to_regclass('public.lms_platform_subscriptions') IS NOT NULL
  OR to_regclass('public.lms_subscription_requests') IS NOT NULL
 THEN RAISE EXCEPTION 'P21 table conflict; review migration ledger and schema instead of replaying'; END IF;
END $$;

CREATE TABLE public.lms_subscription_plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text UNIQUE NOT NULL CHECK(code ~ '^[a-z0-9-]{3,60}$'),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 120),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=500),
 duration_months integer NOT NULL CHECK(duration_months BETWEEN 1 AND 36),
 price_amount numeric(12,2) CHECK(price_amount IS NULL OR price_amount>=0),
 currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'),
 is_published boolean NOT NULL DEFAULT true,
 display_order integer NOT NULL DEFAULT 0 CHECK(display_order>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((price_amount IS NULL AND currency IS NULL)
       OR (price_amount IS NOT NULL AND currency IS NOT NULL))
);
CREATE TABLE public.lms_subscription_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 plan_id uuid NOT NULL REFERENCES public.lms_subscription_plans(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 decided_by uuid REFERENCES public.lms_profiles(id),
 subscription_id uuid,
 CHECK ((status='pending' AND decided_at IS NULL)
   OR (status<>'pending' AND decided_at IS NOT NULL))
);
CREATE UNIQUE INDEX lms_p21_one_pending_request_idx
 ON public.lms_subscription_requests(user_id) WHERE status='pending';
CREATE TABLE public.lms_platform_subscriptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 plan_id uuid NOT NULL REFERENCES public.lms_subscription_plans(id) ON DELETE RESTRICT,
 plan_name_snapshot text NOT NULL,
 duration_months_snapshot integer NOT NULL CHECK(duration_months_snapshot BETWEEN 1 AND 36),
 price_amount_snapshot numeric(12,2),
 currency_snapshot text,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','refunded')),
 source text NOT NULL CHECK(source IN ('admin_manual','payment_verified')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 granted_by uuid REFERENCES public.lms_profiles(id),
 revoked_at timestamptz,
 CHECK (ends_at>starts_at),
 CHECK ((price_amount_snapshot IS NULL AND currency_snapshot IS NULL)
        OR (price_amount_snapshot IS NOT NULL AND currency_snapshot IS NOT NULL))
);
ALTER TABLE public.lms_subscription_requests
 ADD CONSTRAINT lms_p21_request_subscription_fk
 FOREIGN KEY(subscription_id) REFERENCES public.lms_platform_subscriptions(id) ON DELETE RESTRICT;
CREATE INDEX lms_p21_user_active_idx
 ON public.lms_platform_subscriptions(user_id,status,ends_at);
CREATE INDEX lms_p21_plan_request_idx
 ON public.lms_subscription_requests(plan_id,status,requested_at);
INSERT INTO public.lms_subscription_plans(code,name,description,duration_months,display_order)
VALUES('three-months','3 Months','Full access to published courses, Practice and Assessments.',3,1),
      ('six-months','6 Months','Full access to published courses, Practice and Assessments.',6,2),
      ('nine-months','9 Months','Full access to published courses, Practice and Assessments.',9,3);

ALTER TABLE public.lms_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_platform_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_subscription_plans,public.lms_subscription_requests,public.lms_platform_subscriptions
 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lms_subscription_plans,public.lms_subscription_requests,public.lms_platform_subscriptions TO service_role;
GRANT SELECT ON public.lms_subscription_plans TO anon,authenticated;
GRANT SELECT ON public.lms_subscription_requests,public.lms_platform_subscriptions TO authenticated;
CREATE POLICY lms_p21_plan_public_read ON public.lms_subscription_plans
 FOR SELECT TO anon USING(is_published);
CREATE POLICY lms_p21_plan_authenticated_read ON public.lms_subscription_plans
 FOR SELECT TO authenticated USING(is_published OR public.lms_p1_actor_is_admin());
CREATE POLICY lms_p21_request_scoped_read ON public.lms_subscription_requests
 FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
CREATE POLICY lms_p21_subscription_scoped_read ON public.lms_platform_subscriptions
 FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR public.lms_p1_actor_is_admin());
-- No INSERT/UPDATE/DELETE policies for either user or admin.
-- Every write MUST call a verified SECURITY DEFINER RPC.

CREATE FUNCTION public.lms_p21_has_active_subscription() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_platform_subscriptions s
  JOIN public.lms_profiles p ON p.id=s.user_id
  WHERE s.user_id=(SELECT auth.uid()) AND p.account_status='active'
    AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
 );
$$;
REVOKE ALL ON FUNCTION public.lms_p21_has_active_subscription() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p21_has_active_subscription() TO authenticated,service_role;

CREATE FUNCTION public.lms_p21_save_plan(
 p_plan_id uuid,p_name text,p_duration_months integer,p_price_amount numeric,
 p_currency text,p_description text,p_is_published boolean
) RETURNS uuid
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_code text;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120
   OR p_duration_months NOT BETWEEN 1 AND 36
   OR p_is_published IS NULL
   OR length(coalesce(p_description,''))>500
   OR (p_price_amount IS NOT NULL AND (p_price_amount<0 OR p_price_amount>9999999999))
   OR ((p_price_amount IS NULL) <> (p_currency IS NULL))
   OR (p_currency IS NOT NULL AND p_currency !~ '^[A-Z]{3}$')
 THEN RAISE EXCEPTION 'Invalid subscription plan'; END IF;
 IF p_plan_id IS NULL THEN
  v_code='custom-'||replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.lms_subscription_plans(code,name,duration_months,
   price_amount,currency,description,is_published,display_order)
  VALUES (v_code,trim(p_name),p_duration_months,p_price_amount,
   p_currency,coalesce(p_description,''),p_is_published,100)
  RETURNING id INTO v_id;
 ELSE
  UPDATE public.lms_subscription_plans SET name=trim(p_name),
   duration_months=p_duration_months,price_amount=p_price_amount,
   currency=p_currency,description=coalesce(p_description,''),
   is_published=p_is_published,updated_at=now()
   WHERE id=p_plan_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Subscription plan not found'; END IF;
 END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES ((SELECT auth.uid()),'p21_plan_saved','subscription_plan',v_id,
   jsonb_build_object('months',p_duration_months,'published',p_is_published));
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.lms_p21_save_plan(uuid,text,integer,numeric,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p21_save_plan(uuid,text,integer,numeric,text,text,boolean) TO authenticated;

CREATE FUNCTION public.lms_p21_request_plan(p_plan_id uuid) RETURNS uuid
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;v_user uuid;
BEGIN
 v_user=(SELECT auth.uid());
 IF v_user IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.lms_profiles WHERE id=v_user AND account_status='active')
 THEN RAISE EXCEPTION 'Active learner required'; END IF;
 IF public.lms_p21_has_active_subscription() THEN
  RAISE EXCEPTION 'You already have an active platform subscription'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_subscription_plans
  WHERE id=p_plan_id AND is_published AND price_amount IS NOT NULL
   AND currency IS NOT NULL)
 THEN RAISE EXCEPTION 'Subscription plan is unavailable'; END IF;
 INSERT INTO public.lms_subscription_requests(user_id,plan_id)
 VALUES (v_user,p_plan_id) RETURNING id INTO v_id;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_user,'p21_subscription_requested','subscription_request',v_id,
  jsonb_build_object('plan_id',p_plan_id));
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.lms_p21_request_plan(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p21_request_plan(uuid) TO authenticated;

CREATE FUNCTION public.lms_p21_admin_decide_request(p_request_id uuid,p_approve boolean)
 RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.lms_subscription_requests%ROWTYPE;
DECLARE plan public.lms_subscription_plans%ROWTYPE;
DECLARE v_id uuid;v_start timestamptz;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Decision required'; END IF;
 SELECT * INTO r FROM public.lms_subscription_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'No pending request'; END IF;
 -- Serialize all manual grants for the same learner, including separate requests.
 PERFORM pg_advisory_xact_lock(hashtextextended(r.user_id::text,21021));
 IF EXISTS(SELECT 1 FROM public.lms_platform_subscriptions
   WHERE user_id=r.user_id AND status='active' AND starts_at<=now() AND ends_at>now())
 THEN RAISE EXCEPTION 'Learner already has active platform access'; END IF;
 SELECT * INTO plan FROM public.lms_subscription_plans WHERE id=r.plan_id;
 IF NOT FOUND OR NOT plan.is_published OR plan.price_amount IS NULL THEN
  RAISE EXCEPTION 'Plan is unavailable; configure it before approval'; END IF;
 IF p_approve THEN
  v_start=now();
  INSERT INTO public.lms_platform_subscriptions(user_id,plan_id,plan_name_snapshot,
    duration_months_snapshot,price_amount_snapshot,currency_snapshot,
    status,source,starts_at,ends_at,granted_by)
  VALUES(r.user_id,plan.id,plan.name,plan.duration_months,plan.price_amount,
    plan.currency,'active','admin_manual',v_start,
    v_start+make_interval(months=>plan.duration_months),(SELECT auth.uid()))
  RETURNING id INTO v_id;
 END IF;
 UPDATE public.lms_subscription_requests
  SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
  decided_at=now(),decided_by=(SELECT auth.uid()),subscription_id=v_id
  WHERE id=r.id;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES ((SELECT auth.uid()),'p21_subscription_decided','subscription_request',r.id,
   jsonb_build_object('approved',p_approve,'subscription_id',v_id,
     'grant_source','admin_manual'));
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.lms_p21_admin_decide_request(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p21_admin_decide_request(uuid,boolean) TO authenticated;

CREATE FUNCTION public.lms_p21_admin_revoke(p_subscription_id uuid) RETURNS boolean
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_changed uuid;
BEGIN
 IF NOT public.lms_p1_actor_is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 UPDATE public.lms_platform_subscriptions
  SET status='revoked',revoked_at=now()
  WHERE id=p_subscription_id AND status='active'
  RETURNING id INTO v_changed;
 IF v_changed IS NULL THEN RAISE EXCEPTION 'Active subscription not found'; END IF;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES((SELECT auth.uid()),'p21_subscription_revoked','platform_subscription',
   v_changed,'{}'::jsonb);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.lms_p21_admin_revoke(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p21_admin_revoke(uuid) TO authenticated;

-- The existing P1/P4 checks are server-owned and must consume the new
-- platform-wide privilege. Keep existing per-course paid/manual grants
-- transitional: revoking historical purchases without approval is unsafe.
CREATE OR REPLACE FUNCTION public.lms_p1_course_entitled(p_course_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_entitlements e
  JOIN public.lms_profiles p ON p.id=e.user_id
  WHERE e.user_id=(SELECT auth.uid()) AND p.account_status='active'
    AND e.course_id=p_course_id AND e.status='active'
    AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
 ) OR (public.lms_p21_has_active_subscription() AND EXISTS(
  SELECT 1 FROM public.lms_courses c
  WHERE c.id=p_course_id AND c.publication_state='published'
 ));
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
    AND (public.lms_p21_has_active_subscription() OR EXISTS(
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
  AND (public.lms_p21_has_active_subscription() OR EXISTS(
   SELECT 1 FROM public.lms_profiles p
   JOIN public.lms_entitlements e ON e.user_id=p.id
   WHERE p.id=(SELECT auth.uid()) AND p.account_status='active'
    AND e.course_id=p_course AND e.entitlement_type IN ('paid','manual')
    AND e.status='active' AND e.starts_at<=now()
    AND (e.ends_at IS NULL OR e.ends_at>now())
  ))
 ) OR (
  public.lms_p1_actor_is_admin() AND EXISTS(
   SELECT 1 FROM public.lms_courses c WHERE c.id=p_course)
 );
$$;
-- Preserve existing function privileges, and verify Data API explicit grants.
GRANT EXECUTE ON FUNCTION public.lms_p1_course_entitled(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p1_can_view_lesson(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lms_p4_can_practice(uuid) TO authenticated,service_role;
COMMIT;
