import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {practiceQuestionOutcome} from '../src/production/practiceQuestionReview.js';

const q={id:'q1',selectedIndex:2};
assert.equal(practiceQuestionOutcome({question:q,feedback:{correctIndex:2},feedbackTiming:'each'}),'correct');
assert.equal(practiceQuestionOutcome({question:q,feedback:{correctIndex:1},feedbackTiming:'each'}),'incorrect');
assert.equal(practiceQuestionOutcome({question:q,feedback:{correctIndex:1},feedbackTiming:'end'}),null,
 'Deferred feedback must not leak correctness before final submission.');
assert.equal(practiceQuestionOutcome({question:q,feedbackTiming:'each'}),null);
assert.equal(practiceQuestionOutcome({question:{...q,selectedIndex:null},feedback:{correctIndex:2},feedbackTiming:'each'}),null);
assert.equal(practiceQuestionOutcome({question:{...q,correctIndex:2},feedbackTiming:'end',finished:true}),'correct');
assert.equal(practiceQuestionOutcome({question:{...q,correctIndex:0},feedbackTiming:'end',finished:true}),'incorrect');
assert.equal(practiceQuestionOutcome({question:{...q},feedback:{correctIndex:0},feedbackTiming:'end',finished:true}),null,
 'Only server final result can drive final correctness.');

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const nav=read('src/production/ExamQuestionNavigator.jsx');
const css=read('src/production/examQuestionNavigator.css');
const practice=read('src/production/LivePractice.jsx');
const configured=read('src/production/LiveBuildYourOwn.jsx');
const configuredCss=read('src/production/liveBuildYourOwn.css');
for(const v of ['getOutcome','correct','incorrect','flagged','aria-current','canVisit']){
 assert.ok(nav.includes(v),'Question map lost '+v);
}
assert.ok(nav.includes("flaggedQuestion?'flagged':visibleOutcome"),
 'Flag visual priority must stay above answer status.');
for(const c of ['button.correct','button.incorrect','button.flagged','button.current']){
 assert.ok(css.includes(c),'Missing map style: '+c);
}
assert.ok(css.includes('@media(max-width:960px)'));
assert.ok(practice.includes('practiceQuestionOutcome'));
assert.ok(practice.includes("feedbackTiming:attempt.mode==='quick10'?'each':'end'"));
assert.ok(practice.includes("onJump={setSelected}"));
assert.ok(practice.includes('Flag for review'));
assert.ok(practice.includes('> Previous</button>'));
assert.ok(practice.includes('>Next <ChevronRight'));
assert.ok(configured.includes("feedbackTiming:attempt.feedbackTiming"));
assert.ok(configured.includes("const marked=attempt?.feedbackTiming==='each'?feedback[current?.id]:null"));
assert.ok(configured.includes('const goPrevious=()=>'));
assert.ok(configured.includes('const goNext=()=>'));
assert.ok(configured.includes('previousPosition===undefined'));
assert.ok(configured.includes('canVisit={(q,i)=>finished||(i+1<=currentPosition'));
assert.ok(configured.includes('!isCurrentQuestion||wasAnswered'),
 'P44 past delivered questions must remain read-only.');
assert.ok(configured.includes('onClick={goPrevious}'));
assert.ok(configured.includes('onClick={goNext}'));
assert.ok(configured.includes('Flag for review'));
assert.ok(configuredCss.includes('.byo-question-nav'));
for(const invariant of ['ScientificCalculator','answerConfiguredPractice(db,','nextConfiguredPractice(db,','finishSecurePractice(db,','useQuestionFullscreenGuard']){
 assert.ok(configured.includes(invariant),'Configured Practice regression: '+invariant);
}
for(const invariant of ['ScientificCalculator','ExamQuestionNavigator','answerAdaptivePractice(db,','startAllCoursesPractice(db,']){
 assert.ok(practice.includes(invariant),'Practice regression: '+invariant);
}
console.log('P90 PASS: feedback timing protected, colored numbered navigator, flags, and Previous/Next preserved.');
