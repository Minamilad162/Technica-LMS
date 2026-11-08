// P41: server-authoritative access policy; missing RPC fails closed.
// This is NOT a browser permission switch and never grants access by itself.
export async function fetchLearningAccessMode(db){
 if(!db?.rpc)throw Error('Authenticated learning connection required.');
 const {data,error}=await db.rpc('lms_p41_access_mode');
 if(error){
  if(/PGRST202|42883|not found|could not find the function|schema cache|does not exist/i.test(
   String(error.message||'')+' '+String(error.code||'')))
   return {mode:'subscription',openAccess:false,installed:false};
  throw Error('Learning access settings could not be verified: '+(error.message||'unknown error'));
 }
 if(!['open','subscription'].includes(data))
  throw Error('Unexpected learning access policy from the server.');
 return {mode:data,openAccess:data==='open',installed:true};
}

export async function setLearningOpenAccess(db,enabled){
 if(typeof enabled!=='boolean'||!db?.rpc)throw Error('Verified Admin and explicit access mode required.');
 const {data,error}=await db.rpc('lms_p41_set_open_access',{p_enabled:enabled});
 if(error||data!==enabled)throw Error('Learning access mode change was not confirmed by the server.');
 return data;
}
