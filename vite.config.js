import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// An isolated HTML entrypoint is mandatory: simply hiding demo routes still
// ships the bundled ASP answer JSON to every public visitor. Never do that.
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  // Reviewer is also present in the default site. Fail Cloudflare Worker
  // BUILDS when its public Supabase configuration was not injected, rather
  // than silently deploying a broken 'configuration required' screen.
  if(process.env.WORKERS_CI==='1'&&(!env.VITE_SUPABASE_URL||(!env.VITE_SUPABASE_PUBLISHABLE_KEY&&!env.VITE_SUPABASE_ANON_KEY))){
    throw new Error('[Technica LMS] Missing public Supabase BUILD variables: VITE_SUPABASE_URL and a publishable API key (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY). Configure Worker Settings > Builds > Build variables and secrets. No values are printed.');
  }
  const live=env.VITE_DATA_MODE==='supabase';
  return {
    // Compile the Cloudflare Git commit marker into the browser so stale
    // deployments can be diagnosed without exposing any environment values.
    define:{
      __TECHNICA_BUILD_SHA__:JSON.stringify(
        (process.env.WORKERS_CI_COMMIT_SHA||process.env.GITHUB_SHA||'local').slice(0,12))
    },
    plugins:[
      react(),
      ...(live?[{
        name:'technica-safe-live-entrypoint',
        enforce:'pre',
        transformIndexHtml:{
          order:'pre', // must run before Vite scans HTML module imports
          handler(html){
            return html.replace('/src/main.jsx','/src/production/main.jsx')
              .replace('LMS demo','LMS');
          }
        }
      }]:[])
    ],
    // Existing public demo stays intact; its admin menu links to a separate,
    // genuinely authenticated Supabase reviewer at /asp-review.html.
    // Live production builds remain single-entry and do NOT bundle demo answer keys.
    build:live?undefined:{
      rollupOptions:{
        input:{
          main:resolve(process.cwd(),'index.html'),
          aspReview:resolve(process.cwd(),'asp-review.html')
        }
      }
    },
    base:'./'
  };
});
