
import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { entityService } from '../services/entityService';
import { LR, BranchDetail } from '../types';

const AdminReports: React.FC = () => {
  const user = lrService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  // Default to today's date
  const today = new Date().toISOString().split('T')[0];

  const [lrs, setLrs] = useState<LR[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('All');
  const [reportDate, setReportDate] = useState(today);
  const [branches, setBranches] = useState<BranchDetail[]>([]);

  // Server-filtered fetch – only fetches records for the selected date and branch
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await lrService.getReportData({
        branch: branchFilter,
        date: reportDate
      });
      setLrs(data);
    } catch (err) {
      console.error("Failed to load report data", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters change (server-side filtering)
  useEffect(() => {
    if (isAdmin) {
      fetchData();
      entityService.getBranches().then(b => setBranches(b.filter(br => br.status === 'Active')));
    }
  }, [isAdmin, branchFilter, reportDate]);

  // Totals calculation (on already server-filtered data – small set)
  const totalAmount = useMemo(() => {
    return lrs.reduce((sum, lr) => sum + (parseFloat(lr.charges) || 0), 0);
  }, [lrs]);

  const totalPackages = useMemo(() => {
    return lrs.reduce((sum, lr) => sum + (parseInt(lr.shipment.packages) || 0), 0);
  }, [lrs]);

  const resetFilters = () => {
    setBranchFilter('All');
    setReportDate(today);
  };

  const handleDownloadCSV = () => {
    const headers = ['LR Number', 'Date', 'Branch', 'From', 'To', 'Sender', 'Receiver', 'Packages', 'Amount (INR)', 'Status'];
    const rows = lrs.map(lr => [
      lr.lrNumber,
      new Date(lr.date).toLocaleDateString('en-GB'),
      lr.branch,
      lr.shipment.fromLocation,
      lr.shipment.toLocation,
      lr.sender.name,
      lr.receiver.name,
      lr.shipment.packages,
      lr.charges,
      lr.paymentStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KPM_Report_${reportDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return <Navigate to="/create" replace />;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Admin Reports</h1>
          <p className="text-slate-500 text-sm">Financial summary and booking analytics for <span className="font-black text-slate-900">{new Date(reportDate).toLocaleDateString('en-GB')}</span></p>
        </div>
        <button
          onClick={handleDownloadCSV}
          disabled={lrs.length === 0}
          className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.code}>{b.code} Branch</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={resetFilters}
            className="w-full py-2 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            Reset to Today
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bookings</p>
          <p className="text-3xl font-black text-slate-900">{lrs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Packages</p>
          <p className="text-3xl font-black text-slate-900">{totalPackages}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border-l-4 border-l-blue-600 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">LR Number</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Parties</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Pkgs</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Generating Report...
                  </td>
                </tr>
              ) : lrs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    No records found for the selected date
                  </td>
                </tr>
              ) : (
                lrs.map((lr) => (
                  <tr key={lr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900">{lr.lrNumber}</span>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{lr.branch} Branch</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {new Date(lr.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] font-bold text-slate-900 uppercase">{lr.shipment.fromLocation}</div>
                      <div className="text-[10px] text-slate-400">to {lr.shipment.toLocation}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{lr.sender.name}</div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[120px]">{lr.receiver.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-700">
                      {lr.shipment.packages}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {parseFloat(lr.charges).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lrs.length > 0 && (
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-left">Grand Total</td>
                  <td className="px-6 py-4 text-center text-sm font-black">{totalPackages}</td>
                  <td className="px-6 py-4 text-right text-lg font-black">₹{totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
