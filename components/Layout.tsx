
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { entityService } from '../services/entityService';
import { BusinessSettings } from '../types';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';
  const isSuperUser = user?.username === 'superuser_kpm' || user?.role === 'developer';
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const fetchSettings = async () => {
    const s = await entityService.getSettings();
    setSettings(s);
  };

  useEffect(() => {
    fetchSettings();

    // Listen for updates from Entity Management
    const handleUpdate = () => {
      fetchSettings();
    };

    window.addEventListener('kpm-settings-updated', handleUpdate);
    return () => window.removeEventListener('kpm-settings-updated', handleUpdate);
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const businessName = settings?.businessName || 'Entity System';
  const logoInitial = businessName.charAt(0) || 'E';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <header className="glass sticky top-0 z-50 no-print">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/list" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl relative shadow-md" />
              ) : (
                <div className="w-12 h-12 bg-brand-dark rounded-xl flex items-center justify-center text-white font-black text-2xl relative shadow-lg group-hover:bg-brand-primary transition-colors">
                  {logoInitial}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-brand-dark tracking-tighter leading-none text-xl uppercase group-hover:text-brand-primary transition-colors">{businessName}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">{settings?.tagline || 'OPERATIONS PORTAL'}</span>
            </div>
          </Link>

          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                to="/list"
                className={`text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isActive('/list') ? 'text-brand-primary' : 'text-slate-500 hover:text-brand-dark'}`}
              >
                Overview
              </Link>

              <Link
                to="/admin/assign-transporter"
                className={`text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isActive('/admin/assign-transporter') ? 'text-brand-primary' : 'text-slate-500 hover:text-brand-dark'}`}
              >
                Assignments
              </Link>

              {isAdmin && (
                <div className="relative group/menu">
                  <button
                    onMouseEnter={() => setShowAdminMenu(true)}
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${location.pathname.startsWith('/admin') && location.pathname !== '/admin/assign-transporter' ? 'text-brand-primary' : 'text-slate-500 hover:text-brand-dark'}`}
                  >
                    Control Center
                    <svg className={`w-3 h-3 transition-transform duration-300 ${showAdminMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div
                    onMouseLeave={() => setShowAdminMenu(false)}
                    className={`absolute top-full right-[-20px] mt-4 w-60 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl py-3 z-50 transition-all duration-300 transform origin-top-right ${showAdminMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'}`}
                  >
                    <div className="px-5 py-2 mb-1">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Management</span>
                    </div>
                    <Link to="/admin/reports" className="flex items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-colors">Analytical Reports</Link>
                    <Link to="/admin/transporters" className="flex items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-colors">Transporter Fleet</Link>
                    <Link to="/admin/transporter-report" className="flex items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-colors">Settlement Ledger</Link>

                    <div className="border-t border-slate-50 my-2 mx-5"></div>

                    <Link to="/admin/users" className="flex items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-colors">Internal Teams</Link>
                    {isSuperUser && (
                      <Link to="/admin/entity" className="flex items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:bg-violet-50 transition-colors bg-violet-50/30">System Configuration</Link>
                    )}
                  </div>
                </div>
              )}
            </nav>

            <div className="h-10 w-[1px] bg-slate-200/50 hidden lg:block"></div>

            <Link
              to="/create"
              className="btn-primary py-2.5 px-6 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Booking</span>
            </Link>

            <div className="flex items-center gap-4 bg-slate-100/50 p-1.5 pr-4 rounded-2xl border border-slate-200/30">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-primary font-black text-sm shadow-sm ring-1 ring-slate-100">
                {user.avatar || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-black text-brand-dark uppercase tracking-tight leading-none mb-1">{user.name}</span>
                <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest opacity-70">{user.role}</span>
              </div>

              <button
                onClick={handleLogout}
                className="ml-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group"
                title="Secure Logout"
              >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10 px-6 animate-in fade-in duration-700">
        <div className="max-w-[1240px] mx-auto">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 no-print">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-brand-dark rounded-lg flex items-center justify-center text-white font-black text-sm">
                  {logoInitial}
                </div>
                <p className="text-brand-dark font-black text-lg uppercase tracking-tighter">{businessName} COMMAND</p>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">INTELLIGENT LOGISTICS INFRASTRUCTURE • VERSION 4.0</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2">
                &copy; {new Date().getFullYear()} {businessName} GLOBAL
              </p>
              <div className="flex gap-4">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
