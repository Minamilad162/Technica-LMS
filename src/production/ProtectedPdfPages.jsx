import React,{useEffect,useState} from 'react';
import {AlertTriangle,ChevronLeft,ChevronRight,FileImage,LockKeyhole,UploadCloud,X} from 'lucide-react';
import {authorizePdfPage,uploadProtectedPdfPages,validatePageFiles} from './protectedPdfPagesApi.js';

// The Admin prepares JPG pages locally using scripts/prepare-protected-pdf.py.
// Unlike the legacy iframe, the learner never requests the original PDF.
export function ProtectedPdfUploadModal({db,lessonId,lessonTitle='',onClose,onDone}){
 const [title,setTitle]=useState(lessonTitle||'Lesson document');
 const [files,setFiles]=useState([]);
 const [busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState('');
 async function submit(e){
  e.preventDefault();if(busy)return;
  setBusy(true);setError('');
  try{
   const result=await uploadProtectedPdfPages(db,lessonId,files,title,setStage);
   onDone?.(result);onClose?.();
  }catch(e){setError(e?.message||'Secure pages could not be attached.');}
  finally{setBusy(false);}
 }
 let valid=0;
 try{valid=validatePageFiles(files).length;}catch{}
 return <div className="slm-modal-shade" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose?.()}>
  <form className="slm-upload-modal" role="dialog" aria-modal="true" aria-label="Upload protected PDF pages" onSubmit={submit}>
   <div className="slm-modal-head"><span className="slm-lock"><FileImage size={18}/></span>
    <div><small>PROTECTED PDF DELIVERY · P14.1</small><h3>Add protected PDF pages</h3></div>
    <button type="button" className="slm-close" aria-label="Close" disabled={busy} onClick={onClose}><X size={18}/></button>
   </div>
   <p>Convert the PDF on your computer using <code>scripts/prepare-protected-pdf.py</code> first.
   Select only the generated JPG pages; do not select or upload the original PDF.</p>
   <label className="slm-pdf-title">Document title<input required maxLength={160} value={title}
    disabled={busy} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="slm-pdf-picker">Select sequential JPG pages (0001.jpg, 0002.jpg, …)
    <input type="file" accept=".jpg,image/jpeg" multiple disabled={busy}
     onChange={e=>{setFiles(Array.from(e.target.files||[]));setError('');}}/>
   </label>
   <p>{files.length?files.length+' selected · '+(valid?valid+' valid pages':'Check numbering, JPG type and size'):'Up to 80 pages, 2 MB each, 50 MB total.'}</p>
   <div className="slm-security-note"><LockKeyhole size={16}/> Stored in a separate private page bucket. Students receive only short-lived signed page images, not the original PDF.</div>
   <p className="slm-truth">This makes original-PDF extraction harder. Individual images and OS screenshots remain possible; it is not DRM.</p>
   {error&&<p role="alert" className="slm-error"><AlertTriangle size={16}/>{error}</p>}
   {stage&&<p role="status" className="slm-stage">{stage}</p>}
   <div className="slm-actions"><button type="button" className="at-outline" disabled={busy} onClick={onClose}>Cancel</button>
    <button type="submit" className="at-primary" disabled={busy||!valid||!title.trim()}>
     <UploadCloud size={16}/>{busy?'Uploading…':'Attach secure pages'}</button>
   </div>
  </form>
 </div>;
}
export function ProtectedPdfPages({db,lessonId,block}){
 const [index,setIndex]=useState(1),[url,setUrl]=useState(''),
  [count,setCount]=useState(block.payload?.pageCount||0),
  [error,setError]=useState(''),[hidden,setHidden]=useState(()=>document.hidden),
  [retry,setRetry]=useState(0);
 useEffect(()=>{setIndex(1);},[lessonId,block.id]);
 useEffect(()=>{
  const onVisibility=()=>setHidden(document.hidden);
  document.addEventListener('visibilitychange',onVisibility);
  return()=>document.removeEventListener('visibilitychange',onVisibility);
 },[]);
 useEffect(()=>{
  let live=true;setUrl('');setError('');
  if(hidden)return;
  authorizePdfPage(db,lessonId,block.id,index)
   .then(x=>{if(live){setCount(x.pageCount);setUrl(x.url);}})
   .catch(()=>{if(live)setError('Page permission unavailable. Please retry.');});
  return()=>{live=false;};
 },[db,lessonId,block.id,index,hidden,retry]);
 return <div className="slm-pdf-pages" onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()}>
  <div className="slm-pdf-page-image">
   {hidden?<p className="slm-locked"><LockKeyhole size={16}/> Page hidden while inactive.</p>:
    error?<p className="slm-error"><AlertTriangle size={16}/>{error}
     <button type="button" onClick={()=>setRetry(v=>v+1)}>Retry</button></p>:
    !url?<p className="slm-locked"><LockKeyhole size={16}/> Checking page access…</p>:
    <img src={url} draggable={false} alt={'Protected PDF page '+index} referrerPolicy="no-referrer"
     onError={()=>setError('Page image could not be loaded.')}/>}
  </div>
  <div className="slm-pdf-controls">
   <button type="button" disabled={index<=1} onClick={()=>setIndex(v=>v-1)} aria-label="Previous page"><ChevronLeft size={18}/></button>
   <span>Page {index} / {count||'…'}</span>
   <button type="button" disabled={index>=count} onClick={()=>setIndex(v=>v+1)} aria-label="Next page"><ChevronRight size={18}/></button>
  </div>
 </div>;
}
