
import { Transporter } from '../types';
import { supabase } from './supabaseClient';
import { apiClient } from './apiClient';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

const TABLE = 'internal_transporter_data';
const COLUMNS = 'id, name, commissionPercent, status';

const INITIAL_TRANSPORTERS: Transporter[] = [
  { id: 't1', name: 'Safe Express', commissionPercent: 5, status: 'Active' },
  { id: 't2', name: 'V-Trans Logistics', commissionPercent: 7, status: 'Active' },
  { id: 't3', name: 'Gati Limited', commissionPercent: 10, status: 'Inactive' }
];

export const transporterService = {
  getAllTransporters: async (): Promise<Transporter[]> => {
    // Check cache first
    const cached = cache.get<Transporter[]>(CACHE_KEYS.TRANSPORTERS);
    if (cached) return cached;

    const data = await apiClient.get<Transporter>(TABLE, COLUMNS);
    if (data.length === 0) {
      // Initialize with seed data if empty
      for (const t of INITIAL_TRANSPORTERS) {
        await apiClient.post(TABLE, t);
      }
      cache.set(CACHE_KEYS.TRANSPORTERS, INITIAL_TRANSPORTERS, CACHE_TTL.SHORT);
      return INITIAL_TRANSPORTERS;
    }
    cache.set(CACHE_KEYS.TRANSPORTERS, data, CACHE_TTL.SHORT);
    return data;
  },

  getTransporterById: async (id: string): Promise<Transporter | null> => {
    // Try cache first
    const cached = cache.get<Transporter[]>(CACHE_KEYS.TRANSPORTERS);
    if (cached) {
      return cached.find(t => t.id === id) || null;
    }
    // Direct single-record fetch instead of fetching all
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Transporter;
  },

  createTransporter: async (transporter: Omit<Transporter, 'id'>): Promise<Transporter> => {
    const newTransporter: Transporter = {
      ...transporter,
      id: Math.random().toString(36).substr(2, 9)
    };
    const result = await apiClient.post(TABLE, newTransporter);
    cache.invalidate(CACHE_KEYS.TRANSPORTERS);
    return result;
  },

  updateTransporter: async (id: string, updates: Partial<Transporter>): Promise<Transporter | null> => {
    const result = await apiClient.put(TABLE, id, updates);
    cache.invalidate(CACHE_KEYS.TRANSPORTERS);
    return result;
  }
};
