BEGIN;

-- Published versions are provisioned by the centre. All client access is through
-- the portfolio functions below. There are no browser write grants on these tables.
CREATE TABLE public.lms_qualification_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 catalog_key text NOT NULL,
 title text NOT NULL,
 version text NOT NULL,
 approval_reference text NOT NULL CHECK (btrim(approval_reference) <> ''),
 declaration text NOT NULL CHECK (btrim(declaration) <> ''),
 allow_certificate_recording boolean NOT NULL DEFAULT false,
 published_at timestamptz,
 UNIQUE (catalog_key, version)
);
CREATE TABLE public.lms_qualification_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES public.lms_qualification_versions(id),
 code text NOT NULL,
 title text NOT NULL,
 position integer NOT NULL CHECK (position > 0),
 UNIQUE (version_id,code), UNIQUE (version_id,position)
);
CREATE TABLE public.lms_qualification_outcomes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 unit_id uuid NOT NULL REFERENCES public.lms_qualification_units(id),
 code text NOT NULL,
 title text NOT NULL,
 position integer NOT NULL CHECK (position > 0),
 required boolean NOT NULL DEFAULT true,
 guidance text NOT NULL DEFAULT '',
 UNIQUE (unit_id, code), UNIQUE (unit_id, position)
);
CREATE TABLE public.lms_qualification_criteria (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 outcome_id uuid NOT NULL REFERENCES public.lms_qualification_outcomes(id),
 code text NOT NULL,
 title text NOT NULL,
 position integer NOT NULL CHECK (position > 0),
 UNIQUE (outcome_id, code), UNIQUE (outcome_id, position)
);
CREATE TABLE public.lms_qualification_resources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 outcome_id uuid NOT NULL REFERENCES public.lms_qualification_outcomes(id),
 title text NOT NULL,
 url text NOT NULL CHECK (url ~ '^https://[^[:space:]]+$')
);
CREATE TABLE public.lms_qualification_enrolments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES public.lms_qualification_versions(id),
 learner_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 assessor_id uuid REFERENCES public.lms_profiles(id),
 verifier_id uuid REFERENCES public.lms_profiles(id),
 starts_on date NOT NULL,
 target_on date CHECK (target_on >= starts_on),
 declaration_at timestamptz,
 completed_at timestamptz,
 completed_by uuid REFERENCES public.lms_profiles(id),
 certificate_reference text UNIQUE,
 certificate_recorded_at timestamptz,
 certificate_recorded_by uuid REFERENCES public.lms_profiles(id),
 UNIQUE (version_id, learner_id),
 CHECK (assessor_id IS DISTINCT FROM learner_id AND verifier_id IS DISTINCT FROM learner_id),
 CHECK (assessor_id IS NULL OR verifier_id IS NULL OR assessor_id <> verifier_id)
);
CREATE INDEX ON public.lms_qualification_enrolments (learner_id);
CREATE INDEX ON public.lms_qualification_enrolments (assessor_id);
CREATE INDEX ON public.lms_qualification_enrolments (verifier_id);

