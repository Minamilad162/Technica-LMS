// P14 authenticated-only lesson-media gateway.
// Server secrets are available ONLY in Supabase Edge, never the Vite bundle.
// deploy with verify_jwt=true; set TECHNICA_MEDIA_ALLOWED_ORIGINS explicitly.
// Signed *READ* URLs are 120-second bearer capabilities and are NOT DRM.
import {createClient} from 'npm:@supabase/supabase-js@2';

const BUCKET='technica-private-lessons';
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
// Hosted Supabase now injects named-key JSON dictionaries. Prefer those over
// legacy JWT-style anon/service_role keys; otherwise @supabase/server gateway
// may reject our internal Auth/Storage requests with INVALID_API_KEY.
const injectedDefaultKey=(envName,prefix)=>{
 try {
  const keys=JSON.parse(Deno.env.get(envName)||'{}');
  const value=keys?.default;
  return typeof value==='string'&&value.startsWith(prefix)?value:'';
 }catch{return '';}
};
const publicKey=injectedDefaultKey('SUPABASE_PUBLISHABLE_KEYS','sb_publishable_')
 ||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
 ||Deno.env.get('SUPABASE_ANON_KEY')||'';
const serverKey=injectedDefaultKey('SUPABASE_SECRET_KEYS','sb_secret_')
 ||Deno.env.get('SUPABASE_SECRET_KEY')
 ||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
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
 if(action==='view'){
  if(!okUuid(body.lessonId)||!okUuid(body.blockId))
   return failure(400,'Invalid lesson media',origin);
  const {data:allowed,error:grantError}=await db.rpc('lms_p1_can_view_lesson',{
    p_lesson_id:body.lessonId
  });
  // P15 permits ONLY the active, explicitly enabled first published Intro.
  // Fail closed if P15 is absent or its RPC rejects. Paid/Trial keep P1.
  let previewAllowed=false;
  if(!grantError&&allowed!==true){
    const {data:intro,error:introError}=await db.rpc('lms_p15_can_preview_lesson',{
      p_lesson_id:body.lessonId
    });
    previewAllowed=!introError&&intro===true;
  }
  if(grantError||(allowed!==true&&!previewAllowed))
    return failure(403,'Lesson access denied',origin);
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
