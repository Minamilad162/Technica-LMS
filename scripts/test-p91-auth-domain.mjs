import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const portal=read('src/lib/portalAuth.js');
const authPage=read('src/pages/AuthPage.jsx');
const client=read('src/lib/supabase.js');
const main=read('src/main.jsx');

assert.match(portal,/window\.location\.origin\+window\.location\.pathname/);
assert.match(portal,/provider:'google'/);
assert.match(portal,/skipBrowserRedirect:true/);
assert.match(portal,/authorizationUrl\.searchParams\.get\('redirect_to'\)/);
assert.match(portal,/configuredReturn!==expectedRedirect/);
assert.match(portal,/window\.location\.assign\(authorizationUrl\.href\)/);
assert.match(portal,/redirectTo:portalAuthRedirectUrl\(\)/);
assert.match(portal,/emailRedirectTo:portalAuthRedirectUrl\(\)/);
assert.match(authPage,/navigate\(account\.role==='admin'/);
assert.match(client,/detectSessionInUrl:true,flowType:'pkce'/);
assert.match(main,/HashRouter/);
for(const [p,s] of [['portalAuth.js',portal],['AuthPage.jsx',authPage]]){
 assert.doesNotMatch(s,/https:\/\/[^\s"'\x60]+workers\.dev/i,
 'Old Worker URL hardcoded in '+p);
}
console.log('P91 PASS: same-origin Auth URL derivation and OAuth return-domain guard.');
