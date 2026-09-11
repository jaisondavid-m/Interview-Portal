import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from '../Layout/DashboardLayout';
import AuthLayout from '../Layout/AuthLayout';

// Pages
import Dashboard from '../Pages/Dashboard';
import MockInterview from '../Pages/MockInterview';
import History from '../Pages/History';
import Login from '../Pages/Login';
import AdminUsers from '../Pages/AdminUsers';
import AdminInterviewConfig from '../Pages/AdminInterviewConfig';
import NotFound from '../Pages/NotFound';

// Route Guards
import ProtectedRoute from '../Components/ProtectedRoute';
import AdminRoute from '../Components/AdminRoute';

// Helper component for root redirect
function RootRedirect() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'admin') {
        return <Navigate to="/admin/users" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // Root Redirect -> Directly go to login or appropriate dashboard
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Auth Routes (Login Only)
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
    ],
  },

  // Protected Admin Routes
  {
    element: <AdminRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: 'admin/users',
            element: <AdminUsers />,
          },
          {
            path: 'admin/interviews',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/interviews/:trackId/levels',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions',
            element: <AdminInterviewConfig />,
          },
        ],
      },
    ],
  },

  // Protected Student & Campus Workspace Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'interview',
            element: <MockInterview />,
          },
          {
            path: 'history',
            element: <History />,
          },
        ],
      },
    ],
  },

  // Fallback -> Redirect
  {
    path: '*',
    element: <NotFound />,
  },
]);
