
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
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/list" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 transition-colors">
              {logoInitial}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 tracking-tighter leading-none text-lg uppercase">{businessName}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{settings?.tagline || 'Management Portal'}</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6 mr-2">
              <Link
                to="/list"
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive('/list') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Bookings
              </Link>

              <Link
                to="/admin/assign-transporter"
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive('/admin/assign-transporter') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Assign Transporter
              </Link>

              {isAdmin && (
                <div className="relative group">
                  <button
                    onMouseEnter={() => setShowAdminMenu(true)}
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${location.pathname.startsWith('/admin') && location.pathname !== '/admin/assign-transporter' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Admin Console
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAdminMenu && (
                    <div
                      onMouseLeave={() => setShowAdminMenu(false)}
                      className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <Link to="/admin/reports" className="block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600">Daily Reports</Link>
                      <div className="border-t border-slate-100 my-1"></div>
                      <Link to="/admin/transporters" className="block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600">Transporter Master</Link>
                      <Link to="/admin/transporter-report" className="block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600">Transporter Settlements</Link>
                      <div className="border-t border-slate-100 my-1"></div>
                      <Link to="/admin/users" className="block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600">User Management</Link>
                      {isSuperUser && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          <Link to="/admin/entity" className="block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-slate-50">Entity Management</Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </nav>

            <div className="h-8 w-[1px] bg-slate-100 hidden sm:block"></div>

            <Link
              to="/create"
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">New Booking</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{user.name}</span>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{user.role}</span>
              </div>
              <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black text-xs shadow-inner">
                {user.avatar || 'U'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group"
              title="Logout"
            >
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8 px-4">
        <div className="max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-10 no-print">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-left">
              <p className="text-slate-900 font-black text-sm uppercase tracking-tighter">{businessName} System</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Professional Internal Operations Dashboard</p>
            </div>
            <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">
              &copy; {new Date().getFullYear()} {businessName} Internal
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
