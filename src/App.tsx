import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useApp } from './context/AppContext';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { LoginScreen } from './components/LoginScreen'; 
import { useSyncStore } from './context/syncStore';
import { SyncStatus } from './components/SyncStatus';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App = () => {
  const { setOnline, refreshPending } = useSyncStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    refreshPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, refreshPending]);

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
      <SyncStatus />
    </BrowserRouter>
  );
};
