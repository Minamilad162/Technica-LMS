-- Technica LMS: provision exactly TWO verified ADMIN and TWO LEARNER roles.
-- This SQL does NOT create passwords/Auth accounts. Use Supabase
-- Authentication > Users > Add user (invite or create with email/password) first.
-- Never INSERT directly into auth.users or auth.identities.
-- Replace ALL four email placeholders. Check your exact Technica project ref.
-- Run ONLY in approved environment after backup. One transaction/all-or-nothing.
-- The P1 LMS model has NO 'learner' entry in lms_role_assignments:
-- an active profile WITHOUT admin/content_author is a Learner.
BEGIN;
DO $pilot$
DECLARE
  spec record;
  target_user_id uuid;
  target_verified timestamptz;
  count_matching integer;
BEGIN
  IF to_regclass('public.lms_profiles') IS NULL OR
     to_regclass('public.lms_role_assignments') IS NULL THEN
     RAISE EXCEPTION 'Technica P1 tables are missing. No changes made.';
  END IF;
  IF (
    SELECT count(DISTINCT lower(v.email))
    FROM (VALUES
     ('admin1@replace-me.invalid'),
     ('admin2@replace-me.invalid'),
     ('learner1@replace-me.invalid'),
     ('learner2@replace-me.invalid')
    ) AS v(email)
  ) <> 4 THEN
    RAISE EXCEPTION 'All four pilot emails must be distinct.';
  END IF;
  FOR spec IN
    SELECT * FROM (VALUES
      ('admin1@replace-me.invalid'::text,'admin'::text,'Admin One'::text),
      ('admin2@replace-me.invalid','admin','Admin Two'),
      ('learner1@replace-me.invalid','learner','Learner One'),
      ('learner2@replace-me.invalid','learner','Learner Two')
    ) AS p(email,requested_role,full_name)
  LOOP
    IF spec.email LIKE '%replace-me.invalid' OR
       spec.email NOT LIKE '%@%' THEN
      RAISE EXCEPTION 'Replace placeholder email for % before running this SQL',spec.full_name;
    END IF;
    SELECT count(*),max(id),max(email_confirmed_at)
       INTO count_matching,target_user_id,target_verified
    FROM auth.users
    WHERE lower(email)=lower(spec.email);
    IF count_matching<>1 THEN
      RAISE EXCEPTION 'Expected one existing Supabase Auth user for %, found %',spec.email,count_matching;
    END IF;
    IF target_verified IS NULL THEN
      RAISE EXCEPTION 'Email must be verified first: %',spec.email;
    END IF;
    INSERT INTO public.lms_profiles(id,full_name,locale,account_status)
      VALUES(target_user_id,left(spec.full_name,160),'en','active')
      ON CONFLICT (id) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.lms_profiles
                  WHERE id=target_user_id AND account_status='active') THEN
      RAISE EXCEPTION 'Account is suspended: %. Do not reactivate implicitly.',spec.email;
    END IF;
    IF spec.requested_role='admin' THEN
      INSERT INTO public.lms_role_assignments(user_id,role,scope_course_id)
      SELECT target_user_id,'admin',NULL
      WHERE NOT EXISTS(
        SELECT 1 FROM public.lms_role_assignments
        WHERE user_id=target_user_id AND role='admin'
          AND scope_course_id IS NULL AND revoked_at IS NULL
      );
    ELSE
      -- Never silently demote/re-purpose an existing privileged account.
      IF EXISTS(SELECT 1 FROM public.lms_role_assignments
                WHERE user_id=target_user_id AND revoked_at IS NULL
                  AND role IN ('admin','content_author')) THEN
        RAISE EXCEPTION 'Requested learner % already has active elevated roles; review manually',spec.email;
      END IF;
    END IF;
  END LOOP;
END;
$pilot$;
COMMIT;

-- READ-ONLY confirmation; a Learner is an active profile with no admin role.
SELECT u.email,
       CASE WHEN EXISTS (
          SELECT 1 FROM public.lms_role_assignments a
          WHERE a.user_id=u.id AND a.role='admin' AND a.revoked_at IS NULL
       ) THEN 'admin' ELSE 'learner' END AS lms_role,
       p.account_status,
       (u.email_confirmed_at IS NOT NULL) AS email_verified
FROM auth.users u
JOIN public.lms_profiles p ON p.id=u.id
WHERE lower(u.email) IN (
  'admin1@replace-me.invalid',
  'admin2@replace-me.invalid',
  'learner1@replace-me.invalid',
  'learner2@replace-me.invalid'
)
ORDER BY lms_role,u.email;
