// P3 is intentionally scoped to metadata and text lessons: no question keys,
// assessment grading, direct progress writes or private media paths are exposed.
export function courseSlug(title) {
  const base=String(title||'').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return base || 'course';
}
export function unusedSlug(title, peers=[]) {
  const base=courseSlug(title), existing=new Set(peers.map(x=>x.slug));
  if(!existing.has(base))return base;
  for(let i=2;i<10000;i++)if(!existing.has(base+'-'+i))return base+'-'+i;
  throw Error('No free slug available');
}
export function nestStructure(domains=[],topics=[],lessons=[]) {
  return domains.map(d=>({...d,topics:topics.filter(t=>t.domain_id===d.id)
    .map(t=>({...t,lessons:lessons.filter(l=>l.topic_id===t.id)}))}));
}
const ordered = q => q.order('position',{ascending:true}).order('id',{ascending:true});
function value(data,error){if(error)throw new Error(error.message||'Database request failed');return data;}
export async function loadIdentity(db,user) {
  const {data:profileData,error:profileError}=await db.from('lms_profiles').select('full_name,account_status').eq('id',user.id).maybeSingle();
  const profile=value(profileData,profileError);
  if(!profile)throw Error('Your account profile is missing. Contact the LMS administrator; do not create an admin role from the browser.');
  const {data:roleData,error:roleError}=await db.from('lms_role_assignments').select('role,scope_course_id').eq('user_id',user.id).is('revoked_at',null);
  const roles=value(roleData,roleError);
  return {profile,roles:roles||[],isAdmin:profile.account_status==='active'&&(roles||[]).some(r=>r.role==='admin')};
}
export async function listCourses(db) {
  const {data,error}=await db.from('lms_courses').select('id,slug,title,summary,publication_state,created_at').order('created_at',{ascending:false});
  return value(data,error)||[];
}
export async function loadStructure(db,courseId) {
  const d=await ordered(db.from('lms_domains').select('id,course_id,slug,title,position').eq('course_id',courseId));
  const domains=value(d.data,d.error)||[];
  if(!domains.length)return [];
  const t=await ordered(db.from('lms_topics').select('id,domain_id,slug,title,position').in('domain_id',domains.map(x=>x.id)));
  const topics=value(t.data,t.error)||[];
  if(!topics.length)return nestStructure(domains,[],[]);
  const l=await ordered(db.from('lms_lessons').select('id,topic_id,slug,title,position,publication_state,version').in('topic_id',topics.map(x=>x.id)));
  const lessons=value(l.data,l.error)||[];
  return nestStructure(domains,topics,lessons);
}
export async function loadTextBlocks(db,lessonId) {
  const {data,error}=await db.from('lms_lesson_blocks')
    .select('id,block_type,payload,position').eq('lesson_id',lessonId)
    .eq('block_type','text').order('position',{ascending:true});
  return value(data,error)||[];
}
export async function getCurrentEntitlements(db,userId) {
  const {data,error}=await db.from('lms_entitlements')
    .select('course_id,entitlement_type,status,starts_at,ends_at').eq('user_id',userId).eq('status','active');
  const now=Date.now();
  return (value(data,error)||[]).filter(e=>Date.parse(e.starts_at)<=now && (!e.ends_at||Date.parse(e.ends_at)>now));
}
// All writes below are checked by Supabase RLS (P1) against the authenticated
// admin. Frontend checks are only UX; NEVER a substitute for table policies.
export async function createCourse(db,title,summary,peers) {
  const {data,error}=await db.from('lms_courses').insert({
    title,summary,slug:unusedSlug(title,peers),publication_state:'draft'
  }).select('id').single();
  return value(data,error);
}
export async function createDomain(db,courseId,title,peers) {
  const {data,error}=await db.from('lms_domains').insert({
    course_id:courseId,title,slug:unusedSlug(title,peers),position:peers.length
  }).select('id').single();
  return value(data,error);
}
export async function createTopic(db,domainId,title,peers) {
  const {data,error}=await db.from('lms_topics').insert({
    domain_id:domainId,title,slug:unusedSlug(title,peers),position:peers.length
  }).select('id').single();
  return value(data,error);
}
export async function createLesson(db,topicId,title,peers) {
  const {data,error}=await db.from('lms_lessons').insert({
    topic_id:topicId,title,slug:unusedSlug(title,peers),position:peers.length,
    publication_state:'draft'
  }).select('id').single();
  return value(data,error);
}
export async function updateTitle(db,table,id,title) {
  if(!['lms_courses','lms_domains','lms_topics','lms_lessons'].includes(table))throw Error('Invalid table');
  const {error}=await db.from(table).update({title}).eq('id',id);
  if(error)throw Error(error.message);
}
export async function updatePublish(db,table,id,next) {
  if(!['lms_courses','lms_lessons'].includes(table))throw Error('Invalid publishing table');
  if(!['draft','published'].includes(next))throw Error('Invalid publication state');
  const {error}=await db.from(table).update({publication_state:next}).eq('id',id);
  if(error)throw Error(error.message);
}
export async function createTextBlock(db,lessonId,body,position) {
  const {data,error}=await db.from('lms_lesson_blocks').insert({
    lesson_id:lessonId,block_type:'text',payload:{body},position
  }).select('id').single();
  return value(data,error);
}
