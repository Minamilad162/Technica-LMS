// Real Supabase Email+Password identity for the existing Technica site.
// No Demo credentials or browser-local role selection can mint an account.
// The legacy course/quiz pages are still LOCAL previews and are not a paid
// server-protected question bank; their role checks are only UI guards.
import {getSupabaseClient} from './supabase.js';
import {loadIdentity} from '../production/lmsApi.js';

let trustedAccount=null;
// Opt-in for EXISTING real-browser regression tests on Vite DEV SERVER ONLY.
// Never enabled in compiled production, even if a Cloudflare variable is set.
// Does not add a login button, credentials, or backend authorization shortcut.
const browserQaMode=Boolean(import.meta.env?.DEV&&import.meta.env?.VITE_LOCAL_QA_DEMO==='1');
function readQaAccount(){
 if(!browserQaMode||typeof sessionStorage==='undefined')return null;
 try{
  const parsed=JSON.parse(sessionStorage.getItem('technica-lms-demo-auth-session-v1')||'null');
  return parsed?.id&&parsed?.name&&['admin','learner'].includes(parsed.role)?parsed:null;
 }catch{return null;}
}
function client(){return getSupabaseClient({secureReviewEntry:true});}
export function getAuthSession(){return browserQaMode?readQaAccount():trustedAccount;}
export function clearTrustedPortalAccount(){trustedAccount=null;}
export function blockedPortalMessage(note=''){
 const reason=String(note||'').trim().slice(0,500);
 return 'Your Technica LMS account is blocked. '+(reason||'Please contact your LMS administrator for assistance.');
}
export async function verifyPortalAccount(db,identityLoader=loadIdentity){
 const {data,error}=await db.auth.getUser();
 const user=data?.user;
 if(error||!user?.id||!user?.email)throw new Error('Please sign in with your registered email and password.');
 const result=await identityLoader(db,user);
 if(result?.profile?.account_status==='suspended'){
  const blocked=new Error(blockedPortalMessage(result.profile.block_note));blocked.code='LMS_ACCOUNT_BLOCKED';throw blocked;
 }
 if(result?.profile?.account_status!=='active')throw new Error('Account is not active. Contact the LMS administrator.');
 const name=String(result.profile.full_name||user.user_metadata?.full_name||user.email.split('@')[0]).trim().slice(0,160);
 const account={id:user.id,name:name||'LMS User',email:user.email,role:result.isAdmin===true?'admin':'learner'};
 trustedAccount=account;
 return account;
}
export async function restorePortalAccount(){
 if(browserQaMode)return readQaAccount();
 const db=client();
 try {
  const {data,error}=await db.auth.getSession();
  if(error||!data?.session?.user){trustedAccount=null;return null;}
  return await verifyPortalAccount(db);
 }catch(error){trustedAccount=null;
  if(error?.code==='LMS_ACCOUNT_BLOCKED')await db.auth.signOut().catch(()=>{});
  throw error;}
}
export async function loginWithEmailPassword(email,password){
 if(!email||!password)throw new Error('Enter your email and password.');
 const db=client();
 const {error}=await db.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
 if(error)throw new Error(error.message||'Email or password is incorrect.');
 try{return await verifyPortalAccount(db);}
 catch(error){
  trustedAccount=null;
  // Bad/missing profile MUST NOT leave an authenticated portal account.
  await db.auth.signOut().catch(()=>{});
  throw error;
 }
}
// The host and deployment base are derived from the current page, never a fixed workers.dev host.
// This path must be allow-listed in Supabase Auth URL Configuration.
export function portalAuthRedirectUrl(){
 if(typeof window==='undefined')throw new Error('Auth redirect requires a browser.');
 return window.location.origin+window.location.pathname;
}
export async function signUpPortalAccount({fullName,email,password}){
 const normalizedEmail=String(email||'').trim().toLowerCase();
 const displayName=String(fullName||'').trim();
 if(!normalizedEmail.includes('@')||!displayName||displayName.length>160)
  throw new Error('Enter a valid name and email address.');
 if(typeof password!=='string'||password.length<12)
  throw new Error('Use a password with at least 12 characters.');
 const db=client();
 const {data,error}=await db.auth.signUp({
  email:normalizedEmail,password,
  options:{emailRedirectTo:portalAuthRedirectUrl(),data:{full_name:displayName}}
 });
 if(error)throw new Error(error.message||'Could not create your account.');
 // The P1 auth.users trigger creates an ordinary LMS profile; no browser-supplied Admin role.
 // Confirmation-required email signups return a user but no authenticated session.
 if(data?.session){
  try{return {needsConfirmation:false,account:await verifyPortalAccount(db)};}
  catch(e){await db.auth.signOut().catch(()=>{});throw e;}
 }
 return {needsConfirmation:true,account:null};
}
export async function startGooglePortalAuth(){
 if(browserQaMode)throw new Error('Use a real Supabase Auth environment to continue with Google.');
 const db=client();
 const expectedRedirect=portalAuthRedirectUrl();
 // Inspect the generated authorization URL *before* navigating away.
 // Supabase may fall back to the configured Site URL when an origin is not allow-listed.
 const {data,error}=await db.auth.signInWithOAuth({
  provider:'google',
  options:{redirectTo:expectedRedirect,scopes:'openid email profile',skipBrowserRedirect:true}
 });
 if(error)throw new Error(error.message||'Google sign-in is unavailable. Contact the LMS administrator.');
 if(!data?.url)throw new Error('Google could not start the secure sign-in flow.');
 let authorizationUrl;
 try{authorizationUrl=new URL(data.url);}
 catch{throw new Error('Google sign-in returned an invalid authorization URL.');}
 const configuredReturn=authorizationUrl.searchParams.get('redirect_to');
 if(!configuredReturn||configuredReturn!==expectedRedirect){
  throw new Error('Google sign-in is not configured for this domain. Ask your LMS administrator to add this website to Supabase Auth Redirect URLs and update the Site URL.');
 }
 // Only the Supabase authorization endpoint produced by the configured client
 // may start the sign-in flow. Never navigate to a supplied external return origin.
 const supabaseHost=new URL(import.meta.env.VITE_SUPABASE_URL).origin;
 if(authorizationUrl.origin!==supabaseHost||!authorizationUrl.pathname.startsWith('/auth/v1/authorize')){
  throw new Error('Google sign-in returned an unexpected authorization endpoint.');
 }
 window.location.assign(authorizationUrl.href);
 return data;
}
export async function requestPasswordReset(email){
 if(!email?.includes('@'))throw new Error('Enter a valid email address.');
 const db=client();
 const {error}=await db.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
  redirectTo:portalAuthRedirectUrl()
 });
 if(error)throw new Error(error.message||'Password reset could not be sent.');
 return true;
}
export async function signOutPortal(){
 trustedAccount=null;
 if(browserQaMode){sessionStorage.removeItem('technica-lms-demo-auth-session-v1');return;}
 try {const db=client();await db.auth.signOut();}
 finally{trustedAccount=null;}
}
export function subscribeToPortalAuth(callback){
 if(browserQaMode)return ()=>{};
 const db=client();
 const {data}=db.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'){trustedAccount=null;callback?.();}
 });
 return ()=>data?.subscription?.unsubscribe?.();
}
