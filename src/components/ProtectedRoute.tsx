// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];           // e.g. ['superadmin', 'port', 'terminal', 'driver', 'passenger']
  requireAuth?: boolean;             // default: true
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
}) => {
  const { currentUser, currentRole, isLoading } = useApp();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (requireAuth && !currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (allowedRoles.length > 0 && currentRole) {
    if (!allowedRoles.includes(currentRole)) {
      // Redirect to appropriate dashboard or home
      return <Navigate to="/dashboard" replace />;
    }
  }

  // All checks passed
  return <>{children}</>;
};
