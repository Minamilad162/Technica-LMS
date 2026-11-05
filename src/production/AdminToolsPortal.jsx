import React,{useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';
import {getSupabaseClient} from '../lib/supabase.js';
import AdminToolsWorkspace,{ADMIN_TOOLS_TABS} from './AdminToolsWorkspace.jsx';
const valid=new Set(ADMIN_TOOLS_TABS.map(x=>x.id));
export default function AdminToolsPortal(){
 const [params,setParams]=useSearchParams();
 const chosen=params.get('tab')||'overview';
 const tab=valid.has(chosen)?chosen:'overview';
 const connection=useMemo(()=>{
  try{return {db:getSupabaseClient({secureReviewEntry:true}),error:''};}
  catch(e){return {db:null,error:'A configured Supabase project is required for real Admin Tools.'};}
 },[]);
 if(connection.error)return <div className="at-access-state" role="alert"><h2>Admin Tools unavailable</h2><p>{connection.error} No demo user, financial, exam or question-bank data will be substituted.</p></div>;
 return <AdminToolsWorkspace db={connection.db} initialTab={tab}
  onTabChange={id=>{const next=new URLSearchParams();next.set('tab',id);setParams(next);}}/>;
}
