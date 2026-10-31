import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{PRACTICE_MODES,getLastAttemptInsights,presetPracticeSettings}from'../src/lib/practiceModes.js';
import{createQuestionSet}from'../src/lib/questionSelection.js';
const bank=JSON.parse(readFileSync(new URL('../src/data/aspQuestionBank.json',import.meta.url),'utf8'));
const domains=['domain1','domain2','domain3','domain4','domain5'];
const params={courseId:'asp',domainIds:domains,insights:{wrongIds:['D1-0001','D1-0002'],weakestDomain:'domain1'}};
assert.deepEqual(PRACTICE_MODES.map(m=>m.id),['quick10','timed','domain','weakest','missed','custom','levelup','mock']);
const quick=presetPracticeSettings('quick10',params);
assert.equal(quick.questionCount,10);assert.equal(quick.timerMode,'none');assert.equal(quick.feedbackMode,'each');
const timed=presetPracticeSettings('timed',params);
assert.equal(timed.questionCount,25);assert.equal(timed.timerMode,'whole');assert.equal(timed.customMinutes,20);assert.equal(timed.feedbackMode,'end');
const dom=presetPracticeSettings('domain',{...params,domainId:'domain4'});
assert.deepEqual(dom.selectedTopics,['domain4']);assert.equal(dom.questionCount,25);
assert.equal(presetPracticeSettings('domain',{...params,domainId:'not-a-domain'}),null);
const weakest=presetPracticeSettings('weakest',params);
assert.deepEqual(weakest.selectedTopics,['domain1']);assert.equal(weakest.questionCount,15);
const missed=presetPracticeSettings('missed',params);
assert.equal(missed.pool,'mistakes');assert.deepEqual(missed.wrongIds,params.insights.wrongIds);
assert.equal(missed.questionCount,2);
for(const id of ['levelup','mock','bad-mode'])assert.equal(presetPracticeSettings(id,params),null,'Mode must not start a generic practice attempt: '+id);
assert.equal(presetPracticeSettings('weakest',{...params,insights:{wrongIds:[],weakestDomain:null}}),null);
assert.equal(presetPracticeSettings('missed',{...params,insights:{wrongIds:[],weakestDomain:null}}),null);
const result={courseId:'asp',questions:[
 {id:1,bankId:'D1-0001',domainId:'domain1',correct:0},
 {id:2,bankId:'D1-0002',domainId:'domain1',correct:1},
 {id:3,bankId:'D2-0001',domainId:'domain2',correct:0},
 {id:4,bankId:'D2-0002',domainId:'domain2',correct:2},
 {id:5,bankId:'D3-0001',domainId:'domain3',correct:0}
],answers:{1:2,2:3,3:0,4:2}};
const insight=getLastAttemptInsights(result,'asp',domains);
assert.equal(insight.attempted,4);assert.deepEqual(insight.wrongIds,['D1-0001','D1-0002']);assert.equal(insight.weakestDomain,'domain1');
assert.equal(getLastAttemptInsights(result,'psee',domains).attempted,0,'Cross-course history cannot leak');
const actualQuick=createQuestionSet({bank,domainIds:domains,count:quick.questionCount,balanced:true});
assert.equal(actualQuick.questions.length,10);assert.equal(new Set(actualQuick.questions.map(q=>q.bankId)).size,10);
const actualTimed=createQuestionSet({bank,domainIds:domains,count:timed.questionCount,balanced:true});
assert.equal(actualTimed.questions.length,25);
const actualDomain=createQuestionSet({bank,domainIds:dom.selectedTopics,count:25});
assert.ok(actualDomain.questions.every(q=>q.domainId==='domain4'));
const actualMissed=createQuestionSet({bank,domainIds:domains,count:missed.questionCount,pool:'mistakes',wrongIds:missed.wrongIds});
assert.equal(actualMissed.questions.length,2);
assert.ok(actualMissed.questions.every(q=>missed.wrongIds.includes(q.bankId)));
const page=readFileSync(new URL('../src/pages/PracticePage.jsx',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/lib/store.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/practiceModes.css',import.meta.url),'utf8');
assert.ok(page.includes('PRACTICE_MODES.map('));
assert.ok(page.includes('practice-domain-picker'));
assert.ok(source.includes('practiceModeLabel:setup.practiceModeLabel'));
assert.ok(css.includes('@media(max-width:740px)'));
console.log('PASS practice quick mode presets, real course/domain mistake selection and disabled adaptive/mock gate');
