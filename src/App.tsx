import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginScreenWrapper />} />
          <Route path="/dashboard" element={<SuperAdminDashboard />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

// Small wrapper for login redirect
const LoginScreenWrapper = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  if (isLoggedIn) {
    window.location.href = '/dashboard';
    return null;
  }

  return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
};
