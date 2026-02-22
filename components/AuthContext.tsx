import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { lrService } from '../services/lrService';
import { supabase } from '../services/supabaseClient';

const ACTIVITY_STORAGE_KEY = 'kpm_last_activity';
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes strictly per user request

let globalSessionPromise: Promise<User | null> | null = null;

const checkSessionGlobally = async (): Promise<User | null> => {
  try {
    // Note: The 10-minute inactivity cross-tab wipe is now handled 
    // pre-boot inside supabaseClient.ts to prevent token refresh deadlocks.


    // Explicitly fetch the existing session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    // Verify user still exists/is active in our db
    const profile = await authService.getUserProfile(session.user.id);
    if (profile) {
      // Update localstorage so the timer survives the next refresh
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
      return profile;
    } else {
      // Profile not found or inactive
      await supabase.auth.signOut();
      return null;
    }
  } catch (err) {
    console.error('[Auth] Failed to check session globally:', err);
    return null;
  }
};

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
  // Auth state bootstrap: Guarantee perfect synchronization & fallback execution
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let subscription: any;
    let isMounted = true;

    // Fail-safe to ensure the app never stays on the loading screen forever
    const failSafeTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[Auth] Fail-safe executed: 5 seconds exceeded, forcing unauthenticated state.');
        clearSession();
        setLoading(false);
      }
    }, 5000);

    const initialize = async () => {
      try {
        setLoading(true);
        if (!globalSessionPromise) {
          globalSessionPromise = checkSessionGlobally();
        }

        const profile = await globalSessionPromise;
        if (!isMounted) return; // Prevent updating unmounted StrictMode component

        if (profile) {
          applyUser(profile);
        } else {
          clearSession();
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

    // 2. Set up the ongoing auth state listener for future changes (login, logout, refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.debug('[Auth Event]', event, session?.user?.id ?? 'no-user');

        try {
          switch (event) {
            case 'SIGNED_IN': {
              // After explicit login(), profile is already fetched in the login function.
              // Just ensure our state matches if we didn't trigger this ourselves
              if (session?.user && lastUserIdRef.current !== session.user.id) {
                const profile = await authService.getUserProfile(session.user.id);
                if (profile) {
                  applyUser(profile);
                } else {
                  clearSession();
                  setTimeout(() => supabase.auth.signOut(), 0);
                }
              }
              break;
            }

            case 'TOKEN_REFRESHED': {
              // Access token silently refreshed
              if (!session?.user) {
                clearSession();
              }
              break;
            }

            case 'SIGNED_OUT':
            case 'USER_DELETED': {
              clearSession();
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('[Auth] Unexpected error in onAuthStateChange handler:', err);
          clearSession();
        }
      }
    );

    subscription = authListener.subscription;

    // Task: Clear sessionStorage on tab close
    const handleUnload = () => {
      sessionStorage.clear();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
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
