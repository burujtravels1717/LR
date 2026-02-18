
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../components/AuthContext';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(password);
      alert('Password updated successfully. You can now log in with your new credentials.');
      await refreshSession();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center text-white font-black text-3xl shadow-2xl mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">New Password</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Secure your account access</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-widest">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="Repeat new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
