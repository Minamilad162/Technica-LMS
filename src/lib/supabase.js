/**
 * Shared public-key Supabase client for genuine login, P6A review and P7
 * Course/Domain/Topic/Lesson authoring within the existing Technica site.
 * The rest of the historical learner/demo bank still requires migration.
 * This client is NOT privileged: real JWT, active Admin and P1 RLS/RPC gates
 * govern every operation. Never place a service_role key in VITE_ variables.
 */
import { createClient } from '@supabase/supabase-js';
let client;
export function getSupabaseClient({secureReviewEntry=false}={}) {
  // The secureReviewEntry flag opts independent P6A review and P7 authoring
  // into real Supabase Auth, even while other default routes remain Demo.
  // This is a client-initialization gate, NOT a permission bypass: P1 RLS,
  // server-verified Auth/Admin role and P6A RPC permissions still apply.
  if (import.meta.env.VITE_DATA_MODE !== 'supabase' && !secureReviewEntry) return null;
  const url=import.meta.env.VITE_SUPABASE_URL;
  const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY with a publishable value)');
  if (!client) client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  return client;
}
export const isDemoMode = import.meta.env?.VITE_DATA_MODE !== 'supabase';
