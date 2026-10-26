import React,{useRef,useState} from 'react';
import {FileText,Film,Upload,Eye,Download,Trash2,HardDrive,AlertCircle,LoaderCircle} from 'lucide-react';
import {useDemo} from '../lib/store';
import {courseMediaFor} from '../lib/adminCourses';
import {saveMedia,readMedia,removeMedia,validateMediaFile,formatMediaSize} from '../lib/mediaVault';

export default function CourseMaterialsPanel({courseId='asp'}){
  const {state,addCourseMedia,deleteCourseMedia,notify}=useDemo();
  const [busy,setBusy]=useState(false),[drag,setDrag]=useState(false),[error,setError]=useState('');
  const inputRef=useRef(null);
  const items=courseMediaFor(state,courseId);
  async function upload(files){
    setDrag(false);setError('');
    const list=Array.from(files||[]);
    if(!list.length)return;
    setBusy(true);
    try{
      for(const file of list){
        const issue=validateMediaFile(file);
        if(issue){setError(`${file.name}: ${issue}`);continue}
        const id=`upload-${globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)}`;
        try{
          await saveMedia(id,file);
          addCourseMedia({id,courseId,title:file.name.replace(/\.[^.]+$/,''),fileName:file.name,size:file.size,kind:file.name.toLowerCase().endsWith('.pdf')?'pdf':'video',sample:false,uploadedAt:new Date().toISOString()});
        }catch(err){setError(`${file.name}: ${err?.message||'Could not save this file. Browser storage may be full.'}`)}
      }
    }finally{setBusy(false);if(inputRef.current)inputRef.current.value=''}
  }
  async function open(item,download=false){
    if(item.sample){notify('This is sample metadata only. Upload a real PDF or video to preview it.');return}
    try{
      const blob=await readMedia(item.id);
      if(!blob){setError('The local file is missing. Upload it again to this browser.');return}
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');anchor.href=url;
      if(download){anchor.download=item.fileName;anchor.click()}
      else {anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.click()}
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }catch(err){setError(err.message||'Cannot read the locally stored file.')}
  }
  async function remove(item){
    if(item.sample)return;
    if(!window.confirm(`Remove ${item.fileName} from this demo course?`))return;
    try{await removeMedia(item.id);deleteCourseMedia(item.id);setError('')}catch(err){setError(err.message||'Cannot remove file')}
  }
  return <section className="builder-aside-card media-builder-panel" aria-label="Course media materials">
    <h3><Upload size={19}/>Course resources</h3>
    <p>Add PDF materials and videos to this course. Actual files are stored privately in this browser with IndexedDB, not sent to a server.</p>
    <input ref={inputRef} type="file" accept=".pdf,.mp4,.webm,.mov,application/pdf,video/mp4,video/webm,video/quicktime" multiple hidden onChange={e=>upload(e.target.files)}/>
    <button type="button" className={`media-dropzone ${drag?'dragging':''}`} onClick={()=>inputRef.current?.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={e=>{e.preventDefault();setDrag(false)}} onDrop={e=>{e.preventDefault();upload(e.dataTransfer.files)}} disabled={busy}>
      {busy?<LoaderCircle className="media-spin" size={23}/>:<Upload size={23}/>}
      <strong>{busy?'Saving files…':'Upload PDF or video'}</strong>
      <small>Choose files or drop here · PDF 30 MB · video 150 MB max</small>
    </button>
    {error&&<p className="media-error" role="alert"><AlertCircle size={15}/>{error}</p>}
    <div className="media-resource-list">
      {items.map(item=><div className="media-resource" key={item.id}>
        <span className={`media-resource-icon ${item.kind}`}>{item.kind==='pdf'?<FileText size={19}/>:<Film size={19}/>}</span>
        <div className="media-resource-copy"><strong title={item.fileName}>{item.title}</strong><small>{item.kind.toUpperCase()} · {item.sample?'Sample item · no file attached':`${formatMediaSize(item.size)} · Stored locally`}</small></div>
        {!item.sample&&<div className="media-resource-actions"><button title={`Preview ${item.fileName}`} aria-label={`Preview ${item.fileName}`} onClick={()=>open(item)}><Eye size={16}/></button><button title={`Download ${item.fileName}`} aria-label={`Download ${item.fileName}`} onClick={()=>open(item,true)}><Download size={16}/></button><button title={`Delete ${item.fileName}`} aria-label={`Delete ${item.fileName}`} onClick={()=>remove(item)}><Trash2 size={16}/></button></div>}
      </div>)}
      {!items.length&&<p className="media-resource-empty">No files for this course yet.</p>}
    </div>
    <div className="media-footnote"><HardDrive size={15}/>Your demo files remain on this device/browser only. Publishing a course does not upload media to cloud storage.</div>
  </section>
}
