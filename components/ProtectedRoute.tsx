
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle force password reset
  if (user.user_metadata?.must_reset_password && location.pathname !== '/force-reset-password') {
    return <Navigate to="/force-reset-password" replace />;
  }

  // Block rest of app if must reset password
  if (!user.user_metadata?.must_reset_password && location.pathname === '/force-reset-password') {
    return <Navigate to="/list" replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'developer') {
    return <Navigate to="/list" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
