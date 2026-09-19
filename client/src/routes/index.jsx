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
import AdminRoles from '../Pages/AdminRoles';
import AdminInterviewConfig from '../Pages/AdminInterviewConfig';
import AdminInterviewHistory from '../Pages/AdminInterviewHistory';
import AdminInterviewSessionDetail from '../Pages/AdminInterviewSessionDetail';
import AdminFeedbackConfig from '../Pages/AdminFeedbackConfig';
import AdminLeaderboard from '../Pages/AdminLeaderboard';
import AdminQuestionEditor from '../Pages/AdminQuestionEditor';
import StudentInterviews from '../Pages/StudentInterviews';
import StudentInterviewsTesting from '../Pages/StudentInterviewsTesting';
import InterviewRoom from '../Pages/InterviewRoom';
import DeveloperAuditLogs from '../Pages/DeveloperAuditLogs';
import AdminBackup from '../Pages/AdminBackup';
import AdminVenues from '../Pages/AdminVenues';
import AdminSlotEditor from '../Pages/AdminSlotEditor';
import AdminSettings from '../Pages/AdminSettings';
import FacultyDashboard from '../Pages/FacultyDashboard';
import FacultyAttendance from '../Pages/FacultyAttendance';
import FacultyVenueMonitor from '../Pages/FacultyVenueMonitor';
import MyBookings from '../Pages/MyBookings';
import NotFound from '../Pages/NotFound';

// Route Guards & Error Boundary
import ProtectedRoute from '../Components/ProtectedRoute';
import DynamicPageRoute from '../Components/DynamicPageRoute';
import { RouteErrorBoundary } from '../Components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

