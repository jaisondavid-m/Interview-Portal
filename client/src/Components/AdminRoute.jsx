import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * AdminRoute Guard - Ensures only authenticated users with 'admin' role can access admin routes.
 * Non-admin users (students, etc.) are redirected to /dashboard.
 * Unauthenticated users are redirected to /login.
 */
export default function AdminRoute() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!user || user.role?.toLowerCase() !== 'admin') {
      // Forbidden for non-admins -> redirect to student dashboard
      return <Navigate to="/dashboard" replace />;
    }
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
