
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

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BOOT INACTIVITY CHECK: Prevent Supabase Deadlock
// ─────────────────────────────────────────────────────────────────────────────
// Check if they've been inactive for > 10 mins BEFORE initializing Supabase.
// If so, we nuke the token manually. This prevents `createClient` from attempting
// to auto-refresh a stale token, which deadlocks the Supabase request queue.
const ACTIVITY_STORAGE_KEY = 'kpm_last_activity';
const TIMEOUT_MS = 10 * 60 * 1000;

if (typeof window !== 'undefined') {
  try {
    const lastActivityStr = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (Date.now() - lastActivity > TIMEOUT_MS) {
        console.warn('Pre-boot: User inactive > 10 mins. Wiping Supabase token to prevent auto-refresh deadlock.');
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);

        // Supabase stores tokens as `sb-<project-ref>-auth-token`
        if (supabaseUrl) {
          try {
            const urlObj = new URL(supabaseUrl);
            const projectId = urlObj.hostname.split('.')[0];
            const tokenKey = `sb-${projectId}-auth-token`;
            localStorage.removeItem(tokenKey);
          } catch (e) {
            // Also just try wiping all localStorage items starting with 'sb-' to be safe
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

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
      detectSessionInUrl: true, // Parse `#access_token=...` from password reset URLs 
    },
  });
};

export const supabase = createSafeSupabaseClient();
