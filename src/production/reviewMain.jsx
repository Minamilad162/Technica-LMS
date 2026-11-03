import React from 'react';
import {createRoot} from 'react-dom/client';
import SupabaseApp from './SupabaseApp';

// Explicit entry contract: Cloudflare aliases/rewrites may change the address,
// but they must NEVER change whether this bundle uses real Supabase Auth.
// Access to P6A answers is still guarded by true server-side admin checks.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SupabaseApp secureReviewEntry={true}/>
  </React.StrictMode>
);