// Dynamic helper component for root redirect
function RootRedirect() {
  const { user, loading, permissionsLoading, permissions } = useAuth();

  if (loading || permissionsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (user) {
    const role = user.role?.toLowerCase();
    const landingPage = user.default_page || permissions?.defaultPage;

    if (landingPage && landingPage.trim() !== '') {
      return <Navigate to={landingPage.trim()} replace />;
    }

    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (role === 'faculty') {
      return <Navigate to="/faculty/attendance" replace />;
    }

    if (role === 'developer') {
      return <Navigate to="/developer/audit-logs" replace />;
    }

    // Dynamic landing: navigate to first permitted page if available
    if (permissions?.pages && permissions.pages.length > 0) {
      const firstPage = permissions.pages.find(p => !p.path.includes(':'));
      if (firstPage && firstPage.path) {
        return <Navigate to={firstPage.path} replace />;
      }
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // Root Redirect -> Directly go to login or first permitted dashboard page
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

  // Protected Routes (Wrapped in ProtectedRoute -> DashboardLayout -> DynamicPageRoute)
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          // Admin & Core Portal Routes
          {
            path: 'admin',
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: 'admin/dashboard',
            element: (
              <DynamicPageRoute pageKey="admin_dashboard">
                <AdminDashboard />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/users',
            element: (
              <DynamicPageRoute pageKey="admin_users">
                <AdminUsers />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/roles',
            element: (
              <DynamicPageRoute requiredRole="admin">
                <AdminRoles />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews',
            element: (
              <DynamicPageRoute pageKey={['admin_interviews', 'admin_history']}>
                <AdminInterviewConfig />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews/config',
            element: <Navigate to="/admin/interviews" replace />,
          },
          {
            path: 'admin/interviews/:trackId/levels',
            element: (
              <DynamicPageRoute pageKey="admin_interviews">
                <AdminInterviewConfig />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions',
            element: (
              <DynamicPageRoute pageKey="admin_interviews">
                <AdminInterviewConfig />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/new',
            element: (
              <DynamicPageRoute pageKey="admin_interviews">
                <AdminQuestionEditor />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/:questionId/edit',
            element: (
              <DynamicPageRoute pageKey="admin_interviews">
                <AdminQuestionEditor />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/interviews/:trackId/levels/:levelId/questions/:questionId',
            element: (
              <DynamicPageRoute pageKey="admin_interviews">
                <AdminInterviewConfig />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/feedback',
            element: (
              <DynamicPageRoute pageKey="admin_feedback">
                <AdminFeedbackConfig />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/leaderboard',
            element: (
              <DynamicPageRoute pageKey="admin_leaderboard">
                <AdminLeaderboard />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/history',
            element: (
              <DynamicPageRoute pageKey="admin_history">
                <AdminInterviewHistory />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/history/:sessionId',
            element: (
              <DynamicPageRoute pageKey="admin_history">
                <AdminInterviewSessionDetail />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/audit-logs',
            element: (
              <DynamicPageRoute pageKey="audit_logs">
                <DeveloperAuditLogs />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/backup',
            element: (
              <DynamicPageRoute pageKey="admin_backup">
                <AdminBackup />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/venues',
            element: (
              <DynamicPageRoute pageKey="admin_venues">
                <AdminVenues />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/slots/new',
            element: (
              <DynamicPageRoute pageKey="admin_venues">
                <AdminSlotEditor />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'admin/slots/:slotId/edit',
            element: (
              <DynamicPageRoute pageKey="admin_venues">
                <AdminSlotEditor />
              </DynamicPageRoute>
            ),
          },

          {
            path: 'admin/settings',
            element: (
              <DynamicPageRoute pageKey="system_settings">
                <AdminSettings />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'developer/settings',
            element: (
              <DynamicPageRoute pageKey="system_settings">
                <AdminSettings />
              </DynamicPageRoute>
            ),
          },

          // Faculty Portal Routes
          {
            path: 'faculty',
            element: <Navigate to="/faculty/dashboard" replace />,
          },
          {
            path: 'faculty/dashboard',
            element: (
              <DynamicPageRoute pageKey="faculty_dashboard">
                <FacultyDashboard />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'faculty/attendance',
            element: (
              <DynamicPageRoute pageKey="faculty_attendance">
                <FacultyAttendance />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'faculty/venue-monitor',
            element: (
              <DynamicPageRoute pageKey={['faculty_attendance', 'faculty_dashboard']}>
                <FacultyVenueMonitor />
              </DynamicPageRoute>
            ),
          },

          // Developer Portal Routes
          {
            path: 'developer/audit-logs',
            element: (
              <DynamicPageRoute pageKey="audit_logs">
                <DeveloperAuditLogs />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'developer',
            element: <Navigate to="/developer/audit-logs" replace />,
          },

          // Student My Bookings Routes
          {
            path: 'my-bookings',
            element: (
              <DynamicPageRoute pageKey={['student_bookings', 'student_slots', 'student_interviews']}>
                <MyBookings />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'slots/my-bookings',
            element: <Navigate to="/my-bookings" replace />,
          },
          {
            path: 'slots/book',
            element: <Navigate to="/my-bookings" replace />,
          },
          {
            path: 'slots',
            element: <Navigate to="/my-bookings" replace />,
          },

          // Student & Collaborative Workspace Routes
          {
            path: 'dashboard',
            element: (
              <DynamicPageRoute pageKey="student_dashboard">
                <Dashboard />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'interviews',
            element: (
              <DynamicPageRoute pageKey="student_interviews">
                <StudentInterviews />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'interviews/testing',
            element: (
              <DynamicPageRoute pageKey={['student_interviews_testing', 'student_interviews']}>
                <StudentInterviewsTesting />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'interviews/room/:sessionId',
            element: (
              <DynamicPageRoute pageKey={['interview_room', 'student_interviews']}>
                <InterviewRoom />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'interview/room/:sessionId',
            element: (
              <DynamicPageRoute pageKey={['interview_room', 'student_interviews']}>
                <InterviewRoom />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'interview',
            element: (
              <DynamicPageRoute pageKey="student_interviews">
                <MockInterview />
              </DynamicPageRoute>
            ),
          },
          {
            path: 'history',
            element: (
              <DynamicPageRoute pageKey="student_history">
                <History />
              </DynamicPageRoute>
            ),
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

