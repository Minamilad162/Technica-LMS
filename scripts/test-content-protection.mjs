import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 PROTECTION_HOLD_MS,WATERMARK_POSITIONS,formatWatermarkLabel,
 isPotentialCaptureShortcut,isEditableElement,shouldBlockContentEvent,
 watermarkIdentity
}from'../src/lib/contentProtection.js';

assert.ok(PROTECTION_HOLD_MS>=500&&PROTECTION_HOLD_MS<=2500);
assert.equal(WATERMARK_POSITIONS,9);
assert.equal(watermarkIdentity({employeeId:'TC1001',email:'learner@example.com'}),'TC1001');
assert.equal(watermarkIdentity({id:'demo learner!'}),'demolearner');
assert.equal(watermarkIdentity(null),'LEARNER');
const date=new Date('2026-10-31T09:30:00.000Z');
assert.equal(formatWatermarkLabel({identity:'TC1001',sessionId:'A1B2C3',time:date}),
 'TECHNICA · TC1001 · A1B2C3 · 2026-10-31 09:30 UTC');

for(const key of [{key:'PrintScreen'},{code:'PrintScreen'},{keyCode:44},
 {key:'3',metaKey:true,shiftKey:true},{key:'4',metaKey:true,shiftKey:true},
 {key:'5',metaKey:true,shiftKey:true},{key:'s',metaKey:true,shiftKey:true}]){
 assert.ok(isPotentialCaptureShortcut(key),'Expected best-effort capture-key heuristic '+JSON.stringify(key));
}
for(const key of [{key:'a',ctrlKey:true},{key:'F12'},{key:'PrintScreen',repeat:true},
 {key:'3',metaKey:true},{key:'p',ctrlKey:true}]){
 assert.equal(isPotentialCaptureShortcut(key),false,'Do not misclassify '+JSON.stringify(key));
}
const element={closest(query){return query.includes('input')?this.editable:null},editable:true};
assert.equal(isEditableElement(element),true);
element.editable=false;
assert.equal(isEditableElement(element),false);
const root={contains(node){return node===element}};
assert.equal(shouldBlockContentEvent(element,root),true);
element.editable=true;
assert.equal(shouldBlockContentEvent(element,root),false);
assert.equal(shouldBlockContentEvent({},root),false);

const component=readFileSync(new URL('../src/components/ProtectedContent.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/contentProtection.css',import.meta.url),'utf8');
const quiz=readFileSync(new URL('../src/pages/QuizPage.jsx',import.meta.url),'utf8');
const learning=readFileSync(new URL('../src/pages/LearningPage.jsx',import.meta.url),'utf8');
const review=readFileSync(new URL('../src/pages/ResultsPage.jsx',import.meta.url),'utf8');
const practiceReview=readFileSync(new URL('../src/pages/PracticeResultsPage.jsx',import.meta.url),'utf8');

for(const token of ['onCopyCapture','onCutCapture','onDragStartCapture',
 'onContextMenuCapture','isPotentialCaptureShortcut','tc-watermark-layer','tc-capture-curtain']){
 assert.ok(component.includes(token),'ProtectedContent must provide '+token);
}
assert.ok(quiz.includes('kind="exam-question"'),'Assessment and Practice questions protected');
assert.ok(learning.includes("kind='lesson-video'")||learning.includes("'lesson-video'"),'Video lesson wrapper protected');
assert.ok(learning.includes('kind="lesson-quiz"'),'Learning quiz protected');
assert.ok(learning.includes('kind="lesson-review"'),'Knowledge review protected');
assert.ok(review.includes('kind="answer-review"'),'Assessment review protected');
assert.ok(practiceReview.includes('kind="answer-review"'),'Practice review protected');
for(const selector of ['@media print','print-color-adjust:exact','tc-watermark-layer','pointer-events:none','tc-capture-curtain']){
 assert.ok(css.includes(selector),'CSS should provide '+selector);
}
console.log('PASS: scoped capture-key heuristic, non-sensitive watermark, copy/drag/print deterrence, assessment/lesson/review integration.');
console.log('NOT TESTED/NOT POSSIBLE on web: universal screenshot or OS screen-recorder interception.');
