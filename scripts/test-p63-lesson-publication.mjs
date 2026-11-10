import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeLessonPublication,nestPublishedOutline,isFullCourseEnrolled} from '../src/production/learnerJourneyApi.js';
const read=path=>readFileSync(path,'utf8');
const d='20000000-0000-0000-0000-000000000001',t='30000000-0000-0000-0000-000000000001',
 a='40000000-0000-0000-0000-000000000001',b='40000000-0000-0000-0000-000000000002',
 c='10000000-0000-0000-0000-000000000001';
const tree=[{id:d,topics:[{id:t,lessons:[{id:a,publication_state:'draft'}, {id:b,publication_state:'draft'}]}]}];
assert.deepEqual(summarizeLessonPublication(tree),{total:2,published:0,draft:2,draftIds:[a,b]});
assert.deepEqual(summarizeLessonPublication([{id:d,topics:[{id:t,lessons:[
 {id:a,publication_state:'published'}, {id:b,publication_state:'draft'}]}]}]),
 {total:2,published:1,draft:1,draftIds:[b]});
assert.deepEqual(summarizeLessonPublication([]),{total:0,published:0,draft:0,draftIds:[]});
assert.throws(()=>summarizeLessonPublication([{topics:[{lessons:[{id:a,publication_state:'published'},
 {id:a,publication_state:'draft'}]}]}]),/Invalid Lesson/);
const active={id:'50000000-0000-0000-0000-000000000001',status:'active',starts_at:new Date(Date.now()-3600000).toISOString(),ends_at:new Date(Date.now()+92*86400000).toISOString()};
assert.equal(isFullCourseEnrolled([],c,active),true);
assert.deepEqual(nestPublishedOutline([],c),[]);
const admin=read('src/production/AdminToolsPanels.jsx');
const learner=read('src/production/LiveLearnerWorkspace.jsx');
assert.match(admin,/onClick=\{publishDraftLessons\}/);
assert.match(admin,/window\.confirm\('Publish '/);
assert.match(admin,/await verifiedLiveAdmin\(db\)/);
assert.match(admin,/await setAdminPublished\(db,'lms_lessons',id,'published'\)/);
assert.match(admin,/Draft · Hidden from learners/);
assert.match(admin,/Published · Learner-visible/);
assert.match(admin,/hidden from learners, even when their subscription is active/);
assert.match(learner,/Lessons are waiting for publication/);
assert.match(learner,/Your subscription is active/);
assert.match(learner,/You do not need another plan/);
assert.match(learner,/fetchP15Outline\(db,chosen\.id\)/);
assert.match(read('src/production/learnerJourneyApi.js'),/lms_p15_course_outline/);
console.log('P63 lesson publication UX/access contracts PASS');
