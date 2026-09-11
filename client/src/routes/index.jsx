import { createBrowserRouter } from 'react-router-dom';

// Layouts
import RootLayout from '../Layout/RootLayout';
import DashboardLayout from '../Layout/DashboardLayout';
import AuthLayout from '../Layout/AuthLayout';

// Pages
import Home from '../Pages/Home';
import Dashboard from '../Pages/Dashboard';
import MockInterview from '../Pages/MockInterview';
import History from '../Pages/History';
import Login from '../Pages/Login';
import Register from '../Pages/Register';
import NotFound from '../Pages/NotFound';

export const router = createBrowserRouter([
  // Main Public Routes with standard Navbar & Footer
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'history',
        element: <History />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },

  // Authenticated / App Workspace Routes with Sidebar
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
    ],
  },

  // Auth Routes (Sign In / Sign Up)
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
    ],
  },
]);
