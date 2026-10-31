import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
assert(existsSync(join(root,'index.html')),'build the live Supabase target first');
const files=[];
const walk=dir=>{for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory())walk(p);else if(/\.(js|html|json)$/.test(p))files.push(p);}};
walk(root);
const bundle=files.map(path=>readFileSync(path,'utf8')).join('\n');
const bank=JSON.parse(readFileSync('src/data/aspQuestionBank.json','utf8'));
const sample=bank.find(q=>String(q.prompt||'').length>45)?.prompt;
assert(sample,'ASP bank regression fixture missing');
assert(bundle.includes('LIVE DATABASE MODE'),'production Supabase entry was not emitted');
assert(!bundle.includes('Demo@1234'),'demo credentials included in live bundle');
assert(!bundle.includes('AdminDemo@1234'),'demo administrator credentials included in live bundle');
assert(!bundle.includes(sample.slice(0,45)),'ASP answer bank prompt leaked in live bundle');
// P4 intentionally adds SECURE Quick 10 to live mode; the old text-based
// practice exclusion must not reject it. Bank fixture and demo credential
// absence checks above continue to guarantee isolation.
console.log('PASS P3 live bundle security isolation:',files.length,'compiled files inspected; demo credentials / ASP fixture absent.');
