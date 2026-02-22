
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/5 rounded-full blur-[120px]"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
          {logoUrl ? (
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-2xl relative shadow-2xl" />
            </div>
          ) : (
            <div className="inline-flex w-20 h-20 bg-brand-dark rounded-2xl items-center justify-center text-white font-black text-4xl shadow-2xl mb-6 relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-2xl"></div>
              <span className="relative">{businessName.charAt(0) || 'E'}</span>
            </div>
          )}
          <h1 className="text-4xl font-black text-brand-dark tracking-tighter uppercase mb-1">{businessName}</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">{tagline || 'LR OPERATIONS PORTAL'}</p>
        </div>

        <div className="glass p-8 sm:p-10 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all group-hover:border-slate-300"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure Password</label>
                <Link to="/forgot-password" opacity-60 className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-primary transition-colors">
                  Reset?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all group-hover:border-slate-300"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-14 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Unlock Dashboard'
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Authorized Personnel Only • <span className="text-slate-500">KPM SYSTEMS</span>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] opacity-50">
          &copy; {new Date().getFullYear()} {businessName || 'LOGISTICS'}
        </p>
      </div>
    </div>
  );
};

export default Login;
