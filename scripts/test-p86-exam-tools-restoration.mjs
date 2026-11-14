import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const calc=read('src/components/ScientificCalculator.jsx');
const calcCss=read('src/scientificCalculator.css');
const quiz=read('src/pages/QuizPage.jsx');
const practice=read('src/production/LivePractice.jsx');
const custom=read('src/production/LiveBuildYourOwn.jsx');
const selected=read('src/production/LiveSelectedMockExam.jsx');
const official=read('src/production/LiveMockExam.jsx');
const map=read('src/production/ExamQuestionNavigator.jsx');
const mapCss=read('src/production/examQuestionNavigator.css');
const practiceApi=read('src/production/practiceApi.js');
const selectedApi=read('src/production/selectedMockApi.js');
const mockApi=read('src/production/mockApi.js');

// Reuse the previously accepted TI-30XS-inspired calculator; do not replace its engine.
for(const marker of ['CalculatorPhysicalKeypad','MathTemplateEditor','evaluateScientific',
 'exactScientific','oneVariableStats','twoVariableStats','makeFunctionTable',
 'freshVariables','makeListState','createPortal','portalTarget||document.body',
 'tc-calc-window','tc-calc-minimized','inline?calculatorSurface']){
 assert.ok(calc.includes(marker),'Calculator regression: '+marker);
}
assert.match(calc,/import '\.\.\/scientificCalculator\.css'/);
assert.match(calc,/import '\.\.\/calculatorPhysical\.css'/);
assert.match(calcCss,/:fullscreen \.tc-calc-launch/);
assert.match(calc,/const calculatorSurface=<>/,'Calculator render tree must remain intact');
assert.match(calc,/inline\?calculatorSurface:createPortal\(calculatorSurface,portalTarget\|\|document\.body\)/);
assert.match(calcCss,/P87: float above the exam surface/,'Dedicated floating exam dock is required');
assert.match(calcCss,/\.tc-calc-launch\{[\s\S]*?left:clamp\(12px,2vw,24px\)/);
assert.match(calcCss,/z-index:2147483000/);
assert.match(calc,/<option value="FLOAT">FLOAT<\/option>/,'FLOAT precision mode lost');
assert.match(calc,/<option value=\{String\(i\)\} key=\{i\}>FIX \{i\}<\/option>/);

assert.match(quiz,/ScientificCalculator/,'Earlier Lesson and Quiz calculator remains intact');

// The main learner exam paths all render the same calculator inside native fullscreen.
for(const [name,src,ref] of [
 ['Practice',practice,'containerRef.current'],
 ['Build Your Own',custom,'rootRef.current'],
 ['Course Mock',selected,'ref.current'],
 ['ASP Mock',official,'ref.current']]){
 assert.ok(src.includes('ScientificCalculator'),name+' lost the calculator');
 assert.match(src,/<ScientificCalculator[^>]*inline/,name+' calculator must mount in exam fullscreen DOM');
 assert.ok(src.includes('useQuestionFullscreenGuard'),name+' fullscreen guard was lost');
}
for(const [name,src] of [['Practice',practice],['Build Your Own',custom],['ASP Mock',official]]){
 assert.ok(src.includes('ExamQuestionNavigator'),name+' lost question map');
}
assert.ok(selected.includes('live-mock-sidebar'),'Course Mock P76 right-side map must stay intact');
assert.ok(selected.includes('live-mock-navigator-toggle'),'Course Mock mobile map must stay collapsible');
assert.ok(selected.includes("save(q.selectedIndex,!q.flagged)"),'Course Mock flag must preserve answer');
assert.ok(official.includes("save(q.selectedIndex,!q.flagged)"),'ASP Mock flag must preserve answer');
assert.ok(!official.includes("save(null,!q.flagged)"),'Flag must not silently clear an answer');

// Practice flags are separate from adaptive grading and clear on a new attempt.
assert.ok(practice.includes('setFlaggedQuestions({})'));
assert.ok(practice.includes('flaggedQuestions[current.id]'));
assert.ok(practice.includes('answerAdaptivePractice(db,'));
assert.ok(practice.includes('startAllCoursesPractice(db,'));
assert.ok(practice.includes("mode==='custom'?<LiveBuildYourOwn"));

// Configured P44 is sequential. Flagged past items can be revisited read-only,
// never answered retroactively without the dedicated backend rules.
assert.ok(custom.includes('inspectedPosition'));
assert.ok(custom.includes('!isCurrentQuestion||wasAnswered'));
assert.ok(custom.includes('i+1<=currentPosition'));
assert.ok(custom.includes('setInspectedPosition(null)'));
for(const rpc of ['startConfiguredPractice','answerConfiguredPractice','nextConfiguredPractice','finishSecurePractice']){
 assert.ok(custom.includes(rpc+'(db,'),'P44 server route was lost: '+rpc);
}
assert.ok(practiceApi.includes("'lms_p44_next'"));
assert.ok(selectedApi.includes('v.questionCount!==200'));
assert.ok(mockApi.includes('200'));

assert.ok(map.includes('hasPositions')&&map.includes('q?.position===i+1'));
assert.ok(map.includes('aria-current'));
assert.ok(map.includes('isFlagged'));
assert.ok(mapCss.includes('grid-template-columns:minmax(0,1fr) 270px'));
assert.ok(mapCss.includes('@media(max-width:960px)'));
assert.ok(mapCss.includes('.tc-exam-map-grid.is-open'));
assert.ok(mapCss.includes('prefers-reduced-motion'));
console.log('P86 PASS source contract: original calculator, live exam flags/navigation, P44 progression, protected fullscreen and responsive map.');
