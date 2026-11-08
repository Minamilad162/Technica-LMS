import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nestPublishedOutline,isFullCourseEnrolled,fetchP15Outline,
 setAdminFreeIntro,setAdminPublished,localCheckoutEnabled,recordLocalDemoCheckout}
 from '../src/production/learnerJourneyApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const course='10000000-0000-0000-0000-000000000001',
 domain='20000000-0000-0000-0000-000000000001',
 topic='30000000-0000-0000-0000-000000000001',
 first='40000000-0000-0000-0000-000000000001',
 second='40000000-0000-0000-0000-000000000002';
const rows=[{domain_id:domain,domain_title:'Safety',domain_position:0,
 topic_id:topic,topic_title:'Introduction',topic_position:0,
 lesson_id:first,lesson_title:'Welcome',lesson_position:0,is_free_intro:true},
 {domain_id:domain,domain_title:'Safety',domain_position:0,
 topic_id:topic,topic_title:'Introduction',topic_position:0,
 lesson_id:second,lesson_title:'Hazards',lesson_position:1,is_free_intro:false}];
const outline=nestPublishedOutline(rows,course);
assert.equal(outline.length,1);
assert.equal(outline[0].topics[0].lessons[0].isFreeIntro,true);
assert.equal(outline[0].topics[0].lessons[1].isFreeIntro,false);
assert.throws(()=>nestPublishedOutline([...rows,rows[0]],course),/Invalid/);
assert.throws(()=>nestPublishedOutline(rows.map(r=>({...r,is_free_intro:true})),course),/Only one/);
assert.throws(()=>nestPublishedOutline([{...rows[0],lesson_title:null}],course),/Invalid/);
const now=new Date(),future=new Date(Date.now()+3600e3).toISOString(),
 past=new Date(Date.now()-3600e3).toISOString();
const access=[{course_id:course,status:'active',entitlement_type:'paid',
 starts_at:past,ends_at:future}];
assert(isFullCourseEnrolled(access,course));
assert(!isFullCourseEnrolled(access,second));
assert(!isFullCourseEnrolled([{...access[0],entitlement_type:'trial'}],course));
assert(!isFullCourseEnrolled([{...access[0],ends_at:past}],course));
assert(!isFullCourseEnrolled([{...access[0],status:'revoked'}],course));
const calls=[];
const db={rpc:async(name,params)=>{
 calls.push({name,params});
 if(name==='lms_p15_course_outline')return {data:rows,error:null};
 if(name==='lms_p15_set_intro')return {data:params.p_enabled,error:null};
 return {data:null,error:{message:'forbidden'}};
 },from:table=>{
 assert.equal(table,'lms_courses');
 return {update(value){calls.push({value});return this;},eq(){return this;},
  select(){return this;},single:async()=>({data:{id:course,publication_state:'published'},error:null})};
 }};
assert.equal((await fetchP15Outline(db,course))[0].topics[0].lessons.length,2);
assert.equal(await setAdminFreeIntro(db,course,true),true);
assert.equal((await setAdminPublished(db,'lms_courses',course,'published')).id,course);
assert.equal(calls.find(c=>c.name==='lms_p15_course_outline').params.p_course_id,course);
assert(!localCheckoutEnabled(),'Node test must NEVER enable browser-only checkout');
assert.throws(()=>recordLocalDemoCheckout(first,course,'123456789012'),/disabled/);
const sql=read('supabase/migrations/202611060003_p15_published_intro_outline.sql');
for(const marker of ['lms_p15_can_preview_lesson','lms_p15_course_outline',
 'lms_p15_set_intro','lms_p15_intro_settings','lms_p15_intro_lesson_read',
 'lms_p15_intro_block_read','updated_by','intro_lesson_id=l.id',
 "l.publication_state='published'","c.publication_state='published'",
 "p.account_status='active'","GRANT EXECUTE ON FUNCTION public.lms_p15_set_intro(uuid,boolean) TO authenticated",
 'REVOKE ALL ON public.lms_p15_intro_settings FROM PUBLIC,anon,authenticated'])
 assert(sql.includes(marker),'Missing P15 SQL safety: '+marker);
