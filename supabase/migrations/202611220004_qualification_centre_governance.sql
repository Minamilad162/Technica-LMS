BEGIN;

-- Centre-admin workflow for real learner/assessor/verifier assignments.
-- Imported awarding-body source editions remain UNPUBLISHED until a human centre
-- administrator attests to the approved issue, full briefing and declaration.
CREATE TABLE public.lms_qf_centre_briefs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 unit_id uuid NOT NULL UNIQUE REFERENCES public.lms_qualification_units(id),
 assessment_instructions text NOT NULL CHECK (char_length(assessment_instructions) BETWEEN 40 AND 30000),
 assessment_methods text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
 approved_by uuid REFERENCES public.lms_profiles(id),
 approved_at timestamptz,
 updated_by uuid REFERENCES public.lms_profiles(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((status='approved')=(approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE public.lms_qf_centre_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 unit_id uuid NOT NULL REFERENCES public.lms_qualification_units(id),
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 4 AND 160),
 kind text NOT NULL CHECK(kind IN ('assignment_brief','reflective_account','witness_testimony','cpd_record','evidence_matrix','other')),
 filename text NOT NULL CHECK (char_length(filename) BETWEEN 1 AND 255),
 mime text NOT NULL CHECK (mime IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg')),
 bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 10485760),
 object_path text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
 approval_reference text NOT NULL DEFAULT '',
 approved_by uuid REFERENCES public.lms_profiles(id),
 approved_at timestamptz,
 created_by uuid NOT NULL REFERENCES public.lms_profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((status='approved')=(approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX lms_qf_centre_documents_unit ON public.lms_qf_centre_documents(unit_id,status);
CREATE TABLE public.lms_qf_admin_activity (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES public.lms_profiles(id),
 action text NOT NULL CHECK (action IN ('brief_saved','brief_approved','file_reserved','file_approved','version_published','enrolment_assigned')),
 version_id uuid REFERENCES public.lms_qualification_versions(id),
 enrolment_id uuid REFERENCES public.lms_qualification_enrolments(id),
 detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_qf_centre_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_qf_centre_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_qf_admin_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_qf_centre_briefs,public.lms_qf_centre_documents,public.lms_qf_admin_activity FROM PUBLIC,anon,authenticated;

INSERT INTO public.lms_qf_centre_briefs(unit_id,assessment_instructions,assessment_methods)
SELECT u.id,
 'TECHNICA CONSULT | CENTRE-DRAFT UNIT ASSESSMENT PLAN (NOT AN AWARDING-BODY ASSIGNMENT BRIEF)'||E'\n\n'||
 'Qualification Unit: '||u.title||' ['||u.code||']'||E'\n'||
 'Source issue: '||v.version||'. This is an editable internal assessment plan requiring centre review.'||E'\n\n'||
 'Evidence preparation: address each current Learning Outcome and Assessment Criterion using authentic, current and sufficient work-based evidence. Record evidence references and assessment decisions against the exact criteria shown in the programme.'||E'\n\n'||
 coalesce((SELECT string_agg('LO '||o.code||' — '||o.title||E'\n'||
  coalesce((SELECT string_agg('AC '||c.code||' — '||c.title,E'\n' ORDER BY c.position)
   FROM public.lms_qualification_criteria c WHERE c.outcome_id=o.id),'No criteria imported'),E'\n\n' ORDER BY o.position)
  FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id),'Outcomes not imported')||
 E'\n\nCentre reviewer: add local assessment methods, assessment conditions, learner instructions and any approved source files before marking this unit brief Approved.',
 'Methods must be selected and justified by the centre assessor (e.g., work product review, reflective account, discussion or witness testimony).'
FROM public.lms_qualification_units u
JOIN public.lms_qualification_versions v ON v.id=u.version_id
WHERE v.catalog_key LIKE 'technica-source-%'
ON CONFLICT(unit_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT (SELECT auth.uid()) IS NOT NULL
 AND coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
 AND public.lms_p1_actor_is_admin()
$fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_workspace()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE payload jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
   RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',v.id,'catalogKey',v.catalog_key,'title',v.title,'version',v.version,
  'publishedAt',v.published_at,'approvalReference',v.approval_reference,
  'allowCertificateRecording',v.allow_certificate_recording,
  'units',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.code,'title',u.title,
     'outcomes',(SELECT count(*) FROM public.lms_qualification_outcomes o WHERE o.unit_id=u.id),
     'criteria',(SELECT count(*) FROM public.lms_qualification_criteria c
       JOIN public.lms_qualification_outcomes o ON o.id=c.outcome_id WHERE o.unit_id=u.id),
     'brief',jsonb_build_object('status',coalesce(b.status,'missing'),
       'instructions',b.assessment_instructions,'methods',b.assessment_methods,
       'approvedAt',b.approved_at),
     'documents',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,
       'kind',d.kind,'status',d.status,'filename',d.filename,'createdAt',d.created_at,
       'approvedAt',d.approved_at) ORDER BY d.created_at DESC)
      FROM public.lms_qf_centre_documents d WHERE d.unit_id=u.id),'[]'::jsonb))
      ORDER BY u.position)
   FROM public.lms_qualification_units u
   LEFT JOIN public.lms_qf_centre_briefs b ON b.unit_id=u.id
   WHERE u.version_id=v.id),'[]'::jsonb),
  'enrolments',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',e.id,'learner',l.full_name,
      'assessor',a.full_name,'verifier',q.full_name,'startOn',e.starts_on,
      'targetOn',e.target_on,'completedAt',e.completed_at)
      ORDER BY e.starts_on DESC,l.full_name)
   FROM public.lms_qualification_enrolments e
   JOIN public.lms_profiles l ON l.id=e.learner_id
   LEFT JOIN public.lms_profiles a ON a.id=e.assessor_id
   LEFT JOIN public.lms_profiles q ON q.id=e.verifier_id WHERE e.version_id=v.id),'[]'::jsonb)
 ) ORDER BY v.title,v.version DESC),'[]'::jsonb)
 INTO payload FROM public.lms_qualification_versions v
 WHERE v.catalog_key LIKE 'technica-source-%';
 RETURN payload;
