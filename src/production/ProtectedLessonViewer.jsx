import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,FileText,LockKeyhole,Maximize,Play,
 RotateCcw,ShieldCheck,Video,X} from 'lucide-react';
import {authorizeLessonMedia} from './lessonMediaApi.js';
import {MEDIA_URL_REFRESH_MS,PROTECTED_MEDIA_NOTICE,canRenderAuthorizedMedia,
 isGuardedMediaShortcut,isMobileMediaBrowser,mediaFullscreenPolicy,
 requestQuestionFullscreen,shouldShieldMediaOnBlur} from '../lib/lessonMediaFullscreen.js';
import './protectedLessonViewer.css';

// Deliberately the same black-screen copy and screenshot-key heuristic used
// by Assessment. An OS screenshot on iOS/Android has no reliable web event.
function ViewerWatermark({identity}){
 const [date,setDate]=useState(()=>new Date());
 useEffect(()=>{const t=setInterval(()=>setDate(new Date()),30000);return()=>clearInterval(t);},[]);
 const value='TECHNICA • '+(identity||'VERIFIED LEARNER')+' • '+
  date.toISOString().slice(0,16).replace('T',' ')+' UTC';
 return <div className="slm-watermark" aria-hidden="true">
  {Array.from({length:12},(_,i)=><span key={i}>{value}</span>)}
 </div>;
}
let activeMediaPrintGuards=0;
const reasonText={
 'fullscreen-exit':'Fullscreen was exited. Resume protected view to continue.',
 'tab-hidden':'Content hidden while you were outside the learning page.',
 'focus-loss':'The learning window lost focus. Resume to continue.',
 'capture-shortcut':'A protected-content keyboard shortcut was detected.',
 'print-request':'Printing is unavailable in protected learning.',
 'fullscreen-denied':'Fullscreen permission was denied. Allow fullscreen and retry.',
 'unsupported':'This desktop browser cannot open a native fullscreen viewer.',
 'inactive':'Open the lesson while this tab is visible.'
};
export default function ProtectedLessonViewer({db,lessonId,block,viewerId=''}) {
 const shell=useRef(null),player=useRef(null),pdf=useRef(null),curtain=useRef(null);
 const mounted=useRef(true),active=useRef(false),opening=useRef(false);
 const inline=useRef(false),lastTime=useRef(0),wasPlaying=useRef(false);
 const [phase,setPhase]=useState('idle'),[fallback,setFallback]=useState(false);
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[reason,setReason]=useState('');
 const [renew,setRenew]=useState(0);
 const isVideo=block.block_type==='video';
 const title=String(block.payload?.title||(isVideo?'Video lesson':'PDF lesson'));
 const privacyCurtain=useCallback((why)=>{
  if(!active.current&&!opening.current)return;
  active.current=false;opening.current=false;
  // Conceal *synchronously* before React can commit, including iframe/video.
  const v=player.current;
  if(v){
   try{lastTime.current=v.currentTime;wasPlaying.current=!v.paused;v.pause();
    v.removeAttribute('src');v.load();}catch{}
  }
  if(pdf.current){try{pdf.current.src='about:blank';}catch{}}
  if(curtain.current)curtain.current.hidden=false;
  if(shell.current)shell.current.dataset.mediaShielded='true';
  setUrl('');setError('');setReason(why);setPhase('blocked');
 },[]);
 const isValidForPlayback=useCallback(()=>canRenderAuthorizedMedia({
  phase:'active',inlineFallback:inline.current,doc:document,element:shell.current
 }),[]);
 const enter=async()=>{
  if(opening.current||active.current||document.visibilityState==='hidden') {
   if(document.visibilityState==='hidden')setReason('inactive');
   return;
  }
  const node=shell.current;
  if(!node)return;
  const policy=mediaFullscreenPolicy(document,node,window);
  opening.current=true;
  if(curtain.current)curtain.current.hidden=false;
  setError('');setReason('');setPhase('opening');setUrl('');
  if(policy==='unsupported'){
   opening.current=false;setReason('unsupported');setPhase('blocked');return;
  }
  // Native request starts *in this click handler*, before any await/network.
  const permission=policy==='required'
   ?requestQuestionFullscreen(node):Promise.resolve({ok:true,reason:'mobile-fallback'});
  const result=await permission;
  if(!mounted.current||!opening.current)return;
  opening.current=false;
  // Mobile Safari sometimes exposes the API but rejects element fullscreen.
  // Keep lessons usable there without pretending to block native screenshots.
  if(!result.ok&&!isMobileMediaBrowser(window)){
   setReason('fullscreen-denied');setPhase('blocked');return;
  }
  inline.current=policy==='mobile-fallback'||!result.ok;
  setFallback(inline.current);
  active.current=true;
  if(node)node.dataset.mediaShielded='false';
  if(curtain.current)curtain.current.hidden=true;
  setPhase('active');setRenew(n=>n+1);
 };
 const close=()=>{
  opening.current=false;active.current=false;inline.current=false;
  if(player.current){try{player.current.pause();player.current.removeAttribute('src');player.current.load();}catch{}}
  if(pdf.current){try{pdf.current.src='about:blank';}catch{}}
  if(shell.current)shell.current.dataset.mediaShielded='false';
  setUrl('');setError('');setReason('');setPhase('idle');setFallback(false);
  const doc=document;
  if(doc.fullscreenElement===shell.current)doc.exitFullscreen?.().catch?.(()=>{});
 };
 useEffect(()=>{
  mounted.current=true;
  const doc=document;
  const viewerNode=shell.current;
  const onFullscreen=()=>{
   if(active.current&&!inline.current&&doc.fullscreenElement!==shell.current)
    privacyCurtain('fullscreen-exit');
  };
  const onVisibility=()=>{
   if(doc.visibilityState==='hidden')privacyCurtain('tab-hidden');
  };
  const onBlur=()=>{
   if(!active.current)return;
   if(shouldShieldMediaOnBlur({
    mobile:isMobileMediaBrowser(window),
    activeTag:String(doc.activeElement?.tagName||'').toLowerCase(),
    visibility:doc.visibilityState
   }))privacyCurtain('focus-loss');
  };
  const onKeys=e=>{
   if(!active.current&&!opening.current)return;
   if(isGuardedMediaShortcut(e)){
    if(e.cancelable)e.preventDefault();
    privacyCurtain('capture-shortcut');
   }
  };
  const onPrint=()=>privacyCurtain('print-request');
  const onPageExit=()=>privacyCurtain('tab-hidden');
  doc.addEventListener('fullscreenchange',onFullscreen);
  doc.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('blur',onBlur);
  window.addEventListener('keydown',onKeys,true);
  window.addEventListener('keyup',onKeys,true);
  window.addEventListener('beforeprint',onPrint);
  window.addEventListener('pagehide',onPageExit);
  return()=>{
   mounted.current=false;active.current=false;opening.current=false;
   doc.removeEventListener('fullscreenchange',onFullscreen);
   doc.removeEventListener('visibilitychange',onVisibility);
   window.removeEventListener('blur',onBlur);
   window.removeEventListener('keydown',onKeys,true);
   window.removeEventListener('keyup',onKeys,true);
   window.removeEventListener('beforeprint',onPrint);
   window.removeEventListener('pagehide',onPageExit);
   // Never leave a stale viewer fullscreen when navigating between Lessons.
   if(doc.fullscreenElement===viewerNode)doc.exitFullscreen?.().catch?.(()=>{});
  };
 },[privacyCurtain]);
 useEffect(()=>{
  if(phase!=='active')return;
  const id=setInterval(()=>{if(active.current)setRenew(n=>n+1);},MEDIA_URL_REFRESH_MS);
  return()=>clearInterval(id);
 },[phase]);
 useEffect(()=>{
  let alive=true;
  setUrl('');setError('');
  if(phase!=='active'||!isValidForPlayback())return()=>{alive=false;};
  authorizeLessonMedia(db,lessonId,block).then(payload=>{
   if(alive&&active.current&&isValidForPlayback())setUrl(payload.url);
  }).catch(()=>{
   if(alive&&active.current)setError('Protected media authorization failed. Check your enrollment and try again.');
  });
  return()=>{alive=false;};
 },[db,lessonId,block.id,phase,renew,isValidForPlayback]);
 const remember=()=>{
  if(!player.current)return;
  lastTime.current=player.current.currentTime;
  wasPlaying.current=!player.current.paused;
 };
 const restore=()=>{
  const v=player.current;
  if(!v||!lastTime.current)return;
  try{
   v.currentTime=lastTime.current;
   if(wasPlaying.current)v.play().catch(()=>{});
  }catch{}
 };
 useEffect(()=>{
  if(phase!=='active')return;
  activeMediaPrintGuards++;
  document.documentElement.classList.add('tc-has-protected-media');
  return()=>{
   activeMediaPrintGuards=Math.max(0,activeMediaPrintGuards-1);
   if(!activeMediaPrintGuards)document.documentElement.classList.remove('tc-has-protected-media');
  };
 },[phase]);
 const isUnlocked=phase==='active'&&!!url&&isValidForPlayback();
 return <div ref={shell}
   className={'slm-protected-viewer'+(phase==='active'?' slm-viewer-active':'')}
   data-media-phase={phase} data-media-kind={block.block_type}
   data-media-shielded={phase==='blocked'||phase==='opening'?'true':'false'}
   onCopy={e=>e.preventDefault()} onCut={e=>e.preventDefault()}
   onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()}
   onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&['c','x'].includes(String(e.key).toLowerCase()))
    e.preventDefault();}}>
  {phase==='idle'&&<div className="slm-media-entry">
   <div className="slm-media-entry-symbol">{isVideo?<Video size={31}/>:<FileText size={31}/>}</div>
   <span>PRIVATE {isVideo?'VIDEO':'PDF'} LESSON</span>
   <h3>{title}</h3>
   <p>Open the protected viewer to access this lesson. Fullscreen is required on supported browsers.</p>
   <button className="slm-media-start" type="button" onClick={enter}>
    <Maximize size={17}/> Open Protected {isVideo?'Video':'PDF'}</button>
   <small><ShieldCheck size={14}/> Signed access · visible watermark · no download button</small>
  </div>}
  {phase==='active'&&<div className="slm-media-content" data-secure-media-content>
   {fallback&&<div className="slm-mobile-fallback" role="note">
    Native webpage fullscreen is unavailable on this browser. Protected inline viewing is enabled;
    device screenshots and recording cannot be blocked by a website.
   </div>}
   {error?<div className="slm-media-loading" role="alert">
     <AlertTriangle size={18}/>{error}
     <button type="button" onClick={()=>setRenew(x=>x+1)}>Retry authorization</button></div>:
    !url?<div className="slm-media-loading" role="status">
     <LockKeyhole size={18}/> Verifying private {isVideo?'video':'PDF'} access…</div>:
    isUnlocked?(isVideo?<video key={url} ref={player} src={url} controls
      playsInline preload="metadata" disablePictureInPicture disableRemotePlayback
      controlsList="nodownload noplaybackrate noremoteplayback"
      onTimeUpdate={remember} onPause={remember} onPlay={remember}
      onLoadedMetadata={restore} onContextMenu={e=>e.preventDefault()}/>:
      <iframe key={url} ref={pdf} title={'Protected PDF '+title}
       src={url+'#toolbar=0&navpanes=0&scrollbar=1'} loading="eager"
       referrerPolicy="no-referrer"/>):null}
   {isUnlocked&&<ViewerWatermark identity={viewerId}/>}
   <div className="slm-viewer-toolbar">
    <span><ShieldCheck size={14}/> Protected viewer {fallback?'· Mobile compatible':'· Fullscreen'}</span>
    <button type="button" onClick={close}><X size={16}/> Close</button>
   </div>
  </div>}
  <div ref={curtain} className="slm-screen-curtain" hidden={phase!=='blocked'&&phase!=='opening'}
   role={phase==='blocked'?'alert':'status'} aria-live="polite">
   <div className="slm-screen-core">
    <span className="slm-screen-title">{PROTECTED_MEDIA_NOTICE}</span>
    {phase==='blocked'&&<>
      <p>{reasonText[reason]||'Protected media is paused.'}</p>
      <div className="slm-screen-actions">
       <button type="button" onClick={enter}><RotateCcw size={15}/> Resume Protected View</button>
       <button type="button" onClick={close}><ArrowLeft size={15}/> Exit Viewer</button>
      </div>
    </>}
   </div>
  </div>
 </div>;
}
