import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {LESSON_TYPES, cleanLessonForSave, formatVideoRuntime, readVideoDurationSeconds} from '../src/lib/lessonMedia.js';

assert.deepEqual(LESSON_TYPES,['Video','PDF']);
const media=[
 {id:'v1',kind:'video',durationSeconds:96},
 {id:'v2',kind:'video',durationSeconds:null},
 {id:'p1',kind:'pdf'}
];
const form={title:'  Boiler Safety  ',type:'Video',description:' Intro ',mediaId:'v1',duration:99};
const video=cleanLessonForSave(form,media);
assert.deepEqual(video,{title:'Boiler Safety',type:'Video',description:'Intro',mediaId:'v1',durationSeconds:96});
assert.equal('duration' in video,false);
const pdf=cleanLessonForSave({...form,type:'PDF',mediaId:'p1',durationSeconds:96},media);
assert.deepEqual(pdf,{title:'Boiler Safety',type:'PDF',description:'Intro',mediaId:'p1',durationSeconds:null});
assert.equal('duration' in pdf,false);
assert.equal(cleanLessonForSave({...form,type:'Video',mediaId:'p1'},media).mediaId,'');
assert.equal(cleanLessonForSave({...form,type:'Video',mediaId:'v2',durationSeconds:45},media).durationSeconds,45);
assert.equal(cleanLessonForSave({...form,type:'Video',mediaId:''},media).durationSeconds,null);
assert.throws(()=>cleanLessonForSave({...form,type:'Quiz'},media),/Video or PDF/);
assert.throws(()=>cleanLessonForSave({...form,type:'Reading'},media),/Video or PDF/);
assert.equal(formatVideoRuntime(null),'');
assert.equal(formatVideoRuntime(0),'');
assert.equal(formatVideoRuntime(9),'0:09');
assert.equal(formatVideoRuntime(96),'1:36');
assert.equal(formatVideoRuntime(3665),'1:01:05');
assert.equal(await readVideoDurationSeconds(null),null);

// Native media metadata is sourced from the actual file, not a manually entered duration.
const originalDocument=globalThis.document;
const originalCreate=URL.createObjectURL;
const originalRevoke=URL.revokeObjectURL;
let events={};let revoked=false;
globalThis.document={createElement(type){assert.equal(type,'video');return {preload:'',src:'',duration:83.8,addEventListener(name,listener){events[name]=listener},removeAttribute(){},load(){if(this.src)queueMicrotask(()=>events.loadedmetadata?.())}}}};
URL.createObjectURL=()=> 'blob:local-video';URL.revokeObjectURL=()=>{revoked=true};
try {assert.equal(await readVideoDurationSeconds({name:'sample.mp4'}),84);assert.equal(revoked,true)}
finally {globalThis.document=originalDocument;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke}

const builder=readFileSync(resolve('src/pages/BuilderPage.jsx'),'utf8');
assert(builder.includes('<option>Video</option><option>PDF</option>'));
assert(!builder.includes('<option>Reading</option>'));
assert(!builder.includes('<option>Quiz</option>'));
assert(!builder.includes('Duration in minutes'));
assert(!builder.includes('lesson.duration} min'));
assert(!builder.includes('m.lessons.reduce((s,l)=>s+Number(l.duration'));
assert(builder.includes('cleanLessonForSave('));
assert(builder.includes('readVideoDurationSeconds(file)'));
const courseMedia=readFileSync(resolve('src/components/CourseMaterialsPanel.jsx'),'utf8');
assert(courseMedia.includes('readVideoDurationSeconds(file)'));
const assessment=readFileSync(resolve('src/lib/courseAssessment.js'),'utf8');
assert(assessment.includes('durationMinutes'));
console.log('PASS: Video/PDF-only lesson creation, no manual duration, automatic video metadata, PDF without time, legacy validation and unchanged assessment timer.');
