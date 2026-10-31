import React,{useEffect,useMemo,useState} from 'react';
import {BookOpen,CheckCircle2,ChevronDown,ChevronRight,FileText,GraduationCap,Layers3,LockKeyhole,LogOut,Plus,RefreshCw,ShieldCheck,UserRound,AlertCircle,Pencil} from 'lucide-react';
import {getSupabaseClient} from '../lib/supabase';
import {createCourse,createDomain,createTopic,createLesson,createTextBlock,getCurrentEntitlements,listCourses,loadIdentity,loadStructure,loadTextBlocks,updatePublish,updateTitle} from './lmsApi';
import './supabaseApp.css';

let database,configurationError='';
try { database=getSupabaseClient();if(!database)configurationError='VITE_DATA_MODE must be supabase'; }
catch(e){ configurationError=e.message; }
const msg=e=>e?.message||'Operation failed. Please try again.';
const includes=(rows,id)=>rows.some(x=>x.course_id===id);

function LoginScreen({db}) {
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const submit=async e=>{
  e.preventDefault();setError('');setNotice('');setBusy(true);
  try{
   if(mode==='register'){
    const {data,error}=await db.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim().slice(0,160)}}});
    if(error)throw error;
    setNotice(data.session?'Account created. Opening workspace…':'Registration received. Check your email for the confirmation link before signing in.');
    if(!data.session)setMode('login');
   }else if(mode==='reset'){
    const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+window.location.pathname});
    if(error)throw error;
    setNotice('If an account exists for that address, a password recovery email will be sent. Follow the link to reset it.');
   }else{
    const {error}=await db.auth.signInWithPassword({email:email.trim(),password});
    if(error)throw error;
   }
  }catch(err){setError(msg(err));}finally{setBusy(false);}
 };
 return <div className="live-login">
  <section className="live-login-story"><img src="/images/technica-logo.webp" alt="Technica Consult"/><span>TECHNICA CONSULT · LMS</span><h1>Learn today.<br/>Build a <em>safer</em> tomorrow.</h1><p>Secure course access powered by Supabase Auth and database policies.</p><div><ShieldCheck size={17}/> Verified account access</div></section>
  <section className="live-login-panel"><div className="live-login-form"><span className="live-eyebrow">LIVE DATABASE MODE</span><h2>{mode==='register'?'Create your account':mode==='reset'?'Password recovery':'Welcome back'}</h2><p>Use your registered email and password. Demo Employee IDs and sample passwords are not accepted here.</p>
   <form onSubmit={submit}>
    {mode==='register'&&<label>Full name<input required minLength={3} maxLength={160} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
    <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
    {mode!=='reset'&&<label>Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'}/></label>}
    {error&&<p className="live-error" role="alert"><AlertCircle size={17}/>{error}</p>}
    {notice&&<p className="live-notice" role="status">{notice}</p>}
    <button className="live-primary" type="submit" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':mode==='reset'?'Send recovery email':'Sign in'}</button>
   </form>
   <div className="live-auth-links"><button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setNotice('');}}>{mode==='login'?'Create account':'Back to sign in'}</button><button type="button" onClick={()=>{setMode('reset');setError('');setNotice('');}}>Forgot password?</button></div>
  </div></section>
 </div>;
}
function RecoveryScreen({db,onComplete}) {
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async e=>{
  e.preventDefault();setError('');
  if(password.length<8 || password!==confirm){setError('Enter matching passwords of at least 8 characters.');return;}
  setBusy(true);try{const {error:issue}=await db.auth.updateUser({password});if(issue)throw issue;onComplete();}
  catch(e){setError(msg(e));}finally{setBusy(false);}
 };
 return <div className="live-login-panel" style={{minHeight:'100dvh'}}>
  <form className="live-login-form" onSubmit={submit}><span className="live-eyebrow">PASSWORD RECOVERY</span><h2>Choose a new password</h2>
   <label>New password<input type="password" required autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirm password<input type="password" required autoComplete="new-password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   {error&&<p className="live-error" role="alert">{error}</p>}
   <button className="live-primary" disabled={busy} type="submit">{busy?'Updating…':'Update password'}</button>
  </form>
 </div>;
}
function EditorModal({editing,onCancel,onSave,busy,error}) {
 const [value,setValue]=useState(editing.initial||'');
 const [summary,setSummary]=useState('');
 return <div className="live-modal-layer" onMouseDown={e=>e.target===e.currentTarget&&onCancel()}>
  <form className="live-modal" role="dialog" aria-modal="true" aria-label={editing.label} onSubmit={e=>{e.preventDefault();onSave(value.trim(),summary.trim());}}>
   <h3>{editing.label}</h3><label>{editing.kind==='text'?'Paragraph text':'Title'}{editing.kind==='text'?<textarea required rows={6} value={value} onChange={e=>setValue(e.target.value)} maxLength={10000}/>:<input required autoFocus minLength={2} maxLength={180} value={value} onChange={e=>setValue(e.target.value)}/>}</label>
   {editing.kind==='course'&&<label>Summary (optional)<textarea rows={3} maxLength={1500} value={summary} onChange={e=>setSummary(e.target.value)}/></label>}
   {error&&<p role="alert" className="live-error">{error}</p>}
   <div className="live-modal-actions"><button type="button" className="live-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="live-primary" disabled={busy||!value.trim()}>{busy?'Saving…':'Save'}</button></div>
  </form>
 </div>;
}
export default function SupabaseApp() {
 const [session,setSession]=useState(null),[boot,setBoot]=useState(true),[identity,setIdentity]=useState(null),[recovering,setRecovering]=useState(false);
 const [courses,setCourses]=useState([]),[entitlements,setEntitlements]=useState([]),[courseId,setCourseId]=useState(null),[tree,setTree]=useState([]),[lessonId,setLessonId]=useState(null),[blocks,setBlocks]=useState([]);
 const [busy,setBusy]=useState(false),[fetching,setFetching]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editing,setEditing]=useState(null),[editError,setEditError]=useState('');
 const db=database;
 useEffect(()=>{
  if(!db){setBoot(false);return;}
  let active=true;
  db.auth.getSession().then(({data,error})=>{if(active){if(error)setError(msg(error));setSession(data?.session||null);setBoot(false);}}).catch(e=>{if(active){setError(msg(e));setBoot(false);}});
  const {data:{subscription}}=db.auth.onAuthStateChange((event,next)=>{if(active){setSession(next);if(event==='PASSWORD_RECOVERY')setRecovering(true);if(event==='SIGNED_OUT')setRecovering(false);setBoot(false);}});
  return()=>{active=false;subscription.unsubscribe();};
 },[db]);
 useEffect(()=>{
  if(!db||!session?.user){setIdentity(null);setCourses([]);setTree([]);setEntitlements([]);return;}
  let active=true;setFetching(true);setError('');
  Promise.all([loadIdentity(db,session.user),listCourses(db),getCurrentEntitlements(db,session.user.id)])
   .then(([user,items,access])=>{if(active){setIdentity(user);setCourses(items);setEntitlements(access);setCourseId(old=>items.some(c=>c.id===old)?old:(items[0]?.id||null));}})
   .catch(e=>{if(active)setError(msg(e));})
   .finally(()=>{if(active)setFetching(false);});
  return()=>{active=false;};
 },[db,session?.user?.id]);
 const isAdmin=identity?.isAdmin===true;
 const selected=courses.find(c=>c.id===courseId);
 const entitled=isAdmin||includes(entitlements,courseId);
 const suspended=identity?.profile?.account_status==='suspended';
 useEffect(()=>{
  if(!db||!selected||!identity||suspended||!entitled){setTree([]);setLessonId(null);setBlocks([]);return;}
  let active=true;setFetching(true);
  loadStructure(db,selected.id).then(rows=>{if(active){setTree(rows);setLessonId(null);setBlocks([]);}}).catch(e=>{if(active)setError(msg(e));}).finally(()=>{if(active)setFetching(false);});
  return()=>{active=false;};
 },[db,selected?.id,identity?.isAdmin,identity?.profile?.account_status,entitled]);
 useEffect(()=>{
  if(!db||!lessonId){setBlocks([]);return;}
  let active=true;
  loadTextBlocks(db,lessonId).then(rows=>{if(active)setBlocks(rows);}).catch(e=>{if(active)setError(msg(e));});
  return()=>{active=false;};
 },[db,lessonId]);
 const refresh=async()=>{
  if(!db||!session?.user)return;setFetching(true);setError('');
  try{
   const [items,access]=await Promise.all([listCourses(db),getCurrentEntitlements(db,session.user.id)]);
   setCourses(items);setEntitlements(access);
   if(selected&&items.some(c=>c.id===selected.id)&&(isAdmin||includes(access,selected.id))){
    setTree(await loadStructure(db,selected.id));
    if(lessonId)setBlocks(await loadTextBlocks(db,lessonId));
   }
  }catch(e){setError(msg(e));}finally{setFetching(false);}
 };
 const save=async(title,summary)=>{
  if(!title)return;setBusy(true);setEditError('');
  try{
   const e=editing;let item;
   if(e.kind==='course'){item=await createCourse(db,title,summary,courses);setCourseId(item.id);}
   else if(e.kind==='domain')await createDomain(db,e.courseId,title,tree);
   else if(e.kind==='topic')await createTopic(db,e.domainId,title,tree.find(d=>d.id===e.domainId)?.topics||[]);
   else if(e.kind==='lesson'){
    const domain=tree.find(d=>d.id===e.domainId),topic=domain?.topics.find(t=>t.id===e.topicId);
    await createLesson(db,e.topicId,title,topic?.lessons||[]);
   }else if(e.kind==='text')await createTextBlock(db,e.lessonId,title,blocks.length);
   else if(e.kind==='rename')await updateTitle(db,e.table,e.id,title);
   setEditing(null);setNotice('Changes saved in Supabase.');await refresh();
  }catch(err){setEditError(msg(err));}finally{setBusy(false);}
 };
 const togglePublish=async(table,id,publication_state)=>{
  setBusy(true);setError('');try{
   await updatePublish(db,table,id,publication_state==='published'?'draft':'published');
   setNotice('Publication state updated.');await refresh();
  }catch(e){setError(msg(e));}finally{setBusy(false);}
 };
 if(configurationError)return <section className="live-configuration"><AlertCircle size={27}/><h1>Technica LMS · Supabase configuration required</h1><p>{configurationError}</p><p>Set VITE_DATA_MODE=supabase and supply VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY as build-time environment values. Never use the service_role key.</p></section>;
 if(boot)return <div className="live-wait">Loading secure LMS session…</div>;
 if(recovering&&session)return <RecoveryScreen db={db} onComplete={()=>{setRecovering(false);setNotice('Password updated successfully.');}}/>;
 if(!session)return <LoginScreen db={db}/>;
 return <div className="live-shell">
  <header className="live-top"><div className="live-brand"><img src="/images/technica-logo.webp" alt="Technica Consult"/><strong>TECHNICA CONSULT <span>LMS</span></strong></div><div className="live-top-right"><span className="live-live-pill"><ShieldCheck size={14}/> Supabase</span><small>{session.user.email}</small><button type="button" className="live-secondary" onClick={()=>db.auth.signOut()}><LogOut size={16}/> Sign out</button></div></header>
  <main className="live-main">
   <div className="live-main-heading"><div><span className="live-eyebrow">COURSE PLATFORM · SECURE DATABASE</span><h1>{isAdmin?'Course management':'Learning library'}</h1><p>{isAdmin?'Manage live course metadata and learning structure.':'Explore published courses you can access.'}</p></div><button type="button" className="live-secondary" onClick={refresh} disabled={fetching}><RefreshCw size={16}/> Refresh</button></div>
   {error&&<p className="live-error" role="alert"><AlertCircle size={18}/>{error}</p>}
   {notice&&<p className="live-notice" role="status"><CheckCircle2 size={17}/>{notice}</p>}
   {suspended?<div className="live-empty"><LockKeyhole size={24}/><b>Account suspended</b><p>Contact the LMS administrator.</p></div>:!identity?<div className="live-empty">Loading profile…</div>:
   <div className="live-columns">
    <section className="live-list"><div className="live-list-top"><h2>Courses <span>{courses.length}</span></h2>{isAdmin&&<button className="live-icon-create" type="button" onClick={()=>setEditing({kind:'course',label:'Create course'})}><Plus size={17}/> New</button>}</div>
      {courses.map(c=><button type="button" key={c.id} onClick={()=>setCourseId(c.id)} className={`live-course ${selected?.id===c.id?'active':''}`}><BookOpen size={19}/><span><b>{c.title}</b><small>{c.publication_state==='published'?'Published':'Draft'} · {c.slug}</small></span>{!(isAdmin||includes(entitlements,c.id))&&<LockKeyhole size={15}/>}</button>)}
      {!courses.length&&<p className="live-empty">No courses found. {isAdmin?'Create the first course.':'Published courses will appear here.'}</p>}
    </section>
    <section className="live-workspace">
     {!selected?<div className="live-empty">Choose a course from the list.</div>:<>
      <div className="live-course-head"><div><span className="live-eyebrow">COURSE</span><h2>{selected.title}</h2><p>{selected.summary||'No summary provided.'}</p></div><div className="live-head-actions">{isAdmin&&<><button type="button" className="live-secondary" onClick={()=>setEditing({kind:'rename',table:'lms_courses',id:selected.id,initial:selected.title,label:'Rename course'})}><Pencil size={15}/> Rename</button><button type="button" className="live-secondary" disabled={busy} onClick={()=>togglePublish('lms_courses',selected.id,selected.publication_state)}>{selected.publication_state==='published'?'Unpublish':'Publish'}</button></>}</div></div>
      {!entitled?<div className="live-empty"><LockKeyhole size={24}/><h3>Course access required</h3><p>You can view the catalog, but your account does not have an active enrollment for this course.</p></div>:<>
       <div className="live-section-heading"><h3><Layers3 size={18}/> Domains · Topics · Lessons</h3>{isAdmin&&<button className="live-icon-create" onClick={()=>setEditing({kind:'domain',courseId:selected.id,label:'Add domain'})}><Plus size={16}/> Domain</button>}</div>
       {fetching&&<p className="live-muted">Refreshing structure…</p>}
       {tree.map((domain,di)=><div className="live-domain" key={domain.id}>
        <div className="live-domain-head"><div><span>DOMAIN {di+1}</span><strong>{domain.title}</strong></div>{isAdmin&&<div className="live-actions"><button aria-label="Rename domain" onClick={()=>setEditing({kind:'rename',table:'lms_domains',id:domain.id,initial:domain.title,label:'Rename domain'})}><Pencil size={15}/></button><button onClick={()=>setEditing({kind:'topic',domainId:domain.id,label:'Add topic'})}><Plus size={15}/> Topic</button></div>}</div>
        {domain.topics.map((topic,ti)=><div className="live-topic" key={topic.id}><div className="live-topic-head"><div><small>TOPIC {di+1}.{ti+1}</small><b>{topic.title}</b></div>{isAdmin&&<div className="live-actions"><button aria-label="Rename topic" onClick={()=>setEditing({kind:'rename',table:'lms_topics',id:topic.id,initial:topic.title,label:'Rename topic'})}><Pencil size={15}/></button><button onClick={()=>setEditing({kind:'lesson',domainId:domain.id,topicId:topic.id,label:'Add lesson'})}><Plus size={15}/> Lesson</button></div>}</div>
         {topic.lessons.map((lesson,li)=><div className="live-lesson" key={lesson.id}>
          <button className="live-lesson-name" type="button" onClick={()=>setLessonId(id=>id===lesson.id?null:lesson.id)}><FileText size={17}/><span>{di+1}.{ti+1}.{li+1} · {lesson.title}</span>{lessonId===lesson.id?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</button>
          {isAdmin&&<div className="live-actions"><button aria-label="Rename lesson" onClick={()=>setEditing({kind:'rename',table:'lms_lessons',id:lesson.id,initial:lesson.title,label:'Rename lesson'})}><Pencil size={15}/></button><button type="button" disabled={busy} onClick={()=>togglePublish('lms_lessons',lesson.id,lesson.publication_state)}>{lesson.publication_state==='published'?'Draft':'Publish'}</button></div>}
          {lessonId===lesson.id&&<div className="live-blocks"><small>{lesson.publication_state.toUpperCase()} · Content blocks</small>{blocks.map(block=><p key={block.id}>{String(block.payload?.body||block.payload?.text||'')}</p>)}{!blocks.length&&<p>No reading text added yet.</p>}{isAdmin&&<button type="button" className="live-icon-create" onClick={()=>setEditing({kind:'text',lessonId:lesson.id,label:'Add reading content'})}><Plus size={15}/> Reading paragraph</button>}</div>}
         </div>)}
         {!topic.lessons.length&&<p className="live-muted">No visible lessons yet.</p>}
        </div>)}
        {!domain.topics.length&&<p className="live-muted">No topics yet.</p>}
       </div>)}
       {!tree.length&&!fetching&&<div className="live-empty"><GraduationCap size={24}/><b>Course structure is empty</b><p>{isAdmin?'Add the first domain to begin.':'Content will appear when published and accessible.'}</p></div>}
      </>}
     </>}
    </section>
   </div>}
   <p className="live-disclaimer">P3 scope: real Auth + database catalog, hierarchy and text lessons. Question bank, secure exams, grading, paid entitlements, media signing and progress event submission are not enabled in Live Mode.</p>
  </main>{editing&&<EditorModal key={editing.kind+editing.id+editing.domainId+editing.topicId} editing={editing} onCancel={()=>{setEditing(null);setEditError('');}} onSave={save} busy={busy} error={editError}/>}
 </div>;
}
