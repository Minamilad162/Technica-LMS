import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
const htmlPath=join(root,'asp-review.html');
assert(existsSync(htmlPath),'Default Cloudflare build must contain /asp-review.html');
const html=readFileSync(htmlPath,'utf8');
assert(html.includes('ASP Question Review'),'The real review page title must be included');
assert(!html.includes('/src/main.jsx'),'Standalone review must never use browser-local Demo entry');
assert(!html.includes('src/production/main.jsx'),'Standalone review uses dedicated secure entry, not pathname-heuristic entry');
assert(!html.includes('aspQuestionBank.json'),'Standalone review must not inline historic ASP questions');
const entryScripts=[...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(x=>x[1]);
assert(entryScripts.length>0,'Compiled review HTML must link its JS runtime');
for(const script of entryScripts){
 const path=join(root,script.replace(/^\.?\//,''));
 assert(existsSync(path),'Built review asset is missing: '+script);
}
const mainHtml=readFileSync(join(root,'index.html'),'utf8');
assert(mainHtml.includes('assets/'),'Original published site must still be built');
// CI injects harmless public placeholders to verify the build-time VITE variables
// are actually embedded into the browser JS. No private keys are ever tested.
if(process.env.REVIEW_EXPECT_PUBLIC_BUILD_VARS==='1'){
 const emittedJS=readdirSync(join(root,'assets')).filter(x=>x.endsWith('.js'))
   .map(x=>readFileSync(join(root,'assets',x),'utf8')).join('\\n');
 assert(process.env.VITE_SUPABASE_URL,'CI fixture missing VITE_SUPABASE_URL');
 assert(process.env.VITE_SUPABASE_ANON_KEY,'CI fixture missing VITE_SUPABASE_ANON_KEY');
 assert(emittedJS.includes(process.env.VITE_SUPABASE_URL),
   'Supabase URL missing from compiled browser assets: build variables not injected');
 assert(emittedJS.includes(process.env.VITE_SUPABASE_ANON_KEY),
   'Supabase publishable key missing from compiled browser assets: build variables not injected');
 console.log('PASS two public VITE_ configuration variables embedded by build (values not logged)');
}
console.log('PASS deployed-site build emits working isolated /asp-review.html with real secure entry and preserves index.html');
