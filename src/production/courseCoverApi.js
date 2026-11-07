import {verifiedLiveAdmin} from './liveAuthoringApi.js';

// P17: these are PUBLIC marketing covers, never private lesson assets.
export const COURSE_COVER_BUCKET='technica-course-covers';
export const COVER_SOURCE_MAX=5*1024*1024;
export const COVER_WEBP_MAX=2*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathRegex=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/i;
const themes=['teal','ocean','indigo','amber'];
export function coverTheme(course){
 const key=String(course?.id||course?.slug||course?.title||'');
 let value=0;for(const ch of key)value=(value*31+ch.charCodeAt(0))>>>0;
 return themes[value%themes.length];
}
export function coverInitials(title){
 const words=String(title||'Course').trim().split(/\s+/).filter(Boolean);
 const initials=words.length>1?words.slice(0,3).map(w=>w[0]).join(''):words[0]?.slice(0,3)||'TC';
 return initials.toUpperCase().slice(0,3);
}
export function validCoverPath(courseId,path){
 return uuid.test(courseId||'')&&typeof path==='string'&&pathRegex.test(path)
  &&path.split('/')[0].toLowerCase()===courseId.toLowerCase();
}
export function coverPublicUrl(db,course){
 if(!course||!validCoverPath(course.id,course.cover_path))return '';
 try{
  const url=db?.storage?.from(COURSE_COVER_BUCKET)?.getPublicUrl(course.cover_path)?.data?.publicUrl;
  return typeof url==='string'&&url.startsWith('https://')?url:'';
 }catch{return '';}
}
export function validateCoverSource(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||
    !Number.isSafeInteger(file.size)||file.size<1||file.size>COVER_SOURCE_MAX)
  throw Error('Choose a JPEG, PNG or WebP cover under 5 MB.');
 return true;
}
export async function checkCoverHeader(file){
 validateCoverSource(file);
 const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const jpeg=b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
 const png=b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
 const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&
    String.fromCharCode(...b.slice(8,12))==='WEBP';
 if(!((file.type==='image/jpeg'&&jpeg)||(file.type==='image/png'&&png)||
  (file.type==='image/webp'&&webp)))
  throw Error('Image file contents do not match JPEG, PNG or WebP.');
}
export async function prepareCover(file){
 await checkCoverHeader(file);
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')
  throw Error('This browser cannot process covers. Try an updated Chrome or Safari.');
 let bitmap;
 try{
  bitmap=await createImageBitmap(file);
  if(!bitmap.width||!bitmap.height)throw Error('The cover image has invalid dimensions.');
  const canvas=document.createElement('canvas');
  canvas.width=1280;canvas.height=720;
  const context=canvas.getContext('2d');
  if(!context)throw Error('Cannot prepare the cover image.');
  const ratio=Math.max(canvas.width/bitmap.width,canvas.height/bitmap.height);
  const w=bitmap.width*ratio,h=bitmap.height*ratio;
  context.drawImage(bitmap,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.84));
  if(!blob||blob.type!=='image/webp'||!blob.size||blob.size>COVER_WEBP_MAX)
   throw Error('The cover could not be compressed below 2 MB. Try a simpler image.');
  return blob;
 }finally{bitmap?.close?.();}
}
// Every write is deliberately gated by verified Supabase Admin and storage RLS.
// Upload is a unique object; update existing P1 metadata ONLY after Storage success.
export async function uploadCourseCover(db,course,file){
 if(!uuid.test(course?.id||''))throw Error('Select a saved Course.');
 const blob=await prepareCover(file);
 await verifiedLiveAdmin(db);
 const path=course.id+'/'+crypto.randomUUID()+'.webp';
 const storage=db.storage.from(COURSE_COVER_BUCKET);
 const {error:uploadError}=await storage.upload(path,blob,{
  contentType:'image/webp',cacheControl:'3600',upsert:false
 });
 if(uploadError)throw Error('Course cover Storage denied. Apply P17 once on the correct Supabase project; verify the Admin role and public cover bucket.');
 let updated;
 try{
  const {data,error}=await db.from('lms_courses').update({cover_path:path})
   .eq('id',course.id).select('id,cover_path').single();
  if(error||data?.cover_path!==path)throw Error('Course cover metadata was not saved. Verify the P17 migration and Admin permissions.');
  updated=data;
 }catch(ex){
  try{await storage.remove([path]);}catch{/* Best-effort orphan cleanup, never release protected content. */}
  throw ex;
 }
 let cleanupPending=false;
 if(validCoverPath(course.id,course.cover_path)&&course.cover_path!==path){
  try{const {error}=await storage.remove([course.cover_path]);cleanupPending=!!error;}
  catch{cleanupPending=true;}
 }
 return {...updated,cleanupPending};
}
export async function removeCourseCover(db,course){
 if(!uuid.test(course?.id||''))throw Error('Select a saved Course.');
 await verifiedLiveAdmin(db);
 const {data,error}=await db.from('lms_courses').update({cover_path:null})
  .eq('id',course.id).select('id,cover_path').single();
 if(error||data?.id!==course.id||data.cover_path!==null)
  throw Error('Removing the Course cover was denied by Supabase.');
 let cleanupPending=false;
 if(validCoverPath(course.id,course.cover_path)){
  try{const {error:deleteError}=await db.storage.from(COURSE_COVER_BUCKET)
    .remove([course.cover_path]);cleanupPending=!!deleteError;}
  catch{cleanupPending=true;}
 }
 return {...data,cleanupPending};
}
