// P14 authenticated-only lesson-media gateway.
// Server secrets are available ONLY in Supabase Edge, never the Vite bundle.
// deploy with verify_jwt=true; set TECHNICA_MEDIA_ALLOWED_ORIGINS explicitly.
// Signed *READ* URLs are 120-second bearer capabilities and are NOT DRM.
import {createClient} from 'npm:@supabase/supabase-js@2';

const BUCKET='technica-private-lessons';
const PAGE_BUCKET='technica-private-lesson-pages';
const PAGE_MAX=80;
const PAGE_BYTES=2097152;
const READ_SECONDS=120;
const PDF_LIMIT=20*1024*1024;
const VIDEO_LIMIT=50*1024*1024;
const accepted={
 pdf:{'application/pdf':['pdf']},
 video:{'video/mp4':['mp4'],'video/webm':['webm']}
};
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const configuredOrigins=(Deno.env.get('TECHNICA_MEDIA_ALLOWED_ORIGINS')||'')
 .split(',').map(x=>x.trim()).filter(x=>/^https:\/\/[^/]+$/.test(x)||/^http:\/\/localhost:\d+$/.test(x));
const supabaseUrl=Deno.env.get('SUPABASE_URL')||'';
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';
const serverKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';
const admin=serverKey&&supabaseUrl?createClient(supabaseUrl,serverKey,
 {auth:{persistSession:false,autoRefreshToken:false}}):null;