END
$fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_people(p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE result jsonb;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN
  RAISE EXCEPTION 'Centre administration access denied.' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'name',q.full_name,
  'email',q.email) ORDER BY q.full_name),'[]'::jsonb) INTO result
 FROM (
  SELECT p.id,p.full_name,a.email
  FROM public.lms_profiles p JOIN auth.users a ON a.id=p.id
  WHERE p.account_status='active' AND (
   char_length(btrim(coalesce(p_search,'')))<2 OR
   p.full_name ILIKE '%'||left(btrim(p_search),70)||'%' OR
   a.email ILIKE '%'||left(btrim(p_search),70)||'%')
  ORDER BY p.full_name,p.id LIMIT 40
 ) q;
 RETURN result;
END
$fn$;

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
        OR b.approved_at IS NULL OR char_length(btrim(b.assessment_methods))<20)
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

CREATE OR REPLACE FUNCTION public.lms_qf_admin_assign(
 p_version uuid,p_learner uuid,p_assessor uuid,p_verifier uuid,
 p_start date,p_target date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid:=(SELECT auth.uid()); eid uuid;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.lms_qualification_versions WHERE id=p_version AND published_at IS NOT NULL
    AND catalog_key LIKE 'technica-source-%') THEN
   RAISE EXCEPTION 'Only centre-approved published editions can accept enrolments.';
 END IF;
 IF p_learner IS NULL OR p_assessor IS NULL OR p_verifier IS NULL OR
   p_learner IN(p_assessor,p_verifier) OR p_assessor=p_verifier OR p_start IS NULL OR
   (p_target IS NOT NULL AND p_target<p_start) OR
   (SELECT count(*) FROM public.lms_profiles WHERE id IN(p_learner,p_assessor,p_verifier)
    AND account_status='active')<>3 THEN
   RAISE EXCEPTION 'Choose distinct active learner, assessor and verifier with valid dates.';
 END IF;
 SELECT e.id INTO eid FROM public.lms_qualification_enrolments e
 WHERE e.version_id=p_version AND e.learner_id=p_learner FOR UPDATE;
 IF FOUND AND EXISTS (SELECT 1 FROM public.lms_qualification_enrolments e WHERE e.id=eid
  AND (e.completed_at IS NOT NULL OR e.declaration_at IS NOT NULL OR
    EXISTS (SELECT 1 FROM public.lms_qualification_evidence f WHERE f.enrolment_id=e.id) OR
    EXISTS (SELECT 1 FROM public.lms_qualification_claims c WHERE c.enrolment_id=e.id))) THEN
    RAISE EXCEPTION 'Existing portfolio has learner activity: reassignment is blocked to preserve the audit trail.';
 END IF;
 INSERT INTO public.lms_qualification_enrolments(version_id,learner_id,assessor_id,verifier_id,starts_on,target_on)
 VALUES(p_version,p_learner,p_assessor,p_verifier,p_start,p_target)
 ON CONFLICT(version_id,learner_id) DO UPDATE SET assessor_id=excluded.assessor_id,
   verifier_id=excluded.verifier_id,starts_on=excluded.starts_on,target_on=excluded.target_on
 RETURNING id INTO eid;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,enrolment_id,
  detail) VALUES(actor,'enrolment_assigned',p_version,eid,
   jsonb_build_object('learner',p_learner,'assessor',p_assessor,'verifier',p_verifier));
 RETURN eid;
