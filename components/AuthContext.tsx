
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    // Restore session from Supabase Auth on mount
    authService.getSessionUser().then(profile => {
      lrService.setCurrentUser(profile);
      setUser(profile);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          const profile = await authService.getSessionUser();
          lrService.setCurrentUser(profile);
          setUser(profile);
        }
      }
    );

    // Idle Timeout Logic (30 minutes)
    const TIMEOUT_MS = 30 * 60 * 1000;
    let activityTimer: any;

    const checkForInactivity = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity && Date.now() - parseInt(lastActivity) > TIMEOUT_MS) {
        console.log('Session expired due to inactivity (across restart). logging out...');
        logout();
        return true;
      }
      return false;
    };

    const resetTimer = () => {
      if (activityTimer) clearTimeout(activityTimer);

      // Update persistent storage (for cross-tab/restart check)
      localStorage.setItem('lastActivity', Date.now().toString());

      activityTimer = setTimeout(() => {
        console.log('User inactive for 30 minutes, logging out...');
        logout();
      }, TIMEOUT_MS);
    };

    const handleActivity = () => {
      resetTimer();
    };

    // Check on mount (for accidental close / refresh)
    if (!checkForInactivity()) {
      // Attach listeners
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);

      // Initial start
      resetTimer();
    }

    return () => {
      subscription.unsubscribe();
      if (activityTimer) clearTimeout(activityTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    lrService.setCurrentUser(loggedInUser);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await authService.logout();
    lrService.setCurrentUser(null);
    setUser(null);
  };

  const refreshSession = async () => {
    const profile = await authService.getSessionUser();
    lrService.setCurrentUser(profile);
    setUser(profile);
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
