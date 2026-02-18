import { User } from '../types';
import { supabase } from './supabaseClient';

const USER_DATA_KEY = 'internal_user_data';
const LOGIN_COLUMNS = 'id, username, name, role, branch, status, avatar, lastLogin, phone, user_metadata';

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      throw new Error('Invalid credentials');
    }

    // Step 2: Fetch the user's profile from internal_user_data
    const { data: profile, error: profileError } = await supabase
      .from(USER_DATA_KEY)
      .select(LOGIN_COLUMNS)
      .eq('id', authData.user.id)
      .eq('status', 'Active')
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw new Error('Account inactive or profile not found');
    }

    // Step 3: Update last login
    await supabase
      .from(USER_DATA_KEY)
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', profile.id);

    return profile as User;
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  getSessionUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from(USER_DATA_KEY)
      .select(LOGIN_COLUMNS)
      .eq('id', session.user.id)
      .single();

    return profile as User | null;
  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`
    });
    return !error;
  },

  updatePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;

    // Clear the must_reset_password flag
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from(USER_DATA_KEY)
        .update({ user_metadata: { must_reset_password: false } })
        .eq('id', user.id);
    }
  },

  resetPasswordByAdmin: async (userId: string, tempPassword: string): Promise<void> => {
    // Admin updates password via Supabase Admin API (requires service_role key)
    // For client-side: set must_reset_password flag, actual password reset via email
    await supabase
      .from(USER_DATA_KEY)
      .update({ user_metadata: { must_reset_password: true } })
      .eq('id', userId);
  }
};