CREATE TABLE public.lms_qualification_deadlines (
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id),
 outcome_id uuid NOT NULL REFERENCES public.lms_qualification_outcomes(id),
 due_on date NOT NULL,
 PRIMARY KEY (enrolment_id, outcome_id)
);
CREATE TABLE public.lms_qualification_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id),
 title text NOT NULL,
 description text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('Workplace evidence','Reflective account','Witness testimony','Other')),
 body text,
 filename text,
 mime text,
 bytes integer CHECK (bytes BETWEEN 1 AND 10485760),
 object_path text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((body IS NOT NULL AND object_path IS NULL AND filename IS NULL AND mime IS NULL AND bytes IS NULL)
     OR (body IS NULL AND object_path IS NOT NULL AND filename IS NOT NULL AND mime IS NOT NULL AND bytes IS NOT NULL))
);
CREATE INDEX ON public.lms_qualification_evidence (enrolment_id);
CREATE TABLE public.lms_qualification_claims (
 enrolment_id uuid NOT NULL REFERENCES public.lms_qualification_enrolments(id),
 outcome_id uuid NOT NULL REFERENCES public.lms_qualification_outcomes(id),
 state text NOT NULL CHECK (state IN ('draft','submitted','changes_requested','awaiting_verification','verification_returned','verified')),
 revision integer NOT NULL CHECK (revision > 0),
 version integer NOT NULL CHECK (version > 0),
 mapping jsonb NOT NULL,
 PRIMARY KEY (enrolment_id,outcome_id)
);
CREATE TABLE public.lms_qualification_submissions (
 enrolment_id uuid NOT NULL,
 outcome_id uuid NOT NULL,
 revision integer NOT NULL,
 snapshot jsonb NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (enrolment_id,outcome_id,revision),
 FOREIGN KEY (enrolment_id,outcome_id) REFERENCES public.lms_qualification_claims(enrolment_id,outcome_id)
);
CREATE TABLE public.lms_qualification_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 enrolment_id uuid NOT NULL,
 outcome_id uuid NOT NULL,
 revision integer NOT NULL,
 reviewer_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 stage text NOT NULL CHECK (stage IN ('assessor','verifier')),
 decision text NOT NULL CHECK (decision IN ('accept','return')),
 feedback text NOT NULL,
 criteria jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (enrolment_id,outcome_id,revision) REFERENCES public.lms_qualification_submissions(enrolment_id,outcome_id,revision)
);
CREATE INDEX ON public.lms_qualification_reviews (enrolment_id,outcome_id,revision);

DO $$
DECLARE relation text;
BEGIN
 FOREACH relation IN ARRAY ARRAY['versions','units','outcomes','criteria','resources','enrolments','deadlines','evidence','claims','submissions','reviews'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', 'lms_qualification_' || relation);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', 'lms_qualification_' || relation);
 END LOOP;
END $$;

