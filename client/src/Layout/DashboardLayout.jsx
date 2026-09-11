import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, SlidersHorizontal } from 'lucide-react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';

export default function DashboardLayout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const mobileNavItems = isAdmin
    ? [
        { name: 'Users', path: '/admin/users', icon: Users },
        { name: 'Interviews', path: '/admin/interviews', icon: SlidersHorizontal },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Clean Top Bar (Site Name and Logo Only) */}
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row pb-16 md:pb-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-5 md:p-8 bg-[var(--bg)] overflow-y-auto">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-2 flex items-center justify-around shadow-[var(--shadow-md)]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] text-[11px] font-medium transition ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
