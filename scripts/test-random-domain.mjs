import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createQuestionSet} from '../src/lib/questionSelection.js';
const bank=JSON.parse(readFileSync(new URL('../src/data/aspQuestionBank.json',import.meta.url),'utf8'));
const domains=JSON.parse(readFileSync(new URL('../src/data/aspDomains.json',import.meta.url),'utf8'));
const draw=options=>createQuestionSet({bank,...options}).questions;
const unique=(questions)=>assert.equal(new Set(questions.map(q=>q.bankId)).size,questions.length);
for(const d of domains){
 const questions=draw({domainIds:[d.id],count:50});
 assert.equal(questions.length,50,`${d.name} session must have 50 questions`);
 assert(questions.every(q=>q.domainId===d.id));
 assert(questions.every((q,i)=>q.id===i+1));
 assert(questions.every(q=>q.options.length===4&&q.correct>=0&&q.correct<=3&&!!q.explanation));
 unique(questions);
 console.log(`PASS ${d.name}: 50 random unique questions out of ${d.questions}`);
}
const signatures=new Set(Array.from({length:5},()=>draw({domainIds:['domain2'],count:50}).map(q=>q.bankId).join('|')));
assert(signatures.size>=2,'Every retake must not repeat an identical fixed set');
for(const n of [1,10,25,37,50]){
 const selected=draw({domainIds:['domain3'],count:n});assert.equal(selected.length,n);unique(selected);
}
const mixed=draw({domainIds:domains.map(d=>d.id),count:50,balanced:true});
unique(mixed);const counts=domains.map(d=>mixed.filter(q=>q.domainId===d.id).length);assert.deepEqual(counts,[10,10,10,10,10]);
const selectedOne=draw({domainIds:['domain4'],count:50,pool:'unseen',seenIds:bank.filter(q=>q.domainId==='domain4').slice(0,290).map(q=>q.bankId)});
assert.equal(selectedOne.length,10);assert(selectedOne.every(q=>q.domainId==='domain4'));
const mistakes=bank.filter(q=>q.domainId==='domain1').slice(0,7).map(q=>q.bankId);
const selectedMistakes=draw({domainIds:['domain1'],count:50,pool:'mistakes',wrongIds:mistakes});
assert.equal(selectedMistakes.length,7);assert(selectedMistakes.every(q=>mistakes.includes(q.bankId)));
const fallback=createQuestionSet({bank,domainIds:['domain2'],count:50,pool:'mistakes',wrongIds:[]});
assert.equal(fallback.questions.length,50);assert.equal(fallback.fallback,true);
assert.equal(draw({domainIds:['domain1'],count:500}).length,50);
console.log('PASS: random retakes, customization, balanced all-domain test, unseen/mistakes, fallback, max 50, no duplicate questions.');
