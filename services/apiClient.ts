
import { supabase } from './supabaseClient';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const TIMEOUT_MS = 8000;

/**
 * Timeout wrapper to prevent eternal hangs if Supabase client queues stall
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`API request timed out after ${ms}ms`));
    }, ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(reason => {
        clearTimeout(timer);
        reject(reason);
      });
  });
};

/**
 * Retry wrapper for transient Supabase errors.
 * Will NOT retry on client/validation errors (4xx-class).
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn());
    } catch (err: any) {
      lastError = err;
      // Don't retry client errors (constraint violations, auth, etc.)
      const code = err?.code || '';
      if (code.startsWith('4') || code === '23505' || code === 'PGRST') break;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
};

export const apiClient = {
  /**
   * Optimized GET with column selection, filtering, and optional pagination.
   * @param table   - Supabase table name
   * @param columns - Comma-separated column list (default: '*')
   * @param filter  - Key-value equality filters
   * @param options - Pagination: { page, limit } (0-indexed page)
   */
  get: async <T>(
    table: string,
    columns: string = '*',
    filter?: Record<string, any>,
    options?: { page?: number; limit?: number }
  ): Promise<T[]> => {
    return withRetry(async () => {
      const needsCount = options?.page !== undefined;
      let query = supabase.from(table).select(columns, needsCount ? { count: 'exact' } : undefined);

      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== undefined && filter[key] !== null) {
            query = query.eq(key, filter[key]);
          }
        });
      }

      // Pagination
      if (options?.page !== undefined && options?.limit) {
        const from = options.page * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    });
  },

  post: async <T>(table: string, item: T): Promise<T> => {
    return withRetry(async () => {
      const { data, error } = await supabase.from(table).insert([item]).select();
      if (error) throw error;
      return data[0] as T;
    });
  },

  put: async <T>(table: string, id: string, updates: Partial<T>): Promise<T | null> => {
    return withRetry(async () => {
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0] as T;
    });
  },

  delete: async (table: string, id: string): Promise<boolean> => {
    return withRetry(async () => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    });
  }
};
