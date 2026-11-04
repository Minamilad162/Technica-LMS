-- Technica LMS P9D.1: PRIVATE EXISTING ASP BANK FINGERPRINT EXPORT.
-- SELECT ONLY. Confirm the Technica Supabase project before running.
-- Export SQL Editor Results > CSV and KEEP IT PRIVATE. Do not commit/export to
-- public GitHub or paste raw source IDs in chat; share AGGREGATE dry-run report.
-- No question text, choices, answer keys, explanations or user identities out.
-- Read-only metadata may include private source IDs/hashes. Local-use only.
-- PostgreSQL 15+/Supabase: built-in sha256(bytea), no pgcrypto extension.
-- The Python offline comparer normalizes plain-English text as:
-- lower + trim + collapsed whitespace. Unicode locale differences are possible;
-- mismatched fingerprints must be manually reviewed, not overwritten.
WITH asp AS (
 SELECT id FROM public.lms_courses WHERE slug='asp'
)
SELECT
 'P9D1_V1'::text AS snapshot_version,
 'asp'::text AS course_slug,
 q.source_id::text AS source_id,
 encode(sha256(convert_to(
  lower(regexp_replace(btrim(q.prompt),'[[:space:]]+',' ','g')),
  'UTF8')),'hex') AS prompt_sha256,
 encode(sha256(convert_to(
  array_to_string(ARRAY(
   SELECT lower(regexp_replace(btrim(opts.option_text),
       '[[:space:]]+',' ','g'))
   FROM jsonb_array_elements_text(q.options)
     WITH ORDINALITY AS opts(option_text,position)
   ORDER BY opts.position
  ),chr(31))||chr(31)||q.correct_index::text,
  'UTF8')),'hex') AS choices_key_sha256,
 encode(sha256(convert_to(
  lower(regexp_replace(btrim(q.explanation),'[[:space:]]+',' ','g')),
  'UTF8')),'hex') AS explanation_sha256,
 q.approval_state::text AS approval_state,
 q.mock_exclusive::boolean AS mock_exclusive,
 EXISTS (
  SELECT 1 FROM public.lms_practice_attempt_items ai
  WHERE ai.question_id=q.id
 ) AS ever_attempted
FROM public.lms_questions q
JOIN asp c ON c.id=q.course_id
ORDER BY q.source_id;