END
$fn$;

-- The approved text brief is available only to active registered participants.
CREATE OR REPLACE FUNCTION public.lms_qf_programme_briefs(p_enrolment uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid:=public.lms_qf_actor(); e public.lms_qualification_enrolments; data jsonb;
BEGIN
 SELECT * INTO e FROM public.lms_qualification_enrolments WHERE id=p_enrolment;
 IF NOT FOUND OR actor IS NULL OR actor NOT IN(e.learner_id,e.assessor_id,e.verifier_id)
  OR NOT EXISTS(SELECT 1 FROM public.lms_qualification_versions v WHERE v.id=e.version_id
   AND v.published_at IS NOT NULL) THEN RAISE EXCEPTION 'Portfolio brief access denied.' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'unitId',u.id,'instructions',b.assessment_instructions,'methods',b.assessment_methods,
  'approvedAt',b.approved_at,
  'files',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'kind',d.kind,
    'filename',d.filename,'path',d.object_path) ORDER BY d.title)
    FROM public.lms_qf_centre_documents d
    WHERE d.unit_id=u.id AND d.status='approved'),'[]'::jsonb))
  ORDER BY u.position),'[]'::jsonb) INTO data
 FROM public.lms_qualification_units u
 JOIN public.lms_qf_centre_briefs b ON b.unit_id=u.id AND b.status='approved'
 WHERE u.version_id=e.version_id;
 RETURN data;
END
$fn$;

-- Centre templates use a separate private bucket, not the learner evidence bucket.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('technica-qualification-materials','technica-qualification-materials',false,10485760,
ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg'])
ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lms_qf_material_access(p_path text,p_upload boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS (
   SELECT 1 FROM public.lms_qf_centre_documents d
   JOIN public.lms_qualification_units u ON u.id=d.unit_id
   JOIN public.lms_qualification_versions v ON v.id=u.version_id
   WHERE d.object_path=p_path AND (
     (public.lms_qf_admin_access() AND (NOT p_upload OR
      (d.created_by=(SELECT auth.uid()) AND d.created_at>now()-interval '1 hour' AND d.status='pending')))
     OR (NOT p_upload AND d.status='approved' AND v.published_at IS NOT NULL
       AND EXISTS(SELECT 1 FROM public.lms_qualification_enrolments e
        WHERE e.version_id=v.id AND
         (SELECT auth.uid()) IN(e.learner_id,e.assessor_id,e.verifier_id)))
   )
 )
$fn$;
REVOKE ALL ON FUNCTION public.lms_qf_material_access(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_material_access(text,boolean) TO authenticated;

CREATE POLICY lms_qf_centre_files_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='technica-qualification-materials' AND public.lms_qf_material_access(name,false));
CREATE POLICY lms_qf_centre_files_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='technica-qualification-materials' AND public.lms_qf_material_access(name,true));
CREATE POLICY lms_qf_centre_files_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'technica-qualification-materials' OR public.lms_qf_material_access(name,false));
CREATE POLICY lms_qf_centre_files_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'technica-qualification-materials' OR public.lms_qf_material_access(name,true));
CREATE POLICY lms_qf_centre_files_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'technica-qualification-materials')
 WITH CHECK(bucket_id<>'technica-qualification-materials');
CREATE POLICY lms_qf_centre_files_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id<>'technica-qualification-materials');
CREATE POLICY lms_qf_centre_files_anon_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon
 USING(bucket_id<>'technica-qualification-materials')
 WITH CHECK(bucket_id<>'technica-qualification-materials');

