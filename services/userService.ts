
import { User } from '../types';
import { supabase } from './supabaseClient';
import { apiClient } from './apiClient';

const TABLE = 'internal_user_data';
const COLUMNS = 'id, username, name, role, branch, status, avatar, lastLogin, phone, user_metadata';

const INITIAL_USERS: User[] = [
  { id: '11111111-1111-4111-8111-111111111111', username: 'superuser_kpm', name: 'Zainul', role: 'developer', branch: 'ALL', status: 'Active', avatar: 'ZA', lastLogin: new Date().toISOString() },
  { id: '22222222-2222-4222-8222-222222222222', username: 'admin_kpm', name: 'John Doe', role: 'admin', branch: 'ALL', status: 'Active', avatar: 'JD', lastLogin: new Date().toISOString() },
  { id: '33333333-3333-4333-8333-333333333333', username: 'staff_mnd', name: 'Jane Smith', role: 'staff', branch: 'MND', status: 'Active', avatar: 'JS', lastLogin: new Date().toISOString() },
  { id: '44444444-4444-4444-8444-444444444444', username: 'staff_kpm', name: 'Ahmed Ali', role: 'staff', branch: 'KPM', status: 'Inactive', avatar: 'AA' }
];

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const data = await apiClient.get<User>(TABLE, COLUMNS);
    if (data.length === 0) {
      for (const u of INITIAL_USERS) {
        await apiClient.post(TABLE, u);
      }
      return INITIAL_USERS;
    }
    return data;
  },

  getUserById: async (id: string): Promise<User | null> => {
    // Direct single-record fetch instead of fetching all records
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .single();
    if (error) return null;
    return data as User;
  },

  /**
   * Creates a user profile in the database.
   * NOTE: This does NOT create a Supabase Auth account.
   * The admin must perform the Supabase Auth signup separately (or use the create_user_command SQL function).
   */
  createUser: async (user: Omit<User, 'id' | 'lastLogin'>): Promise<User> => {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(), // Use real UUIDs to match Supabase Auth format
      avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2)
    };
    return apiClient.post(TABLE, newUser);
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    if (updates.name) {
      updates.avatar = updates.name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
    }
    return apiClient.put(TABLE, id, updates);
  },

  deleteUser: async (id: string): Promise<boolean> => {
    // Basic protection already handled by RLS and UI confirm dialogs
    return apiClient.delete(TABLE, id);
  }
};
