import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useApp } from './context/AppContext';
import { PINLogin } from './components/auth/PINLogin';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { LoginScreen } from './components/LoginScreen'; 

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <PINLogin />;
  }
  return <>{children}</>;
};

export const App = () => {
  return (
    <BrowserRouter>
      {/* Toaster for notifications */}
      <Toaster richColors position="bottom-center" />
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
