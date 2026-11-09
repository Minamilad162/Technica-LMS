-- P52 Admin User Directory: block note and manual platform plan.
-- Additive only; no existing account, plan or subscription changed.
BEGIN;
DO $pre$ BEGIN
IF to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL OR to_regclass('public.lms_subscription_plans') IS NULL THEN RAISE EXCEPTION 'P52 requires P1 and P21'; END IF;
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lms_profiles' AND column_name='block_note') THEN RAISE EXCEPTION 'P52 already installed; do not replay'; END IF;
END $pre$;
ALTER TABLE public.lms_profiles ADD COLUMN block_note text NOT NULL DEFAULT '', ADD COLUMN blocked_at timestamptz, ADD COLUMN blocked_by uuid REFERENCES public.lms_profiles(id) ON DELETE SET NULL, ADD CONSTRAINT lms_p52_block_note_size CHECK(char_length(block_note)<=500);
CREATE OR REPLACE FUNCTION public.lms_p52_admin_set_block(p_user_id uuid, p_block boolean, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_user public.lms_profiles%ROWTYPE; v_actor uuid:=(SELECT auth.uid());
DECLARE v_note text:=btrim(coalesce(p_note,'')); v_old_status text;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified LMS Admin required'; END IF;
 IF p_user_id IS NULL OR p_block IS NULL OR char_length(v_note)>500
 THEN RAISE EXCEPTION 'Valid user, decision and note (max 500 characters) required'; END IF;
 IF p_user_id=v_actor AND p_block THEN RAISE EXCEPTION 'You cannot block your own Admin account'; END IF;
 SELECT * INTO v_user FROM public.lms_profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LMS user not found'; END IF;
 v_old_status:=v_user.account_status;
 IF p_block THEN
  -- Never remove the final active admin. Serialization protects simultaneous admin updates.
  PERFORM pg_advisory_xact_lock(20261109,52);
  IF EXISTS(SELECT 1 FROM public.lms_role_assignments r
     WHERE r.user_id=p_user_id AND r.role='admin' AND r.revoked_at IS NULL)
  AND (SELECT count(*) FROM public.lms_profiles p
     JOIN public.lms_role_assignments r ON r.user_id=p.id
     WHERE p.account_status='active' AND r.role='admin' AND r.revoked_at IS NULL)<=1
  THEN RAISE EXCEPTION 'Cannot block the last active Admin'; END IF;
 END IF;
 IF (p_block AND v_user.account_status='suspended'
    AND v_user.block_note=v_note)
    OR (NOT p_block AND v_user.account_status='active') THEN
   RETURN jsonb_build_object('userId',v_user.id,'status',v_user.account_status,
     'blockNote',v_user.block_note,'changed',false);
 END IF;
 UPDATE public.lms_profiles SET
  account_status=CASE WHEN p_block THEN 'suspended' ELSE 'active' END,
  block_note=CASE WHEN p_block THEN v_note ELSE '' END,
  blocked_at=CASE WHEN p_block THEN clock_timestamp() ELSE NULL END,
  blocked_by=CASE WHEN p_block THEN v_actor ELSE NULL END
 WHERE id=p_user_id;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,CASE WHEN p_block THEN 'p52_user_blocked' ELSE 'p52_user_unblocked' END,
        'profile',p_user_id,jsonb_build_object('before',v_old_status,
          'after',CASE WHEN p_block THEN 'suspended' ELSE 'active' END,
          'note',CASE WHEN p_block THEN v_note ELSE v_user.block_note END));
 RETURN jsonb_build_object('userId',p_user_id,
    'status',CASE WHEN p_block THEN 'suspended' ELSE 'active' END,
    'blockNote',CASE WHEN p_block THEN v_note ELSE '' END,'changed',true);
END $function$

CREATE OR REPLACE FUNCTION public.lms_p52_admin_activate_plan(p_user_id uuid, p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid:=(SELECT auth.uid()); v_plan public.lms_subscription_plans%ROWTYPE;
DECLARE v_subscription uuid; v_start timestamptz;
BEGIN
 IF v_actor IS NULL OR NOT public.lms_p1_actor_is_admin()
 THEN RAISE EXCEPTION 'Verified LMS Admin required'; END IF;
 IF p_user_id IS NULL OR p_plan_id IS NULL THEN RAISE EXCEPTION 'Select user and plan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,21021));
 IF NOT EXISTS(SELECT 1 FROM public.lms_profiles
    WHERE id=p_user_id AND account_status='active')
 THEN RAISE EXCEPTION 'Only active users can receive a plan'; END IF;
 SELECT * INTO v_plan FROM public.lms_subscription_plans WHERE id=p_plan_id;
 IF NOT FOUND OR NOT v_plan.is_published OR v_plan.duration_months NOT BETWEEN 1 AND 36
 THEN RAISE EXCEPTION 'Select a published valid subscription plan'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_platform_subscriptions
   WHERE user_id=p_user_id AND status='active'
   AND starts_at<=clock_timestamp() AND ends_at>clock_timestamp())
 THEN RAISE EXCEPTION 'This user already has an active subscription; revoke it first'; END IF;
 v_start:=clock_timestamp();
 INSERT INTO public.lms_platform_subscriptions
  (user_id,plan_id,plan_name_snapshot,duration_months_snapshot,price_amount_snapshot,
  currency_snapshot,status,source,starts_at,ends_at,granted_by)
 VALUES(p_user_id,v_plan.id,v_plan.name,v_plan.duration_months,v_plan.price_amount,
  v_plan.currency,'active','admin_manual',v_start,
  v_start+make_interval(months=>v_plan.duration_months),v_actor)
 RETURNING id INTO v_subscription;
 INSERT INTO public.lms_audit_events(actor_id,event_type,target_type,target_id,details)
 VALUES(v_actor,'p52_admin_direct_plan_activation','platform_subscription',v_subscription,
   jsonb_build_object('userId',p_user_id,'planId',v_plan.id,'manualGrant',true,
    'paymentVerified',false));
 RETURN jsonb_build_object('id',v_subscription,'userId',p_user_id,
   'planId',v_plan.id,'planName',v_plan.name,
   'startsAt',v_start,'endsAt',v_start+make_interval(months=>v_plan.duration_months));
END $function$

REVOKE ALL ON FUNCTION public.lms_p52_admin_set_block(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.lms_p52_admin_activate_plan(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p52_admin_set_block(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p52_admin_activate_plan(uuid,uuid) TO authenticated;
GRANT SELECT(block_note,blocked_at,blocked_by) ON public.lms_profiles TO authenticated;
COMMIT;