-- Seal the published rubric and its children so an enrolment stays pinned to the
-- same requirements. Create a new draft version to publish a changed rubric.
CREATE FUNCTION public.lms_qf_rubric_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE old_row jsonb; new_row jsonb; row_data jsonb; version_key uuid;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME = 'lms_qualification_versions' THEN
  IF old_row->>'published_at' IS NOT NULL THEN RAISE EXCEPTION 'Published qualification versions are immutable.'; END IF;
  IF new_row->>'published_at' IS NOT NULL THEN
   version_key := (new_row->>'id')::uuid;
   IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id WHERE u.version_id=version_key AND o.required)
      OR EXISTS (
       SELECT 1 FROM public.lms_qualification_units u WHERE u.version_id=version_key
       AND NOT EXISTS (SELECT 1 FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id)
      ) OR EXISTS (
       SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
       WHERE u.version_id=version_key AND NOT EXISTS (SELECT 1 FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id)
      ) THEN RAISE EXCEPTION 'Publish a complete rubric with at least one required outcome.'; END IF;
  END IF;
 ELSE
  FOREACH row_data IN ARRAY ARRAY[old_row,new_row] LOOP
   CONTINUE WHEN row_data IS NULL;
   CASE TG_TABLE_NAME
    WHEN 'lms_qualification_units' THEN version_key := (row_data->>'version_id')::uuid;
    WHEN 'lms_qualification_outcomes' THEN
     SELECT version_id INTO version_key FROM public.lms_qualification_units WHERE id=(row_data->>'unit_id')::uuid;
    ELSE
     SELECT u.version_id INTO version_key FROM public.lms_qualification_outcomes o
     JOIN public.lms_qualification_units u ON u.id=o.unit_id WHERE o.id=(row_data->>'outcome_id')::uuid;
   END CASE;
   PERFORM 1 FROM public.lms_qualification_versions v WHERE v.id=version_key FOR UPDATE;
   IF EXISTS (SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=version_key AND v.published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Published qualification versions are immutable.';
   END IF;
  END LOOP;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lms_qf_rubric_guard() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE relation text;
BEGIN
 FOREACH relation IN ARRAY ARRAY['versions','units','outcomes','criteria','resources'] LOOP
  EXECUTE format('CREATE TRIGGER lms_qf_seal BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lms_qf_rubric_guard()', 'lms_qualification_' || relation);
 END LOOP;
END $$;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('technica-qualification-evidence','technica-qualification-evidence',false,10485760,
 ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

CREATE FUNCTION public.lms_qf_actor() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT id FROM public.lms_profiles WHERE id=(SELECT auth.uid()) AND account_status='active'
$$;
CREATE FUNCTION public.lms_qf_evidence_ready(p_file public.lms_qualification_evidence) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_file.body IS NOT NULL OR EXISTS (
  SELECT 1 FROM storage.objects o WHERE o.bucket_id='technica-qualification-evidence' AND o.name=p_file.object_path
  AND o.metadata->>'size'=p_file.bytes::text AND o.metadata->>'mimetype'=p_file.mime
 )
$$;
CREATE FUNCTION public.lms_qf_storage_allowed(p_path text, p_upload boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lms_qualification_evidence f
  JOIN public.lms_qualification_enrolments e ON e.id=f.enrolment_id
  JOIN public.lms_qualification_versions v ON v.id=e.version_id
  CROSS JOIN (SELECT public.lms_qf_actor() AS id) actor
  WHERE f.object_path=p_path AND v.published_at IS NOT NULL
   AND CASE WHEN p_upload THEN e.learner_id=actor.id AND e.completed_at IS NULL
     AND e.starts_on<=current_date AND f.created_at>now()-interval '1 hour'
    ELSE e.learner_id=actor.id OR EXISTS (
     SELECT 1 FROM public.lms_qualification_submissions s
     WHERE s.enrolment_id=e.id AND (s.snapshot->'evidence') ? f.id::text
      AND (e.assessor_id=actor.id OR (e.verifier_id=actor.id AND EXISTS (
       SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=s.enrolment_id
       AND r.outcome_id=s.outcome_id AND r.revision=s.revision AND r.stage='assessor' AND r.decision='accept'
      )))
    ) END
 )
$$;
REVOKE ALL ON FUNCTION public.lms_qf_actor(),public.lms_qf_evidence_ready(public.lms_qualification_evidence),
 public.lms_qf_storage_allowed(text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_storage_allowed(text,boolean) TO authenticated;

CREATE POLICY lms_qf_evidence_read ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='technica-qualification-evidence' AND public.lms_qf_storage_allowed(name,false));
CREATE POLICY lms_qf_evidence_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='technica-qualification-evidence' AND public.lms_qf_storage_allowed(name,true));
-- Restrictive guards keep existing broad authenticated bucket policies from
-- widening access to this bucket and ensure a submitted object cannot be overwritten.
CREATE POLICY lms_qf_evidence_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING (bucket_id<>'technica-qualification-evidence' OR public.lms_qf_storage_allowed(name,false));
CREATE POLICY lms_qf_evidence_upload_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (bucket_id<>'technica-qualification-evidence' OR public.lms_qf_storage_allowed(name,true));
CREATE POLICY lms_qf_evidence_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (bucket_id<>'technica-qualification-evidence') WITH CHECK (bucket_id<>'technica-qualification-evidence');
CREATE POLICY lms_qf_evidence_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING (bucket_id<>'technica-qualification-evidence');
CREATE POLICY lms_qf_evidence_anon_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon
 USING (bucket_id<>'technica-qualification-evidence') WITH CHECK (bucket_id<>'technica-qualification-evidence');

CREATE FUNCTION public.lms_qf_list() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',v.title,'catalogKey',v.catalog_key,
  'role',CASE WHEN e.learner_id=a.id THEN 'learner' WHEN e.assessor_id=a.id THEN 'assessor' ELSE 'verifier' END,
  'learner',l.full_name,'completedAt',e.completed_at,
  'pending',(SELECT count(*) FROM public.lms_qualification_claims c WHERE c.enrolment_id=e.id AND
   ((e.assessor_id=a.id AND c.state IN ('submitted','verification_returned')) OR
    (e.verifier_id=a.id AND c.state='awaiting_verification')))) ORDER BY v.title,l.full_name,e.id),'[]'::jsonb)
 FROM public.lms_qualification_enrolments e
 JOIN public.lms_qualification_versions v ON v.id=e.version_id AND v.published_at IS NOT NULL
 JOIN public.lms_profiles l ON l.id=e.learner_id
 CROSS JOIN (SELECT public.lms_qf_actor() AS id) a
 WHERE a.id IN (e.learner_id,e.assessor_id,e.verifier_id)
