
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { entityService } from '../services/entityService';
import { authService } from '../services/authService';
import { User, UserRole, BranchDetail } from '../types';
import { useAuth } from '../components/AuthContext';

const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const isDeveloper = currentUser?.role === 'developer';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [availableBranches, setAvailableBranches] = useState<BranchDetail[]>([]);

  // Fix: changed branch type from hardcoded union to string to match User type in types.ts
  const [formData, setFormData] = useState<{
    username: string;
    name: string;
    phone: string;
    role: UserRole;
    branch: string;
    status: 'Active' | 'Inactive';
  }>({ username: '', name: '', phone: '', role: 'staff', branch: 'KPM', status: 'Active' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      entityService.getBranches().then(b => setAvailableBranches(b.filter(br => br.status === 'Active')));
    }
  }, [isAdmin]);

  const handleOpenModal = (u?: User) => {
    setTempPassword(null);
    if (u) {
      setEditingId(u.id);
      setFormData({
        username: u.username,
        name: u.name,
        phone: u.phone || '',
        role: u.role,
        branch: u.branch || 'KPM',
        status: u.status
      });
    } else {
      setEditingId(null);
      setFormData({ username: '', name: '', phone: '', role: 'staff', branch: 'KPM', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalFormData = { ...formData };

    // Safety: prevent removing the last developer
    if (editingId) {
      const targetUser = users.find(u => u.id === editingId);
      if (targetUser?.role === 'developer' && finalFormData.role !== 'developer') {
        const otherDevs = users.filter(u => u.role === 'developer' && u.id !== editingId && u.status === 'Active');
        if (otherDevs.length === 0) {
          alert('Action blocked: System must have at least one active Developer.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    // Safety: prevent removing the last admin-level user
    if (editingId === currentUser?.id && finalFormData.role === 'staff') {
      const otherAdminsOrDevs = users.filter(u => (u.role === 'admin' || u.role === 'developer') && u.id !== currentUser.id && u.status === 'Active');
      if (otherAdminsOrDevs.length === 0) {
        alert('Action blocked: System must have at least one active Administrator or Developer.');
        setIsSubmitting(false);
        return;
      }
    }

    // Hierarchy: only developers can assign/modify admin or developer roles
    if (!isDeveloper && (finalFormData.role === 'admin' || finalFormData.role === 'developer')) {
      const targetUser = editingId ? users.find(u => u.id === editingId) : null;
      if (!targetUser || targetUser.role === 'staff') {
        alert('Permission denied: Only developers can assign admin or developer roles.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editingId) {
        await userService.updateUser(editingId, finalFormData);
      } else {
        await userService.createUser(formData);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert("Error saving user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this users password? they will be forced to change it on next login.')) return;

    try {
      const password = Math.random().toString(36).slice(-8);
      await authService.resetPasswordByAdmin(userId, password);
      setTempPassword(password);
      await fetchData();
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) return alert("Security Error: You cannot delete your own account while logged in.");
    if (id === 'u0') return alert("System Integrity Error: The root developer account cannot be deleted.");

    const targetUser = users.find(u => u.id === id);

    // Prevent deleting the last developer
    if (targetUser?.role === 'developer') {
      const otherDevs = users.filter(u => u.role === 'developer' && u.id !== id && u.status === 'Active');
      if (otherDevs.length === 0) {
        return alert('Action blocked: System must have at least one active Developer.');
      }
    }

    // Prevent deleting the last admin-level user
    if (targetUser?.role === 'admin' || targetUser?.role === 'developer') {
      const otherAdminsOrDevs = users.filter(u => (u.role === 'admin' || u.role === 'developer') && u.id !== id && u.status === 'Active');
      if (otherAdminsOrDevs.length === 0) {
        return alert('Action blocked: System must have at least one active Administrator or Developer.');
      }
    }

    // Hierarchy: admins can only delete staff
    if (!isDeveloper && targetUser?.role !== 'staff') {
      return alert('Permission denied: Only developers can delete admin or developer accounts.');
    }

    if (confirm(`CRITICAL ACTION: Are you sure you want to delete user: ${name}? This will permanently remove their access.`)) {
      setLoading(true);
      try {
        await userService.deleteUser(id);
        await fetchData();
      } catch (err) {
        alert("Failed to delete user.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isAdmin) return <Navigate to="/list" replace />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">User Management</h1>
          <p className="text-slate-500 text-sm">Control system access, assign roles, and manage staff profiles.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg"
        >
          + Create User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User Profile</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Username</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Assigned Branch</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing User Registry...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No users found in database</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.id === currentUser?.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black text-xs shadow-inner">{u.avatar}</div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">{u.name} {u.id === currentUser?.id && <span className="ml-2 text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded tracking-widest font-black uppercase">You</span>}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Last seen: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">@{u.username}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.branch === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {u.branch}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'developer' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleOpenModal(u)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800">Edit</button>
                        <button onClick={() => handleResetPassword(u.id)} className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800">Reset Password</button>
                        <button onClick={() => handleDelete(u.id, u.name)} disabled={u.id === currentUser?.id || u.id === 'u0'} className={`text-[10px] font-black uppercase tracking-widest ${(u.id === currentUser?.id || u.id === 'u0') ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}>Delete</button>
                      </div>
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
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{editingId ? (editingId === currentUser?.id ? 'Edit Your Profile' : 'Modify Staff Member') : 'Provision New Account'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {tempPassword && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Temporary Password Generated</p>
                  <p className="text-lg font-mono font-black text-slate-900 tracking-wider bg-white p-2 border border-amber-100 rounded text-center">{tempPassword}</p>
                  <p className="text-[8px] font-bold text-amber-500 mt-1 uppercase">Copy and provide to user. It won't be shown again.</p>
                </div>
              )}

              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" placeholder="Michael Chen" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Login Username</label><input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" placeholder="mike_staff" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</label><input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" placeholder="10-digit mobile" maxLength={10} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</label>
                  <select disabled={editingId === currentUser?.id || (!isDeveloper && formData.role !== 'staff')} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className={`w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none ${editingId === currentUser?.id ? 'bg-slate-100 opacity-75' : 'bg-slate-50'}`}><option value="staff">Staff Member</option><option value="admin">Administrator</option>{isDeveloper && <option value="developer">Developer</option>}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch Access</label>
                  {/* Fix: removed redundant 'as any' since formData.branch is now string */}
                  <select disabled={editingId === currentUser?.id} value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className={`w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none ${editingId === currentUser?.id ? 'bg-slate-100 opacity-75' : 'bg-slate-50'}`}>{availableBranches.map(b => <option key={b.id} value={b.code}>{b.code} - {b.name}</option>)}<option value="ALL">ALL (Full Access)</option></select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-2 py-3 px-8 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50">{isSubmitting ? 'Processing...' : (editingId ? 'Update Profile' : 'Confirm User')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
