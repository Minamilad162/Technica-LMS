import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

// An isolated HTML entrypoint is mandatory: simply hiding demo routes still
// ships the bundled ASP answer JSON to every public visitor. Never do that.
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  const live=env.VITE_DATA_MODE==='supabase';
  return {
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
    base:'./'
  };
});
