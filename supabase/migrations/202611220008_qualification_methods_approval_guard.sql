-- Qualification approval safety: centre-selected methods, never the auto-import placeholder.
-- Preserves original actor permissions, versions, RLS, and certificate restrictions.
CREATE OR REPLACE FUNCTION public.lms_qf_admin_save_brief(
 p_unit uuid,p_instructions text,p_methods text,p_approve boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid := (SELECT auth.uid()); v public.lms_qualification_versions;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 SELECT v.* INTO v FROM public.lms_qualification_versions v
 JOIN public.lms_qualification_units u ON u.version_id=v.id WHERE u.id=p_unit FOR UPDATE OF v;
 IF NOT FOUND OR v.catalog_key NOT LIKE 'technica-source-%' OR v.published_at IS NOT NULL THEN
  RAISE EXCEPTION 'Only draft reference programmes can change their assessment briefs.';
 END IF;
 IF char_length(btrim(coalesce(p_instructions,''))) NOT BETWEEN 80 AND 30000
  OR char_length(coalesce(p_methods,''))>3000 THEN
  RAISE EXCEPTION 'Provide complete Unit instructions and methods before saving.';
 END IF;
 IF p_approve AND (char_length(btrim(coalesce(p_methods,'')))<20
  OR lower(btrim(coalesce(p_methods,''))) LIKE 'methods must be selected and justified by the centre assessor%')
 THEN RAISE EXCEPTION 'Select genuine Unit-specific methods and acceptance conditions before centre approval.'; END IF;
 INSERT INTO public.lms_qf_centre_briefs(unit_id,assessment_instructions,assessment_methods,status,
  approved_by,approved_at,updated_by,updated_at)
 VALUES(p_unit,btrim(p_instructions),btrim(coalesce(p_methods,'')),
  CASE WHEN p_approve THEN 'approved' ELSE 'draft' END,
  CASE WHEN p_approve THEN actor END,CASE WHEN p_approve THEN now() END,actor,now())
 ON CONFLICT(unit_id) DO UPDATE SET assessment_instructions=excluded.assessment_instructions,
  assessment_methods=excluded.assessment_methods,status=excluded.status,
  approved_by=excluded.approved_by,approved_at=excluded.approved_at,
  updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,detail)
 VALUES(actor,CASE WHEN p_approve THEN 'brief_approved' ELSE 'brief_saved' END,
  v.id,jsonb_build_object('unit',p_unit));
END
$fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_publish(p_version uuid,
 p_approval_reference text,p_declaration text,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid:=(SELECT auth.uid()); v public.lms_qualification_versions;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.lms_qualification_versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR v.catalog_key NOT LIKE 'technica-source-%' OR v.published_at IS NOT NULL THEN
  RAISE EXCEPTION 'Only an unpublished source-backed edition can be released.';
 END IF;
 IF p_attest IS DISTINCT FROM true OR char_length(btrim(coalesce(p_approval_reference,'')))<10
  OR lower(p_approval_reference)~'(pending|placeholder|test|sandbox|demo|source reference|draft)'
  OR char_length(btrim(coalesce(p_declaration,'')))<70 THEN
   RAISE EXCEPTION 'Provide genuine centre approval reference, signed readiness confirmation and full learner declaration.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_units u WHERE u.version_id=p_version)
    OR EXISTS (
      SELECT 1 FROM public.lms_qualification_units u
      LEFT JOIN public.lms_qf_centre_briefs b ON b.unit_id=u.id
      WHERE u.version_id=p_version AND (b.status IS DISTINCT FROM 'approved'
        OR b.approved_at IS NULL OR char_length(btrim(b.assessment_methods))<20
        OR lower(btrim(b.assessment_methods)) LIKE 'methods must be selected and justified by the centre assessor%')
    )
    OR EXISTS (
      SELECT 1 FROM public.lms_qualification_units u
      WHERE u.version_id=p_version AND NOT EXISTS (
       SELECT 1 FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id AND o.required)
    ) THEN RAISE EXCEPTION 'Every Unit requires a complete rubric and centre-approved assignment brief before release.';
 END IF;
 UPDATE public.lms_qualification_versions
 SET approval_reference=btrim(p_approval_reference),declaration=btrim(p_declaration),
     published_at=now(),allow_certificate_recording=false
 WHERE id=p_version;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,detail)
 VALUES(actor,'version_published',p_version,
 jsonb_build_object('approvalReference',btrim(p_approval_reference),'certificatesEnabled',false));
END
$fn$;
