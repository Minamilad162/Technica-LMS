import React,{useEffect,useRef,useState} from 'react';
import {AlertTriangle,FileText,FileUp,LockKeyhole,Play,ShieldCheck,UploadCloud,Video,X} from 'lucide-react';
import {loadLessonContent,uploadLessonMedia,formatLessonMediaUploadError} from './lessonMediaApi.js';
import ProtectedLessonViewer from './ProtectedLessonViewer.jsx';
import './secureLessonMedia.css';

export function LessonMediaUploadModal({db,lessonId,lessonTitle='',kind,onClose,onDone}){
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState('');
 const input=useRef(null);
 const isPdf=kind==='pdf',title=isPdf?'PDF document':'Video lesson';
 const accept=isPdf?'.pdf,application/pdf':'.mp4,.webm,video/mp4,video/webm';
 async function submit(e){
  e.preventDefault();
  if(!file||busy)return;
  setBusy(true);setError('');
  try{
   const receipt=await uploadLessonMedia(db,lessonId,file,kind,setStage);
   setStage('Private media attached successfully.');
   onDone?.(receipt);
   onClose?.();
  }catch(err){setError(formatLessonMediaUploadError(err));}
  finally{setBusy(false);}
 }
 return <div className="slm-modal-shade" role="presentation"
  onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose?.()}>
  <form className="slm-upload-modal" role="dialog" aria-modal="true" aria-label={'Upload '+title} onSubmit={submit}>
   <div className="slm-modal-head"><span className="slm-lock"><LockKeyhole size={18}/></span>
    <div><small>PRIVATE LESSON MEDIA</small><h3>Add {title}</h3></div>
    <button type="button" className="slm-close" aria-label="Close" disabled={busy} onClick={onClose}><X size={18}/></button></div>
   <p>Lesson: <b>{lessonTitle}</b>. Only authorized learners can request protected playback. The file remains private.</p>
   <input ref={input} type="file" hidden accept={accept}
    onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}}/>
   <button type="button" className="slm-drop" disabled={busy} onClick={()=>input.current?.click()}>
    {isPdf?<FileText size={31}/>:<Video size={31}/>}
    <b>{file?file.name:'Choose '+(isPdf?'PDF file':'MP4 or WebM video')}</b>
    <span>{file?(file.size/(1024*1024)).toFixed(1)+' MB':
     isPdf?'PDF up to 20 MB':'Video up to 50 MB · upload limit may be lower on your Supabase plan'}</span>
    {!isPdf&&<small className="slm-codec-hint">For reliable Chrome, Android &amp; Safari playback, export MP4 using H.264 video + AAC audio (not HEVC/H.265).</small>}
   </button>
   <div className="slm-security-note"><ShieldCheck size={17}/>
    Private Storage · signed upload · Admin verification · student entitlement check · short-lived playback URLs · visible user watermark
   </div>
   <p className="slm-truth">Browser restrictions and watermarks discourage copying, but screenshots, recording and network extraction cannot be fully prevented without supported DRM/secure rendering.</p>
   {error&&<p className="slm-error" role="alert"><AlertTriangle size={16}/>{error}</p>}
   {stage&&<p className="slm-stage" role="status">Last upload step: {stage}</p>}
   <div className="slm-actions"><button type="button" className="at-outline" disabled={busy} onClick={onClose}>Cancel</button>
    <button type="submit" className="at-primary" disabled={!file||busy}><UploadCloud size={16}/>{busy?'Securing file…':'Upload & attach'}</button></div>
  </form>
 </div>;
}

export function SecureLessonContent({db,lessonId,viewerId='',revision=0}){
 const [blocks,setBlocks]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(!lessonId){setBlocks([]);return;}
  let active=true;setLoading(true);setError('');
  loadLessonContent(db,lessonId).then(x=>{if(active)setBlocks(x);})
   .catch(()=>{if(active)setError('Lesson content unavailable or you do not have permission.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[db,lessonId,revision]);
 if(!lessonId)return null;
 if(loading)return <div className="slm-loading"><LockKeyhole size={16}/> Loading authorized Lesson content…</div>;
 if(error)return <p role="alert" className="slm-error">{error}</p>;
 if(!blocks.length)return <p className="slm-empty">No PDF, video or reading material has been attached to this Lesson yet.</p>;
 return <div className="slm-lesson-content">
  {blocks.map(block=>['pdf','video'].includes(block.block_type)?
   <article key={block.id} className="slm-media-card">
    <div className="slm-media-head">{block.block_type==='pdf'?<FileText size={18}/>:<Play size={18}/>}
     <div><b>{block.payload?.title||'Protected '+block.block_type}</b><small>Full-screen protected viewer · signed access · watermark</small></div>
     <LockKeyhole size={16}/></div>
    <ProtectedLessonViewer db={db} lessonId={lessonId} block={block} viewerId={viewerId}/>
   </article>:
   <div className="slm-text" key={block.id} onContextMenu={e=>e.preventDefault()} onCopy={e=>e.preventDefault()}>
    {block.block_type==='heading'?<h3>{block.payload?.body||block.payload?.text||''}</h3>:
     <p>{block.payload?.body||block.payload?.text||''}</p>}
   </div>)}
 </div>;
}