assert(!sql.includes('GRANT ALL ON public.lms_p15_intro_settings TO authenticated'));
assert(!sql.includes('GRANT INSERT ON public.lms_entitlements'));
const edge=read('supabase/functions/technica-lesson-media/index.ts');
assert(edge.includes("db.rpc('lms_p15_can_preview_lesson'"));
assert(edge.includes('previewAllowed=!introError&&intro===true'));
assert(edge.includes("db.rpc('lms_p1_can_view_lesson'"));
const api=read('src/production/learnerJourneyApi.js');
const ui=read('src/production/LiveLearnerWorkspace.jsx');
const admin=read('src/production/AdminToolsPanels.jsx');
const portal=read('src/production/SupabaseApp.jsx');
assert(api.includes("import.meta.env?.DEV===true"));
assert(api.includes("sessionStorage.setItem(demoKey(userId,courseId),'yes')"));
assert(!api.includes("db.from('lms_entitlements').insert"));
const explorer=read('src/production/CourseLessonExplorer.jsx');
assert(explorer.includes('FREE INTRO')&&explorer.includes('onSubscribe?.()'));
for(const label of ['Courses','My Learning','Practice','My Practice'])assert(ui.includes(label));
assert(ui.includes('CourseLessonExplorer')&&ui.includes('LivePractice'));
assert(explorer.includes('previewOnly')&&explorer.includes('local preview of the lesson outline'));
assert(ui.includes('full={Boolean(full)}')&&explorer.includes('full||selected.isFreeIntro'));
assert(ui.includes('historyId'));

assert(read('src/production/LiveCheckout.jsx').includes('There is no payment gateway connected'));
assert(portal.includes('LiveLearnerWorkspace db={db}'));
assert(admin.includes('Publish course')&&admin.includes('Publish Lesson')&&admin.includes('Enable Free Intro'));
// Both real Supabase standalone and currently deployed /#/ router shell must
// expose the SAME protected learner journeys; keep admin-only /courses intact.
const app=read('src/App.jsx');
const layout=read('src/components/Layout.jsx');
const bridge=read('src/production/LiveLearnerPortal.jsx');
for(const route of ['/course-catalog','/my-learning','/my-practice','/practice'])
 assert(app.includes('path="'+route+'"'),'P15 route missing: '+route);
assert(app.includes("LiveLearnerPortal initialScreen=\"courses\""));
assert(app.includes("LiveLearnerPortal initialScreen=\"learning\""));
assert(app.includes("LiveLearnerPortal initialScreen=\"history\""));
assert(app.includes('LiveExamPracticeHub')&&app.includes('Navigate to="/assessments?tab=practice" replace'),'Practice route must resolve to unified Practice tab');
assert(app.includes("legacyPreview?<LegacyPreviewWarning><PracticePage"));
assert(app.includes('path="/courses" element={<AdminOnly>'));
for(const menu of ['/course-catalog','/my-learning','/assessments','/my-practice'])
 assert(layout.includes(menu),'P15 learner menu missing '+menu);
assert(bridge.includes('db.auth.getUser()'),'Router bridge must verify real signed Supabase user');
assert(bridge.includes('LiveLearnerWorkspace')&&bridge.includes('embedded'));
assert(ui.includes('embedded=false')&&ui.includes("initialScreen='courses'"));
const liveClient=read('src/lib/supabase.js');
const buildConfig=read('vite.config.js');
assert(liveClient.includes('VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY'));
assert(buildConfig.includes('!env.VITE_SUPABASE_PUBLISHABLE_KEY&&!env.VITE_SUPABASE_ANON_KEY'));
assert(edge.includes("injectedDefaultKey('SUPABASE_PUBLISHABLE_KEYS','sb_publishable_')"));
assert(edge.includes("injectedDefaultKey('SUPABASE_SECRET_KEYS','sb_secret_')"));
assert(edge.indexOf("injectedDefaultKey('SUPABASE_PUBLISHABLE_KEYS'") <
  edge.indexOf("Deno.env.get('SUPABASE_ANON_KEY')"),'Prefer new publishable keys over deprecated anon keys');
assert(edge.indexOf("injectedDefaultKey('SUPABASE_SECRET_KEYS'") <
  edge.indexOf("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"),'Prefer new secret keys over legacy service-role keys');
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 72. P15'));
console.log('PASS P15: published-only outline, explicit free intro, private media path, paid/manual gate, local-only simulated UI checkout and learner navigation.');
