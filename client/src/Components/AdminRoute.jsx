import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function AdminRoute() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
