
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { entityService } from '../services/entityService';
import { BusinessSettings, BranchDetail } from '../types';

const AdminEntity: React.FC = () => {
  const { user } = useAuth();
  const isSuperUser = user?.username === 'superuser_kpm' || user?.role === 'developer';

  const [activeTab, setActiveTab] = useState<'general' | 'branches'>('general');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Branch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDetail | null>(null);
  const [branchForm, setBranchForm] = useState<Omit<BranchDetail, 'id'>>({
    name: '', code: '', address: '', contactPerson: '', phone: '', status: 'Active'
  });

  useEffect(() => {
    if (isSuperUser) {
      loadData();
    }
  }, [isSuperUser]);

  const loadData = async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      entityService.getSettings(),
      entityService.getBranches()
    ]);
    setSettings(s);
    setBranches(b);
    setLoading(false);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Additional check for mandatory fields if HTML validation is bypassed
    if (!settings.primaryName || !settings.primaryEmail || !settings.primaryPhone) {
      alert("Primary Name, Email, and Phone are mandatory.");
      return;
    }

    setSaving(true);
    try {
      await entityService.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBranch) {
        await entityService.updateBranch(editingBranch.id, branchForm);
      } else {
        await entityService.createBranch(branchForm);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      alert("Error saving branch detail.");
    } finally {
      setSaving(false);
    }
  };

  const openBranchModal = (b?: BranchDetail) => {
    if (b) {
      setEditingBranch(b);
      setBranchForm({ ...b });
    } else {
      setEditingBranch(null);
      setBranchForm({ name: '', code: '', address: '', contactPerson: '', phone: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  if (!isSuperUser) return <Navigate to="/list" replace />;
  if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Loading Entity Master...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Entity Management</h1>
        <p className="text-slate-500 text-sm">Global business architecture and branch network configuration.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'branches' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Branch Registry
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          {activeTab === 'general' && settings && (
            <form onSubmit={handleSettingsSubmit} className="max-w-3xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Business Identity</h3>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                  <input
                    type="text"
                    required
                    value={settings.businessName}
                    onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={settings.logoUrl || ''}
                    onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN Number</label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tagline / Sub-header</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                <div className="md:col-span-2 border-b border-slate-100 pb-2 mt-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Primary Contact <span className="text-[9px] text-red-500 font-bold ml-2">(Mandatory)</span></h3>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={settings.primaryName}
                    onChange={e => setSettings({ ...settings, primaryName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                    placeholder="E.g. John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={settings.primaryPhone}
                    onChange={e => setSettings({ ...settings, primaryPhone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Email *</label>
                  <input
                    type="email"
                    required
                    value={settings.primaryEmail}
                    onChange={e => setSettings({ ...settings, primaryEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                <div className="md:col-span-2 border-b border-slate-100 pb-2 mt-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Secondary Contact <span className="text-[9px] text-slate-400 font-bold ml-2">(Optional)</span></h3>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Contact Name</label>
                  <input
                    type="text"
                    value={settings.secondaryName || ''}
                    onChange={e => setSettings({ ...settings, secondaryName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                    placeholder="E.g. Jane Smith"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Contact Phone</label>
                  <input
                    type="text"
                    value={settings.secondaryPhone || ''}
                    onChange={e => setSettings({ ...settings, secondaryPhone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                <div className="md:col-span-2 border-b border-slate-100 pb-2 mt-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Location</h3>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Head Office Address</label>
                  <textarea
                    rows={3}
                    value={settings.headOfficeAddress}
                    onChange={e => setSettings({ ...settings, headOfficeAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-10 py-4 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}
                >
                  {saving ? 'Updating Settings...' : saveSuccess ? '✓ Settings Saved' : 'Save System Profile'}
                </button>
                {saveSuccess && (
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                    Profile Updated Successfully
                  </span>
                )}
              </div>
            </form>
          )}

          {activeTab === 'branches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Branches</h3>
                <button
                  onClick={() => openBranchModal()}
                  className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all"
                >
                  + Add New Branch
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {branches.map(b => (
                  <div key={b.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex justify-between items-start group hover:border-blue-300 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded uppercase">{b.code}</span>
                        <h4 className="text-sm font-black text-slate-900 uppercase">{b.name}</h4>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mb-2">{b.address}</p>
                      <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase">
                        <span>{b.contactPerson}</span>
                        <span>•</span>
                        <span>{b.phone}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${b.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{b.status}</span>
                      <button
                        onClick={() => openBranchModal(b)}
                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{editingBranch ? 'Modify Branch' : 'Register New Branch'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleBranchSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch Name</label>
                  <input required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="e.g. Tuticorin" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Short Code (3 Letters)</label>
                  <input required maxLength={3} value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold" placeholder="TUT" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Address</label>
                <input required value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Person</label>
                  <input value={branchForm.contactPerson} onChange={e => setBranchForm({ ...branchForm, contactPerson: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch Phone</label>
                  <input value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Status</label>
                <select value={branchForm.status} onChange={e => setBranchForm({ ...branchForm, status: e.target.value as any })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Discard</button>
                <button type="submit" disabled={saving} className="flex-2 py-4 px-10 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50">
                  {saving ? 'Processing...' : (editingBranch ? 'Update Branch' : 'Register Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEntity;
