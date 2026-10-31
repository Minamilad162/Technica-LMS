import React, {useState} from 'react';
import {ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, FileText, Layers3, Pencil, Plus, Trash2, Video, Eye} from 'lucide-react';
import {useDemo} from '../lib/store';
import {getCourseModules} from '../lib/courseWorkspace';
import {getCourseHierarchy, hierarchySummary, moveItem, newHierarchyId} from '../lib/courseHierarchy';
import {Modal} from './UI';
import '../courseHierarchy.css';

const blankLesson = {title:'', type:'Text', description:'', mediaId:''};

export default function CourseHierarchyEditor({courseId, availableMedia=[], onPreview}) {
  const {state, saveCourseHierarchy, notify} = useDemo();
  const domains = getCourseHierarchy(state, courseId, getCourseModules(state, courseId));
  const counts = hierarchySummary(domains);
  const [opened, setOpened] = useState({});
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(blankLesson);
  const [nameEditor, setNameEditor] = useState(null);
  const mutate = fn => saveCourseHierarchy(courseId, fn);
  const toggle = id => setOpened(o => ({...o, [id]: !(o[id] ?? true)}));
  const addDomain = () => setNameEditor({kind:'add-domain',title:''});
  const updateDomain = (domainId, fn) => mutate(old => old.map(d => d.id===domainId?fn(d):d));
  const updateTopic = (domainId, topicId, fn) =>
    updateDomain(domainId, d => ({...d,topics:d.topics.map(t => t.id===topicId?fn(t):t)}));
  const addTopic = domainId => setNameEditor({kind:'add-topic',domainId,title:''});
  const renameDomain = domain => setNameEditor({kind:'rename-domain',domainId:domain.id,title:domain.title});
  const renameTopic = (domainId,topic) => setNameEditor({kind:'rename-topic',domainId,topicId:topic.id,title:topic.title});
  const saveName = event => {
    event.preventDefault();
    const title=nameEditor?.title.trim().slice(0,180);
    if (!title) {notify('A title is required');return;}
    const {kind,domainId,topicId}=nameEditor;
    if(kind==='add-domain'){
      const id=newHierarchyId('domain');
      mutate(old=>[...old,{id,title,topics:[]}]);
      setOpened(o=>({...o,[id]:true}));
    }else if(kind==='add-topic'){
      const id=newHierarchyId('topic');
      updateDomain(domainId,d=>({...d,topics:[...d.topics,{id,title,lessons:[]}]}));
      setOpened(o=>({...o,[domainId]:true,[id]:true}));
    }else if(kind==='rename-domain'){
      updateDomain(domainId,d=>({...d,title}));
    }else if(kind==='rename-topic'){
      updateTopic(domainId,topicId,t=>({...t,title}));
    }
    setNameEditor(null);
  };
  const deleteDomain = domain => {
    const count=domain.topics.reduce((n,t)=>n+t.lessons.length,0);
    if (!window.confirm(`Delete "${domain.title}" and all ${domain.topics.length} topics / ${count} lessons from this demo hierarchy? Legacy source modules remain untouched.`)) return;
    mutate(old=>old.filter(d=>d.id!==domain.id));
  };
  const deleteTopic = (domainId,topic) => {
    if(!window.confirm(`Delete "${topic.title}" and its ${topic.lessons.length} lessons from this demo hierarchy?`))return;
    updateDomain(domainId,d=>({...d,topics:d.topics.filter(t=>t.id!==topic.id)}));
  };
  const deleteLesson = (domainId,topicId,lesson) => {
    if(!window.confirm(`Delete lesson "${lesson.title}" from this demo hierarchy?`))return;
    updateTopic(domainId,topicId,t=>({...t,lessons:t.lessons.filter(l=>l.id!==lesson.id)}));
  };
  const editLesson = (domainId, topicId, lesson=null) => {
    setEditor({domainId,topicId,lessonId:lesson?.id||null});
    setForm(lesson?{title:lesson.title,type:lesson.type||'Text',description:lesson.description||'',mediaId:lesson.mediaId||''}:blankLesson);
  };
  const saveLesson = event => {
    event.preventDefault();
    if(!form.title.trim()){notify('Lesson title is required');return;}
    const kind=form.type.toLowerCase();
    const media=availableMedia.find(m=>m.id===form.mediaId);
    if(form.mediaId && (!media || media.kind!==kind)){notify('Choose a compatible file from this course');return;}
    const {domainId,topicId,lessonId}=editor;
    updateTopic(domainId,topicId,t=>({
      ...t,lessons:lessonId
        ? t.lessons.map(l=>l.id===lessonId?{...l,...form,title:form.title.trim()}:l)
        : [...t.lessons,{...form,title:form.title.trim(),id:newHierarchyId('lesson')}]
    }));
    setEditor(null);
  };
  return <section className="hierarchy-editor" aria-label="Course structure builder">
    <div className="hierarchy-heading">
      <div><h3><Layers3 size={21}/> Learning structure</h3><p>Course → Domains → Topics → Lessons. Each level can contain multiple children.</p></div>
      <button type="button" className="btn" onClick={addDomain}><Plus size={16}/> Add domain</button>
    </div>
    <div className="hierarchy-counts"><span>{counts.domains} domains</span><span>{counts.topics} topics</span><span>{counts.lessons} lessons</span></div>
    {domains.length===0 && <div className="hierarchy-empty"><BookOpen size={25}/><strong>No domains yet</strong><p>Begin with a Domain, then add Topics and their Lessons.</p></div>}
    <div className="hierarchy-list">{domains.map((domain,di)=><article key={domain.id} className="hierarchy-domain">
      <div className="hierarchy-domain-head">
        <button className="hierarchy-disclosure" type="button" aria-label={`Toggle domain ${domain.title}`} aria-expanded={opened[domain.id]??true} onClick={()=>toggle(domain.id)}>{opened[domain.id]??true?<ChevronDown size={19}/>:<ChevronRight size={19}/>}</button>
        <div className="hierarchy-title"><small>DOMAIN {di+1}</small><strong>{domain.title}</strong>{domain.legacyUnmapped&&<em>Legacy · not mapped to exam bank</em>}</div>
        <div className="hierarchy-actions">
          <button aria-label="Move domain up" title="Move up" disabled={di===0} onClick={()=>mutate(d=>moveItem(d,domain.id,-1))}><ArrowUp size={15}/></button>
          <button aria-label="Move domain down" title="Move down" disabled={di===domains.length-1} onClick={()=>mutate(d=>moveItem(d,domain.id,1))}><ArrowDown size={15}/></button>
          <button aria-label="Rename domain" title="Rename" onClick={()=>renameDomain(domain)}><Pencil size={15}/></button>
          <button aria-label="Delete domain" title="Delete" onClick={()=>deleteDomain(domain)}><Trash2 size={15}/></button>
        </div>
      </div>
      {(opened[domain.id]??true)&&<div className="hierarchy-domain-body">
        {domain.topics.map((topic,ti)=><div className="hierarchy-topic" key={topic.id}>
          <div className="hierarchy-topic-head">
            <button className="hierarchy-disclosure" aria-label={`Toggle topic ${topic.title}`} aria-expanded={opened[topic.id]??true} onClick={()=>toggle(topic.id)}>{opened[topic.id]??true?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
            <div className="hierarchy-title"><small>TOPIC {di+1}.{ti+1}</small><strong>{topic.title}</strong><small>{topic.lessons.length} lessons</small></div>
            <div className="hierarchy-actions">
              <button aria-label="Move topic up" disabled={ti===0} onClick={()=>updateDomain(domain.id,d=>({...d,topics:moveItem(d.topics,topic.id,-1)}))}><ArrowUp size={15}/></button>
              <button aria-label="Move topic down" disabled={ti===domain.topics.length-1} onClick={()=>updateDomain(domain.id,d=>({...d,topics:moveItem(d.topics,topic.id,1)}))}><ArrowDown size={15}/></button>
              <button aria-label="Rename topic" onClick={()=>renameTopic(domain.id,topic)}><Pencil size={15}/></button>
              <button aria-label="Delete topic" onClick={()=>deleteTopic(domain.id,topic)}><Trash2 size={15}/></button>
            </div>
          </div>
          {(opened[topic.id]??true)&&<div className="hierarchy-lessons">
            {topic.lessons.map((lesson,li)=><div className="hierarchy-lesson" key={lesson.id}>
              <div className="hierarchy-lesson-mark">{lesson.type==='Video'?<Video size={16}/>:lesson.type==='PDF'?<FileText size={16}/>:<BookOpen size={16}/>}</div>
              <div className="hierarchy-title"><small>LESSON {di+1}.{ti+1}.{li+1} · {lesson.type}</small><strong>{lesson.title}</strong><small>{lesson.description||'No description'}</small></div>
              <div className="hierarchy-actions">
                {lesson.mediaId&&<button aria-label="Preview lesson file" onClick={()=>onPreview?.(lesson)}><Eye size={15}/></button>}
                <button aria-label="Move lesson up" disabled={li===0} onClick={()=>updateTopic(domain.id,topic.id,t=>({...t,lessons:moveItem(t.lessons,lesson.id,-1)}))}><ArrowUp size={15}/></button>
                <button aria-label="Move lesson down" disabled={li===topic.lessons.length-1} onClick={()=>updateTopic(domain.id,topic.id,t=>({...t,lessons:moveItem(t.lessons,lesson.id,1)}))}><ArrowDown size={15}/></button>
                <button aria-label="Edit lesson" onClick={()=>editLesson(domain.id,topic.id,lesson)}><Pencil size={15}/></button>
                <button aria-label="Delete lesson" onClick={()=>deleteLesson(domain.id,topic.id,lesson)}><Trash2 size={15}/></button>
              </div>
            </div>)}
            <button className="hierarchy-add" onClick={()=>editLesson(domain.id,topic.id)}><Plus size={16}/> Add lesson</button>
          </div>}
        </div>)}
        <button className="hierarchy-add" onClick={()=>addTopic(domain.id)}><Plus size={16}/> Add topic to {domain.title}</button>
      </div>}
    </article>)}</div>
    <p className="hierarchy-note">Saved locally in this browser. Existing question bank, assessments, and legacy modules are preserved. Live learner courses and Supabase synchronization are separate next-stage integrations.</p>
    {nameEditor&&<Modal title={nameEditor.kind==='add-domain'?'Add domain':nameEditor.kind==='add-topic'?'Add topic':nameEditor.kind==='rename-domain'?'Rename domain':'Rename topic'} onClose={()=>setNameEditor(null)}>
      <form className="simple-fields" onSubmit={saveName}>
        <label>{nameEditor.kind.includes('domain')?'Domain title':'Topic title'}<input required autoFocus maxLength={180} value={nameEditor.title} onChange={e=>setNameEditor(old=>({...old,title:e.target.value}))} placeholder="Enter a clear title"/></label>
        <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={()=>setNameEditor(null)}>Cancel</button><button className="btn" type="submit">Save</button></div>
      </form>
    </Modal>}
    {editor&&<Modal title={editor.lessonId?'Edit lesson':'Add lesson'} onClose={()=>setEditor(null)}>
      <form className="simple-fields" onSubmit={saveLesson}>
        <label>Lesson title<input required maxLength={180} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
        <label>Lesson type<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,mediaId:''}))}>{['Text','Image','PDF','Video','Quiz'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Description<textarea rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
        {['PDF','Video','Image'].includes(form.type)&&<label>Course media file<select value={form.mediaId} onChange={e=>setForm(f=>({...f,mediaId:e.target.value}))}><option value="">Attach later</option>{availableMedia.filter(m=>m.kind===form.type.toLowerCase()).map(m=><option key={m.id} value={m.id}>{m.fileName}</option>)}</select></label>}
        <small>Lesson content blocks and quiz rules will be connected to the production editor in a subsequent stage.</small>
        <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={()=>setEditor(null)}>Cancel</button><button className="btn" type="submit">Save lesson</button></div>
      </form>
    </Modal>}
  </section>;
}
