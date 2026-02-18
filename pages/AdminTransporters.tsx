
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { transporterService } from '../services/transporterService';
import { Transporter } from '../types';

const AdminTransporters: React.FC = () => {
  const user = lrService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fix: Explicitly type the formData state to allow both 'Active' and 'Inactive' statuses
  const [formData, setFormData] = useState<{
    name: string;
    commissionPercent: number;
    status: 'Active' | 'Inactive';
  }>({ name: '', commissionPercent: 5, status: 'Active' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const data = await transporterService.getAllTransporters();
    setTransporters(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleOpenModal = (t?: Transporter) => {
    if (t) {
      setEditingId(t.id);
      setFormData({ name: t.name, commissionPercent: t.commissionPercent, status: t.status });
    } else {
      setEditingId(null);
      setFormData({ name: '', commissionPercent: 5, status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (editingId) {
      await transporterService.updateTransporter(editingId, formData);
    } else {
      await transporterService.createTransporter(formData);
    }
    await fetchData();
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const toggleStatus = async (t: Transporter) => {
    const newStatus = t.status === 'Active' ? 'Inactive' : 'Active';
    await transporterService.updateTransporter(t.id, { status: newStatus });
    fetchData();
  };

  if (!isAdmin) return <Navigate to="/list" replace />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Transporter Master</h1>
          <p className="text-slate-500 text-sm">Manage logistics partners and default commission percentages.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg"
        >
          + Add Transporter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Transporter Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Commission %</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Syncing Master Data...
                  </td>
                </tr>
              ) : transporters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    No transporters registered
                  </td>
                </tr>
              ) : (
                transporters.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900">{t.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-700">{t.commissionPercent}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${t.status === 'Active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {t.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(t)}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                      >
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editingId ? 'Edit Transporter' : 'Register New Transporter'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="e.g. Blue Dart"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Commission Percent (%)</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionPercent}
                  onChange={e => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-3 px-8 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Transporter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransporters;
