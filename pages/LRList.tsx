
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { entityService } from '../services/entityService';
import { LR, BranchDetail } from '../types';

const LRList: React.FC = () => {
  const [lrs, setLrs] = useState<LR[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 50;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [branches, setBranches] = useState<BranchDetail[]>([]);

  const user = lrService.getCurrentUser();
  const canEdit = user?.role === 'admin' || user?.role === 'developer';
  const canDelete = user?.role === 'developer';

  // Guard against double-fire on initial mount
  const isInitialMount = useRef(true);

  // Load branches
  useEffect(() => {
    if (user?.branch === 'ALL') {
      entityService.getBranches().then(b => setBranches(b.filter(br => br.status === 'Active')));
    }
  }, [user]);

  const loadData = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const { data, count } = await lrService.getLRList(page, itemsPerPage, {
        search: searchTerm,
        branch: branchFilter,
        date: dateFilter
      });
      setLrs(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Failed to load LRs", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, branchFilter, dateFilter]);

  // Load on page change
  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  // Debounced filter effect — skip initial mount to avoid double-fire with above effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const handler = setTimeout(() => {
      setCurrentPage(0); // Reset to first page on filter change
      loadData(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, branchFilter, dateFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setBranchFilter('');
    setDateFilter('');
    setCurrentPage(0);
    // Since state update is async, loadData(0) might run with old state if called immediately?
    // Actually, setting state triggers the effect above (debounced).
    // So we don't need to call loadData manually here, simply clearing state triggers the effect.
    // However, debounce adds delay. To make it instant:
    // We can't easily bypass effect. Let's just let effect handle it.
  };

  const handleDelete = async (id: string, lrNumber: string) => {
    if (confirm(`Are you sure you want to delete LR: ${lrNumber}?`)) {
      setLoading(true);
      const success = await lrService.deleteLR(id);
      if (success) await loadData(currentPage);
      else setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">
            {user?.branch === 'ALL' ? 'All Bookings' : `${user?.branch} Branch Bookings`}
          </h1>
          <p className="text-slate-500 text-sm">Real-time overview • Showing {lrs.length} of {totalCount} records.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadData(currentPage)}
            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
            title="Manual Refresh"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <Link
            to="/create"
            className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-lg"
          >
            + New Booking
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <input
              type="text"
              placeholder="Search LR, Sender, Receiver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <select
              disabled={user?.branch !== 'ALL'}
              value={branchFilter || (user?.branch !== 'ALL' ? user?.branch : '')}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none ${user?.branch !== 'ALL' ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-white'}`}
            >
              <option value="">{user?.branch === 'ALL' ? 'All Branches' : user?.branch}</option>
              {user?.branch === 'ALL' && branches.map(b => (
                <option key={b.id} value={b.code}>{b.code}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">LR Number</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Parties</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount (₹)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && lrs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Data...</td></tr>
              ) : lrs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No records found</td></tr>
              ) : (
                lrs.map((lr) => (
                  <tr key={lr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900">{lr.lrNumber}</span>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{lr.branch} Branch</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {new Date(lr.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">{lr.sender.name}</div>
                      <div className="text-[10px] text-slate-400">to {lr.receiver.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-900">₹{parseFloat(lr.charges).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${lr.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {lr.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link title="View Receipt" to={`/lr/${lr.id}`} className="p-2 text-slate-400 hover:text-blue-600 rounded transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        {canEdit && (
                          <Link title="Edit Record" to={`/edit/${lr.id}`} className="p-2 text-slate-400 hover:text-amber-600 rounded transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                        )}
                        {canDelete && (
                          <button title="Delete Record" onClick={() => handleDelete(lr.id, lr.lrNumber)} className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {currentPage + 1} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 0 || loading}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages - 1 || loading}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white disabled:opacity-30 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LRList;
