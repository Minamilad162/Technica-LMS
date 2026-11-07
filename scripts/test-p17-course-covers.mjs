import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COURSE_COVER_BUCKET,COVER_SOURCE_MAX,coverTheme,coverInitials,validCoverPath,
 coverPublicUrl,validateCoverSource,checkCoverHeader} from '../src/production/courseCoverApi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const c='10000000-0000-0000-0000-000000000001';
const o='10000000-0000-0000-0000-000000000002';
const fileId='c0000000-0000-0000-0000-000000000001';
const path=c+'/'+fileId+'.webp';
assert.equal(COURSE_COVER_BUCKET,'technica-course-covers');
assert(validCoverPath(c,path));
assert(!validCoverPath(o,path),'Course ownership required');
assert(!validCoverPath(c,'https://example.com/'+path));
assert(!validCoverPath(c,c+'/../cover.webp'));
assert(!validCoverPath(c,c+'/'+fileId+'.svg'));
assert(!validCoverPath(c,c+'/cover.webp'));
assert.equal(coverInitials('Associated Safety Professional'),'ASP');
assert.equal(coverInitials('NEBOSH'),'NEB');
assert(['teal','ocean','indigo','amber'].includes(coverTheme({id:c})));
assert.equal(coverTheme({id:c}),coverTheme({id:c}),'Fallback theme deterministic');
const fakeDb={storage:{from:bucket=>{assert.equal(bucket,COURSE_COVER_BUCKET);
 return {getPublicUrl:p=>({data:{publicUrl:'https://example.supabase.co/storage/v1/object/public/'+bucket+'/'+p}})};}}};
assert(coverPublicUrl(fakeDb,{id:c,cover_path:path}).includes(path));
assert.equal(coverPublicUrl(fakeDb,{id:o,cover_path:path}),'');
const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,1])],'good.png',{type:'image/png'});
const jpeg=new File([new Uint8Array([255,216,255,0,10])],'good.jpg',{type:'image/jpeg'});
const webp=new File([new Uint8Array([82,73,70,70,1,2,3,4,87,69,66,80])],'good.webp',{type:'image/webp'});
for(const file of [png,jpeg,webp]){assert(validateCoverSource(file));await checkCoverHeader(file);}
assert.throws(()=>validateCoverSource(new File(['x'],'evil.svg',{type:'image/svg+xml'})));
assert.throws(()=>validateCoverSource(new File([new Uint8Array(COVER_SOURCE_MAX+1)],'big.jpg',{type:'image/jpeg'})));
await assert.rejects(()=>checkCoverHeader(new File(['fake'],'wrong.jpg',{type:'image/jpeg'})),/contents/);
const api=read('src/production/courseCoverApi.js');
assert(api.includes('await verifiedLiveAdmin(db)'));
assert(api.includes('db.storage.from(COURSE_COVER_BUCKET)')||api.includes('storage=db.storage.from(COURSE_COVER_BUCKET)'));
assert(api.includes('upsert:false'),'New immutable file objects, no overwrite');
assert(api.includes(".update({cover_path:path})")&&api.includes(".update({cover_path:null})"));
assert(api.includes('storage.remove([path])'),'Rollback metadata-failed uploaded file');
assert(!api.includes('technica-private-lessons'));
const sql=read('supabase/migrations/202611070001_p17_course_covers.sql');
for(const marker of ['lms_p17_cover_path_guard','lms_p17_cover_audit',
 'lms_p17_record_cover_change','technica-course-covers',
 'lms_p17_cover_storage_insert','lms_p17_cover_storage_select',
 'lms_p17_cover_storage_delete','public.lms_p1_actor_is_admin()',
 "true,2097152,ARRAY['image/webp']::text[]",
 'ON CONFLICT(id) DO NOTHING','REVOKE ALL ON TABLE public.lms_p17_cover_audit'])
 assert(sql.includes(marker),'Missing cover security contract: '+marker);
assert(!sql.includes("technica-private-lessons"));
assert(!sql.includes("GRANT ALL ON TABLE public.lms_p17_cover_audit TO authenticated"));
const catalog=read('src/production/lmsApi.js');
assert(catalog.includes("'id,slug,title,summary,cover_path,publication_state,created_at'"));
const admin=read('src/production/AdminToolsPanels.jsx');
const cards=read('src/production/LearnerCourseCard.jsx');
const ui=read('src/production/LiveLearnerWorkspace.jsx');
assert(admin.includes('CourseCoverManager')&&admin.includes('onSaved={()=>setRevision'));
assert(cards.includes('<CourseCover')&&cards.includes('Enroll Now'));
assert(cards.includes('Demo checkout completed · no real payment'));
assert(cards.includes("status==='real'?'Enrolled'"));
assert(ui.includes('Active Enrollments')&&ui.includes('Demo Previews'));
assert(ui.includes('courseStatus=c'));
assert(ui.includes('CourseDetailHero'));
assert(ui.includes('full||l.isFreeIntro?<SecureLessonContent'),
 'No demo flag can unlock real lesson material');
assert(read('src/production/liveCourseCards.css').includes('@media(max-width:680px)'));
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 74. P17'));
console.log('PASS P17: public cover asset ownership/admin write, protected lesson separation, responsive premium cards, distinct Real vs Demo groups and course hero.');
