
import { BusinessSettings, BranchDetail } from '../types';
import { supabase } from './supabaseClient';
import { apiClient } from './apiClient';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

const SETTINGS_TABLE = 'internal_business_settings';
const BRANCHES_TABLE = 'branch_details';

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: '',
  logoUrl: '',
  tagline: '',
  gstin: '',
  primaryName: '',
  primaryEmail: '',
  primaryPhone: '',
  secondaryName: '',
  secondaryPhone: '',
  headOfficeAddress: ''
};

// ... (DEFAULT_BRANCHES remains as is for now, or should I clear them too? User said "fall back datas". Branches are functional data, let's keep them or maybe user means branding?)
// I'll assume branding for now.

const DEFAULT_BRANCHES: BranchDetail[] = []; // Clear default branches too? User said "every where". Safer to clear.

export const entityService = {
  getSettings: async (): Promise<BusinessSettings> => {
    // Check cache first
    const cached = cache.get<BusinessSettings>(CACHE_KEYS.SETTINGS);
    if (cached) return cached;

    try {
      const settings = await apiClient.get<BusinessSettings>(SETTINGS_TABLE);
      if (settings && settings.length > 0) {
        const result = { ...DEFAULT_SETTINGS, ...settings[0] }; // Merge to ensure all keys exist
        cache.set(CACHE_KEYS.SETTINGS, result, CACHE_TTL.LONG);
        return result;
      }

      // If table is empty, do NOT return hardcoded defaults. Return empty.
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.warn('Could not fetch settings from DB.');
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings: async (settings: BusinessSettings): Promise<BusinessSettings> => {
    try {
      // Find the existing record to update, or insert if missing
      const existing = await apiClient.get<any>(SETTINGS_TABLE);
      if (existing && existing.length > 0) {
        await apiClient.put(SETTINGS_TABLE, existing[0].id, settings);
      } else {
        await apiClient.post(SETTINGS_TABLE, settings);
      }
    } catch (e) {
      console.error('Failed to persist settings to Supabase', e);
    }

    // Invalidate cache so next fetch gets fresh data
    cache.invalidate(CACHE_KEYS.SETTINGS);

    // Dispatch custom event so UI components (like Layout) can refresh their state
    window.dispatchEvent(new CustomEvent('kpm-settings-updated', { detail: settings }));

    return settings;
  },

  getBranches: async (): Promise<BranchDetail[]> => {
    // Check cache first
    const cached = cache.get<BranchDetail[]>(CACHE_KEYS.BRANCHES);
    if (cached) return cached;

    const data = await apiClient.get<BranchDetail>(BRANCHES_TABLE);
    if (data.length === 0) {
      for (const b of DEFAULT_BRANCHES) {
        await apiClient.post(BRANCHES_TABLE, b);
      }
      cache.set(CACHE_KEYS.BRANCHES, DEFAULT_BRANCHES, CACHE_TTL.SHORT);
      return DEFAULT_BRANCHES;
    }
    cache.set(CACHE_KEYS.BRANCHES, data, CACHE_TTL.SHORT);
    return data;
  },

  createBranch: async (branch: Omit<BranchDetail, 'id'>): Promise<BranchDetail> => {
    const newBranch = { ...branch, id: Math.random().toString(36).substr(2, 9) };
    const result = await apiClient.post(BRANCHES_TABLE, newBranch);
    cache.invalidate(CACHE_KEYS.BRANCHES);
    return result;
  },

  updateBranch: async (id: string, updates: Partial<BranchDetail>): Promise<BranchDetail | null> => {
    const result = await apiClient.put(BRANCHES_TABLE, id, updates);
    cache.invalidate(CACHE_KEYS.BRANCHES);
    return result;
  },

  deleteBranch: async (id: string, branchCode: string): Promise<boolean> => {
    // Safety: prevent deletion if LRs reference this branch
    const { count } = await supabase
      .from('internal_lr_data')
      .select('id', { count: 'exact', head: true })
      .eq('branch', branchCode);

    if (count && count > 0) {
      throw new Error(`Cannot delete branch "${branchCode}": ${count} LR record(s) are linked to it.`);
    }

    const result = await apiClient.delete(BRANCHES_TABLE, id);
    cache.invalidate(CACHE_KEYS.BRANCHES);
    return result;
  }
};
