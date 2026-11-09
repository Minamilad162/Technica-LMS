-- P54: real, role-scoped subscription & block notifications.
-- NO data seeding, status changes or subscription mutations.
BEGIN;
DO $p$ BEGIN
 IF to_regclass('public.lms_profiles') IS NULL OR to_regclass('public.lms_platform_subscriptions') IS NULL
 OR to_regclass('public.lms_subscription_requests') IS NULL OR to_regclass('public.lms_audit_events') IS NULL
 OR to_regprocedure('public.lms_p1_actor_is_admin()') IS NULL
 THEN RAISE EXCEPTION 'P54 requires P1/P21/P52'; END IF;
 IF to_regclass('public.lms_p54_notification_reads') IS NOT NULL
 THEN RAISE EXCEPTION 'P54 already installed - do not replay'; END IF;
END $p$;

CREATE TABLE public.lms_p54_notification_reads(
 user_id uuid NOT NULL REFERENCES public.lms_profiles(id) ON DELETE CASCADE,
 event_key text NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_key),
 CONSTRAINT lms_p54_key_size CHECK(length(event_key) BETWEEN 3 AND 100)
);
ALTER TABLE public.lms_p54_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lms_p54_notification_reads FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_p54_notifications(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid()); v_admin boolean;v_rows jsonb;v_unread integer;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles p WHERE p.id=v_user)
 THEN RAISE EXCEPTION 'Signed-in LMS account required'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid notification limit'; END IF;
 v_admin:=public.lms_p1_actor_is_admin();
 WITH events AS (
  SELECT 'subscription:'||s.id::text AS event_key,'subscription_activated'::text AS kind,
   s.user_id AS subject_id,s.granted_at AS occurred_at,
   jsonb_build_object('userId',s.user_id,'name',coalesce(nullif(btrim(pr.full_name),''),split_part(u.email,'@',1)),
    'email',CASE WHEN v_admin THEN u.email ELSE NULL END,'plan',s.plan_name_snapshot,
    'startsAt',s.starts_at,'endsAt',s.ends_at,'months',s.duration_months_snapshot,
    'status',s.status,'source',s.source,'price',s.price_amount_snapshot,'currency',s.currency_snapshot,
    'paymentVerified',false) AS details
  FROM public.lms_platform_subscriptions s
  JOIN public.lms_profiles pr ON pr.id=s.user_id
  JOIN auth.users u ON u.id=pr.id
  WHERE v_admin OR s.user_id=v_user
  UNION ALL
  SELECT 'request:'||r.id::text,'subscription_requested'::text,r.user_id,r.requested_at,
   jsonb_build_object('userId',r.user_id,'name',coalesce(nullif(btrim(pr.full_name),''),split_part(u.email,'@',1)),
    'email',CASE WHEN v_admin THEN u.email ELSE NULL END,'plan',r.plan_name_snapshot,
    'months',r.duration_months_snapshot,'requestStatus',r.status,'price',r.price_amount_snapshot,
    'currency',r.currency_snapshot,'paymentVerified',false)
  FROM public.lms_subscription_requests r
  JOIN public.lms_profiles pr ON pr.id=r.user_id
  JOIN auth.users u ON u.id=pr.id
  WHERE v_admin OR r.user_id=v_user
  UNION ALL
  SELECT 'block:'||a.id::text,a.event_type,a.target_id,a.created_at,
   jsonb_build_object('userId',a.target_id,
     'name',coalesce(nullif(btrim(pr.full_name),''),split_part(u.email,'@',1)),
     'email',CASE WHEN v_admin THEN u.email ELSE NULL END,
     'note',coalesce(a.details->>'note',''),'actorId',a.actor_id,
     'status',a.details->>'after')
  FROM public.lms_audit_events a
  JOIN public.lms_profiles pr ON pr.id=a.target_id
  JOIN auth.users u ON u.id=pr.id
  WHERE a.event_type IN ('p52_user_blocked','p52_user_unblocked')
  AND a.target_type='profile'
  AND (v_admin OR a.target_id=v_user)
 ),
 ranked AS (
  SELECT e.event_key,e.kind,e.occurred_at,e.details,
    (r.user_id IS NOT NULL) AS is_read
  FROM events e LEFT JOIN public.lms_p54_notification_reads r
   ON r.user_id=v_user AND r.event_key=e.event_key
 ),
 limited AS (
  SELECT * FROM ranked ORDER BY occurred_at DESC,event_key DESC LIMIT p_limit
 )
 SELECT
  (SELECT count(*)::integer FROM ranked WHERE NOT is_read),
  (SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',event_key,'type',kind,'createdAt',occurred_at,
   'read',is_read,'details',details) ORDER BY occurred_at DESC,event_key DESC),'[]'::jsonb) FROM limited)
 INTO v_unread,v_rows;
 RETURN jsonb_build_object('items',v_rows,'unreadCount',v_unread,'isAdmin',v_admin);
END $fn$;

CREATE FUNCTION public.lms_p54_mark_read(p_event_keys text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid());v_admin boolean;v_key text;v_count integer:=0;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.lms_profiles WHERE id=v_user)
 THEN RAISE EXCEPTION 'Signed-in LMS account required'; END IF;
 IF p_event_keys IS NULL OR cardinality(p_event_keys) NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'Invalid notification selection'; END IF;
 v_admin:=public.lms_p1_actor_is_admin();
 FOR v_key IN SELECT DISTINCT x FROM unnest(p_event_keys) AS x LOOP
  IF v_key IS NULL OR length(v_key)>100 THEN RAISE EXCEPTION 'Invalid notification key'; END IF;
  IF starts_with(v_key,'subscription:') THEN
    IF NOT EXISTS(SELECT 1 FROM public.lms_platform_subscriptions s
       WHERE s.id::text=substr(v_key,14) AND (v_admin OR s.user_id=v_user))
    THEN RAISE EXCEPTION 'Notification unavailable'; END IF;
  ELSIF starts_with(v_key,'request:') THEN
    IF NOT EXISTS(SELECT 1 FROM public.lms_subscription_requests r
       WHERE r.id::text=substr(v_key,9) AND (v_admin OR r.user_id=v_user))
    THEN RAISE EXCEPTION 'Notification unavailable'; END IF;
  ELSIF starts_with(v_key,'block:') THEN
    IF NOT EXISTS(SELECT 1 FROM public.lms_audit_events a
       WHERE a.id::text=substr(v_key,7) AND a.event_type IN ('p52_user_blocked','p52_user_unblocked')
       AND a.target_type='profile' AND (v_admin OR a.target_id=v_user))
    THEN RAISE EXCEPTION 'Notification unavailable'; END IF;
  ELSE RAISE EXCEPTION 'Unsupported notification'; END IF;
  INSERT INTO public.lms_p54_notification_reads(user_id,event_key)
  VALUES(v_user,v_key) ON CONFLICT(user_id,event_key) DO NOTHING;
  v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_p54_notifications(integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.lms_p54_mark_read(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lms_p54_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_p54_mark_read(text[]) TO authenticated;
DO $post$ BEGIN
 IF has_function_privilege('anon','public.lms_p54_notifications(integer)','execute')
 OR has_function_privilege('anon','public.lms_p54_mark_read(text[])','execute')
 THEN RAISE EXCEPTION 'P54 notification RPC exposed to anon'; END IF;
END $post$;
COMMIT;
