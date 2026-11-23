-- Centre-managed updates and appointments. Programme versions and enrolments scope visibility.
CREATE TABLE public.lms_qf_programme_updates (
 id uuid PRIMARY KEY,
 version_id uuid NOT NULL REFERENCES public.lms_qualification_versions(id),
 enrolment_id uuid REFERENCES public.lms_qualification_enrolments(id),
 kind text NOT NULL CHECK (kind IN ('news','event','appointment','review')),
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
 details text NOT NULL DEFAULT '' CHECK (char_length(details)<=2000),
 starts_at timestamptz,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_as text CHECK (resolved_as IN ('cancelled','completed')),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES auth.users(id),
 CHECK ((enrolment_id IS NOT NULL) = (kind IN ('appointment','review'))),
 CHECK ((starts_at IS NULL) = (kind='news')),
 CHECK ((resolved_as IS NULL) = (resolved_at IS NULL) AND (resolved_as IS NULL) = (resolved_by IS NULL))
);
CREATE INDEX lms_qf_programme_updates_version
 ON public.lms_qf_programme_updates(version_id,enrolment_id,created_at DESC);
ALTER TABLE public.lms_qf_programme_updates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_programme_updates FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.lms_qf_programme_updates(p_enrolment uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments;
BEGIN
 SELECT q.* INTO e FROM public.lms_qualification_enrolments q
 JOIN public.lms_qualification_versions v ON v.id=q.version_id
 WHERE q.id=p_enrolment AND actor IN (q.learner_id,q.assessor_id,q.verifier_id)
   AND coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
   AND v.published_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Programme updates access denied.' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',id,'kind',kind,'title',title,'details',details,'startsAt',starts_at,'createdAt',created_at
 ) ORDER BY starts_at NULLS LAST,created_at DESC,id)
 FROM public.lms_qf_programme_updates
 WHERE version_id=e.version_id AND (enrolment_id IS NULL OR enrolment_id=e.id)
   AND resolved_as IS NULL),'[]'::jsonb);
END $fn$;

CREATE FUNCTION public.lms_qf_admin_programme_updates(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.lms_p1_actor_is_admin() OR coalesce(auth.jwt()->>'is_anonymous','false')='true' THEN
   RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',u.id,'kind',u.kind,'title',u.title,'details',u.details,'startsAt',u.starts_at,
   'learner',p.full_name,'resolvedAs',u.resolved_as
 ) ORDER BY u.created_at DESC,u.id)
 FROM public.lms_qf_programme_updates u
 LEFT JOIN public.lms_qualification_enrolments e ON e.id=u.enrolment_id
 LEFT JOIN public.lms_profiles p ON p.id=e.learner_id WHERE u.version_id=p_version),'[]'::jsonb);
END $fn$;

CREATE FUNCTION public.lms_qf_admin_create_programme_update(
 p_id uuid,p_version uuid,p_enrolment uuid,p_kind text,p_title text,p_details text,p_starts_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();
BEGIN
 IF NOT public.lms_p1_actor_is_admin() OR actor IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false')='true' THEN
   RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions
                WHERE id=p_version AND published_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Publish the programme version before adding updates.';
 END IF;
 IF p_enrolment IS NOT NULL THEN
   PERFORM 1 FROM public.lms_qualification_enrolments
   WHERE id=p_enrolment AND version_id=p_version AND completed_at IS NULL FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Select an active enrolment in this programme version.'; END IF;
 END IF;
 IF p_starts_at IS NOT NULL AND p_starts_at<=now() AND NOT EXISTS (
    SELECT 1 FROM public.lms_qf_programme_updates WHERE id=p_id AND created_by=actor) THEN
   RAISE EXCEPTION 'Choose a date and time in the future.';
 END IF;
 INSERT INTO public.lms_qf_programme_updates(id,version_id,enrolment_id,kind,title,details,starts_at,created_by)
 VALUES (p_id,p_version,p_enrolment,p_kind,btrim(p_title),btrim(coalesce(p_details,'')),p_starts_at,actor)
 ON CONFLICT(id) DO NOTHING;
 IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.lms_qf_programme_updates
   WHERE id=p_id AND created_by=actor AND version_id=p_version AND kind=p_kind AND title=btrim(p_title)
    AND details=btrim(coalesce(p_details,'')) AND enrolment_id IS NOT DISTINCT FROM p_enrolment
    AND starts_at IS NOT DISTINCT FROM p_starts_at) THEN
   RAISE EXCEPTION 'Programme update request conflicts with an existing record.';
 END IF;
END $fn$;

CREATE FUNCTION public.lms_qf_admin_resolve_programme_update(p_version uuid,p_id uuid,p_resolution text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=public.lms_qf_actor();
BEGIN
 IF NOT public.lms_p1_actor_is_admin() OR actor IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false')='true' THEN
   RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 IF p_resolution IS NULL OR p_resolution NOT IN ('cancelled','completed') THEN
   RAISE EXCEPTION 'Invalid resolution.';
 END IF;
 UPDATE public.lms_qf_programme_updates SET resolved_as=p_resolution,resolved_at=now(),resolved_by=actor
 WHERE id=p_id AND version_id=p_version AND resolved_as IS NULL
   AND (p_resolution='cancelled' OR (kind IN ('appointment','review') AND starts_at<=now()));
 IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.lms_qf_programme_updates
   WHERE id=p_id AND version_id=p_version AND resolved_as=p_resolution) THEN
   RAISE EXCEPTION 'This programme update cannot be resolved in that way.';
 END IF;
END $fn$;

REVOKE ALL ON FUNCTION public.lms_qf_programme_updates(uuid),public.lms_qf_admin_programme_updates(uuid),
 public.lms_qf_admin_create_programme_update(uuid,uuid,uuid,text,text,text,timestamptz),
 public.lms_qf_admin_resolve_programme_update(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_programme_updates(uuid),public.lms_qf_admin_programme_updates(uuid),
 public.lms_qf_admin_create_programme_update(uuid,uuid,uuid,text,text,text,timestamptz),
 public.lms_qf_admin_resolve_programme_update(uuid,uuid,text) TO authenticated;
