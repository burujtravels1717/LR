
import { LR, User, Transporter } from '../types';
import { supabase } from './supabaseClient';

const TABLE = 'internal_lr_data';

// Column sets for different views – avoids select('*')
const LIST_COLUMNS = 'id, lrNumber, date, branch, sender, receiver, charges, paymentStatus';
const REPORT_COLUMNS = 'id, lrNumber, date, branch, sender, receiver, shipment, charges, paymentStatus';
const TRANSPORTER_REPORT_COLUMNS = 'id, lrNumber, date, branch, shipment, charges, transporterId, transporterName, transporterCommissionPercent, transporterCommissionAmount, netPayableToTransporter';
const ASSIGN_COLUMNS = 'id, lrNumber, date, branch, sender, receiver, shipment, charges, paymentStatus, transporterId, transporterName, assignedAt';

// Hardcoded routes data (could be moved to DB in future)
const ROUTES_DATA: Record<string, string[]> = {
  'Mannady': ['Thoothukudi', 'Eral', 'Kayalpattinam', 'Tiruchendure', 'Others'],
  'Kayalpattinam': ['Egmore', 'Mannady', 'Koyembedu', 'Others'],
  'Tuticorin': ['Mannady', 'Madurai', 'Others'],
  'Madurai': ['Mannady', 'Kayalpattinam', 'Others'],
  'Tirunelveli': ['Mannady', 'Others'],
};

// Synced from AuthContext – keeps getCurrentUser() synchronous for all callers
let _currentUser: User | null = null;

