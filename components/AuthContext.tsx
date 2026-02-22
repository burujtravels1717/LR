import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { lrService } from '../services/lrService';
import { supabase } from '../services/supabaseClient';

const ACTIVITY_STORAGE_KEY = 'kpm_last_activity';
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes strictly per user request

// Node: The 10-minute inactivity cross-tab wipe is handled 
// pre-boot inside supabaseClient.ts to prevent token refresh deadlocks.

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Track last known user ID to avoid redundant profile re-fetches
  const lastUserIdRef = useRef<string | null>(null);

  // Inactivity timeout state
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const applyUser = (profile: User | null) => {
    lrService.setCurrentUser(profile);
    setUser(profile);
    lastUserIdRef.current = profile?.id ?? null;
  };

  const clearSession = useCallback(() => {
    lrService.setCurrentUser(null);
    setUser(null);
    lastUserIdRef.current = null;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Idle Timeout Logic (30 minutes)
  // ─────────────────────────────────────────────────────────────────────────────

  const logoutDueToInactivity = useCallback(async () => {
    console.log('Session expired due to 10 minutes of inactivity. Logging out...');
    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error during automatic sign out:', e);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only run timer if a user is logged in
    if (lastUserIdRef.current) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
      inactivityTimerRef.current = setTimeout(logoutDueToInactivity, TIMEOUT_MS);
    }
  }, [logoutDueToInactivity, TIMEOUT_MS]);

  useEffect(() => {
    const handleActivity = () => {
      // Only reset if we actually have a logged-in user
      if (lastUserIdRef.current) {
        resetInactivityTimer();
      }
    };

    // Listen to standard activity events
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Restart timer anytime the user state changes (e.g. they log in)
  useEffect(() => {
    if (user) {
      resetInactivityTimer();
    } else if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, [user, resetInactivityTimer]);


  // ─────────────────────────────────────────────────────────────────────────────
  // Auth state bootstrap: Guarantee perfect synchronization & execution
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // Fail-safe to ensure the app never stays on the loading screen forever
    const failSafeTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Fail-safe executed: 5 seconds exceeded, forcing unauthenticated state.');
        clearSession();
        setLoading(false);
      }
    }, 5000);

    const initialize = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (isMounted) clearSession();
          return;
        }

        const profile = await authService.getUserProfile(session.user.id);
        if (!isMounted) return;

        if (profile) {
          localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
          applyUser(profile);
        } else {
          clearSession();
          await supabase.auth.signOut().catch(() => { });
        }
      } catch (err) {
        console.error('[Auth] Critical initialization error:', err);
        if (isMounted) clearSession();
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(failSafeTimeout);
        }
      }
    };

    initialize();

    // 2. Set up the ongoing auth state listener for future changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      console.debug('[Auth Event]', event, session?.user?.id ?? 'no-user');

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearSession();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) {
          clearSession();
          return;
        }

        // CRITICAL FIX: Decouple profile fetch from Supabase auth event queue
        // Awaiting supabase.from() inside this listener deadlocks Supabase on refresh!
        if (lastUserIdRef.current !== session.user.id) {
          setTimeout(() => {
            if (!isMounted) return;
            authService.getUserProfile(session.user.id).then(profile => {
              if (isMounted) {
                if (profile) {
                  applyUser(profile);
                } else {
                  clearSession();
                  supabase.auth.signOut().catch(() => { });
                }
              }
            }).catch(() => {
              if (isMounted) clearSession();
            });
          }, 0);
        }
      }
    });

    const subscription = authListener.subscription;

    // Task: Clear sessionStorage on tab close
    const handleUnload = () => {
      sessionStorage.clear();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
      clearTimeout(failSafeTimeout);
    };
  }, [clearSession]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
    applyUser(loggedInUser);
    // Timer will be automatically started via the useEffect listening to `user`
  };

  const logout = async () => {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    await authService.logout();
    clearSession();
  };

  const refreshSession = async () => {
    const profile = await authService.getSessionUser();
    if (profile) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
      applyUser(profile); // Timer will restart via effect
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
