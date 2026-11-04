#!/usr/bin/env node
// P12.2 on-demand REAL staging API integration. NEVER run in GitHub CI.
// Requires five pre-existing staging identities. No table/data/role/entitlement
// writes. Staging Auth sign-in events are expected; they are not LMS mutations.
// No service_role, no VITE_ vars, no Production fallback, no token/key output.
import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runStagingQa} from './lib/p12-staging-qa.mjs';

function onlyPublicKey(key){
 if(key.startsWith('sb_publishable_')&&key.length>16)return true;
 try{
  const parts=key.split('.');
  if(parts.length!==3)return false;
  const data=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  return data?.role==='anon';
 }catch{return false;}
}
export function stagingConfiguration(env,argv=[]){
 const ref=String(env.P12_STAGING_PROJECT_REF||'');
 const production=String(env.P12_PRODUCTION_PROJECT_REF||'');
 const url=String(env.P12_STAGING_URL||'');
 const key=String(env.P12_STAGING_ANON_KEY||'');
 const allowed=String(env.P12_STAGING_ENABLED||'');
 const confirmation=argv.find(x=>x.startsWith('--confirm-staging-ref='))?.split('=')[1]||'';
 // Requiring BOTH known, distinct project references prevents accidental reuse
 // of the user's known Production target in a purported staging QA command.
 if(!/^[a-z0-9]{20}$/.test(ref)||!/^[a-z0-9]{20}$/.test(production)
  ||production===ref||url!==`https://${ref}.supabase.co`
  ||!onlyPublicKey(key)||allowed!=='YES_READ_ONLY'||confirmation!==ref)
   throw Error('P12 STAGING GUARD: explicit different staging/production refs, exact HTTPS URL, public key and CLI confirmation required. No requests sent.');
 const credentials={};
 const emailSeen=new Set();
 for(const role of ['admin','paid','trial','outsider']){
  const prefix='P12_STAGING_'+role.toUpperCase();
  const email=String(env[prefix+'_EMAIL']||'').trim().toLowerCase();
  const password=String(env[prefix+'_PASSWORD']||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||emailSeen.has(email))
   throw Error('P12 STAGING GUARD: four distinct pre-seeded test logins are required. No requests sent.');
  emailSeen.add(email);
  credentials[role]={email,password};
 }
 return {ref,url,key,credentials};
}
const create=(url,key)=>createClient(url,key,{
 auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
 global:{headers:{'X-Technica-QA':'p12-readonly-staging'}}
});
export async function executeStagingQa(config){
 const clients={anon:create(config.url,config.key)};
 for(const role of ['admin','paid','trial','outsider']){
  const db=create(config.url,config.key);
  const {error,data}=await db.auth.signInWithPassword(config.credentials[role]);
  if(error||!data?.user)throw Error('Staging test login failed; inspect test account seeding in the authorized project. No data changes were made.');
  clients[role]=db;
 }
 return runStagingQa(clients);
}
function readReportArg(args){
 const value=args.find(x=>x.startsWith('--report-out='));
 if(!value)return '';
 const raw=value.slice('--report-out='.length);
 if(!raw.endsWith('.json')||raw.includes('..'))throw Error('Only a private .json aggregate evidence output path is supported.');
 return resolve(raw);
}
export async function cli(env=process.env,args=process.argv.slice(2)){
 const config=stagingConfiguration(env,args); // Must fail BEFORE any network call.
 const output=readReportArg(args);
 const report=await executeStagingQa(config);
 const counts=report.checks.reduce((map,x)=>{
  map[x.status]=(map[x.status]||0)+1;return map;
 },{pass:0,blocked:0,pending:0});
 if(output){
  await mkdir(resolve(output,'..'),{recursive:true});
  await writeFile(output,JSON.stringify(report,null,2)+'\n',
   {encoding:'utf8',mode:0o600,flag:'wx'}); // No overwrites.
 }
 process.stdout.write('P12 staging QA — API READ ONLY / NO_GO\n'
  +'19 scenarios: '+counts.pass+' PASS, '+counts.blocked+' BLOCKED, '
  +counts.pending+' PENDING\n'
  +(output?'Private aggregate evidence JSON written at the explicitly supplied path.\n':'No evidence file requested.\n'));
 return counts.blocked===0&&counts.pending===0?0:2;
}
if(process.argv[1]&&new URL('file://'+resolve(process.argv[1])).href===import.meta.url){
 try{process.exitCode=await cli();}
 catch{process.stderr.write('P12 STAGING GUARD OR QA ERROR: no verified stage report. Verify environment/fixture accounts. Never paste credentials.\n');process.exitCode=3;}
}
