
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateLR from './pages/CreateLR';
import LRDetails from './pages/LRDetails';
import LRList from './pages/LRList';
import EditLR from './pages/EditLR';
import AdminReports from './pages/AdminReports';
import AdminTransporters from './pages/AdminTransporters';
import AdminAssignTransporter from './pages/AdminAssignTransporter';
import AdminTransporterReport from './pages/AdminTransporterReport';
import AdminUsers from './pages/AdminUsers';
import AdminEntity from './pages/AdminEntity';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForceResetPassword from './pages/ForceResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
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
          <Route path="/" element={<Navigate to="/list" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
