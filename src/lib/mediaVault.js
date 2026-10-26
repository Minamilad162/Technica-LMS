// Local demo storage for PDF and video bytes; never a replacement for Supabase Storage.
const DB_NAME='technica-lms-demo-media-v1';
const STORE='files';
function dbOpen(){return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('Local file storage is unavailable in this browser.'));
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onerror=()=>reject(req.error||new Error('Cannot open local media storage'));
  req.onsuccess=()=>resolve(req.result);
});}
async function transaction(id,mode,action){
  const db=await dbOpen();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    const request=action(tx.objectStore(STORE),id);
    let result;
    request.onsuccess=()=>{result=request.result};
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error||request.error||new Error('Local media operation failed'));
    tx.onabort=()=>reject(tx.error||new Error('Local media operation aborted'));
  });}finally{db.close()}
}
export const saveMedia=(id,file)=>transaction(id,'readwrite',(store,key)=>store.put(file,key));
export const readMedia=id=>transaction(id,'readonly',(store,key)=>store.get(key));
export const removeMedia=id=>transaction(id,'readwrite',(store,key)=>store.delete(key));
export function validateMediaFile(file){
  const ext=file.name.split('.').at(-1)?.toLowerCase();
  const allowed=['pdf','mp4','webm','mov'];
  if(!allowed.includes(ext))return 'Supported formats: PDF, MP4, WebM or MOV.';
  if(ext==='pdf' && file.type && file.type!=='application/pdf')return 'The PDF file type does not match its extension.';
  if(ext==='mp4' && file.type && !['video/mp4','application/octet-stream'].includes(file.type))return 'The video type does not match its extension.';
  if(!file.size)return 'This file is empty.';
  const max=ext==='pdf'?30*1024*1024:150*1024*1024;
  if(file.size>max)return `Maximum file size is ${ext==='pdf'?30:150} MB.`;
  return '';
}
export const formatMediaSize=size=>size>=1048576?`${(size/1048576).toFixed(1)} MB`:`${Math.ceil(size/1024)} KB`;
