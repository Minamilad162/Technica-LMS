// P14: protected PDF/video lesson blocks. Never use getPublicUrl,
// direct browser SELECT on lms_media_assets, or an uploadable public bucket.
export const LESSON_BUCKET='technica-private-lessons';
export const P14_FUNCTION='technica-lesson-media';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rules={
 pdf:{'application/pdf':{ext:'pdf',limit:20*1024*1024}},
 video:{'video/mp4':{ext:'mp4',limit:50*1024*1024},
        'video/webm':{ext:'webm',limit:50*1024*1024}}
};
export const isLessonId=value=>typeof value==='string'&&uuid.test(value);
export const validateLessonUpload=(file,kind)=>{
 const rule=rules[kind]?.[file?.type];
 if(!rule||!Number.isSafeInteger(file.size)||file.size<1||file.size>rule.limit||
   typeof file.name!=='string'||file.name.length>160||
   !file.name.toLowerCase().endsWith('.'+rule.ext)||
   /[\\/\x00-\x1f]/.test(file.name))
   throw Error('Choose a PDF (max 20 MB) or MP4/WebM video (max 50 MB).');
 return {kind,mime:file.type,size:file.size,fileName:file.name};
};
// This is a UX/signature check, NOT an antivirus scan. The Edge finalizer
// independently verifies actual object size/MIME and Admin/lesson ownership.
export async function verifyFileHeader(file,kind){
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 if(kind==='pdf'){
  if(bytes.length<5||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')
   throw Error('File is not a valid PDF.');
 }else if(file.type==='video/mp4'){
  if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')
   throw Error('File does not have an MP4 header.');
 }else if(file.type==='video/webm'){
  if(bytes.length<4||bytes[0]!==0x1a||bytes[1]!==0x45||bytes[2]!==0xdf||bytes[3]!==0xa3)
   throw Error('File does not have a WebM header.');
 }
}
// Deliberately do not surface raw Edge/storage messages: they can contain
// private filenames, object paths, signed URLs or session information.
// Admin UX receives a stable code + stage + public HTTP status only.
export class LessonMediaUploadError extends Error {
 constructor(code,stage,message,status=null){
  super(message);
  this.name='LessonMediaUploadError';
  this.code=code;this.stage=stage;this.status=status;
 }
}
const failed=(code,stage,message,status=null)=>
 new LessonMediaUploadError(code,stage,message,status);
const operationStage={
 'init-upload':'Authorizing Admin upload',
 'finish-upload':'Finalizing private file',
 'view':'Authorizing private playback'
};
function safeHttpStatus(err){
 const value=err?.context?.status??err?.status??err?.statusCode;
 const numeric=Number(value);
 return Number.isInteger(numeric)&&numeric>=400&&numeric<=599?numeric:null;
}
async function mediaRpc(db,body){
 const stage=operationStage[body.action]||'Private media request';
 if(!db?.functions?.invoke)
  throw failed('P14_NO_CONNECTION',stage,'A real authenticated Supabase connection is required.');
 let data,error;
 try{({data,error}=await db.functions.invoke(P14_FUNCTION,{body}));}
 catch{throw failed('P14_EDGE_UNREACHABLE',stage,
  'Cannot reach the secure media Edge Function. Check network, deployment and allowed site origin.');}
 if(!error&&data&&!data.error)return data;
 const status=safeHttpStatus(error);
 if(status===401)throw failed('P14_EDGE_401',stage,
  'Your Supabase login token was rejected. Sign out and sign in again; check Edge JWT configuration.',status);
 if(status===403)throw failed('P14_EDGE_403',stage,
  'Secure media access denied. Verify your active Admin role and allowed site origin.',status);
 if(status===404)throw failed('P14_EDGE_404',stage,
  'Secure upload endpoint or selected Lesson not found. Verify technica-lesson-media is deployed to the same Supabase project.',status);
 if(status===413)throw failed('P14_EDGE_413',stage,
  'The request exceeded a server size limit.',status);
 if(status>=500)throw failed('P14_EDGE_5XX',stage,
  'Secure media service failed. Inspect Supabase Edge Function logs and configuration.',status);
 if(status===400)throw failed('P14_EDGE_400',stage,
  'Secure upload validation or finalization failed. Check file type, actual Storage metadata and Edge Function logs.',status);
 if(status)throw failed('P14_EDGE_HTTP',stage,
  'Secure media access denied or service unavailable. Check Supabase Edge Function Invocations.',status);
 throw failed('P14_EDGE_NETWORK',stage,
  'Secure media service unavailable or access denied. Check Edge deployment, site origin/CORS, network and account permissions.');
}
const SAFE_FILE_ERRORS=new Set([
 'Choose a PDF (max 20 MB) or MP4/WebM video (max 50 MB).',
 'File is not a valid PDF.',
 'File does not have an MP4 header.',
 'File does not have a WebM header.',
 'Select a saved Lesson.',
 'Invalid signed upload response.',
 'Upload was not confirmed by the secure lesson service.'
]);
export function formatLessonMediaUploadError(err){
 if(err instanceof LessonMediaUploadError){
  const status=err.status?' HTTP '+err.status:'';
  return err.message+' (Code: '+err.code+status+'; step: '+err.stage+').';
 }
 if(SAFE_FILE_ERRORS.has(err?.message))return err.message;
 return 'Secure upload stopped due to an unexpected error (Code: P14_UNEXPECTED). Check Supabase Edge Function and Storage logs.';
}
function signedUploadError(error){
 const status=safeHttpStatus(error);
 if(status===413) return failed('P14_STORAGE_413','Uploading to private Storage',
  'Video exceeds the Supabase global or bucket upload limit. Try a smaller MP4; do not make the bucket public.',status);
 if(status===401||status===403)return failed('P14_STORAGE_DENIED','Uploading to private Storage',
  'Signed upload authorization rejected. Check token expiry, private bucket and Storage settings.',status);
 if(status===404)return failed('P14_STORAGE_MISSING','Uploading to private Storage',
  'Private lesson Storage bucket is unavailable in the connected Supabase project.',status);
 if(status===400)return failed('P14_STORAGE_400','Uploading to private Storage',
  'Supabase Storage rejected the file. Check actual MIME type, file size and bucket restrictions.',status);
 return failed('P14_STORAGE_UPLOAD','Uploading to private Storage',
  'Signed upload to private Storage failed. Check network, upload limit and Storage logs.',status);
}
export async function uploadLessonMedia(db,lessonId,file,kind,onStage=()=>{}){
 if(!isLessonId(lessonId))throw Error('Select a saved Lesson.');
 const v=validateLessonUpload(file,kind);
 await verifyFileHeader(file,kind);
 onStage('Requesting protected Admin upload…');
 const begin=await mediaRpc(db,{action:'init-upload',lessonId,...v});
 if(begin.bucket!==LESSON_BUCKET||begin.kind!==kind||
    !isLessonId(begin.intentId)||typeof begin.path!=='string'||
    !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|mp4|webm)$/.test(begin.path)||
    typeof begin.token!=='string'||!begin.token)
  throw Error('Invalid signed upload response.');
 onStage('Uploading to private Storage…');
 const {error:storageError}=await db.storage.from(LESSON_BUCKET)
  .uploadToSignedUrl(begin.path,begin.token,file,{contentType:v.mime,upsert:false});
 if(storageError)throw signedUploadError(storageError);
 onStage('Verifying the file and attaching it to the Lesson…');
 const done=await mediaRpc(db,{action:'finish-upload',intentId:begin.intentId});
 if(!isLessonId(done.blockId)||done.kind!==kind)
  throw Error('Upload was not confirmed by the secure lesson service.');
 return done;
}
export async function authorizeLessonMedia(db,lessonId,block){
 if(!isLessonId(lessonId)||!isLessonId(block?.id)||
  !['video','pdf'].includes(block.block_type))
  throw Error('Invalid private Lesson media block.');
 const response=await mediaRpc(db,{
  action:'view',lessonId,blockId:block.id
 });
 if(response.kind!==block.block_type||!['application/pdf','video/mp4','video/webm'].includes(response.mime)||
  typeof response.url!=='string'||!response.url.startsWith('https://')||
  !Number.isInteger(response.expiresIn)||response.expiresIn>300||response.expiresIn<10)
  throw Error('Invalid protected media playback token.');
 return response;
}
export async function loadLessonContent(db,lessonId){
 if(!isLessonId(lessonId))throw Error('Invalid Lesson.');
 const {data,error}=await db.from('lms_lesson_blocks')
  .select('id,lesson_id,block_type,payload,position')
  .eq('lesson_id',lessonId).order('position',{ascending:true});
 if(error)throw Error('Lesson access denied or content unavailable.');
 return (data||[]).filter(x=>['text','heading','pdf','video'].includes(x.block_type))
  .map(x=>({...x,payload:x.block_type==='pdf'||x.block_type==='video'?
   {title:String(x.payload?.title||x.block_type.toUpperCase()).slice(0,160)}:x.payload}));
}
