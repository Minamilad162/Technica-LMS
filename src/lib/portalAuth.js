// Real Supabase Email+Password identity for the existing Technica site.
// No Demo credentials or browser-local role selection can mint an account.
// The legacy course/quiz pages are still LOCAL previews and are not a paid
// server-protected question bank; their role checks are only UI guards.
import {getSupabaseClient} from './supabase';
import {loadIdentity} from '../production/lmsApi';

let trustedAccount=null;
function client(){return getSupabaseClient({secureReviewEntry:true});}
export function getAuthSession(){return trustedAccount;}
export function clearTrustedPortalAccount(){trustedAccount=null;}
export async function verifyPortalAccount(db,identityLoader=loadIdentity){
 const {data,error}=await db.auth.getUser();
 const user=data?.user;
 if(error||!user?.id||!user?.email)throw new Error('Please sign in with your registered email and password.');
 const result=await identityLoader(db,user);
 if(result?.profile?.account_status!=='active')throw new Error('Account is not active. Contact the LMS administrator.');
 const name=String(result.profile.full_name||user.user_metadata?.full_name||user.email.split('@')[0]).trim().slice(0,160);
 const account={id:user.id,name:name||'LMS User',email:user.email,role:result.isAdmin===true?'admin':'learner'};
 trustedAccount=account;
 return account;
}
export async function restorePortalAccount(){
 const db=client();
 try {
  const {data,error}=await db.auth.getSession();
  if(error||!data?.session?.user){trustedAccount=null;return null;}
  return await verifyPortalAccount(db);
 }catch(error){trustedAccount=null;throw error;}
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
export async function requestPasswordReset(email){
 if(!email?.includes('@'))throw new Error('Enter a valid email address.');
 const db=client();
 const {error}=await db.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
  redirectTo:window.location.origin+window.location.pathname
 });
 if(error)throw new Error(error.message||'Password reset could not be sent.');
 return true;
}
export async function signOutPortal(){
 trustedAccount=null;
 try {const db=client();await db.auth.signOut();}
 finally{trustedAccount=null;}
}
export function subscribeToPortalAuth(callback){
 const db=client();
 const {data}=db.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'){trustedAccount=null;callback?.();}
 });
 return ()=>data?.subscription?.unsubscribe?.();
}
