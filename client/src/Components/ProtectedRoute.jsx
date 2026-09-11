import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute Guard - Ensures user is authenticated.
 * Unauthenticated users are redirected to /login.
 */
export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!user) {
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
