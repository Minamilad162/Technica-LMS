// P14.1 — optional rasterized JPEG pages. The original PDF is NEVER uploaded
// to the page bucket or returned to a learner. This is NOT screenshot DRM.
export const PAGE_BUCKET='technica-private-lesson-pages';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGES=80,MAX_PAGE_BYTES=2097152,MAX_TOTAL=50*1024*1024;
const okId=id=>typeof id==='string'&&UUID.test(id);
async function request(db,body){
 if(!db?.functions?.invoke)throw Error('Authenticated Supabase is required.');
 const {data,error}=await db.functions.invoke('technica-lesson-media',{body});
 if(error||!data||data.error)throw Error('Protected page service denied this request. Verify P14.1 Staging deployment and permissions.');
 return data;
}
export function validatePageFiles(files){
 const pages=Array.from(files||[]).sort((a,b)=>a.name.localeCompare(b.name));
 if(!pages.length||pages.length>MAX_PAGES)throw Error('Choose 1–80 prepared JPG pages.');
 let total=0;
 for(let i=0;i<pages.length;i++){
  const f=pages[i],expected=String(i+1).padStart(4,'0')+'.jpg';
  if(f.name!==expected||f.type!=='image/jpeg'||!Number.isSafeInteger(f.size)
     ||f.size<1||f.size>MAX_PAGE_BYTES)
   throw Error('Use sequential 0001.jpg, 0002.jpg ... pages (JPEG ≤2 MB each).');
  total+=f.size;
 }
 if(total>MAX_TOTAL)throw Error('Prepared pages must total at most 50 MB.');
 return pages;
}
export async function checkPageHeaders(pages){
 for(const file of pages){
  const b=new Uint8Array(await file.slice(0,3).arrayBuffer());
  if(b.length!==3||b[0]!==255||b[1]!==216||b[2]!==255)
   throw Error('Invalid JPG page header.');
 }
}
export async function uploadProtectedPdfPages(db,lessonId,files,title,onStage=()=>{}){
 if(!okId(lessonId))throw Error('Choose a saved Lesson.');
 if(typeof title!=='string'||!title.trim()||title.length>160
    ||/[\\/\x00-\x1f]/.test(title))throw Error('Enter a valid document title.');
 const pages=validatePageFiles(files);
 await checkPageHeaders(pages);
 onStage('Requesting secure PDF page package…');
 const init=await request(db,{action:'init-pdf-pages',lessonId,title:title.trim(),
  pageSizes:pages.map(f=>f.size)});
 if(!okId(init.packageId)||init.pageCount!==pages.length)
  throw Error('Invalid private page package response.');
 for(let i=0;i<pages.length;i++){
  onStage('Uploading protected page '+(i+1)+' of '+pages.length+'…');
  const signed=await request(db,{action:'sign-pdf-page-upload',
   packageId:init.packageId,pageIndex:i+1});
  if(signed.bucket!==PAGE_BUCKET||typeof signed.token!=='string'
   ||!signed.token||typeof signed.path!=='string'
   ||!signed.path.endsWith('/'+pages[i].name))
   throw Error('Invalid private upload authorization.');
  const {error}=await db.storage.from(PAGE_BUCKET).uploadToSignedUrl(
   signed.path,signed.token,pages[i],{contentType:'image/jpeg',upsert:false});
  if(error)throw Error('Private page upload failed; no Lesson block was published.');
 }
 onStage('Checking all pages and attaching the PDF to the Lesson…');
 const result=await request(db,{action:'finish-pdf-pages',packageId:init.packageId});
 if(!okId(result.blockId)||result.kind!=='pdf'||result.pageCount!==pages.length)
  throw Error('The protected page package was not finalized.');
 return result;
}
export async function authorizePdfPage(db,lessonId,blockId,pageIndex){
 if(!okId(lessonId)||!okId(blockId)||!Number.isSafeInteger(pageIndex)||pageIndex<1)
  throw Error('Invalid page request.');
 const result=await request(db,{action:'view-pdf-page',lessonId,blockId,pageIndex});
 if(result.pageIndex!==pageIndex||!Number.isSafeInteger(result.pageCount)
   ||result.pageCount<1||result.pageCount>MAX_PAGES
   ||typeof result.url!=='string'||!result.url.startsWith('https://')
   ||result.expiresIn!==45)
  throw Error('Invalid protected page access response.');
 return result;
}
