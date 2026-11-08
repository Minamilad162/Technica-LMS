import {useEffect,useState} from 'react';
import {getSupabaseClient} from '../lib/supabase.js';
import {fetchMyPlatformSubscription,validP21Id} from './subscriptionApi.js';
import {fetchLearningAccessMode} from './accessModeApi.js';

// Header is purely informational: it reads current P21 rows under the logged-in
// learner's JWT and RLS. Approval/revocation/payment logic is unchanged.
export default function useHeaderSubscription(userId,enabled=true){
 const [result,setResult]=useState({subscription:null,openAccess:false,loading:true,error:''});
 useEffect(()=>{
  if(!enabled||!validP21Id(userId)){
   setResult({subscription:null,openAccess:false,loading:false,error:''});
   return undefined;
  }
  let active=true,inFlight=false,lastAttempt=0;
  async function load(force=false){
   if(!active||inFlight||!force&&Date.now()-lastAttempt<30_000)return;
   inFlight=true;lastAttempt=Date.now();
   try{
    const db=getSupabaseClient({secureReviewEntry:true});
    if(!db)throw new Error('Real subscription connection unavailable.');
    const [subscription,policy]=await Promise.all([fetchMyPlatformSubscription(db,userId).catch(()=>null),fetchLearningAccessMode(db)]);
    if(active)setResult({subscription,openAccess:policy.openAccess,loading:false,error:''});
   }catch(_error){
    if(active)setResult({subscription:null,openAccess:false,loading:false,error:'Subscription status unavailable'});
   }finally{inFlight=false;}
  }
  setResult({subscription:null,openAccess:false,loading:true,error:''});
  void load(true);
  const refresh=()=>{if(document.visibilityState==='visible')void load();};
  const interval=window.setInterval(refresh,300_000);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('technica-subscription-changed',refresh);
  return()=>{active=false;window.clearInterval(interval);
   window.removeEventListener('focus',refresh);
   document.removeEventListener('visibilitychange',refresh);
   window.removeEventListener('technica-subscription-changed',refresh);};
 },[userId,enabled]);
 return result;
}