$$;

CREATE FUNCTION public.lms_qf_portfolio(p_enrolment uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; v public.lms_qualification_versions;
 actor uuid := public.lms_qf_actor(); actor_role text;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 actor_role := CASE actor WHEN e.learner_id THEN 'learner' WHEN e.assessor_id THEN 'assessor' WHEN e.verifier_id THEN 'verifier' END;
 IF actor_role IS NULL THEN RAISE EXCEPTION 'Qualification access denied.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Qualification is unavailable.'; END IF;
 RETURN jsonb_build_object(
  'id',e.id,'title',v.title,'version',v.version,'role',actor_role,'startsOn',e.starts_on,'targetOn',e.target_on,
  'canEdit',actor_role='learner' AND e.completed_at IS NULL AND e.starts_on<=current_date,
  'assessorAssigned',EXISTS (SELECT 1 FROM public.lms_profiles WHERE id=e.assessor_id AND account_status='active'),
  'verifierAssigned',EXISTS (SELECT 1 FROM public.lms_profiles WHERE id=e.verifier_id AND account_status='active'),
  'declaration',v.declaration,'declarationAt',e.declaration_at,'completedAt',e.completed_at,
  'canRecordCertificate',v.allow_certificate_recording,
  'certificate',e.certificate_reference,'certificateDate',e.certificate_recorded_at,
  'learner',(SELECT full_name FROM public.lms_profiles WHERE id=e.learner_id),
  'assessor',(SELECT full_name FROM public.lms_profiles WHERE id=e.assessor_id),
  'verifier',(SELECT full_name FROM public.lms_profiles WHERE id=e.verifier_id),
  'evidence',CASE WHEN actor_role='learner' THEN coalesce((
   SELECT jsonb_agg(to_jsonb(f)-'enrolment_id' ORDER BY f.created_at DESC)
   FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id AND public.lms_qf_evidence_ready(f)
  ),'[]'::jsonb) ELSE '[]'::jsonb END,
  'units',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.code,'title',u.title,'outcomes',coalesce((
    SELECT jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'guidance',o.guidance,
     'required',o.required,'deadline',d.due_on,
     'overdue',e.completed_at IS NULL AND d.due_on<current_date AND coalesce(q.state,'draft') IN ('draft','changes_requested'),
     'criteria',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'title',c.title) ORDER BY c.position)
      FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id),'[]'::jsonb),
     'resources',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'url',r.url) ORDER BY r.title)
      FROM public.lms_qualification_resources r WHERE r.outcome_id=o.id),'[]'::jsonb),
     'claim',CASE WHEN actor_role='learner' OR (actor_role='assessor' AND q.state<>'draft')
      OR (actor_role='verifier' AND q.state IN ('awaiting_verification','verification_returned','verified'))
      THEN jsonb_build_object('state',q.state,'revision',q.revision,'version',q.version,
       'mapping',CASE WHEN actor_role='learner' THEN q.mapping END) END,
     'submissions',coalesce((
      SELECT jsonb_agg(jsonb_build_object('revision',s.revision,'submittedAt',s.submitted_at,'snapshot',s.snapshot,
       'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('stage',r.stage,'decision',r.decision,
        'feedback',r.feedback,'criteria',r.criteria,'createdAt',r.created_at) ORDER BY r.id)
        FROM public.lms_qualification_reviews r WHERE r.enrolment_id=s.enrolment_id
        AND r.outcome_id=s.outcome_id AND r.revision=s.revision
        AND (actor_role<>'learner' OR r.stage='assessor' OR r.decision='accept')),'[]'::jsonb))
       ORDER BY s.revision DESC)
      FROM public.lms_qualification_submissions s WHERE s.enrolment_id=e.id AND s.outcome_id=o.id
      AND (actor_role<>'verifier' OR EXISTS (
       SELECT 1 FROM public.lms_qualification_reviews r WHERE r.enrolment_id=s.enrolment_id
       AND r.outcome_id=s.outcome_id AND r.revision=s.revision AND r.stage='assessor' AND r.decision='accept'
      ))
     ),'[]'::jsonb)) ORDER BY o.position)
    FROM public.lms_qualification_outcomes o
    LEFT JOIN public.lms_qualification_claims q ON q.enrolment_id=e.id AND q.outcome_id=o.id
    LEFT JOIN public.lms_qualification_deadlines d ON d.enrolment_id=e.id AND d.outcome_id=o.id
    WHERE o.unit_id=u.id),'[]'::jsonb)) ORDER BY u.position)
   FROM public.lms_qualification_units u WHERE u.version_id=v.id
  ),'[]'::jsonb));
