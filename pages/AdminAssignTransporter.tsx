
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { transporterService } from '../services/transporterService';
import { LR, Transporter } from '../types';

const AdminAssignTransporter: React.FC = () => {
  const navigate = useNavigate();
  const user = lrService.getCurrentUser();

  const [pendingLrs, setPendingLrs] = useState<LR[]>([]);
  const [recentLrs, setRecentLrs] = useState<LR[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');
  const [selectedLrIds, setSelectedLrIds] = useState<Set<string>>(new Set());
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // Two scoped queries instead of one getAllLRs() – much smaller reads
    const [unassigned, recent, tData] = await Promise.all([
      lrService.getUnassignedLRs(),
      lrService.getRecentlyAssignedLRs(),
      transporterService.getAllTransporters()  // cached
    ]);

    setPendingLrs(unassigned);
    setRecentLrs(recent);
    setTransporters(tData.filter(t => t.status === 'Active'));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentList = activeTab === 'pending' ? pendingLrs : recentLrs;

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedLrIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLrIds(next);
  };

  const handleToggleAll = () => {
    if (selectedLrIds.size === currentList.length) {
      setSelectedLrIds(new Set());
    } else {
      setSelectedLrIds(new Set(currentList.map(l => l.id)));
    }
  };

  const handleTabChange = (tab: 'pending' | 'recent') => {
    setActiveTab(tab);
    setSelectedLrIds(new Set());
  };

  const handleBulkAssign = async () => {
    if (!selectedTransporterId || selectedLrIds.size === 0) return;

    setIsAssigning(true);
    const transporter = transporters.find(t => t.id === selectedTransporterId);
    if (transporter) {
      try {
        await lrService.assignTransporterToLRs(Array.from(selectedLrIds), transporter);
        await fetchData();
        setSelectedLrIds(new Set());
        setSelectedTransporterId('');
        alert(activeTab === 'pending' ? 'Transporter assigned successfully.' : 'Transporter updated successfully.');
      } catch (err) {
        alert('Failed to process assignment.');
      }
    }
    setIsAssigning(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Logistics Allocation</h1>
        <p className="text-slate-500 text-sm">Assign transporters to all pending bookings, regardless of payment status.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side: Worklist Container */}
        <div className="flex-1 border-r border-slate-100 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex bg-slate-50 border-b border-slate-100 p-1">
            <button
              onClick={() => handleTabChange('pending')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Pending Allocation
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                {pendingLrs.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('recent')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recent'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Recently Assigned
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                {recentLrs.length}
              </span>
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {activeTab === 'pending' ? 'Unassigned Bookings' : 'Active Transport Assignments'}
            </h3>
            {currentList.length > 0 && (
              <button
                onClick={handleToggleAll}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
              >
                {selectedLrIds.size === currentList.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[600px]">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                Syncing Task List...
              </div>
            ) : currentList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-slate-300">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {activeTab === 'pending' ? 'All bookings allocated' : 'No recent assignments'}
                </p>
              </div>
            ) : (
              currentList.map(lr => (
                <div
                  key={lr.id}
                  onClick={() => handleToggleSelect(lr.id)}
                  className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedLrIds.has(lr.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedLrIds.has(lr.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                    {selectedLrIds.has(lr.id) && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-slate-900">{lr.lrNumber}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${lr.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {lr.paymentStatus}
                          </span>
                          {lr.transporterId && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase tracking-widest">
                              {lr.transporterName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-700">₹{lr.charges}</span>
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Commissionable
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2">
                      <span>{lr.shipment.fromLocation} → {lr.shipment.toLocation}</span>
                      <span>{new Date(lr.date).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Assignment Control Panel */}
        <div className="w-full md:w-80 p-6 bg-slate-50/30 flex flex-col gap-6">
          <div className="space-y-6">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Batch Selection</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-900">{selectedLrIds.size}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Selected</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                Select Partner
              </label>
              <div className="relative">
                <select
                  disabled={selectedLrIds.size === 0}
                  value={selectedTransporterId}
                  onChange={e => setSelectedTransporterId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all shadow-sm disabled:opacity-50"
                >
                  <option value="">Select Transport Partner...</option>
                  {transporters.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.commissionPercent}%)</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <button
              onClick={handleBulkAssign}
              disabled={isAssigning || selectedLrIds.size === 0 || !selectedTransporterId}
              className="w-full py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest"
            >
              {isAssigning ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                'Assign Transport Partner'
              )}
            </button>
          </div>

          <div className="mt-auto">
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                Management Portal
              </p>
              <p className="text-[9px] font-medium text-slate-500 leading-relaxed">
                All bookings (Paid & To Pay) can now be manually allocated to transporters. Select items from the worklist and choose a partner to calculate commission and net payables.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignTransporter;