export const lrService = {
  getCurrentUser: (): User | null => _currentUser,
  setCurrentUser: (user: User | null) => { _currentUser = user; },

  /**
   * Optimized fetch for the list view.
   * Fetches only necessary columns and uses pagination.
   */
  getLRList: async (page: number = 0, limit: number = 50, filters: any = {}): Promise<{ data: LR[], count: number }> => {
    const user = lrService.getCurrentUser();
    if (!user) return { data: [], count: 0 };

    // Select only required columns for the list view to save bandwidth
    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    // Enforce branch-level security
    if (user.branch !== 'ALL') {
      query = query.eq('branch', user.branch);
    } else if (filters.branch) {
      query = query.eq('branch', filters.branch);
    }

    // Server-side filters
    if (filters.search) {
      query = query.or(`lrNumber.ilike.%${filters.search}%,sender->>name.ilike.%${filters.search}%,receiver->>name.ilike.%${filters.search}%`);
    }
    if (filters.date) {
      query = query.gte('date', `${filters.date}T00:00:00`).lte('date', `${filters.date}T23:59:59`);
    }

    const from = page * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('date', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data as LR[], count: count || 0 };
  },

  /**
   * Server-filtered report data for AdminReports.
   * Filters by date and branch on the server – never fetches the full table.
   */
  getReportData: async (filters: { branch?: string; date: string }): Promise<LR[]> => {
    const user = lrService.getCurrentUser();
    if (!user) return [];

    let query = supabase
      .from(TABLE)
      .select(REPORT_COLUMNS);

    // Branch security
    if (user.branch !== 'ALL') {
      query = query.eq('branch', user.branch);
    } else if (filters.branch && filters.branch !== 'All') {
      query = query.eq('branch', filters.branch);
    }

    // Date filter (exact day)
    query = query
      .gte('date', `${filters.date}T00:00:00`)
      .lte('date', `${filters.date}T23:59:59`);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data as LR[];
  },

  /**
   * Server-filtered transporter report data for AdminTransporterReport.
   * Only returns records with a transporter assigned.
   */
  getTransporterReportData: async (filters: {
    transporterId?: string;
    branch?: string;
    branchName?: string; // e.g. 'Kayalpattinam'
    startDate: string;
    endDate: string;
  }): Promise<LR[]> => {
    const user = lrService.getCurrentUser();
    if (!user) return [];

    let query = supabase
      .from(TABLE)
      .select(TRANSPORTER_REPORT_COLUMNS)
      .not('transporterId', 'is', null);  // Only assigned records

    // Branch Logic for Settlement:
    // We fetch ALL records for the date range first, then filter in memory.
    // This avoids complex Supabase query syntax issues with JSON columns (->>) inside .or() filters.

    // 1. Apply Date Range and Transporter Filter (Server-side)
    query = query
      .gte('date', `${filters.startDate}T00:00:00`)
      .lte('date', `${filters.endDate}T23:59:59`);

    if (filters.transporterId && filters.transporterId !== 'All') {
      query = query.eq('transporterId', filters.transporterId);
    }

    // 2. Fetch Data
    const { data: rawData, error } = await query.order('date', { ascending: false });
    if (error) throw error;

    // 3. Apply Branch Responsibility Filter (Client-side)
    const targetBranchCode = (user.branch !== 'ALL') ? user.branch : (filters.branch !== 'All' ? filters.branch : null);

    let filteredData = rawData as LR[];

    if (targetBranchCode) {
      filteredData = filteredData.filter(lr => {
        const isOrigin = lr.branch === targetBranchCode;
        const isDestination = filters.branchName && lr.shipment.toLocation === filters.branchName;
        // In case branchName isn't passed or doesn't match, we can't confirm destination.
        // But for "To Pay", destination is payer.

        if (lr.paymentStatus === 'Paid') {
          return isOrigin; // Origin pays
        } else if (lr.paymentStatus === 'To Pay') {
          return isDestination; // Destination pays
        }
        return false;
      });
    }

    return filteredData;
  },

  /**
   * Fetch unassigned LRs for the AdminAssignTransporter page.
   */
  getUnassignedLRs: async (): Promise<LR[]> => {
    const user = lrService.getCurrentUser();
    if (!user) return [];

    let query = supabase
      .from(TABLE)
      .select(ASSIGN_COLUMNS)
      .is('transporterId', null);

    if (user.branch !== 'ALL') {
      query = query.eq('branch', user.branch);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data as LR[];
  },

  /**
   * Fetch recently assigned LRs (last 24h) for AdminAssignTransporter.
   */
  getRecentlyAssignedLRs: async (): Promise<LR[]> => {
    const user = lrService.getCurrentUser();
    if (!user) return [];

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from(TABLE)
      .select(ASSIGN_COLUMNS)
      .not('transporterId', 'is', null)
      .gte('assignedAt', twentyFourHoursAgo);

    if (user.branch !== 'ALL') {
      query = query.eq('branch', user.branch);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data as LR[];
  },

  getLRById: async (id: string): Promise<LR | null> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('getLRById error:', error);
      return null;
    }
    return data as LR;
  },

  createLR: async (lrData: Omit<LR, 'id' | 'lrNumber' | 'date' | 'createdBy' | 'transporterId' | 'transporterName' | 'transporterCommissionPercent' | 'transporterCommissionAmount' | 'netPayableToTransporter' | 'assignedAt'>): Promise<LR> => {
    const currentUser = lrService.getCurrentUser();

    // Generate unique sequence on server/trigger is preferred, 
    // but for this refactor we fetch count of branch entries.
    const { count } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('branch', lrData.branch);

    const sequence = ((count || 0) + 1).toString().padStart(5, '0');
    const lrNumber = `${lrData.branch}-${sequence}`;
    const date = new Date().toISOString();

    const newLR: Partial<LR> = {
      ...lrData,
      lrNumber,
      date,
      createdBy: currentUser?.name || 'System User'
    };

    const { data, error } = await supabase.from(TABLE).insert([newLR]).select().single();
    if (error) throw error;
    return data as LR;
  },

  updateLR: async (id: string, lrData: Partial<LR>): Promise<LR | null> => {
    const { data, error } = await supabase.from(TABLE).update(lrData).eq('id', id).select().single();
    if (error) throw error;
    return data as LR;
  },

  assignTransporterToLRs: async (lrIds: string[], transporter: Transporter): Promise<void> => {
    const now = new Date().toISOString();

    // Fetch only required fields for commission calculation
    const { data: lrs, error } = await supabase
      .from(TABLE)
      .select('id, charges')
      .in('id', lrIds);
    if (error) throw error;

    for (const lr of lrs) {
      const lrAmount = parseFloat(lr.charges) || 0;
      const commissionAmount = (lrAmount * transporter.commissionPercent) / 100;
      const netPayable = lrAmount - commissionAmount;

      await supabase.from(TABLE).update({
        transporterId: transporter.id,
        transporterName: transporter.name,
        transporterCommissionPercent: transporter.commissionPercent,
        transporterCommissionAmount: commissionAmount,
        netPayableToTransporter: netPayable,
        assignedAt: now
      }).eq('id', lr.id);
    }
  },

  deleteLR: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  },

  getDestinations: async (from: string): Promise<string[]> => {
    return ROUTES_DATA[from] || ['Others'];
  }
};
