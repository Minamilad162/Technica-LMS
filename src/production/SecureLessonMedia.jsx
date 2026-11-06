import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AlertTriangle,FileText,FileUp,LockKeyhole,Play,ShieldCheck,UploadCloud,Video,X} from 'lucide-react';
import {authorizeLessonMedia,loadLessonContent,uploadLessonMedia,formatLessonMediaUploadError} from './lessonMediaApi.js';
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

function Watermark({viewer}){
 const [time,setTime]=useState(()=>new Date());
 useEffect(()=>{const id=setInterval(()=>setTime(new Date()),30000);return()=>clearInterval(id);},[]);
 const label='TECHNICA • '+(viewer||'VERIFIED USER')+' • '+time.toISOString().slice(0,16).replace('T',' ')+' UTC';
 return <div className="slm-watermark" aria-hidden="true">
  {Array.from({length:12},(_,i)=><span key={i}>{label}</span>)}</div>;
}

function ProtectedMediaFrame({db,lessonId,block,viewerId}){
 const [url,setUrl]=useState(''),[problem,setProblem]=useState(''),[hidden,setHidden]=useState(false);
 const [cycle,setCycle]=useState(0),[fresh,setFresh]=useState(false);
 const video=useRef(null),clock=useRef(0),wasPlaying=useRef(false);
 const isVideo=block.block_type==='video';
 useEffect(()=>{
  const change=()=>{setHidden(document.hidden);setCycle(n=>n+1);};
  document.addEventListener('visibilitychange',change);
  return()=>document.removeEventListener('visibilitychange',change);
 },[]);
 useEffect(()=>{
  if(!isVideo||hidden)return;
  const id=setInterval(()=>setCycle(n=>n+1),100000);
  return()=>clearInterval(id);
 },[isVideo,hidden]);
 useEffect(()=>{
  let active=true;
  setUrl('');setProblem('');setFresh(false);
  if(hidden)return;
  authorizeLessonMedia(db,lessonId,block).then(data=>{
   if(active){setUrl(data.url);setFresh(true);}
  }).catch(()=>{if(active)setProblem('Private media access unavailable. Verify your active entitlement or reconnect.');});
  return()=>{active=false;};
 },[db,lessonId,block.id,isVideo,cycle,hidden]);
 const preserve=()=>{
  if(!video.current)return;
  clock.current=video.current.currentTime;
  wasPlaying.current=!video.current.paused;
 };
 const restore=()=>{
  if(video.current&&clock.current>0){
   try{video.current.currentTime=clock.current;}catch{}
   if(wasPlaying.current)video.current.play().catch(()=>{});
  }
 };
 return <div className="slm-frame-wrap"
  onContextMenu={e=>e.preventDefault()} onCopy={e=>e.preventDefault()}
  onDragStart={e=>e.preventDefault()}
  onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&['p','s','c'].includes(e.key.toLowerCase()))e.preventDefault();}}>
  {hidden?<p className="slm-locked"><LockKeyhole size={18}/> Content concealed while this tab is not active.</p>:
   problem?<p className="slm-error"><AlertTriangle size={16}/>{problem} <button type="button" onClick={()=>setCycle(n=>n+1)}>Retry</button></p>:
   !url?<p className="slm-locked"><LockKeyhole size={16}/> Verifying access to private {block.block_type}…</p>:
   isVideo?<video ref={video} key={url} src={url} controls playsInline preload="metadata"
    controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture
    onTimeUpdate={preserve} onPause={preserve} onPlay={preserve}
    onLoadedMetadata={restore} onContextMenu={e=>e.preventDefault()} />:
    <iframe key={url} title={'Protected PDF '+(block.payload?.title||'')}
     src={url+'#toolbar=0&navpanes=0&scrollbar=1'} loading="lazy"
     referrerPolicy="no-referrer"/>}
  <Watermark viewer={viewerId}/>
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
     <div><b>{block.payload?.title||'Protected '+block.block_type}</b><small>Authorized streaming · watermark · no download button</small></div>
     <LockKeyhole size={16}/></div>
    <ProtectedMediaFrame db={db} lessonId={lessonId} block={block} viewerId={viewerId}/>
   </article>:
   <div className="slm-text" key={block.id} onContextMenu={e=>e.preventDefault()} onCopy={e=>e.preventDefault()}>
    {block.block_type==='heading'?<h3>{block.payload?.body||block.payload?.text||''}</h3>:
     <p>{block.payload?.body||block.payload?.text||''}</p>}
   </div>)}
 </div>;
}
