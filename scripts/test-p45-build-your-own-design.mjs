import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_BUILD_YOUR_OWN,prepareBuildYourOwn,BUILD_COUNTS} from '../src/production/buildYourOwnConfig.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/production/BuildYourOwnSettings.jsx');
const css=read('src/production/buildYourOwn.css');
const session=read('src/production/LiveBuildYourOwn.jsx');
const app=read('src/production/LivePractice.jsx');
const sql=read('supabase/migrations/202611090001_p44_configured_build_your_own.sql');
const mock=read('src/production/LiveMockExam.jsx');

const headings=['<h3>Build Your Own Practice','aria-label="Number of Questions"',
 'aria-label="Question Difficulty"','aria-label="Answer Display"',
 'className="byo-settings-card byo-timing-card" aria-label="Timing"',
 'Focus (Domain)','Camera (Optional)','aria-label="Session Summary"'];
const positions=headings.map(h=>ui.indexOf(h));
assert(positions.every(p=>p>=0),'Every approved screenshot heading must be rendered');
assert(positions.every((p,i)=>i===0||p>positions[i-1]),'Preserve reference card reading order');

for(const label of [
 'Customize your practice session exactly the way you want.',
 'Max 100','After each question','At the end (summary)',
 'No timer','Total time','Per question','Both','Total Exam Time',
 'Time Per Question','All course domains','Live camera preview during the practice',
 'Mixed','Easy','Medium','Hard','Adaptive','not recorded',
 'Start Practice','Camera: ','Questions'
])assert(ui.includes(label),'Missing approved screenshot copy: '+label);

assert.deepEqual(BUILD_COUNTS,[10,25,50,100]);
assert.deepEqual(DEFAULT_BUILD_YOUR_OWN,{
 count:50,timerMode:'whole',totalMinutes:90,secondsPerQuestion:90,
 feedbackTiming:'end',difficulty:'mixed',camera:false,domainId:''
});
assert.deepEqual(prepareBuildYourOwn(DEFAULT_BUILD_YOUR_OWN),{
 count:50,durationSeconds:5400,perQuestionSeconds:0,
 difficulty:'mixed',feedbackTiming:'end',camera:false,domainId:null
});

assert(ui.includes('value={value.count}'));
assert(ui.includes("onClick={()=>set('count',n)}"));
for(const text of [
 "onSelect={v=>set('difficulty',v)}",
 "onSelect={v=>set('feedbackTiming',v)}",
 "onSelect={v=>set('timerMode',v)}",
 "onChange={e=>set('domainId',e.target.value)}",
 "onChange={e=>set('camera',e.target.checked)}",
 "onChange={n=>set('totalMinutes',n)}",
 "onChange={n=>set('secondsPerQuestion',n)}"
])assert(ui.includes(text),'Setting must be controlled: '+text);
assert(ui.includes('role="group"')&&ui.includes('aria-pressed={selected}'));
assert(ui.includes('aria-label="Camera preview"'));
assert(ui.includes('aria-live="polite"'));
assert(ui.includes("value.timerMode==='whole'")&&ui.includes("value.timerMode==='question'"));
assert(ui.includes('onClick={onStart}'));
assert.equal((ui.match(/onClick=\{onStart\}/g)||[]).length,1,'Only ONE Start Practice action');
assert(session.includes('onStart={()=>void start()} busy={busy} access={access}'),
 'Summary Start button invokes real P44 start');
assert(!session.includes('byo-start-row'),'Remove separate duplicate Start button');

for(const className of [
 '.byo-premium','.byo-hero','.byo-hero-logo','.byo-hero-art',
 '.byo-target-graphic','.byo-checklist-graphic','.byo-card-grid',
 '.byo-settings-card','.byo-bottom-card','.byo-session-summary',
 '.byo-summary-metrics','.byo-start-button',
 '@container (max-width:1040px)','@container (max-width:600px)',
 '@media(max-width:700px)','@media(prefers-reduced-motion:reduce)',
 '#006673','#11a39a'
])assert(css.includes(className),'Missing approved design/responsive style: '+className);
for(const oldAccent of ['#5f35e8','#3c6af2','#8345f5','#4025d6','#8541f6','#3967f2','#9251ff','#4526db','#7041e9']){
 assert(!css.includes(oldAccent),'Old violet accent still leaks into redesigned Practice: '+oldAccent);
}
for(const newColor of [
 '#0b263a','#006673','#11a39a','#dff7ec','#eef8f6','#e8f7f2','#dce8ec'
])assert(css.includes(newColor),'Missing Technica navy/teal/mint token '+newColor);
assert(css.includes('background:linear-gradient(150deg,#0d9b8c,#006673 74%)'),
 'Start CTA must use primary Technica teal');
assert(css.includes('background:linear-gradient(114deg,#f7fbfa 0%,#eef8f6 48%,#e3f4f0 100%)'),
 'Hero must use premium light mint gradient');
assert(ui.includes('grid-template-columns')===false,'Layout is authored in CSS only');
// P48: narrow cards must wrap labels instead of allowing adjacent option overlap.
for(const rule of [
 '.byo-pill{white-space:normal',
 '.byo-pill>span:last-child{min-width:0;overflow-wrap:break-word}',
 '.byo-difficulty-card,.byo-timing-card,.byo-answer-card{container-type:inline-size}',
 '@container (max-width:520px)',
 '.byo-difficulty-options{grid-template-columns:repeat(3,minmax(0,1fr))',
 '.byo-timing-options{grid-template-columns:repeat(2,minmax(0,1fr))',
 '@container (max-width:330px)',
 '.byo-summary-metrics>span{min-width:0;white-space:normal',
 '@container (max-width:1450px)',
 '.byo-summary-metrics{order:2;flex:1 1 100%;display:grid',
 'grid-template-columns:repeat(5,minmax(0,1fr))',
 '@container (max-width:920px)',
 'grid-template-columns:repeat(3,minmax(0,1fr))',
 '@container (max-width:600px)',
 'grid-template-columns:repeat(2,minmax(0,1fr))'
])assert(css.includes(rule),'P48 text reflow missing: '+rule);
assert(!ui.includes('<img'),'No screenshot embedding while fixing text');
assert(!ui.includes('<img'),'Do not embed screenshot as image');
assert(app.includes("mode==='custom'?<LiveBuildYourOwn"),'Preserve original Practice route');
assert(session.includes('startConfiguredPractice(db,'));
assert(session.includes('answerConfiguredPractice(db,'));
assert(session.includes('nextConfiguredPractice(db,'));
assert(session.includes('useQuestionFullscreenGuard'));
assert(session.includes('getUserMedia')&&session.includes('track.stop()'));
assert(sql.includes('p_count NOT BETWEEN 1 AND 100'),'Backend 100 cap unchanged');
assert(mock.includes('200 fixed questions · 300 minutes'),'Official P10 Mock unchanged');
assert(read('TECHNICA_LMS_MASTER_BLUEPRINT.md').includes('## 102. P45'));

console.log('PASS P45 compact reference: correct cards, copy, gradients, dynamic summary, single working Start, keyboard/mobile, preserved P44/P10.');
