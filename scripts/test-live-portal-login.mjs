import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {verifyPortalAccount,getAuthSession,clearTrustedPortalAccount} from '../src/lib/portalAuth.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mockUser={id:'test-auth-uuid',email:'member@company.invalid'};
const fakeDb=verified=>({auth:{async getUser(){return verified?{data:{user:mockUser},error:null}:{data:{user:null},error:new Error('Invalid token')};}}});
const profile={full_name:'Pilot User',account_status:'active'};
const admin=await verifyPortalAccount(fakeDb(true),async()=>({profile,roles:[{role:'admin'}],isAdmin:true}));
assert.equal(admin.role,'admin');
assert.equal(admin.email,mockUser.email);
assert.equal(getAuthSession()?.role,'admin');
clearTrustedPortalAccount();
assert.equal(getAuthSession(),null);
const learner=await verifyPortalAccount(fakeDb(true),async()=>({profile,roles:[],isAdmin:false}));
assert.equal(learner.role,'learner');
clearTrustedPortalAccount();
await assert.rejects(()=>verifyPortalAccount(fakeDb(false),async()=>{throw new Error('Must not load identity');}));
await assert.rejects(()=>verifyPortalAccount(fakeDb(true),async()=>({profile:{...profile,account_status:'suspended'},isAdmin:true})));
clearTrustedPortalAccount();

const auth=read('src/pages/AuthPage.jsx'),app=read('src/App.jsx'),layout=read('src/components/Layout.jsx');
const store=read('src/lib/store.jsx'),portal=read('src/lib/portalAuth.js'),sql=read('supabase/PILOT_2_ADMIN_2_LEARNER_ASSIGN.sql');
assert(auth.includes('loginWithEmailPassword(email,password)'),'Actual default login must call real Supabase Auth');
assert(auth.includes('type="email"'),'Email input is mandatory');
assert(auth.includes("autoComplete=\"current-password\""),'Password input is mandatory');
for(const forbidden of ['Login as Admin','Login as Learner','enterAdminDemo','enterDemo','loginDemo(','DEMO_ADMIN_LOGIN','DEMO_LOGIN']){
 assert(!auth.includes(forbidden),'Forbidden demo login shortcut remains in published Auth UI: '+forbidden);
}
assert(app.includes('restorePortalAccount()'),'Reload must re-verify genuine Supabase Auth');
assert(app.includes('subscribeToPortalAuth'),'Logout must invalidate all client-side routes');
assert(app.includes("getAuthSession()?.role==='admin'"),'Admin routes require verified database role');
assert(layout.includes('signOutPortal()'),'User logout must invalidate Supabase session');
assert(layout.includes("from'../lib/portalAuth'"),'Menu must use real role');
assert(store.includes("from './portalAuth'"),'Local preview admin controls must respect genuine role');
assert(portal.includes('db.auth.signInWithPassword'),'Backend verifies email/password, never local storage');
assert(portal.includes('db.auth.getUser()'),'Existing sessions must be verified by Auth server');
assert(portal.includes('loadIdentity'),'App roles must derive from database, not URL or user metadata');
assert(!portal.includes('localStorage'),'Browser local role/password must not be trusted');
assert(!sql.includes('INSERT INTO auth.users'),'Never write managed Auth users directly in SQL');
assert(!sql.includes('encrypted_password'),'Never supply passwords in repo SQL');
assert(sql.includes('auth.users'),'Roles only for existing verified Auth identities');
assert(sql.includes("email_confirmed_at"),'Pilot identities must be verified');
assert.equal((sql.match(/'admin[12]@replace-me\.invalid'::text|'admin[12]@replace-me\.invalid'/g)||[]).filter(x=>x.includes('admin')).length>=2,true);
assert(sql.includes("'learner'"),'Learner must have no elevated role');
assert(sql.includes("revoked_at IS NULL"),'Only active Admin assignments count');
assert(sql.includes("RAISE EXCEPTION 'Requested learner"),'Do not silently demote or downgrade an existing privileged account');

// The published browser build must not contain exposed demo-login shortcuts.
// It may still contain protected-content demo questions: this is a pilot auth
// gate, NOT paid bank privacy. Future release must migrate to Supabase Live.
if(existsSync('dist/assets')){
 const js=readdirSync('dist/assets').filter(x=>x.endsWith('.js')).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n');
 for(const exposed of ['Login as Admin','Login as Learner','AdminDemo@1234','Demo@1234']){
  assert(!js.includes(exposed),'Published login shortcut or static demo password leaked into bundle: '+exposed);
 }
}
console.log('PASS mandatory Supabase email/password pilot login; active real Admin role only; no one-click demo credentials, no SQL Auth-schema tampering.');
