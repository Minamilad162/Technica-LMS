BEGIN;
-- Issuer authorization is separate from centre publication and learner completion.
-- Never fabricate certificates: the verifier may only record a reference issued by an
-- awarding body after the centre logs a real external issuer authorization.
CREATE TABLE public.lms_qf_certificate_issuer_authorisations(
 version_id uuid PRIMARY KEY REFERENCES public.lms_qualification_versions(id),
 issuer_name text NOT NULL CHECK(char_length(btrim(issuer_name)) BETWEEN 4 AND 140),
 approval_reference text NOT NULL CHECK(char_length(btrim(approval_reference)) BETWEEN 12 AND 240),
 evidence_url text NOT NULL CHECK(evidence_url ~ '^https://[^[:space:]]+$'),
 authorized_by uuid NOT NULL REFERENCES public.lms_profiles(id),
 authorized_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_qf_certificate_issuer_authorisations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_certificate_issuer_authorisations FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_certificate_authorize(
 p_version uuid,p_issuer_name text,p_reference text,p_evidence_url text,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v public.lms_qualification_versions;
BEGIN
 IF NOT public.lms_qf_admin_access() OR p_attest IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Centre administrator must confirm issuer authorization.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v FROM public.lms_qualification_versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR v.published_at IS NULL OR v.catalog_key NOT LIKE 'technica-source-%' THEN
  RAISE EXCEPTION 'Only released qualification versions may be approved for certificate recording.';
 END IF;
 IF char_length(btrim(coalesce(p_issuer_name,''))) NOT BETWEEN 4 AND 140
 OR char_length(btrim(coalesce(p_reference,''))) NOT BETWEEN 12 AND 240
 OR p_evidence_url !~ '^https://[^[:space:]]+$'
 OR lower(p_reference) ~ '(pending|placeholder|sandbox|demo|test)' THEN
  RAISE EXCEPTION 'Provide a genuine awarding body authorization, reference and supporting HTTPS record.';
 END IF;
 INSERT INTO public.lms_qf_certificate_issuer_authorisations
 (version_id,issuer_name,approval_reference,evidence_url,authorized_by)
 VALUES(p_version,btrim(p_issuer_name),btrim(p_reference),p_evidence_url,(SELECT auth.uid()))
 ON CONFLICT(version_id) DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'Issuer authorization is already recorded and immutable.'; END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_certificate_status(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE x jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin access required.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('issuer',issuer_name,'reference',approval_reference,
  'evidenceUrl',evidence_url,'authorizedAt',authorized_at) INTO x
 FROM public.lms_qf_certificate_issuer_authorisations WHERE version_id=p_version;
 RETURN coalesce(x,'null'::jsonb);
END $fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_certificate_access(p_enrolment uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM public.lms_qualification_enrolments e
  JOIN public.lms_qf_certificate_issuer_authorisations a ON a.version_id=e.version_id
  JOIN public.lms_qualification_versions v ON v.id=e.version_id AND v.published_at IS NOT NULL
  WHERE e.id=p_enrolment AND public.lms_qf_actor() IN(e.learner_id,e.assessor_id,e.verifier_id)
 )
$fn$;

-- Preserve original two-stage verifier completion and externally issued certificate reference.
CREATE OR REPLACE FUNCTION public.lms_qf_finalize(p_enrolment uuid,p_certificate_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE e public.lms_qualification_enrolments; actor uuid:=public.lms_qf_actor();
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR e.verifier_id IS DISTINCT FROM actor THEN
   RAISE EXCEPTION 'Qualification finalization access denied.' USING ERRCODE='42501';
 END IF;
 IF p_certificate_reference IS NOT NULL THEN
  IF NOT EXISTS(
   SELECT 1 FROM public.lms_qualification_versions v
   WHERE v.id=e.version_id AND v.published_at IS NOT NULL
     AND (v.allow_certificate_recording OR EXISTS(
       SELECT 1 FROM public.lms_qf_certificate_issuer_authorisations a WHERE a.version_id=v.id
     ))
  ) THEN RAISE EXCEPTION 'External awarding-body certificate issuer authorization is required.'; END IF;
  IF e.completed_at IS NULL OR nullif(btrim(p_certificate_reference),'') IS NULL
     OR char_length(p_certificate_reference)>120
     OR (e.certificate_reference IS NOT NULL AND e.certificate_reference IS DISTINCT FROM btrim(p_certificate_reference))
  THEN RAISE EXCEPTION 'Completed qualification and actual issued certificate reference required.'; END IF;
  UPDATE public.lms_qualification_enrolments SET certificate_reference=btrim(p_certificate_reference),
    certificate_recorded_at=coalesce(certificate_recorded_at,now()),
    certificate_recorded_by=coalesce(certificate_recorded_by,actor)
    WHERE id=e.id;
  RETURN;
 END IF;
 IF e.completed_at IS NOT NULL THEN RETURN; END IF;
 IF e.declaration_at IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
   WHERE u.version_id=e.version_id AND o.required
 ) OR EXISTS (
   SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
   LEFT JOIN public.lms_qualification_claims c ON c.enrolment_id=e.id AND c.outcome_id=o.id
   WHERE u.version_id=e.version_id AND ((o.required AND c.state IS DISTINCT FROM 'verified')
    OR c.state IN ('submitted','awaiting_verification','verification_returned'))
 ) THEN RAISE EXCEPTION 'Verify all required outcomes and resolve outstanding reviews before completion.'; END IF;
 UPDATE public.lms_qualification_enrolments SET completed_at=now(),completed_by=actor WHERE id=e.id;
END $fn$;
REVOKE ALL ON FUNCTION public.lms_qf_admin_certificate_authorize(uuid,text,text,text,boolean),
 public.lms_qf_admin_certificate_status(uuid),public.lms_qf_certificate_access(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_certificate_authorize(uuid,text,text,text,boolean),
 public.lms_qf_admin_certificate_status(uuid),public.lms_qf_certificate_access(uuid) TO authenticated;
COMMIT;