CREATE OR REPLACE FUNCTION public.lms_qf_admin_reserve_document(
 p_unit uuid,p_kind text,p_title text,p_filename text,p_mime text,p_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v public.lms_qualification_versions; doc uuid:=gen_random_uuid(); path text;
BEGIN
 IF NOT public.lms_qf_admin_access() THEN RAISE EXCEPTION 'Admin permission required.' USING ERRCODE='42501'; END IF;
 SELECT v.* INTO v FROM public.lms_qualification_versions v
 JOIN public.lms_qualification_units u ON u.version_id=v.id WHERE u.id=p_unit FOR UPDATE OF v;
 IF NOT FOUND OR v.catalog_key NOT LIKE 'technica-source-%' THEN RAISE EXCEPTION 'Unknown qualification unit.'; END IF;
 IF p_kind NOT IN ('assignment_brief','reflective_account','witness_testimony','cpd_record','evidence_matrix','other')
    OR char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 4 AND 160
    OR char_length(btrim(coalesce(p_filename,''))) NOT BETWEEN 1 AND 255
    OR p_filename ~ '[[:cntrl:]/\\]'
    OR p_mime NOT IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg')
    OR p_bytes NOT BETWEEN 1 AND 10485760 THEN
  RAISE EXCEPTION 'Provide a valid filename, document category and file up to 10 MB.';
 END IF;
 path:=p_unit::text||'/'||doc::text;
 INSERT INTO public.lms_qf_centre_documents(id,unit_id,title,kind,filename,mime,bytes,object_path,created_by)
 VALUES(doc,p_unit,btrim(p_title),p_kind,p_filename,p_mime,p_bytes,path,(SELECT auth.uid()));
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,detail)
 VALUES((SELECT auth.uid()),'file_reserved',v.id,jsonb_build_object('unit',p_unit,'document',doc,'kind',p_kind));
 RETURN jsonb_build_object('id',doc,'path',path);
END
$fn$;

CREATE OR REPLACE FUNCTION public.lms_qf_admin_approve_document(p_document uuid,p_attest boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE d public.lms_qf_centre_documents; v public.lms_qualification_versions;
BEGIN
 IF NOT public.lms_qf_admin_access() OR p_attest IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Centre approval confirmation required.' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.lms_qf_centre_documents WHERE id=p_document FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found.'; END IF;
 SELECT v.* INTO v FROM public.lms_qualification_versions v
 JOIN public.lms_qualification_units u ON u.version_id=v.id WHERE u.id=d.unit_id;
 IF d.status='approved' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='technica-qualification-materials'
  AND o.name=d.object_path AND o.metadata->>'size'=d.bytes::text
  AND o.metadata->>'mimetype'=d.mime) THEN
  RAISE EXCEPTION 'The uploaded resource is not available or its metadata does not match.';
 END IF;
 UPDATE public.lms_qf_centre_documents SET status='approved',
  approved_by=(SELECT auth.uid()),approved_at=now() WHERE id=p_document;
 INSERT INTO public.lms_qf_admin_activity(actor_id,action,version_id,detail)
 VALUES((SELECT auth.uid()),'file_approved',v.id,jsonb_build_object('unit',d.unit_id,'document',d.id,'kind',d.kind));
END
$fn$;

REVOKE ALL ON FUNCTION public.lms_qf_admin_access(),public.lms_qf_admin_workspace(),
 public.lms_qf_admin_people(text),public.lms_qf_admin_save_brief(uuid,text,text,boolean),
 public.lms_qf_admin_publish(uuid,text,text,boolean),
 public.lms_qf_admin_assign(uuid,uuid,uuid,uuid,date,date),
 public.lms_qf_programme_briefs(uuid),
 public.lms_qf_admin_reserve_document(uuid,text,text,text,text,integer),
 public.lms_qf_admin_approve_document(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lms_qf_admin_access(),public.lms_qf_admin_workspace(),
 public.lms_qf_admin_people(text),public.lms_qf_admin_save_brief(uuid,text,text,boolean),
 public.lms_qf_admin_publish(uuid,text,text,boolean),
 public.lms_qf_admin_assign(uuid,uuid,uuid,uuid,date,date),
 public.lms_qf_programme_briefs(uuid),
 public.lms_qf_admin_reserve_document(uuid,text,text,text,text,integer),
 public.lms_qf_admin_approve_document(uuid,boolean) TO authenticated;

COMMIT;
