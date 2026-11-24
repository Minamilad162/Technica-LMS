BEGIN;
-- Atomic approval of the saved briefs for exactly one draft source edition.
CREATE OR REPLACE FUNCTION public.lms_qf_admin_approve_all_briefs(
 p_version uuid,p_expected jsonb,p_attest boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v public.lms_qualification_versions; rec record; n integer:=0; total integer;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501';
 END IF;
 IF p_attest IS DISTINCT FROM true THEN RAISE EXCEPTION 'Centre approval confirmation required.'; END IF;
 SELECT * INTO v FROM public.lms_qualification_versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR v.catalog_key NOT LIKE 'technica-source-%' OR v.published_at IS NOT NULL THEN
  RAISE EXCEPTION 'Only draft source-backed qualifications can be approved.';
 END IF;
 SELECT count(*) INTO total FROM public.lms_qualification_units WHERE version_id=v.id;
 IF total=0 OR jsonb_typeof(p_expected) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Review all Units before approval.';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_expected))<>total THEN
  RAISE EXCEPTION 'Unit list changed. Reload and review the qualification.';
 END IF;
 -- The version lock serializes with the existing save/publish RPCs.
 FOR rec IN SELECT u.id,u.code,b.assessment_instructions,b.assessment_methods,b.status,b.approved_at
  FROM public.lms_qualification_units u
  LEFT JOIN public.lms_qf_centre_briefs b ON b.unit_id=u.id
  WHERE u.version_id=v.id ORDER BY u.position
 LOOP
  IF NOT (p_expected ? rec.id::text)
   OR (p_expected->rec.id::text->>'instructions') IS DISTINCT FROM rec.assessment_instructions
   OR (p_expected->rec.id::text->>'methods') IS DISTINCT FROM rec.assessment_methods THEN
   RAISE EXCEPTION 'Unit % changed. Reload and review saved briefs.',rec.code;
  END IF;
  IF char_length(btrim(coalesce(rec.assessment_instructions,''))) NOT BETWEEN 80 AND 30000
   OR char_length(btrim(coalesce(rec.assessment_methods,''))) NOT BETWEEN 20 AND 3000
   OR lower(btrim(rec.assessment_methods)) LIKE 'methods must be selected and justified by the centre assessor%'
   OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_outcomes o WHERE o.unit_id=rec.id AND o.required)
   OR EXISTS(SELECT 1 FROM public.lms_qualification_outcomes o WHERE o.unit_id=rec.id
     AND NOT EXISTS(SELECT 1 FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id)) THEN
   RAISE EXCEPTION 'Unit % needs complete instructions, genuine assessment methods and official criteria.',rec.code;
  END IF;
  IF rec.status IS DISTINCT FROM 'approved' OR rec.approved_at IS NULL THEN
   PERFORM public.lms_qf_admin_save_brief(rec.id,rec.assessment_instructions,rec.assessment_methods,true);
   n:=n+1;
  END IF;
 END LOOP;
 RETURN n;
END
$fn$;
REVOKE ALL ON FUNCTION public.lms_qf_admin_approve_all_briefs(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_approve_all_briefs(uuid,jsonb,boolean) TO authenticated;
COMMIT;
