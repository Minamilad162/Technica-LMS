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
async function mediaRpc(db,body){
 if(!db?.functions?.invoke)throw Error('A real authenticated Supabase connection is required.');
 const {data,error}=await db.functions.invoke(P14_FUNCTION,{body});
 if(error||!data||data.error)
  throw Error('Secure media service unavailable or access denied. Check P14 Staging migration, Edge deployment and account permissions.');
 return data;
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
 if(storageError)throw Error('Private media upload failed. The file was not attached to the Lesson.');
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
   {title:String(x.payload?.title||x.block_type.toUpperCase()).slice(0,160),
    ...(x.block_type==='pdf'&&x.payload?.protectedPages===true?
     {protectedPages:true,pageCount:Number(x.payload.pageCount)||0}:{})}:x.payload}));
}
