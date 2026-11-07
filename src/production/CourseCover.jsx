import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,ImagePlus,RefreshCw,Trash2,UploadCloud} from 'lucide-react';
import {coverInitials,coverPublicUrl,coverTheme,removeCourseCover,
 uploadCourseCover,validateCoverSource} from './courseCoverApi.js';
import './liveCourseCovers.css';

export function CourseCover({course,db,variant='card',onClick=null}){
 const [broken,setBroken]=useState(false);
 const src=coverPublicUrl(db,course);
 useEffect(()=>setBroken(false),[src]);
 const theme=coverTheme(course);
 const content=<>
  {src&&!broken&&<img className="lcc-image" src={src}
   alt={course?.title?course.title+' course cover':'Course cover'}
   loading={variant==='hero'?'eager':'lazy'} decoding="async"
   onError={()=>setBroken(true)}/>}
  <div className="lcc-glow" aria-hidden="true"/>
  <div className="lcc-pattern" aria-hidden="true"><i/><i/><i/></div>
  <div className="lcc-topline"><span className="lcc-mark">T<span>•</span>C</span>
   <span>TECHNICA CONSULT <b>LEARNING</b></span></div>
  <div className="lcc-art" aria-hidden="true">
   <span>{coverInitials(course?.title)}</span></div>
  <div className="lcc-bottomline"><span>EXPLORE · LEARN · ACHIEVE</span><i/></div>
 </>;
 return <div className={'lcc-cover lcc-'+theme+' lcc-'+variant+(src&&!broken?' lcc-with-image':'')} aria-label={course?.title+' cover'}>{content}</div>;
}
export function CourseCoverManager({db,course,onSaved}){
 const input=useRef(null);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setStatus('');setError('');},[course?.id]);
 const upload=async(e)=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file||busy)return;
  setError('');setStatus('');setBusy(true);
  try{
   validateCoverSource(file);
   const result=await uploadCourseCover(db,course,file);
   setStatus('Course cover saved and linked to Supabase.'+
    (result.cleanupPending?' Previous public cover cleanup needs an Admin review.':''));
   onSaved?.();
  }catch(ex){setError(ex?.message||'Course cover upload failed.');}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  if(busy||!course?.cover_path)return;
  if(!window.confirm('Remove the public cover for this Course? The gradient fallback will be shown.'))return;
  setBusy(true);setError('');setStatus('');
  try{
   const result=await removeCourseCover(db,course);
   setStatus('Cover removed. Gradient fallback is active.'+
    (result.cleanupPending?' Old public file cleanup needs review.':''));
   onSaved?.();
  }catch(ex){setError(ex?.message||'Cover removal failed.');}
  finally{setBusy(false);}
 };
 return <section className="lcc-admin" aria-label="Course cover editor">
  <div className="lcc-admin-preview"><CourseCover db={db} course={course} variant="manager-preview"/></div>
  <div className="lcc-admin-details">
   <span className="at-eyebrow">COURSE COVER</span>
   <h4>Make this course recognizable</h4>
   <p>Use a clear 16:9 image for the Course card and details. JPEG, PNG or WebP up to 5 MB.
    Images are cropped to 1280 × 720 WebP in your browser. Covers are intentionally public; lesson videos and PDFs stay private.</p>
   <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload}
    aria-label="Choose course cover image"/>
   <div className="lcc-admin-buttons">
    <button className="at-primary" type="button" disabled={busy} onClick={()=>input.current?.click()}>
     {busy?<RefreshCw size={15}/>:<ImagePlus size={15}/>}
     {busy?'Preparing cover…':course?.cover_path?'Replace cover':'Upload cover'}</button>
    {course?.cover_path&&<button className="at-outline" type="button" disabled={busy} onClick={remove}>
     <Trash2 size={14}/> Remove</button>}
   </div>
   {status&&<p className="lcc-success" role="status"><CheckCircle2 size={15}/>{status}</p>}
   {error&&<p className="lcc-error" role="alert">{error}</p>}
  </div>
 </section>;
}
