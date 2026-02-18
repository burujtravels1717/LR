
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../components/AuthContext';

const ForgotPassword: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Redirect if already authenticated
  if (user) return <Navigate to="/list" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email address is required.');
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 bg-slate-900 rounded-2xl items-center justify-center text-white font-black text-3xl shadow-2xl mb-6">
            ?
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Reset Access</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Recover your account password</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          {status === 'success' ? (
            <div className="text-center space-y-4 animate-in fade-in duration-500">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase">Check your inbox</h2>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                A password reset link has been sent to <span className="font-bold text-slate-900">{email}</span>. Check your inbox and follow the link to set a new password.
              </p>
              <Link to="/login" className="inline-block mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="your.name@kpmlogistics.com"
                  required
                />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enter the email linked to your account.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
