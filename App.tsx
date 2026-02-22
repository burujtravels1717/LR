
import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';

// Lazy-loaded routes for code splitting
const CreateLR = React.lazy(() => import('./pages/CreateLR'));
const LRDetails = React.lazy(() => import('./pages/LRDetails'));
const LRList = React.lazy(() => import('./pages/LRList'));
const EditLR = React.lazy(() => import('./pages/EditLR'));
const AdminReports = React.lazy(() => import('./pages/AdminReports'));
const AdminTransporters = React.lazy(() => import('./pages/AdminTransporters'));
const AdminAssignTransporter = React.lazy(() => import('./pages/AdminAssignTransporter'));
const AdminTransporterReport = React.lazy(() => import('./pages/AdminTransporterReport'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminEntity = React.lazy(() => import('./pages/AdminEntity'));
const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ForceResetPassword = React.lazy(() => import('./pages/ForceResetPassword'));

// Reusable Suspense Loader Component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-500 text-sm font-medium">Loading Page...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Force Password Reset Route */}
            <Route path="/force-reset-password" element={
              <ProtectedRoute>
                <ForceResetPassword />
              </ProtectedRoute>
            } />

            {/* Secure Routes Wrapped in Layout & ProtectedRoute */}
            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/list" element={<LRList />} />
              <Route path="/create" element={<CreateLR />} />
              <Route path="/edit/:id" element={<EditLR />} />
              <Route path="/lr/:id" element={<LRDetails />} />

              {/* Admin Specific Routes */}
              <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/transporters" element={<ProtectedRoute adminOnly><AdminTransporters /></ProtectedRoute>} />
              <Route path="/admin/assign-transporter" element={<ProtectedRoute adminOnly><AdminAssignTransporter /></ProtectedRoute>} />
              <Route path="/admin/transporter-report" element={<ProtectedRoute adminOnly><AdminTransporterReport /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/entity" element={<ProtectedRoute adminOnly><AdminEntity /></ProtectedRoute>} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
