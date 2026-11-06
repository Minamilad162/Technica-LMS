import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LESSON_BUCKET,P14_FUNCTION,validateLessonUpload,verifyFileHeader,
 uploadLessonMedia,authorizeLessonMedia,loadLessonContent,
 LessonMediaUploadError,formatLessonMediaUploadError} from '../src/production/lessonMediaApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const courseId='10000000-0000-0000-0000-000000000001';
const lessonId='40000000-0000-0000-0000-000000000001';
const intentId='60000000-0000-0000-0000-000000000001';
const blockId='70000000-0000-0000-0000-000000000001';
const assetId='80000000-0000-0000-0000-000000000001';
const pdf=new File(['%PDF-1.4\ncontent'],'lesson.pdf',{type:'application/pdf'});
const mp4=new File([new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0])],
 'lesson.mp4',{type:'video/mp4'});
const webm=new File([new Uint8Array([0x1a,0x45,0xdf,0xa3,0,0,0,0])],
 'lesson.webm',{type:'video/webm'});
assert.equal(LESSON_BUCKET,'technica-private-lessons');
assert.equal(P14_FUNCTION,'technica-lesson-media');
assert.equal(validateLessonUpload(pdf,'pdf').size,pdf.size);
assert.equal(validateLessonUpload(mp4,'video').mime,'video/mp4');
assert.equal(validateLessonUpload(webm,'video').mime,'video/webm');
await verifyFileHeader(pdf,'pdf');await verifyFileHeader(mp4,'video');await verifyFileHeader(webm,'video');
for(const [file,kind] of [
 [new File(['x'],'file.exe',{type:'application/pdf'}),'pdf'],
 [new File(['x'],'file.pdf',{type:'text/html'}),'pdf'],
 [new File(['x'],'file.svg',{type:'image/svg+xml'}),'pdf'],
 [new File(['x'],'file.mp4',{type:'video/mp4'}),'pdf'],
 [new File(['x'],'../lesson.pdf',{type:'application/pdf'}),'pdf'],
 [new File(['x'],'bad.mp4',{type:'video/quicktime'}),'video']
])assert.throws(()=>validateLessonUpload(file,kind));
await assert.rejects(()=>verifyFileHeader(new File(['fake'],'fake.pdf',{type:'application/pdf'}),'pdf'),/not a valid PDF/);
await assert.rejects(()=>verifyFileHeader(new File(['fake'],'fake.mp4',{type:'video/mp4'}),'video'),/MP4 header/);
let calls=[],errorOn=null;
const db={
 functions:{invoke:async(name,{body})=>{
  calls.push({name,body});if(errorOn===body.action)return {data:null,error:{message:'denied'}};
  if(body.action==='init-upload')return {data:{intentId,kind:body.kind,bucket:LESSON_BUCKET,
   path:courseId+'/'+lessonId+'/'+intentId+'.pdf',token:'private-signed-token'},error:null};
  if(body.action==='finish-upload')return {data:{blockId,kind:'pdf',title:'lesson.pdf'},error:null};
  if(body.action==='view')return {data:{kind:'pdf',mime:'application/pdf',
   expiresIn:120,url:'https://example.supabase.co/storage/v1/object/sign/whatever?token=short'},error:null};
  return {data:null,error:{message:'unknown'}};
 }},
 storage:{from:b=>{
  assert.equal(b,LESSON_BUCKET);
  return {uploadToSignedUrl:async(path,token,file,{contentType,upsert})=>{
   calls.push({method:'signed-upload',path,contentType,upsert});
   assert.equal(token,'private-signed-token');assert.equal(file,pdf);
   return {error:null};
  }};
 }},
 from:table=>{
  assert.equal(table,'lms_lesson_blocks');
  return {select(){return this;},eq(){return this;},
   order:async()=>({data:[{id:blockId,lesson_id:lessonId,block_type:'pdf',
    payload:{title:'lesson.pdf',assetId,private_object_path:'SECRET-DO-NOT-LEAK'},position:0},
    {id:'90000000-0000-0000-0000-000000000001',lesson_id:lessonId,
     block_type:'text',payload:{body:'Existing text'},position:1}],error:null})};
 }
};
const stages=[];
const receipt=await uploadLessonMedia(db,lessonId,pdf,'pdf',x=>stages.push(x));
assert.equal(receipt.blockId,blockId);assert.equal(stages.length,3);
assert.deepEqual(calls.filter(x=>x.name).map(x=>x.body.action),['init-upload','finish-upload']);
assert.equal(calls.find(x=>x.method==='signed-upload').upsert,false);
assert(!calls.some(x=>x.method==='public-url'));
const blocks=await loadLessonContent(db,lessonId);
assert.equal(blocks.length,2);
assert.equal(blocks[0].payload.title,'lesson.pdf');
assert.equal('assetId' in blocks[0].payload,false,'Private asset IDs stripped from learner data adapter');
assert.equal('private_object_path' in blocks[0].payload,false);
const signed=await authorizeLessonMedia(db,lessonId,blocks[0]);
assert.equal(signed.expiresIn,120);
assert.equal(calls.at(-1).body.blockId,blockId);
assert.equal(calls.at(-1).body.lessonId,lessonId);
errorOn='view';
await assert.rejects(()=>authorizeLessonMedia(db,lessonId,blocks[0]),/access denied/);
errorOn='init-upload';
await assert.rejects(()=>uploadLessonMedia(db,lessonId,pdf,'pdf'),/access denied/);


