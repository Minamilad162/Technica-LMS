import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_BUCKET,validatePageFiles,checkPageHeaders,
 uploadProtectedPdfPages,authorizePdfPage} from '../src/production/protectedPdfPagesApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const L='40000000-0000-0000-0000-000000000001',P='50000000-0000-0000-0000-000000000001';
const B='70000000-0000-0000-0000-000000000001';
const page=n=>new File([new Uint8Array([255,216,255,n])],
 String(n).padStart(4,'0')+'.jpg',{type:'image/jpeg'});
const pages=[page(2),page(1)];
assert.deepEqual(validatePageFiles(pages).map(f=>f.name),['0001.jpg','0002.jpg']);
await checkPageHeaders(validatePageFiles(pages));
for(const bad of [
 [new File(['foo'],'0001.pdf',{type:'application/pdf'})],
 [new File(['foo'],'0002.jpg',{type:'image/jpeg'})],
 [new File(['foo'],'0001.jpg',{type:'image/jpeg'})],
 [page(1),page(1)],
])assert.throws(()=>validatePageFiles(bad));
await assert.rejects(()=>checkPageHeaders([new File(['fake'],'0001.jpg',{type:'image/jpeg'})]),/Invalid JPG/);
const calls=[];let denied='';
const db={
 functions:{invoke:async(name,{body})=>{
  assert.equal(name,'technica-lesson-media');calls.push(body);
  if(denied===body.action)return {data:null,error:{message:'denied'}};
  if(body.action==='init-pdf-pages')return {data:{packageId:P,pageCount:2},error:null};
  if(body.action==='sign-pdf-page-upload')return {data:{
   bucket:PAGE_BUCKET,path:L+'/'+P+'/'+String(body.pageIndex).padStart(4,'0')+'.jpg',
   token:'private-token'},error:null};
  if(body.action==='finish-pdf-pages')return {data:{kind:'pdf',blockId:B,pageCount:2},error:null};
  if(body.action==='view-pdf-page')return {data:{url:'https://example.test/private/sign',pageIndex:body.pageIndex,pageCount:2,expiresIn:45},error:null};
  return {data:null,error:{message:'unexpected'}};
 }},
 storage:{from:bucket=>{
  assert.equal(bucket,PAGE_BUCKET);
  return {uploadToSignedUrl:async(path,token,file,opts)=>{
   assert.equal(token,'private-token');assert(path.endsWith('/'+file.name));
   assert.equal(opts.upsert,false);assert.equal(opts.contentType,'image/jpeg');
   return {error:null};
  }};
 }}
};
const receipt=await uploadProtectedPdfPages(db,L,pages,'Protected safety policy');
assert.equal(receipt.blockId,B);
assert.deepEqual(calls.map(c=>c.action),[
 'init-pdf-pages','sign-pdf-page-upload','sign-pdf-page-upload','finish-pdf-pages'
]);
const view=await authorizePdfPage(db,L,B,2);
assert.equal(view.expiresIn,45);
denied='view-pdf-page';
await assert.rejects(()=>authorizePdfPage(db,L,B,1),/denied/);
denied='init-pdf-pages';
await assert.rejects(()=>uploadProtectedPdfPages(db,L,pages,'Protected safety policy'),/denied/);
const edge=read('supabase/functions/technica-lesson-media/index.ts');
const sql=read('supabase/migrations/202611060002_p141_protected_pdf_pages.sql');
const viewer=read('src/production/ProtectedPdfPages.jsx');
const frame=read('src/production/SecureLessonMedia.jsx');
const api=read('src/production/lessonMediaApi.js');
const admin=read('src/production/AdminToolsPanels.jsx');
for(const x of ['init-pdf-pages','sign-pdf-page-upload','finish-pdf-pages','view-pdf-page',
 'lms_p1_can_view_lesson','lms_p141_finalize_pdf_pages','createSignedUrl(path,45)',
 "p.course_id!==await lessonCourse(body.lessonId)"])
 assert(edge.includes(x),'missing Edge security: '+x);
for(const x of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL ON public.lms_p141_pdf_packages',
 'REVOKE ALL ON FUNCTION public.lms_p141_finalize_pdf_pages',
 'GRANT EXECUTE ON FUNCTION public.lms_p141_finalize_pdf_pages(uuid) TO service_role',
 "public IS TRUE",'FOR UPDATE','v_size::bigint<>v_expected',
 'missing or extra page objects'])
 assert(sql.includes(x),'missing SQL security: '+x);
assert(!edge.includes('verify_jwt = false'));
assert(!sql.includes('GRANT SELECT ON public.lms_p141_pdf_packages TO authenticated'));
assert(viewer.includes('<img src={url}')&&!viewer.includes('<iframe'));
assert(frame.includes('protectedPdf?<ProtectedPdfPages'));
assert(api.includes('protectedPages:true,pageCount'));
assert(admin.includes('+ Secure PDF')&&admin.includes('ProtectedPdfUploadModal'));
assert(read('scripts/prepare-protected-pdf.py').includes('pdftoppm'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('P14.1'));
console.log('PASS P14.1: private raster PDF package, per-page JWT ACL and signed URLs, no raw PDF rendering for protected packages, legacy preserved.');
