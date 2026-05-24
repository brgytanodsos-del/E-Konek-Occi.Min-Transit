import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';

// ── Verifies the persisted session token with the server on mount ─────────────
// If token is invalid/expired, clears auth and sends back to login.
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { sessionToken, setIsAuthenticated, setSessionToken, setCurrentRole, firestoreReady } = useApp();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!sessionToken) {
      setVerified(true); // no token → let ProtectedRoute handle redirect
      return;
    }

    fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.valid) {
          // Token expired or tampered — clear session
          setIsAuthenticated(false);
          setSessionToken(null);
          setCurrentRole(null);
        }
        setVerified(true);
      })
      .catch(() => {
        // Server unreachable (offline) — allow cached session through
        setVerified(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!verified || !firestoreReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#FF8800]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#FF8800] animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-black text-sm tracking-widest uppercase">E-Konek Occi.Mindo</p>
          <p className="text-white/40 text-xs">Initialising system…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <SessionGuard>
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
        </SessionGuard>
      </Router>
    </AppProvider>
  );
}