END $$;

CREATE FUNCTION public.lms_qf_add_evidence(p_enrolment uuid,p_title text,p_description text,p_kind text,
 p_body text,p_filename text,p_mime text,p_bytes integer,p_request uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; existing public.lms_qualification_evidence;
 item uuid := coalesce(p_request,gen_random_uuid()); path text;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments
 WHERE id=p_enrolment AND learner_id=public.lms_qf_actor() FOR UPDATE;
 IF NOT FOUND OR e.completed_at IS NOT NULL OR e.starts_on>current_date
  OR NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL)
  THEN RAISE EXCEPTION 'This qualification cannot accept evidence.' USING ERRCODE='42501'; END IF;
 IF nullif(btrim(p_title),'') IS NULL OR char_length(p_title)>160 OR char_length(coalesce(p_description,''))>2000
  OR p_kind IS NULL OR p_kind NOT IN ('Workplace evidence','Reflective account','Witness testimony','Other')
  THEN RAISE EXCEPTION 'Provide a valid evidence title, description and type.'; END IF;
 SELECT * INTO existing FROM public.lms_qualification_evidence WHERE id=item;
 IF FOUND THEN
  IF existing.enrolment_id IS DISTINCT FROM e.id OR existing.title IS DISTINCT FROM btrim(p_title)
   OR existing.description IS DISTINCT FROM btrim(coalesce(p_description,'')) OR existing.kind IS DISTINCT FROM p_kind
   OR existing.body IS DISTINCT FROM btrim(p_body) OR existing.filename IS DISTINCT FROM p_filename
   OR existing.mime IS DISTINCT FROM p_mime OR existing.bytes IS DISTINCT FROM p_bytes THEN
   RAISE EXCEPTION 'Evidence request conflicts with an existing item.';
  END IF;
  RETURN jsonb_build_object('id',item,'path',existing.object_path);
 END IF;
 IF p_body IS NULL THEN
  IF p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 10485760 OR nullif(btrim(p_filename),'') IS NULL
   OR char_length(p_filename)>255 OR p_filename ~ '[[:cntrl:]/\\]' OR p_mime IS NULL OR p_mime NOT IN (
    'application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
   THEN RAISE EXCEPTION 'Choose a PDF, Word, Excel, JPEG or PNG file up to 10 MB.'; END IF;
  IF (SELECT count(*) FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id
      AND f.object_path IS NOT NULL AND f.created_at>now()-interval '1 hour'
      AND NOT public.lms_qf_evidence_ready(f)) >= 10 THEN
   RAISE EXCEPTION 'Too many pending uploads. Retry a pending file or try again later.';
  END IF;
  path := e.id::text || '/' || item::text;
 ELSIF nullif(btrim(p_body),'') IS NULL OR char_length(p_body)>20000 OR p_filename IS NOT NULL OR p_mime IS NOT NULL OR p_bytes IS NOT NULL THEN
  RAISE EXCEPTION 'Enter written evidence of up to 20,000 characters.';
 END IF;
 INSERT INTO public.lms_qualification_evidence(id,enrolment_id,title,description,kind,body,filename,mime,bytes,object_path)
 VALUES (item,e.id,btrim(p_title),btrim(coalesce(p_description,'')),p_kind,btrim(p_body),p_filename,p_mime,p_bytes,path);
 RETURN jsonb_build_object('id',item,'path',path);
END $$;

CREATE FUNCTION public.lms_qf_save_claim(p_enrolment uuid,p_outcome uuid,p_version integer,p_mapping jsonb,p_submit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; claim public.lms_qualification_claims;
 crit record; file_id text; files jsonb; snapshot_evidence jsonb; snapshot_criteria jsonb; next_revision integer;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments
 WHERE id=p_enrolment AND learner_id=public.lms_qf_actor() FOR UPDATE;
 IF NOT FOUND OR e.completed_at IS NOT NULL OR e.starts_on>current_date THEN
  RAISE EXCEPTION 'This qualification is read-only.' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_outcomes o JOIN public.lms_qualification_units u ON u.id=o.unit_id
  JOIN public.lms_qualification_versions v ON v.id=u.version_id
  WHERE o.id=p_outcome AND v.id=e.version_id AND v.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Outcome is not in this qualification.';
 END IF;
 SELECT * INTO claim FROM public.lms_qualification_claims WHERE enrolment_id=e.id AND outcome_id=p_outcome;
 IF p_version IS DISTINCT FROM coalesce(claim.version,0) THEN RAISE EXCEPTION 'This outcome changed. Refresh it and try again.'; END IF;
 IF coalesce(claim.state,'draft') NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'This outcome is already in review or verified.'; END IF;
 IF jsonb_typeof(p_mapping) IS DISTINCT FROM 'object' OR octet_length(p_mapping::text)>131072 THEN
  RAISE EXCEPTION 'Invalid evidence mapping.';
 END IF;
 IF p_submit AND (e.declaration_at IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.lms_profiles WHERE id=e.assessor_id AND account_status='active'
 )) THEN RAISE EXCEPTION 'Accept the declaration and confirm an active assessor is assigned before submitting.'; END IF;
 IF p_submit AND NOT EXISTS (SELECT 1 FROM public.lms_qualification_criteria WHERE outcome_id=p_outcome) THEN
  RAISE EXCEPTION 'This outcome has no assessment criteria.';
 END IF;

 FOR crit IN SELECT key,value FROM jsonb_each(p_mapping) LOOP
  IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_criteria c WHERE c.outcome_id=p_outcome AND c.id::text=crit.key)
   OR jsonb_typeof(crit.value)<>'array' THEN RAISE EXCEPTION 'Invalid assessment criterion or evidence list.'; END IF;
  IF jsonb_array_length(crit.value)>100 OR jsonb_array_length(crit.value) <>
    (SELECT count(DISTINCT entry) FROM jsonb_array_elements_text(crit.value) AS items(entry))
   THEN RAISE EXCEPTION 'Invalid number of evidence links for a criterion.'; END IF;
  FOR file_id IN SELECT jsonb_array_elements_text(crit.value) LOOP
   IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_evidence f WHERE f.id::text=file_id AND f.enrolment_id=e.id
    AND public.lms_qf_evidence_ready(f)) THEN RAISE EXCEPTION 'Evidence is unavailable in this qualification.'; END IF;
  END LOOP;
 END LOOP;

 IF p_submit AND EXISTS (SELECT 1 FROM public.lms_qualification_criteria c WHERE c.outcome_id=p_outcome
  AND coalesce(jsonb_array_length(p_mapping->c.id::text),0)=0) THEN
  RAISE EXCEPTION 'Link evidence to every criterion before submitting.';
 END IF;
 next_revision := coalesce(claim.revision,1) + CASE WHEN p_submit AND claim.state='changes_requested' THEN 1 ELSE 0 END;

 INSERT INTO public.lms_qualification_claims(enrolment_id,outcome_id,state,revision,version,mapping)
 VALUES (e.id,p_outcome,CASE WHEN p_submit THEN 'submitted' ELSE coalesce(claim.state,'draft') END,
  next_revision,p_version+1,p_mapping)
 ON CONFLICT (enrolment_id,outcome_id) DO UPDATE
 SET state=EXCLUDED.state,revision=EXCLUDED.revision,version=EXCLUDED.version,mapping=EXCLUDED.mapping;

 IF p_submit THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'title',title) ORDER BY position),'[]'::jsonb)
  INTO snapshot_criteria FROM public.lms_qualification_criteria WHERE outcome_id=p_outcome;
  SELECT coalesce(jsonb_object_agg(f.id::text,to_jsonb(f)-'enrolment_id'),'{}'::jsonb)
  INTO snapshot_evidence FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id AND EXISTS (
   SELECT 1 FROM jsonb_each(p_mapping) m WHERE m.value ? f.id::text);
  INSERT INTO public.lms_qualification_submissions(enrolment_id,outcome_id,revision,snapshot)
  VALUES (e.id,p_outcome,next_revision,jsonb_build_object(
   'criteria',snapshot_criteria,'mapping',p_mapping,'evidence',snapshot_evidence));
 END IF;
