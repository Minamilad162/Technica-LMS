// Unit tests simulate browser storage & cryptography without a backend.
import assert from 'node:assert/strict';
class MemoryStore{constructor(){this.map=new Map()}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}clear(){this.map.clear()}}
globalThis.localStorage=new MemoryStore();
globalThis.sessionStorage=new MemoryStore();
const {DEMO_LOGIN,DEMO_ADMIN_LOGIN,loginDemo,signupDemo,getAuthSession,logoutDemo}=await import('../src/lib/demoAuth.js');
// Sample login must work without seeded localStorage accounts, even with copy/paste artifacts.
for(const ident of ['TC1001',' tc1001 ','TC 1001','TC\u200b1001','ＴＣ１００１','alex.demo@technica.example']) {
 const result=await loginDemo(ident,'  Demo@1234  ',false);
 assert.equal(result.employeeId,DEMO_LOGIN.employeeId,`Demo login failed for ${JSON.stringify(ident)}`);
}
// Admin preview is a distinct account; an ordinary learner cannot self-select admin.
const admin=await loginDemo(DEMO_ADMIN_LOGIN.employeeId,DEMO_ADMIN_LOGIN.password,false);
assert.equal(admin.role,'admin');
assert.equal(admin.employeeId,DEMO_ADMIN_LOGIN.employeeId);
assert.equal((await loginDemo(DEMO_LOGIN.employeeId,DEMO_LOGIN.password,false)).role,'learner');
await assert.rejects(()=>loginDemo(DEMO_ADMIN_LOGIN.employeeId,'incorrect'));
// Even bad previously saved account JSON cannot hide the sample account.
localStorage.setItem('technica-lms-demo-auth-accounts-v1','{broken');
assert.equal((await loginDemo('TC1001',DEMO_LOGIN.password)).id,'demo-learner');
localStorage.removeItem('technica-lms-demo-auth-accounts-v1');
const sample=await loginDemo(DEMO_LOGIN.employeeId,DEMO_LOGIN.password,false);
assert.equal(sample.employeeId,DEMO_LOGIN.employeeId);
assert.equal(getAuthSession().id,sample.id);
assert.equal(localStorage.getItem('technica-lms-demo-auth-session-v1'),null);
logoutDemo();
assert.equal(getAuthSession(),null);
const user={name:'Jane Test',employeeId:'TC2026',email:'jane@test.invalid',password:'TestPass22',confirmPassword:'TestPass22',accepted:true};
const created=await signupDemo(user);
assert.equal(created.name,user.name);
const record=localStorage.getItem('technica-lms-demo-auth-accounts-v1');
assert(!record.includes('TestPass22'),'No plaintext password may be persisted');
assert.equal((await loginDemo(user.employeeId,user.password,true)).name,user.name);
assert.equal((await loginDemo(user.email.toUpperCase(),user.password,true)).id,created.id);
await assert.rejects(()=>loginDemo(user.employeeId,'wrongpass'));
await assert.rejects(()=>signupDemo(user));
await assert.rejects(()=>signupDemo({...user,employeeId:DEMO_ADMIN_LOGIN.employeeId,email:'new@test.invalid'}));
await assert.rejects(()=>signupDemo({...user,employeeId:'TC2027',email:'new@test.invalid',confirmPassword:'Mismatch'}));
logoutDemo();
assert.equal(getAuthSession(),null);
console.log('PASS: seeded demo login, signup, hashed local password, validation, duplicate detection, remember-me, sign out, invalid credentials.');
