import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILD_COUNTS,DEFAULT_BUILD_YOUR_OWN,prepareBuildYourOwn} from '../src/production/buildYourOwnConfig.js';
const read=p=>readFileSync(p,'utf8');
const css=read('src/production/buildYourOwn.css');
const jsx=read('src/production/BuildYourOwnSettings.jsx');
const app=read('src/production/LiveBuildYourOwn.jsx');
assert(css.includes('/* P66 — compact 100%-zoom density'),'P66 density section missing');
const compact=css.split('/* P66 — compact 100%-zoom density')[1];
const required=[
 '.byo-hero{min-height:94px;padding:15px 21px',
 '.byo-premium-content{padding:13px 15px 15px',
 '.byo-card-grid{gap:12px 13px',
 '.byo-settings-card{padding:13px 14px',
 '.byo-card-title h5{font-size:14px',
 '.byo-count-presets button{min-height:40px;font-size:14px',
 '.byo-pill{min-height:40px',
 '.byo-pill-answer,.byo-premium .byo-pill-timing',
 '.byo-bottom-card{min-height:0;padding:12px 15px',
 '.byo-session-summary{min-height:0',
 '.byo-start-button{min-height:43px',
 '@container (min-width:780px) and (max-width:1040px)',
 '@container (max-width:520px)',
 '@container (max-width:600px)',
 '@media(max-width:700px)',
 '@media(max-width:385px)'
];
for(const selector of required)assert(compact.includes(selector),'Compact design missing '+selector);
assert(!/\.byo-premium\s*\{[^}]*\btransform:\s*scale\(/.test(compact),'Never scale the entire Practice form');
assert(!/\.byo-premium \.byo-premium-content\s*\{[^}]*\btransform:\s*scale\(/.test(compact),'Do not scale the form contents');
assert(!/zoom\s*:/.test(compact),'No browser zoom hacks');
assert.deepEqual(BUILD_COUNTS,[10,25,50,100]);
assert.equal(DEFAULT_BUILD_YOUR_OWN.count,50);
assert.deepEqual(prepareBuildYourOwn(DEFAULT_BUILD_YOUR_OWN),{
 count:50,durationSeconds:5400,perQuestionSeconds:0,
 difficulty:'mixed',feedbackTiming:'end',camera:false,domainId:null
});
for(const field of [
 "set('count',n)","set('difficulty',v)","set('feedbackTiming',v)","set('timerMode',v)",
 "set('domainId',e.target.value)","set('camera',e.target.checked)",
 "set('totalMinutes',n)","set('secondsPerQuestion',n)"
])assert(jsx.includes(field),'Do not remove or unbind '+field);
assert.equal((jsx.match(/onClick=\{onStart\}/g)||[]).length,1,'Keep one Start Practice action');
assert(jsx.includes('aria-live="polite"'),'Keep live session summary');
assert(app.includes('startConfiguredPractice(db,'),'Backend-authorized practice start unchanged');
assert(app.includes('startAllCoursesConfiguredPractice(db,'),'All Courses practice unchanged');
assert(app.includes('useQuestionFullscreenGuard'),'Fullscreen safety unchanged');
assert(app.includes('getUserMedia')&&app.includes('track.stop()'),'Camera lifecycle unchanged');
console.log('P66 compact Build Your Own layout and P44 behavior contracts PASS');
