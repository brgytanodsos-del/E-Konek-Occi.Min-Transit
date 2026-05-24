import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldCheck, Waves } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, sessionToken, setIsAuthenticated, setCurrentRole, setSessionToken } = useApp();
  const [validating, setValidating] = React.useState(!!sessionToken);

  React.useEffect(() => {
    if (!sessionToken) {
      setValidating(false);
      return;
    }

    fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setIsAuthenticated(true);
          setCurrentRole(data.role);
        } else {
          setIsAuthenticated(false);
          setCurrentRole(null);
          setSessionToken(null);
        }
      })
      .catch(() => {
        // offline fallback keeps the existing session if token exists
      })
      .finally(() => setValidating(false));
  }, []);

  if (validating) {
    return (
      <div className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
        <div className="absolute inset-0 login-grid-backdrop opacity-50" />
        <div className="glass-panel relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-[32px] px-8 py-10 text-center">
          <div className="flex h-18 w-18 items-center justify-center rounded-[28px] bg-[rgba(12,45,87,0.1)] text-[#0c2d57] shadow-inner">
            <ShieldCheck size={34} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Session security</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Verifying active access</h1>
            <p className="text-sm leading-6 text-slate-500">
              Reconnecting your transit workspace and validating the saved login session.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Secure channel handshake in progress
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Waves size={14} /> MindoroTransit identity services
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
