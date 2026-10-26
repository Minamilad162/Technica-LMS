/** Video lesson runtime is metadata, not a user-entered duration. */
export const LESSON_TYPES=Object.freeze(['Video','PDF']);

export function cleanLessonForSave(form,mediaRecords=[]){
 if(!LESSON_TYPES.includes(form.type))throw new Error('Choose Video or PDF.');
 const media=mediaRecords.find(item=>item.id===form.mediaId);
 const matching=media?.kind===form.type.toLowerCase();
 const runtime=matching && form.type==='Video'
   ? (media.durationSeconds ?? form.durationSeconds) : null;
 const seconds=Number(runtime);
 return {
  title:String(form.title||'').trim(),
  type:form.type,
  description:String(form.description||'').trim(),
  mediaId:matching?form.mediaId:'',
  durationSeconds:form.type==='Video' && runtime!=null && Number.isFinite(seconds) && seconds>0 ? Math.round(seconds) : null
 };
}

export function formatVideoRuntime(seconds){
 const value=Number(seconds);
 if(seconds==null || !Number.isFinite(value) || value<=0)return '';
 const whole=Math.round(value);
 const hours=Math.floor(whole/3600), minutes=Math.floor((whole%3600)/60), secs=whole%60;
 return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${minutes}:${String(secs).padStart(2,'0')}`;
}

/** Read locally-uploaded video metadata without loading or uploading the media to a server.
 * Some MOV/browser codec combinations don't expose metadata; duration is then unknown.
 */
export function readVideoDurationSeconds(file){
 if(!file || typeof document==='undefined' || typeof URL?.createObjectURL!=='function')return Promise.resolve(null);
 return new Promise(resolve=>{
  const element=document.createElement('video');
  let url,timer,done=false;
  function finish(value){
   if(done)return;
   done=true;
   if(timer)clearTimeout(timer);
   element.removeAttribute('src');element.load?.();
   if(url)URL.revokeObjectURL(url);
   resolve(value);
  }
  try{
   url=URL.createObjectURL(file);
   element.preload='metadata';
   element.addEventListener('loadedmetadata',()=>{
    const duration=Number(element.duration);
    finish(Number.isFinite(duration)&&duration>0?Math.round(duration):null);
   },{once:true});
   element.addEventListener('error',()=>finish(null),{once:true});
   timer=setTimeout(()=>finish(null),8000);
   element.src=url;
   element.load?.();
  }catch{finish(null)}
 });
}
