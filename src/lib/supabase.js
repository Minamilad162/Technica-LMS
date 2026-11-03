/**
 * Future-production integration point. The demo deliberately never connects to Supabase.
 * Use `getSupabaseClient()` from a repository only after implementing authentication,
 * role-based access policies and the data mapping in /supabase/schema.sql.
 */
import { createClient } from '@supabase/supabase-js';
let client;
export function getSupabaseClient({secureReviewEntry=false}={}) {
  // Only the isolated /asp-review.html entry may activate true Supabase Auth
  // while the existing public Vite build remains in Demo mode. This is a UI
  // routing rule, NEVER an authorization bypass: P6A RPCs enforce live JWT
  // active-admin role at the database. Demo roles/tokens are ignored.
  if (import.meta.env.VITE_DATA_MODE !== 'supabase' && !secureReviewEntry) return null;
  const url=import.meta.env.VITE_SUPABASE_URL;
  const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  if (!client) client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});
  return client;
}
export const isDemoMode = import.meta.env?.VITE_DATA_MODE !== 'supabase';
