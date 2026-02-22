
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Creates a placeholder Supabase client to prevent "is required" errors on startup.
 * If credentials are missing, the app will still load but database calls will log warnings.
 */
const isValidUrl = (url: string) => {
  try { return url.startsWith('https://') && new URL(url).hostname.includes('.supabase.co'); }
  catch { return false; }
};

const createSafeSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl)) {
    console.error('Supabase credentials missing. LR Management System is running in "No-DB" mode. Set SUPABASE_URL and SUPABASE_ANON_KEY.');

    // Minimal stub to satisfy the most common query patterns used in the app
    const stubQuery: any = () => ({
      select: stubQuery,
      insert: stubQuery,
      update: stubQuery,
      delete: stubQuery,
      eq: stubQuery,
      in: stubQuery,
      or: stubQuery,
      order: stubQuery,
      range: stubQuery,
      single: () => Promise.resolve({ data: null, error: new Error('Database not configured') }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      // This allows 'await query' to work
      then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
    });

    return {
      from: stubQuery,
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Auth not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        refreshSession: () => Promise.resolve({ data: { session: null }, error: new Error('Auth not configured') }),
      },
    } as any;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,   // Automatically refresh access tokens before expiry
      persistSession: true,     // Persist session in localStorage across tabs/refreshes
      // detectSessionInUrl is intentionally omitted — this app uses password auth
      // only. With HashRouter, the URL hash is used for routing (#/list) not for
      // OAuth/magic-link tokens, so enabling that option would conflict.
    },
  });
};

export const supabase = createSafeSupabaseClient();
