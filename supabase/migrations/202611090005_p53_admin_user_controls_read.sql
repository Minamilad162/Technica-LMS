-- P53 Admin-only user controls summary (email/status/notes/published plans/active grants).
BEGIN;
DO $pre$ BEGIN
IF to_regprocedure('public.lms_p52_admin_set_block(uuid,boolean,text)') IS NULL THEN RAISE EXCEPTION 'P53 requires P52'; END IF;
IF to_regprocedure('public.lms_p53_admin_user_controls(uuid)') IS NOT NULL THEN RAISE EXCEPTION 'P53 already installed; do not replay'; END IF;
END $pre$;
CREATE OR REPLACE FUNCTION public.lms_p53_admin_user_controls(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_profile public.lms_profiles%ROWTYPE; v_email text;v_plans jsonb;v_subs jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified LMS Admin required'; END IF;
 SELECT p.* INTO v_profile FROM public.lms_profiles p WHERE p.id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 SELECT u.email INTO v_email FROM auth.users u WHERE u.id=v_profile.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
  'months',p.duration_months)
  ORDER BY p.display_order,p.name),'[]'::jsonb) INTO v_plans
 FROM public.lms_subscription_plans p WHERE p.is_published;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'planName',s.plan_name_snapshot,
  'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status,'source',s.source)
  ORDER BY s.ends_at DESC),'[]'::jsonb) INTO v_subs
 FROM (SELECT id,plan_name_snapshot,starts_at,ends_at,status,source
  FROM public.lms_platform_subscriptions
  WHERE user_id=p_user_id AND status='active' AND starts_at<=now() AND ends_at>now()
  ORDER BY ends_at DESC LIMIT 10) s;
 RETURN jsonb_build_object('userId',v_profile.id,'email',v_email,
  'name',v_profile.full_name,'status',v_profile.account_status,
  'blockNote',v_profile.block_note,'blockedAt',v_profile.blocked_at,
  'plans',v_plans,'subscriptions',v_subs);
END $function$

REVOKE ALL ON FUNCTION public.lms_p53_admin_user_controls(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p53_admin_user_controls(uuid) TO authenticated;
COMMIT;
