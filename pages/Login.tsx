
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/list';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [fetchingSettings, setFetchingSettings] = useState(true);

  useEffect(() => {
    import('../services/entityService').then(({ entityService }) => {
      entityService.getSettings()
        .then(settings => {
          if (settings.businessName) setBusinessName(settings.businessName);
          if (settings.tagline) setTagline(settings.tagline);
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
        })
        .catch(() => { /* settings unavailable — show form without branding */ })
        .finally(() => setFetchingSettings(false));
    }).catch(() => setFetchingSettings(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10 text-slate-900 border-b border-slate-100 pb-8 flex flex-col items-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-2xl shadow-2xl shadow-slate-900/10 mb-6" />
          ) : (
            <div className="inline-flex w-16 h-16 bg-slate-900 rounded-2xl items-center justify-center text-white font-black text-3xl shadow-2xl mb-6">
              {businessName.charAt(0) || 'E'}
            </div>
          )}
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{businessName}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">{tagline}</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold uppercase tracking-widest">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="your.name@kpmlogistics.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800">
                    Forgot Password?
                  </Link>
                </div>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>

            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Standard users: Contact <span className="text-slate-600">Management Admin</span> for support.
              </p>
            </div>
          </form>
        </div>

        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
          &copy; {new Date().getFullYear()} {businessName || 'SYSTEMS'}
        </p>
      </div>
    </div>
  );
};

export default Login;
