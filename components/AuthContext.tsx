
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const lastWriteRef = useRef<number>(0);
  // Track last known user ID to avoid redundant profile re-fetches
  const lastUserIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const applyUser = (profile: User | null) => {
    lrService.setCurrentUser(profile);
    setUser(profile);
    lastUserIdRef.current = profile?.id ?? null;
  };

  const clearSession = () => {
    lrService.setCurrentUser(null);
    setUser(null);
    lastUserIdRef.current = null;
    localStorage.removeItem('lastActivity');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Auth state bootstrap — rely on onAuthStateChange ONLY.
  // Supabase JS v2 always fires INITIAL_SESSION on mount, so we do NOT make a
  // redundant getSession() call here. This eliminates the race condition.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Failsafe: if INITIAL_SESSION never fires (e.g., no-DB stub, network issue)
    // force loading to false after 10 s so we never stay in an infinite spinner.
    const failsafeTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('AuthContext: INITIAL_SESSION did not fire within 10 s. Forcing loading = false.');
          clearSession();
          return false;
        }
        return prev;
      });
    }, 10_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('[Auth]', event, session?.user?.id ?? 'no-user');

        try {
          switch (event) {
            case 'INITIAL_SESSION': {
              // Fired once on mount — authoritative startup signal.
              if (session?.user) {
                if (lastUserIdRef.current !== session.user.id) {
                  const profile = await authService.getUserProfile(session.user.id);
                  if (profile) {
                    applyUser(profile);
                  } else {
                    // Profile not found in DB — clear app state.
                    // Do NOT call signOut() here: calling it inside onAuthStateChange
                    // triggers a nested SIGNED_OUT event which causes race conditions.
                    // Defer it outside the event handler.
                    clearSession();
                    setTimeout(() => supabase.auth.signOut(), 0);
                  }
                }
              } else {
                // No session on startup
                clearSession();
              }
              setLoading(false);
              clearTimeout(failsafeTimer);
              break;
            }

            case 'SIGNED_IN': {
              // After login() — profile already set, guard against re-fetch.
              if (session?.user && lastUserIdRef.current !== session.user.id) {
                const profile = await authService.getUserProfile(session.user.id);
                if (profile) {
                  applyUser(profile);
                } else {
                  clearSession();
                  setTimeout(() => supabase.auth.signOut(), 0);
                }
              }
              setLoading(false);
              break;
            }

            case 'TOKEN_REFRESHED': {
              // Access token silently refreshed — keep user logged in.
              if (!session?.user) {
                clearSession();
                setLoading(false);
              }
              break;
            }

            case 'SIGNED_OUT':
            case 'USER_DELETED': {
              clearSession();
              setLoading(false);
              break;
            }

            default:
              break;
          }
        } catch (err) {
          // Safety net: any uncaught error in the async handler must not leave
          // loading = true, which would result in an infinite spinner.
          console.error('[Auth] Unexpected error in onAuthStateChange handler:', err);
          clearSession();
          setLoading(false);
        }
      }
    );

    // ─── Idle Timeout Logic (30 minutes) ───────────────────────────────────────
    const TIMEOUT_MS = 30 * 60 * 1000;
    const THROTTLE_MS = 60 * 1000; // Write to storage once per minute
    let activityTimer: ReturnType<typeof setTimeout> | undefined;

    const checkForInactivity = (): boolean => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        if (!isNaN(lastActivityTime) && Date.now() - lastActivityTime > TIMEOUT_MS) {
          console.log('Session expired due to inactivity (across restart). Logging out...');
          // Use authService directly to avoid async state-machine complications
          authService.logout().then(() => clearSession());
          return true;
        }
      }
      return false;
    };

    const resetTimer = () => {
      if (activityTimer) clearTimeout(activityTimer);

      activityTimer = setTimeout(() => {
        // Smart Check: Verify if other tabs updated activity recently
        const storedLastActivity = localStorage.getItem('lastActivity');
        const lastActivityTime = storedLastActivity ? parseInt(storedLastActivity, 10) : 0;

        if (!isNaN(lastActivityTime) && Date.now() - lastActivityTime < TIMEOUT_MS) {
          console.log('Activity detected in another tab. Resetting timer.');
          resetTimer();
        } else {
          console.log('User inactive for 30 minutes, logging out...');
          logout();
        }
      }, TIMEOUT_MS);
    };

    const handleActivity = () => {
      const now = Date.now();
      // Throttle: Only write to storage if enough time passed
      if (now - lastWriteRef.current > THROTTLE_MS) {
        localStorage.setItem('lastActivity', now.toString());
        lastWriteRef.current = now;
      }
      // Always reset local timer
      resetTimer();
    };

    // Check on mount (for accidental close / refresh within inactivity window)
    if (!checkForInactivity()) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      resetTimer();
    }

    // Task: Clear sessionStorage on tab close. Do NOT clear lastActivity or localStorage
    // so that reopening within the 30-minute window works correctly.
    const handleUnload = () => {
      sessionStorage.clear();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
      if (activityTimer) clearTimeout(activityTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('beforeunload', handleUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    applyUser(loggedInUser);
    localStorage.setItem('lastActivity', Date.now().toString());
    // Note: onAuthStateChange will fire SIGNED_IN, but we guard against re-fetch
    // using lastUserIdRef so it's a no-op after this.
  };

  const logout = async () => {
    await authService.logout();
    clearSession();
    // onAuthStateChange will fire SIGNED_OUT — clearSession() is idempotent.
  };

  const refreshSession = async () => {
    const profile = await authService.getSessionUser();
    applyUser(profile);
    if (profile) {
      localStorage.setItem('lastActivity', Date.now().toString());
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
