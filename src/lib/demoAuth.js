// Browser-only demo authentication; NOT a security boundary, never use for production.
// No plaintext passwords are stored. Production should use Supabase Auth + protected RLS.
const ACCOUNTS_KEY='technica-lms-demo-auth-accounts-v1';
const SESSION_KEY='technica-lms-demo-auth-session-v1';
export const DEMO_LOGIN={employeeId:'TC1001',password:'Demo@1234'};
export const DEMO_ADMIN_LOGIN={employeeId:'TC9001',password:'AdminDemo@1234'};
const DEFAULT_ACCOUNT={id:'demo-learner',name:'Alex Morgan',employeeId:DEMO_LOGIN.employeeId,email:'alex.demo@technica.example',role:'learner',sample:true};
const ADMIN_ACCOUNT={id:'demo-admin',name:'Technica Admin',employeeId:DEMO_ADMIN_LOGIN.employeeId,email:'admin.demo@technica.example',role:'admin',sample:true};
// Tolerate common copy/paste issues for employee IDs, including invisible
// zero-width characters and extra spaces. Emails remain case-insensitive.
const normalize=v=>String(v??'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g,'').trim().toLowerCase();
const normalizedIdentifier=v=>{const raw=normalize(v);return raw.includes('@')?raw:raw.replace(/\s+/g,'')};
function readJson(store,key,fallback){try{return JSON.parse(store.getItem(key))??fallback}catch{return fallback}}
function getAccounts(){return readJson(localStorage,ACCOUNTS_KEY,[])}
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function digest(password,salt){
 const imported=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt.match(/.{2}/g).map(h=>parseInt(h,16))),iterations:120000,hash:'SHA-256'},imported,256);
 return toHex(new Uint8Array(result));
}
export function getAuthSession(){
 const current=readJson(sessionStorage,SESSION_KEY,null)||readJson(localStorage,SESSION_KEY,null);
 return current&&current.id&&current.name?current:null;
}
export function logoutDemo(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}
function storeSession(identity,remember){
 const safe={id:identity.id,employeeId:identity.employeeId,email:identity.email,name:identity.name,role:identity.role||'learner'};
 logoutDemo();(remember?localStorage:sessionStorage).setItem(SESSION_KEY,JSON.stringify(safe));return safe;
}
export async function loginDemo(identifier,password,remember=true){
 const id=normalizedIdentifier(identifier);
 if(!id||!password)throw new Error('Enter your Employee ID and password.');
 if((id===normalizedIdentifier(DEFAULT_ACCOUNT.employeeId)||id===normalize(DEFAULT_ACCOUNT.email))&&String(password).trim()===DEMO_LOGIN.password)return storeSession(DEFAULT_ACCOUNT,remember);
 if((id===normalizedIdentifier(ADMIN_ACCOUNT.employeeId)||id===normalize(ADMIN_ACCOUNT.email))&&String(password).trim()===DEMO_ADMIN_LOGIN.password)return storeSession(ADMIN_ACCOUNT,remember);
 const user=getAccounts().find(x=>normalizedIdentifier(x.employeeId)===id||normalize(x.email)===id);
 if(!user)throw new Error('Account not found in this browser. For the sample account, use the Demo Login button below.');
 if(await digest(password,user.salt)!==user.passwordHash)throw new Error('Incorrect password. Please try again.');
 return storeSession(user,remember);
}
export async function signupDemo({name,email,employeeId,password,confirmPassword,accepted}){
 name=name.trim();email=email.trim();employeeId=employeeId.trim();
 if(name.length<3)throw new Error('Enter your full name (at least 3 characters).');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
 if(!/^[a-zA-Z0-9_-]{3,24}$/.test(employeeId))throw new Error('Employee ID must be 3–24 letters, numbers, hyphens or underscores.');
 if(password.length<8||!/[0-9]/.test(password)||!/[a-zA-Z]/.test(password))throw new Error('Use a password with at least 8 characters, a letter and a number.');
 if(password!==confirmPassword)throw new Error('The passwords do not match.');
 if(!accepted)throw new Error('Agree to the Terms and Privacy Policy to continue.');
 const users=getAccounts();
 if([DEFAULT_ACCOUNT.employeeId,ADMIN_ACCOUNT.employeeId].some(id=>normalize(id)===normalize(employeeId))||users.some(x=>normalize(x.employeeId)===normalize(employeeId)))throw new Error('This Employee ID is already registered in this demo.');
 if([DEFAULT_ACCOUNT.email,ADMIN_ACCOUNT.email].some(e=>normalize(e)===normalize(email))||users.some(x=>normalize(x.email)===normalize(email)))throw new Error('This email is already registered in this demo.');
 const salt=toHex(crypto.getRandomValues(new Uint8Array(16)));
 const account={id:crypto.randomUUID(),name,email,employeeId,role:'learner',salt,passwordHash:await digest(password,salt)};
 localStorage.setItem(ACCOUNTS_KEY,JSON.stringify([...users,account]));
 return storeSession(account,true);
}