END $$;

CREATE FUNCTION public.lms_qf_declare(p_enrolment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE public.lms_qualification_enrolments e SET declaration_at=coalesce(declaration_at,now())
 WHERE id=p_enrolment AND learner_id=public.lms_qf_actor() AND starts_on<=current_date AND completed_at IS NULL
 AND EXISTS (SELECT 1 FROM public.lms_qualification_versions WHERE id=e.version_id AND published_at IS NOT NULL);
 IF NOT FOUND THEN RAISE EXCEPTION 'Qualification access denied.' USING ERRCODE='42501'; END IF;
END $$;

CREATE FUNCTION public.lms_qf_review(p_enrolment uuid,p_outcome uuid,p_version integer,p_stage text,
 p_decision text,p_feedback text,p_criteria jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; c public.lms_qualification_claims;
 actor uuid := public.lms_qf_actor(); next_state text; snapshot_criteria jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF actor IS NULL OR NOT FOUND OR e.completed_at IS NOT NULL OR
  (CASE p_stage WHEN 'assessor' THEN e.assessor_id WHEN 'verifier' THEN e.verifier_id END) IS DISTINCT FROM actor
  THEN RAISE EXCEPTION 'Qualification review access denied.' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.lms_qualification_claims WHERE enrolment_id=e.id AND outcome_id=p_outcome;
 IF NOT FOUND OR c.version IS DISTINCT FROM p_version OR
  (p_stage='assessor' AND c.state NOT IN ('submitted','verification_returned')) OR
  (p_stage='verifier' AND c.state<>'awaiting_verification') THEN
  RAISE EXCEPTION 'This review is no longer available. Refresh the portfolio.';
 END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('accept','return') OR char_length(coalesce(p_feedback,''))>4000
  OR (p_decision='return' AND nullif(btrim(p_feedback),'') IS NULL) THEN
  RAISE EXCEPTION 'Provide a valid decision and feedback for any return.';
 END IF;
 IF p_stage='assessor' THEN
  SELECT snapshot->'criteria' INTO snapshot_criteria FROM public.lms_qualification_submissions
  WHERE enrolment_id=e.id AND outcome_id=c.outcome_id AND revision=c.revision;
  IF jsonb_typeof(p_criteria) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid criterion decisions.'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_criteria) d WHERE d.value IS NULL OR d.value NOT IN ('met','partial','not_met')
   OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot_criteria) sc WHERE sc->>'id'=d.key))
   THEN RAISE EXCEPTION 'Invalid criterion decisions.'; END IF;
  IF p_decision='accept' AND (coalesce(jsonb_array_length(snapshot_criteria),0)=0 OR EXISTS (
   SELECT 1 FROM jsonb_array_elements(snapshot_criteria) sc WHERE (p_criteria->>(sc->>'id')) IS DISTINCT FROM 'met'
  )) THEN RAISE EXCEPTION 'Mark every criterion Met before accepting.'; END IF;
  next_state := CASE p_decision WHEN 'accept' THEN 'awaiting_verification' ELSE 'changes_requested' END;
 ELSE
  next_state := CASE p_decision WHEN 'accept' THEN 'verified' ELSE 'verification_returned' END;
  p_criteria := '{}'::jsonb;
 END IF;
 INSERT INTO public.lms_qualification_reviews(enrolment_id,outcome_id,revision,reviewer_id,stage,decision,feedback,criteria)
 VALUES (e.id,c.outcome_id,c.revision,actor,p_stage,p_decision,btrim(coalesce(p_feedback,'')),p_criteria);
 UPDATE public.lms_qualification_claims SET state=next_state,version=version+1 WHERE enrolment_id=e.id AND outcome_id=c.outcome_id;
