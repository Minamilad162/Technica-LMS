import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
const htmlPath=join(root,'asp-review.html');
assert(existsSync(htmlPath),'Default Cloudflare build must contain /asp-review.html');
const html=readFileSync(htmlPath,'utf8');
assert(html.includes('ASP Question Review'),'The real review page title must be included');
assert(!html.includes('/src/main.jsx'),'Standalone review must never use browser-local Demo entry');
assert(!html.includes('aspQuestionBank.json'),'Standalone review must not inline historic ASP questions');
const entryScripts=[...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(x=>x[1]);
assert(entryScripts.length>0,'Compiled review HTML must link its JS runtime');
for(const script of entryScripts){
 const path=join(root,script.replace(/^\.?\//,''));
 assert(existsSync(path),'Built review asset is missing: '+script);
}
const mainHtml=readFileSync(join(root,'index.html'),'utf8');
assert(mainHtml.includes('assets/'),'Original published site must still be built');
console.log('PASS deployed-site build emits working isolated /asp-review.html with real secure entry and preserves index.html');
