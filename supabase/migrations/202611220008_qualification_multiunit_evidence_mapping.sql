BEGIN;
-- One evidence record, reused across any number of Units and LOs in its enrolled
-- qualification. This action saves DRAFT links only; assessment submission remains
-- a separate per-Outcome action with Assessor and Verifier review.
-- SECURITY: immutable learner+enrolment scope; lock enrolment as in save_claim;
-- never edit pending, submitted, verifier-returned or verified claims.
CREATE OR REPLACE FUNCTION public.lms_qf_map_evidence_across_units(
  p_enrolment uuid, p_evidence uuid, p_criteria uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 e public.lms_qualification_enrolments;
 f public.lms_qualification_evidence;
 o record;
 c record;
 q public.lms_qualification_claims;
 m jsonb;
 links jsonb;
 wanted boolean;
 present boolean;
 changed boolean;
 changed_outcomes integer:=0;
 changed_links integer:=0;
 file_key text:=p_evidence::text;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments
 WHERE id=p_enrolment AND learner_id=public.lms_qf_actor() FOR UPDATE;
 IF NOT FOUND OR e.completed_at IS NOT NULL OR e.starts_on>current_date
  OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions
                WHERE id=e.version_id AND published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'An active learner enrolment is required to map evidence.'
  USING ERRCODE='42501'; END IF;

 SELECT * INTO f FROM public.lms_qualification_evidence
 WHERE id=p_evidence AND enrolment_id=e.id;
 IF NOT FOUND OR NOT public.lms_qf_evidence_ready(f)
 THEN RAISE EXCEPTION 'Evidence must be an uploaded or written item in your active qualification.'
 USING ERRCODE='42501'; END IF;

 IF p_criteria IS NULL OR cardinality(p_criteria)>1500
 OR cardinality(p_criteria)<>(SELECT count(DISTINCT x) FROM unnest(p_criteria) x)
 OR EXISTS (SELECT 1 FROM unnest(p_criteria) x
   WHERE x IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.lms_qualification_criteria c
     JOIN public.lms_qualification_outcomes o ON o.id=c.outcome_id
     JOIN public.lms_qualification_units u ON u.id=o.unit_id
     WHERE c.id=x AND u.version_id=e.version_id))
 THEN RAISE EXCEPTION 'Only valid unique criteria from this same enrolled qualification can be linked.';
 END IF;

 FOR o IN
  SELECT o.id FROM public.lms_qualification_outcomes o
  JOIN public.lms_qualification_units u ON u.id=o.unit_id
  WHERE u.version_id=e.version_id ORDER BY u.position,o.position
 LOOP
  SELECT * INTO q FROM public.lms_qualification_claims
  WHERE enrolment_id=e.id AND outcome_id=o.id FOR UPDATE;
  -- Submitted/verified work is immutable; retain its links and decisions.
  IF FOUND AND q.state NOT IN ('draft','changes_requested') THEN CONTINUE; END IF;
  m:=coalesce(q.mapping,'{}'::jsonb);
  IF jsonb_typeof(m)<>'object' THEN
    RAISE EXCEPTION 'Invalid existing assessment mapping; contact the centre.';
  END IF;
  changed:=false;
  FOR c IN SELECT c.id FROM public.lms_qualification_criteria c
    WHERE c.outcome_id=o.id ORDER BY c.position
  LOOP
   links:=coalesce(m->c.id::text,'[]'::jsonb);
   IF jsonb_typeof(links)<>'array' THEN
     RAISE EXCEPTION 'Invalid existing assessment criterion mapping.';
   END IF;
   wanted:=c.id=ANY(p_criteria);
   present:=links ? file_key;
   IF wanted IS DISTINCT FROM present THEN
     changed:=true;
     changed_links:=changed_links+1;
     IF wanted THEN
       IF jsonb_array_length(links)>=100 THEN RAISE EXCEPTION 'Maximum 100 evidence links per criterion.'; END IF;
       links:=links || to_jsonb(ARRAY[file_key]);
     ELSE
       SELECT coalesce(jsonb_agg(z.val),'[]'::jsonb) INTO links
       FROM jsonb_array_elements_text(links) z(val) WHERE z.val<>file_key;
     END IF;
     IF jsonb_array_length(links)=0 THEN m:=m-c.id::text;
     ELSE m:=jsonb_set(m,ARRAY[c.id::text],links,true); END IF;
   END IF;
  END LOOP;
  IF changed THEN
    IF octet_length(m::text)>131072 THEN RAISE EXCEPTION 'Evidence mapping is too large.'; END IF;
    INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
    VALUES(e.id,o.id,coalesce(q.state,'draft'),coalesce(q.revision,1),coalesce(q.version,0)+1,m)
    ON CONFLICT(enrolment_id,outcome_id) DO UPDATE SET
      state=excluded.state,revision=excluded.revision,
      version=excluded.version,mapping=excluded.mapping;
    changed_outcomes:=changed_outcomes+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('saved',true,'outcomesUpdated',changed_outcomes,
   'criterionLinksChanged',changed_links,'evidenceId',p_evidence);
END $fn$;

REVOKE ALL ON FUNCTION public.lms_qf_map_evidence_across_units(uuid,uuid,uuid[])
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_map_evidence_across_units(uuid,uuid,uuid[]) TO authenticated;
COMMIT;
