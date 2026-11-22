-- Authenticated, read-only, source-backed qualification reference catalogue.
-- Source rows are not enrolments, marking decisions, certificates, or centre approvals.
CREATE OR REPLACE FUNCTION public.lms_qf_reference_catalog()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE response jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false') = 'true' THEN
    RAISE EXCEPTION 'Authenticated learner access required' USING ERRCODE = '28000';
  END IF;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'catalog_key',v.catalog_key,
      'title',v.title,
      'version',v.version,
      'status',CASE WHEN v.published_at IS NULL THEN 'reference_only' ELSE 'centre_published' END,
      'reference_number',CASE v.catalog_key
        WHEN 'technica-source-othm6-2026' THEN '610/8264/8'
        WHEN 'technica-source-othm6-2023' THEN '603/5002/7'
        WHEN 'technica-source-othm7-2023' THEN '603/7782/3'
        WHEN 'technica-source-nvq6-2018' THEN '603/3106/9'
        END,
      'source_url',CASE v.catalog_key
        WHEN 'technica-source-othm6-2026' THEN 'https://othm.org.uk/docs/qualifications/othm-level-6-diploma-in-occupational-health-and-safety7565/specification_files/othm_level_6_diploma_in_occupational_health_and_safety_specification_nov_2026_master_2026-11-04_08-59.pdf'
        WHEN 'technica-source-othm6-2023' THEN 'https://drive.google.com/file/d/1i_-yUXkpeQunPXVyhYh_w-zmLI2gSEKV/view'
        WHEN 'technica-source-othm7-2023' THEN 'https://drive.google.com/file/d/1guoJsG-PTx2W6AWR7Rs8rHsVCKgK0Dzj/view'
        WHEN 'technica-source-nvq6-2018' THEN 'https://drive.google.com/file/d/1OVy2_yCo0hNJt7ZBMwWthJqwuV5O17Fi/view'
        END,
      'units',(SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'code',u.code,'title',u.title,'position',u.position,
          'outcomes',(SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'code',o.code,'title',o.title,'guidance',o.guidance,'position',o.position,
              'criteria',(SELECT COALESCE(jsonb_agg(
                jsonb_build_object('code',c.code,'title',c.title,'position',c.position)
                ORDER BY c.position),'[]'::jsonb)
                FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id),
              'resources',(SELECT COALESCE(jsonb_agg(
                jsonb_build_object('title',r.title,'url',r.url) ORDER BY r.title),'[]'::jsonb)
                FROM public.lms_qualification_resources r WHERE r.outcome_id=o.id)
            ) ORDER BY o.position),'[]'::jsonb)
            FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id)
        ) ORDER BY u.position),'[]'::jsonb)
        FROM public.lms_qualification_units u WHERE u.version_id=v.id)
    ) ORDER BY CASE v.catalog_key
      WHEN 'technica-source-othm6-2026' THEN 1
      WHEN 'technica-source-othm7-2023' THEN 2
      WHEN 'technica-source-nvq6-2018' THEN 3
      ELSE 4 END),'[]'::jsonb)
  INTO response
  FROM public.lms_qualification_versions v
  WHERE v.catalog_key IN (
    'technica-source-othm6-2026','technica-source-othm6-2023',
    'technica-source-othm7-2023','technica-source-nvq6-2018');
  RETURN response;
END
$function$;
REVOKE ALL ON FUNCTION public.lms_qf_reference_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_qf_reference_catalog() TO authenticated;
