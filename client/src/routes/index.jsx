import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from '../Layout/DashboardLayout';
import AuthLayout from '../Layout/AuthLayout';

// Pages
import Dashboard from '../Pages/Dashboard';
import AdminDashboard from '../Pages/AdminDashboard';
import MockInterview from '../Pages/MockInterview';
import History from '../Pages/History';
import Login from '../Pages/Login';
import AdminUsers from '../Pages/AdminUsers';
import AdminInterviewConfig from '../Pages/AdminInterviewConfig';
import AdminInterviewHistory from '../Pages/AdminInterviewHistory';
import AdminInterviewSessionDetail from '../Pages/AdminInterviewSessionDetail';
import AdminFeedbackConfig from '../Pages/AdminFeedbackConfig';
import AdminLeaderboard from '../Pages/AdminLeaderboard';
import AdminQuestionEditor from '../Pages/AdminQuestionEditor';
import StudentInterviews from '../Pages/StudentInterviews';
import InterviewRoom from '../Pages/InterviewRoom';
import DeveloperAuditLogs from '../Pages/DeveloperAuditLogs';
import NotFound from '../Pages/NotFound';

// Route Guards & Error Boundary
import ProtectedRoute from '../Components/ProtectedRoute';
import AdminRoute from '../Components/AdminRoute';
import DeveloperRoute from '../Components/DeveloperRoute';
import { RouteErrorBoundary } from '../Components/ErrorBoundary';

// Helper component for root redirect
function RootRedirect() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (user.role === 'developer') {
        return <Navigate to="/developer/audit-logs" replace />;
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
    errorElement: <RouteErrorBoundary />,
  },

  // Auth Routes (Login Only)
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            path: 'admin',
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: 'admin/dashboard',
            element: <AdminDashboard />,
          },
          {
            path: 'admin/users',
            element: <AdminUsers />,
          },
          {
            path: 'admin/interviews',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/interviews/config',
            element: <Navigate to="/admin/interviews" replace />,
          },
          {
            path: 'admin/feedback',
            element: <AdminFeedbackConfig />,
          },
          {
            path: 'admin/leaderboard',
            element: <AdminLeaderboard />,
          },
          {
            path: 'admin/history',
            element: <AdminInterviewHistory />,
          },
          {
            path: 'admin/history/:sessionId',
            element: <AdminInterviewSessionDetail />,
          },
          {
            path: 'admin/interviews/:trackId/levels',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/new',
            element: <AdminQuestionEditor />,
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/:questionId/edit',
            element: <AdminQuestionEditor />,
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/:questionId',
            element: <AdminInterviewConfig />,
          },
          {
            path: 'admin/audit-logs',
            element: <DeveloperAuditLogs />,
          },
        ],
      },
    ],
  },

  // Protected Developer Routes (Dedicated Audit Logs Portal)
  {
    element: <DeveloperRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            path: 'developer/audit-logs',
            element: <DeveloperAuditLogs />,
          },
          {
            path: 'developer',
            element: <Navigate to="/developer/audit-logs" replace />,
          },
        ],
      },
    ],
  },

  // Protected Student & Campus Workspace Routes
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'interviews',
            element: <StudentInterviews />,
          },
          {
            path: 'interviews/room/:sessionId',
            element: <InterviewRoom />,
          },
          {
            path: 'interview/room/:sessionId',
            element: <InterviewRoom />,
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

  // Fallback 404 Page (Wrapped with DashboardLayout for topbar & sidebar)
  {
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
