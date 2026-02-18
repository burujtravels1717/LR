
import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { transporterService } from '../services/transporterService';
import { entityService } from '../services/entityService';
import { LR, Transporter, BranchDetail } from '../types';

const AdminTransporterReport: React.FC = () => {
  const user = lrService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const today = new Date().toISOString().split('T')[0];

  const [lrs, setLrs] = useState<LR[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [transporterFilter, setTransporterFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [branches, setBranches] = useState<BranchDetail[]>([]);

  // Load transporter list once (cached by transporterService)
  useEffect(() => {
    if (isAdmin) {
      transporterService.getAllTransporters().then(setTransporters);
      entityService.getBranches().then(b => setBranches(b.filter(br => br.status === 'Active')));
    }
  }, [isAdmin]);

  // Server-filtered fetch – re-fetches when any filter changes
  const fetchLRData = async () => {
    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.code === branchFilter);
      const data = await lrService.getTransporterReportData({
        transporterId: transporterFilter,
        branch: branchFilter,
        branchName: selectedBranch?.name,
        startDate,
        endDate
      });
      setLrs(data);
    } catch (err) {
      console.error("Failed to load transporter report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchLRData();
  }, [isAdmin, transporterFilter, branchFilter, startDate, endDate]);

  // Totals on already server-filtered data (small set)
  const totals = useMemo(() => {
    return lrs.reduce((acc, lr) => ({
      amount: acc.amount + (parseFloat(lr.charges) || 0),
      commission: acc.commission + (lr.transporterCommissionAmount || 0),
      net: acc.net + (lr.netPayableToTransporter || 0)
    }), { amount: 0, commission: 0, net: 0 });
  }, [lrs]);

  const handleDownloadCSV = () => {
    const headers = ['LR No', 'Date', 'Transporter', 'Payable At', 'Route', 'Amount (₹)', 'Comm %', 'Comm Amount (₹)', 'Net Payable (₹)'];
    const rows = lrs.map(lr => {
      const payableAt = lr.paymentStatus === 'Paid' ? lr.branch : lr.shipment.toLocation;
      return [
        lr.lrNumber,
        new Date(lr.date).toLocaleDateString('en-GB'),
        lr.transporterName,
        payableAt,
        `${lr.shipment.fromLocation} to ${lr.shipment.toLocation}`,
        lr.charges,
        lr.transporterCommissionPercent,
        lr.transporterCommissionAmount?.toFixed(2),
        lr.netPayableToTransporter?.toFixed(2)
      ];
    });

    // Footer row
    rows.push(['TOTAL', '', '', '', '', totals.amount.toFixed(2), '', totals.commission.toFixed(2), totals.net.toFixed(2)]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Transporter_Settlement_${startDate}_${endDate}.csv`);
    link.click();
  };

  if (!isAdmin) return <Navigate to="/list" replace />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Transporter Settlements</h1>
          <p className="text-slate-500 text-sm">Auditing commission payouts and partner payables.</p>
        </div>
        <button
          onClick={handleDownloadCSV}
          disabled={lrs.length === 0}
          className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Partner</label>
            <select
              value={transporterFilter}
              onChange={e => setTransporterFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            >
              <option value="All">All Partners</option>
              {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch</label>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            >
              <option value="All">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.code}>{b.code}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To</label>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-transparent select-none">Action</label>
            <button
              onClick={() => {
                setTransporterFilter('All');
                setBranchFilter('All');
                setStartDate(today);
                setEndDate(today);
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total LR Value</p>
          <p className="text-3xl font-black text-slate-900">₹{totals.amount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Commission</p>
          <p className="text-3xl font-black text-red-600">₹{totals.commission.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm bg-blue-50/20">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Net Payable</p>
          <p className="text-3xl font-black text-slate-900">₹{totals.net.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">LR / Transporter</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Payable At</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">LR Value (₹)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Comm %</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Comm (₹)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Net (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Processing Records...</td></tr>
              ) : lrs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No assigned records for this period</td></tr>
              ) : (
                lrs.map(lr => (
                  <tr key={lr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900">{lr.lrNumber}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{lr.transporterName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${lr.paymentStatus === 'Paid' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                        {lr.paymentStatus === 'Paid' ? lr.branch : lr.shipment.toLocation}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-700 uppercase">{lr.shipment.fromLocation} → {lr.shipment.toLocation}</div>
                      <div className="text-[9px] text-slate-400">{new Date(lr.date).toLocaleDateString('en-GB')}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">{lr.charges}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{lr.transporterCommissionPercent}%</td>
                    <td className="px-6 py-4 text-right font-black text-red-600">{lr.transporterCommissionAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{lr.netPayableToTransporter?.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {lrs.length > 0 && (
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Settlement Summary</td>
                  <td className="px-6 py-4 text-right font-black">₹{totals.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right font-black text-red-300">₹{totals.commission.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-black text-green-300">₹{totals.net.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTransporterReport;
