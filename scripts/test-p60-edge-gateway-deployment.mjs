import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const edge=read('supabase/functions/technica-lesson-media/index.ts');
const sql=read('supabase/migrations/202611060001_p14_private_lesson_media.sql');
const cfg=read('supabase/config.toml');
for(const s of ['TECHNICA_MEDIA_ALLOWED_ORIGINS','TEMPORARY_LMS_ORIGIN','https://technica-lms.minamilad939.workers.dev',
 'configuredOrigins.includes(origin)','req.method===\'OPTIONS\'','auth.getUser(token)',
 'lms_p1_actor_is_admin','lms_p14_finalize_media','createSignedUploadUrl(path,{upsert:false})',
 'createSignedUrl(asset.private_object_path,READ_SECONDS)','account_status','SUPABASE_SECRET_KEYS'])assert.ok(edge.includes(s),'Gateway missing '+s);
assert.ok(!edge.includes("Access-Control-Allow-Origin':'*'"));
assert.ok(!edge.includes("Access-Control-Allow-Origin':'https://*'"));
assert.ok(cfg.includes('verify_jwt = true'));
assert.ok(sql.includes("VALUES('technica-private-lessons','technica-private-lessons',false"));
assert.ok(!edge.includes('.getPublicUrl('));
console.log('P60 gateway deployment hardening contract PASS');
