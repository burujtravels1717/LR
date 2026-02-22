
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tighter uppercase mb-1">
            {user?.branch === 'ALL' ? 'Fleet Operations' : `${user?.branch} Branch Ledger`}
          </h1>
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse"></span>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{totalCount} Live Records Integrated</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(currentPage)}
            className="w-10 h-10 flex items-center justify-center glass rounded-xl text-slate-400 hover:text-brand-primary hover:rotate-180 transition-all duration-500"
            title="Refresh Ledger"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <Link
            to="/create"
            className="btn-primary py-2.5 flex items-center gap-2.5 shadow-indigo-500/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Generate LR</span>
          </Link>
        </div>
      </div>

      <div className="glass rounded-[1.5rem] overflow-hidden border-slate-200/50">
        <div className="p-4 border-b border-slate-100 bg-white/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Quick search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="md:col-span-3">
            <select
              disabled={user?.branch !== 'ALL'}
              value={branchFilter || (user?.branch !== 'ALL' ? user?.branch : '')}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all ${user?.branch !== 'ALL' ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'bg-white/50'}`}
            >
              <option value="">{user?.branch === 'ALL' ? 'Location: Global' : `Branch: ${user?.branch}`}</option>
              {user?.branch === 'ALL' && branches.map(b => (
                <option key={b.id} value={b.code}>{b.code} Terminal</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Reference Info</th>
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Booking Date</th>
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Trading Parties</th>
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Settlement (₹)</th>
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && lrs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                    <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px]">Synchronizing...</span>
                  </div>
                </td></tr>
              ) : lrs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[9px]">Inventory Clear</td></tr>
              ) : (
                lrs.map((lr) => (
                  <tr key={lr.id} className="group hover:bg-indigo-50/30 transition-all duration-300 cursor-default">
                    <td className="px-6 py-3.5">
                      <div className="font-black text-brand-dark text-sm tracking-tight mb-0.5 group-hover:text-brand-primary transition-colors">{lr.lrNumber}</div>
                      <div className="inline-flex px-1.5 py-0.5 bg-slate-100 text-[8px] font-black text-slate-500 uppercase rounded-md tracking-widest">{lr.branch}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="text-[11px] font-bold text-slate-500">
                        {new Date(lr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="text-xs font-black text-slate-700 mb-0.5">{lr.sender.name}</div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        {lr.receiver.name}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-sm font-black text-brand-dark">₹{parseFloat(lr.charges).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ring-1 ring-inset ${lr.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}>
                        {lr.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2.5 translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <Link title="Deep View" to={`/lr/${lr.id}`} className="w-8 h-8 flex items-center justify-center glass rounded-lg text-slate-400 hover:text-brand-primary hover:scale-110 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        {canEdit && (
                          <Link title="Modify" to={`/edit/${lr.id}`} className="w-8 h-8 flex items-center justify-center glass rounded-lg text-slate-400 hover:text-emerald-500 hover:scale-110 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                        )}
                        {canDelete && (
                          <button title="Archive" onClick={() => handleDelete(lr.id, lr.lrNumber)} className="w-8 h-8 flex items-center justify-center glass rounded-lg text-slate-400 hover:text-rose-500 hover:scale-110 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
            Ledger Section {currentPage + 1} <span className="mx-2 text-slate-200">/</span> {totalPages || 1}
          </div>
          <div className="flex gap-3">
            <button
              disabled={currentPage === 0 || loading}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-5 py-2 glass rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary disabled:opacity-20 disabled:hover:text-slate-500 transition-all active:scale-95"
            >
              Back
            </button>
            <button
              disabled={currentPage >= totalPages - 1 || loading}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-5 py-2 glass rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary disabled:opacity-20 disabled:hover:text-slate-500 transition-all active:scale-95"
            >
              Advance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LRList;
