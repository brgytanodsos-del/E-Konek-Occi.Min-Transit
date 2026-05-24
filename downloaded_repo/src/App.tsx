import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      body: JSON.stringify({ sessionToken })
    })
    .then(r => r.json())
    .then(data => {
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
      // Offline fallback: keep session if token exists
    })
    .finally(() => setValidating(false));
  }, []);

  if (validating) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black animate-pulse uppercase tracking-widest">Verifying Session...</div>;
  
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
