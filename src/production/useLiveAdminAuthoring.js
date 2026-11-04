import {useEffect,useMemo,useState} from 'react';
import {getSupabaseClient} from '../lib/supabase';
import {verifiedLiveAdmin} from './liveAuthoringApi.js';

// The real, active Supabase account is checked on the Auth server AND through
// existing P1 role RLS. This is a UX guard; database RLS decides all writes.
export function useLiveAdminAuthoring(){
 const {db,configurationError}=useMemo(()=>{
  try{return {db:getSupabaseClient({secureReviewEntry:true}),configurationError:''};}
  catch(error){return {db:null,configurationError:error?.message||'Supabase configuration unavailable.'};}
 },[]);
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState({status:'checking',message:''});
 useEffect(()=>{
  if(configurationError||!db){setState({status:'error',message:configurationError||'Supabase is not configured.'});return;}
  let active=true;
  setState({status:'checking',message:''});
  verifiedLiveAdmin(db).then(()=>{if(active)setState({status:'ready',message:''});})
   .catch(error=>{if(active)setState({status:'error',message:error.message||'Cannot verify Admin privileges.'});});
  return()=>{active=false;};
 },[db,configurationError,revision]);
 return {db,...state,retry:()=>setRevision(n=>n+1)};
}
