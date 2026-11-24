BEGIN;
-- Repair pre-existing ambiguous table alias in the individual approval RPC; keep all guards.
CREATE OR REPLACE FUNCTION public.lms_qf_admin_save_brief(
 p_unit uuid,p_instructions text,p_methods text,p_approve boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid := (SELECT auth.uid()); v public.lms_qualification_versions;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 SELECT edition.* INTO v FROM public.lms_qualification_versions edition
 JOIN public.lms_qualification_units u ON u.version_id=edition.id WHERE u.id=p_unit FOR UPDATE OF edition;
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
