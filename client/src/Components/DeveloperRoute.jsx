import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * DeveloperRoute Guard - Ensures only authenticated users with 'developer' or 'admin' role can access developer portal routes.
 * Student users are redirected to /dashboard.
 * Unauthenticated users are redirected to /login.
 */
export default function DeveloperRoute() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const role = user?.role?.toLowerCase();
    if (role !== 'developer' && role !== 'admin') {
      // Forbidden for standard students -> redirect to student dashboard
      return <Navigate to="/dashboard" replace />;
    }
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
