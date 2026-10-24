import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../src/data/aspQuestionBank.json',import.meta.url),'utf8'));
const domains=JSON.parse(readFileSync(new URL('../src/data/aspDomains.json',import.meta.url),'utf8'));
const expected=[250,625,200,300,250];
const ids=new Set();
if(data.length!==1625||domains.length!==5)throw Error(`Wrong counts: ${data.length} questions, ${domains.length} domains`);
for(const [i,d] of domains.entries()){
 const domainQuestions=data.filter(q=>q.domainId===d.id);
 if(d.questions!==expected[i]||domainQuestions.length!==expected[i])throw Error(`Count mismatch for ${d.name}`);
 for(const q of domainQuestions){
  if(ids.has(q.bankId))throw Error(`Duplicate question ID ${q.bankId}`);ids.add(q.bankId);
  if(q.topic!==d.name||q.domain!==d.name||q.options.length!==4)throw Error(`Wrong domain or options in ${q.bankId}`);
  if(!q.prompt.trim()||!q.explanation.trim()||!q.options.every(x=>typeof x==='string'&&x.trim())||!Number.isInteger(q.correct)||q.correct<0||q.correct>3)throw Error(`Invalid question data: ${q.bankId}`);
 }
 console.log(`${d.name}: ${domainQuestions.length} questions · 4 options + correct index + explanation verified`);
}
console.log(`PASS: ${data.length} unique imported Excel questions across 5 domains.`);