const checkUploadError=async(error,expectedCode)=>{
 const mock={functions:{invoke:async()=>({data:null,error})}};
 await assert.rejects(()=>uploadLessonMedia(mock,lessonId,mp4,'video'),
  e=>e instanceof LessonMediaUploadError&&e.code===expectedCode&&
  e.stage==='Authorizing Admin upload');
};
for(const [status,code] of [[401,'P14_EDGE_401'],[403,'P14_EDGE_403'],
 [404,'P14_EDGE_404'],[413,'P14_EDGE_413'],[500,'P14_EDGE_5XX'],
 [400,'P14_EDGE_400']])
 await checkUploadError({context:{status},message:'private token SHOULD_NOT_SHOW'},code);
await checkUploadError({name:'FunctionsFetchError',message:'network failed'},'P14_EDGE_NETWORK');
for(const [statusCode,code] of [['413','P14_STORAGE_413'],['403','P14_STORAGE_DENIED'],
 ['404','P14_STORAGE_MISSING'],['400','P14_STORAGE_400']]){
 const storageMock={functions:{invoke:async(_name,{body})=>({data:{
   kind:'video',intentId,bucket:LESSON_BUCKET,
   path:courseId+'/'+lessonId+'/'+intentId+'.mp4',token:'secret',
 },error:null})},
 storage:{from:()=>({uploadToSignedUrl:async()=>({error:{
  statusCode,message:'token=DO_NOT_EXPOSE'}})})}};
 await assert.rejects(()=>uploadLessonMedia(storageMock,lessonId,mp4,'video'),
  e=>e instanceof LessonMediaUploadError&&e.code===code&&
  !formatLessonMediaUploadError(e).includes('DO_NOT_EXPOSE'));
}
assert(!formatLessonMediaUploadError(new Error('signedUrl=https://private?token=SECRET')).includes('SECRET'));
assert(formatLessonMediaUploadError(new LessonMediaUploadError('P14_EDGE_404','Authorizing Admin upload',
 'Secure endpoint not found',404)).includes('P14_EDGE_404'));

const edge=read('supabase/functions/technica-lesson-media/index.ts');
const sql=read('supabase/migrations/202611060001_p14_private_lesson_media.sql');
const cfg=read('supabase/config.toml');
for(const marker of [
 'createSignedUploadUrl(path,{upsert:false})',
 'lms_p14_finalize_media',
 'lms_p1_can_view_lesson',
 'lms_p1_actor_is_admin',
 'auth.getUser(token)',
 "eq('id',body.blockId).eq('lesson_id',body.lessonId)",
 'createSignedUrl(asset.private_object_path,READ_SECONDS)',
 'TECHNICA_MEDIA_ALLOWED_ORIGINS',
 'configuredOrigins.includes(origin)',
 "status:'pending'"
])assert(edge.includes(marker),'P14 security marker missing: '+marker);
assert(sql.includes('CREATE TABLE public.lms_p14_media_upload_intents'));
assert(sql.includes('CREATE FUNCTION public.lms_p14_finalize_media(p_intent_id uuid)'));
assert(sql.includes("GRANT EXECUTE ON FUNCTION public.lms_p14_finalize_media(uuid) TO service_role"));
assert(sql.includes("REVOKE ALL ON public.lms_p14_media_upload_intents FROM PUBLIC,anon,authenticated"));
assert(sql.includes("storage.buckets(id,name,public,file_size_limit,allowed_mime_types)"));
assert(sql.includes('FOR UPDATE'));
assert(sql.includes('v_size_text::bigint<>i.expected_bytes'));
assert(sql.includes("v_mime<>i.expected_mime"));
assert(!edge.includes('.getPublicUrl('));
assert(!edge.includes('verify_jwt = false'));
assert(!sql.includes('GRANT SELECT ON public.lms_media_assets TO authenticated'));
assert(cfg.includes('verify_jwt = true'));
const admin=read('src/production/AdminToolsPanels.jsx');
const learner=read('src/production/LiveLearning.jsx');
const portal=read('src/production/SupabaseApp.jsx');
const view=read('src/production/SecureLessonMedia.jsx');
assert(view.includes('formatLessonMediaUploadError(err)'));
assert(!view.includes('Secure upload could not be completed. Verify the file'));
assert(view.includes('Last upload step:'));

assert(admin.includes('+ PDF')&&admin.includes('+ Video')&&admin.includes('LessonMediaUploadModal'));
assert(admin.includes('SecureLessonContent'));
assert(learner.includes('<SecureLessonContent'));
assert(portal.includes('<SecureLessonContent'));
for(const marker of ['controlsList="nodownload noplaybackrate noremoteplayback"',
 'disablePictureInPicture','visibilitychange','Watermark','onContextMenu','onCopy','onDragStart'])
 assert(view.includes(marker),'Protected viewer missing '+marker);
assert(read('.github/workflows/ci-security.yml').includes('npm run test:p14'));
assert(read('.github/workflows/ci-security.yml').includes('bash scripts/test-p14-postgres-smoke.sh'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 69. P14 — Secure PDF/Video Lesson delivery'));
assert(read('docs/current/LOGIC_REGISTRY.md').includes('LMS-039'));
console.log('PASS P14: protected Admin PDF/video upload, short-lived ACL-bound playback, private bucket, watermark deterrence, no asset-path leakage or public URLs.');
