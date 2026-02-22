import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { lrService } from '../services/lrService';
import { supabase } from '../services/supabaseClient';

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
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
    console.log('Session expired due to 30 minutes of inactivity. Logging out...');
    try {
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
  // Auth state bootstrap: Explicitly use getSession first, then bind listener
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let subscription: any;
    const isMounted = { current: true };

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Fallback safeguard: Never allow the app to hang on the loading screen for more than 5 seconds
        const timeoutId = setTimeout(() => {
          if (isMounted.current && loading) {
            console.warn('[Auth] Session restoration timed out. Falling back to unauthenticated state.');
            clearSession();
            setLoading(false);
          }
        }, 5000);

        // 1. Explicitly fetch the existing session from Supabase on mount
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (isMounted.current) clearSession();
        } else {
          // Verify user still exists/is active in our db
          const profile = await authService.getUserProfile(session.user.id);
          if (isMounted.current) {
            if (profile) {
              applyUser(profile);
            } else {
              // Profile not found or inactive
              clearSession();
              await supabase.auth.signOut();
            }
          }
        }
        clearTimeout(timeoutId);
      } catch (err) {
        console.error('[Auth] Failed to initialize session:', err);
        if (isMounted.current) clearSession();
      } finally {
        // ALWAYS clear loading state as long as we haven't unmounted
        if (isMounted.current) setLoading(false);
      }
    };

    // Run custom initialization
    initializeAuth();

    // 2. Set up the ongoing auth state listener for future changes (login, logout, refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

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
      isMounted.current = false;
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [clearSession]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    applyUser(loggedInUser);
    // Timer will be automatically started via the useEffect listening to `user`
  };

  const logout = async () => {
    await authService.logout();
    clearSession();
  };

  const refreshSession = async () => {
    const profile = await authService.getSessionUser();
    applyUser(profile); // Timer will restart via effect
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
