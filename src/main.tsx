import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { Toaster } from 'sonner';
import './index.css';

const App = () => {
  return (
    <BrowserRouter>
      {/* Toaster for notifications */}
      <Toaster richColors position="bottom-center" />
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/dashboard" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
}
