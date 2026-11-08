// Optional public deployed Worker smoke: node scripts/check-live-header.mjs
// Read-only; reports stale builds without accessing credentials, login, or private data.
const target=process.argv[2]||'https://technica-lms.minamilad939.workers.dev/';
const timeoutMs=15000;
async function get(url){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'cache-control':'no-cache'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.text();
 }finally{clearTimeout(timeout);}
}
try{
 const html=await get(target);
 const script=(html.match(/<script[^>]+src=["']([^"']+\.js)["']/i)||[])[1];
 if(!script)throw Error('No JavaScript entry detected in the public HTML. Check Worker build routing.');
 const entry=new URL(script,new URL(target).origin+'/').href;
 const js=await get(entry);
 const markers=['data-header-subscription-ready','top-subscription-slot','subscription-countdown'];
 const missing=markers.filter(m=>!js.includes(m));
 if(missing.length){
  console.error('LIVE DEPLOYMENT STALE: '+missing.join(', ')+' not found in '+entry);
  console.error('Cloudflare Workers > Builds & Deployments: redeploy latest main; then force-refresh browser.');
  process.exitCode=2;
 }else{
  console.log('LIVE HEADER BUNDLE VERIFIED: countdown markers present in '+entry);
 }
}catch(error){
 console.error('LIVE DEPLOYMENT VERIFICATION UNAVAILABLE: '+(error?.message||error));
 process.exitCode=3;
}
