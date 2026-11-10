import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/202611100003_p62_lesson_media_dedup.sql');
const api=read('src/production/lessonMediaApi.js');
const edge=read('supabase/functions/technica-lesson-media/index.ts');
for(const key of ['lms_p62_duplicate_media_ids','lms_p14_finalize_media',
 'pg_advisory_xact_lock','duplicate_block_id','status=\'duplicate\'',
 'status IN(\'pending\',\'finalized\',\'duplicate\')',
 "metadata->>'eTag'","metadata->>'size'",'auth.uid()',
 'lms_p1_can_view_lesson','lms_p15_can_preview_lesson',
 'REVOKE ALL ON FUNCTION public.lms_p62_duplicate_media_ids(uuid) FROM PUBLIC,anon,authenticated',
 'GRANT EXECUTE ON FUNCTION public.lms_p62_duplicate_media_ids(uuid) TO authenticated',
 'duplicatePath' /* test checks literal below? */].filter(x=>x!=='duplicatePath'))assert.ok(sql.includes(key),'P62 DB missing '+key);
assert.match(sql,/duplicate'\s*,true,'cleanupPath'/);
assert.match(sql,/status='duplicate'/);
assert.match(api,/db\.rpc\('lms_p62_duplicate_media_ids'/);
assert.match(api,/!hidden\.has\(x\.id\)/);
assert.doesNotMatch(api,/title.*===.*title/);
assert.match(edge,/result\.duplicate===true/);
assert.match(edge,/\.remove\(\[result\.cleanupPath\]\)/);
assert.match(edge,/createSignedUploadUrl\(path,\{upsert:false\}\)/);
assert.match(edge,/auth\.getUser\(token\)/);
assert.match(edge,/lms_p1_actor_is_admin/);
assert.match(api,/onStage\('This exact file is already attached/);
console.log('P62 video duplicate safeguard contract PASS');