const headers=(origin)=>({
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
});
const response=(status,obj,origin)=>new Response(JSON.stringify(obj),{
 status,headers:{...headers(origin),'Content-Type':'application/json; charset=utf-8'}
});
const failure=(status,message,origin)=>response(status,{error:message},origin);
const okUuid=x=>typeof x==='string'&&uuid.test(x);
const allowedMime=(kind,mime,filename,size)=>{
 if(!(kind in accepted)||typeof mime!=='string'||typeof filename!=='string'
 ||!Number.isSafeInteger(size)||size<1)return false;
 const ext=filename.split('.').at(-1)?.toLowerCase();
 return filename.length<=160&&!/[\\/\x00-\x1f]/.test(filename)
  &&Boolean(accepted[kind][mime]?.includes(ext))
  &&size<=(kind==='pdf'?PDF_LIMIT:VIDEO_LIMIT);
};
async function lessonCourse(lessonId){
 const {data:lesson,error}=await admin.from('lms_lessons')
  .select('id,topic_id').eq('id',lessonId).maybeSingle();
 if(error||!lesson)return null;
 const {data:topic}=await admin.from('lms_topics')
  .select('id,domain_id').eq('id',lesson.topic_id).maybeSingle();
 if(!topic)return null;
 const {data:domain}=await admin.from('lms_domains')
  .select('id,course_id').eq('id',topic.domain_id).maybeSingle();
 return domain?.course_id||null;
}
async function isAdmin(db){
 const {data,error}=await db.rpc('lms_p1_actor_is_admin');
 return !error&&data===true;
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 if(!configuredOrigins.includes(origin))return failure(403,'Origin not authorized','null');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return failure(405,'Method not allowed',origin);
 if(!admin||!publicKey||!configuredOrigins.length)return failure(503,'Private media gateway not configured',origin);
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(bearer))
  return failure(401,'Sign in required',origin);
 const token=bearer.slice(7);
 const db=createClient(supabaseUrl,publicKey,{global:{headers:{Authorization:bearer}},
  auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await db.auth.getUser(token);
 const user=identity?.user;
 if(authError||!user?.id)return failure(401,'Invalid or expired session',origin);
 const {data:profile,error:profileError}=await admin.from('lms_profiles')
  .select('account_status').eq('id',user.id).maybeSingle();
 if(profileError||profile?.account_status!=='active')return failure(403,'Account inactive',origin);
 let body;
 try{body=await req.json();}catch{return failure(400,'Invalid request',origin);}
 if(!body||typeof body!=='object'||Array.isArray(body))return failure(400,'Invalid request',origin);
 const action=body.action;
 if(action==='init-upload'){
  if(!await isAdmin(db))return failure(403,'Admin required',origin);
  const {lessonId,kind,mime,size,fileName}=body;
  if(!okUuid(lessonId)||!allowedMime(kind,mime,fileName,size))
   return failure(400,'Supported files: PDF up to 20 MB, MP4/WebM up to 50 MB',origin);
  const courseId=await lessonCourse(lessonId);
  if(!courseId)return failure(404,'Lesson not found',origin);
  const id=crypto.randomUUID();
  const path=courseId+'/'+lessonId+'/'+id+'.'+fileName.split('.').at(-1).toLowerCase();
  const title=fileName.replace(/[<>]/g,'').slice(0,160);
  const {error:insertError}=await admin.from('lms_p14_media_upload_intents').insert({
   id,created_by:user.id,course_id:courseId,lesson_id:lessonId,
   kind,expected_mime:mime,expected_bytes:size,object_path:path,display_name:title,
   status:'pending'
  });
  if(insertError)return failure(503,'Private upload authorization unavailable',origin);
  const {data:signed,error:signError}=await admin.storage.from(BUCKET)
   .createSignedUploadUrl(path,{upsert:false});
  if(signError||!signed?.token)return failure(503,'Private upload token unavailable',origin);
  return response(200,{intentId:id,bucket:BUCKET,path,token:signed.token,kind},origin);
 }
 if(action==='finish-upload'){
  if(!await isAdmin(db))return failure(403,'Admin required',origin);
  if(!okUuid(body.intentId))return failure(400,'Invalid upload receipt',origin);
  const {data:intent,error:intentError}=await admin.from('lms_p14_media_upload_intents')
    .select('id,created_by,lesson_id,status,expires_at')
    .eq('id',body.intentId).maybeSingle();
  if(intentError||!intent||intent.created_by!==user.id||intent.status!=='pending'
   ||Date.parse(intent.expires_at)<=Date.now())
   return failure(403,'Upload intent not active for this Admin',origin);
  if(!await lessonCourse(intent.lesson_id))return failure(404,'Lesson unavailable',origin);
  const {data:result,error:finalError}=await admin.rpc('lms_p14_finalize_media',{
   p_intent_id:intent.id
  });
  if(finalError||!result?.blockId)return failure(400,'Storage file was not verified or finalized',origin);
  return response(200,{blockId:result.blockId,kind:result.kind,title:result.title},origin);
 }

 // P14.1: a PDF may be published as separately signed JPEG pages. No raw PDF
 // exists in this bucket; filenames/paths are never sent to learners.
 if(action==='init-pdf-pages'){
  if(!await isAdmin(db))return failure(403,'Admin required',origin);
  const {lessonId,title,pageSizes}=body;
  if(!okUuid(lessonId)||typeof title!=='string'||title.trim().length<1
   ||title.length>160||/[\\/\x00-\x1f]/.test(title)
   ||!Array.isArray(pageSizes)||pageSizes.length<1||pageSizes.length>PAGE_MAX
   ||pageSizes.some(n=>!Number.isSafeInteger(n)||n<1||n>PAGE_BYTES)
   ||pageSizes.reduce((a,n)=>a+n,0)>50*1024*1024)
   return failure(400,'Invalid PDF page package',origin);
  const courseId=await lessonCourse(lessonId);
  if(!courseId)return failure(404,'Lesson unavailable',origin);
  const packageId=crypto.randomUUID();
  const prefix=courseId+'/'+lessonId+'/'+packageId;
  const {error:e}=await admin.from('lms_p141_pdf_packages').insert({
   id:packageId,created_by:user.id,course_id:courseId,lesson_id:lessonId,
   title:title.trim(),page_count:pageSizes.length,expected_page_sizes:pageSizes,
   object_prefix:prefix,status:'pending'
  });
  if(e)return failure(503,'Page package authorization unavailable',origin);
  return response(200,{packageId,pageCount:pageSizes.length},origin);
 }
 if(action==='sign-pdf-page-upload'){
  if(!await isAdmin(db))return failure(403,'Admin required',origin);
  if(!okUuid(body.packageId)||!Number.isInteger(body.pageIndex))
   return failure(400,'Invalid page upload request',origin);
  const {data:p,error:e}=await admin.from('lms_p141_pdf_packages')
   .select('created_by,status,expires_at,object_prefix,page_count,lesson_id')
   .eq('id',body.packageId).maybeSingle();
  if(e||!p||p.created_by!==user.id||p.status!=='pending'
   ||Date.parse(p.expires_at)<=Date.now()
   ||body.pageIndex<1||body.pageIndex>p.page_count
   ||!await lessonCourse(p.lesson_id))
   return failure(403,'Page package unavailable',origin);
  const path=p.object_prefix+'/'+String(body.pageIndex).padStart(4,'0')+'.jpg';
  const {data:signed,error:signError}=await admin.storage.from(PAGE_BUCKET)
   .createSignedUploadUrl(path,{upsert:false});
  if(signError||!signed?.token)return failure(503,'Private page upload unavailable',origin);
  return response(200,{bucket:PAGE_BUCKET,path,token:signed.token},origin);
 }
 if(action==='finish-pdf-pages'){
  if(!await isAdmin(db)||!okUuid(body.packageId))
   return failure(403,'Admin authorization required',origin);
  const {data:p,error:e}=await admin.from('lms_p141_pdf_packages')
   .select('created_by,status,expires_at,lesson_id')
   .eq('id',body.packageId).maybeSingle();
  if(e||!p||p.created_by!==user.id||p.status!=='pending'
    ||Date.parse(p.expires_at)<=Date.now()
    ||!await lessonCourse(p.lesson_id))
   return failure(403,'Page package not active',origin);
  const {data:result,error:finalError}=await admin.rpc('lms_p141_finalize_pdf_pages',{
   p_package_id:body.packageId
  });
  if(finalError||!result?.blockId)return failure(400,'Uploaded pages not verified',origin);
  return response(200,result,origin);
 }
 if(action==='view-pdf-page'){
  if(!okUuid(body.lessonId)||!okUuid(body.blockId)
    ||!Number.isInteger(body.pageIndex)||body.pageIndex<1)
   return failure(400,'Invalid page request',origin);
  const {data:allowed,error:grantError}=await db.rpc('lms_p1_can_view_lesson',{
   p_lesson_id:body.lessonId
  });
  if(grantError||allowed!==true)return failure(403,'Lesson access denied',origin);
  const {data:block,error:blockError}=await db.from('lms_lesson_blocks')
   .select('id,block_type,payload').eq('id',body.blockId)
   .eq('lesson_id',body.lessonId).maybeSingle();
  if(blockError||!block||block.block_type!=='pdf'
    ||block.payload?.protectedPages!==true)
   return failure(404,'Private PDF pages not accessible',origin);
  const {data:p,error:packageError}=await admin.from('lms_p141_pdf_packages')
   .select('status,page_count,course_id,object_prefix,lesson_id')
   .eq('block_id',body.blockId).eq('lesson_id',body.lessonId).maybeSingle();
  if(packageError||!p||p.status!=='finalized'
    ||p.course_id!==await lessonCourse(body.lessonId)
    ||body.pageIndex>p.page_count||block.payload.pageCount!==p.page_count)
   return failure(403,'PDF page authorization unavailable',origin);
  const path=p.object_prefix+'/'+String(body.pageIndex).padStart(4,'0')+'.jpg';
  const {data:signed,error:signError}=await admin.storage.from(PAGE_BUCKET)
   .createSignedUrl(path,45);
  if(signError||!signed?.signedUrl)return failure(503,'Page unavailable',origin);
  return response(200,{url:signed.signedUrl,pageIndex:body.pageIndex,
   pageCount:p.page_count,expiresIn:45},origin);
 }

 if(action==='view'){
  if(!okUuid(body.lessonId)||!okUuid(body.blockId))
   return failure(400,'Invalid lesson media',origin);
  const {data:allowed,error:grantError}=await db.rpc('lms_p1_can_view_lesson',{
    p_lesson_id:body.lessonId
  });
  if(grantError||allowed!==true)return failure(403,'Lesson access denied',origin);
  // Read the actual block with the user's RLS, never trust an assetId from client.
  const {data:block,error:blockError}=await db.from('lms_lesson_blocks')
   .select('id,lesson_id,block_type,payload')
   .eq('id',body.blockId).eq('lesson_id',body.lessonId).maybeSingle();
  if(blockError||!block||!['pdf','video'].includes(block.block_type)
    ||!okUuid(block.payload?.assetId))
   return failure(404,'Protected media block not accessible',origin);
  const {data:asset,error:assetError}=await admin.from('lms_media_assets')
   .select('id,course_id,kind,private_object_path,mime_type')
   .eq('id',block.payload.assetId).maybeSingle();
  const courseId=await lessonCourse(body.lessonId);
  if(assetError||!asset||asset.kind!==block.block_type||asset.course_id!==courseId)
   return failure(403,'Media ownership mismatch',origin);
  const {data:signed,error:signError}=await admin.storage.from(BUCKET)
   .createSignedUrl(asset.private_object_path,READ_SECONDS);
  if(signError||!signed?.signedUrl)return failure(503,'Protected playback unavailable',origin);
  // Signed URL is short-lived but downloadable with network tools until expiry.
  return response(200,{url:signed.signedUrl,mime:asset.mime_type,
   kind:asset.kind,expiresIn:READ_SECONDS},origin);
 }
 return failure(400,'Unsupported media action',origin);
});