END $$;

CREATE FUNCTION public.lms_qf_finalize(p_enrolment uuid,p_certificate_reference text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.lms_qualification_enrolments; actor uuid := public.lms_qf_actor();
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR e.verifier_id IS DISTINCT FROM actor THEN
  RAISE EXCEPTION 'Qualification finalization access denied.' USING ERRCODE='42501';
 END IF;
 IF p_certificate_reference IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions WHERE id=e.version_id AND allow_certificate_recording) THEN
   RAISE EXCEPTION 'Certificate recording is not enabled for this programme version.';
  END IF;
  IF e.completed_at IS NULL OR nullif(btrim(p_certificate_reference),'') IS NULL OR char_length(p_certificate_reference)>120
   OR (e.certificate_reference IS NOT NULL AND e.certificate_reference IS DISTINCT FROM btrim(p_certificate_reference))
   THEN RAISE EXCEPTION 'A completed qualification and a valid issued certificate reference are required.'; END IF;
  UPDATE public.lms_qualification_enrolments SET certificate_reference=btrim(p_certificate_reference),
   certificate_recorded_at=coalesce(certificate_recorded_at,now()),certificate_recorded_by=coalesce(certificate_recorded_by,actor)
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
END $$;

REVOKE ALL ON FUNCTION public.lms_qf_list(),public.lms_qf_portfolio(uuid),
 public.lms_qf_add_evidence(uuid,text,text,text,text,text,text,integer,uuid),public.lms_qf_save_claim(uuid,uuid,integer,jsonb,boolean),
 public.lms_qf_declare(uuid),public.lms_qf_review(uuid,uuid,integer,text,text,text,jsonb),public.lms_qf_finalize(uuid,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_list(),public.lms_qf_portfolio(uuid),
 public.lms_qf_add_evidence(uuid,text,text,text,text,text,text,integer,uuid),public.lms_qf_save_claim(uuid,uuid,integer,jsonb,boolean),
 public.lms_qf_declare(uuid),public.lms_qf_review(uuid,uuid,integer,text,text,text,jsonb),public.lms_qf_finalize(uuid,text)
 TO authenticated;

COMMIT;
