-- Technica LMS | P3 one-time first admin provisioning, dedicated project ONLY
-- Not a migration. Run manually AFTER the intended admin signs up and verifies email.
-- EDIT THE EMAIL IN THE DECLARE BLOCK BEFORE RUNNING.
-- Run as trusted database owner in the correct Technica LMS Supabase SQL Editor.
-- Never place a service_role key in browser code or GitHub.
BEGIN;
DO $$
DECLARE
  target_email text := 'REPLACE_WITH_VERIFIED_ADMIN_EMAIL@example.com';
  target_user uuid;
BEGIN
  IF target_email LIKE 'REPLACE_WITH_%' THEN
    RAISE EXCEPTION 'Replace target_email with your verified administrator email first.';
  END IF;
  SELECT id INTO target_user FROM auth.users
    WHERE lower(email)=lower(target_email) AND email_confirmed_at IS NOT NULL;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'No verified Supabase Auth user found for %. Register and verify this account first.',target_email;
  END IF;
  INSERT INTO public.lms_profiles(id,full_name,locale,account_status)
    SELECT id,coalesce(left(raw_user_meta_data->>'full_name',160),''),'en','active'
    FROM auth.users WHERE id=target_user
    ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM public.lms_role_assignments
    WHERE user_id=target_user AND role='admin' AND revoked_at IS NULL
  ) THEN
    INSERT INTO public.lms_role_assignments(user_id,role,scope_course_id)
    VALUES(target_user,'admin',NULL);
  END IF;
  RAISE NOTICE 'Verified Technica LMS admin role provisioned for user %',target_user;
END $$;
COMMIT;

-- Optional verification: the target account should show an active admin assignment
-- SELECT a.user_id,a.role,p.account_status
-- FROM public.lms_role_assignments a
-- JOIN public.lms_profiles p ON p.id=a.user_id
-- WHERE a.role='admin' AND a.revoked_at IS NULL;
